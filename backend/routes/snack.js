const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/merchants', async (req, res) => {
  try {
    const snacks = await db.getSnacks({ status: 'active' });
    const merchants = [...new Set(snacks.map(s => s.merchant))];
    res.json(db.successResponse(merchants));
  } catch (error) {
    console.error('[Snack merchants]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/list', async (req, res) => {
  try {
    const { merchant } = req.query;
    let snacks = await db.getSnacks({ status: 'active' });
    if (merchant) {
      snacks = snacks.filter(s => s.merchant === merchant);
    }
    res.json(db.successResponse(snacks));
  } catch (error) {
    console.error('[Snack list]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const snack = await db.getSnackById(parseInt(id));
    if (!snack) {
      return res.status(404).json(db.errorResponse('菜品不存在'));
    }
    res.json(db.successResponse(snack));
  } catch (error) {
    console.error('[Snack detail]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
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
      return res.status(400).json(db.errorResponse(`菜品ID ${item.snackId} 不存在`));
    }
    totalAmount += Number(snack.price) * item.quantity;
    orderItems.push({
      snackId: snack.id,
      snackName: snack.name,
      price: snack.price,
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
    res.json(db.successResponse({ orderId: result.id, totalAmount }, '下单成功'));
  } catch (error) {
    console.error('[Snack order]', error);
    res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await db.getOrders({ user_id: userId, type: 'snack' });
    const orders = rows.map(o => ({
      ...o,
      userId: o.user_id,
      totalAmount: o.total_amount,
      items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items,
      createdAt: o.created_at
    }));
    res.json(db.successResponse(orders.reverse()));
  } catch (error) {
    console.error('[Snack orders]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
