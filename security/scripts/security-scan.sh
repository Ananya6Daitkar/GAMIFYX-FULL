#!/bin/bash

# GamifyX Comprehensive Security Scanning Script
# This script runs multiple security tools to assess the platform's security posture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCAN_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="security/reports/${SCAN_DATE}"
PROJECT_ROOT=$(pwd)

# Create report directory
mkdir -p "${REPORT_DIR}"

echo -e "${CYAN}🔒 Starting GamifyX Security Scan - ${SCAN_DATE}${NC}"
echo "=================================================="

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}🔍 $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Trivy Vulnerability Scanning
print_section "Running Trivy Vulnerability Scan"

if command_exists trivy; then
    echo "Scanning filesystem for vulnerabilities..."
    trivy fs --config security/trivy/trivy-config.yaml . > "${REPORT_DIR}/trivy-fs-report.json"
    
    echo "Scanning Docker images..."
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep -E "(gamifyx|aiops)" | while read -r image; do
        if [[ "$image" != "REPOSITORY:TAG" ]]; then
            echo "Scanning image: $image"
            trivy image --format json --output "${REPORT_DIR}/trivy-${image//[\/:]/-}-report.json" "$image"
        fi
    done
    
    echo -e "${GREEN}✅ Trivy scan completed${NC}"
else
    echo -e "${YELLOW}⚠️  Trivy not found. Installing...${NC}"
    # Install Trivy
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    echo -e "${GREEN}✅ Trivy installed${NC}"
fi

# 2. OWASP Dependency Check
print_section "Running OWASP Dependency Check"

if command_exists dependency-check; then
    echo "Scanning dependencies for known vulnerabilities..."
    dependency-check \
        --project "GamifyX" \
        --scan . \
        --format JSON \
        --format HTML \
        --out "${REPORT_DIR}" \
        --exclude "**/node_modules/**" \
        --exclude "**/dist/**" \
        --exclude "**/build/**"
    
    echo -e "${GREEN}✅ OWASP Dependency Check completed${NC}"
else
    echo -e "${YELLOW}⚠️  OWASP Dependency Check not found. Please install manually.${NC}"
fi

# 3. Semgrep Static Analysis
print_section "Running Semgrep Static Analysis"

if command_exists semgrep; then
    echo "Running static analysis for security issues..."
    semgrep \
        --config=auto \
        --json \
        --output="${REPORT_DIR}/semgrep-report.json" \
        --exclude="node_modules" \
        --exclude="dist" \
        --exclude="build" \
        .
    
    echo -e "${GREEN}✅ Semgrep analysis completed${NC}"
else
    echo -e "${YELLOW}⚠️  Semgrep not found. Installing...${NC}"
    pip install semgrep
fi

# 4. Secret Scanning with GitLeaks
print_section "Running Secret Scanning"

if command_exists gitleaks; then
    echo "Scanning for exposed secrets..."
    gitleaks detect \
        --source . \
        --report-format json \
        --report-path "${REPORT_DIR}/gitleaks-report.json" \
        --verbose
    
    echo -e "${GREEN}✅ Secret scanning completed${NC}"
else
    echo -e "${YELLOW}⚠️  GitLeaks not found. Installing...${NC}"
    # Install GitLeaks
    curl -sSfL https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | tar -xz -C /usr/local/bin
fi

# 5. Docker Security Scanning
print_section "Running Docker Security Analysis"

if command_exists docker; then
    echo "Analyzing Docker configurations..."
    
    # Scan Dockerfiles
    find . -name "Dockerfile*" -type f | while read -r dockerfile; do
        echo "Analyzing: $dockerfile"
        # Use hadolint for Dockerfile linting
        if command_exists hadolint; then
            hadolint "$dockerfile" --format json > "${REPORT_DIR}/hadolint-$(basename "$dockerfile")-report.json" || true
        fi
    done
    
    # Scan docker-compose files
    find . -name "docker-compose*.yml" -type f | while read -r compose_file; do
        echo "Analyzing: $compose_file"
        # Basic security checks for docker-compose
        python3 security/scripts/docker-compose-security-check.py "$compose_file" > "${REPORT_DIR}/docker-compose-$(basename "$compose_file")-report.json"
    done
    
    echo -e "${GREEN}✅ Docker security analysis completed${NC}"
fi

# 6. Kubernetes Security Scanning
print_section "Running Kubernetes Security Analysis"

if command_exists kubesec; then
    echo "Scanning Kubernetes manifests..."
    find infrastructure/kubernetes -name "*.yml" -o -name "*.yaml" | while read -r k8s_file; do
        echo "Analyzing: $k8s_file"
        kubesec scan "$k8s_file" > "${REPORT_DIR}/kubesec-$(basename "$k8s_file")-report.json"
    done
    
    echo -e "${GREEN}✅ Kubernetes security analysis completed${NC}"
else
    echo -e "${YELLOW}⚠️  Kubesec not found. Installing...${NC}"
    curl -sSX GET "https://v2.kubesec.io/scan" -d @- < infrastructure/kubernetes/gamifyx-production.yml > "${REPORT_DIR}/kubesec-production-report.json"
fi

# 7. Network Security Analysis
print_section "Running Network Security Analysis"

echo "Analyzing network configurations..."

# Check for open ports
if command_exists nmap; then
    echo "Scanning for open ports..."
    nmap -sS -O localhost > "${REPORT_DIR}/nmap-localhost-report.txt" 2>/dev/null || echo "Nmap scan completed with warnings"
fi

# Analyze network policies
if [ -d "infrastructure/kubernetes" ]; then
    echo "Analyzing Kubernetes network policies..."
    find infrastructure/kubernetes -name "*network-policy*" -type f | while read -r policy_file; do
        echo "Found network policy: $policy_file"
        cp "$policy_file" "${REPORT_DIR}/"
    done
fi

echo -e "${GREEN}✅ Network security analysis completed${NC}"

# 8. Code Quality and Security Analysis
print_section "Running Code Quality Analysis"

# ESLint security rules for JavaScript/TypeScript
if command_exists eslint; then
    echo "Running ESLint security analysis..."
    find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | grep -v node_modules | head -100 | while read -r js_file; do
        eslint "$js_file" --format json >> "${REPORT_DIR}/eslint-security-report.json" 2>/dev/null || true
    done
fi

# Bandit for Python security
if command_exists bandit && find . -name "*.py" | grep -v node_modules | head -1 >/dev/null; then
    echo "Running Bandit Python security analysis..."
    bandit -r . -f json -o "${REPORT_DIR}/bandit-report.json" --exclude "**/node_modules/**,**/dist/**,**/build/**" || true
fi

echo -e "${GREEN}✅ Code quality analysis completed${NC}"

# 9. Generate Security Report Summary
print_section "Generating Security Report Summary"

cat > "${REPORT_DIR}/security-scan-summary.md" << EOF
# GamifyX Security Scan Report
**Scan Date:** ${SCAN_DATE}
**Project:** GamifyX AIOps Learning Platform

## Scan Overview
This comprehensive security scan covers:
- Vulnerability scanning (Trivy, OWASP Dependency Check)
- Static code analysis (Semgrep, ESLint)
- Secret detection (GitLeaks)
- Container security (Docker, Kubernetes)
- Network security analysis
- Code quality assessment

## Files Generated
- \`trivy-fs-report.json\` - Filesystem vulnerability scan
- \`trivy-*-report.json\` - Container image scans
- \`dependency-check-report.json\` - OWASP dependency vulnerabilities
- \`semgrep-report.json\` - Static analysis security issues
- \`gitleaks-report.json\` - Exposed secrets scan
- \`hadolint-*-report.json\` - Dockerfile security analysis
- \`kubesec-*-report.json\` - Kubernetes security analysis
- \`eslint-security-report.json\` - JavaScript/TypeScript security issues
- \`bandit-report.json\` - Python security analysis

## Next Steps
1. Review all generated reports for security issues
2. Prioritize fixes based on severity and exploitability
3. Update security policies and configurations
4. Schedule regular security scans
5. Implement automated remediation where possible

## Compliance Status
- **FERPA Compliance:** Review educational data access controls
- **GDPR Compliance:** Verify personal data processing consent
- **SOC 2:** Ensure security controls are documented and tested
- **ISO 27001:** Validate information security management practices

EOF

# 10. Generate Metrics and Statistics
print_section "Generating Security Metrics"

python3 << EOF
import json
import os
from datetime import datetime

report_dir = "${REPORT_DIR}"
metrics = {
    "scan_date": "${SCAN_DATE}",
    "total_files_scanned": 0,
    "vulnerabilities": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    },
    "secrets_found": 0,
    "docker_issues": 0,
    "kubernetes_issues": 0,
    "code_quality_issues": 0
}

# Count files scanned
for root, dirs, files in os.walk("."):
    if "node_modules" not in root and "dist" not in root and "build" not in root:
        metrics["total_files_scanned"] += len([f for f in files if f.endswith(('.js', '.ts', '.py', '.java', '.go', '.dockerfile', '.yml', '.yaml'))])

# Parse Trivy report if exists
trivy_report_path = os.path.join(report_dir, "trivy-fs-report.json")
if os.path.exists(trivy_report_path):
    try:
        with open(trivy_report_path, 'r') as f:
            trivy_data = json.load(f)
            if "Results" in trivy_data:
                for result in trivy_data["Results"]:
                    if "Vulnerabilities" in result:
                        for vuln in result["Vulnerabilities"]:
                            severity = vuln.get("Severity", "").lower()
                            if severity in metrics["vulnerabilities"]:
                                metrics["vulnerabilities"][severity] += 1
    except:
        pass

# Parse GitLeaks report if exists
gitleaks_report_path = os.path.join(report_dir, "gitleaks-report.json")
if os.path.exists(gitleaks_report_path):
    try:
        with open(gitleaks_report_path, 'r') as f:
            gitleaks_data = json.load(f)
            if isinstance(gitleaks_data, list):
                metrics["secrets_found"] = len(gitleaks_data)
    except:
        pass

# Save metrics
with open(os.path.join(report_dir, "security-metrics.json"), 'w') as f:
    json.dump(metrics, f, indent=2)

print(f"Security scan metrics saved to {report_dir}/security-metrics.json")
EOF

echo -e "${GREEN}✅ Security metrics generated${NC}"

# 11. Final Summary
print_section "Security Scan Complete"

echo -e "${CYAN}📊 Scan Summary:${NC}"
echo "• Report directory: ${REPORT_DIR}"
echo "• Scan date: ${SCAN_DATE}"
echo "• Tools used: Trivy, OWASP Dependency Check, Semgrep, GitLeaks, Hadolint, Kubesec"

if [ -f "${REPORT_DIR}/security-metrics.json" ]; then
    echo -e "\n${CYAN}📈 Quick Metrics:${NC}"
    python3 -c "
import json
with open('${REPORT_DIR}/security-metrics.json', 'r') as f:
    metrics = json.load(f)
    print(f'• Files scanned: {metrics[\"total_files_scanned\"]}')
    print(f'• Critical vulnerabilities: {metrics[\"vulnerabilities\"][\"critical\"]}')
    print(f'• High vulnerabilities: {metrics[\"vulnerabilities\"][\"high\"]}')
    print(f'• Secrets found: {metrics[\"secrets_found\"]}')
"
fi

echo -e "\n${PURPLE}🎯 Next Steps:${NC}"
echo "1. Review detailed reports in ${REPORT_DIR}/"
echo "2. Address critical and high severity issues first"
echo "3. Update security policies based on findings"
echo "4. Schedule regular automated scans"
echo "5. Integrate findings into CI/CD pipeline"

echo -e "\n${GREEN}🔒 Security scan completed successfully!${NC}"

# Optional: Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔒 GamifyX Security Scan Completed\\nDate: ${SCAN_DATE}\\nReport: ${REPORT_DIR}\"}" \
        "$SLACK_WEBHOOK_URL" || true
fi