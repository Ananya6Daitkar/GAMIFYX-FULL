import { Request, Response, NextFunction } from 'express';
import { validateRequest, validateParams, validateQuery } from '@/middleware/validation';
import Joi from 'joi';

jest.mock('@/telemetry/logger');

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      correlationId: 'test-correlation-id'
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
    
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const testSchema = Joi.object({
      email: Joi.string().email().required(),
      age: Joi.number().min(18).required(),
      name: Joi.string().optional()
    });

    it('should pass validation with valid data', () => {
      // Arrange
      mockRequest.body = {
        email: 'test@example.com',
        age: 25,
        name: 'John Doe'
      };
      const middleware = validateRequest(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        email: 'test@example.com',
        age: 25,
        name: 'John Doe'
      });
    });

    it('should strip unknown fields', () => {
      // Arrange
      mockRequest.body = {
        email: 'test@example.com',
        age: 25,
        unknownField: 'should be removed'
      };
      const middleware = validateRequest(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        email: 'test@example.com',
        age: 25
      });
      expect(mockRequest.body).not.toHaveProperty('unknownField');
    });

    it('should fail validation with invalid data', () => {
      // Arrange
      mockRequest.body = {
        email: 'invalid-email',
        age: 15 // Below minimum
      };
      const middleware = validateRequest(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('valid email')
            }),
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('18')
            })
          ]),
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with missing required fields', () => {
      // Arrange
      mockRequest.body = {};
      const middleware = validateRequest(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('required')
            }),
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('required')
            })
          ]),
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    const testSchema = Joi.object({
      id: Joi.string().uuid().required(),
      type: Joi.string().valid('user', 'admin').optional()
    });

    it('should pass validation with valid params', () => {
      // Arrange
      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'user'
      };
      const middleware = validateParams(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid UUID', () => {
      // Arrange
      mockRequest.params = {
        id: 'invalid-uuid'
      };
      const middleware = validateParams(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: expect.stringContaining('valid GUID')
            })
          ]),
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const testSchema = Joi.object({
      page: Joi.number().min(1).default(1),
      limit: Joi.number().min(1).max(100).default(10),
      search: Joi.string().optional()
    });

    it('should pass validation with valid query params', () => {
      // Arrange
      mockRequest.query = {
        page: '2',
        limit: '20',
        search: 'test'
      };
      const middleware = validateQuery(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should apply default values', () => {
      // Arrange
      mockRequest.query = {};
      const middleware = validateQuery(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        page: 1,
        limit: 10
      });
    });

    it('should fail validation with invalid query params', () => {
      // Arrange
      mockRequest.query = {
        page: '0', // Below minimum
        limit: '200' // Above maximum
      };
      const middleware = validateQuery(testSchema);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'page',
              message: expect.stringContaining('1')
            }),
            expect.objectContaining({
              field: 'limit',
              message: expect.stringContaining('100')
            })
          ]),
          correlationId: 'test-correlation-id'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});