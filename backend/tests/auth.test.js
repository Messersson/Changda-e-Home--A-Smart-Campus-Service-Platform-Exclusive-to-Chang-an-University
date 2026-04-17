process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1d';

jest.mock('../database/database', () => ({
  getUserById: jest.fn(),
  getUserByStudentId: jest.fn(),
  getUserByEmail: jest.fn(),
  getEmailVerification: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  validateRequest: jest.fn(() => ({ success: true, errors: [] })),
  successResponse: (data, message = 'ok') => ({ success: true, message, data }),
  errorResponse: (message, code = 400) => ({ success: false, message, code })
}));

jest.mock('../database/adapter', () => ({
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 1, role: 'student' };
    next();
  },
  adminAuthMiddleware: (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  }
}));

jest.mock('../middleware/healthCheck', () => ({
  performFullHealthCheck: jest.fn().mockResolvedValue({
    status: 'healthy',
    checks: { server: { status: 'healthy' }, database: { status: 'healthy' } }
  }),
  getHealthStats: jest.fn().mockReturnValue({})
}));

const bcrypt = require('bcryptjs');
const request = require('supertest');
const { createApp } = require('../app');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');

const mockUser = {
  id: 1,
  student_id: '2022000001',
  email: 'test@chd.edu.cn',
  password: '$2a$10$abcdefghijklmnopqrstuv',
  name: '张三',
  major: '计算机科学与技术',
  grade: '2022级',
  role: 'student',
  status: 'active',
  created_at: '2026-04-14T08:00:00.000Z'
};

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    DatabaseAdapter.insert.mockResolvedValue({ insertId: 1 });
    DatabaseAdapter.select.mockResolvedValue([]);
    db.updateUser.mockResolvedValue({ success: true });
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
      db.getUserByStudentId.mockResolvedValue({ id: 1, studentId: '2022000001' });

      const res = await request(app)
        .post('/api/auth/send-verification')
        .send({ email: 'test@chd.edu.cn', studentId: '2022000001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should send verification code for valid request', async () => {
      db.getUserByStudentId.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/send-verification')
        .send({ email: 'test@chd.edu.cn', studentId: '2022000001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(DatabaseAdapter.insert).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/register', () => {
    test('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: '2022000001',
          email: 'test@chd.edu.cn',
          code: 'ABC123',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user profile', async () => {
      db.getUserById.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer fake-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: 1,
        studentId: '2022000001',
        email: 'test@chd.edu.cn',
        name: '张三',
        major: '计算机科学与技术',
        grade: '2022级',
        role: 'student',
        status: 'active'
      });
    });
  });

  describe('PUT /api/auth/me', () => {
    test('should update current user profile', async () => {
      const updatedUser = {
        ...mockUser,
        name: '李四',
        major: '软件工程',
        grade: '2023级'
      };

      db.getUserById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);

      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', 'Bearer fake-token')
        .send({
          name: '李四',
          major: '软件工程',
          grade: '2023级'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(db.updateUser).toHaveBeenCalledWith(1, {
        name: '李四',
        major: '软件工程',
        grade: '2023级'
      });
      expect(res.body.data).toMatchObject({
        name: '李四',
        major: '软件工程',
        grade: '2023级'
      });
    });
  });

  describe('PUT /api/auth/password', () => {
    test('should reject incorrect current password', async () => {
      db.getUserById.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('correct-password', 10)
      });

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', 'Bearer fake-token')
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'new-password'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(db.updateUser).not.toHaveBeenCalled();
    });

    test('should update password when current password is correct', async () => {
      db.getUserById.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('correct-password', 10)
      });

      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', 'Bearer fake-token')
        .send({
          currentPassword: 'correct-password',
          newPassword: 'new-password'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(db.updateUser).toHaveBeenCalledWith(1, {
        password: expect.any(String)
      });
    });
  });
});
