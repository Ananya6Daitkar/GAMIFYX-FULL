#!/bin/bash

# 🚀 Start All Security Services for Screenshot Capture
# This script starts all necessary services for security screenshots

echo "🔒 Starting GamifyX Security Services..."
echo "=================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Function to start a service in background
start_service() {
    local service_name=$1
    local service_path=$2
    local start_command=$3
    local port=$4
    
    echo ""
    echo "🚀 Starting $service_name..."
    echo "   Path: $service_path"
    echo "   Command: $start_command"
    echo "   Port: $port"
    
    if check_port $port; then
        cd "$service_path"
        eval "$start_command" &
        local pid=$!
        echo "   PID: $pid"
        sleep 3
        
        # Check if service started successfully
        if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "   ✅ $service_name started successfully"
        else
            echo "   ⚠️  $service_name may still be starting..."
        fi
        cd - >/dev/null
    else
        echo "   ⚠️  Skipping $service_name (port in use)"
    fi
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*3003" 2>/dev/null || true
pkill -f "node.*3004" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
sleep 2

# Start Security Dashboard
start_service "Security Dashboard" "services/security-dashboard" "node -r ts-node/register src/simple-server.ts" "3004"

# Start Secrets Manager
start_service "Secrets Manager" "services/secrets-manager" "node simple-server.js" "3003"

# Start Frontend (needed for complete screenshots)
start_service "Frontend" "frontend-full" "npm start" "3000"

# Start API Server (if exists)
if [ -f "simple-api-server.js" ]; then
    start_service "API Server" "." "node simple-api-server.js" "3001"
fi

echo ""
echo "🎯 Service Status Check:"
echo "========================"

# Check all services
services=(
    "Frontend:3000:http://localhost:3000"
    "API Server:3001:http://localhost:3001/health"
    "Secrets Manager:3003:http://localhost:3003/health"
    "Security Dashboard:3004:http://localhost:3004/health"
)

for service in "${services[@]}"; do
    IFS=':' read -r name port url <<< "$service"
    if curl -s "$url" >/dev/null 2>&1; then
        echo "✅ $name ($port): Running"
    else
        echo "❌ $name ($port): Not responding"
    fi
done

echo ""
echo "🔗 Service URLs:"
echo "================"
echo "Frontend:           http://localhost:3000"
echo "API Server:         http://localhost:3001"
echo "Secrets Manager:    http://localhost:3003"
echo "Security Dashboard: http://localhost:3004"

echo ""
echo "📸 Ready for Screenshots!"
echo "========================="
echo ""
echo "Now you can capture screenshots:"
echo ""
echo "1. Security Dashboard:"
echo "   Open: http://localhost:3004"
echo ""
echo "2. Security Metrics JSON:"
echo "   Run: curl -s http://localhost:3004/dashboard/metrics | jq ."
echo ""
echo "3. Vulnerability Data:"
echo "   Run: curl -s http://localhost:3004/dashboard/vulnerabilities | jq ."
echo ""
echo "4. Secrets Manager:"
echo "   Open: http://localhost:3003"
echo ""
echo "5. Secrets Rotation:"
echo "   Run: curl -s http://localhost:3003/rotation/schedule | jq ."
echo ""
echo "💡 Tip: Use 'pkill -f node' to stop all services when done"
echo ""
echo "🎯 Screenshot files should be saved to: demo/screenshots/security/"