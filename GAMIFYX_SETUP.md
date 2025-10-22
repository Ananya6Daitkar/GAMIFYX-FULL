# GamifyX AIOps Learning Platform - Complete Setup Guide

## 🚀 Overview

The GamifyX AIOps Learning Platform is a comprehensive, full-stack gamified DevOps education system that combines artificial intelligence, real-time observability, and competitive learning elements. This enhanced setup includes all services needed for a complete production-ready deployment.

## 🏗️ Architecture Overview

### Frontend Layer
- **GamifyX Cyberpunk Dashboard**: React.js with TypeScript, Material-UI, and cyberpunk theming
- **Real-time Updates**: WebSocket integration for live data streaming
- **3D Effects**: Three.js integration for immersive visualizations

### Backend Services
- **API Gateway**: Central routing and authentication hub
- **User Service**: Authentication, profiles, and user management
- **Submission Service**: Code submission processing and GitHub integration
- **Gamification Service**: Points, badges, leaderboards, and achievements
- **Analytics Service**: Performance prediction and risk scoring
- **AI Feedback Service**: Python FastAPI with ML models for code analysis
- **Feedback Service**: Feedback aggregation and rating system
- **Integration Service**: Service orchestration and workflow management

### Security Layer
- **Secrets Manager**: HashiCorp Vault integration for secure credential storage
- **Security Dashboard**: Vulnerability scanning and threat monitoring
- **IAM System**: Multi-factor authentication and role-based access control

### Observability Stack
- **OpenTelemetry Collector**: Distributed tracing and metrics collection
- **Prometheus**: Metrics storage and alerting
- **Grafana**: Visualization and dashboards
- **Jaeger**: Distributed tracing visualization
- **Loki**: Log aggregation
- **Tempo**: Trace storage
- **InfluxDB**: Time-series data storage

### Data Layer
- **PostgreSQL**: Primary database for application data
- **Redis**: Caching and session management
- **InfluxDB**: Time-series metrics storage

## 🛠️ Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 18 or higher (for local development)
- **Python**: Version 3.9 or higher (for AI services)
- **Git**: Latest version

### System Requirements
- **RAM**: Minimum 8GB, Recommended 16GB
- **CPU**: Minimum 4 cores, Recommended 8 cores
- **Storage**: Minimum 20GB free space
- **Network**: Internet connection for image downloads

## 🚀 Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd gamifyx-aiops-platform

# Make startup script executable
chmod +x start-gamifyx-development.sh

# Start the complete platform
./start-gamifyx-development.sh start
```

### 2. Access the Platform
After startup (approximately 2-3 minutes), access:

- **🎮 GamifyX Dashboard**: http://localhost:8080
- **🔗 API Gateway**: http://localhost:3000
- **📊 Grafana**: http://localhost:3000 (admin/admin)
- **🔍 Jaeger Tracing**: http://localhost:16686
- **📈 Prometheus**: http://localhost:9090

## 📋 Detailed Setup Instructions

### Environment Configuration

1. **Copy Environment Template**:
```bash
cp .env.example .env
```

2. **Configure Environment Variables**:
Edit `.env` file with your specific configuration:
```bash
# Database Configuration
POSTGRES_DB=aiops_learning_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# External API Keys (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
OPENAI_API_KEY=your-openai-api-key
```

### Service-by-Service Startup

If you prefer to start services individually:

1. **Infrastructure Services**:
```bash
docker-compose up -d postgres redis vault prometheus grafana jaeger loki tempo influxdb
```

2. **Core Application Services**:
```bash
docker-compose up -d user-service secrets-manager security-dashboard
```

3. **Gamification and Analytics**:
```bash
docker-compose up -d gamification-service analytics-service ai-feedback-service feedback-service
```

4. **Integration and Gateway**:
```bash
docker-compose up -d integration-service api-gateway
```

5. **Frontend**:
```bash
docker-compose up -d frontend
```

## 🔧 Development Workflow

### Local Development Setup

1. **Frontend Development**:
```bash
cd frontend
npm install
npm run dev
```

2. **Backend Service Development**:
```bash
cd services/[service-name]
npm install
npm run dev
```

3. **AI Service Development**:
```bash
cd services/ai-feedback-service
pip install -r requirements.txt
python main.py
```

### Hot Reloading
All services support hot reloading in development mode. Changes to source code will automatically restart the services.

### Testing
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📊 Monitoring and Observability

### Grafana Dashboards
Pre-configured dashboards available at http://localhost:3000:
- **Executive Overview**: High-level KPIs and system health
- **GamifyX Metrics**: Gamification and engagement analytics
- **System Health**: Infrastructure and service monitoring
- **AI Insights**: ML model performance and predictions

### Distributed Tracing
View request flows and performance bottlenecks at http://localhost:16686

### Metrics and Alerts
Prometheus metrics available at http://localhost:9090 with pre-configured alerting rules

## 🔐 Security Configuration

### Secrets Management
HashiCorp Vault is configured for secure credential storage:
- **Vault UI**: http://localhost:8200
- **Dev Token**: `dev-token` (development only)

### Authentication
JWT-based authentication with refresh token support:
- **Token Expiry**: 15 minutes (configurable)
- **Refresh Token Expiry**: 7 days (configurable)

### Multi-Factor Authentication
MFA support for teacher and administrator accounts (configurable)

## 🎮 GamifyX Features

### Real-time Dashboard
- **Live Metrics**: System health, performance, and user activity
- **Leaderboards**: Real-time ranking updates with animations
- **Achievement System**: Badge unlocking with celebration effects
- **AI Predictions**: Incident forecasting and performance insights

### Cyberpunk Theme
- **Neon Colors**: Cyan, magenta, and green color scheme
- **Animations**: Smooth transitions and particle effects
- **3D Elements**: Three.js integration for immersive experience

### Gamification Elements
- **Points System**: Configurable scoring for various activities
- **Badge System**: Achievement tracking with rarity levels
- **Streaks**: Consecutive activity tracking
- **Team Competition**: Collaborative and competitive elements

## 🛠️ Troubleshooting

### Common Issues

1. **Services Not Starting**:
```bash
# Check Docker status
docker info

# Check service logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

2. **Database Connection Issues**:
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

3. **Frontend Not Loading**:
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Performance Optimization

1. **Memory Usage**:
- Increase Docker memory allocation to 8GB+
- Monitor service memory usage with `docker stats`

2. **Network Performance**:
- Use Docker network for service communication
- Configure proper DNS resolution

3. **Database Performance**:
- Tune PostgreSQL configuration for your workload
- Monitor query performance with pg_stat_statements

## 📚 API Documentation

### REST API Endpoints
Complete API documentation available at: http://localhost:3000/api

### WebSocket Events
Real-time events for dashboard updates:
- `system:health:update` - System health changes
- `metrics:update` - Performance metrics updates
- `achievement:unlocked` - New achievement notifications
- `incident:prediction` - AI-predicted incidents

## 🔄 Maintenance

### Regular Tasks

1. **Update Dependencies**:
```bash
# Update Docker images
docker-compose pull

# Update Node.js dependencies
npm update

# Update Python dependencies
pip install -r requirements.txt --upgrade
```

2. **Database Maintenance**:
```bash
# Backup database
docker exec aiops-postgres pg_dump -U postgres aiops_learning_platform > backup.sql

# Restore database
docker exec -i aiops-postgres psql -U postgres aiops_learning_platform < backup.sql
```

3. **Log Rotation**:
```bash
# Clean old logs
docker system prune -f

# Rotate application logs
find logs/ -name "*.log" -mtime +7 -delete
```

## 🚀 Production Deployment

### Environment Preparation
1. Update environment variables for production
2. Configure SSL certificates
3. Set up proper DNS and load balancing
4. Configure backup and monitoring

### Security Hardening
1. Change default passwords
2. Configure firewall rules
3. Enable audit logging
4. Set up intrusion detection

### Scaling Considerations
1. Use Kubernetes for container orchestration
2. Configure horizontal pod autoscaling
3. Set up database clustering
4. Implement CDN for static assets

## 📞 Support

### Getting Help
- **Documentation**: Check this README and inline code comments
- **Logs**: Use `docker-compose logs [service]` for debugging
- **Health Checks**: Visit `/health` endpoints for service status

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**🎮 Welcome to GamifyX - Where DevOps Meets Gaming! 🚀**