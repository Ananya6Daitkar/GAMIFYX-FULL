"""
Data models for AI Feedback Service
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum

class FeedbackType(str, Enum):
    CODE_QUALITY = "code_quality"
    SECURITY = "security"
    PERFORMANCE = "performance"
    BEST_PRACTICES = "best_practices"
    TESTING = "testing"
    DOCUMENTATION = "documentation"
    ARCHITECTURE = "architecture"
    MAINTAINABILITY = "maintainability"

class FeedbackSeverity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InsightType(str, Enum):
    ANOMALY = "anomaly"
    PREDICTION = "prediction"
    OPTIMIZATION = "optimization"
    RECOMMENDATION = "recommendation"
    PATTERN = "pattern"

class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class CodeAnalysisRequest(BaseModel):
    submission_id: str = Field(..., description="Unique submission identifier")
    user_id: str = Field(..., description="User identifier")
    code_content: str = Field(..., description="Source code content to analyze")
    language: str = Field(..., description="Programming language")
    file_path: Optional[str] = Field(None, description="File path within repository")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    analysis_options: Optional[Dict[str, bool]] = Field(
        default_factory=lambda: {
            "include_security": True,
            "include_performance": True,
            "include_testing": True,
            "include_documentation": True,
            "generate_suggestions": True,
            "assess_skills": True
        }
    )

class FeedbackItem(BaseModel):
    id: str = Field(..., description="Unique feedback item identifier")
    type: FeedbackType = Field(..., description="Type of feedback")
    severity: FeedbackSeverity = Field(..., description="Severity level")
    title: str = Field(..., description="Feedback title")
    message: str = Field(..., description="Detailed feedback message")
    suggestion: Optional[str] = Field(None, description="Improvement suggestion")
    file_path: Optional[str] = Field(None, description="File path where issue was found")
    line_number: Optional[int] = Field(None, description="Line number of the issue")
    column_number: Optional[int] = Field(None, description="Column number of the issue")
    code_snippet: Optional[str] = Field(None, description="Relevant code snippet")
    fix_suggestion: Optional[str] = Field(None, description="Specific fix suggestion")
    learning_resources: List[str] = Field(default_factory=list, description="Related learning resources")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level of the feedback")
    ai_generated: bool = Field(True, description="Whether feedback was AI-generated")
    tags: List[str] = Field(default_factory=list, description="Categorization tags")

class AIInsight(BaseModel):
    id: str = Field(..., description="Unique insight identifier")
    type: InsightType = Field(..., description="Type of insight")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed insight description")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level")
    impact: str = Field(..., description="Expected impact of the insight")
    action_items: List[str] = Field(default_factory=list, description="Recommended actions")
    evidence: List[str] = Field(default_factory=list, description="Supporting evidence")
    related_patterns: List[str] = Field(default_factory=list, description="Related code patterns")
    priority: int = Field(..., ge=1, le=10, description="Priority level (1-10)")

class SkillAssessment(BaseModel):
    user_id: str = Field(..., description="User identifier")
    overall_level: SkillLevel = Field(..., description="Overall skill level")
    skill_scores: Dict[str, float] = Field(..., description="Scores for different skills")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Areas for improvement")
    learning_recommendations: List[str] = Field(default_factory=list, description="Learning recommendations")
    skill_progression: Dict[str, Dict[str, Union[float, str]]] = Field(
        default_factory=dict, 
        description="Skill progression tracking"
    )
    confidence_level: float = Field(..., ge=0.0, le=1.0, description="Assessment confidence")

class PerformancePrediction(BaseModel):
    user_id: str = Field(..., description="User identifier")
    predicted_score: float = Field(..., ge=0.0, le=100.0, description="Predicted performance score")
    performance_score: float = Field(..., ge=0.0, le=100.0, description="Current performance score")
    confidence_level: float = Field(..., ge=0.0, le=1.0, description="Prediction confidence")
    risk_factors: List[str] = Field(default_factory=list, description="Identified risk factors")
    improvement_areas: List[str] = Field(default_factory=list, description="Areas for improvement")
    expected_timeline: Optional[str] = Field(None, description="Expected improvement timeline")
    success_probability: float = Field(..., ge=0.0, le=1.0, description="Probability of success")

class CodeQualityMetrics(BaseModel):
    complexity_score: float = Field(..., ge=0.0, le=100.0)
    maintainability_score: float = Field(..., ge=0.0, le=100.0)
    readability_score: float = Field(..., ge=0.0, le=100.0)
    documentation_score: float = Field(..., ge=0.0, le=100.0)
    test_coverage: float = Field(..., ge=0.0, le=100.0)
    security_score: float = Field(..., ge=0.0, le=100.0)
    performance_score: float = Field(..., ge=0.0, le=100.0)
    best_practices_score: float = Field(..., ge=0.0, le=100.0)

class SecurityAnalysis(BaseModel):
    vulnerability_count: int = Field(..., ge=0)
    security_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str = Field(..., description="Overall risk level")
    vulnerabilities: List[Dict[str, Any]] = Field(default_factory=list)
    compliance_checks: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class PerformanceAnalysis(BaseModel):
    performance_score: float = Field(..., ge=0.0, le=100.0)
    bottlenecks: List[Dict[str, Any]] = Field(default_factory=list)
    optimization_opportunities: List[Dict[str, Any]] = Field(default_factory=list)
    resource_usage: Dict[str, float] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)

class TestingAnalysis(BaseModel):
    test_coverage: float = Field(..., ge=0.0, le=100.0)
    test_quality_score: float = Field(..., ge=0.0, le=100.0)
    test_count: int = Field(..., ge=0)
    missing_tests: List[str] = Field(default_factory=list)
    test_recommendations: List[str] = Field(default_factory=list)

class CodeAnalysisResponse(BaseModel):
    analysis_id: str = Field(..., description="Unique analysis identifier")
    submission_id: str = Field(..., description="Submission identifier")
    user_id: str = Field(..., description="User identifier")
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Overall code quality score")
    confidence_level: float = Field(..., ge=0.0, le=1.0, description="Analysis confidence level")
    
    # Analysis results
    feedback_items: List[FeedbackItem] = Field(default_factory=list)
    ai_insights: List[AIInsight] = Field(default_factory=list)
    skill_assessment: SkillAssessment
    performance_prediction: PerformancePrediction
    
    # Detailed metrics
    quality_metrics: Optional[CodeQualityMetrics] = None
    security_analysis: Optional[SecurityAnalysis] = None
    performance_analysis: Optional[PerformanceAnalysis] = None
    testing_analysis: Optional[TestingAnalysis] = None
    
    # Metadata
    processing_time: float = Field(..., description="Analysis processing time in seconds")
    analysis_version: str = Field(..., description="Analysis engine version")
    created_at: datetime = Field(..., description="Analysis creation timestamp")
    
    # Gamification data
    gamification_impact: Optional[Dict[str, Any]] = Field(
        None, 
        description="Impact on gamification metrics"
    )

class LearningResource(BaseModel):
    title: str = Field(..., description="Resource title")
    type: str = Field(..., description="Resource type (article, video, tutorial, etc.)")
    url: str = Field(..., description="Resource URL")
    description: str = Field(..., description="Resource description")
    difficulty: SkillLevel = Field(..., description="Difficulty level")
    estimated_time: int = Field(..., description="Estimated time in minutes")
    tags: List[str] = Field(default_factory=list, description="Resource tags")

class FeedbackContext(BaseModel):
    user_history: Optional[Dict[str, Any]] = None
    submission_context: Optional[Dict[str, Any]] = None
    learning_objectives: Optional[List[str]] = None
    difficulty_level: Optional[SkillLevel] = None
    focus_areas: Optional[List[str]] = None

class ModelPerformanceMetrics(BaseModel):
    model_name: str = Field(..., description="Name of the ML model")
    version: str = Field(..., description="Model version")
    accuracy: float = Field(..., ge=0.0, le=1.0, description="Model accuracy")
    precision: float = Field(..., ge=0.0, le=1.0, description="Model precision")
    recall: float = Field(..., ge=0.0, le=1.0, description="Model recall")
    f1_score: float = Field(..., ge=0.0, le=1.0, description="F1 score")
    last_updated: datetime = Field(..., description="Last model update timestamp")
    training_data_size: int = Field(..., description="Size of training dataset")
    inference_time: float = Field(..., description="Average inference time in seconds")

class BatchAnalysisRequest(BaseModel):
    requests: List[CodeAnalysisRequest] = Field(..., description="List of analysis requests")
    priority: int = Field(default=5, ge=1, le=10, description="Batch priority level")
    callback_url: Optional[str] = Field(None, description="Callback URL for results")

class BatchAnalysisResponse(BaseModel):
    batch_id: str = Field(..., description="Unique batch identifier")
    total_requests: int = Field(..., description="Total number of requests in batch")
    completed_requests: int = Field(..., description="Number of completed requests")
    failed_requests: int = Field(..., description="Number of failed requests")
    results: List[CodeAnalysisResponse] = Field(default_factory=list)
    processing_time: float = Field(..., description="Total batch processing time")
    created_at: datetime = Field(..., description="Batch creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Batch completion timestamp")

# Error models
class AnalysisError(BaseModel):
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Error message")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ValidationError(BaseModel):
    field: str = Field(..., description="Field that failed validation")
    message: str = Field(..., description="Validation error message")
    value: Any = Field(..., description="Invalid value")

# Response wrappers
class APIResponse(BaseModel):
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[Any] = Field(None, description="Response data")
    error: Optional[AnalysisError] = Field(None, description="Error information if failed")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class PaginatedResponse(BaseModel):
    items: List[Any] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    has_more: bool = Field(..., description="Whether there are more items")

# Configuration models
class AnalysisConfig(BaseModel):
    enable_security_scan: bool = True
    enable_performance_analysis: bool = True
    enable_testing_analysis: bool = True
    enable_documentation_check: bool = True
    max_processing_time: int = 300  # seconds
    confidence_threshold: float = 0.7
    feedback_detail_level: str = "detailed"  # basic, detailed, comprehensive
    include_learning_resources: bool = True
    generate_improvement_plan: bool = True