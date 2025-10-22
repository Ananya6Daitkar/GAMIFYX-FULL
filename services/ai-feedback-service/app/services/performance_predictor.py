"""
Student Performance Prediction Service
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

from ..core.config import settings
from ..core.telemetry import logger
from ..core.exceptions import PredictionException


class PerformancePredictor:
    """Advanced student performance prediction with drift detection"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = [
            'submission_frequency',
            'code_quality_avg',
            'test_coverage_avg',
            'feedback_implementation_rate',
            'engagement_score',
            'time_since_last_submission',
            'difficulty_progression',
            'peer_comparison_score'
        ]
        self.model_accuracy = 0.0
        self.last_training_date = None
        self.prediction_history = []
        
    async def initialize(self):
        """Initialize the performance prediction model"""
        try:
            model_path = os.path.join(settings.MODEL_CACHE_DIR, "performance_predictor.pkl")
            scaler_path = os.path.join(settings.MODEL_CACHE_DIR, "performance_scaler.pkl")
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                logger.info("Loaded existing performance prediction model")
            else:
                await self._train_initial_model()
                self._save_model()
                logger.info("Created new performance prediction model")
                
        except Exception as e:
            logger.error(f"Failed to initialize performance predictor: {str(e)}")
            raise PredictionException(f"Model initialization failed: {str(e)}")
    
    async def _train_initial_model(self):
        """Train initial model with synthetic data"""
        logger.info("Training initial performance prediction model")
        
        # Generate synthetic training data
        X, y = self._generate_synthetic_data(2000)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        self.model_accuracy = r2_score(y_test, y_pred)
        
        self.last_training_date = datetime.now()
        
        logger.info(f"Model trained with accuracy: {self.model_accuracy:.3f}")
    
    def _generate_synthetic_data(self, n_samples: int) -> Tuple[np.ndarray, np.ndarray]:
        """Generate realistic synthetic training data"""
        np.random.seed(42)
        
        # Generate correlated features
        X = np.random.rand(n_samples, len(self.feature_names))
        
        # Add realistic correlations
        # Students with high engagement tend to have better code quality
        X[:, 1] = 0.7 * X[:, 4] + 0.3 * np.random.rand(n_samples)  # code_quality vs engagement
        
        # Students who implement feedback tend to have better test coverage
        X[:, 2] = 0.6 * X[:, 3] + 0.4 * np.random.rand(n_samples)  # test_coverage vs feedback_impl
        
        # Time since last submission affects performance negatively
        X[:, 5] = np.random.exponential(0.3, n_samples)  # time_since_last_submission
        X[:, 5] = np.clip(X[:, 5], 0, 1)
        
        # Difficulty progression (how well student handles increasing difficulty)
        X[:, 6] = np.random.beta(2, 2, n_samples)  # difficulty_progression
        
        # Peer comparison (relative performance)
        X[:, 7] = np.random.normal(0.5, 0.2, n_samples)  # peer_comparison_score
        X[:, 7] = np.clip(X[:, 7], 0, 1)
        
        # Calculate performance based on weighted features
        performance = (
            0.25 * X[:, 0] +  # submission_frequency
            0.30 * X[:, 1] +  # code_quality_avg
            0.15 * X[:, 2] +  # test_coverage_avg
            0.10 * X[:, 3] +  # feedback_implementation_rate
            0.20 * X[:, 4] +  # engagement_score
            -0.15 * X[:, 5] + # time_since_last_submission (negative impact)
            0.10 * X[:, 6] +  # difficulty_progression
            0.05 * X[:, 7] +  # peer_comparison_score
            np.random.normal(0, 0.1, n_samples)  # noise
        )
        
        # Normalize to 0-100 range with realistic distribution
        y = np.clip(performance * 100, 20, 100)  # Min score of 20
        
        return X, y
    
    async def predict_performance(
        self, 
        student_data: Dict[str, Any],
        include_confidence: bool = True
    ) -> Dict[str, Any]:
        """Predict student performance with confidence intervals"""
        
        if not self.model or not self.scaler:
            raise PredictionException("Model not initialized")
        
        try:
            # Extract and prepare features
            features = self._extract_features(student_data)
            feature_vector = np.array([list(features.values())]).reshape(1, -1)
            
            # Scale features
            scaled_features = self.scaler.transform(feature_vector)
            
            # Make prediction
            prediction = self.model.predict(scaled_features)[0]
            prediction = float(np.clip(prediction, 0, 100))
            
            result = {
                "predicted_performance": prediction,
                "features_used": features,
                "prediction_timestamp": datetime.now()
            }
            
            if include_confidence:
                confidence_info = self._calculate_confidence(scaled_features, prediction)
                result.update(confidence_info)
            
            # Store prediction for drift detection
            self.prediction_history.append({
                "timestamp": datetime.now(),
                "features": features,
                "prediction": prediction
            })
            
            # Keep only recent predictions (last 1000)
            if len(self.prediction_history) > 1000:
                self.prediction_history = self.prediction_history[-1000:]
            
            return result
            
        except Exception as e:
            logger.error(f"Performance prediction failed: {str(e)}")
            raise PredictionException(f"Prediction failed: {str(e)}")
    
    def _extract_features(self, student_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract and normalize features from student data"""
        
        features = {}
        
        # Submission frequency (submissions per week)
        submissions_per_week = student_data.get("submissions_per_week", 3)
        features["submission_frequency"] = min(1.0, submissions_per_week / 10.0)
        
        # Code quality average
        avg_quality = student_data.get("average_code_quality", 75)
        features["code_quality_avg"] = avg_quality / 100.0
        
        # Test coverage average
        test_coverage = student_data.get("average_test_coverage", 60)
        features["test_coverage_avg"] = test_coverage / 100.0
        
        # Feedback implementation rate
        feedback_rate = student_data.get("feedback_implementation_rate", 70)
        features["feedback_implementation_rate"] = feedback_rate / 100.0
        
        # Engagement score
        login_frequency = student_data.get("login_frequency", 5)
        session_time = student_data.get("average_session_time", 30)
        engagement = (login_frequency / 10.0 + session_time / 60.0) / 2.0
        features["engagement_score"] = min(1.0, engagement)
        
        # Time since last submission (days)
        last_submission = student_data.get("last_submission_date")
        if last_submission:
            if isinstance(last_submission, str):
                last_submission = datetime.fromisoformat(last_submission)
            days_since = (datetime.now() - last_submission).days
            features["time_since_last_submission"] = min(1.0, days_since / 14.0)  # Normalize to 2 weeks
        else:
            features["time_since_last_submission"] = 0.5
        
        # Difficulty progression
        difficulty_scores = student_data.get("difficulty_progression", [])
        if difficulty_scores:
            # Calculate trend in handling increasing difficulty
            if len(difficulty_scores) > 1:
                trend = np.polyfit(range(len(difficulty_scores)), difficulty_scores, 1)[0]
                features["difficulty_progression"] = max(0, min(1, (trend + 10) / 20))  # Normalize
            else:
                features["difficulty_progression"] = difficulty_scores[0] / 100.0
        else:
            features["difficulty_progression"] = 0.5
        
        # Peer comparison score
        class_average = student_data.get("class_average_performance", 75)
        student_average = student_data.get("student_average_performance", 75)
        if class_average > 0:
            peer_score = student_average / class_average
            features["peer_comparison_score"] = min(1.0, peer_score)
        else:
            features["peer_comparison_score"] = 0.5
        
        return features
    
    def _calculate_confidence(self, scaled_features: np.ndarray, prediction: float) -> Dict[str, Any]:
        """Calculate prediction confidence and intervals"""
        
        # Use ensemble predictions for confidence estimation
        tree_predictions = [tree.predict(scaled_features)[0] for tree in self.model.estimators_]
        
        prediction_std = np.std(tree_predictions)
        prediction_mean = np.mean(tree_predictions)
        
        # Calculate confidence based on prediction variance
        confidence = max(0.5, min(0.95, 1.0 - (prediction_std / 50.0)))  # Normalize std to confidence
        
        # Calculate prediction intervals (approximate)
        margin = 1.96 * prediction_std  # 95% confidence interval
        lower_bound = max(0, prediction_mean - margin)
        upper_bound = min(100, prediction_mean + margin)
        
        return {
            "confidence": float(confidence),
            "prediction_interval": {
                "lower": float(lower_bound),
                "upper": float(upper_bound)
            },
            "prediction_variance": float(prediction_std ** 2)
        }
    
    async def detect_model_drift(self) -> Dict[str, Any]:
        """Detect if model performance is drifting"""
        
        if len(self.prediction_history) < 100:
            return {"drift_detected": False, "reason": "Insufficient data"}
        
        # Analyze recent predictions vs historical
        recent_predictions = self.prediction_history[-50:]
        historical_predictions = self.prediction_history[-200:-50] if len(self.prediction_history) >= 200 else []
        
        if not historical_predictions:
            return {"drift_detected": False, "reason": "Insufficient historical data"}
        
        # Compare feature distributions
        recent_features = [p["features"] for p in recent_predictions]
        historical_features = [p["features"] for p in historical_predictions]
        
        drift_score = self._calculate_drift_score(recent_features, historical_features)
        
        drift_detected = drift_score > 0.3  # Threshold for drift detection
        
        return {
            "drift_detected": drift_detected,
            "drift_score": drift_score,
            "recommendation": "Retrain model" if drift_detected else "Model stable",
            "last_check": datetime.now()
        }
    
    def _calculate_drift_score(self, recent_features: List[Dict], historical_features: List[Dict]) -> float:
        """Calculate drift score between feature distributions"""
        
        if not recent_features or not historical_features:
            return 0.0
        
        # Convert to arrays for comparison
        recent_array = np.array([[f[key] for key in self.feature_names] for f in recent_features])
        historical_array = np.array([[f[key] for key in self.feature_names] for f in historical_features])
        
        # Calculate mean differences for each feature
        recent_means = np.mean(recent_array, axis=0)
        historical_means = np.mean(historical_array, axis=0)
        
        # Calculate normalized differences
        mean_diffs = np.abs(recent_means - historical_means)
        drift_score = np.mean(mean_diffs)
        
        return float(drift_score)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from the trained model"""
        
        if not self.model:
            return {}
        
        importance_scores = self.model.feature_importances_
        
        return {
            feature: float(score) 
            for feature, score in zip(self.feature_names, importance_scores)
        }
    
    def _save_model(self):
        """Save model and scaler to disk"""
        try:
            os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
            
            model_path = os.path.join(settings.MODEL_CACHE_DIR, "performance_predictor.pkl")
            scaler_path = os.path.join(settings.MODEL_CACHE_DIR, "performance_scaler.pkl")
            
            joblib.dump(self.model, model_path)
            joblib.dump(self.scaler, scaler_path)
            
            logger.info("Performance prediction model saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save model: {str(e)}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and statistics"""
        
        return {
            "model_type": "RandomForestRegressor",
            "feature_count": len(self.feature_names),
            "features": self.feature_names,
            "accuracy": self.model_accuracy,
            "last_training_date": self.last_training_date,
            "prediction_count": len(self.prediction_history),
            "model_loaded": self.model is not None
        }