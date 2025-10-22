"""
Tests for code analyzer functionality
"""

import pytest
import asyncio
from app.services.code_analyzer import CodeAnalyzer
from app.models.schemas import FeedbackType, SeverityLevel


class TestCodeAnalyzer:
    """Test cases for CodeAnalyzer"""
    
    @pytest.fixture
    def analyzer(self):
        """Create CodeAnalyzer instance"""
        return CodeAnalyzer()
    
    @pytest.mark.asyncio
    async def test_python_code_analysis(self, analyzer):
        """Test Python code analysis"""
        
        python_code = '''
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# TODO: optimize this function
result = fibonacci(10)
print(result)
'''
        
        metrics, feedback_items = await analyzer.analyze_code(
            python_code, "python", "fibonacci.py"
        )
        
        # Check metrics
        assert metrics.lines_of_code > 0
        assert metrics.complexity_score > 0
        assert metrics.maintainability_index > 0
        assert 0 <= metrics.security_score <= 100
        assert 0 <= metrics.style_score <= 100
        
        # Check feedback items
        assert len(feedback_items) > 0
        
        # Should detect TODO comment
        todo_feedback = [f for f in feedback_items if "TODO" in f.message]
        assert len(todo_feedback) > 0
    
    @pytest.mark.asyncio
    async def test_security_analysis(self, analyzer):
        """Test security vulnerability detection"""
        
        insecure_code = '''
import os
user_input = input("Enter command: ")
eval(user_input)
os.system(user_input)
'''
        
        metrics, feedback_items = await analyzer.analyze_code(
            insecure_code, "python", "insecure.py"
        )
        
        # Should detect security issues
        security_feedback = [f for f in feedback_items if f.type == FeedbackType.SECURITY]
        assert len(security_feedback) > 0
        
        # Should have lower security score
        assert metrics.security_score < 80
        
        # Check for eval detection
        eval_feedback = [f for f in security_feedback if "eval" in f.message.lower()]
        assert len(eval_feedback) > 0
        assert eval_feedback[0].severity == SeverityLevel.CRITICAL
    
    @pytest.mark.asyncio
    async def test_javascript_analysis(self, analyzer):
        """Test JavaScript code analysis"""
        
        js_code = '''
var name = "test";
if (value == null) {
    console.log("null value");
}

function longFunction() {
    // This function is intentionally long
    var a = 1;
    var b = 2;
    // ... many more lines would be here
}
'''
        
        metrics, feedback_items = await analyzer.analyze_code(
            js_code, "javascript", "test.js"
        )
        
        # Check basic metrics
        assert metrics.lines_of_code > 0
        assert metrics.complexity_score > 0
        
        # Should detect var usage
        var_feedback = [f for f in feedback_items if "var" in f.message.lower()]
        assert len(var_feedback) > 0
        
        # Should detect == usage
        equality_feedback = [f for f in feedback_items if "===" in f.message]
        assert len(equality_feedback) > 0
    
    @pytest.mark.asyncio
    async def test_unsupported_language(self, analyzer):
        """Test handling of unsupported language"""
        
        with pytest.raises(Exception) as exc_info:
            await analyzer.analyze_code("code", "unsupported", "test.file")
        
        assert "Unsupported language" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_empty_code(self, analyzer):
        """Test handling of empty code"""
        
        with pytest.raises(Exception):
            await analyzer.analyze_code("", "python", "empty.py")
    
    @pytest.mark.asyncio
    async def test_syntax_error_handling(self, analyzer):
        """Test handling of code with syntax errors"""
        
        invalid_python = '''
def broken_function(
    # Missing closing parenthesis and colon
    print("This won't work")
'''
        
        # Should not crash, but return basic metrics
        metrics, feedback_items = await analyzer.analyze_code(
            invalid_python, "python", "broken.py"
        )
        
        assert metrics is not None
        assert metrics.lines_of_code > 0
    
    @pytest.mark.asyncio
    async def test_complexity_calculation(self, analyzer):
        """Test cyclomatic complexity calculation"""
        
        complex_code = '''
def complex_function(x, y, z):
    if x > 0:
        if y > 0:
            if z > 0:
                return x + y + z
            else:
                return x + y
        else:
            return x
    else:
        return 0
    
    for i in range(10):
        if i % 2 == 0:
            continue
        else:
            break
    
    try:
        result = x / y
    except ZeroDivisionError:
        result = 0
    except ValueError:
        result = -1
    
    return result
'''
        
        metrics, _ = await analyzer.analyze_code(
            complex_code, "python", "complex.py"
        )
        
        # Should detect high complexity
        assert metrics.complexity_score > 5
    
    @pytest.mark.asyncio
    async def test_style_analysis(self, analyzer):
        """Test code style analysis"""
        
        poor_style_code = '''
def function_with_very_long_line_that_exceeds_the_recommended_length_and_should_be_flagged_by_style_checker():
    pass

def another_function():
    pass
'''
        
        metrics, feedback_items = await analyzer.analyze_code(
            poor_style_code, "python", "style_test.py"
        )
        
        # Should detect style issues
        style_feedback = [f for f in feedback_items if f.type == FeedbackType.STYLE]
        assert len(style_feedback) > 0
        
        # Should detect long line
        long_line_feedback = [f for f in style_feedback if "120 characters" in f.message]
        assert len(long_line_feedback) > 0
    
    @pytest.mark.asyncio
    async def test_feedback_confidence_scores(self, analyzer):
        """Test that feedback items have appropriate confidence scores"""
        
        test_code = '''
eval("print('hello')")  # High confidence security issue
# TODO: implement this    # Medium confidence code quality issue
'''
        
        _, feedback_items = await analyzer.analyze_code(
            test_code, "python", "confidence_test.py"
        )
        
        # All feedback items should have confidence scores
        for item in feedback_items:
            assert 0.0 <= item.confidence_score <= 1.0
        
        # Security issues should have high confidence
        security_items = [f for f in feedback_items if f.type == FeedbackType.SECURITY]
        if security_items:
            assert security_items[0].confidence_score > 0.8
    
    @pytest.mark.asyncio
    async def test_resource_links(self, analyzer):
        """Test that feedback items include helpful resource links"""
        
        test_code = '''
eval("dangerous code")
'''
        
        _, feedback_items = await analyzer.analyze_code(
            test_code, "python", "resources_test.py"
        )
        
        # Security feedback should include resource links
        security_items = [f for f in feedback_items if f.type == FeedbackType.SECURITY]
        if security_items:
            assert len(security_items[0].resource_links) > 0
            assert all(link.startswith("http") for link in security_items[0].resource_links)


if __name__ == "__main__":
    pytest.main([__file__])