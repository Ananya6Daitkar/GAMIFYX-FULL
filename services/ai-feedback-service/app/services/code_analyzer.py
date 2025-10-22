"""
Code analysis service for static analysis and feedback generation
"""

import ast
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import subprocess
import tempfile
import os
import json

from ..models.schemas import FeedbackItem, FeedbackType, SeverityLevel, CodeMetrics
from ..core.telemetry import logger
from ..core.exceptions import CodeAnalysisException


class CodeAnalyzer:
    """Analyzes code and generates feedback"""
    
    def __init__(self):
        self.supported_languages = ["python", "javascript", "typescript", "java", "go"]
        
    async def analyze_code(
        self, 
        code_content: str, 
        language: str, 
        file_path: str
    ) -> Tuple[CodeMetrics, List[FeedbackItem]]:
        """Analyze code and return metrics and feedback"""
        
        try:
            logger.info(f"Analyzing {language} code", file_path=file_path)
            
            # Validate language support
            if language.lower() not in self.supported_languages:
                raise CodeAnalysisException(f"Unsupported language: {language}")
            
            # Calculate basic metrics
            metrics = await self._calculate_metrics(code_content, language)
            
            # Generate feedback items
            feedback_items = await self._generate_feedback(code_content, language, file_path)
            
            logger.info(f"Code analysis completed", 
                       metrics_count=len(feedback_items),
                       overall_score=metrics.maintainability_index)
            
            return metrics, feedback_items
            
        except Exception as e:
            logger.error(f"Code analysis failed: {str(e)}")
            raise CodeAnalysisException(f"Analysis failed: {str(e)}")
    
    async def _calculate_metrics(self, code_content: str, language: str) -> CodeMetrics:
        """Calculate code quality metrics"""
        
        lines = code_content.split('\n')
        lines_of_code = len([line for line in lines if line.strip() and not line.strip().startswith('#')])
        
        if language.lower() == "python":
            return await self._calculate_python_metrics(code_content, lines_of_code)
        elif language.lower() in ["javascript", "typescript"]:
            return await self._calculate_js_metrics(code_content, lines_of_code)
        else:
            # Generic metrics for other languages
            return CodeMetrics(
                lines_of_code=lines_of_code,
                complexity_score=self._estimate_complexity(code_content),
                maintainability_index=75.0,  # Default
                security_score=80.0,
                performance_score=75.0,
                style_score=70.0
            )
    
    async def _calculate_python_metrics(self, code_content: str, loc: int) -> CodeMetrics:
        """Calculate Python-specific metrics"""
        
        try:
            # Parse AST for complexity analysis
            tree = ast.parse(code_content)
            complexity = self._calculate_cyclomatic_complexity(tree)
            
            # Calculate maintainability index (simplified)
            maintainability = max(0, 171 - 5.2 * complexity - 0.23 * loc)
            
            # Security analysis (basic)
            security_score = await self._analyze_python_security(code_content)
            
            # Style analysis
            style_score = await self._analyze_python_style(code_content)
            
            return CodeMetrics(
                lines_of_code=loc,
                complexity_score=float(complexity),
                maintainability_index=float(maintainability),
                security_score=security_score,
                performance_score=75.0,  # Placeholder
                style_score=style_score
            )
            
        except SyntaxError:
            # If code has syntax errors, return basic metrics
            return CodeMetrics(
                lines_of_code=loc,
                complexity_score=10.0,
                maintainability_index=50.0,
                security_score=60.0,
                performance_score=60.0,
                style_score=50.0
            )
    
    async def _calculate_js_metrics(self, code_content: str, loc: int) -> CodeMetrics:
        """Calculate JavaScript/TypeScript metrics"""
        
        # Simplified JS metrics
        complexity = self._estimate_complexity(code_content)
        maintainability = max(0, 171 - 5.2 * complexity - 0.23 * loc)
        
        return CodeMetrics(
            lines_of_code=loc,
            complexity_score=float(complexity),
            maintainability_index=float(maintainability),
            security_score=75.0,
            performance_score=75.0,
            style_score=70.0
        )
    
    def _calculate_cyclomatic_complexity(self, tree: ast.AST) -> int:
        """Calculate cyclomatic complexity for Python AST"""
        
        complexity = 1  # Base complexity
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(node, ast.ExceptHandler):
                complexity += 1
            elif isinstance(node, (ast.And, ast.Or)):
                complexity += 1
            elif isinstance(node, ast.comprehension):
                complexity += 1
        
        return complexity
    
    def _estimate_complexity(self, code_content: str) -> float:
        """Estimate complexity for non-Python languages"""
        
        # Count control flow statements
        control_patterns = [
            r'\bif\b', r'\belse\b', r'\bwhile\b', r'\bfor\b',
            r'\bswitch\b', r'\bcase\b', r'\btry\b', r'\bcatch\b'
        ]
        
        complexity = 1
        for pattern in control_patterns:
            complexity += len(re.findall(pattern, code_content, re.IGNORECASE))
        
        return float(complexity)
    
    async def _analyze_python_security(self, code_content: str) -> float:
        """Analyze Python code for security issues"""
        
        security_score = 100.0
        
        # Check for common security anti-patterns
        security_patterns = [
            (r'eval\s*\(', 20, "Use of eval() is dangerous"),
            (r'exec\s*\(', 20, "Use of exec() is dangerous"),
            (r'import\s+os.*system', 15, "Direct system calls can be risky"),
            (r'subprocess\.call.*shell=True', 15, "Shell=True in subprocess is risky"),
            (r'pickle\.loads?\(', 10, "Pickle can execute arbitrary code"),
            (r'input\s*\(', 5, "Consider using raw_input for Python 2"),
        ]
        
        for pattern, penalty, _ in security_patterns:
            if re.search(pattern, code_content, re.IGNORECASE):
                security_score -= penalty
        
        return max(0.0, security_score)
    
    async def _analyze_python_style(self, code_content: str) -> float:
        """Analyze Python code style"""
        
        style_score = 100.0
        lines = code_content.split('\n')
        
        # Check line length
        long_lines = [line for line in lines if len(line) > 120]
        style_score -= len(long_lines) * 2
        
        # Check for proper imports
        if not re.search(r'^import\s+\w+', code_content, re.MULTILINE):
            if 'def ' in code_content or 'class ' in code_content:
                style_score -= 5  # Missing imports in non-trivial code
        
        # Check for docstrings in functions
        function_count = len(re.findall(r'def\s+\w+', code_content))
        docstring_count = len(re.findall(r'""".*?"""', code_content, re.DOTALL))
        
        if function_count > 0 and docstring_count == 0:
            style_score -= 10
        
        return max(0.0, style_score)
    
    async def _generate_feedback(
        self, 
        code_content: str, 
        language: str, 
        file_path: str
    ) -> List[FeedbackItem]:
        """Generate feedback items for the code"""
        
        feedback_items = []
        
        # Language-specific feedback
        if language.lower() == "python":
            feedback_items.extend(await self._generate_python_feedback(code_content))
        elif language.lower() in ["javascript", "typescript"]:
            feedback_items.extend(await self._generate_js_feedback(code_content))
        
        # Generic feedback
        feedback_items.extend(await self._generate_generic_feedback(code_content))
        
        return feedback_items
    
    async def _generate_python_feedback(self, code_content: str) -> List[FeedbackItem]:
        """Generate Python-specific feedback"""
        
        feedback = []
        lines = code_content.split('\n')
        
        # Check for security issues
        for i, line in enumerate(lines, 1):
            if 'eval(' in line:
                feedback.append(FeedbackItem(
                    id=str(uuid.uuid4()),
                    type=FeedbackType.SECURITY,
                    severity=SeverityLevel.CRITICAL,
                    message="Avoid using eval() as it can execute arbitrary code",
                    line_number=i,
                    suggestion="Use ast.literal_eval() for safe evaluation or find alternative approaches",
                    resource_links=["https://docs.python.org/3/library/ast.html#ast.literal_eval"],
                    confidence_score=0.95
                ))
            
            if len(line) > 120:
                feedback.append(FeedbackItem(
                    id=str(uuid.uuid4()),
                    type=FeedbackType.STYLE,
                    severity=SeverityLevel.LOW,
                    message="Line exceeds recommended length of 120 characters",
                    line_number=i,
                    suggestion="Break long lines into multiple lines for better readability",
                    resource_links=["https://pep8.org/#maximum-line-length"],
                    confidence_score=0.9
                ))
        
        # Check for missing docstrings
        if 'def ' in code_content and '"""' not in code_content:
            feedback.append(FeedbackItem(
                id=str(uuid.uuid4()),
                type=FeedbackType.BEST_PRACTICES,
                severity=SeverityLevel.MEDIUM,
                message="Functions should have docstrings for better documentation",
                suggestion="Add docstrings to describe function purpose, parameters, and return values",
                resource_links=["https://pep257.readthedocs.io/"],
                confidence_score=0.8
            ))
        
        return feedback
    
    async def _generate_js_feedback(self, code_content: str) -> List[FeedbackItem]:
        """Generate JavaScript/TypeScript-specific feedback"""
        
        feedback = []
        lines = code_content.split('\n')
        
        # Check for var usage (prefer let/const)
        for i, line in enumerate(lines, 1):
            if re.search(r'\bvar\s+\w+', line):
                feedback.append(FeedbackItem(
                    id=str(uuid.uuid4()),
                    type=FeedbackType.BEST_PRACTICES,
                    severity=SeverityLevel.MEDIUM,
                    message="Prefer 'let' or 'const' over 'var' for better scoping",
                    line_number=i,
                    suggestion="Use 'const' for values that don't change, 'let' for variables",
                    resource_links=["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let"],
                    confidence_score=0.9
                ))
        
        # Check for == usage (prefer ===)
        for i, line in enumerate(lines, 1):
            if re.search(r'[^=!]==[^=]', line):
                feedback.append(FeedbackItem(
                    id=str(uuid.uuid4()),
                    type=FeedbackType.BEST_PRACTICES,
                    severity=SeverityLevel.MEDIUM,
                    message="Use strict equality (===) instead of loose equality (==)",
                    line_number=i,
                    suggestion="Replace == with === to avoid type coercion issues",
                    resource_links=["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness"],
                    confidence_score=0.85
                ))
        
        return feedback
    
    async def _generate_generic_feedback(self, code_content: str) -> List[FeedbackItem]:
        """Generate generic feedback applicable to all languages"""
        
        feedback = []
        lines = code_content.split('\n')
        
        # Check for TODO comments
        for i, line in enumerate(lines, 1):
            if re.search(r'(TODO|FIXME|HACK)', line, re.IGNORECASE):
                feedback.append(FeedbackItem(
                    id=str(uuid.uuid4()),
                    type=FeedbackType.CODE_QUALITY,
                    severity=SeverityLevel.LOW,
                    message="TODO/FIXME comment found - consider addressing before production",
                    line_number=i,
                    suggestion="Complete the TODO item or create a proper issue tracker entry",
                    confidence_score=0.7
                ))
        
        # Check for very long functions (basic heuristic)
        function_starts = []
        for i, line in enumerate(lines):
            if re.search(r'(def\s+\w+|function\s+\w+|\w+\s*\([^)]*\)\s*{)', line):
                function_starts.append(i)
        
        # Simple check for functions longer than 50 lines
        if len(function_starts) > 0:
            for start in function_starts:
                # Find next function or end of file
                end = len(lines)
                for next_start in function_starts:
                    if next_start > start:
                        end = next_start
                        break
                
                if end - start > 50:
                    feedback.append(FeedbackItem(
                        id=str(uuid.uuid4()),
                        type=FeedbackType.CODE_QUALITY,
                        severity=SeverityLevel.MEDIUM,
                        message="Function appears to be very long - consider breaking it down",
                        line_number=start + 1,
                        suggestion="Split large functions into smaller, more focused functions",
                        resource_links=["https://refactoring.guru/smells/long-method"],
                        confidence_score=0.75
                    ))
        
        return feedback