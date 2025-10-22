# AIOps Learning Platform

A comprehensive, gamified DevOps education system that combines artificial intelligence, observability, and competitive learning elements to create an engaging and data-driven educational experience.

## 🏗️ Architecture Overview

The AIOps Learning Platform is built as a microservices architecture with the following components:

### Core Services
- **API Gateway** (Port 3000) - Central entry point and request routing
- **User Service** (Port 3001) - Authentication, user management, and IAM
- **Secrets Manager** (Port 3003) - Secure secrets management with automated rotation
- **Security Dashboard** (Port 3004) - Comprehensive security monitoring and reporting

### Infrastructure
- **PostgreSQL** (Port 5432) - Primary database
- **Redis** (Port 6379) - Caching and session management
- **HashiCorp Vault** (Port 8200) - Secrets storage and management

### Monitoring Stack
- **Prometheus** (Port 9090) - Metrics collection
- **Grafana** (Port 3000) - Visualization and dashboards
- **Jaeger** (Port 16686) - Distributed tracing

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- At least 4GB RAM available for containers
- Ports 3000-3004, 5432, 6379, 8200, 9090, 16686 available

### Option 1: One-Command Startup (Recommended)
```bash
./start-aiops-platform.sh
```

### Option 2: Manual Docker Compose
```bash
# Start all services
docker-compose up --build -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📊 Service URLs

Once the platform is running, you can access:

### API Endpoints
- **API Gateway**: http://localhost:3000/api
- **User Service**: http://localhost:3001/health
- **Secrets Manager**: http://localhost:3003/health
- **Security Dashboard**: http://localhost:3004/health

### Monitoring & Tools
- **Grafana Dashboard**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger Tracing**: http://localhost:16686
- **Vault UI**: http://localhost:8200 (token: dev-token)

### Databases
- **PostgreSQL**: localhost:5432 (postgres/password)
- **Redis**: localhost:6379

## 🔧 API Usage Examples

### Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePassword123!"
  }'
```

### Secrets Management
```bash
# Create a secret (requires authentication)
curl -X POST http://localhost:3000/api/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
    }
  }'

# Get a secret
curl -X GET "http://localhost:3000/api/secrets/database/production/main?includeValue=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Security Dashboard
```bash
# Get security metrics
curl -X GET http://localhost:3000/api/security/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get security KPIs
curl -X GET http://localhost:3000/api/security/kpis \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Trigger vulnerability scan
curl -X POST http://localhost:3000/api/security/vulnerabilities/scan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "repository",
    "target": "https://github.com/example/repo",
    "branch": "main"
  }'
```

## 🛡️ Security Features

### Multi-Factor Authentication (MFA)
- TOTP-based MFA for teachers and administrators
- QR code generation for authenticator apps
- Backup codes for account recovery
- Mandatory MFA enforcement

### Secrets Management
- HashiCorp Vault integration
- Automated secret rotation (90-day default)
- CI/CD pipeline integration
- Comprehensive audit logging
- No plaintext credentials in configuration

### Security Dashboard
- Real-time vulnerability monitoring
- Threat intelligence integration
- Compliance tracking (NIST 800-53, CIS Controls, GDPR, SOX)
- Security KPI monitoring
- Executive-level reporting

### Identity and Access Management
- Role-based access control (RBAC)
- Least privilege principles
- Automated permission auditing
- AWS IAM Policy Simulator integration
- Quarterly access reviews

## 📈 Monitoring and Observability

### Metrics Collection
- OpenTelemetry instrumentation
- Prometheus metrics export
- Custom business metrics
- Performance monitoring

### Distributed Tracing
- Jaeger integration
- Request flow visualization
- Performance bottleneck identification
- Error tracking

### Logging
- Structured JSON logging
- Correlation ID tracking
- Centralized log aggregation
- Security event logging

## 🔧 Development

### Service Development
Each service can be developed independently:

```bash
# User Service
cd services/user-service
npm install
npm run dev

# Secrets Manager
cd services/secrets-manager
npm install
npm run dev

# Security Dashboard
cd services/security-dashboard
npm install
npm run dev
```

### Database Migrations
```bash
# Run migrations for all services
docker-compose exec user-service npm run migrate
docker-compose exec secrets-manager npm run migrate
docker-compose exec security-dashboard npm run migrate
```

### Testing
```bash
# Run tests for a specific service
cd services/user-service
npm test

# Run all tests
docker-compose exec user-service npm test
docker-compose exec secrets-manager npm test
docker-compose exec security-dashboard npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **Services not starting**
   - Check if all required ports are available
   - Ensure Docker has sufficient memory allocated
   - Check service logs: `docker-compose logs <service-name>`

2. **Database connection errors**
   - Wait for PostgreSQL to be fully initialized
   - Check database credentials in environment variables
   - Verify network connectivity between services

3. **Vault initialization fails**
   - Ensure Vault is running and accessible
   - Check Vault token configuration
   - Verify network connectivity to Vault

4. **Authentication issues**
   - Check JWT secret configuration
   - Verify user exists in database
   - Check token expiration

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service

# Last 100 lines
docker-compose logs --tail=100 secrets-manager
```

### Health Checks
```bash
# Check all service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# Check database connectivity
docker-compose exec postgres pg_isready -U postgres

# Check Redis
docker-compose exec redis redis-cli ping
```

## 📚 Documentation

### API Documentation
- Visit http://localhost:3000/api for API overview
- Each service exposes its own API documentation at `/health` endpoints
- Swagger/OpenAPI documentation available at service endpoints

### Architecture Documentation
- [User Service Documentation](services/user-service/README.md)
- [Secrets Manager Documentation](services/secrets-manager/README.md)
- [Security Dashboard Documentation](services/security-dashboard/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review service-specific documentation
- Contact the development team

---

**Built with ❤️ for DevOps Education**# GAMIFYX-FULL
