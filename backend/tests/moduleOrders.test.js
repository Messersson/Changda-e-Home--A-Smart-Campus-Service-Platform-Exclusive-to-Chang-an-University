jest.mock('../database/database', () => ({
  getTutorById: jest.fn(),
  getSecondhandItemById: jest.fn(),
  getDrivingSchoolById: jest.fn(),
  getOrderById: jest.fn(),
  createOrder: jest.fn(),
  updateSecondhandItem: jest.fn(),
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
    req.user = { id: 1, studentId: '20220001', role: 'student' };
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

describe('Service order APIs', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    db.validateRequest.mockReturnValue({ success: true, errors: [] });
  });

  test('should create a tutor order with calculated total amount', async () => {
    db.getTutorById.mockResolvedValue({
      id: 3,
      user_id: 8,
      name: '李老师',
      subject: '高等数学',
      grade: '大一',
      salary: 80,
      status: 'active'
    });
    db.createOrder.mockResolvedValue({ id: 101 });

    const res = await request(app)
      .post('/api/tutor/order')
      .send({
        tutorId: 3,
        hours: 3,
        phone: '13800000000',
        address: '渭水校区图书馆',
        remark: '希望周末上课'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      orderId: 101,
      totalAmount: 240
    });
    expect(db.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      type: 'tutor',
      totalAmount: 240,
      phone: '13800000000',
      address: '渭水校区图书馆'
    }));
    expect(db.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          tutorId: 3,
          tutorName: '李老师',
          quantity: 3,
          subtotal: 240,
          unit: '小时'
        })
      ]
    }));
  });

  test('should reject ordering a secondhand item owned by current user', async () => {
    db.getSecondhandItemById.mockResolvedValue({
      id: 5,
      user_id: 1,
      title: '山地自行车',
      category: '交通工具',
      price: 300,
      status: 'active'
    });

    const res = await request(app)
      .post('/api/secondhand/order')
      .send({
        itemId: 5,
        phone: '13800000000',
        address: '北门地铁口'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(db.createOrder).not.toHaveBeenCalled();
  });

  test('should create a secondhand order and mark the item as sold', async () => {
    db.getSecondhandItemById.mockResolvedValue({
      id: 7,
      user_id: 9,
      title: '九成新显示器',
      category: '电子产品',
      price: 520,
      status: 'active'
    });
    db.createOrder.mockResolvedValue({ id: 188 });
    db.updateSecondhandItem.mockResolvedValue({ success: true });

    const res = await request(app)
      .post('/api/secondhand/order')
      .send({
        itemId: 7,
        phone: '13700000000',
        address: '图书馆门口',
        remark: '今晚 7 点可交易'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.updateSecondhandItem).toHaveBeenCalledWith(7, { status: 'sold' });
  });

  test('should create a driving school order', async () => {
    db.getDrivingSchoolById.mockResolvedValue({
      id: 2,
      name: '长安驾校',
      price: 2800,
      status: 'active'
    });
    db.createOrder.mockResolvedValue({ id: 202 });

    const res = await request(app)
      .post('/api/driving-school/order')
      .send({
        schoolId: 2,
        studentName: '张三',
        phone: '13900000000',
        address: '渭水校区东门',
        remark: '希望周末练车'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      orderId: 202,
      totalAmount: 2800
    });
    expect(db.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      type: 'driving_school',
      totalAmount: 2800,
      phone: '13900000000',
      address: '渭水校区东门'
    }));
    expect(db.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      items: [
        expect.objectContaining({
          schoolId: 2,
          schoolName: '长安驾校',
          studentName: '张三',
          quantity: 1,
          subtotal: 2800
        })
      ]
    }));
  });

  test('should cancel a pending tutor order for current user', async () => {
    const pendingOrder = {
      id: 33,
      user_id: 1,
      type: 'tutor',
      status: 'pending',
      total_amount: '160.00',
      items: JSON.stringify([
        { tutorId: 3, tutorName: '李老师', quantity: 2, unit: '小时', price: 80, subtotal: 160 }
      ]),
      created_at: '2026-04-15 13:00:00'
    };
    const cancelledOrder = {
      ...pendingOrder,
      status: 'cancelled'
    };

    db.getOrderById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(cancelledOrder);
    db.updateOrder.mockResolvedValue({ success: true });

    const res = await request(app).put('/api/tutor/orders/33/cancel');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
    expect(db.updateOrder).toHaveBeenCalledWith(33, { status: 'cancelled' });
  });

  test('should cancel a pending secondhand order and reactivate the item', async () => {
    const pendingOrder = {
      id: 45,
      user_id: 1,
      type: 'secondhand',
      status: 'pending',
      total_amount: '520.00',
      items: JSON.stringify([
        { itemId: 7, title: '九成新显示器', quantity: 1, price: 520, subtotal: 520 }
      ]),
      created_at: '2026-04-15 14:00:00'
    };
    const cancelledOrder = {
      ...pendingOrder,
      status: 'cancelled'
    };

    db.getOrderById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(cancelledOrder);
    db.updateSecondhandItem.mockResolvedValue({ success: true });
    db.updateOrder.mockResolvedValue({ success: true });

    const res = await request(app).put('/api/secondhand/orders/45/cancel');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.updateSecondhandItem).toHaveBeenCalledWith(7, { status: 'active' });
    expect(db.updateOrder).toHaveBeenCalledWith(45, { status: 'cancelled' });
  });
});
