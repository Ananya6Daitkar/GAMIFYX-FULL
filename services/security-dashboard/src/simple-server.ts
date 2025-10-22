import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'security-dashboard',
    version: '1.0.0'
  });
});

// Mock security dashboard endpoints
app.get('/dashboard/metrics', (req, res) => {
  res.json({
    securityScore: 85,
    vulnerabilities: {
      critical: 2,
      high: 5,
      medium: 12,
      low: 8
    },
    threatLevel: 'medium',
    complianceScore: 92,
    lastUpdated: new Date().toISOString()
  });
});

app.get('/dashboard/kpis', (req, res) => {
  res.json({
    kpis: [
      {
        name: 'Security Score',
        value: 85,
        target: 90,
        trend: 'up',
        category: 'security'
      },
      {
        name: 'Vulnerability Response Time',
        value: 2.5,
        target: 2.0,
        trend: 'down',
        category: 'response'
      }
    ]
  });
});

app.get('/dashboard/vulnerabilities', (req, res) => {
  res.json({
    vulnerabilities: [
      {
        id: 'vuln-001',
        severity: 'high',
        title: 'SQL Injection vulnerability in user service',
        status: 'open',
        discoveredAt: '2025-10-20T10:00:00Z'
      },
      {
        id: 'vuln-002',
        severity: 'medium',
        title: 'Outdated dependency in secrets manager',
        status: 'in_progress',
        discoveredAt: '2025-10-19T15:30:00Z'
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🛡️  Security Dashboard running on port ${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/dashboard/metrics`);
  console.log(`📈 KPIs: http://localhost:${PORT}/dashboard/kpis`);
  console.log(`🔍 Vulnerabilities: http://localhost:${PORT}/dashboard/vulnerabilities`);
});