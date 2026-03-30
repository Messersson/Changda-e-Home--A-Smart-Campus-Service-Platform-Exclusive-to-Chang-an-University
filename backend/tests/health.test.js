// stub the health checker so tests don't need a real database
jest.mock('../middleware/healthCheck', () => ({
  performFullHealthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    checks: {
      server: { status: 'healthy' },
      database: { status: 'healthy' }
    }
  }),
  getHealthStats: jest.fn().mockReturnValue({})
}));

const request = require('supertest');
const { createApp } = require('../app');

describe('Basic endpoints', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  test('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  test('non existing route returns 404 JSON', async () => {
    const res = await request(app).get('/no-such');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
  });
});
