from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from app.core.dependencies import require_broker

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("/upload/photos", response_model=dict)
async def upload_photos(
    files: List[UploadFile] = File(...),
    broker=Depends(require_broker),
):
    """
    Upload up to 10 property photos. Returns Cloudinary URLs.
    Only broker can upload.
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
            raise HTTPException(status_code=400, detail=f"{file.filename} exceeds 10MB limit")

        result = cloudinary.uploader.upload(
            content,
            folder="ashiyana/properties",
            transformation=[
                {"width": 1920, "height": 1080, "crop": "limit", "quality": "auto"},
            ],
        )
        urls.append(result["secure_url"])

    return {"urls": urls, "count": len(urls)}


@router.post("/upload/seller-photos", response_model=dict)
async def upload_seller_photos(
    files: List[UploadFile] = File(...),
):
    """
    Sellers upload photos with their valuation request.
    No auth required — anyone submitting a valuation form can upload.
    """
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Max 5 photos per submission")

    urls = []
    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Images only (JPEG/PNG/WebP)")

        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail=f"{file.filename} exceeds 10MB")

        result = cloudinary.uploader.upload(
            content,
            folder="ashiyana/submissions",
            transformation=[{"width": 1280, "quality": "auto"}],
        )
        urls.append(result["secure_url"])

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
