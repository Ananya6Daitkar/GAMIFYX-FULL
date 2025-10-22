/**
 * TypeScript type definitions for GamifyX IAM system
 */

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  manager?: string;
  isActive: boolean;
  isLocked?: boolean;
  mfaEnabled?: boolean;
  lastLogin?: Date;
  passwordLastChanged?: Date;
  failedLoginAttempts?: number;
  roles?: Role[];
  permissions?: Permission[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'system' | 'custom' | 'template';
  level: number;
  parentRoleId?: string;
  parentRole?: Role;
  childRoles?: Role[];
  permissions?: string[];
  inheritedPermissions?: Permission[];
  effectivePermissions?: Permission[];
  isActive: boolean;
  isSystem: boolean;
  requiresMFA?: boolean;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  isSystem: boolean;
  category?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  conditions?: Record<string, any>;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  roleData: Partial<Role>;
  permissions?: string[];
  createdBy: string;
  createdAt: Date;
}

export interface AccessRequest {
  sessionToken: string;
  resource: string;
  action: string;
  context?: AccessContext;
}

export interface AccessContext {
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  location?: string;
  deviceId?: string;
  expiresAt?: Date;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  session?: Session;
  token?: string;
  reason?: string;
  requiresMFA?: boolean;
  lockoutTime?: number;
}

export interface AuthorizationResult {
  authorized: boolean;
  user?: User;
  permissions?: Permission[];
  context?: AccessContext;
  reason?: string;
  requiredPermissions?: string[];
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  matchedPolicies?: string[];
  context?: Record<string, any>;
}

// MFA Types
export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  HARDWARE_TOKEN = 'hardware_token',
  BIOMETRIC = 'biometric',
  BACKUP_CODE = 'backup_code'
}

export interface MFASetupResult {
  success: boolean;
  method: MFAMethod;
  secret?: string;
  qrCode?: string;
  backupCodes?: BackupCode[];
  challengeId?: string;
  maskedPhone?: string;
  maskedEmail?: string;
  biometricId?: string;
  supportedTypes?: string[];
  instructions: string;
}

export interface MFAVerificationResult {
  success: boolean;
  reason?: string;
  lockoutTime?: number;
}

export interface MFAChallenge {
  id: string;
  userId: string;
  method: MFAMethod;
  code?: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

export interface BackupCode {
  id: string;
  code?: string;
  hashedCode: string;
  used: boolean;
  createdAt: Date;
  usedAt?: Date;
}

export interface TOTPSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

// Audit Types
export interface AuditReport {
  id: string;
  type: string;
  scope: any;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    totalUsers: number;
    totalRoles: number;
    totalPermissions: number;
    activeUsers: number;
    inactiveUsers: number;
    privilegedUsers: number;
    orphanedAccounts: number;
    excessivePermissions: number;
    complianceScore: number;
  };
  findings: AuditFinding[];
  recommendations: AuditRecommendation[];
  riskAssessment: RiskAssessment;
  complianceChecks: ComplianceCheck[];
  detailedAnalysis: Record<string, PermissionAnalysis>;
}

export interface AuditFinding {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  roleId?: string;
  permissionId?: string;
  description: string;
  recommendation: string;
  evidence?: any;
  createdAt?: Date;
}

export interface AuditRecommendation {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  affectedUsers: string[];
  actionItems: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  criticalFindings: number;
  highRiskFindings: number;
  mediumRiskFindings: number;
  lowRiskFindings: number;
}

export interface ComplianceCheck {
  id: string;
  framework: string;
  requirement: string;
  description: string;
  passed: boolean;
  score?: number;
  evidence?: any;
  gaps?: string[];
  recommendations?: string[];
}

export interface AccessReview {
  id: string;
  type: 'quarterly' | 'annual' | 'ad_hoc';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reviewers: string[];
  dueDate: Date;
  createdAt: Date;
  completedAt?: Date;
  scope?: any;
  items: AccessReviewItem[];
  approvals: string[];
  rejections: string[];
  pendingItems: number;
  completedItems: number;
  totalItems: number;
}

export interface AccessReviewItem {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  manager?: string;
  roles: Role[];
  permissions: Permission[];
  lastLogin?: Date;
  status: 'pending' | 'approved' | 'rejected' | 'requires_changes';
  reviewerComments: string;
  decision?: 'approve' | 'reject' | 'modify';
  reviewedAt?: Date;
  reviewedBy?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionAnalysis {
  userId: string;
  userName: string;
  isActive: boolean;
  isPrivileged: boolean;
  isOrphaned: boolean;
  hasExcessivePermissions: boolean;
  lastLogin?: Date;
  roles: Role[];
  permissions: Permission[];
  findings: AuditFinding[];
  riskScore: number;
  recommendations: string[];
}

// Configuration Types
export interface IAMConfig {
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  roles: RoleConfig;
  permissions: PermissionConfig;
  sessions: SessionConfig;
  audit: AuditConfig;
  policies: PolicyConfig;
  mfa: MFAConfig;
}

export interface AuthenticationConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
    preventReuse: number;
  };
  lockoutPolicy: {
    maxAttempts: number;
    lockoutDuration: number;
    resetOnSuccess: boolean;
  };
  sessionTimeout: number;
  database: any;
  cache: any;
}

export interface AuthorizationConfig {
  defaultDeny: boolean;
  cachePermissions: boolean;
  cacheTTL: number;
  database: any;
  cache: any;
}

export interface RoleConfig {
  maxRolesPerUser: number;
  allowRoleHierarchy: boolean;
  maxHierarchyDepth: number;
  database: any;
  cache: any;
}

export interface PermissionConfig {
  granularPermissions: boolean;
  contextualPermissions: boolean;
  database: any;
  cache: any;
}

export interface SessionConfig {
  defaultExpiry: number;
  maxConcurrentSessions: number;
  extendOnActivity: boolean;
  secureTokens: boolean;
  database: any;
  cache: any;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed';
  retentionDays: number;
  frameworks: string[];
  orphanedAccountThresholdDays: number;
  excessivePermissionThreshold: number;
  trackPermissionUsage: boolean;
  database: any;
  reporting: any;
}

export interface PolicyConfig {
  engine: 'simple' | 'advanced';
  cacheResults: boolean;
  cacheTTL: number;
  database: any;
}

export interface MFAConfig {
  enforceForAll: boolean;
  enforceForPrivileged: boolean;
  allowedMethods: MFAMethod[];
  totpWindow: number;
  challengeExpiry: number;
  maxAttempts: number;
  lockoutDuration: number;
  backupCodesCount: number;
  redis: any;
  sms: any;
  email: any;
  biometric: any;
}

// Permission Set Types
export interface PermissionSet {
  id: string;
  name: string;
  permissions: Permission[];
  conditions?: Record<string, any>;
}

export interface RoleHierarchy {
  roleId: string;
  parentRoleId?: string;
  level: number;
  children: string[];
}

// Utility Types
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin';
export type ResourceType = 'user' | 'role' | 'permission' | 'system' | 'data' | 'api';
export type AccessDecision = 'allow' | 'deny' | 'conditional';