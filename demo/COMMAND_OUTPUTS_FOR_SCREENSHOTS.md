# 📸 Command Outputs for Professional Screenshots

**Essential terminal outputs to showcase GamifyX platform**

---

## 🚀 **ARCHITECTURE & SERVICES**

### **1. Show All Running Services**
```bash
ps aux | grep -E "(node|npm)" | grep -v grep
```
**Expected Output:**
```
USER    PID  %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
user   1234  2.1  1.5 1234567 89012 ?       Sl   12:00   0:05 node simple-api-server.js
user   1235  3.2  2.1 1345678 90123 ?       Sl   12:00   0:08 npm start (frontend-full)
user   1236  1.8  1.2 1123456 78901 ?       Sl   12:01   0:03 node simple-server.js (secrets-manager)
user   1237  2.5  1.8 1234567 89012 ?       Sl   12:01   0:06 node src/simple-server.ts (security-dashboard)
```

### **2. Show Port Usage**
```bash
lsof -i :3000,:3001,:3003,:3004
```
**Expected Output:**
```
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node     1234 user   23u  IPv4  12345      0t0  TCP *:3001 (LISTEN)
node     1235 user   24u  IPv4  12346      0t0  TCP *:3000 (LISTEN)
node     1236 user   25u  IPv4  12347      0t0  TCP *:3003 (LISTEN)
node     1237 user   26u  IPv4  12348      0t0  TCP *:3004 (LISTEN)
```

### **3. Service Directory Structure**
```bash
ls -la services/
```
**Expected Output:**
```
total 64
drwxr-xr-x  10 user  staff   320 Oct 22 12:00 .
drwxr-xr-x  15 user  staff   480 Oct 22 12:00 ..
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 analytics-service
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 competition-service
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 feedback-service
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 gamification-service
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 secrets-manager
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 security-dashboard
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 submission-service
drwxr-xr-x   8 user  staff   256 Oct 22 12:00 user-service
```

### **4. Project File Count**
```bash
find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | wc -l
```
**Expected Output:**
```
     847
```

---

## 🔒 **SECURITY METRICS**

### **1. Security Dashboard Health Check**
```bash
curl -s http://localhost:3004/health | jq .
```
**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:47:47.341Z",
  "service": "security-dashboard",
  "version": "1.0.0"
}
```

### **2. Security Metrics (Main Screenshot)**
```bash
curl -s http://localhost:3004/dashboard/metrics | jq .
```
**Expected Output:**
```json
{
  "securityScore": 85,
  "vulnerabilities": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "threatLevel": "medium",
  "complianceScore": 92,
  "lastUpdated": "2025-10-22T12:47:56.886Z"
}
```

### **3. Vulnerability Details**
```bash
curl -s http://localhost:3004/dashboard/vulnerabilities | jq .
```
**Expected Output:**
```json
{
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "severity": "high",
      "title": "SQL Injection vulnerability in user service",
      "status": "open",
      "discoveredAt": "2025-10-20T10:00:00Z"
    },
    {
      "id": "vuln-002",
      "severity": "medium",
      "title": "Outdated dependency in secrets manager",
      "status": "in_progress",
      "discoveredAt": "2025-10-19T15:30:00Z"
    }
  ]
}
```

### **4. Security KPIs**
```bash
curl -s http://localhost:3004/dashboard/kpis | jq .
```
**Expected Output:**
```json
{
  "kpis": [
    {
      "name": "Security Score",
      "value": 85,
      "target": 90,
      "trend": "up",
      "category": "security"
    },
    {
      "name": "Vulnerability Response Time",
      "value": 2.5,
      "target": 2.0,
      "trend": "down",
      "category": "response"
    }
  ]
}
```

---

## 🔐 **SECRETS MANAGEMENT**

### **1. Secrets Manager Health**
```bash
curl -s http://localhost:3003/health | jq .
```
**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:49:06.580Z",
  "service": "secrets-manager",
  "version": "1.0.0"
}
```

### **2. Rotation Schedule (Main Screenshot)**
```bash
curl -s http://localhost:3003/rotation/schedule | jq .
```
**Expected Output:**
```json
{
  "schedules": [
    {
      "id": "rotation-001",
      "secretPath": "database/credentials",
      "frequency": "30d",
      "nextRotation": "2025-11-20T00:00:00Z",
      "status": "active"
    },
    {
      "id": "rotation-002",
      "secretPath": "api/keys",
      "frequency": "90d",
      "nextRotation": "2025-12-15T00:00:00Z",
      "status": "active"
    }
  ]
}
```

---

## 📊 **API SERVER METRICS**

### **1. Main API Health**
```bash
curl -s http://localhost:3001/health | jq .
```
**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:50:15.123Z",
  "service": "GamifyX API",
  "uptime": "2h 15m 30s",
  "version": "1.0.0"
}
```

### **2. Leaderboard Data**
```bash
curl -s http://localhost:3001/api/leaderboard | jq .
```
**Expected Output:**
```json
[
  {
    "rank": 1,
    "name": "Carol Davis",
    "points": 2194,
    "change": "+50"
  },
  {
    "rank": 2,
    "name": "Alice Johnson",
    "points": 1721,
    "change": "+25"
  },
  {
    "rank": 3,
    "name": "Bob Smith",
    "points": 1013,
    "change": "-10"
  }
]
```

---

## 🎯 **PERFORMANCE METRICS**

### **1. Response Time Test**
```bash
time curl -s http://localhost:3000 > /dev/null
```
**Expected Output:**
```
real    0m0.156s
user    0m0.008s
sys     0m0.012s
```

### **2. All Services Status Check**
```bash
echo "=== GamifyX Services Health Check ===" && \
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend (3000): Running" || echo "❌ Frontend (3000): Down" && \
curl -s http://localhost:3001/health > /dev/null && echo "✅ API Server (3001): Running" || echo "❌ API Server (3001): Down" && \
curl -s http://localhost:3003/health > /dev/null && echo "✅ Secrets Manager (3003): Running" || echo "❌ Secrets Manager (3003): Down" && \
curl -s http://localhost:3004/health > /dev/null && echo "✅ Security Dashboard (3004): Running" || echo "❌ Security Dashboard (3004): Down"
```
**Expected Output:**
```
=== GamifyX Services Health Check ===
✅ Frontend (3000): Running
✅ API Server (3001): Running
✅ Secrets Manager (3003): Running
✅ Security Dashboard (3004): Running
```

---

## 📈 **DEVELOPMENT METRICS**

### **1. Code Statistics**
```bash
echo "=== GamifyX Code Statistics ===" && \
echo "JavaScript/TypeScript files: $(find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | wc -l | tr -d ' ')" && \
echo "Total lines of code: $(find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -exec wc -l {} + | tail -1 | awk '{print $1}')" && \
echo "Services count: $(ls services/ | wc -l | tr -d ' ')" && \
echo "Documentation files: $(find . -name "*.md" | wc -l | tr -d ' ')"
```
**Expected Output:**
```
=== GamifyX Code Statistics ===
JavaScript/TypeScript files: 847
Total lines of code: 25,432
Services count: 8
Documentation files: 23
```

### **2. Git Repository Stats**
```bash
echo "=== Repository Statistics ===" && \
echo "Total commits: $(git rev-list --all --count)" && \
echo "Contributors: $(git log --format='%aN' | sort -u | wc -l | tr -d ' ')" && \
echo "Last commit: $(git log -1 --format='%cr')" && \
echo "Repository size: $(du -sh .git | cut -f1)"
```
**Expected Output:**
```
=== Repository Statistics ===
Total commits: 47
Contributors: 1
Last commit: 2 hours ago
Repository size: 15M
```

---

## 🔧 **DOCKER & INFRASTRUCTURE**

### **1. Docker Containers (if using Docker)**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
**Expected Output:**
```
NAMES                    STATUS              PORTS
gamifyx-frontend         Up 2 hours          0.0.0.0:3000->3000/tcp
gamifyx-api             Up 2 hours          0.0.0.0:3001->3001/tcp
gamifyx-security        Up 2 hours          0.0.0.0:3004->3004/tcp
gamifyx-secrets         Up 2 hours          0.0.0.0:3003->3003/tcp
```

### **2. System Resource Usage**
```bash
echo "=== System Resources ===" && \
echo "CPU Usage: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')" && \
echo "Memory Usage: $(top -l 1 | grep "PhysMem" | awk '{print $2}')" && \
echo "Disk Usage: $(df -h . | tail -1 | awk '{print $5}')"
```
**Expected Output:**
```
=== System Resources ===
CPU Usage: 15.2%
Memory Usage: 8.2G
Disk Usage: 45%
```

---

## 📱 **QUICK DEMO COMMANDS**

### **1. One-Line Service Status**
```bash
curl -s http://localhost:3004/dashboard/metrics | jq -r '"Security Score: " + (.securityScore|tostring) + "/100, Threats: " + .threatLevel + ", Compliance: " + (.complianceScore|tostring) + "%"'
```
**Expected Output:**
```
Security Score: 85/100, Threats: medium, Compliance: 92%
```

### **2. Quick Architecture Overview**
```bash
echo "🚀 GamifyX Architecture:" && \
echo "Frontend: http://localhost:3000" && \
echo "API Server: http://localhost:3001" && \
echo "Secrets Manager: http://localhost:3003" && \
echo "Security Dashboard: http://localhost:3004" && \
echo "Services: $(ls services/ | wc -l | tr -d ' ') microservices" && \
echo "Files: $(find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | wc -l | tr -d ' ') code files"
```
**Expected Output:**
```
🚀 GamifyX Architecture:
Frontend: http://localhost:3000
API Server: http://localhost:3001
Secrets Manager: http://localhost:3003
Security Dashboard: http://localhost:3004
Services: 8 microservices
Files: 847 code files
```

---

## 🎯 **SCREENSHOT TIPS**

### **Terminal Setup for Best Screenshots:**
1. **Use a dark theme** (better contrast)
2. **Increase font size** (14-16pt for readability)
3. **Use a monospace font** (Fira Code, JetBrains Mono)
4. **Clear terminal** before running commands (`clear`)
5. **Use `jq` for JSON formatting** (`brew install jq`)

### **Command Sequence for Architecture Screenshot:**
```bash
clear
echo "=== GamifyX Platform Architecture ==="
ps aux | grep -E "(node|npm)" | grep -v grep | head -4
echo ""
echo "=== Active Services ==="
lsof -i :3000,:3001,:3003,:3004
echo ""
echo "=== Service Directory ==="
ls -la services/
```

### **Command Sequence for Security Screenshot:**
```bash
clear
echo "=== GamifyX Security Dashboard ==="
curl -s http://localhost:3004/dashboard/metrics | jq .
echo ""
echo "=== Secrets Management ==="
curl -s http://localhost:3003/rotation/schedule | jq .
```

---

**📸 Ready to capture professional terminal screenshots that showcase your enterprise-grade GamifyX platform!**