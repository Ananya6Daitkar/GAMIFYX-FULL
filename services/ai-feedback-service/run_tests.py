#!/usr/bin/env python3
"""
Test runner for AI Feedback Service
"""

import subprocess
import sys
import os


def run_tests():
    """Run all tests with coverage"""
    
    print("🧪 Running AI Feedback Service Tests")
    print("=" * 50)
    
    # Set environment variables for testing
    os.environ["ENVIRONMENT"] = "test"
    os.environ["MODEL_CACHE_DIR"] = "./test_models"
    
    try:
        # Run pytest with coverage
        result = subprocess.run([
            sys.executable, "-m", "pytest",
            "tests/",
            "-v",
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--tb=short"
        ], check=True)
        
        print("\n✅ All tests passed!")
        print("📊 Coverage report generated in htmlcov/")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Tests failed with exit code {e.returncode}")
        return False
    
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return False


def run_specific_test(test_file):
    """Run a specific test file"""
    
    print(f"🧪 Running {test_file}")
    print("=" * 50)
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest",
            f"tests/{test_file}",
            "-v",
            "--tb=short"
        ], check=True)
        
        print(f"\n✅ {test_file} passed!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {test_file} failed with exit code {e.returncode}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Run specific test file
        test_file = sys.argv[1]
        if not test_file.startswith("test_"):
            test_file = f"test_{test_file}"
        if not test_file.endswith(".py"):
            test_file = f"{test_file}.py"
        
        success = run_specific_test(test_file)
    else:
        # Run all tests
        success = run_tests()
    
    sys.exit(0 if success else 1)