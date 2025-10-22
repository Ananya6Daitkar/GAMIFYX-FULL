"""
Exception handlers for the AI Feedback Service
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback
from typing import Union
import uuid

from .telemetry import logger


class FeedbackEngineException(Exception):
    """Base exception for feedback engine"""
    def __init__(self, message: str, error_code: str = "FEEDBACK_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ModelLoadException(FeedbackEngineException):
    """Exception raised when ML model fails to load"""
    def __init__(self, message: str = "Failed to load ML model"):
        super().__init__(message, "MODEL_LOAD_ERROR")


class CodeAnalysisException(FeedbackEngineException):
    """Exception raised during code analysis"""
    def __init__(self, message: str = "Code analysis failed"):
        super().__init__(message, "CODE_ANALYSIS_ERROR")


class PredictionException(FeedbackEngineException):
    """Exception raised during performance prediction"""
    def __init__(self, message: str = "Performance prediction failed"):
        super().__init__(message, "PREDICTION_ERROR")


def create_error_response(
    error_code: str,
    message: str,
    details: Union[dict, str, None] = None,
    status_code: int = 500
) -> JSONResponse:
    """Create standardized error response"""
    trace_id = str(uuid.uuid4())
    
    error_response = {
        "error": {
            "code": error_code,
            "message": message,
            "details": details,
            "timestamp": "",
            "traceId": trace_id
        }
    }
    
    logger.error(
        "API Error",
        error_code=error_code,
        message=message,
        details=details,
        trace_id=trace_id,
        status_code=status_code
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )


def setup_exception_handlers(app: FastAPI):
    """Setup global exception handlers"""
    
    @app.exception_handler(FeedbackEngineException)
    async def feedback_engine_exception_handler(request: Request, exc: FeedbackEngineException):
        return create_error_response(
            error_code=exc.error_code,
            message=exc.message,
            status_code=400
        )
    
    @app.exception_handler(ModelLoadException)
    async def model_load_exception_handler(request: Request, exc: ModelLoadException):
        return create_error_response(
            error_code=exc.error_code,
            message=exc.message,
            status_code=503
        )
    
    @app.exception_handler(CodeAnalysisException)
    async def code_analysis_exception_handler(request: Request, exc: CodeAnalysisException):
        return create_error_response(
            error_code=exc.error_code,
            message=exc.message,
            status_code=422
        )
    
    @app.exception_handler(PredictionException)
    async def prediction_exception_handler(request: Request, exc: PredictionException):
        return create_error_response(
            error_code=exc.error_code,
            message=exc.message,
            status_code=422
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return create_error_response(
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            details=exc.errors(),
            status_code=422
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return create_error_response(
            error_code="HTTP_ERROR",
            message=exc.detail,
            status_code=exc.status_code
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception",
            exception=str(exc),
            traceback=traceback.format_exc()
        )
        return create_error_response(
            error_code="INTERNAL_ERROR",
            message="An internal error occurred",
            status_code=500
        )