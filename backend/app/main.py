"""
ShieldAI v2 — Main FastAPI Application
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.services.ml_service import ml_service
from app.services.shap_service import shap_service
from app.services.aatr_service import aatr_service
from app.services.intel_service import intel_service
from app.utils.logger import print_banner, log_startup

from app.routers import phishing, malware, intel, aatr, macl, health


# ── Rate limiter ─────────────────────────────────────────────────────── #
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


# ── Lifespan ─────────────────────────────────────────────────────────── #
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print_banner()

    log_startup("Initialising database…")
    await init_db()
    log_startup("Database tables created ✓")

    log_startup("Loading ML models…")
    ml_service.load_models()

    log_startup("Loading SHAP explainers…")
    shap_service.load_explainers()

    log_startup("Loading AATR Isolation Forest…")
    aatr_service.load_or_train()

    log_startup("Starting Intel feed…")
    await intel_service.start()

    log_startup(f"{settings.APP_NAME} {settings.APP_VERSION} — READY ✓")

    yield

    # Shutdown
    log_startup("Shutting down…")
    if intel_service._refresh_task is not None:
        intel_service._refresh_task.cancel()


# ── App factory ──────────────────────────────────────────────────────── #
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="ShieldAI v2 — Autonomous Cybersecurity Threat Detection",
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(phishing.router, prefix="/api/phishing", tags=["Phishing"])
    app.include_router(malware.router,  prefix="/api/malware",  tags=["Malware"])
    app.include_router(intel.router,    prefix="/api/intel",    tags=["Intel"])
    app.include_router(aatr.router,     prefix="/api/aatr",     tags=["AATR"])
    app.include_router(macl.router,     prefix="/api/macl",     tags=["MACL"])
    app.include_router(health.router,   prefix="/api/health",   tags=["Health"])

    return app


app = create_app()
