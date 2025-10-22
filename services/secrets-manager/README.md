# Secrets Manager Service

A comprehensive secrets management service for the AIOps Learning Platform, built with HashiCorp Vault Community Edition and automated rotation capabilities.

## Features

### 🔐 Secure Secret Storage
- **HashiCorp Vault Integration**: Uses Vault Community Edition for enterprise-grade secret storage
- **Multiple Secret Types**: Support for database passwords, API keys, JWT secrets, encryption keys, certificates, and more
- **Encryption at Rest**: All secrets encrypted using Vault's built-in encryption
- **Access Control**: Fine-grained permissions with audit logging

### 🔄 Automated Rotation
- **Configurable Intervals**: Rotate secrets every 1-365 days based on type and policy
- **Multiple Strategies**: Support for regeneration, database rotation, API refresh, and certificate renewal
- **Failure Handling**: Automatic retry with exponential backoff
- **Notifications**: Slack and email notifications for rotation events

### 🚀 CI/CD Integration
- **Platform Support**: GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, Travis CI
- **Secure Injection**: No hardcoded secrets in configuration files
- **Template Generation**: Automatic generation of platform-specific configurations
- **Usage Tracking**: Monitor which secrets are used by which pipelines

### 📊 Comprehensive Auditing
- **Access Logging**: Every secret access attempt logged with user attribution
- **Usage Analytics**: Track secret usage patterns and active connections
- **Security Alerts**: Anomaly detection for unusual access patterns
- **Compliance Reports**: Generate reports for security audits

### 🔍 Monitoring & Observability
- **OpenTelemetry Integration**: Metrics, traces, and logs
- **Prometheus Metrics**: Custom metrics for secret operations
- **Health Checks**: Kubernetes-ready health and readiness endpoints
- **Performance Monitoring**: Track rotation times and success rates

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- HashiCorp Vault (Community Edition)
- Docker (optional)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd services/secrets-manager
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start HashiCorp Vault (development mode)**
   ```bash
   npm run vault:dev
   ```

4. **Set up database and initialize Vault**
   ```bash
   npm run setup
   ```

5. **Start the service**
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3003`

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3003
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aiops_secrets
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# Vault Configuration
VAULT_ENDPOINT=http://localhost:8200
VAULT_TOKEN=dev-token
VAULT_NAMESPACE=
VAULT_API_VERSION=v1
VAULT_TIMEOUT=30000
VAULT_RETRIES=3

# Authentication
JWT_SECRET=your-jwt-secret-key

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Monitoring
METRICS_PORT=9090
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

## API Documentation

### Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Secret Management

#### Create Secret
```http
POST /secrets
Content-Type: application/json

{
  "name": "database-password",
  "path": "database/production/main",
  "type": "database_password",
  "value": "super-secure-password",
  "metadata": {
    "description": "Main database password",
    "owner": "admin@company.com",
    "environment": "production",
    "service": "user-service",
    "tags": ["database", "critical"],
    "sensitive": true
  },
  "rotationConfig": {
    "enabled": true,
    "intervalDays": 90,
    "strategy": "database_rotate",
    "notifyBefore": 7,
    "maxRetries": 3,
    "backoffMultiplier": 2
  }
}
```

#### Get Secret
```http
GET /secrets/database/production/main?includeValue=true
```

#### Update Secret
```http
PUT /secrets/database/production/main
Content-Type: application/json

{
  "value": "new-secure-password",
  "metadata": {
    "description": "Updated database password"
  }
}
```

#### Delete Secret
```http
DELETE /secrets/database/production/main
```

#### List Secrets
```http
GET /secrets?prefix=database/production
```

### Rotation Management

#### Get Rotation Schedule
```http
GET /rotation/schedule
```

#### Force Rotation
```http
POST /rotation/force
Content-Type: application/json

{
  "secretPath": "database/production/main",
  "reason": "Security incident response"
}
```

#### Get Rotation Jobs
```http
GET /rotation/jobs?secretPath=database/production/main
```

### CI/CD Integration

#### Get Secrets for Pipeline
```http
POST /cicd/secrets
Content-Type: application/json

{
  "pipelineId": "github-actions-123",
  "environment": "production",
  "service": "user-service",
  "platform": "github-actions"
}
```

#### Generate GitHub Actions Config
```http
POST /cicd/github-actions
Content-Type: application/json

{
  "repository": "aiops-platform/user-service",
  "environment": "production",
  "service": "user-service"
}
```

## Secret Types and Validation

### Supported Secret Types
- `database_password`: Database credentials with complexity requirements
- `api_key`: API keys with format validation
- `jwt_secret`: JWT signing keys with minimum length requirements
- `encryption_key`: Encryption keys in hex or base64 format
- `certificate`: X.509 certificates in PEM format
- `ssh_key`: SSH private keys in PEM format
- `oauth_token`: OAuth access tokens
- `webhook_secret`: Webhook signing secrets

### Rotation Strategies
- `regenerate`: Generate new random value
- `database_rotate`: Rotate database password with coordination
- `api_refresh`: Refresh API token with provider
- `certificate_renew`: Renew certificate with CA

## Monitoring and Alerting

### Prometheus Metrics
- `vault_operations_total`: Total Vault operations by type
- `secret_access_total`: Total secret access attempts
- `rotation_jobs_total`: Total rotation jobs executed
- `cicd_secret_requests_total`: Total CI/CD secret requests

### Health Endpoints
- `GET /health`: Overall service health
- `GET /health/ready`: Readiness check for Kubernetes
- `GET /health/live`: Liveness check for Kubernetes

### Security Alerts
The service automatically detects and alerts on:
- High failure rates for secret access
- Off-hours access patterns
- New users accessing sensitive secrets
- Unusual access volumes

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

### Database Migrations
```bash
npm run migrate
```

### Vault Initialization
```bash
npm run vault:init
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3003
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secrets-manager
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secrets-manager
  template:
    metadata:
      labels:
        app: secrets-manager
    spec:
      containers:
      - name: secrets-manager
        image: secrets-manager:latest
        ports:
        - containerPort: 3003
        env:
        - name: VAULT_ENDPOINT
          value: "http://vault:8200"
        - name: DB_HOST
          value: "postgres"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3003
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3003
```

## Security Considerations

### Production Checklist
- [ ] Change default Vault token
- [ ] Enable Vault audit logging
- [ ] Configure TLS for all connections
- [ ] Set up proper network security groups
- [ ] Enable database encryption at rest
- [ ] Configure backup and disaster recovery
- [ ] Set up monitoring and alerting
- [ ] Review and test incident response procedures

### Best Practices
- Use least privilege access principles
- Rotate secrets regularly (90 days maximum)
- Monitor all secret access attempts
- Use strong authentication (MFA recommended)
- Keep audit logs for compliance
- Test disaster recovery procedures
- Regular security assessments

## Troubleshooting

### Common Issues

1. **Vault Connection Failed**
   - Check Vault is running: `vault status`
   - Verify VAULT_ENDPOINT and VAULT_TOKEN
   - Check network connectivity

2. **Database Connection Failed**
   - Verify database is running
   - Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
   - Run migration: `npm run migrate`

3. **Secret Access Denied**
   - Check JWT token validity
   - Verify user permissions
   - Review audit logs for details

4. **Rotation Failed**
   - Check secret rotation configuration
   - Verify external service connectivity
   - Review rotation job logs

### Logs and Debugging
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Vault audit logs: Check Vault configuration
- Database logs: Check PostgreSQL logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue in the repository
- Contact the security team for urgent issues
- Check the documentation wiki for additional resources