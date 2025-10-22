#!/bin/bash

# Dashboard Validation Script for AIOps Learning Platform
# This script validates that Grafana dashboards are properly configured and accessible

set -e

# Configuration
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-admin}"
MAX_RETRIES=30
RETRY_DELAY=5

echo "🚀 Starting Grafana Dashboard Validation"
echo "Grafana URL: $GRAFANA_URL"

# Function to wait for Grafana to be ready
wait_for_grafana() {
    echo "⏳ Waiting for Grafana to be ready..."
    
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -s -u "$GRAFANA_USER:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/health" > /dev/null 2>&1; then
            echo "✅ Grafana is ready!"
            return 0
        fi
        
        echo "   Attempt $i/$MAX_RETRIES - Grafana not ready yet, waiting ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    done
    
    echo "❌ Grafana failed to become ready within timeout"
    return 1
}

# Function to check datasources
check_datasources() {
    echo "🔍 Checking datasources..."
    
    local response=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/datasources")
    
    # Check if Prometheus datasource exists
    if echo "$response" | grep -q '"name":"Prometheus"'; then
        echo "✅ Prometheus datasource found"
    else
        echo "❌ Prometheus datasource not found"
        return 1
    fi
    
    # Check if Loki datasource exists
    if echo "$response" | grep -q '"name":"Loki"'; then
        echo "✅ Loki datasource found"
    else
        echo "❌ Loki datasource not found"
        return 1
    fi
    
    # Check if Jaeger datasource exists
    if echo "$response" | grep -q '"name":"Jaeger"'; then
        echo "✅ Jaeger datasource found"
    else
        echo "❌ Jaeger datasource not found"
        return 1
    fi
}

# Function to check dashboards
check_dashboards() {
    echo "📊 Checking dashboards..."
    
    local response=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/search?type=dash-db")
    local dashboard_count=$(echo "$response" | grep -o '"title"' | wc -l)
    
    echo "   Found $dashboard_count dashboards"
    
    # Expected dashboards
    local expected_dashboards=(
        "Executive Overview"
        "Service Monitoring"
        "Student Performance"
        "AI Model Performance"
        "Gamification"
    )
    
    for dashboard in "${expected_dashboards[@]}"; do
        if echo "$response" | grep -q "$dashboard"; then
            echo "✅ Dashboard found: $dashboard"
        else
            echo "⚠️  Dashboard not found: $dashboard"
        fi
    done
    
    if [ "$dashboard_count" -lt 3 ]; then
        echo "❌ Expected at least 3 dashboards, found $dashboard_count"
        return 1
    fi
}

# Function to test dashboard loading performance
test_dashboard_performance() {
    echo "⚡ Testing dashboard loading performance..."
    
    local dashboards_response=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/search?type=dash-db")
    local first_dashboard_uid=$(echo "$dashboards_response" | grep -o '"uid":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$first_dashboard_uid" ]; then
        local start_time=$(date +%s%N)
        curl -s -u "$GRAFANA_USER:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/dashboards/uid/$first_dashboard_uid" > /dev/null
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        
        echo "   Dashboard load time: ${duration}ms"
        
        if [ "$duration" -lt 3000 ]; then
            echo "✅ Dashboard loading performance is good"
        else
            echo "⚠️  Dashboard loading is slow (${duration}ms > 3000ms)"
        fi
    else
        echo "⚠️  No dashboards found to test performance"
    fi
}

# Function to check alert rules (if available)
check_alert_rules() {
    echo "🚨 Checking alert rules..."
    
    # Try to get alert rules (this might not be available in all Grafana versions)
    local response=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/ruler/grafana/api/v1/rules" 2>/dev/null || echo "{}")
    
    if echo "$response" | grep -q "system-health\|student-performance\|ai-performance"; then
        echo "✅ Alert rules are configured"
    else
        echo "⚠️  Alert rules not found or not accessible"
    fi
}

# Function to validate JSON dashboard files
validate_dashboard_files() {
    echo "📁 Validating dashboard JSON files..."
    
    local dashboard_dir="../infrastructure/grafana/provisioning/dashboards"
    
    if [ -d "$dashboard_dir" ]; then
        local json_files=$(find "$dashboard_dir" -name "*.json" 2>/dev/null || true)
        
        if [ -n "$json_files" ]; then
            echo "$json_files" | while read -r file; do
                if [ -f "$file" ]; then
                    if python3 -m json.tool "$file" > /dev/null 2>&1; then
                        echo "✅ Valid JSON: $(basename "$file")"
                    else
                        echo "❌ Invalid JSON: $(basename "$file")"
                    fi
                fi
            done
        else
            echo "⚠️  No JSON dashboard files found in $dashboard_dir"
        fi
    else
        echo "⚠️  Dashboard directory not found: $dashboard_dir"
    fi
}

# Main execution
main() {
    echo "================================================"
    echo "  AIOps Learning Platform - Dashboard Validation"
    echo "================================================"
    
    # Wait for Grafana to be ready
    if ! wait_for_grafana; then
        exit 1
    fi
    
    # Run validation checks
    local failed_checks=0
    
    if ! check_datasources; then
        ((failed_checks++))
    fi
    
    if ! check_dashboards; then
        ((failed_checks++))
    fi
    
    test_dashboard_performance
    check_alert_rules
    validate_dashboard_files
    
    echo ""
    echo "================================================"
    
    if [ "$failed_checks" -eq 0 ]; then
        echo "🎉 All dashboard validations passed!"
        echo "   Grafana is properly configured and ready to use."
    else
        echo "❌ $failed_checks validation check(s) failed"
        echo "   Please review the configuration and try again."
        exit 1
    fi
    
    echo "================================================"
}

# Run the main function
main "$@"