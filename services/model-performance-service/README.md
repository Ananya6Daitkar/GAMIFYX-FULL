# Model Performance Service

The Model Performance Service provides comprehensive AI model performance tracking, metrics collection, and validation capabilities within the GamifyX platform. It enables systematic monitoring of model accuracy, precision, recall, F-scores, and other performance indicators to ensure AI solutions meet quality standards.

## Features

### AI Model Management
- **Model Registry**: Catalog and manage AI models with version control
- **Model Types**: Support for LLM, SLM, ML, Computer Vision, and NLP models
- **Framework Integration**: Track models from various frameworks (Hugging Face, TensorFlow, PyTorch)
- **Lifecycle Management**: Track model status (Active, Deprecated, Testing)

### Performance Metrics Collection
- **Classification Metrics**: Accuracy, precision, recall, F1-score, specificity
- **Regression Metrics**: MSE, RMSE, MAE, R-squared
- **Resource Metrics**: Inference time, memory usage, training duration
- **Validation Methods**: Support for various validation methodologies

### Performance Analysis
- **Trend Analysis**: Track performance metrics over time
- **Benchmark Comparison**: Compare against predefined performance benchmarks
- **Statistical Analysis**: Calculate statistical summaries and trends
- **Performance Reports**: Generate comprehensive model performance reports

### Key Capabilities
- **Metrics Calculation**: Built-in utilities for calculating classification and regression metrics
- **Validation Methodologies**: Support for K-fold, holdout, bootstrap, and time series validation
- **Performance Benchmarks**: Predefined benchmarks for different model types and tasks
- **Alert System**: Performance degradation detection and alerting
- **Audit Logging**: Complete audit trail for all performance measurements

## API Endpoints

### AI Models
- `POST /api/v1/models` - Create new AI model
- `GET /api/v1/models` - List all models (with filtering)
- `GET /api/v1/models/:id` - Get specific model
- `PUT /api/v1/models/:id` - Update model
- `DELETE /api/v1/models/:id` - Delete model
- `GET /api/v1/models/type/:type` - Get models by type
- `GET /api/v1/models/status/active` - Get active models
- `GET /api/v1/models/:id/performance-report` - Get model performance report
- `GET /api/v1/models/:id/performance-summary` - Get model performance summary

### Model Metrics
- `POST /api/v1/metrics` - Record new model metrics
- `GET /api/v1/metrics` - List all metrics (with filtering)
- `GET /api/v1/metrics/:id` - Get specific metrics
- `GET /api/v1/metrics/model/:modelId` - Get metrics for specific model
- `GET /api/v1/metrics/model/:modelId/latest` - Get latest metrics for model
- `GET /api/v1/metrics/model/:modelId/trend` - Get metrics trend
- `POST /api/v1/metrics/calculate/classification` - Calculate classification metrics
- `POST /api/v1/metrics/calculate/regression` - Calculate regression metrics
- `GET /api/v1/metrics/validation-methods` - Get supported validation methods

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
- `PORT` - Service port (default: 3010)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (default: info)
- `ALLOWED_ORIGINS` - CORS allowed origins

### Monitoring
- `METRICS_PORT` - Prometheus metrics port (default: 9465)
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
docker build -t model-performance-service .

# Run with docker-compose
docker-compose up model-performance-service
```

## Database Schema

The service uses PostgreSQL with the following main tables:
- `ai_models` - AI model registry
- `model_metrics` - Performance metrics storage
- `performance_benchmarks` - Benchmark definitions
- `performance_alerts` - Performance alerts
- `validation_methodologies` - Validation method definitions
- `model_performance_trends` - Performance trend analysis
- `model_performance_audit_log` - Audit trail

## Supported Model Types

- **LLM** - Large Language Models
- **SLM** - Small Language Models  
- **ML** - Traditional Machine Learning Models
- **Computer Vision** - Image and video processing models
- **NLP** - Natural Language Processing models

## Validation Methods

- K-Fold Cross Validation
- Stratified K-Fold
- Hold-Out Validation
- Time Series Split
- Bootstrap Validation
- Leave-One-Out
- Monte Carlo Cross Validation

## Performance Benchmarks

The service includes predefined benchmarks for:
- Binary Classification (85% accuracy target)
- Multi-class Classification (80% accuracy target)
- Text Classification (85% accuracy target)
- Sentiment Analysis (88% accuracy target)
- Image Classification (90% accuracy target)
- Object Detection (75% accuracy target)

## Metrics Calculation

### Classification Metrics
- **Accuracy**: (TP + TN) / (TP + TN + FP + FN)
- **Precision**: TP / (TP + FP)
- **Recall**: TP / (TP + FN)
- **F1-Score**: 2 * (Precision * Recall) / (Precision + Recall)
- **Specificity**: TN / (TN + FP)

### Regression Metrics
- **MSE**: Mean Squared Error
- **RMSE**: Root Mean Squared Error
- **MAE**: Mean Absolute Error
- **R²**: Coefficient of Determination

## Integration

The Model Performance Service integrates with:
- **AI Registry Service**: Model metadata and provenance
- **API Gateway**: Routing and authentication
- **Integration Service**: Cross-service orchestration
- **Monitoring Stack**: Prometheus, Jaeger, Grafana
- **Database**: Shared PostgreSQL instance

## Security

- Input validation using Joi schemas
- Rate limiting and CORS protection
- Audit logging for all operations
- Health check endpoints for monitoring
- Secure database connections

## Free & Open Source Focus

The service is designed to work exclusively with:
- **Free AI Frameworks**: Hugging Face, TensorFlow, PyTorch
- **Open Source Models**: Models with permissive licenses
- **Free Validation Tools**: Built-in metrics calculation utilities
- **No Premium Dependencies**: All dependencies are free and open source

## Contributing

1. Follow the existing code structure and patterns
2. Add appropriate tests for new features
3. Update API documentation for new endpoints
4. Ensure all metrics calculations are mathematically correct
5. Follow the established logging and error handling patterns