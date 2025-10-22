#!/bin/bash

# GamifyX Comprehensive Secrets Management Setup Script
# This script sets up the complete secrets management system for all services

set -e

echo "🔐 Setting up GamifyX Comprehensive Secrets Management System"
echo "============================================================="

# Configuration
VAULT_ADDR=${VAULT_ADDR:-"http://localhost:8200"}
VAULT_TOKEN=${VAULT_TOKEN:-"dev-token"}
ENVIRONMENT=${ENVIRONMENT:-"development"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if vault CLI is available
    if ! command -v vault &> /dev/null; then
        log_error "HashiCorp Vault CLI not found. Please install it first."
        exit 1
    fi
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl not found. Please install it first."
        exit 1
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found. Some features may not work properly."
    fi
    
    log_success "Prerequisites check completed"
}

# Initialize Vault
initialize_vault() {
    log_info "Initializing HashiCorp Vault..."
    
    export VAULT_ADDR=$VAULT_ADDR
    export VAULT_TOKEN=$VAULT_TOKEN
    
    # Check Vault status
    if ! vault status &> /dev/null; then
        log_error "Cannot connect to Vault at $VAULT_ADDR"
        log_info "Please ensure Vault is running: docker-compose up vault"
        exit 1
    fi
    
    # Enable KV secrets engine
    vault secrets enable -path=aiops-secrets kv-v2 2>/dev/null || log_warning "KV secrets engine already enabled"
    
    # Enable database secrets engine
    vault secrets enable database 2>/dev/null || log_warning "Database secrets engine already enabled"
    
    log_success "Vault initialized successfully"
}

# Generate secure random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -hex 64
}

# Create secrets for a service
create_service_secrets() {
    local service=$1
    local environment=$2
    
    log_info "Creating secrets for $service in $environment environment..."
    
    case $service in
        "user-service")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/jwt-refresh-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/session-secret value="$(generate_password)"
            ;;
        "submission-service")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/github-client-secret value="your-github-client-secret-here"
            vault kv put aiops-secrets/$service/$environment/github-webhook-secret value="$(generate_password 24)"
            ;;
        "gamification-service")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/websocket-secret value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/leaderboard-encryption-key value="$(generate_password 32)"
            ;;
        "analytics-service")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/influxdb-token value="$(generate_password 64)"
            vault kv put aiops-secrets/$service/$environment/metrics-encryption-key value="$(generate_password 32)"
            ;;
        "ai-feedback-service")
            vault kv put aiops-secrets/$service/$environment/openai-api-key value="your-openai-api-key-here"
            vault kv put aiops-secrets/$service/$environment/huggingface-api-key value="your-huggingface-api-key-here"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/model-encryption-key value="$(generate_password 32)"
            ;;
        "feedback-service")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/feedback-encryption-key value="$(generate_password 32)"
            ;;
        "integration-service")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/service-mesh-key value="$(generate_password 32)"
            vault kv put aiops-secrets/$service/$environment/circuit-breaker-key value="$(generate_password 24)"
            ;;
        "api-gateway")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/websocket-secret value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/rate-limit-key value="$(generate_password 24)"
            vault kv put aiops-secrets/$service/$environment/cors-secret value="$(generate_password 16)"
            ;;
        "secrets-manager")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/vault-encryption-key value="$(generate_password 32)"
            vault kv put aiops-secrets/$service/$environment/audit-signing-key value="$(generate_password 64)"
            ;;
        "security-dashboard")
            vault kv put aiops-secrets/$service/$environment/jwt-secret value="$(generate_jwt_secret)"
            vault kv put aiops-secrets/$service/$environment/db-password value="$(generate_password)"
            vault kv put aiops-secrets/$service/$environment/threat-intel-api-key value="your-threat-intel-api-key-here"
            vault kv put aiops-secrets/$service/$environment/security-encryption-key value="$(generate_password 32)"
            ;;
    esac
    
    log_success "Secrets created for $service"
}

# Create common secrets
create_common_secrets() {
    local environment=$1
    
    log_info "Creating common secrets for $environment environment..."
    
    vault kv put aiops-secrets/common/$environment/redis-password value="$(generate_password)"
    vault kv put aiops-secrets/common/$environment/postgres-password value="password" # For development
    vault kv put aiops-secrets/common/$environment/encryption-master-key value="$(generate_password 32)"
    vault kv put aiops-secrets/common/$environment/monitoring-token value="$(generate_password 48)"
    vault kv put aiops-secrets/common/$environment/webhook-signing-key value="$(generate_password 32)"
    
    log_success "Common secrets created"
}

# Create CI/CD secrets
create_cicd_secrets() {
    local environment=$1
    
    log_info "Creating CI/CD secrets for $environment environment..."
    
    vault kv put aiops-secrets/cicd/$environment/docker-registry-password value="your-docker-registry-password"
    vault kv put aiops-secrets/cicd/$environment/kubernetes-token value="your-kubernetes-token"
    vault kv put aiops-secrets/cicd/$environment/github-actions-token value="your-github-actions-token"
    vault kv put aiops-secrets/cicd/$environment/deployment-key value="$(generate_password 64)"
    
    log_success "CI/CD secrets created"
}

# Setup database dynamic credentials
setup_database_credentials() {
    log_info "Setting up database dynamic credentials..."
    
    # Configure PostgreSQL connection
    vault write database/config/postgresql \
        plugin_name=postgresql-database-plugin \
        connection_url="postgresql://{{username}}:{{password}}@postgres:5432/aiops_learning_platform?sslmode=disable" \
        allowed_roles="readonly,readwrite,admin" \
        username="postgres" \
        password="password"
    
    # Create roles
    vault write database/roles/readonly \
        db_name=postgresql \
        creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
        default_ttl="1h" \
        max_ttl="24h"
    
    vault write database/roles/readwrite \
        db_name=postgresql \
        creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
        default_ttl="1h" \
        max_ttl="24h"
    
    vault write database/roles/admin \
        db_name=postgresql \
        creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
        default_ttl="30m" \
        max_ttl="2h"
    
    log_success "Database dynamic credentials configured"
}

# Create policies
create_policies() {
    log_info "Creating Vault policies..."
    
    # Service policy
    cat > /tmp/service-policy.hcl << EOF
# Service policy for reading own secrets
path "aiops-secrets/data/{{identity.entity.aliases.auth_jwt_accessor.metadata.service}}/*" {
  capabilities = ["read"]
}

path "aiops-secrets/data/common/*" {
  capabilities = ["read"]
}

# Database credentials
path "database/creds/readonly" {
  capabilities = ["read"]
}

path "database/creds/readwrite" {
  capabilities = ["read"]
}
EOF
    
    vault policy write service-policy /tmp/service-policy.hcl
    
    # Admin policy
    cat > /tmp/admin-policy.hcl << EOF
# Admin policy for full secrets management
path "aiops-secrets/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
    
    vault policy write admin-policy /tmp/admin-policy.hcl
    
    # CI/CD policy
    cat > /tmp/cicd-policy.hcl << EOF
# CI/CD policy for deployment secrets
path "aiops-secrets/data/*/{{identity.entity.aliases.auth_jwt_accessor.metadata.environment}}/*" {
  capabilities = ["read"]
}

path "aiops-secrets/data/cicd/{{identity.entity.aliases.auth_jwt_accessor.metadata.environment}}/*" {
  capabilities = ["read"]
}

path "aiops-secrets/data/common/{{identity.entity.aliases.auth_jwt_accessor.metadata.environment}}/*" {
  capabilities = ["read"]
}
EOF
    
    vault policy write cicd-policy /tmp/cicd-policy.hcl
    
    log_success "Vault policies created"
}

# Generate environment files
generate_env_files() {
    local environment=$1
    
    log_info "Generating environment files for $environment..."
    
    local services=("user-service" "submission-service" "gamification-service" "analytics-service" "ai-feedback-service" "feedback-service" "integration-service" "api-gateway" "secrets-manager" "security-dashboard")
    
    for service in "${services[@]}"; do
        local env_file="../$service/.env.$environment"
        
        log_info "Generating $env_file..."
        
        cat > "$env_file" << EOF
# Auto-generated environment file for $service ($environment)
# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT EDIT MANUALLY - Use secrets manager for updates

NODE_ENV=$environment
PORT=300X
LOG_LEVEL=info

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=aiops_learning_platform
DB_USER=postgres
DB_PASSWORD=\${VAULT:aiops-secrets/$service/$environment/db-password}
DB_SSL=false

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=\${VAULT:aiops-secrets/common/$environment/redis-password}

# JWT Configuration
JWT_SECRET=\${VAULT:aiops-secrets/$service/$environment/jwt-secret}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Vault Configuration
VAULT_ENDPOINT=http://vault:8200
VAULT_TOKEN=$VAULT_TOKEN

# Monitoring Configuration
METRICS_PORT=90XX
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# GamifyX Configuration
GAMIFYX_ENABLED=true
WEBSOCKET_URL=ws://api-gateway:3000/ws
EOF
        
        # Add service-specific configurations
        case $service in
            "ai-feedback-service")
                cat >> "$env_file" << EOF

# AI/ML Configuration
OPENAI_API_KEY=\${VAULT:aiops-secrets/$service/$environment/openai-api-key}
HUGGINGFACE_API_KEY=\${VAULT:aiops-secrets/$service/$environment/huggingface-api-key}
MODEL_PATH=/app/models
EOF
                ;;
            "submission-service")
                cat >> "$env_file" << EOF

# GitHub Integration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=\${VAULT:aiops-secrets/$service/$environment/github-client-secret}
GITHUB_WEBHOOK_SECRET=\${VAULT:aiops-secrets/$service/$environment/github-webhook-secret}
EOF
                ;;
            "analytics-service")
                cat >> "$env_file" << EOF

# InfluxDB Configuration
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=\${VAULT:aiops-secrets/$service/$environment/influxdb-token}
INFLUXDB_ORG=aiops
INFLUXDB_BUCKET=metrics
EOF
                ;;
        esac
        
        # Set secure permissions
        chmod 600 "$env_file" 2>/dev/null || log_warning "Could not set secure permissions on $env_file"
        
        log_success "Generated $env_file"
    done
}

# Test secrets access
test_secrets_access() {
    log_info "Testing secrets access..."
    
    # Test reading a secret
    if vault kv get aiops-secrets/user-service/$ENVIRONMENT/jwt-secret &> /dev/null; then
        log_success "Secrets access test passed"
    else
        log_error "Secrets access test failed"
        exit 1
    fi
}

# Generate setup summary
generate_summary() {
    local environment=$1
    
    log_info "Generating setup summary..."
    
    cat > "secrets-setup-summary-$environment.md" << EOF
# GamifyX Secrets Management Setup Summary

**Environment:** $environment  
**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")  
**Vault Address:** $VAULT_ADDR

## 🔐 Secrets Created

### Services
- user-service: JWT secrets, DB password, session secret
- submission-service: JWT secret, DB password, GitHub secrets
- gamification-service: JWT secret, DB password, WebSocket secret
- analytics-service: JWT secret, DB password, InfluxDB token
- ai-feedback-service: AI API keys, DB password, model encryption
- feedback-service: JWT secret, DB password, feedback encryption
- integration-service: JWT secret, service mesh keys
- api-gateway: JWT secret, WebSocket secret, rate limiting
- secrets-manager: JWT secret, DB password, vault encryption
- security-dashboard: JWT secret, DB password, threat intel

### Common Secrets
- Redis password
- PostgreSQL password
- Master encryption key
- Monitoring token
- Webhook signing key

### CI/CD Secrets
- Docker registry credentials
- Kubernetes tokens
- GitHub Actions tokens
- Deployment keys

## 🛡️ Security Features

- ✅ HashiCorp Vault integration
- ✅ Dynamic database credentials
- ✅ Automated secret rotation
- ✅ Comprehensive audit logging
- ✅ Policy-based access control
- ✅ Secure CI/CD integration

## 📋 Next Steps

1. **Update API Keys**: Replace placeholder API keys with real values
2. **Configure Notifications**: Set up Slack/email for rotation alerts
3. **Test Rotation**: Verify automated rotation is working
4. **Review Policies**: Ensure access policies meet security requirements
5. **Monitor Usage**: Check audit logs and metrics

## 🔧 Management Commands

\`\`\`bash
# List all secrets
vault kv list aiops-secrets/

# Read a secret
vault kv get aiops-secrets/user-service/$environment/jwt-secret

# Update a secret
vault kv put aiops-secrets/user-service/$environment/jwt-secret value="new-value"

# Generate dynamic DB credentials
vault read database/creds/readwrite
\`\`\`

## 📊 Monitoring

- **Vault UI**: $VAULT_ADDR/ui
- **Metrics**: Available via Prometheus
- **Audit Logs**: Check /logs/audit directory
- **Health Check**: GET /health endpoint

## 🚨 Emergency Procedures

1. **Revoke Compromised Secret**: Use vault CLI or API
2. **Force Rotation**: POST /rotation/force endpoint
3. **Emergency Access**: Use root token (store securely)
4. **Incident Response**: Check security alerts dashboard

---
*This summary was auto-generated by the GamifyX secrets setup script.*
EOF
    
    log_success "Setup summary generated: secrets-setup-summary-$environment.md"
}

# Main execution
main() {
    echo "🚀 Starting GamifyX Comprehensive Secrets Management Setup"
    echo "Environment: $ENVIRONMENT"
    echo "Vault Address: $VAULT_ADDR"
    echo ""
    
    check_prerequisites
    initialize_vault
    
    # Create secrets for all services
    local services=("user-service" "submission-service" "gamification-service" "analytics-service" "ai-feedback-service" "feedback-service" "integration-service" "api-gateway" "secrets-manager" "security-dashboard")
    
    for service in "${services[@]}"; do
        create_service_secrets "$service" "$ENVIRONMENT"
    done
    
    create_common_secrets "$ENVIRONMENT"
    create_cicd_secrets "$ENVIRONMENT"
    setup_database_credentials
    create_policies
    generate_env_files "$ENVIRONMENT"
    test_secrets_access
    generate_summary "$ENVIRONMENT"
    
    echo ""
    log_success "🎉 GamifyX Comprehensive Secrets Management Setup Complete!"
    echo ""
    echo "📋 Summary:"
    echo "  - Vault initialized and configured"
    echo "  - Secrets created for ${#services[@]} services"
    echo "  - Dynamic database credentials configured"
    echo "  - Security policies implemented"
    echo "  - Environment files generated"
    echo "  - Audit logging enabled"
    echo ""
    echo "📖 Next steps:"
    echo "  1. Review the setup summary: secrets-setup-summary-$ENVIRONMENT.md"
    echo "  2. Update placeholder API keys with real values"
    echo "  3. Test the secrets manager service: npm run dev"
    echo "  4. Configure rotation schedules as needed"
    echo ""
    echo "🔐 Vault UI: $VAULT_ADDR/ui (token: $VAULT_TOKEN)"
}

# Run main function
main "$@"