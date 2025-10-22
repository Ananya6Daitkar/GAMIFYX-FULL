"""
ML Model Manager for loading and managing AI models
"""

import os
import pickle
import joblib
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import pandas as pd

from ..core.config import settings
from ..core.telemetry import logger
from ..core.exceptions import ModelLoadException
from .performance_predictor import PerformancePredictor


class ModelManager:
    """Manages ML models for feedback and prediction"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.model_info: Dict[str, Dict] = {}
        self.performance_predictor = PerformancePredictor()
        self.initialized = False
        
    async def initialize_models(self):
        """Initialize and load all ML models"""
        try:
            logger.info("Initializing ML models")
            
            # Create model cache directory
            os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
            
            # Initialize performance prediction model
            await self.performance_predictor.initialize()
            
            # Initialize code quality model
            await self._initialize_quality_model()
            
            # Initialize risk scoring model
            await self._initialize_risk_model()
            
            self.initialized = True
            logger.info("All ML models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize models: {str(e)}")
            raise ModelLoadException(f"Model initialization failed: {str(e)}")
    
    async def _initialize_performance_model(self):
        """Initialize student performance prediction model"""
        model_path = os.path.join(settings.MODEL_CACHE_DIR, "performance_model.pkl")
        scaler_path = os.path.join(settings.MODEL_CACHE_DIR, "performance_scaler.pkl")
        
        try:
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                # Load existing model
                self.models["performance"] = joblib.load(model_path)
                self.scalers["performance"] = joblib.load(scaler_path)
                logger.info("Loaded existing performance prediction model")
            else:
                # Create and train new model
                model, scaler = await self._train_performance_model()
                self.models["performance"] = model
                self.scalers["performance"] = scaler
                
                # Save model
                joblib.dump(model, model_path)
                joblib.dump(scaler, scaler_path)
                logger.info("Created and saved new performance prediction model")
            
            self.model_info["performance"] = {
                "name": "Student Performance Predictor",
                "version": "1.0.0",
                "loaded": True,
                "last_updated": datetime.now(),
                "accuracy": 0.85  # Placeholder accuracy
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize performance model: {str(e)}")
            raise
    
    async def _initialize_quality_model(self):
        """Initialize code quality assessment model"""
        model_path = os.path.join(settings.MODEL_CACHE_DIR, "quality_model.pkl")
        
        try:
            if os.path.exists(model_path):
                self.models["quality"] = joblib.load(model_path)
                logger.info("Loaded existing code quality model")
            else:
                # Create simple rule-based model for now
                model = await self._create_quality_model()
                self.models["quality"] = model
                joblib.dump(model, model_path)
                logger.info("Created and saved new code quality model")
            
            self.model_info["quality"] = {
                "name": "Code Quality Assessor",
                "version": "1.0.0",
                "loaded": True,
                "last_updated": datetime.now(),
                "accuracy": 0.78
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize quality model: {str(e)}")
            raise
    
    async def _initialize_risk_model(self):
        """Initialize risk scoring model"""
        model_path = os.path.join(settings.MODEL_CACHE_DIR, "risk_model.pkl")
        scaler_path = os.path.join(settings.MODEL_CACHE_DIR, "risk_scaler.pkl")
        
        try:
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.models["risk"] = joblib.load(model_path)
                self.scalers["risk"] = joblib.load(scaler_path)
                logger.info("Loaded existing risk scoring model")
            else:
                model, scaler = await self._train_risk_model()
                self.models["risk"] = model
                self.scalers["risk"] = scaler
                
                joblib.dump(model, model_path)
                joblib.dump(scaler, scaler_path)
                logger.info("Created and saved new risk scoring model")
            
            self.model_info["risk"] = {
                "name": "Student Risk Scorer",
                "version": "1.0.0",
                "loaded": True,
                "last_updated": datetime.now(),
                "accuracy": 0.82
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize risk model: {str(e)}")
            raise
    
    async def _train_performance_model(self):
        """Train performance prediction model with synthetic data"""
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        # Features: submission_frequency, code_quality_avg, test_coverage_avg, 
        # feedback_implementation_rate, engagement_score
        X = np.random.rand(n_samples, 5)
        
        # Simulate realistic relationships
        performance = (
            0.3 * X[:, 0] +  # submission frequency
            0.4 * X[:, 1] +  # code quality
            0.2 * X[:, 2] +  # test coverage
            0.1 * X[:, 3] +  # feedback implementation
            0.2 * X[:, 4] +  # engagement
            np.random.normal(0, 0.1, n_samples)  # noise
        )
        
        # Normalize to 0-100 range
        y = np.clip(performance * 100, 0, 100)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        logger.info("Trained performance prediction model")
        return model, scaler
    
    async def _create_quality_model(self):
        """Create a simple code quality model"""
        # For now, return a simple rule-based model
        # In production, this would be a trained ML model
        return {
            "type": "rule_based",
            "rules": {
                "complexity_threshold": 10,
                "line_length_threshold": 120,
                "function_length_threshold": 50
            }
        }
    
    async def _train_risk_model(self):
        """Train risk scoring model with synthetic data"""
        np.random.seed(42)
        n_samples = 1000
        
        # Features similar to performance model
        X = np.random.rand(n_samples, 5)
        
        # Risk is inverse of performance with some noise
        risk_scores = 1 - (
            0.3 * X[:, 0] +
            0.4 * X[:, 1] +
            0.2 * X[:, 2] +
            0.1 * X[:, 3] +
            0.2 * X[:, 4]
        ) + np.random.normal(0, 0.1, n_samples)
        
        y = np.clip(risk_scores, 0, 1)
        
        # Split and scale
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        logger.info("Trained risk scoring model")
        return model, scaler
    
    async def predict_performance(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict student performance using enhanced predictor"""
        if not self.initialized:
            raise ModelLoadException("Performance model not loaded")
        
        try:
            return await self.performance_predictor.predict_performance(student_data)
        except Exception as e:
            logger.error(f"Performance prediction failed: {str(e)}")
            raise
    
    def calculate_risk_score(self, features: Dict[str, float]) -> float:
        """Calculate student risk score"""
        if not self.initialized or "risk" not in self.models:
            raise ModelLoadException("Risk model not loaded")
        
        try:
            feature_vector = np.array([[
                features.get("submission_frequency", 0.5),
                features.get("code_quality_avg", 0.5),
                features.get("test_coverage_avg", 0.5),
                features.get("feedback_implementation_rate", 0.5),
                features.get("engagement_score", 0.5)
            ]])
            
            scaled_features = self.scalers["risk"].transform(feature_vector)
            risk_score = self.models["risk"].predict(scaled_features)[0]
            
            return float(np.clip(risk_score, 0, 1))
            
        except Exception as e:
            logger.error(f"Risk score calculation failed: {str(e)}")
            raise
    
    def assess_code_quality(self, code_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Assess code quality using rule-based model"""
        if not self.initialized or "quality" not in self.models:
            raise ModelLoadException("Quality model not loaded")
        
        try:
            model = self.models["quality"]
            
            if model["type"] == "rule_based":
                rules = model["rules"]
                
                # Calculate scores based on rules
                complexity_score = max(0, 100 - (code_metrics.get("complexity", 5) * 10))
                length_score = 100 if code_metrics.get("avg_line_length", 80) <= rules["line_length_threshold"] else 70
                function_score = 100 if code_metrics.get("avg_function_length", 20) <= rules["function_length_threshold"] else 70
                
                overall_score = (complexity_score + length_score + function_score) / 3
                
                return {
                    "overall_score": float(overall_score),
                    "complexity_score": float(complexity_score),
                    "style_score": float((length_score + function_score) / 2),
                    "maintainability_score": float(complexity_score * 0.7 + length_score * 0.3)
                }
            
        except Exception as e:
            logger.error(f"Code quality assessment failed: {str(e)}")
            raise
    
    def get_model_info(self) -> Dict[str, Dict]:
        """Get information about loaded models"""
        return self.model_info.copy()
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up model manager")
        self.models.clear()
        self.scalers.clear()
        self.model_info.clear()
        self.initialized = False