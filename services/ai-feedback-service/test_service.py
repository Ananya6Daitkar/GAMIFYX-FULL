#!/usr/bin/env python3
"""
Simple test script for AI Feedback Service
"""

import asyncio
import httpx
import json

async def test_ai_feedback_service():
    """Test the AI feedback service endpoints"""
    
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Test health endpoint
        print("Testing health endpoint...")
        try:
            response = await client.get(f"{base_url}/health/")
            print(f"Health check: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Health check failed: {e}")
        
        # Test code analysis
        print("\nTesting code analysis...")
        test_code = '''
def calculate_fibonacci(n):
    if n <= 1:
        return n
    else:
        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# This is a TODO: optimize this function
result = calculate_fibonacci(10)
print(result)
'''
        
        analysis_request = {
            "submission_id": "test-123",
            "user_id": "user-456",
            "code_content": test_code,
            "file_path": "fibonacci.py",
            "language": "python",
            "submission_type": "assignment"
        }
        
        try:
            response = await client.post(
                f"{base_url}/feedback/analyze",
                json=analysis_request
            )
            print(f"Analysis: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Overall score: {result['overall_score']}")
                print(f"Feedback items: {len(result['feedback_items'])}")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Analysis failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_feedback_service())