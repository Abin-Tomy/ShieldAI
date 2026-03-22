from pathlib import Path
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "ShieldAI v2"
    APP_VERSION: str = "2.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DATABASE_URL: str = "sqlite+aiosqlite:///./shieldai.db"
    ML_MODELS_DIR: str = str(BASE_DIR / "ml_models")
    OPENPHISH_FEED_URL: str = "https://openphish.com/feed.txt"
    INTEL_REFRESH_HOURS: int = 2
    AATR_BLOCK_THRESHOLD: float = 0.90
    AATR_QUARANTINE_THRESHOLD: float = 0.70
    AATR_WARN_THRESHOLD: float = 0.50
    MACL_MIN_SAMPLES: int = 50
    LOG_DIR: str = str(BASE_DIR / "logs")
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
