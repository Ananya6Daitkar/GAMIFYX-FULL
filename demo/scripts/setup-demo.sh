#!/bin/bash

# GamifyX AIOps Learning Platform - Comprehensive Demo Setup Script
set -e

echo "🚀 Setting up GamifyX AIOps Learning Platform Demo Environment"
echo "============================================================"

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
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_competition() {
    echo -e "${CYAN}🏆 $1${NC}"
}

print_feature() {
    echo -e "${PURPLE}✨ $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is required but not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

print_status "All prerequisites are installed"

# Navigate to project root
cd "$(dirname "$0")/../.."

# Install demo dependencies
echo "📦 Installing demo dependencies..."
cd demo/data-generator
if [ ! -d "node_modules" ]; then
    npm install
    print_status "Demo dependencies installed"
else
    print_info "Demo dependencies already installed"
fi
cd ../..

# Start services
echo "🐳 Starting Docker services..."
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose up -d

print_status "Docker services started"

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Function to check service health
check_service_health() {
    local service_url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$service_url" > /dev/null 2>&1; then
            print_status "$service_name is healthy"
            return 0
        fi
        echo "⏳ Waiting for $service_name to be healthy (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    print_warning "$service_name failed to become healthy within timeout"
    return 1
}

# Check core services
echo "🔍 Checking service health..."
check_service_health "http://localhost:8080/health" "API Gateway"
check_service_health "http://localhost:8080/api/health/user" "User Service"
check_service_health "http://localhost:8080/api/health/submission" "Submission Service"
check_service_health "http://localhost:8080/api/health/gamification" "Gamification Service"
check_service_health "http://localhost:8080/api/health/feedback" "Feedback Service"
check_service_health "http://localhost:8080/api/health/analytics" "Analytics Service"

# Check competition service if available
print_competition "Checking competition integration services..."
if check_service_health "http://localhost:8080/api/competitions/health" "Competition Service"; then
    print_competition "Competition Service is ready for external integration"
else
    print_warning "Competition Service may not be fully configured - some features may be limited"
fi

# Generate comprehensive demo data
echo "📊 Generating comprehensive demo data..."
print_competition "Including external competition data..."
print_feature "Adding campaign management data..."
cd demo/data-generator
node src/generate-demo-data.js
print_status "Comprehensive demo data generated successfully"

# Run enhanced demo scenarios
echo "🎬 Setting up enhanced demo scenarios..."
print_competition "Configuring competition integration scenarios..."
node src/demo-scenarios.js
print_status "Enhanced demo scenarios completed"

cd ../..

# Display comprehensive access information
echo ""
echo "🎉 GamifyX Demo Environment Setup Complete!"
echo "=========================================="
echo ""
echo "📱 Access Points:"
echo "  🎮 Frontend Application: http://localhost:3000"
echo "  🔧 API Gateway: http://localhost:8080"
echo "  📊 Grafana Dashboard: http://localhost:3001 (admin/admin)"
echo "  📈 Prometheus: http://localhost:9090"
echo "  🔍 Jaeger Tracing: http://localhost:16686"
echo ""
echo "👥 Demo Credentials:"
echo "  🧑‍🎓 Student: demo.student@aiops-platform.com / DemoStudent123!"
echo "  👩‍🏫 Teacher: demo.teacher@aiops-platform.com / DemoTeacher123!"
echo "  👨‍💼 Admin: demo.admin@aiops-platform.com / DemoAdmin123!"
echo ""
echo "🎬 Enhanced Demo Scenarios Available:"
echo "  1. 📚 Complete Student Learning Journey"
echo "  2. 👩‍🏫 Teacher Intervention Workflow"
echo "  3. 🔮 AI Risk Prediction & Analytics"
echo "  4. 🎮 Gamification & Engagement"
echo "  5. 🏆 External Competition Integration (NEW!)"
echo ""
print_competition "Competition Features Demonstrated:"
echo "  🐙 GitHub Integration - Pull request tracking"
echo "  🎃 Hacktoberfest Campaigns - Open source participation"
echo "  📋 Campaign Management - Teacher-led challenges"
echo "  🏅 External Achievements - Real-world verification"
echo "  📊 Competition Analytics - Performance tracking"
echo ""
echo "🎯 Key Features to Explore:"
echo "  🤖 AI-Powered Code Analysis - Instant feedback in <30 seconds"
echo "  🔮 Predictive Analytics - ML-based risk scoring"
echo "  🎨 Cyberpunk Dashboard - Immersive neon-themed interface"
echo "  🏆 Competition Tracking - Real-world GitHub/LeetCode integration"
echo "  📊 Real-Time Monitoring - Live performance metrics"
echo "  🔒 Enterprise Security - Comprehensive compliance framework"
echo ""
echo "📊 Generated Demo Data:"
echo "  👥 Users: 57 total (50 students, 5 teachers, 2 admins)"
echo "  📝 Submissions: 750+ code submissions"
echo "  💬 AI Feedback: 600+ improvement suggestions"
echo "  🎮 Gamification: Complete points, badges, leaderboards"
echo "  🏆 Competitions: 8 external competitions"
echo "  📋 Campaigns: 4 teacher-created challenges"
echo "  🏅 Achievements: 120+ external records"
echo ""
echo "📚 Documentation:"
echo "  📖 Main Guide: ./demo/README.md"
echo "  🎬 Video Script: ./demo/comprehensive-video-script.md"
echo "  📊 Presentation: ./demo/presentation/comprehensive-demo-slides.md"
echo ""
echo "🛑 To stop the demo: docker-compose down"
echo ""
print_status "Happy demoing with GamifyX! 🚀🎮"
print_competition "Ready to revolutionize DevOps education!"