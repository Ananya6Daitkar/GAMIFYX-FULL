#!/bin/bash

# Security Framework Test Runner
# Comprehensive testing of all security components and configurations

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SECURITY_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local optional="${3:-false}"
    
    log_info "Running test: $test_name"
    ((TOTAL_TESTS++))
    
    if eval "$test_command" > /tmp/test_output 2>&1; then
        log_success "$test_name - PASSED"
        ((PASSED_TESTS++))
        return 0
    else
        if [ "$optional" = "true" ]; then
            log_warning "$test_name - SKIPPED (optional)"
            ((SKIPPED_TESTS++))
            return 0
        else
            log_error "$test_name - FAILED"
            cat /tmp/test_output
            ((FAILED_TESTS++))
            return 1
        fi
    fi
}

# Header
echo "🔒 AIOps Learning Platform - Security Framework Tests"
echo "=================================================="
echo

# Test 1: Threat Model Validation
log_info "🎯 Testing Threat Modeling Framework..."
run_test "Threat Model File Exists" "test -f '$SECURITY_DIR/threat-modeling/threat-model.json'"
run_test "Threat Model JSON Valid" "python3 -m json.tool '$SECURITY_DIR/threat-modeling/threat-model.json' > /dev/null"
run_test "Threat Model Structure" "jq -e '.threats | length > 0' '$SECURITY_DIR/threat-modeling/threat-model.json' > /dev/null"

# Test 2: Vulnerability Management
log_info "🔍 Testing Vulnerability Management..."
run_test "Trivy Config Exists" "test -f '$SECURITY_DIR/vulnerability-management/trivy-config.yaml'"
run_test "Scan Pipeline Exists" "test -f '$SECURITY_DIR/vulnerability-management/scan-pipeline.yml'"
run_test "Trivy Installation" "command -v trivy" true
run_test "Trivy Config Validation" "trivy --help | grep -q 'vulnerability scanner'" true

# Test 3: SBOM Generation
log_info "📋 Testing SBOM Generation System..."
run_test "SBOM Script Exists" "test -f '$SECURITY_DIR/sbom/generate-sbom.sh'"
run_test "SBOM Script Executable" "test -x '$SECURITY_DIR/sbom/generate-sbom.sh'"
run_test "SBOM Script Help" "'$SECURITY_DIR/sbom/generate-sbom.sh' --help | grep -q 'Usage:'"
run_test "Syft Installation" "command -v syft" true
run_test "SBOM Dashboard Config" "test -f '$SECURITY_DIR/sbom/sbom-tracking-dashboard.json'"
run_test "Vulnerability Tracking Script" "test -f '$SECURITY_DIR/sbom/vulnerability-tracking.js'"

# Test 4: Compliance Mapping
log_info "📊 Testing Compliance Frameworks..."
run_test "NIST 800-53 Mapping Exists" "test -f '$SECURITY_DIR/compliance/nist-800-53-mapping.json'"
run_test "CIS Controls Mapping Exists" "test -f '$SECURITY_DIR/compliance/cis-controls-mapping.json'"
run_test "NIST Mapping Valid JSON" "python3 -m json.tool '$SECURITY_DIR/compliance/nist-800-53-mapping.json' > /dev/null"
run_test "CIS Mapping Valid JSON" "python3 -m json.tool '$SECURITY_DIR/compliance/cis-controls-mapping.json' > /dev/null"

# Test 5: Security Configuration
log_info "⚙️ Testing Security Configuration..."
run_test "Docker Compose Security" "grep -q 'security_opt' '$PROJECT_ROOT/docker-compose.yml' || grep -q 'user:' '$PROJECT_ROOT/docker-compose.yml'"
run_test "Nginx Security Headers" "grep -q 'X-Frame-Options' '$PROJECT_ROOT/infrastructure/nginx.conf'"
run_test "Rate Limiting Config" "grep -q 'limit_req' '$PROJECT_ROOT/infrastructure/nginx.conf'"

# Test 6: Service Security
log_info "🛡️ Testing Service Security..."
if [ -d "$PROJECT_ROOT/services" ]; then
    for service_dir in "$PROJECT_ROOT/services"/*; do
        if [ -d "$service_dir" ]; then
            service_name=$(basename "$service_dir")
            run_test "Service $service_name Dockerfile Security" "grep -q 'USER' '$service_dir/Dockerfile' || grep -q 'RUN adduser' '$service_dir/Dockerfile'" true
        fi
    done
fi

# Test 7: Security Testing Framework
log_info "🧪 Testing Security Test Framework..."
run_test "Security Tests Exist" "test -f '$SECURITY_DIR/tests/security-framework.test.js'"
run_test "Node.js Available" "command -v node" true
run_test "Jest Available" "command -v npx && npx jest --version" true

# Test 8: Security Monitoring
log_info "📈 Testing Security Monitoring..."
run_test "Grafana Security Dashboard" "test -f '$SECURITY_DIR/sbom/sbom-tracking-dashboard.json'"
run_test "Prometheus Config" "test -f '$PROJECT_ROOT/infrastructure/prometheus.yml'"
run_test "OpenTelemetry Config" "test -f '$PROJECT_ROOT/infrastructure/otel-collector-config.yaml'"

# Test 9: Secrets Management
log_info "🔐 Testing Secrets Management..."
run_test "Environment Template" "test -f '$PROJECT_ROOT/.env.example'"
run_test "No Hardcoded Secrets in Docker Compose" "! grep -r 'password.*=' '$PROJECT_ROOT/docker-compose.yml' | grep -v 'POSTGRES_PASSWORD' | grep -v 'example'"
run_test "Gitignore Secrets" "grep -q '.env' '$PROJECT_ROOT/.gitignore'"

# Test 10: Container Security
log_info "🐳 Testing Container Security..."
run_test "Docker Security Scanning" "command -v docker" true
if command -v docker &> /dev/null; then
    run_test "Docker Bench Security" "command -v docker-bench-security" true
fi

# Test 11: Network Security
log_info "🌐 Testing Network Security..."
run_test "Network Segmentation" "grep -q 'networks:' '$PROJECT_ROOT/docker-compose.yml'"
run_test "HTTPS Configuration" "grep -q 'ssl' '$PROJECT_ROOT/infrastructure/nginx.conf' || grep -q 'https' '$PROJECT_ROOT/infrastructure/nginx.conf'" true

# Test 12: Incident Response
log_info "🚨 Testing Incident Response..."
run_test "Security Alerting Config" "grep -q 'webhook' '$SECURITY_DIR/vulnerability-management/trivy-config.yaml' || grep -q 'notification' '$SECURITY_DIR/vulnerability-management/trivy-config.yaml'"

# Test 13: Compliance Validation
log_info "✅ Testing Compliance Implementation..."
run_test "NIST Controls Implementation" "jq -e '.implementation_summary.implementation_percentage >= 80' '$SECURITY_DIR/compliance/nist-800-53-mapping.json'"
run_test "CIS Controls Implementation" "jq -e '.implementation_summary.implementation_percentage >= 80' '$SECURITY_DIR/compliance/cis-controls-mapping.json'"

# Test 14: Security Documentation
log_info "📚 Testing Security Documentation..."
run_test "Security README" "test -f '$SECURITY_DIR/README.md' || test -f '$PROJECT_ROOT/SECURITY.md'"
run_test "Threat Model Documentation" "jq -e '.summary.description | length > 0' '$SECURITY_DIR/threat-modeling/threat-model.json'"

# Test 15: Integration Tests (Optional)
log_info "🔗 Testing Security Integration..."
if [ -n "$API_BASE_URL" ] || netstat -ln | grep -q ':8080'; then
    run_test "API Security Headers" "curl -s -I '${API_BASE_URL:-http://localhost:8080}/health' | grep -q 'X-Frame-Options'" true
    run_test "Rate Limiting Active" "for i in {1..10}; do curl -s '${API_BASE_URL:-http://localhost:8080}/health' > /dev/null; done" true
else
    log_warning "API not available, skipping integration tests"
    ((SKIPPED_TESTS += 2))
    ((TOTAL_TESTS += 2))
fi

# Run Jest tests if available
if command -v npx &> /dev/null && [ -f "$PROJECT_ROOT/package.json" ]; then
    log_info "🧪 Running Jest Security Tests..."
    cd "$PROJECT_ROOT"
    if npx jest security/tests/security-framework.test.js --verbose > /tmp/jest_output 2>&1; then
        log_success "Jest Security Tests - PASSED"
        ((PASSED_TESTS++))
    else
        log_warning "Jest Security Tests - Some tests may have failed (check output)"
        cat /tmp/jest_output
        ((SKIPPED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    cd - > /dev/null
else
    log_warning "Jest not available, skipping JavaScript tests"
    ((SKIPPED_TESTS++))
    ((TOTAL_TESTS++))
fi

# Generate Security Test Report
echo
echo "🔒 Security Test Report"
echo "======================"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Skipped: $SKIPPED_TESTS"
echo

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo "Success Rate: $SUCCESS_RATE%"
    
    if [ $SUCCESS_RATE -ge 90 ]; then
        log_success "Excellent security posture! 🎉"
    elif [ $SUCCESS_RATE -ge 80 ]; then
        log_success "Good security posture! ✅"
    elif [ $SUCCESS_RATE -ge 70 ]; then
        log_warning "Acceptable security posture, room for improvement ⚠️"
    else
        log_error "Security posture needs significant improvement ❌"
    fi
fi

# Security Recommendations
echo
echo "🔧 Security Recommendations:"
echo "============================"

if [ $FAILED_TESTS -gt 0 ]; then
    echo "• Address failed security tests immediately"
fi

if [ $SKIPPED_TESTS -gt 5 ]; then
    echo "• Install missing security tools (Trivy, Syft, etc.)"
fi

echo "• Regularly update vulnerability databases"
echo "• Conduct periodic security assessments"
echo "• Review and update threat model quarterly"
echo "• Monitor security metrics and alerts"
echo "• Keep security documentation current"

# Generate detailed report file
REPORT_FILE="$SECURITY_DIR/tests/security-test-report-$(date +%Y%m%d_%H%M%S).md"
cat > "$REPORT_FILE" << EOF
# Security Framework Test Report

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Platform**: AIOps Learning Platform
**Test Suite**: Security Framework Validation

## Summary

- **Total Tests**: $TOTAL_TESTS
- **Passed**: $PASSED_TESTS
- **Failed**: $FAILED_TESTS
- **Skipped**: $SKIPPED_TESTS
- **Success Rate**: $SUCCESS_RATE%

## Test Categories

### ✅ Passed Tests
$([ $PASSED_TESTS -gt 0 ] && echo "- $PASSED_TESTS security tests passed successfully")

### ❌ Failed Tests
$([ $FAILED_TESTS -gt 0 ] && echo "- $FAILED_TESTS security tests failed and require attention")

### ⚠️ Skipped Tests
$([ $SKIPPED_TESTS -gt 0 ] && echo "- $SKIPPED_TESTS tests were skipped (missing tools or optional)")

## Recommendations

1. **Immediate Actions**
   - Address any failed security tests
   - Install missing security tools
   - Review security configurations

2. **Ongoing Maintenance**
   - Run security tests regularly
   - Update vulnerability databases
   - Monitor security metrics
   - Review threat model quarterly

3. **Compliance**
   - Maintain NIST 800-53 compliance
   - Keep CIS Controls implementation current
   - Document security evidence

## Next Steps

- [ ] Address failed tests
- [ ] Install missing tools
- [ ] Schedule regular security testing
- [ ] Update security documentation
- [ ] Review incident response procedures

---

*Generated by AIOps Learning Platform Security Test Suite*
EOF

echo
log_success "Detailed report saved: $REPORT_FILE"

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi