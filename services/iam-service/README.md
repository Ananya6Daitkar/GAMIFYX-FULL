# GamifyX IAM Service

## Overview

The GamifyX Identity and Access Management (IAM) Service provides comprehensive authentication, authorization, and access control for the GamifyX AIOps Learning Platform. It implements enterprise-grade security features including multi-factor authentication, role-based access control, automated permission auditing, and AWS IAM Policy Simulator integration.

## Features

### 🔐 Advanced Authentication
- **Multi-Factor Authentication (MFA)**: TOTP, SMS, Email, Hardware tokens, Biometric
- **Password Policies**: Configurable complexity, expiration, and history
- **Account Lockout**: Brute force protection with configurable thresholds
- **Session Management**: Secure token-based sessions with refresh capabilities

### 🛡️ Sophisticated Authorization
- **Role-Based Access Control (RBAC)**: Hierarchical roles with inheritance
- **Fine-Grained Permissions**: Resource and action-based permissions
- **Policy Engine**: Advanced policy evaluation with conditions
- **Context-Aware Access**: IP, time, device, and location-based controls

### 👥 Role Management
- **Hierarchical Roles**: Parent-child role relationships with inheritance
- **Role Templates**: Predefined role patterns for common use cases
- **Dynamic Role Assignment**: Conditional and time-based role assignments
- **Role Conflict Detection**: Automatic detection of conflicting roles

### 🔍 Automated Auditing
- **Permission Auditing**: Comprehensive access reviews and compliance checks
- **Risk Assessment**: ML-powered risk scoring for users and permissions
- **Compliance Reporting**: SOX, PCI DSS, GDPR, HIPAA, ISO 27001 compliance
- **Automated Recommendations**: AI-generated security improvement suggestions

### ☁️ AWS Integration
- **IAM Policy Simulator**: Test and validate AWS IAM policies
- **Policy Optimization**: Generate optimized policies based on usage patterns
- **CloudTrail Analysis**: Analyze actual API usage for permission optimization
- **Cross-Account Access**: Secure cross-account role assumption

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GamifyX IAM Service                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Authentication  │  │ Authorization   │  │ Role Management │ │
│  │                 │  │                 │  │                 │ │
│  │ • MFA Support   │  │ • RBAC Engine   │  │ • Hierarchical  │ │
│  │ • Session Mgmt  │  │ • Policy Engine │  │ • Templates     │ │
│  │ • Password      │  │ • Fine-grained  │  │ • Conflict      │ │
│  │   Policies      │  │   Permissions   │  │   Detection     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Permission      │  │ AWS Policy      │  │ Audit &         │ │
│  │ Manager         │  │ Simulator       │  │ Compliance      │ │
│  │                 │  │                 │  │                 │ │
│  │ • Context-aware │  │ • Policy Test   │  │ • Access Reviews│ │
│  │ • Conditions    │  │ • Optimization  │  │ • Risk Scoring  │ │
│  │ • Inheritance   │  │ • CloudTrail    │  │ • Compliance    │ │
│  │ • Caching       │  │   Analysis      │  │   Reporting     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    External Integrations                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Database        │  │ Cache           │  │ External APIs   │ │
│  │                 │  │                 │  │                 │ │
│  │ • MySQL/        │  │ • Redis         │  │ • SMS Service   │ │
│  │   PostgreSQL    │  │ • Session Store │  │ • Email Service │ │
│  │ • Audit Logs    │  │ • Permission    │  │ • AWS IAM       │ │
│  │ • Compliance    │  │   Cache         │  │ • Biometric     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/gamifyx/platform.git
cd platform/services/iam-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start the service
npm run dev
```

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gamifyx_iam
DB_USER=iam_user
DB_PASSWORD=secure_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# MFA Configuration
MFA_ISSUER=GamifyX
MFA_WINDOW=2
TOTP_SECRET_LENGTH=32

# AWS Configuration (for Policy Simulator)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# External Services
SMS_SERVICE_API_KEY=your_sms_api_key
EMAIL_SERVICE_API_KEY=your_email_api_key
BIOMETRIC_SERVICE_URL=https://biometric.service.url

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
```

## API Reference

### Authentication Endpoints

#### POST /auth/login
Authenticate user with credentials and optional MFA.

```typescript
// Request
{
  "username": "john.doe",
  "password": "securePassword123",
  "mfaToken": "123456", // Optional
  "deviceId": "device_123" // Optional
}

// Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "username": "john.doe",
    "email": "john@example.com",
    "roles": ["student", "beta_tester"]
  },
  "expiresAt": "2024-10-22T10:30:00Z"
}
```

#### POST /auth/mfa/setup
Set up multi-factor authentication for a user.

```typescript
// Request
{
  "method": "totp", // totp, sms, email, hardware_token, biometric
  "phoneNumber": "+1234567890" // Required for SMS
}

// Response
{
  "success": true,
  "method": "totp",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "backupCodes": ["12345678", "87654321", ...],
  "instructions": "Scan the QR code with your authenticator app..."
}
```

### Authorization Endpoints

#### POST /auth/authorize
Check if user is authorized for specific resource and action.

```typescript
// Request
{
  "resource": "user.profile",
  "action": "update",
  "context": {
    "userId": "user_456",
    "ipAddress": "192.168.1.100"
  }
}

// Response
{
  "authorized": true,
  "permissions": ["user.profile.update"],
  "context": {
    "conditions": ["same_user_or_admin"],
    "expiresAt": "2024-10-22T11:00:00Z"
  }
}
```

### Role Management Endpoints

#### POST /roles
Create a new role.

```typescript
// Request
{
  "name": "course_instructor",
  "displayName": "Course Instructor",
  "description": "Can manage courses and view student progress",
  "parentRoleId": "role_teacher",
  "permissions": ["course.create", "course.update", "student.progress.read"]
}

// Response
{
  "id": "role_123",
  "name": "course_instructor",
  "displayName": "Course Instructor",
  "description": "Can manage courses and view student progress",
  "level": 2,
  "parentRoleId": "role_teacher",
  "permissions": ["course.create", "course.update", "student.progress.read"],
  "effectivePermissions": ["course.create", "course.update", "student.progress.read", "course.read"],
  "createdAt": "2024-10-21T10:00:00Z"
}
```

#### POST /users/{userId}/roles
Assign role to user.

```typescript
// Request
{
  "roleId": "role_123",
  "expiresAt": "2024-12-31T23:59:59Z", // Optional
  "conditions": {
    "department": "engineering"
  }
}

// Response
{
  "success": true,
  "assignment": {
    "id": "assignment_456",
    "userId": "user_123",
    "roleId": "role_123",
    "assignedAt": "2024-10-21T10:00:00Z",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

### Audit Endpoints

#### POST /audit/access-review
Perform comprehensive access audit.

```typescript
// Request
{
  "scope": {
    "departments": ["engineering", "product"],
    "includeInactive": false
  }
}

// Response
{
  "id": "audit_789",
  "type": "comprehensive_access_audit",
  "startTime": "2024-10-21T10:00:00Z",
  "endTime": "2024-10-21T10:15:00Z",
  "duration": 900000,
  "summary": {
    "totalUsers": 150,
    "activeUsers": 142,
    "privilegedUsers": 12,
    "orphanedAccounts": 3,
    "excessivePermissions": 8,
    "complianceScore": 87.5
  },
  "findings": [
    {
      "type": "excessive_permissions",
      "severity": "high",
      "userId": "user_456",
      "description": "User has administrative permissions not required for role",
      "recommendation": "Review and reduce permissions to match job requirements"
    }
  ],
  "recommendations": [
    {
      "type": "permission_reduction",
      "priority": "high",
      "title": "Reduce Excessive Permissions",
      "description": "8 users have excessive permissions that should be reviewed",
      "timeline": "2-4 weeks"
    }
  ]
}
```

### AWS Policy Simulator Endpoints

#### POST /aws/simulate-policy
Simulate AWS IAM policy for specific actions and resources.

```typescript
// Request
{
  "principalArn": "arn:aws:iam::123456789012:user/john.doe",
  "actionNames": ["s3:GetObject", "s3:PutObject"],
  "resourceArns": ["arn:aws:s3:::my-bucket/*"],
  "context": {
    "aws:SourceIp": "192.168.1.100",
    "aws:CurrentTime": "2024-10-21T10:00:00Z"
  }
}

// Response
{
  "simulationId": "sim_abc123",
  "timestamp": "2024-10-21T10:00:00Z",
  "duration": 1250,
  "evaluationResults": [
    {
      "evalActionName": "s3:GetObject",
      "evalResourceName": "arn:aws:s3:::my-bucket/file.txt",
      "evalDecision": "allowed",
      "matchedStatements": [
        {
          "sourcePolicyId": "policy_123",
          "sourcePolicyType": "IAM Policy"
        }
      ]
    }
  ],
  "summary": {
    "totalEvaluations": 2,
    "allowedActions": 2,
    "deniedActions": 0,
    "policyEffectiveness": 100
  }
}
```

## Configuration

### IAM Configuration

```typescript
// config/iam.config.ts
export const iamConfig: IAMConfig = {
  authentication: {
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90, // days
      preventReuse: 12 // last N passwords
    },
    lockoutPolicy: {
      maxAttempts: 5,
      lockoutDuration: 900, // 15 minutes
      resetOnSuccess: true
    },
    sessionTimeout: 3600 // 1 hour
  },
  
  authorization: {
    defaultDeny: true,
    cachePermissions: true,
    cacheTTL: 300 // 5 minutes
  },
  
  roles: {
    maxRolesPerUser: 10,
    allowRoleHierarchy: true,
    maxHierarchyDepth: 5
  },
  
  mfa: {
    enforceForAll: false,
    enforceForPrivileged: true,
    allowedMethods: [
      MFAMethod.TOTP,
      MFAMethod.SMS,
      MFAMethod.EMAIL
    ],
    totpWindow: 2,
    challengeExpiry: 300000, // 5 minutes
    maxAttempts: 3,
    lockoutDuration: 900, // 15 minutes
    backupCodesCount: 10
  },
  
  audit: {
    enabled: true,
    logLevel: 'detailed',
    retentionDays: 2555, // 7 years
    frameworks: ['SOX', 'PCI_DSS', 'GDPR', 'HIPAA', 'ISO_27001'],
    orphanedAccountThresholdDays: 90,
    excessivePermissionThreshold: 50,
    trackPermissionUsage: true
  }
};
```

### Database Schema

The IAM service uses the following database tables:

- `users` - User accounts and profile information
- `roles` - Role definitions and hierarchy
- `permissions` - Permission definitions
- `role_assignments` - User-role assignments
- `role_permissions` - Role-permission mappings
- `user_permissions` - Direct user-permission assignments
- `sessions` - Active user sessions
- `mfa_secrets` - MFA secrets and backup codes
- `audit_logs` - Comprehensive audit trail
- `access_reviews` - Periodic access review records
- `policy_simulations` - AWS policy simulation results

## Security Features

### Password Security
- **Bcrypt Hashing**: Industry-standard password hashing with configurable rounds
- **Password Policies**: Enforced complexity, expiration, and history requirements
- **Breach Detection**: Integration with HaveIBeenPwned API for compromised password detection

### Session Security
- **JWT Tokens**: Secure, stateless authentication tokens with configurable expiration
- **Refresh Tokens**: Long-lived tokens for seamless session renewal
- **Session Invalidation**: Immediate session termination on security events
- **Concurrent Session Limits**: Configurable limits on simultaneous sessions

### Multi-Factor Authentication
- **TOTP Support**: Time-based one-time passwords compatible with Google Authenticator, Authy
- **SMS/Email Codes**: Delivery via configurable SMS and email providers
- **Hardware Tokens**: Support for FIDO2/WebAuthn hardware security keys
- **Biometric Authentication**: Integration with biometric authentication services
- **Backup Codes**: Secure backup codes for account recovery

### Access Control
- **Zero Trust Model**: Default deny with explicit allow policies
- **Context-Aware Access**: IP, location, time, and device-based access controls
- **Dynamic Permissions**: Runtime permission evaluation with conditions
- **Audit Trail**: Comprehensive logging of all access decisions and changes

## Compliance & Auditing

### Supported Frameworks
- **SOX (Sarbanes-Oxley)**: Financial controls and segregation of duties
- **PCI DSS**: Payment card industry data security standards
- **GDPR**: General Data Protection Regulation compliance
- **HIPAA**: Health Insurance Portability and Accountability Act
- **ISO 27001**: Information security management systems

### Audit Features
- **Automated Access Reviews**: Scheduled reviews of user permissions and roles
- **Risk Scoring**: ML-powered risk assessment for users and permissions
- **Compliance Dashboards**: Real-time compliance status and gap analysis
- **Remediation Workflows**: Automated remediation suggestions and tracking

### Reporting
- **Executive Reports**: High-level compliance and security posture summaries
- **Detailed Audit Reports**: Comprehensive access analysis and findings
- **Compliance Reports**: Framework-specific compliance status and evidence
- **Risk Reports**: Risk assessment and mitigation recommendations

## Monitoring & Observability

### Metrics
- Authentication success/failure rates
- Authorization decision latencies
- MFA adoption and success rates
- Session creation and expiration patterns
- Permission usage analytics
- Audit finding trends

### Logging
- Structured JSON logging with correlation IDs
- Comprehensive audit trail for all security events
- Integration with centralized logging systems
- Configurable log levels and retention policies

### Alerting
- Failed authentication attempts above threshold
- Privilege escalation attempts
- Unusual access patterns
- Compliance violations
- System health and performance issues

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=auth
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npx tsc --noEmit
```

### Database Migrations

```bash
# Run pending migrations
npm run migrate

# Create new migration
npx ts-node src/database/migrations/create-migration.ts --name add_new_table

# Rollback last migration
npx ts-node src/database/migrations/rollback.ts
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY config ./config

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iam-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: iam-service
  template:
    metadata:
      labels:
        app: iam-service
    spec:
      containers:
      - name: iam-service
        image: gamifyx/iam-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: iam-secrets
              key: db-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- 📧 Email: security@gamifyx.com
- 💬 Slack: #iam-support
- 🐛 Issues: [GitHub Issues](https://github.com/gamifyx/platform/issues)
- 📖 Documentation: [Wiki](https://github.com/gamifyx/platform/wiki/iam-service)