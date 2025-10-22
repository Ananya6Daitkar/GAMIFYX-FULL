import request from 'supertest';
import app from '../index';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'user-service',
        timestamp: expect.any(String),
        version: '1.0.0'
      });
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ready',
        service: 'user-service',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toEqual({
        status: 'alive',
        service: 'user-service',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Response Headers', () => {
    it('should include correlation ID in response headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should use provided correlation ID', async () => {
      const correlationId = 'test-correlation-id';
      const response = await request(app)
        .get('/health')
        .set('x-correlation-id', correlationId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});