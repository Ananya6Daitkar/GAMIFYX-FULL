"""
Metrics collection and monitoring for AI Feedback Service
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from opentelemetry import metrics
from prometheus_client import Counter, Histogram, Gauge, Info
import asyncio

from ..core.telemetry import logger
from ..core.config import settings


class MetricsCollector:
    """Collects and manages AI service metrics"""
    
    def __init__(self):
        # Get OpenTelemetry meter
        self.meter = metrics.get_meter("ai-feedback-service", "1.0.0")
        
        # Prometheus metrics
        self._setup_prometheus_metrics()
        
        # OpenTelemetry metrics
        self._setup_otel_metrics()
        
        # Internal tracking
        self.analysis_history = deque(maxlen=1000)
        self.prediction_history = deque(maxlen=1000)
        self.error_counts = defaultdict(int)
        self.service_start_time = datetime.now()
        
    def _setup_prometheus_metrics(self):
        """Setup Prometheus metrics"""
        
        # Feedback generation metrics
        self.feedback_requests_total = Counter(
            'feedback_requests_total',
            'Total number of feedback requests',
            ['language', 'submission_type', 'status']
        )
        
        self.feedback_generation_duration = Histogram(
            'feedback_generation_duration_seconds',
            'Time taken to generate feedback',
            ['language', 'submission_type'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
        )
        
        self.feedback_accuracy_score = Histogram(
            'feedback_accuracy_score',
            'Feedback accuracy rating from users',
            buckets=[1.0, 2.0, 3.0, 4.0, 5.0]
        )
        
        # Performance prediction metrics
        self.prediction_requests_total = Counter(
            'prediction_requests_total',
            'Total number of performance predictions',
            ['prediction_type', 'status']
        )
        
        self.prediction_duration = Histogram(
            'prediction_duration_seconds',
            'Time taken for performance predictions',
            buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0]
        )
        
        self.prediction_confidence = Histogram(
            'prediction_confidence_score',
            'Confidence score of predictions',
            buckets=[0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0]
        )
        
        # Model performance metrics
        self.model_accuracy = Gauge(
            'model_accuracy',
            'Current model accuracy',
            ['model_name']
        )
        
        self.model_drift_score = Gauge(
            'model_drift_score',
            'Model drift detection score',
            ['model_name']
        )
        
        # Code analysis metrics
        self.code_quality_scores = Histogram(
            'code_quality_scores',
            'Distribution of code quality scores',
            ['language'],
            buckets=[0, 20, 40, 60, 80, 90, 95, 100]
        )
        
        self.security_issues_detected = Counter(
            'security_issues_detected_total',
            'Total security issues detected',
            ['language', 'severity']
        )
        
        # Service health metrics
        self.service_uptime = Gauge(
            'service_uptime_seconds',
            'Service uptime in seconds'
        )
        
        self.active_models = Gauge(
            'active_models_count',
            'Number of active ML models'
        )
        
        # Error metrics
        self.error_count = Counter(
            'errors_total',
            'Total number of errors',
            ['error_type', 'endpoint']
        )
        
        # Service info
        self.service_info = Info(
            'service_info',
            'Service information'
        )
        
        # Set service info
        self.service_info.info({
            'version': settings.VERSION,
            'environment': settings.ENVIRONMENT,
            'service_name': settings.OTEL_SERVICE_NAME
        })
    
    def _setup_otel_metrics(self):
        """Setup OpenTelemetry metrics"""
        
        # Feedback metrics
        self.otel_feedback_counter = self.meter.create_counter(
            name="feedback_requests",
            description="Number of feedback requests processed",
            unit="1"
        )
        
        self.otel_feedback_duration = self.meter.create_histogram(
            name="feedback_processing_time",
            description="Time taken to process feedback requests",
            unit="ms"
        )
        
        # Prediction metrics
        self.otel_prediction_counter = self.meter.create_counter(
            name="predictions_made",
            description="Number of predictions made",
            unit="1"
        )
        
        self.otel_prediction_accuracy = self.meter.create_histogram(
            name="prediction_accuracy",
            description="Accuracy of predictions",
            unit="1"
        )
        
        # Model metrics
        self.otel_model_load_time = self.meter.create_histogram(
            name="model_load_time",
            description="Time taken to load ML models",
            unit="ms"
        )
    
    def record_feedback_request(
        self,
        language: str,
        submission_type: str,
        duration_seconds: float,
        status: str = "success",
        overall_score: Optional[float] = None,
        feedback_count: Optional[int] = None
    ):
        """Record feedback generation metrics"""
        
        # Prometheus metrics
        self.feedback_requests_total.labels(
            language=language,
            submission_type=submission_type,
            status=status
        ).inc()
        
        if status == "success":
            self.feedback_generation_duration.labels(
                language=language,
                submission_type=submission_type
            ).observe(duration_seconds)
            
            if overall_score is not None:
                self.code_quality_scores.labels(language=language).observe(overall_score)
        
        # OpenTelemetry metrics
        self.otel_feedback_counter.add(1, {
            "language": language,
            "submission_type": submission_type,
            "status": status
        })
        
        self.otel_feedback_duration.record(duration_seconds * 1000, {
            "language": language,
            "status": status
        })
        
        # Internal tracking
        self.analysis_history.append({
            "timestamp": datetime.now(),
            "language": language,
            "submission_type": submission_type,
            "duration": duration_seconds,
            "status": status,
            "overall_score": overall_score,
            "feedback_count": feedback_count
        })
        
        logger.info(
            "Feedback request recorded",
            language=language,
            submission_type=submission_type,
            duration=duration_seconds,
            status=status
        )
    
    def record_prediction_request(
        self,
        prediction_type: str,
        duration_seconds: float,
        confidence: Optional[float] = None,
        predicted_value: Optional[float] = None,
        status: str = "success"
    ):
        """Record performance prediction metrics"""
        
        # Prometheus metrics
        self.prediction_requests_total.labels(
            prediction_type=prediction_type,
            status=status
        ).inc()
        
        if status == "success":
            self.prediction_duration.observe(duration_seconds)
            
            if confidence is not None:
                self.prediction_confidence.observe(confidence)
        
        # OpenTelemetry metrics
        self.otel_prediction_counter.add(1, {
            "prediction_type": prediction_type,
            "status": status
        })
        
        # Internal tracking
        self.prediction_history.append({
            "timestamp": datetime.now(),
            "prediction_type": prediction_type,
            "duration": duration_seconds,
            "confidence": confidence,
            "predicted_value": predicted_value,
            "status": status
        })
        
        logger.info(
            "Prediction request recorded",
            prediction_type=prediction_type,
            duration=duration_seconds,
            confidence=confidence,
            status=status
        )
    
    def record_security_issue(self, language: str, severity: str):
        """Record security issue detection"""
        
        self.security_issues_detected.labels(
            language=language,
            severity=severity
        ).inc()
        
        logger.info(
            "Security issue recorded",
            language=language,
            severity=severity
        )
    
    def record_feedback_rating(self, rating: int):
        """Record user feedback rating"""
        
        self.feedback_accuracy_score.observe(rating)
        
        logger.info("Feedback rating recorded", rating=rating)
    
    def record_model_accuracy(self, model_name: str, accuracy: float):
        """Record model accuracy"""
        
        self.model_accuracy.labels(model_name=model_name).set(accuracy)
        
        logger.info(
            "Model accuracy recorded",
            model_name=model_name,
            accuracy=accuracy
        )
    
    def record_model_drift(self, model_name: str, drift_score: float):
        """Record model drift score"""
        
        self.model_drift_score.labels(model_name=model_name).set(drift_score)
        
        if drift_score > 0.3:
            logger.warning(
                "High model drift detected",
                model_name=model_name,
                drift_score=drift_score
            )
    
    def record_error(self, error_type: str, endpoint: str):
        """Record error occurrence"""
        
        self.error_count.labels(
            error_type=error_type,
            endpoint=endpoint
        ).inc()
        
        self.error_counts[f"{error_type}:{endpoint}"] += 1
        
        logger.error(
            "Error recorded",
            error_type=error_type,
            endpoint=endpoint
        )
    
    def update_service_health(self, active_models_count: int):
        """Update service health metrics"""
        
        # Calculate uptime
        uptime_seconds = (datetime.now() - self.service_start_time).total_seconds()
        self.service_uptime.set(uptime_seconds)
        
        # Update active models count
        self.active_models.set(active_models_count)
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of collected metrics"""
        
        # Calculate recent performance
        recent_analyses = [
            a for a in self.analysis_history 
            if a["timestamp"] > datetime.now() - timedelta(hours=1)
        ]
        
        recent_predictions = [
            p for p in self.prediction_history 
            if p["timestamp"] > datetime.now() - timedelta(hours=1)
        ]
        
        # Calculate success rates
        total_analyses = len(recent_analyses)
        successful_analyses = len([a for a in recent_analyses if a["status"] == "success"])
        analysis_success_rate = (successful_analyses / total_analyses * 100) if total_analyses > 0 else 0
        
        total_predictions = len(recent_predictions)
        successful_predictions = len([p for p in recent_predictions if p["status"] == "success"])
        prediction_success_rate = (successful_predictions / total_predictions * 100) if total_predictions > 0 else 0
        
        # Calculate average processing times
        avg_analysis_time = (
            sum(a["duration"] for a in recent_analyses if a["status"] == "success") / successful_analyses
            if successful_analyses > 0 else 0
        )
        
        avg_prediction_time = (
            sum(p["duration"] for p in recent_predictions if p["status"] == "success") / successful_predictions
            if successful_predictions > 0 else 0
        )
        
        return {
            "service_uptime_hours": (datetime.now() - self.service_start_time).total_seconds() / 3600,
            "recent_metrics": {
                "analyses_last_hour": total_analyses,
                "predictions_last_hour": total_predictions,
                "analysis_success_rate": analysis_success_rate,
                "prediction_success_rate": prediction_success_rate,
                "avg_analysis_time_seconds": avg_analysis_time,
                "avg_prediction_time_seconds": avg_prediction_time
            },
            "total_metrics": {
                "total_analyses": len(self.analysis_history),
                "total_predictions": len(self.prediction_history),
                "total_errors": sum(self.error_counts.values())
            },
            "error_breakdown": dict(self.error_counts)
        }
    
    async def start_background_tasks(self):
        """Start background tasks for metrics collection"""
        
        async def update_health_metrics():
            """Background task to update health metrics"""
            while True:
                try:
                    # This would be updated by the model manager
                    self.update_service_health(active_models_count=3)  # Placeholder
                    await asyncio.sleep(30)  # Update every 30 seconds
                except Exception as e:
                    logger.error(f"Health metrics update failed: {str(e)}")
                    await asyncio.sleep(60)  # Retry after 1 minute
        
        # Start background task
        asyncio.create_task(update_health_metrics())
        logger.info("Background metrics collection started")


# Global metrics collector instance
metrics_collector = MetricsCollector()