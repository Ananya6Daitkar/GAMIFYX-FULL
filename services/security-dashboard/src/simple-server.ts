import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Root route with dashboard interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>GamifyX Security Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric { display: inline-block; margin: 10px 20px 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #3498db; }
            .metric-label { font-size: 14px; color: #7f8c8d; }
            .status-good { color: #27ae60; }
            .status-warning { color: #f39c12; }
            .status-critical { color: #e74c3c; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #3498db; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🛡️ GamifyX Security Dashboard</h1>
            <p>Comprehensive security monitoring and compliance management</p>
        </div>
        
        <div class="nav">
            <a href="/dashboard/metrics">📊 Security Metrics</a>
            <a href="/dashboard/vulnerabilities">🔍 Vulnerabilities</a>
            <a href="/dashboard/kpis">📈 KPIs</a>
            <a href="/health">❤️ Health Check</a>
        </div>
        
        <div class="card">
            <h2>Security Overview</h2>
            <div class="metric">
                <div class="metric-value status-good">85/100</div>
                <div class="metric-label">Security Score</div>
            </div>
            <div class="metric">
                <div class="metric-value status-warning">27</div>
                <div class="metric-label">Total Vulnerabilities</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">92%</div>
                <div class="metric-label">Compliance Score</div>
            </div>
            <div class="metric">
                <div class="metric-value status-warning">Medium</div>
                <div class="metric-label">Threat Level</div>
            </div>
        </div>
        
        <div class="card">
            <h2>Vulnerability Breakdown</h2>
            <div class="metric">
                <div class="metric-value status-critical">2</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric">
                <div class="metric-value status-warning">5</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric">
                <div class="metric-value status-warning">12</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">8</div>
                <div class="metric-label">Low</div>
            </div>
        </div>
        
        <div class="card">
            <h2>Service Status</h2>
            <p>✅ Security Dashboard: <span class="status-good">Running</span></p>
            <p>✅ Vulnerability Scanner: <span class="status-good">Active</span></p>
            <p>✅ Threat Intelligence: <span class="status-good">Connected</span></p>
            <p>✅ Compliance Monitor: <span class="status-good">Monitoring</span></p>
        </div>
    </body>
    </html>
  `);
});

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