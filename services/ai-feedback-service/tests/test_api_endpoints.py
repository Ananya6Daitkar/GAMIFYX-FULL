"""
Tests for API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
import json
from datetime import datetime

# Import the FastAPI app
from main import app


class TestAPIEndpoints:
    """Test cases for API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_model_manager(self, monkeypatch):
        """Mock model manager for testing"""
        mock_manager = MagicMock()
        mock_manager.initialized = True
        mock_manager.assess_code_quality.return_value = {
            "overall_score": 85.0,
            "maintainability_score": 80.0,
            "style_score": 75.0
        }
        
        # Mock the dependency
        def get_mock_model_manager():
            return mock_manager
        
        from app.api.routes.feedback import get_model_manager
        monkeypatch.setattr("app.api.routes.feedback.get_model_manager", 
                           lambda: mock_manager)
        
        return mock_manager
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        
        response = client.get("/health/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        assert "models_loaded" in data
        assert "dependencies" in data
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["service"] == "AI Feedback Engine"
        assert "version" in data
        assert "status" in data
    
    def test_readiness_probe(self, client):
        """Test Kubernetes readiness probe"""
        
        response = client.get("/health/ready")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_liveness_probe(self, client):
        """Test Kubernetes liveness probe"""
        
        response = client.get("/health/live")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"
        assert "timestamp" in data
    
    def test_feedback_analysis_endpoint(self, client, mock_model_manager):
        """Test code feedback analysis endpoint"""
        
        request_data = {
            "submission_id": "test-123",
            "user_id": "user-456",
            "code_content": "def hello():\n    print('Hello, World!')",
            "file_path": "hello.py",
            "language": "python",
            "submission_type": "assignment"
        }
        
        response = client.post("/feedback/analyze", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        required_fields = [
            "submission_id", "analysis_id", "overall_score",
            "metrics", "feedback_items", "processing_time_ms", "timestamp"
        ]
        
        for field in required_fields:
            assert field in data
        
        assert data["submission_id"] == request_data["submission_id"]
        assert 0 <= data["overall_score"] <= 100
        assert isinstance(data["feedback_items"], list)
        assert data["processing_time_ms"] > 0
    
    def test_feedback_analysis_invalid_language(self, client):
        """Test feedback analysis with invalid language"""
        
        request_data = {
            "submission_id": "test-123",
            "user_id": "user-456",
            "code_content": "some code",
            "file_path": "test.xyz",
            "language": "invalid_language",
            "submission_type": "assignment"
        }
        
        response = client.post("/feedback/analyze", json=request_data)
        
        assert response.status_code == 422
    
    def test_feedback_analysis_empty_code(self, client):
        """Test feedback analysis with empty code"""
        
        request_data = {
            "submission_id": "test-123",
            "user_id": "user-456",
            "code_content": "",
            "file_path": "empty.py",
            "language": "python",
            "submission_type": "assignment"
        }
        
        response = client.post("/feedback/analyze", json=request_data)
        
        assert response.status_code == 422
    
    def test_feedback_rating_endpoint(self, client):
        """Test feedback rating endpoint"""
        
        rating_data = {
            "feedback_id": "feedback-123",
            "user_id": "user-456",
            "rating": 4,
            "comment": "Very helpful feedback"
        }
        
        response = client.post("/feedback/rate", json=rating_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Feedback rating recorded successfully"
        assert data["feedback_id"] == rating_data["feedback_id"]
        assert data["rating"] == rating_data["rating"]
    
    def test_feedback_rating_invalid_rating(self, client):
        """Test feedback rating with invalid rating value"""
        
        rating_data = {
            "feedback_id": "feedback-123",
            "user_id": "user-456",
            "rating": 6,  # Invalid: should be 1-5
        }
        
        response = client.post("/feedback/rate", json=rating_data)
        
        assert response.status_code == 422
    
    def test_feedback_stats_endpoint(self, client):
        """Test feedback statistics endpoint"""
        
        response = client.get("/feedback/stats/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "total_analyses", "average_processing_time_ms",
            "average_feedback_rating", "success_rate", "supported_languages"
        ]
        
        for field in expected_fields:
            assert field in data
        
        assert isinstance(data["supported_languages"], list)
        assert len(data["supported_languages"]) > 0
    
    def test_analysis_metrics_endpoint(self, client):
        """Test code metrics analysis endpoint"""
        
        response = client.post(
            "/analysis/metrics",
            params={
                "code_content": "def test():\n    return True",
                "language": "python",
                "file_path": "test.py"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "metrics" in data
        assert "analysis_timestamp" in data
        assert "language" in data
        assert "file_path" in data
        
        metrics = data["metrics"]
        assert "lines_of_code" in metrics
        assert "complexity_score" in metrics
        assert "maintainability_index" in metrics
    
    def test_security_analysis_endpoint(self, client):
        """Test security analysis endpoint"""
        
        insecure_code = "eval(user_input)"
        
        response = client.post(
            "/analysis/security",
            params={
                "code_content": insecure_code,
                "language": "python"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "security_score" in data
        assert "vulnerabilities" in data
        assert "total_issues" in data
        assert "analysis_timestamp" in data
        
        # Should detect security issue
        assert data["total_issues"] > 0
        assert data["security_score"] < 100
    
    def test_complexity_analysis_endpoint(self, client):
        """Test complexity analysis endpoint"""
        
        complex_code = '''
def complex_function(x):
    if x > 0:
        if x > 10:
            return x * 2
        else:
            return x
    else:
        return 0
'''
        
        response = client.post(
            "/analysis/complexity",
            params={
                "code_content": complex_code,
                "language": "python"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "cyclomatic_complexity" in data
        assert "assessment" in data
        assert "recommendations" in data
        assert "analysis_timestamp" in data
        
        assert data["cyclomatic_complexity"] > 1
        assert isinstance(data["recommendations"], list)
    
    def test_supported_languages_endpoint(self, client):
        """Test supported languages endpoint"""
        
        response = client.get("/analysis/supported-languages")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "supported_languages" in data
        languages = data["supported_languages"]
        
        assert len(languages) > 0
        
        # Check structure of language info
        for lang in languages:
            assert "name" in lang
            assert "code" in lang
            assert "features" in lang
            assert isinstance(lang["features"], list)
    
    def test_prediction_model_info_endpoint(self, client):
        """Test prediction model info endpoint"""
        
        response = client.get("/prediction/model-info")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "models" in data
        assert "initialized" in data
        assert "timestamp" in data
    
    def test_detailed_health_check(self, client):
        """Test detailed health check endpoint"""
        
        response = client.get("/health/detailed")
        
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "total_analyses", "average_processing_time",
            "success_rate", "active_models", "uptime_seconds"
        ]
        
        for field in expected_fields:
            assert field in data
        
        assert isinstance(data["active_models"], list)
    
    def test_request_validation(self, client):
        """Test request validation for required fields"""
        
        # Missing required fields
        incomplete_request = {
            "submission_id": "test-123",
            # Missing other required fields
        }
        
        response = client.post("/feedback/analyze", json=incomplete_request)
        
        assert response.status_code == 422
        
        # Check error response structure
        error_data = response.json()
        assert "detail" in error_data
    
    def test_large_code_submission(self, client, mock_model_manager):
        """Test handling of large code submissions"""
        
        # Create large code content (but within limits)
        large_code = "# Large file\n" + "print('line')\n" * 1000
        
        request_data = {
            "submission_id": "test-large",
            "user_id": "user-456",
            "code_content": large_code,
            "file_path": "large.py",
            "language": "python",
            "submission_type": "project"
        }
        
        response = client.post("/feedback/analyze", json=request_data)
        
        # Should handle large files
        assert response.status_code == 200
    
    def test_concurrent_requests(self, client, mock_model_manager):
        """Test handling of concurrent requests"""
        
        import threading
        import time
        
        results = []
        
        def make_request():
            request_data = {
                "submission_id": f"test-{threading.current_thread().ident}",
                "user_id": "user-456",
                "code_content": "def test(): pass",
                "file_path": "test.py",
                "language": "python",
                "submission_type": "assignment"
            }
            
            response = client.post("/feedback/analyze", json=request_data)
            results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert all(status == 200 for status in results)


if __name__ == "__main__":
    pytest.main([__file__])