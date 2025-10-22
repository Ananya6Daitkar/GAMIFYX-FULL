const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

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