const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/list', async (req, res) => {
  const { category, keyword } = req.query;
  try {
    let query = 'SELECT * FROM secondhand_items WHERE status = ?';
    let params = ['active'];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [rows] = await DatabaseAdapter.query(query, params);
    const items = rows || [];
    
    // 格式化数据
    const formattedItems = items.map(item => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      category: item.category,
      price: item.price,
      description: item.description,
      images: JSON.parse(item.images || '[]'),
      status: item.status,
      createdAt: item.created_at
    }));

    res.json(db.successResponse(formattedItems));
  } catch (error) {
    console.error('获取二手商品列表失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const item = await db.getSecondhandItemById(parseInt(id));
    
    if (!item) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    // 格式化数据
    const formattedItem = {
      id: item.id,
      userId: item.user_id,
      title: item.title,
      category: item.category,
      price: item.price,
      description: item.description,
      images: JSON.parse(item.images || '[]'),
      status: item.status,
      createdAt: item.created_at
    };

    res.json(db.successResponse(formattedItem));
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
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

    const item = {
      id: result.id,
      userId,
      title,
      category,
      price,
      description,
      images: images || [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    res.json(db.successResponse(item, '商品发布成功，等待审核'));
  } catch (error) {
    console.error('发布商品失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const items = await db.getSecondhandItems({ user_id: userId });
    
    // 格式化数据
    const formattedItems = items.map(item => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      category: item.category,
      price: item.price,
      description: item.description,
      images: JSON.parse(item.images || '[]'),
      status: item.status,
      createdAt: item.created_at
    }));

    res.json(db.successResponse(formattedItems));
  } catch (error) {
    console.error('获取我的商品失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/favorites', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    // 获取用户收藏的商品ID
    const favorites = await DatabaseAdapter.select('user_favorites', { user_id: userId, type: 'secondhand' }, 'item_id');
    const favoriteIds = favorites.map(f => f.item_id);

    if (favoriteIds.length === 0) {
      return res.json(db.successResponse([]));
    }

    // 获取收藏的商品详情
    const [rows] = await DatabaseAdapter.query(
      'SELECT * FROM secondhand_items WHERE id IN (?) AND status = ?',
      [favoriteIds, 'active']
    );

    const items = rows || [];

    // 格式化数据
    const formattedItems = items.map(item => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      category: item.category,
      price: item.price,
      description: item.description,
      images: JSON.parse(item.images || '[]'),
      status: item.status,
      createdAt: item.created_at
    }));

    res.json(db.successResponse(formattedItems));
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/favorite/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 检查商品是否存在
    const item = await db.getSecondhandItemById(parseInt(id));
    if (!item) {
      return res.status(404).json(db.errorResponse('商品不存在'));
    }

    // 添加收藏
    await db.addFavorite(userId, 'secondhand', parseInt(id));
    res.json(db.successResponse(null, '收藏成功'));
  } catch (error) {
    console.error('收藏商品失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.delete('/favorite/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 取消收藏
    await db.removeFavorite(userId, 'secondhand', parseInt(id));
    res.json(db.successResponse(null, '取消收藏成功'));
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
