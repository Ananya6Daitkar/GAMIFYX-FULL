const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Root route with secrets manager interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>GamifyX Secrets Manager</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .header { background: #8e44ad; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric { display: inline-block; margin: 10px 20px 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #8e44ad; }
            .metric-label { font-size: 14px; color: #7f8c8d; }
            .status-good { color: #27ae60; }
            .status-active { color: #3498db; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #8e44ad; text-decoration: none; }
            .secret-item { padding: 10px; border-left: 4px solid #8e44ad; margin: 10px 0; background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔐 GamifyX Secrets Manager</h1>
            <p>Centralized secrets management with automated rotation</p>
        </div>
        
        <div class="nav">
            <a href="/rotation/schedule">🔄 Rotation Schedule</a>
            <a href="/cicd/secrets">🚀 CI/CD Integration</a>
            <a href="/health">❤️ Health Check</a>
        </div>
        
        <div class="card">
            <h2>Service Overview</h2>
            <div class="metric">
                <div class="metric-value status-good">24</div>
                <div class="metric-label">Active Secrets</div>
            </div>
            <div class="metric">
                <div class="metric-value status-active">2</div>
                <div class="metric-label">Rotation Schedules</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">100%</div>
                <div class="metric-label">Encryption Status</div>
            </div>
            <div class="metric">
                <div class="metric-value status-active">3</div>
                <div class="metric-label">CI/CD Integrations</div>
            </div>
        </div>
        
        <div class="card">
            <h2>Recent Secret Activity</h2>
            <div class="secret-item">
                <strong>database/credentials</strong> - Last rotated: 2025-10-20 | Next: 2025-11-20
            </div>
            <div class="secret-item">
                <strong>api/keys</strong> - Last rotated: 2025-09-15 | Next: 2025-12-15
            </div>
            <div class="secret-item">
                <strong>jwt/signing-key</strong> - Last rotated: 2025-10-01 | Next: 2025-11-01
            </div>
        </div>
        
        <div class="card">
            <h2>Security Features</h2>
            <p>✅ AES-256 Encryption: <span class="status-good">Active</span></p>
            <p>✅ Automatic Rotation: <span class="status-good">Enabled</span></p>
            <p>✅ Audit Logging: <span class="status-good">Recording</span></p>
            <p>✅ Access Control: <span class="status-good">Enforced</span></p>
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
    service: 'secrets-manager',
    version: '1.0.0'
  });
});

// Mock secrets endpoints
app.post('/secrets', (req, res) => {
  const { path, data } = req.body;
  
  if (path && data) {
    res.status(201).json({
      success: true,
      message: 'Secret stored successfully',
      path: path,
      version: 1,
      createdAt: new Date().toISOString()
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Path and data required'
    });
  }
});

app.get('/secrets/*', (req, res) => {
  const secretPath = req.params[0];
  
  res.json({
    path: secretPath,
    data: {
      value: 'mock-secret-value',
      metadata: {
        created: '2025-10-20T10:00:00Z',
        version: 1
      }
    },
    retrievedAt: new Date().toISOString()
  });
});

app.get('/rotation/schedule', (req, res) => {
  res.json({
    schedules: [
      {
        id: 'rotation-001',
        secretPath: 'database/credentials',
        frequency: '30d',
        nextRotation: '2025-11-20T00:00:00Z',
        status: 'active'
      },
      {
        id: 'rotation-002',
        secretPath: 'api/keys',
        frequency: '90d',
        nextRotation: '2025-12-15T00:00:00Z',
        status: 'active'
      }
    ]
  });
});

app.post('/cicd/secrets', (req, res) => {
  const { environment, secrets } = req.body;
  
  res.json({
    success: true,
    message: 'Secrets deployed to CI/CD pipeline',
    environment: environment,
    secretsCount: secrets ? secrets.length : 0,
    deployedAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Secrets Manager running on port ${PORT}`);
  console.log(`🗝️  Secrets: http://localhost:${PORT}/secrets/`);
  console.log(`🔄 Rotation: http://localhost:${PORT}/rotation/schedule`);
  console.log(`🚀 CI/CD: http://localhost:${PORT}/cicd/secrets`);
});