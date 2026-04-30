const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const serializeOrder = (order) => ({
  ...order,
  userId: order.user_id,
  totalAmount: Number(order.total_amount || 0),
  items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []),
  createdAt: order.created_at
});

router.get('/merchants', async (req, res) => {
  try {
    const snacks = await db.getSnacks({ status: 'active' });
    const merchants = [...new Set(snacks.map((item) => item.merchant))];
    return res.json(db.successResponse(merchants));
  } catch (error) {
    console.error('[Snack merchants]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/list', async (req, res) => {
  try {
    const { merchant } = req.query;
    let snacks = await db.getSnacks({ status: 'active' });

    if (merchant) {
      snacks = snacks.filter((item) => item.merchant === merchant);
    }

    return res.json(db.successResponse(snacks));
  } catch (error) {
    console.error('[Snack list]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const snack = await db.getSnackById(parseInt(id, 10));

    if (!snack) {
      return res.status(404).json(db.errorResponse('菜品不存在'));
    }

    return res.json(db.successResponse(snack));
  } catch (error) {
    console.error('[Snack detail]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/order', [
  authMiddleware,
  body('items').isArray().withMessage('订单项必须为数组'),
  body('items.*.snackId').notEmpty().withMessage('菜品ID不能为空'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须大于0')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { items, remark } = req.body;
  const userId = req.user.id;

  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const snack = await db.getSnackById(item.snackId);

    if (!snack) {
      return res.status(400).json(db.errorResponse(`菜品 ID ${item.snackId} 不存在`));
    }

    totalAmount += Number(snack.price) * item.quantity;
    orderItems.push({
      snackId: snack.id,
      snackName: snack.name,
      price: Number(snack.price),
      quantity: item.quantity,
      subtotal: Number(snack.price) * item.quantity
    });
  }

  try {
    const result = await db.createOrder({
      userId,
      type: 'snack',
      items: orderItems,
      totalAmount,
      remark: remark || '',
      status: 'pending'
    });

    return res.json(db.successResponse({ orderId: result.id, totalAmount }, '下单成功'));
  } catch (error) {
    console.error('[Snack order]', error);
    return res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.getOrders({ user_id: userId, type: 'snack' });
    const orders = rows.map(serializeOrder).reverse();
    return res.json(db.successResponse(orders));
  } catch (error) {
    console.error('[Snack orders]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.put('/orders/:id/cancel', authMiddleware, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const order = await db.getOrderById(orderId);

    if (!order || order.user_id !== userId || order.type !== 'snack') {
      return res.status(404).json(db.errorResponse('订单不存在'));
    }

    if (order.status !== 'pending') {
      return res.status(400).json(db.errorResponse('当前订单状态不支持取消'));
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json(db.errorResponse('订单已支付，暂不支持线上取消，请联系管理员处理'));
    }

    await db.updateOrder(orderId, { status: 'cancelled' });
    const updatedOrder = await db.getOrderById(orderId);

    return res.json(db.successResponse(serializeOrder(updatedOrder), '订单已取消'));
  } catch (error) {
    console.error('[Snack cancel order]', error);
    return res.status(500).json(db.errorResponse('取消订单失败'));
  }
});

module.exports = router;
