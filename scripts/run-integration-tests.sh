#!/bin/bash

# Run integration tests for the AIOps Learning Platform
set -e

echo "🚀 Starting AIOps Learning Platform Integration Tests"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed"
    exit 1
fi

# Start services
echo "📦 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Function to check service health
check_service_health() {
    local service_url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$service_url/health" > /dev/null; then
            echo "✅ $service_name is healthy"
            return 0
        fi
        echo "⏳ Waiting for $service_name to be healthy (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed to become healthy"
    return 1
}

# Check all services
echo "🔍 Checking service health..."
check_service_health "http://localhost:8080/api/health/user" "User Service"
check_service_health "http://localhost:8080/api/health/submission" "Submission Service"
check_service_health "http://localhost:8080/api/health/gamification" "Gamification Service"
check_service_health "http://localhost:8080/api/health/feedback" "Feedback Service"
check_service_health "http://localhost:8080/api/health/analytics" "Analytics Service"
check_service_health "http://localhost:8080/api/health/integration" "Integration Service"

# Install test dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install
fi

# Run integration tests
echo "🧪 Running integration tests..."
export API_BASE_URL="http://localhost:8080"
export WS_URL="ws://localhost:8080/ws"

npx jest tests/integration/end-to-end-workflow.test.js --verbose --detectOpenHandles

# Capture exit code
TEST_EXIT_CODE=$?

# Show logs if tests failed
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "❌ Tests failed. Showing service logs..."
    docker-compose logs --tail=50 integration-service
    docker-compose logs --tail=50 api-gateway
fi

# Cleanup
echo "🧹 Cleaning up..."
if [ "$KEEP_SERVICES_RUNNING" != "true" ]; then
    docker-compose down
fi

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All integration tests passed!"
else
    echo "❌ Some integration tests failed"
fi

exit $TEST_EXIT_CODE