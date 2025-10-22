"""
Code analysis endpoints for detailed metrics and insights
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
import uuid
from datetime import datetime

from ...models.schemas import CodeMetrics, FeedbackItem
from ...services.code_analyzer import CodeAnalyzer
from ...core.telemetry import logger

router = APIRouter()


def get_code_analyzer() -> CodeAnalyzer:
    """Dependency to get code analyzer"""
    return CodeAnalyzer()


@router.post("/metrics")
async def analyze_code_metrics(
    code_content: str,
    language: str,
    file_path: str = "unknown",
    code_analyzer: CodeAnalyzer = Depends(get_code_analyzer)
):
    """Analyze code and return detailed metrics only"""
    
    try:
        logger.info(f"Analyzing code metrics for {language}")
        
        metrics, _ = await code_analyzer.analyze_code(code_content, language, file_path)
        
        return {
            "metrics": metrics,
            "analysis_timestamp": datetime.now(),
            "language": language,
            "file_path": file_path
        }
        
    except Exception as e:
        logger.error(f"Metrics analysis failed: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Analysis failed: {str(e)}")


@router.post("/security")
async def analyze_security(
    code_content: str,
    language: str,
    code_analyzer: CodeAnalyzer = Depends(get_code_analyzer)
):
    """Analyze code for security vulnerabilities"""
    
    try:
        logger.info(f"Security analysis for {language} code")
        
        _, feedback_items = await code_analyzer.analyze_code(code_content, language, "security_check")
        
        # Filter for security-related feedback
        security_issues = [
            item for item in feedback_items 
            if item.type.value == "security"
        ]
        
        # Calculate security score
        if language.lower() == "python":
            security_score = await code_analyzer._analyze_python_security(code_content)
        else:
            security_score = 80.0  # Default for other languages
        
        return {
            "security_score": security_score,
            "vulnerabilities": security_issues,
            "total_issues": len(security_issues),
            "analysis_timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Security analysis failed: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Security analysis failed: {str(e)}")


@router.post("/complexity")
async def analyze_complexity(
    code_content: str,
    language: str,
    code_analyzer: CodeAnalyzer = Depends(get_code_analyzer)
):
    """Analyze code complexity"""
    
    try:
        logger.info(f"Complexity analysis for {language} code")
        
        if language.lower() == "python":
            import ast
            try:
                tree = ast.parse(code_content)
                complexity = code_analyzer._calculate_cyclomatic_complexity(tree)
            except SyntaxError:
                complexity = 0
        else:
            complexity = code_analyzer._estimate_complexity(code_content)
        
        # Complexity assessment
        if complexity <= 5:
            assessment = "Low - Easy to understand and maintain"
        elif complexity <= 10:
            assessment = "Moderate - Acceptable complexity"
        elif complexity <= 15:
            assessment = "High - Consider refactoring"
        else:
            assessment = "Very High - Refactoring recommended"
        
        return {
            "cyclomatic_complexity": complexity,
            "assessment": assessment,
            "recommendations": _get_complexity_recommendations(complexity),
            "analysis_timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Complexity analysis failed: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Complexity analysis failed: {str(e)}")


@router.post("/style")
async def analyze_style(
    code_content: str,
    language: str,
    code_analyzer: CodeAnalyzer = Depends(get_code_analyzer)
):
    """Analyze code style and formatting"""
    
    try:
        logger.info(f"Style analysis for {language} code")
        
        _, feedback_items = await code_analyzer.analyze_code(code_content, language, "style_check")
        
        # Filter for style-related feedback
        style_issues = [
            item for item in feedback_items 
            if item.type.value == "style"
        ]
        
        # Calculate style score
        if language.lower() == "python":
            style_score = await code_analyzer._analyze_python_style(code_content)
        else:
            style_score = 75.0  # Default for other languages
        
        return {
            "style_score": style_score,
            "style_issues": style_issues,
            "total_issues": len(style_issues),
            "recommendations": _get_style_recommendations(language),
            "analysis_timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Style analysis failed: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Style analysis failed: {str(e)}")


@router.get("/supported-languages")
async def get_supported_languages():
    """Get list of supported programming languages"""
    
    return {
        "supported_languages": [
            {
                "name": "Python",
                "code": "python",
                "features": ["complexity", "security", "style", "metrics"]
            },
            {
                "name": "JavaScript",
                "code": "javascript",
                "features": ["complexity", "style", "metrics"]
            },
            {
                "name": "TypeScript",
                "code": "typescript",
                "features": ["complexity", "style", "metrics"]
            },
            {
                "name": "Java",
                "code": "java",
                "features": ["complexity", "metrics"]
            },
            {
                "name": "Go",
                "code": "go",
                "features": ["complexity", "metrics"]
            }
        ]
    }


def _get_complexity_recommendations(complexity: float) -> List[str]:
    """Get recommendations based on complexity score"""
    
    recommendations = []
    
    if complexity > 15:
        recommendations.extend([
            "Break down large functions into smaller, focused functions",
            "Reduce nested control structures",
            "Consider using design patterns to simplify logic"
        ])
    elif complexity > 10:
        recommendations.extend([
            "Consider refactoring complex functions",
            "Add unit tests to ensure behavior is preserved during refactoring"
        ])
    elif complexity > 5:
        recommendations.append("Monitor complexity as code evolves")
    else:
        recommendations.append("Good complexity level - easy to maintain")
    
    return recommendations


def _get_style_recommendations(language: str) -> List[str]:
    """Get style recommendations based on language"""
    
    recommendations = {
        "python": [
            "Follow PEP 8 style guidelines",
            "Use meaningful variable and function names",
            "Add docstrings to functions and classes",
            "Keep line length under 120 characters"
        ],
        "javascript": [
            "Use consistent indentation (2 or 4 spaces)",
            "Prefer const/let over var",
            "Use meaningful variable names",
            "Add JSDoc comments for functions"
        ],
        "typescript": [
            "Use TypeScript type annotations",
            "Follow consistent naming conventions",
            "Use interfaces for object shapes",
            "Enable strict mode in tsconfig.json"
        ]
    }
    
    return recommendations.get(language.lower(), [
        "Follow language-specific style guidelines",
        "Use consistent formatting",
        "Add appropriate comments and documentation"
    ])