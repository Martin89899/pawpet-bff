const request = require('supertest');
const app = require('../src/app');

describe('BFF Service Tests', () => {
  describe('Health Check', () => {
    test('should return 200 OK for health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('service', 'bff');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Auth Endpoints (No Auth Required)', () => {
    test('should return 400 for register with missing data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation error');
    });

    test('should return 400 for login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation error');
    });
  });

  describe('Protected Endpoints', () => {
    test('should return 401 for accessing patient endpoints without auth', async () => {
      const response = await request(app)
        .get('/api/patients')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access token is required');
    });

    test('should return 401 for accessing historial endpoints without auth', async () => {
      const response = await request(app)
        .get('/api/historial/patient/1/history')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access token is required');
    });

    test('should return 401 for auth verify endpoint without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access token is required');
    });
  });

  describe('Route Not Found', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Route not found');
    });
  });
});
