const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const rows = await db.getSupermarketCategories({});
    const categories = rows.map(c => ({ id: c.id, name: c.name, icon: c.icon, parentId: c.parent_id }));
    res.json(db.successResponse(categories));
  } catch (error) {
    console.error('[Supermarket categories]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/products', async (req, res) => {
  try {
    const { categoryId, keyword } = req.query;
    const where = { status: 'active' };
    if (categoryId) where.category_id = parseInt(categoryId);
    let products = await db.getSupermarketProducts(where);
    if (keyword) {
      products = products.filter(p => (p.name || '').includes(keyword));
    }
    res.json(db.successResponse(products.map(p => ({ ...p, categoryId: p.category_id }))));
  } catch (error) {
    console.error('[Supermarket products]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await db.getSupermarketProductById(parseInt(id));
    if (!product) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }
    res.json(db.successResponse({ ...product, categoryId: product.category_id }));
  } catch (error) {
    console.error('[Supermarket product]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/cart/add', [
  authMiddleware,
  body('productId').notEmpty().withMessage('商品ID不能为空'),
  body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    const product = await db.getSupermarketProductById(parseInt(productId));
    if (!product) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }
    if (product.stock < quantity) {
      return res.status(400).json(db.errorResponse('库存不足'));
    }
    await db.addToCart(userId, parseInt(productId), quantity);
    res.json(db.successResponse(null, '已加入购物车'));
  } catch (error) {
    if (error.message === '数据已存在') {
      const cartItems = await db.getCartItems(userId);
      const existing = cartItems.find(i => i.product_id === parseInt(productId));
      const newQty = (existing ? existing.quantity : 0) + quantity;
      const product = await db.getSupermarketProductById(parseInt(productId));
      if (product.stock < newQty) return res.status(400).json(db.errorResponse('库存不足'));
      if (existing) {
        await db.updateCartItem(userId, parseInt(productId), newQty);
      }
      return res.json(db.successResponse(null, '已加入购物车'));
    }
    console.error('[Cart add]', error);
    res.status(500).json(db.errorResponse('加入购物车失败'));
  }
});

router.get('/cart', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await db.getCartItems(userId);
    const items = rows.map(r => ({
      productId: r.product_id,
      productName: r.name,
      price: r.price,
      quantity: r.quantity,
      subtotal: Number(r.price) * r.quantity,
      image: r.image,
      stock: r.stock
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);
    res.json(db.successResponse({ items, totalAmount }));
  } catch (error) {
    console.error('[Cart get]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.put('/cart/update', [
  authMiddleware,
  body('productId').notEmpty().withMessage('商品ID不能为空'),
  body('quantity').isInt({ min: 0 }).withMessage('数量不能为负数')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    if (quantity === 0) {
      await db.deleteCartItem(userId, parseInt(productId));
      const rows = await db.getCartItems(userId);
      const items = rows.map(r => ({
        productId: r.product_id,
        productName: r.name,
        price: r.price,
        quantity: r.quantity,
        subtotal: Number(r.price) * r.quantity
      }));
      return res.json(db.successResponse({ items, totalAmount: items.reduce((s, i) => s + i.subtotal, 0) }, '购物车更新成功'));
    }
    const product = await db.getSupermarketProductById(parseInt(productId));
    if (!product) return res.status(404).json(db.errorResponse('商品不存在'));
    if (product.stock < quantity) return res.status(400).json(db.errorResponse('库存不足'));
    await db.updateCartItem(userId, parseInt(productId), quantity);
    const rows = await db.getCartItems(userId);
    const items = rows.map(r => ({
      productId: r.product_id,
      productName: r.name,
      price: r.price,
      quantity: r.quantity,
      subtotal: Number(r.price) * r.quantity
    }));
    res.json(db.successResponse({ items, totalAmount: items.reduce((s, i) => s + i.subtotal, 0) }, '购物车更新成功'));
  } catch (error) {
    console.error('[Cart update]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/cart/remove', [
  authMiddleware,
  body('productId').notEmpty().withMessage('商品ID不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { productId } = req.body;
  const userId = req.user.id;

  try {
    await db.deleteCartItem(userId, parseInt(productId));
    const rows = await db.getCartItems(userId);
    const items = rows.map(r => ({
      productId: r.product_id,
      productName: r.name,
      price: r.price,
      quantity: r.quantity,
      subtotal: Number(r.price) * r.quantity
    }));
    res.json(db.successResponse({ items, totalAmount: items.reduce((s, i) => s + i.subtotal, 0) }, '商品已从购物车移除'));
  } catch (error) {
    console.error('[Cart remove]', error);
    res.status(500).json(db.errorResponse('操作失败'));
  }
});

router.post('/checkout', [
  authMiddleware,
  body('address').notEmpty().withMessage('收货地址不能为空'),
  body('phone').notEmpty().withMessage('联系电话不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { address, phone, remark } = req.body;
  const userId = req.user.id;

  try {
    const cartRows = await db.getCartItems(userId);
    if (!cartRows || cartRows.length === 0) {
      return res.status(400).json(db.errorResponse('购物车为空'));
    }
    const items = cartRows.map(r => ({
      productId: r.product_id,
      productName: r.name,
      price: r.price,
      quantity: r.quantity,
      subtotal: Number(r.price) * r.quantity
    }));
    const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

    for (const item of cartRows) {
      const product = await db.getSupermarketProductById(item.product_id);
      if (product.stock < item.quantity) {
        return res.status(400).json(db.errorResponse(`${product.name} 库存不足`));
      }
    }

    const result = await db.createOrder({
      userId,
      type: 'supermarket',
      items,
      totalAmount,
      address,
      phone,
      remark: remark || '',
      status: 'pending'
    });

    for (const item of cartRows) {
      const product = await db.getSupermarketProductById(item.product_id);
      await db.updateSupermarketProduct(product.id, { stock: product.stock - item.quantity });
    }
    await db.clearCart(userId);

    res.json(db.successResponse({ orderId: result.id, totalAmount }, '下单成功'));
  } catch (error) {
    console.error('[Checkout]', error);
    res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await db.getOrders({ user_id: userId, type: 'supermarket' });
    const orders = rows.map(o => ({
      ...o,
      userId: o.user_id,
      totalAmount: o.total_amount,
      items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items,
      createdAt: o.created_at
    }));
    res.json(db.successResponse(orders.reverse()));
  } catch (error) {
    console.error('[Supermarket orders]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/order/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const order = await db.getOrderById(parseInt(id));
    if (!order || order.user_id !== userId) {
      return res.status(404).json(db.errorResponse('订单不存在'));
    }
    res.json(db.successResponse({
      ...order,
      userId: order.user_id,
      totalAmount: order.total_amount,
      items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items,
      createdAt: order.created_at
    }));
  } catch (error) {
    console.error('[Supermarket order]', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
