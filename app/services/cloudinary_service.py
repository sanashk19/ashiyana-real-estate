"""
Dedicated Cloudinary Service for Ashiyana Broker Deal Document Vault.
Handles authenticated / private document storage, time-limited signed URL generation,
secure deletions, file validation (MIME, extension, magic bytes, max 15MB),
and robust fallback for offline/test environments.
"""

import os
import re
import uuid
import time
import logging
from typing import Optional, Dict, Any, Tuple
from fastapi import UploadFile, HTTPException, status
import cloudinary
import cloudinary.uploader
import cloudinary.utils

from app.core.config import settings

logger = logging.getLogger("ashiyana.cloudinary")

# Supported deal document formats and 15MB size ceiling
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
LOCAL_VAULT_DIR = os.path.abspath(os.path.join("secure_vault", "deal_documents"))
os.makedirs(LOCAL_VAULT_DIR, exist_ok=True)

ALLOWED_MIME_TYPES = {
    ".pdf": {"application/pdf", "application/x-pdf", "application/acrobat"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg", "image/pjpeg"},
    ".jpeg": {"image/jpeg", "image/pjpeg"},
    ".webp": {"image/webp"},
    ".doc": {"application/msword", "application/vnd.ms-word", "application/octet-stream"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    },
}


def is_cloudinary_configured() -> bool:
    """Check if real Cloudinary credentials are provided in settings."""
    name = (settings.CLOUDINARY_CLOUD_NAME or "").strip()
    key = (settings.CLOUDINARY_API_KEY or "").strip()
    secret = (settings.CLOUDINARY_API_SECRET or "").strip()
    dummy_values = {"your-cloud-name", "your_cloud_name", "your-api-key", "your_api_key", "your-api-secret", "your_api_secret", ""}
    return bool(name and key and secret and name not in dummy_values and key not in dummy_values)


def init_cloudinary():
    """Ensure Cloudinary is initialized with active settings."""
    if is_cloudinary_configured():
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME.strip(),
            api_key=settings.CLOUDINARY_API_KEY.strip(),
            api_secret=settings.CLOUDINARY_API_SECRET.strip(),
            secure=True,
        )


init_cloudinary()


def validate_file_magic_bytes(content: bytes, ext: str) -> bool:
    """Validate initial byte signatures to confirm true file format."""
    if ext == ".pdf":
        return content.startswith(b"%PDF")
    elif ext == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext in {".jpg", ".jpeg"}:
        return content.startswith(b"\xff\xd8\xff")
    elif ext == ".webp":
        return content.startswith(b"RIFF") and len(content) >= 12 and content[8:12] == b"WEBP"
    elif ext == ".docx":
        return content.startswith(b"PK\x03\x04")
    elif ext == ".doc":
        return content.startswith(b"\xd0\xcf\x11\xe0")
    return False


def determine_resource_type(file_ext: str) -> str:
    """Return 'image' for image formats and 'raw' for documents/PDFs."""
    if file_ext in {".png", ".jpg", ".jpeg", ".webp"}:
        return "image"
    return "raw"


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to strip directory traversal and unsafe characters."""
    base = os.path.basename(filename).strip()
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return clean or f"doc_{uuid.uuid4().hex[:8]}"


async def validate_document_upload(file: UploadFile) -> Tuple[bytes, str, str, int]:
    """
    Validate an uploaded deal document.
    Returns (file_bytes, clean_filename, file_ext, file_size).
    Raises HTTPException on validation errors.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was provided for upload.",
        )

    clean_filename = sanitize_filename(file.filename)
    file_ext = os.path.splitext(clean_filename)[1].lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{file_ext}' is not supported. Allowed formats: PDF, PNG, JPG, JPEG, WEBP, DOC, DOCX.",
        )

    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload an empty file.",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    # MIME type validation if content_type is provided by client
    if file.content_type:
        raw_mime = file.content_type.split(";")[0].strip().lower()
        allowed_mimes = ALLOWED_MIME_TYPES.get(file_ext, set())
        if allowed_mimes and raw_mime not in allowed_mimes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MIME type '{raw_mime}' is not permitted for extension '{file_ext}'.",
            )

    if not validate_file_magic_bytes(content, file_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File binary signature does not match expected format for '{file_ext}'.",
        )

    return content, clean_filename, file_ext, file_size


def upload_deal_document(
    content: bytes,
    deal_number: str,
    category: str,
    original_filename: str,
    file_ext: str,
    mime_type: str,
) -> Dict[str, Any]:
    """
    Upload a deal document to Cloudinary authenticated storage or secure local vault fallback.
    In production (ENVIRONMENT=production), Cloudinary is strictly required and fails closed.
    Returns dict containing public_id, resource_type, file_size, storage_type.
    """
    sanitized_deal = re.sub(r"[^a-zA-Z0-9_-]", "", deal_number)
    sanitized_category = re.sub(r"[^a-zA-Z0-9_-]", "", category.lower())
    resource_type = determine_resource_type(file_ext)
    doc_uuid = uuid.uuid4().hex[:12]
    name_slug = os.path.splitext(original_filename)[0][:30]
    safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", name_slug)

    public_id = f"ashiyana/deals/{sanitized_deal}/{sanitized_category}/{safe_name}_{doc_uuid}"

    is_prod = (settings.ENVIRONMENT or "").lower() == "production"

    # Production environment: fail-closed, no local vault fallback
    if is_prod:
        if not is_cloudinary_configured():
            logger.error("Cloudinary authenticated storage credentials are missing in production.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error: Cloudinary authenticated storage credentials are required in production.",
            )
        try:
            init_cloudinary()
            result = cloudinary.uploader.upload(
                content,
                public_id=public_id,
                resource_type=resource_type,
                type="authenticated",
                overwrite=True,
            )
            return {
                "cloudinary_public_id": result.get("public_id", public_id),
                "resource_type": resource_type,
                "file_size": result.get("bytes", len(content)),
                "storage_type": "cloudinary",
            }
        except Exception as e:
            logger.error(f"Production Cloudinary authenticated upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Cloudinary upload failed in production: {e}",
            )

    # Development/testing environments: try Cloudinary first if configured
    if is_cloudinary_configured():
        try:
            init_cloudinary()
            result = cloudinary.uploader.upload(
                content,
                public_id=public_id,
                resource_type=resource_type,
                type="authenticated",
                overwrite=True,
            )
            return {
                "cloudinary_public_id": result.get("public_id", public_id),
                "resource_type": resource_type,
                "file_size": result.get("bytes", len(content)),
                "storage_type": "cloudinary",
            }
        except Exception as e:
            logger.warning(f"Cloudinary authenticated upload failed: {e}. Falling back to secure local vault.")

    # Graceful secure vault fallback (used ONLY in non-production offline / test setups)
    local_filename = f"{sanitized_deal}_{sanitized_category}_{doc_uuid}{file_ext}"
    local_path = os.path.abspath(os.path.join(LOCAL_VAULT_DIR, local_filename))
    if not local_path.startswith(LOCAL_VAULT_DIR):
        raise HTTPException(status_code=400, detail="Path traversal violation.")

    with open(local_path, "wb") as f:
        f.write(content)

    return {
        "cloudinary_public_id": f"local:{local_filename}",
        "resource_type": resource_type,
        "file_size": len(content),
        "storage_type": "local_vault",
    }


def get_signed_document_url(
    public_id: str,
    resource_type: str = "raw",
    format_ext: Optional[str] = None,
    expires_in_seconds: int = 3600,
) -> Optional[str]:
    """
    Generate a time-limited signed URL for private document download/preview.
    Never exposes permanent public URLs.
    """
    if public_id.startswith("local:"):
        return None  # Local files are streamed directly via FastAPI endpoint

    if not is_cloudinary_configured():
        return None

    try:
        init_cloudinary()
        ext = format_ext.lstrip(".") if format_ext else None
        expires_at = int(time.time()) + expires_in_seconds
        if ext:
            signed_url = cloudinary.utils.private_download_url(
                public_id,
                format=ext,
                resource_type=resource_type,
                type="authenticated",
                expires_at=expires_at,
            )
            return signed_url
        else:
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type=resource_type,
                type="authenticated",
                sign_url=True,
                secure=True,
                expires_at=expires_at,
            )
            return url
    except Exception as e:
        logger.error(f"Failed to generate signed Cloudinary URL: {e}")
        return None


def delete_deal_document(public_id: str, resource_type: str = "raw") -> bool:
    """
    Delete a private deal document from Cloudinary or secure local vault.
    """
    if public_id.startswith("local:"):
        local_filename = public_id.replace("local:", "")
        local_path = os.path.abspath(os.path.join(LOCAL_VAULT_DIR, local_filename))
        if os.path.exists(local_path) and local_path.startswith(LOCAL_VAULT_DIR):
            try:
                os.remove(local_path)
                return True
            except Exception as e:
                logger.error(f"Failed to remove local vault file {local_path}: {e}")
                return False
        return True

    if not is_cloudinary_configured():
        return True

    try:
        init_cloudinary()
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
            type="authenticated",
        )
        return result.get("result") in {"ok", "not found"}
    except Exception as e:
        logger.error(f"Failed to delete Cloudinary asset {public_id}: {e}")
        return False
