#!/bin/bash

# AIOps Learning Platform Startup Script
echo "🚀 Starting AIOps Learning Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    print_error "Docker Compose is not available. Please install Docker Compose and try again."
    exit 1
fi

# Use docker-compose or docker compose based on availability
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

print_status "Using $DOCKER_COMPOSE_CMD for container orchestration"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p logs

# Stop any existing containers
print_status "Stopping any existing containers..."
$DOCKER_COMPOSE_CMD down

# Build and start services
print_status "Building and starting services..."
$DOCKER_COMPOSE_CMD up --build -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

services=("postgres" "redis" "vault" "user-service" "secrets-manager" "security-dashboard")
all_healthy=true

for service in "${services[@]}"; do
    if $DOCKER_COMPOSE_CMD ps | grep -q "$service.*healthy\|$service.*Up"; then
        print_success "$service is running"
    else
        print_warning "$service may not be healthy yet"
        all_healthy=false
    fi
done

# Initialize services
if [ "$all_healthy" = true ]; then
    print_status "Initializing services..."
    
    # Initialize Vault (if secrets-manager is healthy)
    print_status "Initializing Vault with sample secrets..."
    $DOCKER_COMPOSE_CMD exec secrets-manager npm run vault:init || print_warning "Vault initialization may have failed"
    
    # Run database migrations
    print_status "Running database migrations..."
    $DOCKER_COMPOSE_CMD exec user-service npm run migrate || print_warning "User service migration may have failed"
    $DOCKER_COMPOSE_CMD exec secrets-manager npm run migrate || print_warning "Secrets manager migration may have failed"
    $DOCKER_COMPOSE_CMD exec security-dashboard npm run migrate || print_warning "Security dashboard migration may have failed"
fi

# Display service URLs
echo ""
print_success "🎉 AIOps Learning Platform is starting up!"
echo ""
echo "📊 Service URLs:"
echo "   • API Gateway:          http://localhost:3000"
echo "   • User Service:         http://localhost:3001"
echo "   • Secrets Manager:      http://localhost:3003"
echo "   • Security Dashboard:   http://localhost:3004"
echo ""
echo "🔧 Monitoring & Tools:"
echo "   • Grafana Dashboard:    http://localhost:3000 (admin/admin)"
echo "   • Prometheus:           http://localhost:9090"
echo "   • Jaeger Tracing:       http://localhost:16686"
echo "   • Vault UI:             http://localhost:8200 (token: dev-token)"
echo ""
echo "💾 Databases:"
echo "   • PostgreSQL:           localhost:5432 (postgres/password)"
echo "   • Redis:                localhost:6379"
echo ""
echo "📋 Health Checks:"
echo "   • User Service:         http://localhost:3001/health"
echo "   • Secrets Manager:      http://localhost:3003/health"
echo "   • Security Dashboard:   http://localhost:3004/health"
echo ""

# Show logs
print_status "Showing service logs (press Ctrl+C to stop)..."
echo "To view logs for a specific service, run:"
echo "  $DOCKER_COMPOSE_CMD logs -f <service-name>"
echo ""

# Follow logs
$DOCKER_COMPOSE_CMD logs -f