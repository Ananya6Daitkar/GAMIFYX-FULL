"""
Feedback generation endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
import time
import uuid
from typing import Dict, Any

from ...models.schemas import (
    CodeSubmissionRequest, 
    FeedbackResponse, 
    FeedbackRatingRequest,
    CodeMetrics,
    FeedbackItem
)
from ...services.model_manager import ModelManager
from ...services.code_analyzer import CodeAnalyzer
from ...services.metrics_collector import metrics_collector
from ...core.telemetry import logger
from ...core.exceptions import CodeAnalysisException, FeedbackEngineException

router = APIRouter()


def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state"""
    from main import app
    return app.state.model_manager


def get_code_analyzer() -> CodeAnalyzer:
    """Dependency to get code analyzer"""
    return CodeAnalyzer()


@router.post("/analyze", response_model=FeedbackResponse)
async def analyze_code_submission(
    request: CodeSubmissionRequest,
    background_tasks: BackgroundTasks,
    model_manager: ModelManager = Depends(get_model_manager),
    code_analyzer: CodeAnalyzer = Depends(get_code_analyzer)
):
    """Analyze code submission and generate feedback"""
    
    start_time = time.time()
    analysis_id = str(uuid.uuid4())
    
    try:
        logger.info(
            "Starting code analysis",
            submission_id=request.submission_id,
            analysis_id=analysis_id,
            user_id=request.user_id,
            language=request.language
        )
        
        # Validate model manager
        if not model_manager or not model_manager.initialized:
            raise FeedbackEngineException("AI models not ready")
        
        # Analyze code
        metrics, feedback_items = await code_analyzer.analyze_code(
            request.code_content,
            request.language,
            request.file_path
        )
        
        # Calculate overall score using model
        code_metrics_dict = {
            "complexity": metrics.complexity_score,
            "maintainability": metrics.maintainability_index,
            "security": metrics.security_score,
            "style": metrics.style_score
        }
        
        quality_assessment = model_manager.assess_code_quality(code_metrics_dict)
        overall_score = quality_assessment.get("overall_score", 75.0)
        
        # Update metrics with model assessment
        enhanced_metrics = CodeMetrics(
            lines_of_code=metrics.lines_of_code,
            complexity_score=metrics.complexity_score,
            maintainability_index=quality_assessment.get("maintainability_score", metrics.maintainability_index),
            security_score=metrics.security_score,
            performance_score=metrics.performance_score,
            style_score=quality_assessment.get("style_score", metrics.style_score)
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Record metrics
        metrics_collector.record_feedback_request(
            language=request.language,
            submission_type=request.submission_type.value,
            duration_seconds=processing_time / 1000.0,
            status="success",
            overall_score=overall_score,
            feedback_count=len(feedback_items)
        )
        
        # Record security issues if any
        security_feedback = [f for f in feedback_items if f.type.value == "security"]
        for security_item in security_feedback:
            metrics_collector.record_security_issue(
                language=request.language,
                severity=security_item.severity.value
            )
        
        # Schedule background tasks
        background_tasks.add_task(
            log_analysis_metrics,
            analysis_id,
            request.submission_id,
            processing_time,
            overall_score
        )
        
        response = FeedbackResponse(
            submission_id=request.submission_id,
            analysis_id=analysis_id,
            overall_score=overall_score,
            metrics=enhanced_metrics,
            feedback_items=feedback_items,
            processing_time_ms=processing_time,
            timestamp=datetime.now()
        )
        
        logger.info(
            "Code analysis completed",
            analysis_id=analysis_id,
            overall_score=overall_score,
            feedback_count=len(feedback_items),
            processing_time_ms=processing_time
        )
        
        return response
        
    except CodeAnalysisException as e:
        # Record error metrics
        metrics_collector.record_feedback_request(
            language=request.language,
            submission_type=request.submission_type.value,
            duration_seconds=(time.time() - start_time),
            status="error"
        )
        metrics_collector.record_error("code_analysis_error", "/feedback/analyze")
        
        logger.error(f"Code analysis failed: {str(e)}", analysis_id=analysis_id)
        raise HTTPException(status_code=422, detail=str(e))
    
    except Exception as e:
        # Record error metrics
        metrics_collector.record_feedback_request(
            language=request.language,
            submission_type=request.submission_type.value,
            duration_seconds=(time.time() - start_time),
            status="error"
        )
        metrics_collector.record_error("internal_error", "/feedback/analyze")
        
        logger.error(f"Unexpected error in code analysis: {str(e)}", analysis_id=analysis_id)
        raise HTTPException(status_code=500, detail="Internal analysis error")


@router.get("/{submission_id}", response_model=FeedbackResponse)
async def get_feedback_results(submission_id: str):
    """Get cached feedback results for a submission"""
    
    # In a real implementation, this would fetch from database/cache
    # For now, return a placeholder response
    raise HTTPException(
        status_code=404, 
        detail="Feedback results not found. Use /analyze endpoint to generate new feedback."
    )


@router.post("/rate")
async def rate_feedback(request: FeedbackRatingRequest):
    """Rate the quality of generated feedback"""
    
    try:
        logger.info(
            "Feedback rating received",
            feedback_id=request.feedback_id,
            user_id=request.user_id,
            rating=request.rating
        )
        
        # Record feedback rating metrics
        metrics_collector.record_feedback_rating(request.rating)
        
        # In a real implementation, this would:
        # 1. Store the rating in database
        # 2. Update model training data
        # 3. Trigger model retraining if needed
        
        return {
            "message": "Feedback rating recorded successfully",
            "feedback_id": request.feedback_id,
            "rating": request.rating
        }
        
    except Exception as e:
        logger.error(f"Failed to record feedback rating: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record rating")


@router.get("/stats/summary")
async def get_feedback_stats():
    """Get feedback generation statistics"""
    
    # Placeholder statistics - would come from actual metrics
    return {
        "total_analyses": 0,
        "average_processing_time_ms": 0,
        "average_feedback_rating": 0.0,
        "success_rate": 100.0,
        "supported_languages": ["python", "javascript", "typescript", "java", "go"]
    }


async def log_analysis_metrics(
    analysis_id: str,
    submission_id: str,
    processing_time: int,
    overall_score: float
):
    """Background task to log analysis metrics"""
    
    try:
        # In a real implementation, this would:
        # 1. Store metrics in time-series database
        # 2. Update Prometheus metrics
        # 3. Trigger alerts if needed
        
        logger.info(
            "Analysis metrics logged",
            analysis_id=analysis_id,
            submission_id=submission_id,
            processing_time_ms=processing_time,
            overall_score=overall_score
        )
        
    except Exception as e:
        logger.error(f"Failed to log analysis metrics: {str(e)}")