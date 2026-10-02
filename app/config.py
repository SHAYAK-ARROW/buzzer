import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")

    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///buzzer.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300
    }

    # Flask-JWT-Extended
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=int(os.getenv("JWT_ACCESS_EXPIRES_HOURS", "2"))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_EXPIRES_DAYS", "30"))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # APScheduler
    SCHEDULER_API_ENABLED = False
    SCHEDULER_TIMEZONE = "UTC"

    # ---- Business Config ----
    # Delivery charge tiers (time-based, GPS integration later)
    DELIVERY_CHARGE_TIER1 = 30   # ৳30 — Short (0-30 min zone)
    DELIVERY_CHARGE_TIER2 = 50   # ৳50 — Medium (30-45 min zone)
    DELIVERY_CHARGE_TIER3 = 80   # ৳80 — Far (45+ min zone)
    DELIVERY_CHARGE = 30         # Default minimum charge
    COD_FEE = 5                  # ৳5 cash-on-delivery handling fee
    SELLER_RESPONSE_TIMEOUT_MINUTES = 10
    BUYER_DECISION_TIMEOUT_MINUTES = 15


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

