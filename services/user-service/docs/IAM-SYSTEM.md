# IAM System Documentation

## Overview

The AIOps Learning Platform implements a comprehensive Identity and Access Management (IAM) system with multi-factor authentication (MFA) and least privilege access control. This system ensures secure access to resources while maintaining compliance with security best practices.

## Features

### 1. Multi-Factor Authentication (MFA)

#### Requirements
- **Mandatory for Teachers and Administrators**: MFA is required for all teacher and admin accounts
- **Optional for Students**: Students can enable MFA for additional security
- **TOTP Support**: Time-based One-Time Password using authenticator apps
- **Backup Codes**: 10 single-use backup codes for account recovery

#### Implementation
- Uses `speakeasy` library for TOTP generation and verification
- QR codes generated for easy authenticator app setup
- Backup codes are cryptographically secure random strings
- Failed MFA attempts contribute to account lockout protection

#### API Endpoints
```
POST /mfa/setup/:userId          - Initialize MFA setup
POST /mfa/verify-setup/:userId   - Verify and enable MFA
POST /mfa/disable/:userId        - Disable MFA (requires password)
POST /mfa/backup-codes/:userId   - Regenerate backup codes
GET  /mfa/status/:userId         - Get MFA status
```

### 2. Role-Based Access Control (RBAC)

#### Default Roles

**Student Role**
- View own dashboard and submissions
- Create new submissions
- Update own profile
- Read own performance data

**Teacher Role**
- View teacher dashboard
- Access assigned students' analytics
- Create interventions and manage alerts
- Generate reports for assigned students
- View student submissions (scope-limited)

**Admin Role**
- Full user management capabilities
- Role and permission management
- System configuration access
- Audit log access
- Security settings management
- Access to all analytics data

#### Permission Structure
```typescript
interface Permission {
  id: string;           // Unique permission identifier
  name: string;         // Human-readable name
  resource: string;     // Resource type (dashboard, submission, etc.)
  action: string;       // Action type (read, write, manage, etc.)
  conditions?: {        // Optional conditions
    owner?: boolean;    // Resource ownership requirement
    scope?: string;     // Access scope limitation
  };
}
```

### 3. Least Privilege Principle

#### Implementation
- **Granular Permissions**: Each action requires specific permission
- **Conditional Access**: Permissions can include ownership and scope conditions
- **Time-Limited Roles**: Role assignments can have expiration dates
- **Regular Reviews**: Quarterly permission audits scheduled automatically

#### Permission Evaluation
1. Check user active status and account locks
2. Retrieve user's active roles
3. Evaluate each role's permissions against requested resource/action
4. Apply conditional logic (ownership, scope, etc.)
5. Log access decision for audit trail

### 4. Account Security

#### Failed Login Protection
- **Progressive Lockout**: Account locked after 5 failed attempts
- **Lockout Duration**: 30-minute automatic unlock
- **Attempt Tracking**: Failed attempts tracked per user
- **MFA Integration**: MFA failures count toward lockout

#### Password Security
- **Bcrypt Hashing**: Passwords hashed with configurable salt rounds
- **Password Change Tracking**: Last password change timestamp recorded
- **Secure Password Reset**: Integration with MFA for password recovery

### 5. Audit and Compliance

#### Access Logging
All access control decisions are logged with:
- User ID and action attempted
- Resource and result (granted/denied)
- IP address and user agent
- Timestamp and reason for decision

#### Quarterly Reviews
- **Automated Scheduling**: System identifies stale permissions (>90 days)
- **Review Tasks**: Creates tasks for permission review
- **Compliance Tracking**: Maintains audit trail of reviews

#### AWS IAM Policy Simulator Integration
- **Policy Validation**: Validates IAM policies before deployment
- **Compliance Checking**: Ensures policies follow security best practices
- **Error Detection**: Identifies policy syntax and logic errors

## API Documentation

### Authentication Endpoints

#### Enhanced Login with MFA
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "mfaToken": "123456"  // Optional, required if MFA enabled
}
```

**Response (MFA Required):**
```json
{
  "requiresMFA": true,
  "tempToken": "jwt-token-for-mfa-completion"
}
```

**Response (Success):**
```json
{
  "user": { /* user object */ },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### Permission Management

#### Check Permission
```http
POST /permissions/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "resource": "dashboard",
  "action": "read",
  "context": {
    "resourceUserId": "user-123"
  }
}
```

#### Assign Role
```http
POST /permissions/assign-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-123",
  "roleName": "teacher",
  "expiresAt": "2024-12-31T23:59:59Z"  // Optional
}
```

#### Audit Logs
```http
GET /permissions/audit?userId=user-123&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

## Database Schema

### Users Table Extensions
```sql
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret TEXT;
ALTER TABLE users ADD COLUMN backup_codes JSONB;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
```

### New Tables
- **roles**: System roles with JSON permissions
- **user_roles**: User role assignments with expiration
- **access_audit_logs**: Access control audit trail
- **permission_review_tasks**: Quarterly review tasks

## Security Considerations

### Threat Mitigation
- **Brute Force Protection**: Account lockout after failed attempts
- **Session Management**: JWT tokens with appropriate expiration
- **MFA Bypass Prevention**: Backup codes are single-use only
- **Privilege Escalation**: Strict permission validation with conditions

### Compliance Features
- **NIST 800-53 Mapping**: Security controls mapped to framework
- **CIS Controls**: Implementation follows CIS security guidelines
- **Audit Trail**: Complete access logging for compliance reporting
- **Regular Reviews**: Automated quarterly permission audits

## Monitoring and Metrics

### OpenTelemetry Metrics
- `mfa_setup_attempts_total`: MFA setup attempt tracking
- `mfa_verification_attempts_total`: MFA verification metrics
- `permission_checks_total`: Permission check frequency
- `access_denials_total`: Access denial tracking
- `role_assignments_total`: Role assignment metrics

### Alerting
- Failed MFA attempts above threshold
- Unusual permission denial patterns
- Stale permissions requiring review
- Account lockout events

## Configuration

### Environment Variables
```bash
# MFA Configuration
SERVICE_NAME="AIOps Learning Platform"
MFA_ISSUER="AIOps Learning Platform"

# Security Settings
BCRYPT_SALT_ROUNDS=12
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Account Lockout
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

## Usage Examples

### Setting up MFA for a Teacher
```typescript
// 1. Setup MFA
const setupResponse = await mfaService.setupMFA('teacher-123');
console.log('QR Code:', setupResponse.qrCode);
console.log('Backup Codes:', setupResponse.backupCodes);

// 2. Verify setup with authenticator token
const verified = await mfaService.verifyMFASetup('teacher-123', '123456');
if (verified) {
  console.log('MFA enabled successfully');
}
```

### Checking Permissions
```typescript
// Check if user can read a specific dashboard
const hasPermission = await permissionService.checkPermission(
  'student-123',
  'dashboard',
  'read',
  { resourceUserId: 'student-123' }
);

if (hasPermission) {
  // Allow access to dashboard
} else {
  // Deny access and log attempt
}
```

### Assigning Temporary Role
```typescript
// Assign teacher role with 1-year expiration
const expirationDate = new Date();
expirationDate.setFullYear(expirationDate.getFullYear() + 1);

await permissionService.assignRole(
  'user-123',
  'teacher',
  'admin-456',
  expirationDate
);
```

## Troubleshooting

### Common Issues

1. **MFA Setup Fails**
   - Verify user exists and is active
   - Check if MFA is already enabled
   - Ensure proper time synchronization for TOTP

2. **Permission Denied Unexpectedly**
   - Check user's active roles and expiration dates
   - Verify permission conditions (ownership, scope)
   - Review audit logs for detailed denial reasons

3. **Account Locked**
   - Check failed login attempts count
   - Verify lockout expiration time
   - Reset failed attempts if legitimate user

### Debugging Commands
```bash
# Check user's current roles
SELECT r.name FROM roles r 
JOIN user_roles ur ON r.id = ur.role_id 
WHERE ur.user_id = 'user-123' AND ur.is_active = true;

# View recent access attempts
SELECT * FROM access_audit_logs 
WHERE user_id = 'user-123' 
ORDER BY timestamp DESC LIMIT 10;

# Check MFA status
SELECT mfa_enabled, failed_login_attempts, locked_until 
FROM users WHERE id = 'user-123';
```

## Migration Guide

### Upgrading Existing Users
1. Run the IAM migration script: `npm run migrate:iam`
2. Existing users will be assigned roles based on their current role field
3. Teachers and admins will be prompted to set up MFA on next login
4. No existing functionality is broken during migration

### Rollback Procedure
If rollback is needed:
1. Remove new columns from users table
2. Drop new IAM tables (roles, user_roles, etc.)
3. Revert authentication middleware to simple role checking
4. Update frontend to remove MFA components