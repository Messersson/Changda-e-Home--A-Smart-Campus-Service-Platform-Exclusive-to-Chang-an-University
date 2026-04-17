const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const serializeSchool = (school) => ({
  id: school.id,
  name: school.name,
  address: school.address,
  phone: school.phone,
  price: school.price,
  description: school.description,
  features: JSON.parse(school.features || '[]'),
  status: school.status
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
    console.error('[Driving school cancel order]', error);
    return res.status(500).json(db.errorResponse('取消订单失败'));
  }
};

router.get('/list', async (req, res) => {
  try {
    const schools = await db.getDrivingSchools({ status: 'active' });
    return res.json(db.successResponse(schools.map(serializeSchool)));
  } catch (error) {
    console.error('[Driving school list]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const school = await db.getDrivingSchoolById(parseInt(id, 10));

    if (!school) {
      return res.status(404).json(db.errorResponse('驾校不存在'));
    }

    return res.json(db.successResponse(serializeSchool(school)));
  } catch (error) {
    console.error('[Driving school detail]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/order', [
  authMiddleware,
  body('schoolId').isInt({ min: 1 }).withMessage('驾校ID无效'),
  body('studentName').notEmpty().withMessage('报名姓名不能为空'),
  body('phone').notEmpty().withMessage('联系电话不能为空'),
  body('address').notEmpty().withMessage('报名地点不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const userId = req.user.id;
  const schoolId = parseInt(req.body.schoolId, 10);
  const { studentName, phone, address, remark } = req.body;

  try {
    const school = await db.getDrivingSchoolById(schoolId);

    if (!school || school.status !== 'active') {
      return res.status(404).json(db.errorResponse('驾校不存在或暂不可下单'));
    }

    const totalAmount = Number(school.price || 0);
    const orderItems = [{
      schoolId: school.id,
      schoolName: school.name,
      studentName,
      price: totalAmount,
      quantity: 1,
      subtotal: totalAmount
    }];

    const result = await db.createOrder({
      userId,
      type: 'driving_school',
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
    console.error('[Driving school order]', error);
    return res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.getOrders({ user_id: userId, type: 'driving_school' });
    return res.json(db.successResponse(rows.map(serializeOrder).reverse()));
  } catch (error) {
    console.error('[Driving school orders]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.put('/orders/:id/cancel', authMiddleware, async (req, res) => {
  return cancelUserOrder(req, res, 'driving_school');
});

router.post('/inquiry', [
  authMiddleware
], async (req, res) => {
  const { schoolId, name, phone, question } = req.body;
  const userId = req.user.id;

  try {
    const school = await db.getDrivingSchoolById(parseInt(schoolId, 10));

    if (!school) {
      return res.status(404).json(db.errorResponse('驾校不存在'));
    }

    await db.createDrivingInquiry({
      userId,
      schoolId: parseInt(schoolId, 10),
      name: name || '',
      phone: phone || '',
      question: question || '',
      status: 'pending'
    });

    return res.json(db.successResponse(null, '咨询提交成功'));
  } catch (error) {
    console.error('[Driving school inquiry]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/my-inquiries', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const [inquiries] = await DatabaseAdapter.query(
      'SELECT * FROM driving_inquiries WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const formattedInquiries = (inquiries || []).map((inquiry) => ({
      id: inquiry.id,
      userId: inquiry.user_id,
      schoolId: inquiry.school_id,
      name: inquiry.name,
      phone: inquiry.phone,
      question: inquiry.question,
      status: inquiry.status,
      createdAt: inquiry.created_at
    }));

    return res.json(db.successResponse(formattedInquiries));
  } catch (error) {
    console.error('[Driving school inquiries]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
