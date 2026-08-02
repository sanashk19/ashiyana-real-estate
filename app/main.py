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
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.routes import auth, properties, enquiries, media, broker, whatsapp, nri

app.include_router(auth.router, prefix="/api")
app.include_router(properties.router, prefix="/api")
app.include_router(enquiries.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(broker.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")
app.include_router(nri.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
