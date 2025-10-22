"""
AI-Powered Feedback Engine for GamifyX Platform
FastAPI service with ML models for code analysis and feedback generation
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import asyncio
import logging
import time
from datetime import datetime
import uuid

from src.models.feedback_models import (
    CodeAnalysisRequest,
    CodeAnalysisResponse,
    FeedbackItem,
    AIInsight,
    PerformancePrediction,
    SkillAssessment
)
from src.services.code_analyzer import CodeAnalyzerService
from src.services.ml_predictor import MLPredictorService
from src.services.feedback_generator import FeedbackGeneratorService
from src.services.skill_assessor import SkillAssessorService
from src.utils.telemetry import setup_telemetry, get_tracer, get_meter
from src.utils.config import get_settings

# Initialize FastAPI app
app = FastAPI(
    title="GamifyX AI Feedback Engine",
    description="AI-powered code analysis and feedback generation service",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
settings = get_settings()
setup_telemetry(settings.service_name, settings.otel_endpoint)

tracer = get_tracer(__name__)
meter = get_meter(__name__)

# Metrics
analysis_counter = meter.create_counter(
    "ai_feedback_analysis_total",
    description="Total number of code analyses performed"
)

analysis_duration = meter.create_histogram(
    "ai_feedback_analysis_duration_seconds",
    description="Duration of code analysis operations"
)

prediction_accuracy = meter.create_gauge(
    "ai_feedback_prediction_accuracy",
    description="Current prediction accuracy of ML models"
)

# Initialize AI services
code_analyzer = CodeAnalyzerService()
ml_predictor = MLPredictorService()
feedback_generator = FeedbackGeneratorService()
skill_assessor = SkillAssessorService()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring"""
    return {
        "status": "healthy",
        "service": "ai-feedback-service",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": {
            "code_analyzer": code_analyzer.is_ready(),
            "ml_predictor": ml_predictor.is_ready(),
            "feedback_generator": feedback_generator.is_ready(),
            "skill_assessor": skill_assessor.is_ready()
        }
    }

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    # This would typically be handled by OpenTelemetry exporter
    return {"message": "Metrics available at /metrics endpoint"}

@app.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(
    request: CodeAnalysisRequest,
    background_tasks: BackgroundTasks
) -> CodeAnalysisResponse:
    """
    Comprehensive code analysis with AI-powered feedback generation
    """
    with tracer.start_as_current_span("analyze_code") as span:
        start_time = time.time()
        analysis_id = str(uuid.uuid4())
        
        span.set_attributes({
            "analysis.id": analysis_id,
            "submission.id": request.submission_id,
            "user.id": request.user_id,
            "language": request.language,
            "code.size": len(request.code_content)
        })
        
        try:
            # Parallel analysis execution
            analysis_tasks = [
                code_analyzer.analyze_code(request),
                ml_predictor.predict_performance(request),
                skill_assessor.assess_skills(request)
            ]
            
            code_analysis, performance_prediction, skill_assessment = await asyncio.gather(
                *analysis_tasks
            )
            
            # Generate comprehensive feedback
            feedback_items = await feedback_generator.generate_feedback(
                request, code_analysis, performance_prediction, skill_assessment
            )
            
            # Generate AI insights
            ai_insights = await feedback_generator.generate_insights(
                request, code_analysis, performance_prediction, skill_assessment
            )
            
            # Calculate overall scores
            overall_score = calculate_overall_score(
                code_analysis, performance_prediction, skill_assessment
            )
            
            # Create response
            response = CodeAnalysisResponse(
                analysis_id=analysis_id,
                submission_id=request.submission_id,
                user_id=request.user_id,
                overall_score=overall_score,
                confidence_level=calculate_confidence_level(code_analysis, performance_prediction),
                feedback_items=feedback_items,
                ai_insights=ai_insights,
                skill_assessment=skill_assessment,
                performance_prediction=performance_prediction,
                processing_time=time.time() - start_time,
                analysis_version="2.0.0",
                created_at=datetime.utcnow()
            )
            
            # Record metrics
            analysis_counter.add(1, {
                "language": request.language,
                "success": "true"
            })
            
            analysis_duration.record(
                time.time() - start_time,
                {"language": request.language}
            )
            
            # Schedule background tasks
            background_tasks.add_task(
                update_model_performance,
                analysis_id,
                request,
                response
            )
            
            return response
            
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            
            analysis_counter.add(1, {
                "language": request.language,
                "success": "false"
            })
            
            logging.error(f"Analysis failed for {analysis_id}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {str(e)}"
            )

@app.post("/feedback/generate")
async def generate_feedback(
    submission_id: str,
    user_id: str,
    code_content: str,
    language: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate targeted feedback for specific code issues
    """
    with tracer.start_as_current_span("generate_feedback") as span:
        span.set_attributes({
            "submission.id": submission_id,
            "user.id": user_id,
            "language": language
        })
        
        try:
            request = CodeAnalysisRequest(
                submission_id=submission_id,
                user_id=user_id,
                code_content=code_content,
                language=language,
                context=context or {}
            )
            
            # Quick analysis for targeted feedback
            code_analysis = await code_analyzer.quick_analyze(request)
            feedback_items = await feedback_generator.generate_targeted_feedback(
                request, code_analysis
            )
            
            return {
                "submission_id": submission_id,
                "feedback_items": [item.dict() for item in feedback_items],
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            span.record_exception(e)
            raise HTTPException(
                status_code=500,
                detail=f"Feedback generation failed: {str(e)}"
            )

@app.get("/insights/{submission_id}")
async def get_ai_insights(submission_id: str) -> Dict[str, Any]:
    """
    Get AI-generated insights for a specific submission
    """
    with tracer.start_as_current_span("get_ai_insights") as span:
        span.set_attributes({"submission.id": submission_id})
        
        try:
            # Retrieve cached insights or generate new ones
            insights = await feedback_generator.get_cached_insights(submission_id)
            
            if not insights:
                raise HTTPException(
                    status_code=404,
                    detail="Insights not found for submission"
                )
            
            return {
                "submission_id": submission_id,
                "insights": [insight.dict() for insight in insights],
                "retrieved_at": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            span.record_exception(e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve insights: {str(e)}"
            )

@app.post("/predictions/performance")
async def predict_performance(
    user_id: str,
    historical_data: List[Dict[str, Any]],
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Predict user performance based on historical data
    """
    with tracer.start_as_current_span("predict_performance") as span:
        span.set_attributes({
            "user.id": user_id,
            "data_points": len(historical_data)
        })
        
        try:
            prediction = await ml_predictor.predict_user_performance(
                user_id, historical_data, context
            )
            
            return {
                "user_id": user_id,
                "prediction": prediction.dict(),
                "predicted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            span.record_exception(e)
            raise HTTPException(
                status_code=500,
                detail=f"Performance prediction failed: {str(e)}"
            )

@app.get("/models/status")
async def get_model_status() -> Dict[str, Any]:
    """
    Get status and performance metrics of all ML models
    """
    return {
        "models": {
            "code_analyzer": {
                "status": "ready" if code_analyzer.is_ready() else "loading",
                "version": code_analyzer.get_version(),
                "accuracy": code_analyzer.get_accuracy(),
                "last_updated": code_analyzer.get_last_updated()
            },
            "ml_predictor": {
                "status": "ready" if ml_predictor.is_ready() else "loading",
                "version": ml_predictor.get_version(),
                "accuracy": ml_predictor.get_accuracy(),
                "last_updated": ml_predictor.get_last_updated()
            },
            "feedback_generator": {
                "status": "ready" if feedback_generator.is_ready() else "loading",
                "version": feedback_generator.get_version(),
                "last_updated": feedback_generator.get_last_updated()
            },
            "skill_assessor": {
                "status": "ready" if skill_assessor.is_ready() else "loading",
                "version": skill_assessor.get_version(),
                "accuracy": skill_assessor.get_accuracy(),
                "last_updated": skill_assessor.get_last_updated()
            }
        },
        "system": {
            "total_analyses": analysis_counter._value if hasattr(analysis_counter, '_value') else 0,
            "average_processing_time": 2.5,  # Would be calculated from metrics
            "uptime": time.time() - start_time if 'start_time' in globals() else 0
        }
    }

# Helper functions
def calculate_overall_score(
    code_analysis: Dict[str, Any],
    performance_prediction: PerformancePrediction,
    skill_assessment: SkillAssessment
) -> float:
    """Calculate overall score from different analysis components"""
    weights = {
        "code_quality": 0.3,
        "performance": 0.2,
        "security": 0.2,
        "maintainability": 0.15,
        "testing": 0.15
    }
    
    scores = {
        "code_quality": code_analysis.get("quality_score", 0),
        "performance": performance_prediction.performance_score,
        "security": code_analysis.get("security_score", 0),
        "maintainability": code_analysis.get("maintainability_score", 0),
        "testing": code_analysis.get("test_score", 0)
    }
    
    overall_score = sum(scores[key] * weights[key] for key in weights.keys())
    return round(overall_score, 2)

def calculate_confidence_level(
    code_analysis: Dict[str, Any],
    performance_prediction: PerformancePrediction
) -> float:
    """Calculate confidence level of the analysis"""
    code_confidence = code_analysis.get("confidence", 0.8)
    prediction_confidence = performance_prediction.confidence_level
    
    # Weighted average of confidence levels
    overall_confidence = (code_confidence * 0.6 + prediction_confidence * 0.4)
    return round(overall_confidence, 3)

async def update_model_performance(
    analysis_id: str,
    request: CodeAnalysisRequest,
    response: CodeAnalysisResponse
):
    """Background task to update model performance metrics"""
    try:
        # Update model accuracy metrics
        await ml_predictor.update_performance_metrics(analysis_id, request, response)
        await code_analyzer.update_performance_metrics(analysis_id, request, response)
        
        # Log successful analysis
        logging.info(f"Analysis {analysis_id} completed successfully")
        
    except Exception as e:
        logging.error(f"Failed to update model performance for {analysis_id}: {str(e)}")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services and models on startup"""
    global start_time
    start_time = time.time()
    
    logging.info("Starting AI Feedback Service...")
    
    # Initialize all services
    await asyncio.gather(
        code_analyzer.initialize(),
        ml_predictor.initialize(),
        feedback_generator.initialize(),
        skill_assessor.initialize()
    )
    
    logging.info("AI Feedback Service started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logging.info("Shutting down AI Feedback Service...")
    
    # Cleanup services
    await asyncio.gather(
        code_analyzer.cleanup(),
        ml_predictor.cleanup(),
        feedback_generator.cleanup(),
        skill_assessor.cleanup()
    )
    
    logging.info("AI Feedback Service shutdown complete")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )