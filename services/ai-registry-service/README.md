# AI Registry Service

The AI Registry Service is a comprehensive catalog and provenance tracking system for AI technologies and training datasets within the GamifyX platform. It provides systematic documentation, validation, and management of AI resources with a focus on free and open-source solutions.

## Features

### AI Technology Management
- **Technology Catalog**: Register and manage AI technologies (LLM, SLM, ML, Computer Vision, NLP)
- **License Validation**: Enforce open-source license compliance (MIT, Apache 2.0, GPL, etc.)
- **Provider Tracking**: Track technology providers and sources
- **Version Management**: Maintain version history and deployment tracking
- **Status Management**: Track technology lifecycle (Active, Deprecated, Testing)

### Dataset Provenance Tracking
- **Dataset Registry**: Catalog training datasets from various sources
- **Source Validation**: Support for Hugging Face, Kaggle, GitHub, Academic, and Public Domain sources
- **License Verification**: Validate dataset licenses for compliance
- **Quality Scoring**: Track dataset quality metrics and verification status
- **Relationship Mapping**: Link datasets to AI technologies with usage types

### Key Capabilities
- **Audit Logging**: Complete audit trail for all changes
- **RESTful API**: Comprehensive REST API for all operations
- **Filtering & Search**: Advanced filtering and pagination support
- **Health Monitoring**: Built-in health checks and monitoring
- **Docker Support**: Containerized deployment ready

## API Endpoints

### AI Technologies
- `POST /api/v1/technologies` - Register new AI technology
- `GET /api/v1/technologies` - List all technologies (with filtering)
- `GET /api/v1/technologies/:id` - Get specific technology
- `PUT /api/v1/technologies/:id` - Update technology
- `DELETE /api/v1/technologies/:id` - Delete technology
- `GET /api/v1/technologies/type/:type` - Get technologies by type
- `GET /api/v1/technologies/provider/:provider` - Get technologies by provider
- `GET /api/v1/technologies/status/active` - Get active technologies

### Training Datasets
- `POST /api/v1/datasets` - Register new dataset
- `GET /api/v1/datasets` - List all datasets (with filtering)
- `GET /api/v1/datasets/:id` - Get specific dataset
- `PUT /api/v1/datasets/:id` - Update dataset
- `DELETE /api/v1/datasets/:id` - Delete dataset
- `POST /api/v1/datasets/:id/verify` - Verify dataset
- `GET /api/v1/datasets/source/:source` - Get datasets by source
- `GET /api/v1/datasets/status/verified` - Get verified datasets
- `GET /api/v1/datasets/domain/:domain` - Get datasets by domain

### Technology-Dataset Relations
- `POST /api/v1/relations` - Create technology-dataset relationship
- `GET /api/v1/relations` - Get all relationships
- `GET /api/v1/relations/technology/:id` - Get relationships by technology
- `GET /api/v1/relations/dataset/:id` - Get relationships by dataset
- `GET /api/v1/relations/provenance/:id` - Get dataset provenance for technology
- `GET /api/v1/relations/usage/:id` - Get technology usage for dataset
- `DELETE /api/v1/relations/:id` - Delete relationship

### Health & Monitoring
- `GET /health` - Service health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Environment Variables

### Database Configuration
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: aiops_learning)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: password)

### Service Configuration
- `PORT` - Service port (default: 3009)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (default: info)
- `ALLOWED_ORIGINS` - CORS allowed origins

### Monitoring
- `METRICS_PORT` - Prometheus metrics port (default: 9464)
- `JAEGER_ENDPOINT` - Jaeger tracing endpoint

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Docker Development
```bash
# Build the image
docker build -t ai-registry-service .

# Run with docker-compose
docker-compose up ai-registry-service
```

## Database Schema

The service uses PostgreSQL with the following main tables:
- `ai_technologies` - AI technology catalog
- `training_datasets` - Training dataset registry
- `technology_datasets` - Technology-dataset relationships
- `ai_registry_audit_log` - Audit trail

## Supported License Types

### Open Source Licenses
- MIT
- Apache 2.0
- GPL-2.0, GPL-3.0
- LGPL-2.1, LGPL-3.0
- BSD-2-Clause, BSD-3-Clause
- ISC
- MPL-2.0
- CC0-1.0, CC-BY-4.0, CC-BY-SA-4.0
- Unlicense

## Integration

The AI Registry Service integrates with:
- **API Gateway**: Routing and authentication
- **Integration Service**: Cross-service orchestration
- **Monitoring Stack**: Prometheus, Jaeger, Grafana
- **Database**: Shared PostgreSQL instance

## Security

- Input validation using Joi schemas
- Rate limiting and CORS protection
- Audit logging for all operations
- License compliance validation
- Health check endpoints for monitoring

## Contributing

1. Follow the existing code structure and patterns
2. Add appropriate tests for new features
3. Update API documentation for new endpoints
4. Ensure license compliance for any new dependencies
5. Follow the established logging and error handling patterns