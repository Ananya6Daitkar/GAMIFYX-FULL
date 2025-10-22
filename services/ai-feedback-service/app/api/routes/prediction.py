"""
Performance prediction endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Dict, Any, List
import uuid
import time

from ...models.schemas import PerformancePredictionRequest, PerformancePrediction
from ...services.model_manager import ModelManager
from ...services.metrics_collector import metrics_collector
from ...core.telemetry import logger
from ...core.exceptions import PredictionException, ModelLoadException

router = APIRouter()


def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state"""
    from main import app
    return app.state.model_manager


@router.post("/performance", response_model=PerformancePrediction)
async def predict_student_performance(
    request: PerformancePredictionRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Predict student performance based on historical data"""
    
    start_time = time.time()
    
    try:
        logger.info(f"Predicting performance for user {request.user_id}")
        
        if not model_manager or not model_manager.initialized:
            raise ModelLoadException("Performance prediction model not available")
        
        # Get prediction from enhanced model
        prediction_result = await model_manager.predict_performance(request.historical_data)
        
        # Calculate risk score
        features = _extract_performance_features(request.historical_data)
        risk_score = model_manager.calculate_risk_score(features)
        
        # Generate recommendations
        recommendations = _generate_performance_recommendations(
            prediction_result["predicted_performance"],
            risk_score,
            features
        )
        
        processing_time = time.time() - start_time
        
        # Record metrics
        metrics_collector.record_prediction_request(
            prediction_type="performance",
            duration_seconds=processing_time,
            confidence=prediction_result.get("confidence", 0.8),
            predicted_value=prediction_result["predicted_performance"],
            status="success"
        )
        
        response = PerformancePrediction(
            user_id=request.user_id,
            risk_score=risk_score,
            predicted_performance=prediction_result["predicted_performance"],
            confidence=prediction_result["confidence"],
            factors=prediction_result["factors"],
            recommendations=recommendations,
            timestamp=datetime.now()
        )
        
        logger.info(
            f"Performance prediction completed",
            user_id=request.user_id,
            predicted_performance=response.predicted_performance,
            risk_score=response.risk_score
        )
        
        return response
        
    except ModelLoadException as e:
        logger.error(f"Model not available: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    
    except Exception as e:
        logger.error(f"Performance prediction failed: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Prediction failed: {str(e)}")


@router.post("/risk-score")
async def calculate_risk_score(
    user_id: str,
    historical_data: Dict[str, Any],
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Calculate risk score for a student"""
    
    try:
        logger.info(f"Calculating risk score for user {user_id}")
        
        if not model_manager or not model_manager.initialized:
            raise ModelLoadException("Risk scoring model not available")
        
        features = _extract_performance_features(historical_data)
        risk_score = model_manager.calculate_risk_score(features)
        
        # Risk level assessment
        if risk_score >= 0.7:
            risk_level = "High"
            alert_needed = True
        elif risk_score >= 0.4:
            risk_level = "Medium"
            alert_needed = False
        else:
            risk_level = "Low"
            alert_needed = False
        
        return {
            "user_id": user_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "alert_needed": alert_needed,
            "factors": features,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Risk score calculation failed: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Risk calculation failed: {str(e)}")


@router.post("/batch-predictions")
async def batch_predict_performance(
    predictions: List[PerformancePredictionRequest],
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Batch prediction for multiple students"""
    
    try:
        logger.info(f"Processing batch predictions for {len(predictions)} students")
        
        if not model_manager or not model_manager.initialized:
            raise ModelLoadException("Prediction models not available")
        
        results = []
        
        for request in predictions:
            try:
                features = _extract_performance_features(request.historical_data)
                prediction_result = model_manager.predict_performance(features)
                risk_score = model_manager.calculate_risk_score(features)
                
                results.append({
                    "user_id": request.user_id,
                    "predicted_performance": prediction_result["predicted_performance"],
                    "risk_score": risk_score,
                    "confidence": prediction_result["confidence"],
                    "status": "success"
                })
                
            except Exception as e:
                logger.error(f"Prediction failed for user {request.user_id}: {str(e)}")
                results.append({
                    "user_id": request.user_id,
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "total_predictions": len(predictions),
            "successful_predictions": len([r for r in results if r["status"] == "success"]),
            "failed_predictions": len([r for r in results if r["status"] == "error"]),
            "results": results,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Batch prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.get("/model-info")
async def get_prediction_model_info(model_manager: ModelManager = Depends(get_model_manager)):
    """Get information about prediction models"""
    
    try:
        if not model_manager:
            return {"error": "Model manager not available"}
        
        model_info = model_manager.get_model_info()
        
        return {
            "models": model_info,
            "initialized": model_manager.initialized,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Failed to get model info: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model information")


def _extract_performance_features(historical_data: Dict[str, Any]) -> Dict[str, float]:
    """Extract features from historical data for ML models"""
    
    # Default values for missing features
    default_features = {
        "submission_frequency": 0.5,
        "code_quality_avg": 0.5,
        "test_coverage_avg": 0.5,
        "feedback_implementation_rate": 0.5,
        "engagement_score": 0.5
    }
    
    # Extract and normalize features
    features = {}
    
    # Submission frequency (submissions per week)
    submissions_per_week = historical_data.get("submissions_per_week", 3)
    features["submission_frequency"] = min(1.0, submissions_per_week / 10.0)
    
    # Average code quality score
    avg_quality = historical_data.get("average_code_quality", 75)
    features["code_quality_avg"] = avg_quality / 100.0
    
    # Test coverage
    test_coverage = historical_data.get("average_test_coverage", 60)
    features["test_coverage_avg"] = test_coverage / 100.0
    
    # Feedback implementation rate
    feedback_rate = historical_data.get("feedback_implementation_rate", 70)
    features["feedback_implementation_rate"] = feedback_rate / 100.0
    
    # Engagement score (based on activity)
    login_frequency = historical_data.get("login_frequency", 5)  # logins per week
    time_spent = historical_data.get("average_session_time", 30)  # minutes
    engagement = (login_frequency / 10.0 + time_spent / 60.0) / 2.0
    features["engagement_score"] = min(1.0, engagement)
    
    # Fill missing features with defaults
    for key, default_value in default_features.items():
        if key not in features:
            features[key] = default_value
    
    return features


def _generate_performance_recommendations(
    predicted_performance: float,
    risk_score: float,
    features: Dict[str, float]
) -> List[str]:
    """Generate personalized recommendations based on prediction"""
    
    recommendations = []
    
    # Performance-based recommendations
    if predicted_performance < 60:
        recommendations.append("Consider scheduling additional study sessions")
        recommendations.append("Review fundamental concepts before moving to advanced topics")
    elif predicted_performance < 80:
        recommendations.append("Focus on consistent practice and code quality improvement")
    
    # Risk-based recommendations
    if risk_score > 0.7:
        recommendations.append("Immediate intervention recommended - schedule mentor meeting")
        recommendations.append("Consider peer programming sessions for additional support")
    elif risk_score > 0.4:
        recommendations.append("Monitor progress closely and provide additional resources")
    
    # Feature-specific recommendations
    if features["submission_frequency"] < 0.3:
        recommendations.append("Increase submission frequency to maintain learning momentum")
    
    if features["code_quality_avg"] < 0.6:
        recommendations.append("Focus on code quality - review best practices and style guides")
    
    if features["test_coverage_avg"] < 0.5:
        recommendations.append("Improve test coverage - practice writing unit tests")
    
    if features["feedback_implementation_rate"] < 0.5:
        recommendations.append("Pay more attention to feedback and implement suggested improvements")
    
    if features["engagement_score"] < 0.4:
        recommendations.append("Increase engagement - participate more in discussions and activities")
    
    # Ensure we always have at least one recommendation
    if not recommendations:
        recommendations.append("Continue current learning approach - performance looks good")
    
    return recommendations