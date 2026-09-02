from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered real estate broker platform for Goa",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

# Create local uploads directory if it doesn't exist
os.makedirs("uploads/properties", exist_ok=True)
os.makedirs("uploads/submissions", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.routes import auth, properties, enquiries, media, broker, whatsapp, nri, business, seller

app.include_router(auth.router, prefix="/api")
app.include_router(properties.router, prefix="/api")
app.include_router(enquiries.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(broker.router, prefix="/api")
app.include_router(seller.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")
app.include_router(nri.router, prefix="/api")
app.include_router(business.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
