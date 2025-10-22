#!/bin/bash

# AIOps Learning Platform - Local Development Setup
echo "🚀 Starting AIOps Learning Platform in Development Mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_success "npm $(npm -v) detected"

# Install dependencies for all services
services=("api-gateway" "user-service" "secrets-manager" "security-dashboard")

for service in "${services[@]}"; do
    if [ -d "services/$service" ]; then
        print_status "Installing dependencies for $service..."
        cd "services/$service"
        npm install
        cd "../.."
        print_success "$service dependencies installed"
    else
        print_warning "Service directory services/$service not found, skipping..."
    fi
done

print_success "🎉 All dependencies installed!"
echo ""
echo "📋 To run the services, you have several options:"
echo ""
echo "🐳 Option 1: Docker (Recommended)"
echo "   1. Install Docker Desktop"
echo "   2. Start Docker"
echo "   3. Run: ./start-aiops-platform.sh"
echo ""
echo "💻 Option 2: Local Development (Individual Services)"
echo "   # Terminal 1 - User Service"
echo "   cd services/user-service && npm run dev"
echo ""
echo "   # Terminal 2 - Secrets Manager"
echo "   cd services/secrets-manager && npm run dev"
echo ""
echo "   # Terminal 3 - Security Dashboard"
echo "   cd services/security-dashboard && npm run dev"
echo ""
echo "   # Terminal 4 - API Gateway"
echo "   cd services/api-gateway && npm run dev"
echo ""
echo "📊 Service URLs (when running):"
echo "   • API Gateway:          http://localhost:3000"
echo "   • User Service:         http://localhost:3001"
echo "   • Secrets Manager:      http://localhost:3003"
echo "   • Security Dashboard:   http://localhost:3004"
echo ""
echo "⚠️  Note: For full functionality, you'll also need:"
echo "   • PostgreSQL database running on port 5432"
echo "   • Redis running on port 6379"
echo "   • HashiCorp Vault running on port 8200"
echo ""
echo "🐳 Docker is the easiest way to run everything together!"