#!/bin/bash

# 📸 Security Screenshots Capture Script
# Automated screenshot capture for security documentation

echo "🔒 Starting Security Screenshots Capture..."

# Create screenshots directory
mkdir -p demo/screenshots/security

# Check if services are running
echo "📋 Checking service status..."

check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $name is running"
        return 0
    else
        echo "❌ $name is not running"
        return 1
    fi
}

# Check all security services
check_service "http://localhost:3004/health" "Security Dashboard"
check_service "http://localhost:3003/health" "Secrets Manager"

echo ""
echo "📸 Ready to capture screenshots!"
echo ""
echo "Manual steps to capture:"
echo ""
echo "1. Security Dashboard Main Interface:"
echo "   - Open: http://localhost:3004"
echo "   - Save as: demo/screenshots/security/security-dashboard-main.png"
echo ""
echo "2. Security Metrics JSON:"
echo "   - Run: curl -s http://localhost:3004/dashboard/metrics | jq ."
echo "   - Save terminal screenshot as: demo/screenshots/security/security-metrics-json.png"
echo ""
echo "3. Vulnerability Management:"
echo "   - Run: curl -s http://localhost:3004/dashboard/vulnerabilities | jq ."
echo "   - Save as: demo/screenshots/security/vulnerability-management.png"
echo ""
echo "4. Secrets Manager Interface:"
echo "   - Open: http://localhost:3003"
echo "   - Save as: demo/screenshots/security/secrets-manager-interface.png"
echo ""
echo "5. Secret Rotation Schedule:"
echo "   - Run: curl -s http://localhost:3003/rotation/schedule | jq ."
echo "   - Save as: demo/screenshots/security/secret-rotation-schedule.png"
echo ""

# Generate sample data for screenshots
echo "📊 Generating sample security data..."

echo "Security Metrics Sample:"
curl -s http://localhost:3004/dashboard/metrics 2>/dev/null | jq . || echo "Service not available"

echo ""
echo "Vulnerability Data Sample:"
curl -s http://localhost:3004/dashboard/vulnerabilities 2>/dev/null | jq . || echo "Service not available"

echo ""
echo "🎯 Screenshot capture guide complete!"
echo "Follow the manual steps above to capture professional security screenshots."