"""
Tests for performance prediction functionality
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from app.services.performance_predictor import PerformancePredictor
from app.core.exceptions import PredictionException


class TestPerformancePredictor:
    """Test cases for PerformancePredictor"""
    
    @pytest.fixture
    async def predictor(self):
        """Create and initialize PerformancePredictor instance"""
        predictor = PerformancePredictor()
        await predictor.initialize()
        return predictor
    
    @pytest.mark.asyncio
    async def test_initialization(self):
        """Test predictor initialization"""
        
        predictor = PerformancePredictor()
        await predictor.initialize()
        
        assert predictor.model is not None
        assert predictor.scaler is not None
        assert predictor.model_accuracy > 0
        assert predictor.last_training_date is not None
    
    @pytest.mark.asyncio
    async def test_basic_prediction(self, predictor):
        """Test basic performance prediction"""
        
        student_data = {
            "submissions_per_week": 5,
            "average_code_quality": 80,
            "average_test_coverage": 70,
            "feedback_implementation_rate": 85,
            "login_frequency": 7,
            "average_session_time": 45,
            "last_submission_date": datetime.now() - timedelta(days=1),
            "class_average_performance": 75,
            "student_average_performance": 80
        }
        
        result = await predictor.predict_performance(student_data)
        
        # Check result structure
        assert "predicted_performance" in result
        assert "features_used" in result
        assert "prediction_timestamp" in result
        assert "confidence" in result
        
        # Check value ranges
        assert 0 <= result["predicted_performance"] <= 100
        assert 0 <= result["confidence"] <= 1.0
        
        # Check features
        features = result["features_used"]
        assert len(features) == len(predictor.feature_names)
        for feature_name in predictor.feature_names:
            assert feature_name in features
            assert 0 <= features[feature_name] <= 1.0
    
    @pytest.mark.asyncio
    async def test_prediction_with_minimal_data(self, predictor):
        """Test prediction with minimal student data"""
        
        minimal_data = {
            "submissions_per_week": 2,
            "average_code_quality": 60
        }
        
        result = await predictor.predict_performance(minimal_data)
        
        # Should still work with default values
        assert "predicted_performance" in result
        assert 0 <= result["predicted_performance"] <= 100
    
    @pytest.mark.asyncio
    async def test_prediction_confidence_intervals(self, predictor):
        """Test prediction confidence intervals"""
        
        student_data = {
            "submissions_per_week": 8,
            "average_code_quality": 90,
            "average_test_coverage": 85,
            "feedback_implementation_rate": 90,
            "login_frequency": 10,
            "average_session_time": 60
        }
        
        result = await predictor.predict_performance(student_data, include_confidence=True)
        
        # Check confidence interval
        assert "prediction_interval" in result
        interval = result["prediction_interval"]
        assert "lower" in interval
        assert "upper" in interval
        assert interval["lower"] <= result["predicted_performance"] <= interval["upper"]
        assert "prediction_variance" in result
    
    @pytest.mark.asyncio
    async def test_high_performance_student(self, predictor):
        """Test prediction for high-performing student"""
        
        high_performer_data = {
            "submissions_per_week": 10,
            "average_code_quality": 95,
            "average_test_coverage": 90,
            "feedback_implementation_rate": 95,
            "login_frequency": 12,
            "average_session_time": 90,
            "last_submission_date": datetime.now(),
            "difficulty_progression": [80, 85, 90, 95],
            "class_average_performance": 75,
            "student_average_performance": 92
        }
        
        result = await predictor.predict_performance(high_performer_data)
        
        # Should predict high performance
        assert result["predicted_performance"] > 75
        assert result["confidence"] > 0.7
    
    @pytest.mark.asyncio
    async def test_at_risk_student(self, predictor):
        """Test prediction for at-risk student"""
        
        at_risk_data = {
            "submissions_per_week": 1,
            "average_code_quality": 45,
            "average_test_coverage": 30,
            "feedback_implementation_rate": 20,
            "login_frequency": 2,
            "average_session_time": 15,
            "last_submission_date": datetime.now() - timedelta(days=10),
            "class_average_performance": 75,
            "student_average_performance": 40
        }
        
        result = await predictor.predict_performance(at_risk_data)
        
        # Should predict lower performance
        assert result["predicted_performance"] < 60
    
    @pytest.mark.asyncio
    async def test_feature_extraction(self, predictor):
        """Test feature extraction from student data"""
        
        student_data = {
            "submissions_per_week": 5,
            "average_code_quality": 80,
            "average_test_coverage": 70,
            "feedback_implementation_rate": 85,
            "login_frequency": 7,
            "average_session_time": 45,
            "last_submission_date": "2024-01-15T10:00:00",
            "difficulty_progression": [70, 75, 80],
            "class_average_performance": 75,
            "student_average_performance": 80
        }
        
        features = predictor._extract_features(student_data)
        
        # Check all expected features are present
        expected_features = [
            "submission_frequency",
            "code_quality_avg",
            "test_coverage_avg",
            "feedback_implementation_rate",
            "engagement_score",
            "time_since_last_submission",
            "difficulty_progression",
            "peer_comparison_score"
        ]
        
        for feature in expected_features:
            assert feature in features
            assert 0 <= features[feature] <= 1.0
    
    @pytest.mark.asyncio
    async def test_model_drift_detection(self, predictor):
        """Test model drift detection"""
        
        # Add some prediction history
        for i in range(150):
            student_data = {
                "submissions_per_week": np.random.randint(1, 10),
                "average_code_quality": np.random.randint(40, 100),
                "average_test_coverage": np.random.randint(30, 90)
            }
            await predictor.predict_performance(student_data)
        
        drift_result = await predictor.detect_model_drift()
        
        assert "drift_detected" in drift_result
        assert "drift_score" in drift_result
        assert "recommendation" in drift_result
        assert isinstance(drift_result["drift_detected"], bool)
    
    @pytest.mark.asyncio
    async def test_feature_importance(self, predictor):
        """Test feature importance extraction"""
        
        importance = predictor.get_feature_importance()
        
        # Should have importance for all features
        assert len(importance) == len(predictor.feature_names)
        
        # All importance scores should be non-negative
        for feature, score in importance.items():
            assert score >= 0
        
        # Importance scores should sum to approximately 1
        total_importance = sum(importance.values())
        assert abs(total_importance - 1.0) < 0.1
    
    @pytest.mark.asyncio
    async def test_model_info(self, predictor):
        """Test model information retrieval"""
        
        info = predictor.get_model_info()
        
        required_fields = [
            "model_type",
            "feature_count",
            "features",
            "accuracy",
            "last_training_date",
            "prediction_count",
            "model_loaded"
        ]
        
        for field in required_fields:
            assert field in info
        
        assert info["model_loaded"] is True
        assert info["feature_count"] == len(predictor.feature_names)
        assert info["features"] == predictor.feature_names
    
    @pytest.mark.asyncio
    async def test_prediction_without_initialization(self):
        """Test prediction fails without initialization"""
        
        predictor = PerformancePredictor()
        
        with pytest.raises(PredictionException):
            await predictor.predict_performance({"test": "data"})
    
    @pytest.mark.asyncio
    async def test_prediction_history_tracking(self, predictor):
        """Test that predictions are tracked in history"""
        
        initial_count = len(predictor.prediction_history)
        
        student_data = {
            "submissions_per_week": 5,
            "average_code_quality": 75
        }
        
        await predictor.predict_performance(student_data)
        
        # History should increase
        assert len(predictor.prediction_history) == initial_count + 1
        
        # Latest prediction should be in history
        latest = predictor.prediction_history[-1]
        assert "timestamp" in latest
        assert "features" in latest
        assert "prediction" in latest
    
    @pytest.mark.asyncio
    async def test_prediction_history_limit(self, predictor):
        """Test that prediction history is limited to prevent memory issues"""
        
        # Add many predictions
        for i in range(1100):  # More than the limit of 1000
            student_data = {
                "submissions_per_week": i % 10 + 1,
                "average_code_quality": (i % 50) + 50
            }
            await predictor.predict_performance(student_data)
        
        # Should be limited to 1000
        assert len(predictor.prediction_history) == 1000


if __name__ == "__main__":
    pytest.main([__file__])