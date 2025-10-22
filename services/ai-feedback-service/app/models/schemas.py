"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
from enum import Enum


class SubmissionType(str, Enum):
    """Submission type enumeration"""
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    CHALLENGE = "challenge"


class FeedbackType(str, Enum):
    """Feedback type enumeration"""
    CODE_QUALITY = "code_quality"
    SECURITY = "security"
    PERFORMANCE = "performance"
    BEST_PRACTICES = "best_practices"
    STYLE = "style"


class SeverityLevel(str, Enum):
    """Severity level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Request Models
class CodeSubmissionRequest(BaseModel):
    """Request model for code submission analysis"""
    submission_id: str = Field(..., description="Unique submission identifier")
    user_id: str = Field(..., description="User identifier")
    code_content: str = Field(..., max_length=50000, description="Code content to analyze")
    file_path: str = Field(..., description="File path or name")
    language: str = Field(..., description="Programming language")
    submission_type: SubmissionType = Field(..., description="Type of submission")
    
    @validator('code_content')
    def validate_code_content(cls, v):
        if not v.strip():
            raise ValueError('Code content cannot be empty')
        return v


class FeedbackRatingRequest(BaseModel):
    """Request model for rating feedback quality"""
    feedback_id: str = Field(..., description="Feedback identifier")
    user_id: str = Field(..., description="User identifier")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5")
    comment: Optional[str] = Field(None, max_length=500, description="Optional comment")


class PerformancePredictionRequest(BaseModel):
    """Request model for performance prediction"""
    user_id: str = Field(..., description="User identifier")
    historical_data: Dict[str, Any] = Field(..., description="Historical performance data")


# Response Models
class FeedbackItem(BaseModel):
    """Individual feedback item"""
    id: str = Field(..., description="Feedback item identifier")
    type: FeedbackType = Field(..., description="Type of feedback")
    severity: SeverityLevel = Field(..., description="Severity level")
    message: str = Field(..., description="Feedback message")
    line_number: Optional[int] = Field(None, description="Line number if applicable")
    column_number: Optional[int] = Field(None, description="Column number if applicable")
    suggestion: Optional[str] = Field(None, description="Improvement suggestion")
    resource_links: List[str] = Field(default_factory=list, description="Learning resource links")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score")


class CodeMetrics(BaseModel):
    """Code quality metrics"""
    lines_of_code: int = Field(..., description="Total lines of code")
    complexity_score: float = Field(..., description="Cyclomatic complexity")
    maintainability_index: float = Field(..., description="Maintainability index")
    test_coverage: Optional[float] = Field(None, description="Test coverage percentage")
    security_score: float = Field(..., description="Security score")
    performance_score: float = Field(..., description="Performance score")
    style_score: float = Field(..., description="Code style score")


class FeedbackResponse(BaseModel):
    """Response model for feedback analysis"""
    submission_id: str = Field(..., description="Submission identifier")
    analysis_id: str = Field(..., description="Analysis identifier")
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Overall code quality score")
    metrics: CodeMetrics = Field(..., description="Code metrics")
    feedback_items: List[FeedbackItem] = Field(..., description="List of feedback items")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    timestamp: datetime = Field(..., description="Analysis timestamp")


class PerformancePrediction(BaseModel):
    """Performance prediction response"""
    user_id: str = Field(..., description="User identifier")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score")
    predicted_performance: float = Field(..., ge=0.0, le=100.0, description="Predicted performance")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Prediction confidence")
    factors: Dict[str, float] = Field(..., description="Contributing factors")
    recommendations: List[str] = Field(..., description="Improvement recommendations")
    timestamp: datetime = Field(..., description="Prediction timestamp")


class HealthResponse(BaseModel):
    """Health check response"""
    status: Literal["healthy", "unhealthy"] = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    version: str = Field(..., description="Service version")
    models_loaded: bool = Field(..., description="Whether ML models are loaded")
    dependencies: Dict[str, str] = Field(..., description="Dependency status")


class ModelInfo(BaseModel):
    """ML model information"""
    name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    loaded: bool = Field(..., description="Whether model is loaded")
    last_updated: datetime = Field(..., description="Last update timestamp")
    accuracy: Optional[float] = Field(None, description="Model accuracy")


class ServiceMetrics(BaseModel):
    """Service performance metrics"""
    total_analyses: int = Field(..., description="Total analyses performed")
    average_processing_time: float = Field(..., description="Average processing time")
    success_rate: float = Field(..., description="Success rate percentage")
    active_models: List[ModelInfo] = Field(..., description="Active ML models")
    uptime_seconds: int = Field(..., description="Service uptime in seconds")


# Error Models
class ErrorDetail(BaseModel):
    """Error detail model"""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Any] = Field(None, description="Additional error details")
    timestamp: str = Field(..., description="Error timestamp")
    trace_id: str = Field(..., description="Trace identifier")


class ValidationError(BaseModel):
    """Validation error model"""
    field: str = Field(..., description="Field name")
    message: str = Field(..., description="Validation error message")
    value: Any = Field(..., description="Invalid value")