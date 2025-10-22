export interface Secret {
  id: string;
  name: string;
  path: string;
  type: SecretType;
  value?: string; // Only populated when retrieving
  metadata: SecretMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rotationConfig?: RotationConfig;
}

export enum SecretType {
  DATABASE_PASSWORD = 'database_password',
  API_KEY = 'api_key',
  JWT_SECRET = 'jwt_secret',
  ENCRYPTION_KEY = 'encryption_key',
  CERTIFICATE = 'certificate',
  SSH_KEY = 'ssh_key',
  OAUTH_TOKEN = 'oauth_token',
  WEBHOOK_SECRET = 'webhook_secret'
}

export interface SecretMetadata {
  description: string;
  owner: string;
  environment: string;
  service: string;
  tags: string[];
  sensitive: boolean;
}

export interface RotationConfig {
  enabled: boolean;
  intervalDays: number;
  strategy: RotationStrategy;
  notifyBefore: number; // Days before rotation to notify
  maxRetries: number;
  backoffMultiplier: number;
}

export enum RotationStrategy {
  REGENERATE = 'regenerate', // Generate new random value
  DATABASE_ROTATE = 'database_rotate', // Rotate database password
  API_REFRESH = 'api_refresh', // Refresh API token
  CERTIFICATE_RENEW = 'certificate_renew' // Renew certificate
}

export interface CreateSecretRequest {
  name: string;
  path: string;
  type: SecretType;
  value: string;
  metadata: SecretMetadata;
  rotationConfig?: RotationConfig;
  expiresAt?: Date;
}

export interface UpdateSecretRequest {
  value?: string;
  metadata?: Partial<SecretMetadata>;
  rotationConfig?: RotationConfig;
  expiresAt?: Date;
}

export interface SecretAccessLog {
  id: string;
  secretId: string;
  secretPath: string;
  userId: string;
  action: SecretAction;
  result: 'success' | 'failure';
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export enum SecretAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ROTATE = 'rotate',
  LIST = 'list'
}

export interface RotationJob {
  id: string;
  secretId: string;
  secretPath: string;
  status: RotationStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export enum RotationStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SecretUsage {
  secretId: string;
  secretPath: string;
  service: string;
  environment: string;
  lastAccessed: Date;
  accessCount: number;
  activeConnections: number;
}

export interface RotationNotification {
  secretId: string;
  secretPath: string;
  type: 'warning' | 'success' | 'failure';
  message: string;
  scheduledRotation?: Date;
  recipients: string[];
}

export interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
  apiVersion: string;
  timeout: number;
  retries: number;
}

export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface APIKeyConfig {
  provider: string;
  keyId: string;
  endpoint: string;
  scopes: string[];
}

export interface CertificateConfig {
  commonName: string;
  organization: string;
  validityDays: number;
  keySize: number;
  algorithm: string;
}