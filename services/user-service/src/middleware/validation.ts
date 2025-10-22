import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/telemetry/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Request validation failed', {
        errors: validationErrors,
        correlationId: req.correlationId
      });

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

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Parameter validation failed', {
        errors: validationErrors,
        correlationId: req.correlationId
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter validation failed',
          details: validationErrors,
          correlationId: req.correlationId
        }
      });
      return;
    }

    req.params = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Query validation failed', {
        errors: validationErrors,
        correlationId: req.correlationId
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: validationErrors,
          correlationId: req.correlationId
        }
      });
      return;
    }

    req.query = value;
    next();
  };
};