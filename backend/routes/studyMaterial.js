const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/list', async (req, res) => {
  const { major, grade, subject } = req.query;
  try {
    let query = 'SELECT * FROM study_materials WHERE status = ?';
    let params = ['active'];

    if (major) {
      query += ' AND major = ?';
      params.push(major);
    }

    if (grade) {
      query += ' AND grade = ?';
      params.push(grade);
    }

    if (subject) {
      query += ' AND subject LIKE ?';
      params.push(`%${subject}%`);
    }

    const [rows] = await DatabaseAdapter.query(query, params);
    const materials = rows || [];

    // 格式化数据
    const formattedMaterials = materials.map(material => ({
      id: material.id,
      title: material.title,
      major: material.major,
      grade: material.grade,
      subject: material.subject,
      type: material.type,
      size: material.size,
      downloadCount: material.download_count,
      uploaderId: material.uploader_id,
      uploaderName: material.uploader_name,
      description: material.description,
      status: material.status,
      createdAt: material.created_at
    }));

    res.json(db.successResponse(formattedMaterials));
  } catch (error) {
    console.error('获取学习资料列表失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const material = await db.getStudyMaterialById(parseInt(id));
    
    if (!material) {
      return res.status(404).json(db.errorResponse('资料不存在'));
    }

    // 格式化数据
    const formattedMaterial = {
      id: material.id,
      title: material.title,
      major: material.major,
      grade: material.grade,
      subject: material.subject,
      type: material.type,
      size: material.size,
      downloadCount: material.download_count,
      uploaderId: material.uploader_id,
      uploaderName: material.uploader_name,
      description: material.description,
      status: material.status,
      createdAt: material.created_at
    };

    res.json(db.successResponse(formattedMaterial));
  } catch (error) {
    console.error('获取资料详情失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/upload', [
  authMiddleware,
  body('title').notEmpty().withMessage('标题不能为空'),
  body('major').notEmpty().withMessage('专业不能为空'),
  body('grade').notEmpty().withMessage('年级不能为空'),
  body('subject').notEmpty().withMessage('学科不能为空'),
  body('description').notEmpty().withMessage('描述不能为空')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(db.errorResponse(errors.array()[0].msg));
  }

  try {
    const { title, major, grade, subject, description, type, size } = req.body;
    const userId = req.user.id;

    // 获取用户信息
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json(db.errorResponse('用户不存在'));
    }

    // 上传资料
    await db.createStudyMaterial({
      title,
      major,
      grade,
      subject,
      type: type || 'pdf',
      size: size || '0MB',
      uploaderId: userId,
      uploaderName: user.name,
      description,
      status: 'pending'
    });

    const material = {
      id: Date.now(), // 临时ID，实际以数据库为准
      title,
      major,
      grade,
      subject,
      type: type || 'pdf',
      size: size || '0MB',
      downloadCount: 0,
      uploaderId: userId,
      uploaderName: user.name,
      description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    res.json(db.successResponse(material, '资料上传成功，等待审核'));
  } catch (error) {
    console.error('上传资料失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const materials = await db.getStudyMaterials({ uploader_id: userId });
    
    // 格式化数据
    const formattedMaterials = materials.map(material => ({
      id: material.id,
      title: material.title,
      major: material.major,
      grade: material.grade,
      subject: material.subject,
      type: material.type,
      size: material.size,
      downloadCount: material.download_count,
      uploaderId: material.uploader_id,
      uploaderName: material.uploader_name,
      description: material.description,
      status: material.status,
      createdAt: material.created_at
    }));

    res.json(db.successResponse(formattedMaterials));
  } catch (error) {
    console.error('获取我的资料失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/download/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    // 检查资料是否存在
    const material = await db.getStudyMaterialById(parseInt(id));
    
    if (!material) {
      return res.status(404).json(db.errorResponse('资料不存在'));
    }

    // 增加下载次数
    await db.incrementDownloadCount(parseInt(id));

    res.json(db.successResponse({ downloadCount: (material.download_count || 0) + 1 }, '下载成功'));
  } catch (error) {
    console.error('下载资料失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
