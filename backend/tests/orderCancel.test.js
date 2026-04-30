jest.mock('../database/database', () => ({
  getOrderById: jest.fn(),
  updateOrder: jest.fn(),
  getSupermarketProductById: jest.fn(),
  updateSupermarketProduct: jest.fn(),
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

describe('User order cancel API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should cancel a pending snack order for the current user', async () => {
    const pendingOrder = {
      id: 12,
      user_id: 1,
      type: 'snack',
      status: 'pending',
      total_amount: '18.00',
      items: JSON.stringify([
        { snackId: 3, snackName: '鸡排', quantity: 2, price: 9, subtotal: 18 }
      ]),
      created_at: '2026-04-14 09:30:00'
    };
    const cancelledOrder = {
      ...pendingOrder,
      status: 'cancelled'
    };

    db.getOrderById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(cancelledOrder);
    db.updateOrder.mockResolvedValue({ success: true });

    const res = await request(app).put('/api/snack/orders/12/cancel');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
    expect(db.updateOrder).toHaveBeenCalledWith(12, { status: 'cancelled' });
  });

  test('should reject cancelling a snack order that is not pending', async () => {
    db.getOrderById.mockResolvedValue({
      id: 12,
      user_id: 1,
      type: 'snack',
      status: 'processing'
    });

    const res = await request(app).put('/api/snack/orders/12/cancel');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(db.updateOrder).not.toHaveBeenCalled();
  });

  test('should reject cancelling a paid snack order', async () => {
    db.getOrderById.mockResolvedValue({
      id: 12,
      user_id: 1,
      type: 'snack',
      status: 'pending',
      payment_status: 'paid'
    });

    const res = await request(app).put('/api/snack/orders/12/cancel');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(db.updateOrder).not.toHaveBeenCalled();
  });

  test('should cancel a pending supermarket order and restore stock', async () => {
    const pendingOrder = {
      id: 21,
      user_id: 1,
      type: 'supermarket',
      status: 'pending',
      total_amount: '26.00',
      items: JSON.stringify([
        { productId: 5, productName: '纯牛奶', quantity: 2, price: 8, subtotal: 16 },
        { productId: 8, productName: '面包', quantity: 1, price: 10, subtotal: 10 }
      ]),
      created_at: '2026-04-14 10:15:00'
    };
    const cancelledOrder = {
      ...pendingOrder,
      status: 'cancelled'
    };

    const query = jest.fn(async (sql, params) => {
      if (sql.includes('SELECT * FROM orders WHERE id = ? AND user_id = ? AND type = ? FOR UPDATE')) {
        return [[pendingOrder]];
      }

      if (sql.includes('SELECT id, stock FROM supermarket_products WHERE id = ? FOR UPDATE')) {
        if (params[0] === 5) {
          return [[{ id: 5, stock: 4 }]];
        }

        if (params[0] === 8) {
          return [[{ id: 8, stock: 10 }]];
        }
      }

      if (sql.includes('UPDATE supermarket_products SET stock = ? WHERE id = ?')) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('UPDATE orders SET status = ? WHERE id = ?')) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes('SELECT * FROM orders WHERE id = ?')) {
        return [[cancelledOrder]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    DatabaseAdapter.transaction.mockImplementation(async (callback) => callback({ query }));

    const res = await request(app).put('/api/supermarket/orders/21/cancel');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
    expect(query).toHaveBeenCalledWith(
      'UPDATE supermarket_products SET stock = ? WHERE id = ?',
      [6, 5]
    );
    expect(query).toHaveBeenCalledWith(
      'UPDATE supermarket_products SET stock = ? WHERE id = ?',
      [11, 8]
    );
    expect(query).toHaveBeenCalledWith(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', 21]
    );
  });

  test('should reject cancelling a supermarket order that is already completed', async () => {
    const completedOrder = {
      id: 21,
      user_id: 1,
      type: 'supermarket',
      status: 'completed'
    };

    DatabaseAdapter.transaction.mockImplementation(async (callback) => callback({
      query: jest.fn(async (sql) => {
        if (sql.includes('SELECT * FROM orders WHERE id = ? AND user_id = ? AND type = ? FOR UPDATE')) {
          return [[completedOrder]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      })
    }));

    const res = await request(app).put('/api/supermarket/orders/21/cancel');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(DatabaseAdapter.transaction).toHaveBeenCalled();
  });
});
