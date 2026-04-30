const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const serializeOrder = (order) => ({
  ...order,
  userId: order.user_id,
  totalAmount: Number(order.total_amount || 0),
  items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []),
  createdAt: order.created_at
});

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

router.get('/categories', async (req, res) => {
  try {
    const rows = await db.getSupermarketCategories({});
    const categories = rows.map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      parentId: item.parent_id
    }));

    return res.json(db.successResponse(categories));
  } catch (error) {
    console.error('[Supermarket categories]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/products', async (req, res) => {
  try {
    const { categoryId, keyword } = req.query;
    const where = { status: 'active' };

    if (categoryId) {
      where.category_id = parseInt(categoryId, 10);
    }

    let products = await db.getSupermarketProducts(where);
    if (keyword) {
      products = products.filter((item) => (item.name || '').includes(keyword));
    }

    return res.json(db.successResponse(products.map((item) => ({
      ...item,
      categoryId: item.category_id
    }))));
  } catch (error) {
    console.error('[Supermarket products]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/product/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.getSupermarketProductById(parseInt(id, 10));

    if (!product) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    return res.json(db.successResponse({
      ...product,
      categoryId: product.category_id
    }));
  } catch (error) {
    console.error('[Supermarket product]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
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
    const product = await db.getSupermarketProductById(parseInt(productId, 10));

    if (!product) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    if (product.stock < quantity) {
      return res.status(400).json(db.errorResponse('库存不足'));
    }

    await db.addToCart(userId, parseInt(productId, 10), quantity);
    return res.json(db.successResponse(null, '已加入购物车'));
  } catch (error) {
    if (error.message === '数据已存在') {
      const cartItems = await db.getCartItems(userId);
      const existing = cartItems.find((item) => item.product_id === parseInt(productId, 10));
      const newQuantity = (existing ? existing.quantity : 0) + quantity;
      const product = await db.getSupermarketProductById(parseInt(productId, 10));

      if (product.stock < newQuantity) {
        return res.status(400).json(db.errorResponse('库存不足'));
      }

      if (existing) {
        await db.updateCartItem(userId, parseInt(productId, 10), newQuantity);
      }

      return res.json(db.successResponse(null, '已加入购物车'));
    }

    console.error('[Cart add]', error);
    return res.status(500).json(db.errorResponse('加入购物车失败'));
  }
});

router.get('/cart', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.getCartItems(userId);
    const items = rows.map((item) => ({
      productId: item.product_id,
      productName: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.price) * item.quantity,
      image: item.image,
      stock: item.stock
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    return res.json(db.successResponse({ items, totalAmount }));
  } catch (error) {
    console.error('[Cart get]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
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
      await db.deleteCartItem(userId, parseInt(productId, 10));
      const rows = await db.getCartItems(userId);
      const items = rows.map((item) => ({
        productId: item.product_id,
        productName: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.price) * item.quantity
      }));

      return res.json(db.successResponse({
        items,
        totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0)
      }, '购物车更新成功'));
    }

    const product = await db.getSupermarketProductById(parseInt(productId, 10));
    if (!product) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    if (product.stock < quantity) {
      return res.status(400).json(db.errorResponse('库存不足'));
    }

    await db.updateCartItem(userId, parseInt(productId, 10), quantity);

    const rows = await db.getCartItems(userId);
    const items = rows.map((item) => ({
      productId: item.product_id,
      productName: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.price) * item.quantity
    }));

    return res.json(db.successResponse({
      items,
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0)
    }, '购物车更新成功'));
  } catch (error) {
    console.error('[Cart update]', error);
    return res.status(500).json(db.errorResponse('更新失败'));
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
    await db.deleteCartItem(userId, parseInt(productId, 10));

    const rows = await db.getCartItems(userId);
    const items = rows.map((item) => ({
      productId: item.product_id,
      productName: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.price) * item.quantity
    }));

    return res.json(db.successResponse({
      items,
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0)
    }, '商品已从购物车移除'));
  } catch (error) {
    console.error('[Cart remove]', error);
    return res.status(500).json(db.errorResponse('操作失败'));
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
    const result = await DatabaseAdapter.transaction(async (connection) => {
      const [cartRows] = await connection.query(
        `SELECT
           cart_items.product_id,
           cart_items.quantity,
           supermarket_products.name,
           supermarket_products.price,
           supermarket_products.stock
         FROM cart_items
         INNER JOIN supermarket_products
           ON cart_items.product_id = supermarket_products.id
         WHERE cart_items.user_id = ?
         FOR UPDATE`,
        [userId]
      );

      if (!cartRows || cartRows.length === 0) {
        throw createHttpError(400, '购物车为空');
      }

      const items = cartRows.map((item) => ({
        productId: item.product_id,
        productName: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.price) * item.quantity
      }));
      const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

      for (const item of cartRows) {
        if (Number(item.stock || 0) < Number(item.quantity || 0)) {
          throw createHttpError(400, `${item.name} 库存不足`);
        }
      }

      const [orderResult] = await connection.query(
        `INSERT INTO orders (user_id, type, items, total_amount, address, phone, remark, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          'supermarket',
          JSON.stringify(items),
          totalAmount,
          address,
          phone,
          remark || '',
          'pending'
        ]
      );

      for (const item of cartRows) {
        await connection.query(
          'UPDATE supermarket_products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      await connection.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);

      return {
        orderId: orderResult.insertId,
        totalAmount
      };
    });

    return res.json(db.successResponse(result, '下单成功'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(db.errorResponse(error.message));
    }

    console.error('[Checkout]', error);
    return res.status(500).json(db.errorResponse('下单失败'));
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.getOrders({ user_id: userId, type: 'supermarket' });
    const orders = rows.map(serializeOrder).reverse();
    return res.json(db.successResponse(orders));
  } catch (error) {
    console.error('[Supermarket orders]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.put('/orders/:id/cancel', authMiddleware, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const updatedOrder = await DatabaseAdapter.transaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT * FROM orders WHERE id = ? AND user_id = ? AND type = ? FOR UPDATE',
        [orderId, userId, 'supermarket']
      );
      const order = rows[0];

      if (!order) {
        throw createHttpError(404, '订单不存在');
      }

      if (order.status !== 'pending') {
        throw createHttpError(400, '当前订单状态不支持取消');
      }

      if (order.payment_status === 'paid') {
        throw createHttpError(400, '订单已支付，暂不支持线上取消，请联系管理员处理');
      }

      const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);

      for (const item of items) {
        const [productRows] = await connection.query(
          'SELECT id, stock FROM supermarket_products WHERE id = ? FOR UPDATE',
          [item.productId]
        );
        const product = productRows[0];

        if (!product) {
          continue;
        }

        await connection.query(
          'UPDATE supermarket_products SET stock = ? WHERE id = ?',
          [Number(product.stock || 0) + Number(item.quantity || 0), product.id]
        );
      }

      await connection.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        ['cancelled', orderId]
      );

      const [updatedRows] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      return updatedRows[0];
    });

    return res.json(db.successResponse(serializeOrder(updatedOrder), '订单已取消'));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(db.errorResponse(error.message));
    }

    console.error('[Supermarket cancel order]', error);
    return res.status(500).json(db.errorResponse('取消订单失败'));
  }
});

router.get('/order/:id', authMiddleware, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  try {
    const order = await db.getOrderById(orderId);

    if (!order || order.user_id !== userId || order.type !== 'supermarket') {
      return res.status(404).json(db.errorResponse('订单不存在'));
    }

    return res.json(db.successResponse(serializeOrder(order)));
  } catch (error) {
    console.error('[Supermarket order]', error);
    return res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
