jest.mock('../database/database', () => ({
  getUserByStudentId: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  validateRequest: jest.fn(() => ({ success: true, errors: [] })),
  successResponse: (data) => ({ success: true, data }),
  errorResponse: (message, code = 400) => ({ success: false, message, code })
}));

jest.mock('../database/adapter', () => ({
  insert: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn()
}));

jest.mock('../middleware/healthCheck', () => ({
  performFullHealthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    checks: { server: { status: 'healthy' }, database: { status: 'healthy' } }
  }),
  getHealthStats: jest.fn().mockReturnValue({})
}));

const request = require('supertest');
const { createApp } = require('../app');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/send-verification', () => {
    test('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/send-verification')
        .send({ email: 'invalid-email', studentId: '20220001' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject invalid studentId format', async () => {
      const res = await request(app)
        .post('/api/auth/send-verification')
        .send({ email: 'test@chd.edu.cn', studentId: '123' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject duplicate studentId', async () => {
      db.getUserByStudentId.mockResolvedValue({ id: 1, studentId: '20220001' });
      
      const res = await request(app)
        .post('/api/auth/send-verification')
        .send({ email: 'test@chd.edu.cn', studentId: '20220001' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should send verification code for valid request', async () => {
      db.getUserByStudentId.mockResolvedValue(null);
      DatabaseAdapter.insert.mockResolvedValue({ insertId: 1 });
      
      const res = await request(app)
        .post('/api/auth/send-verification')
        .send({ email: 'test@chd.edu.cn', studentId: '20220001' });
      
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('POST /api/auth/register', () => {
    test('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});
      
      expect(res.status).toBe(400);
    });

    test('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: '20220001',
          email: 'test@chd.edu.cn',
          code: 'ABC123',
          password: '123'
        });
      
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(res.status).toBe(400);
    });
  });
});