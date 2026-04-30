const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const serializeItem = (item) => ({
  id: item.id,
  userId: item.user_id,
  title: item.title,
  category: item.category,
  price: item.price,
  description: item.description,
  images: JSON.parse(item.images || '[]'),
  status: item.status,
  createdAt: item.created_at
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

    if (order.payment_status === 'paid') {
      return res.status(400).json(db.errorResponse('订单已支付，暂不支持线上取消，请联系管理员处理'));
    }

    const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
    const itemId = items[0]?.itemId;
    if (itemId) {
      await db.updateSecondhandItem(Number(itemId), { status: 'active' });
    }

    await db.updateOrder(orderId, { status: 'cancelled' });
    const updatedOrder = await db.getOrderById(orderId);

    return res.json(db.successResponse(serializeOrder(updatedOrder), '订单已取消'));
  } catch (error) {
    console.error('[Secondhand cancel order]', error);
    return res.status(500).json(db.errorResponse('取消订单失败'));
  }
};

router.get('/list', async (req, res) => {
  const { category, keyword } = req.query;

  try {
    let query = 'SELECT * FROM secondhand_items WHERE status = ?';
    const params = ['active'];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [rows] = await DatabaseAdapter.query(query, params);
    return res.json(db.successResponse((rows || []).map(serializeItem)));
  } catch (error) {
    console.error('[Secondhand list]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const item = await db.getSecondhandItemById(parseInt(id, 10));

    if (!item) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    return res.json(db.successResponse(serializeItem(item)));
  } catch (error) {
    console.error('[Secondhand detail]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/publish', [
  authMiddleware,
  body('title').notEmpty().withMessage('标题不能为空'),
  body('category').notEmpty().withMessage('分类不能为空'),
  body('price').isFloat({ min: 0 }).withMessage('价格不能为负数'),
  body('description').notEmpty().withMessage('描述不能为空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(db.errorResponse(errors.array()[0].msg));
  }

  try {
    const { title, category, price, description, images } = req.body;
    const userId = req.user.id;

    const result = await db.createSecondhandItem({
      userId,
      title,
      category,
      price,
      description,
      images: images || [],
      status: 'pending'
    });

    return res.json(db.successResponse({
      id: result.id,
      userId,
      title,
      category,
      price,
      description,
      images: images || [],
      status: 'pending',
      createdAt: new Date().toISOString()
    }, '商品发布成功，等待审核'));
  } catch (error) {
    console.error('[Secondhand publish]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/order', [
  authMiddleware,
  body('itemId').isInt({ min: 1 }).withMessage('商品ID无效'),
  body('phone').notEmpty().withMessage('联系电话不能为空'),
  body('address').notEmpty().withMessage('交易地点不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const userId = req.user.id;
  const itemId = parseInt(req.body.itemId, 10);
  const { phone, address, remark } = req.body;

  try {
    const item = await db.getSecondhandItemById(itemId);

    if (!item || item.status !== 'active') {
      return res.status(404).json(db.errorResponse('商品不存在或暂不可下单'));
    }

    if (Number(item.user_id) === Number(userId)) {
      return res.status(400).json(db.errorResponse('不能给自己发布的商品下单'));
    }

    const totalAmount = Number(item.price || 0);
    const orderItems = [{
      itemId: item.id,
      title: item.title,
      category: item.category,
      price: totalAmount,
      quantity: 1,
      subtotal: totalAmount
    }];

    const result = await db.createOrder({
      userId,
      type: 'secondhand',
      items: orderItems,
      totalAmount,
      address,
      phone,
      remark: remark || '',
      status: 'pending'
    });

    await db.updateSecondhandItem(itemId, { status: 'sold' });

    return res.json(db.successResponse({
      orderId: result.id,
      totalAmount
    }, '下单成功'));
  } catch (error) {
    console.error('[Secondhand order]', error);
    return res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.getOrders({ user_id: userId, type: 'secondhand' });
    return res.json(db.successResponse(rows.map(serializeOrder).reverse()));
  } catch (error) {
    console.error('[Secondhand orders]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.put('/orders/:id/cancel', authMiddleware, async (req, res) => {
  return cancelUserOrder(req, res, 'secondhand');
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const items = await db.getSecondhandItems({ user_id: userId });
    return res.json(db.successResponse(items.map(serializeItem)));
  } catch (error) {
    console.error('[Secondhand my]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/favorites', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const favorites = await DatabaseAdapter.select('user_favorites', { user_id: userId, type: 'secondhand' }, 'item_id');
    const favoriteIds = favorites.map((item) => item.item_id);

    if (favoriteIds.length === 0) {
      return res.json(db.successResponse([]));
    }

    const [rows] = await DatabaseAdapter.query(
      'SELECT * FROM secondhand_items WHERE id IN (?) AND status = ?',
      [favoriteIds, 'active']
    );

    return res.json(db.successResponse((rows || []).map(serializeItem)));
  } catch (error) {
    console.error('[Secondhand favorites]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/favorite/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const item = await db.getSecondhandItemById(parseInt(id, 10));

    if (!item) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    await db.addFavorite(userId, 'secondhand', parseInt(id, 10));
    return res.json(db.successResponse(null, '收藏成功'));
  } catch (error) {
    console.error('[Secondhand favorite]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.delete('/favorite/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await db.removeFavorite(userId, 'secondhand', parseInt(id, 10));
    return res.json(db.successResponse(null, '取消收藏成功'));
  } catch (error) {
    console.error('[Secondhand unfavorite]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
