import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { CreateSecretRequest, SecretType, RotationStrategy } from '@/models/Secret';

const secretMetadataSchema = Joi.object({
  description: Joi.string().required().max(500),
  owner: Joi.string().email().required(),
  environment: Joi.string().valid('development', 'staging', 'production').required(),
  service: Joi.string().required().max(100),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  sensitive: Joi.boolean().default(true)
});

const rotationConfigSchema = Joi.object({
  enabled: Joi.boolean().required(),
  intervalDays: Joi.number().integer().min(1).max(365).default(90),
  strategy: Joi.string().valid(...Object.values(RotationStrategy)).required(),
  notifyBefore: Joi.number().integer().min(1).max(30).default(7),
  maxRetries: Joi.number().integer().min(1).max(10).default(3),
  backoffMultiplier: Joi.number().min(1).max(10).default(2)
});

const createSecretSchema = Joi.object({
  name: Joi.string().required().max(100).pattern(/^[a-zA-Z0-9_-]+$/),
  path: Joi.string().required().max(500).pattern(/^[a-zA-Z0-9/_-]+$/),
  type: Joi.string().valid(...Object.values(SecretType)).required(),
  value: Joi.string().required().min(1).max(10000),
  metadata: secretMetadataSchema.required(),
  rotationConfig: rotationConfigSchema.optional(),
  expiresAt: Joi.date().greater('now').optional()
});

const updateSecretSchema = Joi.object({
  value: Joi.string().min(1).max(10000).optional(),
  metadata: secretMetadataSchema.optional(),
  rotationConfig: rotationConfigSchema.optional(),
  expiresAt: Joi.date().greater('now').optional()
}).min(1); // At least one field must be provided

export const validateSecretRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = createSecretSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
        correlationId: req.correlationId
      }
    });
    return;
  }

  // Additional business logic validation
  const secretRequest = req.body as CreateSecretRequest;
  
  // Validate secret path format
  if (secretRequest.path.startsWith('/') || secretRequest.path.endsWith('/')) {
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: 'Secret path cannot start or end with forward slash',
        correlationId: req.correlationId
      }
    });
    return;
  }

  // Validate secret value based on type
  const valueValidationError = validateSecretValue(secretRequest.type, secretRequest.value);
  if (valueValidationError) {
    res.status(400).json({
      error: {
        code: 'INVALID_SECRET_VALUE',
        message: valueValidationError,
        correlationId: req.correlationId
      }
    });
    return;
  }

  // Validate rotation configuration
  if (secretRequest.rotationConfig) {
    const rotationValidationError = validateRotationConfig(secretRequest.type, secretRequest.rotationConfig);
    if (rotationValidationError) {
      res.status(400).json({
        error: {
          code: 'INVALID_ROTATION_CONFIG',
          message: rotationValidationError,
          correlationId: req.correlationId
        }
      });
      return;
    }
  }

  next();
};

export const validateUpdateSecretRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = updateSecretSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
        correlationId: req.correlationId
      }
    });
    return;
  }

  next();
};

function validateSecretValue(type: SecretType, value: string): string | null {
  switch (type) {
    case SecretType.DATABASE_PASSWORD:
      if (value.length < 8) {
        return 'Database password must be at least 8 characters long';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Database password must contain at least one lowercase letter, one uppercase letter, and one digit';
      }
      break;

    case SecretType.API_KEY:
      if (value.length < 16) {
        return 'API key must be at least 16 characters long';
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'API key can only contain alphanumeric characters, underscores, and hyphens';
      }
      break;

    case SecretType.JWT_SECRET:
      if (value.length < 32) {
        return 'JWT secret must be at least 32 characters long';
      }
      break;

    case SecretType.ENCRYPTION_KEY:
      if (value.length < 32) {
        return 'Encryption key must be at least 32 characters long';
      }
      // Check if it's a valid base64 or hex string
      if (!/^[A-Fa-f0-9]+$/.test(value) && !/^[A-Za-z0-9+/]+=*$/.test(value)) {
        return 'Encryption key must be a valid hex or base64 string';
      }
      break;

    case SecretType.CERTIFICATE:
      if (!value.includes('-----BEGIN CERTIFICATE-----') || !value.includes('-----END CERTIFICATE-----')) {
        return 'Certificate must be in PEM format';
      }
      break;

    case SecretType.SSH_KEY:
      if (!value.includes('-----BEGIN') || !value.includes('-----END')) {
        return 'SSH key must be in PEM format';
      }
      break;

    case SecretType.OAUTH_TOKEN:
      if (value.length < 20) {
        return 'OAuth token must be at least 20 characters long';
      }
      break;

    case SecretType.WEBHOOK_SECRET:
      if (value.length < 16) {
        return 'Webhook secret must be at least 16 characters long';
      }
      break;
  }

  return null;
}

function validateRotationConfig(type: SecretType, config: any): string | null {
  // Validate rotation strategy is appropriate for secret type
  const validStrategies: Record<SecretType, RotationStrategy[]> = {
    [SecretType.DATABASE_PASSWORD]: [RotationStrategy.DATABASE_ROTATE, RotationStrategy.REGENERATE],
    [SecretType.API_KEY]: [RotationStrategy.API_REFRESH, RotationStrategy.REGENERATE],
    [SecretType.JWT_SECRET]: [RotationStrategy.REGENERATE],
    [SecretType.ENCRYPTION_KEY]: [RotationStrategy.REGENERATE],
    [SecretType.CERTIFICATE]: [RotationStrategy.CERTIFICATE_RENEW],
    [SecretType.SSH_KEY]: [RotationStrategy.REGENERATE],
    [SecretType.OAUTH_TOKEN]: [RotationStrategy.API_REFRESH],
    [SecretType.WEBHOOK_SECRET]: [RotationStrategy.REGENERATE]
  };

  const allowedStrategies = validStrategies[type];
  if (!allowedStrategies.includes(config.strategy)) {
    return `Rotation strategy '${config.strategy}' is not valid for secret type '${type}'. Allowed strategies: ${allowedStrategies.join(', ')}`;
  }

  // Validate interval based on secret type
  const minIntervals: Record<SecretType, number> = {
    [SecretType.DATABASE_PASSWORD]: 30, // 30 days minimum
    [SecretType.API_KEY]: 30,
    [SecretType.JWT_SECRET]: 7, // 7 days minimum for JWT secrets
    [SecretType.ENCRYPTION_KEY]: 90, // 90 days minimum for encryption keys
    [SecretType.CERTIFICATE]: 30,
    [SecretType.SSH_KEY]: 90,
    [SecretType.OAUTH_TOKEN]: 1, // OAuth tokens can be rotated daily
    [SecretType.WEBHOOK_SECRET]: 30
  };

  const minInterval = minIntervals[type];
  if (config.intervalDays < minInterval) {
    return `Rotation interval for ${type} must be at least ${minInterval} days`;
  }

  return null;
}

export const validateSecretPath = (req: Request, res: Response, next: NextFunction): void => {
  const secretPath = req.params[0] || req.params.path;
  
  if (!secretPath) {
    res.status(400).json({
      error: {
        code: 'MISSING_SECRET_PATH',
        message: 'Secret path is required',
        correlationId: req.correlationId
      }
    });
    return;
  }

  // Validate path format
  if (!/^[a-zA-Z0-9/_-]+$/.test(secretPath)) {
    res.status(400).json({
      error: {
        code: 'INVALID_PATH_FORMAT',
        message: 'Secret path can only contain alphanumeric characters, forward slashes, underscores, and hyphens',
        correlationId: req.correlationId
      }
    });
    return;
  }

  // Prevent path traversal
  if (secretPath.includes('..') || secretPath.includes('./') || secretPath.includes('//')) {
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: 'Invalid secret path: path traversal not allowed',
        correlationId: req.correlationId
      }
    });
    return;
  }

  next();
};