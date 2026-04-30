jest.mock('../database/database', () => ({
  getOrderById: jest.fn(),
  getLatestActivePaymentByOrderId: jest.fn(),
  createPayment: jest.fn(),
  updatePayment: jest.fn(),
  getPaymentById: jest.fn(),
  createRefund: jest.fn(),
  updateRefund: jest.fn(),
  getRefundById: jest.fn(),
  getRefundByOutRefundNo: jest.fn(),
  updateOrder: jest.fn(),
  validateRequest: jest.fn(() => ({ success: true, errors: [] })),
  successResponse: (data, message = 'ok') => ({ success: true, message, data }),
  errorResponse: (message, code = 400) => ({ success: false, message, code })
}));

jest.mock('../database/adapter', () => ({
  connect: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  selectWithJoin: jest.fn(),
  transaction: jest.fn()
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

const request = require('supertest');
const { createApp } = require('../app');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');

describe('Payments API', () => {
  let app;

  beforeAll(() => {
    process.env.PAYMENT_PROVIDER_DEFAULT = 'mock';
    process.env.PAYMENT_MOCK_ENABLED = 'true';
    process.env.ALIPAY_ENABLED = 'false';
    process.env.WECHAT_PAY_ENABLED = 'false';
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a mock payment for an unpaid order', async () => {
    db.getOrderById.mockResolvedValue({
      id: 12,
      user_id: 1,
      type: 'snack',
      status: 'pending',
      payment_status: 'unpaid',
      total_amount: '18.00'
    });
    db.getLatestActivePaymentByOrderId.mockResolvedValue(null);
    db.createPayment.mockResolvedValue({ id: 100 });
    db.updatePayment.mockResolvedValue({ success: true });
    db.getPaymentById.mockResolvedValue({
      id: 100,
      order_id: 12,
      user_id: 1,
      provider: 'mock',
      out_trade_no: 'P12-xxxx',
      amount: '18.00',
      status: 'created',
      pay_url: 'http://127.0.0.1:5173/pay/mock/100',
      created_at: '2026-04-30 10:00:00'
    });

    const res = await request(app).post('/api/payments/create').send({ orderId: 12, provider: 'mock' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBe(12);
    expect(res.body.data.amount).toBe(18);
    expect(res.body.data.payUrl).toBe('http://127.0.0.1:5173/pay/mock/100');
    expect(db.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 12,
      userId: 1,
      provider: 'mock',
      amount: 18
    }));
    expect(db.updatePayment).toHaveBeenCalledWith(100, { payUrl: 'http://127.0.0.1:5173/pay/mock/100' });
  });

  test('should reuse latest active payment when provider matches', async () => {
    db.getOrderById.mockResolvedValue({
      id: 12,
      user_id: 1,
      status: 'pending',
      payment_status: 'unpaid',
      total_amount: '18.00'
    });
    db.getLatestActivePaymentByOrderId.mockResolvedValue({
      id: 101,
      order_id: 12,
      user_id: 1,
      provider: 'mock',
      out_trade_no: 'P12-aaaa',
      amount: '18.00',
      status: 'created',
      pay_url: 'http://127.0.0.1:5173/pay/mock/101',
      created_at: '2026-04-30 10:10:00'
    });

    const res = await request(app).post('/api/payments/create').send({ orderId: 12, provider: 'mock' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payUrl).toBe('http://127.0.0.1:5173/pay/mock/101');
    expect(db.createPayment).not.toHaveBeenCalled();
  });

  test('should reject creating alipay payment when disabled', async () => {
    const res = await request(app).post('/api/payments/create').send({ orderId: 12, provider: 'alipay' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('should confirm a mock payment and mark order as paid', async () => {
    const payment = {
      id: 200,
      order_id: 21,
      user_id: 1,
      provider: 'mock',
      status: 'created',
      amount: '26.00'
    };
    const order = {
      id: 21,
      user_id: 1,
      status: 'pending',
      payment_status: 'unpaid'
    };
    const updatedPayment = {
      ...payment,
      status: 'paid',
      paid_at: '2026-04-30 10:20:00'
    };

    const query = jest.fn(async (sql, params) => {
      if (sql.includes('SELECT * FROM payments WHERE id = ? FOR UPDATE')) {
        return [[payment]];
      }

      if (sql.includes('SELECT * FROM orders WHERE id = ? FOR UPDATE')) {
        return [[order]];
      }

      if (sql.includes('UPDATE payments SET status = ?')) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('UPDATE orders SET payment_status = ?')) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('SELECT * FROM payments WHERE id = ?')) {
        return [[updatedPayment]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    DatabaseAdapter.transaction.mockImplementation(async (callback) => callback({ query }));

    const res = await request(app).post('/api/payments/200/mock/confirm');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('paid');
    expect(DatabaseAdapter.transaction).toHaveBeenCalled();
  });
});
