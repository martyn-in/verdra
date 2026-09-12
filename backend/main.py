"""
AgriVisionAI — FastAPI Main Application
"""
import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

from config import get_settings
from services import model_service
from routes.predict import router as predict_router
from routes.severity import router as severity_router
from routes.gradcam import router as gradcam_router
from routes.risk import router as risk_router
from routes.weather import router as weather_router
from routes.diseases import router as diseases_router
from routes.report import router as report_router
from routes.model import router as model_router
from routes.advanced_routes import router as advanced_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model on startup."""
    logger.info("🌿 AgriVisionAI Backend Starting...")
    model_service.load_model()
    if model_service.is_model_loaded():
        logger.info("✅ AI Model loaded successfully")
    else:
        logger.warning("⚠️ AI Model not loaded — running with heuristic fallback")
    yield
    logger.info("🛑 AgriVisionAI Backend shutting down")


app = FastAPI(
    title="Verdra API",
    description="Verdra — Detect Early. Predict Spread. Protect Yield.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
frontend_url = os.getenv("FRONTEND_URL")
settings = get_settings()

allowed_origins = set()
if frontend_url:
    for u in frontend_url.split(","):
        clean_u = u.strip().rstrip("/")
        if clean_u:
            allowed_origins.add(clean_u)

# Include configured development and production origins
for o in settings.cors_origins.split(","):
    clean_o = o.strip().rstrip("/")
    if clean_o:
        allowed_origins.add(clean_o)

# Always authorize the deployed Verdra Vercel domain
allowed_origins.add("https://verdrax.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(predict_router, prefix="/api")
app.include_router(severity_router, prefix="/api")
app.include_router(gradcam_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(diseases_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(model_router, prefix="/api/model")
app.include_router(advanced_router, prefix="/api")


@app.get("/health")
async def health_check():
    """Production health check endpoint verifying service status and real model readiness."""
    is_loaded = model_service.is_model_loaded()
    return {
        "status": "ok" if is_loaded else "degraded",
        "service": "Verdra",
        "model_loaded": is_loaded,
        "class_count": len(model_service.get_class_names()),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
