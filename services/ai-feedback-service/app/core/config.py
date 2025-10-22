"""
Configuration settings for the AI Feedback Service
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Basic settings
    APP_NAME: str = "AI Feedback Engine"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:8080"
    ]
    
    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://aiops_user:aiops_password@localhost:5432/aiops_learning"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # GitHub integration
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_USERNAME: str = os.getenv("GITHUB_USERNAME", "Ananya6Daitkar")
    
    # AI/ML settings
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "./models")
    MAX_CODE_LENGTH: int = int(os.getenv("MAX_CODE_LENGTH", "50000"))
    FEEDBACK_TIMEOUT: int = int(os.getenv("FEEDBACK_TIMEOUT", "30"))
    
    # OpenTelemetry settings
    OTEL_SERVICE_NAME: str = os.getenv("OTEL_SERVICE_NAME", "ai-feedback-service")
    OTEL_EXPORTER_OTLP_ENDPOINT: str = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    PROMETHEUS_PORT: int = int(os.getenv("PROMETHEUS_PORT", "9466"))
    JAEGER_ENDPOINT: str = os.getenv("JAEGER_ENDPOINT", "http://localhost:14268/api/traces")
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # External services
    SUBMISSION_SERVICE_URL: str = os.getenv("SUBMISSION_SERVICE_URL", "http://localhost:3002")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:3001")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()