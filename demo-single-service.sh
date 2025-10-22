#!/bin/bash

# AIOps Learning Platform - Single Service Demo
echo "🚀 AIOps Learning Platform - Service Demo"

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

# Function to show service menu
show_menu() {
    echo ""
    echo "🎯 Select a service to run:"
    echo "1) API Gateway (Port 3000)"
    echo "2) User Service (Port 3001)"
    echo "3) Secrets Manager (Port 3003)"
    echo "4) Security Dashboard (Port 3004)"
    echo "5) Show API Documentation"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
}

# Function to run API Gateway
run_api_gateway() {
    print_status "Starting API Gateway..."
    echo "🌐 API Gateway will be available at: http://localhost:3000"
    echo "📖 API Documentation: http://localhost:3000/api"
    echo "❤️  Health Check: http://localhost:3000/health"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    cd services/api-gateway
    npm run dev
}

# Function to run User Service
run_user_service() {
    print_status "Starting User Service..."
    echo "👤 User Service will be available at: http://localhost:3001"
    echo "❤️  Health Check: http://localhost:3001/health"
    echo ""
    echo "🔧 Environment Variables (you may need to set these):"
    echo "   DB_HOST=localhost"
    echo "   DB_PORT=5432"
    echo "   DB_NAME=aiops_learning_platform"
    echo "   DB_USER=postgres"
    echo "   DB_PASSWORD=password"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    cd services/user-service
    npm run dev
}

# Function to run Secrets Manager
run_secrets_manager() {
    print_status "Starting Secrets Manager..."
    echo "🔐 Secrets Manager will be available at: http://localhost:3003"
    echo "❤️  Health Check: http://localhost:3003/health"
    echo ""
    echo "🔧 Environment Variables (you may need to set these):"
    echo "   DB_HOST=localhost"
    echo "   DB_PORT=5432"
    echo "   DB_NAME=aiops_secrets"
    echo "   DB_USER=postgres"
    echo "   DB_PASSWORD=password"
    echo "   VAULT_ENDPOINT=http://localhost:8200"
    echo "   VAULT_TOKEN=dev-token"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    cd services/secrets-manager
    npm run dev
}

# Function to run Security Dashboard
run_security_dashboard() {
    print_status "Starting Security Dashboard..."
    echo "🛡️  Security Dashboard will be available at: http://localhost:3004"
    echo "❤️  Health Check: http://localhost:3004/health"
    echo ""
    echo "🔧 Environment Variables (you may need to set these):"
    echo "   DB_HOST=localhost"
    echo "   DB_PORT=5432"
    echo "   DB_NAME=aiops_security"
    echo "   DB_USER=postgres"
    echo "   DB_PASSWORD=password"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    cd services/security-dashboard
    npm run dev
}

# Function to show API documentation
show_api_docs() {
    echo ""
    echo "📖 AIOps Learning Platform API Documentation"
    echo "=============================================="
    echo ""
    echo "🔗 Base URLs (when services are running):"
    echo "   • API Gateway:          http://localhost:3000/api"
    echo "   • User Service:         http://localhost:3001"
    echo "   • Secrets Manager:      http://localhost:3003"
    echo "   • Security Dashboard:   http://localhost:3004"
    echo ""
    echo "🔐 Authentication Endpoints:"
    echo "   POST /api/auth/register  - Register new user"
    echo "   POST /api/auth/login     - User login"
    echo "   POST /api/auth/refresh   - Refresh JWT token"
    echo ""
    echo "👤 User Management:"
    echo "   GET  /api/users/profile  - Get user profile"
    echo "   PUT  /api/users/profile  - Update user profile"
    echo "   POST /api/mfa/setup/:id  - Setup MFA"
    echo ""
    echo "🔐 Secrets Management:"
    echo "   POST /api/secrets        - Create secret"
    echo "   GET  /api/secrets/*      - Get secret"
    echo "   PUT  /api/secrets/*      - Update secret"
    echo "   DELETE /api/secrets/*    - Delete secret"
    echo "   GET  /api/rotation/schedule - Get rotation schedule"
    echo ""
    echo "🛡️  Security Dashboard:"
    echo "   GET  /api/security/metrics      - Security metrics"
    echo "   GET  /api/security/kpis         - Security KPIs"
    echo "   GET  /api/security/vulnerabilities - Vulnerabilities"
    echo "   GET  /api/security/threats      - Threat intelligence"
    echo "   POST /api/security/vulnerabilities/scan - Trigger scan"
    echo ""
    echo "❤️  Health Checks:"
    echo "   GET  /health             - Service health status"
    echo ""
    echo "📊 Example API Calls:"
    echo ""
    echo "# Register a user"
    echo 'curl -X POST http://localhost:3000/api/auth/register \'
    echo '  -H "Content-Type: application/json" \'
    echo '  -d '"'"'{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User","role":"student"}'"'"
    echo ""
    echo "# Login"
    echo 'curl -X POST http://localhost:3000/api/auth/login \'
    echo '  -H "Content-Type: application/json" \'
    echo '  -d '"'"'{"email":"test@example.com","password":"Test123!"}'"'"
    echo ""
    echo "# Get security metrics (requires auth token)"
    echo 'curl -X GET http://localhost:3000/api/security/metrics \'
    echo '  -H "Authorization: Bearer YOUR_JWT_TOKEN"'
    echo ""
    read -p "Press Enter to continue..."
}

# Main loop
while true; do
    show_menu
    case $choice in
        1)
            run_api_gateway
            ;;
        2)
            run_user_service
            ;;
        3)
            run_secrets_manager
            ;;
        4)
            run_security_dashboard
            ;;
        5)
            show_api_docs
            ;;
        6)
            print_success "Thanks for trying AIOps Learning Platform! 👋"
            exit 0
            ;;
        *)
            print_error "Invalid option. Please choose 1-6."
            ;;
    esac
done