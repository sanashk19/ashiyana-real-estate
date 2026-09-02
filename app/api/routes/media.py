from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from app.core.dependencies import require_broker

import os
import uuid

has_cloudinary_config = bool(
    settings.CLOUDINARY_CLOUD_NAME and
    settings.CLOUDINARY_API_KEY and
    settings.CLOUDINARY_API_SECRET and
    settings.CLOUDINARY_CLOUD_NAME != "your_cloud_name" and
    settings.CLOUDINARY_API_KEY != "your_api_key"
)

if has_cloudinary_config:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"}
MAX_IMAGE_SIZE = 15 * 1024 * 1024   # 15MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("/upload/photos", response_model=dict)
async def upload_photos(
    files: List[UploadFile] = File(...),
    broker=Depends(require_broker),
):
    """
    Upload up to 10 property photos. Returns URLs.
    Only broker can upload. Supports Cloudinary and local disk storage fallback.
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Max 10 photos at once")

    urls = []
    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Use JPEG, PNG, or WebP."
            )

        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail=f"{file.filename} exceeds 15MB limit")

        image_url = None
        if has_cloudinary_config:
            try:
                result = cloudinary.uploader.upload(
                    content,
                    folder="ashiyana/properties",
                    transformation=[
                        {"width": 1920, "height": 1080, "crop": "limit", "quality": "auto"},
                    ],
                )
                image_url = result.get("secure_url")
            except Exception as e:
                print(f"Cloudinary upload warning: {e}. Falling back to local storage.")

        if not image_url:
            upload_dir = os.path.join("uploads", "properties")
            os.makedirs(upload_dir, exist_ok=True)
            clean_filename = f"{uuid.uuid4().hex[:10]}_{file.filename.replace(' ', '_')}"
            file_path = os.path.join(upload_dir, clean_filename)
            with open(file_path, "wb") as f:
                f.write(content)
            image_url = f"http://127.0.0.1:8000/uploads/properties/{clean_filename}"

        urls.append(image_url)

    return {"urls": urls, "count": len(urls)}


@router.post("/upload/seller-photos", response_model=dict)
async def upload_seller_photos(
    files: List[UploadFile] = File(...),
):
    """
    Sellers upload photos with their valuation / sell request.
    No auth required — anyone submitting a valuation form can upload.
    Supports Cloudinary and local disk storage fallback.
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Max 10 photos per submission")

    urls = []
    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Please select JPEG, PNG, or WebP images."
            )

        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail=f"{file.filename} exceeds 15MB limit")

        image_url = None
        if has_cloudinary_config:
            try:
                result = cloudinary.uploader.upload(
                    content,
                    folder="ashiyana/submissions",
                    transformation=[{"width": 1400, "quality": "auto"}],
                )
                image_url = result.get("secure_url")
            except Exception as e:
                print(f"Cloudinary upload warning: {e}. Falling back to local submissions storage.")

        if not image_url:
            upload_dir = os.path.join("uploads", "submissions")
            os.makedirs(upload_dir, exist_ok=True)
            clean_filename = f"{uuid.uuid4().hex[:10]}_{file.filename.replace(' ', '_')}"
            file_path = os.path.join(upload_dir, clean_filename)
            with open(file_path, "wb") as f:
                f.write(content)
            image_url = f"http://127.0.0.1:8000/uploads/submissions/{clean_filename}"

        urls.append(image_url)

    return {"urls": urls, "count": len(urls)}


@router.delete("/delete", response_model=dict)
async def delete_media(
    public_id: str,
    broker=Depends(require_broker),
):
    """Delete a Cloudinary asset by public_id. Broker only."""
    result = cloudinary.uploader.destroy(public_id)
    if result.get("result") != "ok":
        raise HTTPException(status_code=400, detail="Could not delete media")
    return {"message": "Deleted"}
