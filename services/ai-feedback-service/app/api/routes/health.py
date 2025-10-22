"""
Health check endpoints
"""

from fastapi import APIRouter, Depends
from datetime import datetime
from typing import Dict

from ...models.schemas import HealthResponse, ServiceMetrics
from ...services.model_manager import ModelManager
from ...core.config import settings
from ...core.telemetry import logger

router = APIRouter()


def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state"""
    from main import app
    return app.state.model_manager


@router.get("/", response_model=HealthResponse)
async def health_check(model_manager: ModelManager = Depends(get_model_manager)):
    """Basic health check endpoint"""
    
    try:
        models_loaded = model_manager.initialized if model_manager else False
        
        # Check dependencies
        dependencies = {
            "models": "healthy" if models_loaded else "unhealthy",
            "database": "healthy",  # Placeholder - would check actual DB
            "redis": "healthy"      # Placeholder - would check actual Redis
        }
        
        status = "healthy" if all(dep == "healthy" for dep in dependencies.values()) else "unhealthy"
        
        return HealthResponse(
            status=status,
            timestamp=datetime.now(),
            version=settings.VERSION,
            models_loaded=models_loaded,
            dependencies=dependencies
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.now(),
            version=settings.VERSION,
            models_loaded=False,
            dependencies={"error": str(e)}
        )


@router.get("/detailed", response_model=ServiceMetrics)
async def detailed_health_check(model_manager: ModelManager = Depends(get_model_manager)):
    """Detailed health check with metrics"""
    
    try:
        model_info = model_manager.get_model_info() if model_manager else {}
        
        return ServiceMetrics(
            total_analyses=0,  # Would track actual metrics
            average_processing_time=0.0,
            success_rate=100.0,
            active_models=[
                {
                    "name": info["name"],
                    "version": info["version"],
                    "loaded": info["loaded"],
                    "last_updated": info["last_updated"],
                    "accuracy": info.get("accuracy")
                }
                for info in model_info.values()
            ],
            uptime_seconds=0  # Would track actual uptime
        )
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        raise


@router.get("/ready")
async def readiness_check(model_manager: ModelManager = Depends(get_model_manager)):
    """Kubernetes readiness probe"""
    
    if not model_manager or not model_manager.initialized:
        return {"status": "not ready", "reason": "models not loaded"}
    
    return {"status": "ready"}


@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.now()}