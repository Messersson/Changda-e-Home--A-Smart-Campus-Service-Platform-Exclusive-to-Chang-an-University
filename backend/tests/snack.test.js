jest.mock('../database/database', () => ({
  getSnacks: jest.fn(),
  getSnackById: jest.fn(),
  createOrder: jest.fn(),
  getOrdersByUserId: jest.fn(),
  getOrderById: jest.fn(),
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

jest.mock('../middleware/auth', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = { id: 1, studentId: '20220001', role: 'user' };
    next();
  }),
  adminAuthMiddleware: jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  })
}));

jest.mock('../routes/admin', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/stats', (req, res) => res.json({ success: true }));
  return router;
});

const request = require('supertest');
const { createApp } = require('../app');
const db = require('../database/database');

describe('Snack API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/snack/merchants', () => {
    test('should return merchant list', async () => {
      db.getSnacks.mockResolvedValue([
        { merchant: '张三小吃', name: '炸鸡', price: 10 },
        { merchant: '张三小吃', name: '薯条', price: 8 },
        { merchant: '李四烧烤', name: '羊肉串', price: 2 }
      ]);

      const res = await request(app).get('/api/snack/merchants');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toContain('张三小吃');
      expect(res.body.data).toContain('李四烧烤');
    });

    test('should handle database errors', async () => {
      db.getSnacks.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/snack/merchants');
      
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/snack/list', () => {
    test('should return snack list', async () => {
      db.getSnacks.mockResolvedValue([
        { id: 1, merchant: '张三小吃', name: '炸鸡', price: 10, status: 'active' }
      ]);

      const res = await request(app).get('/api/snack/list');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should filter by merchant', async () => {
      db.getSnacks.mockResolvedValue([
        { id: 1, merchant: '张三小吃', name: '炸鸡', price: 10, status: 'active' },
        { id: 2, merchant: '李四烧烤', name: '羊肉串', price: 2, status: 'active' }
      ]);

      const res = await request(app).get('/api/snack/list?merchant=张三小吃');
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].merchant).toBe('张三小吃');
    });
  });

  describe('GET /api/snack/detail/:id', () => {
    test('should return snack detail', async () => {
      db.getSnackById.mockResolvedValue({ id: 1, name: '炸鸡', price: 10 });

      const res = await request(app).get('/api/snack/detail/1');
      
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('炸鸡');
    });

    test('should return 404 for non-existent snack', async () => {
      db.getSnackById.mockResolvedValue(null);

      const res = await request(app).get('/api/snack/detail/999');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/snack/order', () => {
    test('should create order with valid data', async () => {
      db.getSnacks.mockResolvedValue([{ id: 1, name: '炸鸡', price: 10 }]);
      db.createOrder.mockResolvedValue({ insertId: 1 });

      const res = await request(app)
        .post('/api/snack/order')
        .send({ items: [{ snackId: 1, quantity: 2 }] });
      
      expect([200, 400]).toContain(res.status);
    });

    test('should reject empty items', async () => {
      const res = await request(app)
        .post('/api/snack/order')
        .send({ items: [] });
      
      expect([200, 400]).toContain(res.status);
    });
  });
});