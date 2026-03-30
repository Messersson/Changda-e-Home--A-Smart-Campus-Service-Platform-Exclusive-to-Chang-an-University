const express = require('express');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/list', async (req, res) => {
  try {
    const schools = await db.getDrivingSchools({ status: 'active' });
    
    // 格式化数据
    const formattedSchools = schools.map(school => ({
      id: school.id,
      name: school.name,
      address: school.address,
      phone: school.phone,
      price: school.price,
      description: school.description,
      features: JSON.parse(school.features || '[]'),
      status: school.status
    }));

    res.json(db.successResponse(formattedSchools));
  } catch (error) {
    console.error('获取驾校列表失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const school = await db.getDrivingSchoolById(parseInt(id));
    
    if (!school) {
      return res.status(404).json(db.errorResponse('驾校不存在'));
    }

    // 格式化数据
    const formattedSchool = {
      id: school.id,
      name: school.name,
      address: school.address,
      phone: school.phone,
      price: school.price,
      description: school.description,
      features: JSON.parse(school.features || '[]'),
      status: school.status
    };

    res.json(db.successResponse(formattedSchool));
  } catch (error) {
    console.error('获取驾校详情失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.post('/inquiry', [
  authMiddleware,
], async (req, res) => {
  const { schoolId, name, phone, question } = req.body;
  const userId = req.user.id;

  try {
    // 检查驾校是否存在
    const school = await db.getDrivingSchoolById(parseInt(schoolId));
    
    if (!school) {
      return res.status(404).json(db.errorResponse('驾校不存在'));
    }

    // 提交咨询
    await db.createDrivingInquiry({
      userId,
      schoolId: parseInt(schoolId),
      name: name || '',
      phone: phone || '',
      question: question || '',
      status: 'pending'
    });

    res.json(db.successResponse(null, '咨询提交成功'));
  } catch (error) {
    console.error('提交咨询失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

router.get('/my-inquiries', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const [inquiries] = await DatabaseAdapter.query(
      'SELECT * FROM driving_inquiries WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    // 格式化数据
    const formattedInquiries = (inquiries || []).map(inquiry => ({
      id: inquiry.id,
      userId: inquiry.user_id,
      schoolId: inquiry.school_id,
      name: inquiry.name,
      phone: inquiry.phone,
      question: inquiry.question,
      status: inquiry.status,
      createdAt: inquiry.created_at
    }));

    res.json(db.successResponse(formattedInquiries));
  } catch (error) {
    console.error('获取我的咨询失败:', error);
    res.status(500).json(db.errorResponse('服务器内部错误'));
  }
});

module.exports = router;
