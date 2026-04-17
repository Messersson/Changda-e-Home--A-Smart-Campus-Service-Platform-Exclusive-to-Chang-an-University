const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const serializeTutor = (tutor) => ({
  ...tutor,
  userId: tutor.user_id
});

const serializeOrder = (order) => ({
  ...order,
  userId: order.user_id,
  totalAmount: Number(order.total_amount || 0),
  items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []),
  createdAt: order.created_at
});

const cancelUserOrder = async (req, res, type) => {
  const orderId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const order = await db.getOrderById(orderId);

    if (!order || order.user_id !== userId || order.type !== type) {
      return res.status(404).json(db.errorResponse('订单不存在'));
    }

    if (order.status !== 'pending') {
      return res.status(400).json(db.errorResponse('当前订单状态不支持取消'));
    }

    await db.updateOrder(orderId, { status: 'cancelled' });
    const updatedOrder = await db.getOrderById(orderId);

    return res.json(db.successResponse(serializeOrder(updatedOrder), '订单已取消'));
  } catch (error) {
    console.error('[Tutor cancel order]', error);
    return res.status(500).json(db.errorResponse('取消订单失败'));
  }
};

router.get('/list', async (req, res) => {
  try {
    const { subject, grade, minSalary, maxSalary } = req.query;
    let tutors = await db.getTutors({ status: 'active' });

    if (subject) tutors = tutors.filter((item) => (item.subject || '').includes(subject));
    if (grade) tutors = tutors.filter((item) => item.grade === grade);
    if (minSalary) tutors = tutors.filter((item) => Number(item.salary || 0) >= parseInt(minSalary, 10));
    if (maxSalary) tutors = tutors.filter((item) => Number(item.salary || 0) <= parseInt(maxSalary, 10));

    return res.json(db.successResponse(tutors.map(serializeTutor)));
  } catch (error) {
    console.error('[Tutor list]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const tutor = await db.getTutorById(parseInt(id, 10));

    if (!tutor) {
      return res.status(404).json(db.errorResponse('家教信息不存在'));
    }

    return res.json(db.successResponse(serializeTutor(tutor)));
  } catch (error) {
    console.error('[Tutor detail]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
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

    if (!user) {
      return res.status(400).json(db.errorResponse('用户不存在'));
    }

    const result = await db.createTutor({
      userId,
      name: user.name,
      subject,
      grade,
      salary: parseInt(salary, 10),
      description,
      contact,
      status: 'pending'
    });
    const tutor = await db.getTutorById(result.id);

    return res.json(db.successResponse(serializeTutor(tutor), '家教信息发布成功，等待审核'));
  } catch (error) {
    console.error('[Tutor publish]', error);
    return res.status(500).json(db.errorResponse('发布失败'));
  }
});

router.post('/order', [
  authMiddleware,
  body('tutorId').isInt({ min: 1 }).withMessage('家教ID无效'),
  body('hours').isInt({ min: 1, max: 50 }).withMessage('预约课时需在 1-50 小时之间'),
  body('phone').notEmpty().withMessage('联系电话不能为空'),
  body('address').notEmpty().withMessage('上课地点不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const userId = req.user.id;
  const tutorId = parseInt(req.body.tutorId, 10);
  const hours = parseInt(req.body.hours, 10);
  const { phone, address, remark } = req.body;

  try {
    const tutor = await db.getTutorById(tutorId);

    if (!tutor || tutor.status !== 'active') {
      return res.status(404).json(db.errorResponse('家教信息不存在或暂不可下单'));
    }

    if (Number(tutor.user_id) === Number(userId)) {
      return res.status(400).json(db.errorResponse('不能给自己发布的家教信息下单'));
    }

    const unitPrice = Number(tutor.salary || 0);
    const totalAmount = unitPrice * hours;
    const orderItems = [{
      tutorId: tutor.id,
      tutorName: tutor.name,
      subject: tutor.subject,
      grade: tutor.grade,
      price: unitPrice,
      quantity: hours,
      subtotal: totalAmount,
      unit: '小时'
    }];

    const result = await db.createOrder({
      userId,
      type: 'tutor',
      items: orderItems,
      totalAmount,
      address,
      phone,
      remark: remark || '',
      status: 'pending'
    });

    return res.json(db.successResponse({
      orderId: result.id,
      totalAmount
    }, '下单成功'));
  } catch (error) {
    console.error('[Tutor order]', error);
    return res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.getOrders({ user_id: userId, type: 'tutor' });
    return res.json(db.successResponse(rows.map(serializeOrder).reverse()));
  } catch (error) {
    console.error('[Tutor orders]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.put('/orders/:id/cancel', authMiddleware, async (req, res) => {
  return cancelUserOrder(req, res, 'tutor');
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const tutors = await db.getTutors({ user_id: userId });
    return res.json(db.successResponse(tutors.map(serializeTutor)));
  } catch (error) {
    console.error('[Tutor my]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
