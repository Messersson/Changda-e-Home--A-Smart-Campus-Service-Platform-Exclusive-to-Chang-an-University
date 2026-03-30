const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const validateStudentId = (studentId) => {
  const pattern = /^\d{10}$/;
  return pattern.test(studentId);
};

const validateEmail = (email) => {
  const pattern = /^[a-zA-Z0-9._%+-]+@chd\.edu\.cn$/;
  return pattern.test(email);
};

const generateVerificationCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const validateRequest = (req) => {
  const errors = validationResult(req);
  return {
    success: errors.isEmpty(),
    errors: errors.array()
  };
};

router.post('/send-verification', [
  body('email').isEmail().withMessage('邮箱格式不正确'),
  body('studentId').notEmpty().withMessage('学号不能为空')
], async (req, res) => {
  const validation = validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { email, studentId } = req.body;

  if (!validateStudentId(studentId)) {
    return res.status(400).json(db.errorResponse('学号格式不正确，应为10位数字'));
  }

  if (!validateEmail(email)) {
    return res.status(400).json(db.errorResponse('邮箱必须为长安大学教育邮箱（@chd.edu.cn）'));
  }

  const existingUser = await db.getUserByStudentId(studentId);
  if (existingUser) {
    return res.status(400).json(db.errorResponse('该学号已注册'));
  }

  const code = generateVerificationCode();
  const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

  console.log(`[邮箱验证] 发送验证码到 ${email}: ${code}`);

  await DatabaseAdapter.insert('email_verifications', {
    email,
    student_id: studentId,
    code,
    expiry_time: expiryTime,
    created_at: new Date()
  });

  res.json(db.successResponse({ 
    message: '验证码已发送到您的邮箱，有效期10分钟',
    expiryTime: expiryTime.toISOString()
  }));
});

router.post('/register', [
  body('studentId').notEmpty().withMessage('学号不能为空'),
  body('email').isEmail().withMessage('邮箱格式不正确'),
  body('code').notEmpty().withMessage('验证码不能为空'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('name').notEmpty().withMessage('姓名不能为空'),
  body('major').notEmpty().withMessage('专业不能为空')
], async (req, res) => {
  const validation = validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { studentId, email, code, password, name, major, grade } = req.body;

  if (!validateStudentId(studentId)) {
    return res.status(400).json(db.errorResponse('学号格式不正确'));
  }

  if (!validateEmail(email)) {
    return res.status(400).json(db.errorResponse('邮箱必须为长安大学教育邮箱'));
  }

  const verification = await db.getEmailVerification({ 
    email, 
    student_id: studentId, 
    code 
  });

  if (!verification) {
    return res.status(400).json(db.errorResponse('验证码错误或已过期'));
  }

  if (new Date(verification.expiry_time) < new Date()) {
    return res.status(400).json(db.errorResponse('验证码已过期'));
  }

  const existingUserByStudentId = await db.getUserByStudentId(studentId);
  const existingUserByEmail = await db.getUserByEmail(email);
  
  if (existingUserByStudentId || existingUserByEmail) {
    return res.status(400).json(db.errorResponse('该学号或邮箱已注册'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userResult = await db.createUser({
    studentId,
    email,
    password: hashedPassword,
    name,
    major,
    grade
  });

  const token = jwt.sign(
    { id: userResult.id, studentId, email, role: 'student' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json(db.successResponse({
    token,
    user: {
      id: userResult.id,
      studentId,
      email,
      name,
      major,
      grade,
      role: 'student'
    }
  }, '注册成功'));
});

router.post('/login', [
  body('studentId').notEmpty().withMessage('学号不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
  const validation = validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { studentId, password } = req.body;

  try {
    const users = await DatabaseAdapter.select('users', { student_id: studentId });
    const user = users[0];

    if (!user) {
      return res.status(401).json(db.errorResponse('学号或密码错误'));
    }

    const isPasswordValid = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : password === user.password;
    if (!isPasswordValid) {
      return res.status(401).json(db.errorResponse('学号或密码错误'));
    }
    if (!user.password.startsWith('$2')) {
      await db.updateUser(user.id, { password: await bcrypt.hash(password, 10) });
    }

    if (user.status !== 'active') {
      return res.status(403).json(db.errorResponse('账号已被禁用'));
    }

    const token = jwt.sign(
      { id: user.id, studentId: user.student_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json(db.successResponse({
      token,
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        name: user.name,
        major: user.major,
        grade: user.grade,
        role: user.role
      }
    }, '登录成功'));
  } catch (error) {
    console.error('[登录错误]', error.message);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json(db.errorResponse('用户不存在'));
    }

    res.json(db.successResponse({
      id: user.id,
      studentId: user.student_id,
      email: user.email,
      name: user.name,
      major: user.major,
      grade: user.grade,
      role: user.role,
      status: user.status
    }));
  } catch (error) {
    console.error('[获取用户信息错误]', error.message);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  res.json(db.successResponse(null, '退出登录成功'));
});

module.exports = router;
