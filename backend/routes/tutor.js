const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/list', async (req, res) => {
  try {
    const { subject, grade, minSalary, maxSalary } = req.query;
    let tutors = await db.getTutors({ status: 'active' });
    if (subject) tutors = tutors.filter(t => (t.subject || '').includes(subject));
    if (grade) tutors = tutors.filter(t => t.grade === grade);
    if (minSalary) tutors = tutors.filter(t => t.salary >= parseInt(minSalary));
    if (maxSalary) tutors = tutors.filter(t => t.salary <= parseInt(maxSalary));
    const list = tutors.map(t => ({ ...t, userId: t.user_id }));
    res.json(db.successResponse(list));
  } catch (error) {
    console.error('[Tutor list]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tutor = await db.getTutorById(parseInt(id));
    if (!tutor) {
      return res.status(404).json(db.errorResponse('家教信息不存在'));
    }
    res.json(db.successResponse({ ...tutor, userId: tutor.user_id }));
  } catch (error) {
    console.error('[Tutor detail]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/publish', [
  authMiddleware,
  body('subject').notEmpty().withMessage('科目不能为空'),
  body('grade').notEmpty().withMessage('年级不能为空'),
  body('salary').isInt({ min: 1 }).withMessage('薪资必须大于0'),
  body('description').notEmpty().withMessage('描述不能为空'),
  body('contact').notEmpty().withMessage('联系方式不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { subject, grade, salary, description, contact } = req.body;
  const userId = req.user.id;

  try {
    const user = await db.getUserById(userId);
    if (!user) return res.status(400).json(db.errorResponse('用户不存在'));
    const result = await db.createTutor({
      userId,
      name: user.name,
      subject,
      grade,
      salary: parseInt(salary),
      description,
      contact,
      status: 'pending'
    });
    const tutor = await db.getTutorById(result.id);
    res.json(db.successResponse({ ...tutor, userId: tutor.user_id }, '家教信息发布成功，等待审核'));
  } catch (error) {
    console.error('[Tutor publish]', error);
    res.status(500).json(db.errorResponse('发布失败'));
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const tutors = await db.getTutors({ user_id: userId });
    res.json(db.successResponse(tutors.map(t => ({ ...t, userId: t.user_id }))));
  } catch (error) {
    console.error('[Tutor my]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
