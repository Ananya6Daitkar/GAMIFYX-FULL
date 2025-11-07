# 🔒 Security Screenshots Capture Guide

## ✅ Services Running Successfully!

Your security services are now running on:
- **Secrets Manager**: http://localhost:3033
- **Security Dashboard**: http://localhost:3044

## 📸 Screenshot Capture Instructions

### 1. Security Dashboard Main Interface

**URL**: http://localhost:3044
**Save as**: `demo/screenshots/security/security-dashboard-main.png`

**What to capture**:
- Open the URL in your browser
- Take a full-page screenshot showing the security dashboard interface
- Should show service status and navigation

### 2. Security Metrics JSON Response

**Command**: 
```bash
curl -s http://localhost:3044/dashboard/metrics | jq .
```

**Save as**: `demo/screenshots/security/security-metrics-json.png`

**What to capture**:
- Open terminal with good contrast
- Run the command above (install jq if needed: `brew install jq`)
- Take screenshot showing formatted JSON with:
  - securityScore: 85
  - vulnerabilities: critical: 2, high: 5, medium: 12, low: 8
  - threatLevel: "medium"
  - complianceScore: 92

### 3. Vulnerability Management Data

**Command**:
```bash
curl -s http://localhost:3044/dashboard/vulnerabilities | jq .
```

**Save as**: `demo/screenshots/security/vulnerability-management.png`

**What to capture**:
- Terminal screenshot showing vulnerability data
- Should display vulnerability list with severity levels

### 4. Secrets Manager Interface

**URL**: http://localhost:3033
**Save as**: `demo/screenshots/security/secrets-manager-interface.png`

**What to capture**:
- Open the URL in your browser
- Take screenshot of the secrets manager interface
- Should show service information and endpoints

### 5. Secret Rotation Schedule

**Command**:
```bash
curl -s http://localhost:3033/rotation/schedule | jq .
```

**Save as**: `demo/screenshots/security/secret-rotation-schedule.png`

**What to capture**:
- Terminal screenshot showing rotation schedules
- Should display database credentials and API keys rotation info

### 6. Additional Security Endpoints

**KPIs Data**:
```bash
curl -s http://localhost:3044/dashboard/kpis | jq .
```

**Compliance Status**:
```bash
curl -s http://localhost:3044/dashboard/compliance | jq .
```

## 🎯 Quick Commands for Screenshots

### All-in-One Data Capture:
```bash
echo "=== Security Dashboard Health ==="
curl -s http://localhost:3044/health | jq .

echo -e "\n=== Security Metrics ==="
curl -s http://localhost:3044/dashboard/metrics | jq .

echo -e "\n=== Vulnerability Data ==="
curl -s http://localhost:3044/dashboard/vulnerabilities | jq .

echo -e "\n=== Security KPIs ==="
curl -s http://localhost:3044/dashboard/kpis | jq .

echo -e "\n=== Secrets Manager Health ==="
curl -s http://localhost:3033/health | jq .

echo -e "\n=== Rotation Schedule ==="
curl -s http://localhost:3033/rotation/schedule | jq .
```

## 📱 Screenshot Best Practices

### For Browser Screenshots:
- Use 90-100% zoom level
- Ensure good contrast and readability
- Close unnecessary tabs
- Use consistent browser (Chrome/Firefox)

### For Terminal Screenshots:
- Use light theme for better contrast
- Increase font size for readability
- Ensure terminal window is wide enough
- Use `jq` for pretty JSON formatting

### File Organization:
```
demo/screenshots/security/
├── security-dashboard-main.png
├── security-metrics-json.png
├── vulnerability-management.png
├── secrets-manager-interface.png
├── secret-rotation-schedule.png
└── compliance-dashboard.png
```

## 🛑 When Done - Stop Services

To stop the services when you're finished:
```bash
# Stop the background processes
pkill -f "node.*3033"
pkill -f "node.*3044"
```

Or use the process IDs:
- Secrets Manager: Process ID 5
- Security Dashboard: Process ID 6

## 🎉 You're Ready!

Your security services are running and ready for screenshot capture. Follow the instructions above to capture professional screenshots for your security documentation.

**Service URLs**:
- Secrets Manager: http://localhost:3033
- Security Dashboard: http://localhost:3044

**Screenshot Directory**: `demo/screenshots/security/`