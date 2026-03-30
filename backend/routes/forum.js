const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', async (req, res) => {
  const categories = [
    { id: 'study', name: '学习', icon: '📚' },
    { id: 'life', name: '生活', icon: '🌟' },
    { id: 'idle', name: '闲置', icon: '🔄' },
    { id: 'activity', name: '活动', icon: '🎉' }
  ];

  res.json(db.successResponse(categories));
});

router.get('/list', async (req, res) => {
  const { category, keyword } = req.query;
  try {
    let query = 'SELECT * FROM forum_posts WHERE status = ?';
    let params = ['active'];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await DatabaseAdapter.query(query, params);
    const posts = rows || [];
    
    // 格式化数据
    const formattedPosts = posts.map(post => ({
      id: post.id,
      userId: post.user_id,
      userName: post.user_name,
      title: post.title,
      content: post.content,
      category: post.category,
      images: JSON.parse(post.images || '[]'),
      likes: post.likes || 0,
      comments: [], // 评论需要单独获取
      status: post.status,
      createdAt: post.created_at
    }));

    res.json(db.successResponse(formattedPosts));
  } catch (error) {
    console.error('获取论坛帖子列表失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const post = await db.getForumPostById(parseInt(id));
    
    if (!post) {
      return res.status(404).json(db.errorResponse('帖子不存在'));
    }

    // 获取评论
    const comments = await db.getForumComments(parseInt(id));
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      userId: comment.user_id,
      userName: comment.user_name,
      content: comment.content,
      createdAt: comment.created_at
    }));

    // 格式化数据
    const formattedPost = {
      id: post.id,
      userId: post.user_id,
      userName: post.user_name,
      title: post.title,
      content: post.content,
      category: post.category,
      images: JSON.parse(post.images || '[]'),
      likes: post.likes || 0,
      comments: formattedComments,
      status: post.status,
      createdAt: post.created_at
    };

    res.json(db.successResponse(formattedPost));
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/publish', [
  authMiddleware,
  body('title').notEmpty().withMessage('标题不能为空'),
  body('content').notEmpty().withMessage('内容不能为空'),
  body('category').notEmpty().withMessage('分类不能为空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(db.errorResponse(errors.array()[0].msg));
  }

  try {
    const { title, content, category, images } = req.body;
    const userId = req.user.id;

    // 获取用户信息
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json(db.errorResponse('用户不存在'));
    }

    // 发布帖子
    await db.createForumPost({
      userId,
      userName: user.name,
      title,
      content,
      category,
      images: images || [],
      status: 'pending'
    });

    const post = {
      id: Date.now(), // 临时ID，实际以数据库为准
      userId,
      userName: user.name,
      title,
      content,
      category,
      images: images || [],
      likes: 0,
      comments: [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    res.json(db.successResponse(post, '帖子发布成功，等待审核'));
  } catch (error) {
    console.error('发布帖子失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/like/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    // 检查帖子是否存在
    const post = await db.getForumPostById(parseInt(id));
    
    if (!post) {
      return res.status(404).json(db.errorResponse('帖子不存在'));
    }

    // 增加点赞数
    await db.incrementPostLikes(parseInt(id));

    res.json(db.successResponse({ likes: (post.likes || 0) + 1 }, '点赞成功'));
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/comment/:id', [
  authMiddleware,
  body('content').notEmpty().withMessage('评论内容不能为空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(db.errorResponse(errors.array()[0].msg));
  }

  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    // 检查帖子是否存在
    const post = await db.getForumPostById(parseInt(id));
    
    if (!post) {
      return res.status(404).json(db.errorResponse('帖子不存在'));
    }

    // 获取用户信息
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json(db.errorResponse('用户不存在'));
    }

    // 发表评论
    const result = await db.createForumComment({
      postId: parseInt(id),
      userId,
      userName: user.name,
      content
    });

    const comment = {
      id: result.id,
      userId,
      userName: user.name,
      content,
      createdAt: new Date().toISOString()
    };

    res.json(db.successResponse(comment, '评论成功'));
  } catch (error) {
    console.error('发表评论失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const posts = await db.getForumPosts({ user_id: userId });
    
    // 格式化数据
    const formattedPosts = posts.map(post => ({
      id: post.id,
      userId: post.user_id,
      userName: post.user_name,
      title: post.title,
      content: post.content,
      category: post.category,
      images: JSON.parse(post.images || '[]'),
      likes: post.likes || 0,
      comments: [], // 评论需要单独获取
      status: post.status,
      createdAt: post.created_at
    }));

    // 按创建时间倒序排序
    formattedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(db.successResponse(formattedPosts));
  } catch (error) {
    console.error('获取我的帖子失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
