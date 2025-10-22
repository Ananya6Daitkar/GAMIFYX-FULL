#!/bin/bash

# GamifyX AIOps Learning Platform - Development Startup Script
# This script starts the complete GamifyX platform with all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=(
        "logs"
        "data/postgres"
        "data/redis"
        "data/prometheus"
        "data/grafana"
        "data/loki"
        "data/tempo"
        "data/influxdb"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    print_success "All directories created"
}

# Function to check and create environment files
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Check if .env file exists, create from example if not
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_status "Created .env from .env.example"
        else
            print_warning ".env.example not found, creating basic .env file"
            cat > .env << EOF
# GamifyX AIOps Learning Platform Environment Configuration
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration
POSTGRES_DB=aiops_learning_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# JWT Configuration
JWT_SECRET=aiops-super-secret-jwt-key-for-development-only
JWT_REFRESH_SECRET=aiops-super-secret-refresh-key-for-development-only

# Redis Configuration
REDIS_PASSWORD=

# Monitoring Configuration
GRAFANA_ADMIN_PASSWORD=admin

# GamifyX Configuration
GAMIFYX_ENABLED=true
CYBERPUNK_THEME=true
EOF
        fi
    fi
    
    print_success "Environment configuration ready"
}

# Function to pull latest images
pull_images() {
    print_status "Pulling latest Docker images..."
    docker-compose pull
    print_success "Docker images updated"
}

# Function to build custom services
build_services() {
    print_status "Building custom services..."
    docker-compose build --parallel
    print_success "Services built successfully"
}

# Function to start infrastructure services first
start_infrastructure() {
    print_status "Starting infrastructure services..."
    
    # Start databases and monitoring first
    docker-compose up -d postgres redis vault prometheus grafana jaeger loki tempo influxdb otel-collector
    
    print_status "Waiting for infrastructure services to be ready..."
    sleep 30
    
    # Check if services are healthy
    print_status "Checking service health..."
    
    services=("postgres" "redis" "prometheus" "grafana")
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_warning "$service may not be ready yet"
        fi
    done
}

# Function to start application services
start_applications() {
    print_status "Starting application services..."
    
    # Start core services
    docker-compose up -d user-service secrets-manager security-dashboard
    sleep 15
    
    # Start gamification and analytics services
    docker-compose up -d gamification-service analytics-service ai-feedback-service feedback-service
    sleep 15
    
    # Start integration service
    docker-compose up -d integration-service
    sleep 10
    
    # Start API Gateway
    docker-compose up -d api-gateway
    sleep 10
    
    # Start frontend
    docker-compose up -d frontend
    
    print_success "All application services started"
}

# Function to show service status
show_status() {
    print_header "=== GamifyX Platform Service Status ==="
    docker-compose ps
    echo ""
}

# Function to show access URLs
show_urls() {
    print_header "=== GamifyX Platform Access URLs ==="
    echo -e "${CYAN}🎮 GamifyX Dashboard:${NC}     http://localhost:8080"
    echo -e "${CYAN}🔗 API Gateway:${NC}           http://localhost:3000"
    echo -e "${CYAN}📊 Grafana:${NC}               http://localhost:3000 (admin/admin)"
    echo -e "${CYAN}🔍 Jaeger Tracing:${NC}        http://localhost:16686"
    echo -e "${CYAN}📈 Prometheus:${NC}            http://localhost:9090"
    echo -e "${CYAN}🔐 Vault UI:${NC}              http://localhost:8200 (token: dev-token)"
    echo -e "${CYAN}💾 InfluxDB:${NC}              http://localhost:8086 (admin/password123)"
    echo ""
    echo -e "${CYAN}🔌 WebSocket Endpoint:${NC}    ws://localhost:3000/ws"
    echo -e "${CYAN}📖 API Documentation:${NC}     http://localhost:3000/api"
    echo ""
}

# Function to show logs
show_logs() {
    print_header "=== Recent Service Logs ==="
    docker-compose logs --tail=10 api-gateway frontend
}

# Function to run health checks
health_check() {
    print_status "Running health checks..."
    
    services=(
        "http://localhost:3000/health:API Gateway"
        "http://localhost:3001/health:User Service"
        "http://localhost:3005/health:Gamification Service"
        "http://localhost:8080:Frontend"
    )
    
    for service_info in "${services[@]}"; do
        url=$(echo "$service_info" | cut -d: -f1)
        name=$(echo "$service_info" | cut -d: -f2)
        
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_warning "$name is not responding"
        fi
    done
}

# Main execution
main() {
    print_header "🚀 Starting GamifyX AIOps Learning Platform 🚀"
    echo ""
    
    # Pre-flight checks
    check_docker
    check_docker_compose
    
    # Setup
    create_directories
    setup_environment
    
    # Build and start
    pull_images
    build_services
    
    print_status "Starting services in stages..."
    start_infrastructure
    start_applications
    
    # Status and information
    show_status
    show_urls
    
    # Health checks
    sleep 10
    health_check
    
    print_header "🎉 GamifyX Platform Started Successfully! 🎉"
    echo ""
    print_status "To view logs: docker-compose logs -f [service-name]"
    print_status "To stop all services: docker-compose down"
    print_status "To stop and remove volumes: docker-compose down -v"
    echo ""
    
    # Show recent logs
    show_logs
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        print_status "Stopping GamifyX Platform..."
        docker-compose down
        print_success "Platform stopped"
        ;;
    "restart")
        print_status "Restarting GamifyX Platform..."
        docker-compose down
        sleep 5
        main
        ;;
    "logs")
        docker-compose logs -f "${2:-api-gateway}"
        ;;
    "status")
        show_status
        show_urls
        health_check
        ;;
    "clean")
        print_warning "This will remove all containers and volumes. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker-compose down -v --remove-orphans
            docker system prune -f
            print_success "Platform cleaned"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs [service]|status|clean}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the complete GamifyX platform"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart the platform"
        echo "  logs     - Show logs for a service (default: api-gateway)"
        echo "  status   - Show service status and URLs"
        echo "  clean    - Remove all containers and volumes"
        exit 1
        ;;
esac