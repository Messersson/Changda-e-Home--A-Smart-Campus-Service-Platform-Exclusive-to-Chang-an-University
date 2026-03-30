const express = require('express');
const { body } = require('express-validator');
const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware, adminAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(db.successResponse(stats));
  } catch (error) {
    console.error('[Admin Stats]', error);
    res.status(500).json(db.errorResponse('获取统计数据失败'));
  }
});

router.get('/users', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { keyword } = req.query;
    let rows = await db.getUsers({});
    if (keyword) {
      const k = String(keyword).trim().toLowerCase();
      rows = rows.filter(u =>
        (u.name && u.name.toLowerCase().includes(k)) ||
        (u.student_id && u.student_id.toString().includes(k)) ||
        (u.email && u.email.toLowerCase().includes(k))
      );
    }
    const users = rows.map(u => ({
      id: u.id,
      studentId: u.student_id,
      name: u.name,
      email: u.email,
      major: u.major,
      grade: u.grade,
      status: u.status
    }));
    res.json(db.successResponse(users));
  } catch (error) {
    console.error('[Admin Users]', error);
    res.status(500).json(db.errorResponse('获取用户列表失败'));
  }
});

router.put('/users/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['active', 'disabled']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { id } = req.params;
  const { status } = req.body;
  try {
    const user = await db.getUserById(parseInt(id));
    if (!user) {
      return res.status(404).json(db.errorResponse('用户不存在'));
    }
    await db.updateUser(parseInt(id), { status });
    res.json(db.successResponse({ ...user, status }, '用户状态更新成功'));
  } catch (error) {
    console.error('[Admin User Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.get('/snacks', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { status } = req.query;
    const where = (status !== undefined && status !== '') ? { status } : {};
    const snacks = await db.getSnacks(where);
    res.json(db.successResponse(snacks));
  } catch (error) {
    console.error('[Admin Snacks]', error);
    res.status(500).json(db.errorResponse('获取小吃列表失败'));
  }
});

router.post('/snacks', [authMiddleware, adminAuthMiddleware], [
  body('name').notEmpty().withMessage('名称不能为空'),
  body('price').isFloat({ min: 0 }).withMessage('价格不能为负数'),
  body('merchant').notEmpty().withMessage('商家不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { name, price, description, image, merchant } = req.body;
  try {
    const result = await db.createSnack({
      name,
      price: parseFloat(price),
      description: description || '',
      image: image || '',
      merchant,
      status: 'active'
    });
    const snack = await db.getSnackById(result.id);
    res.json(db.successResponse(snack, '菜品添加成功'));
  } catch (error) {
    console.error('[Admin Add Snack]', error);
    res.status(500).json(db.errorResponse('添加失败'));
  }
});

router.put('/snacks/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  const { name, price, description, image, merchant, status } = req.body;
  try {
    const snack = await db.getSnackById(parseInt(id));
    if (!snack) {
      return res.status(404).json(db.errorResponse('菜品不存在'));
    }
    await db.updateSnack(parseInt(id), {
      name: name !== undefined ? name : snack.name,
      price: price !== undefined ? price : snack.price,
      description: description !== undefined ? description : snack.description,
      image: image !== undefined ? image : snack.image,
      merchant: merchant !== undefined ? merchant : snack.merchant,
      status: status !== undefined ? status : snack.status
    });
    const updated = await db.getSnackById(parseInt(id));
    res.json(db.successResponse(updated, '菜品更新成功'));
  } catch (error) {
    console.error('[Admin Update Snack]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/snacks/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const snack = await db.getSnackById(parseInt(id));
    if (!snack) {
      return res.status(404).json(db.errorResponse('菜品不存在'));
    }
    await db.deleteSnack(parseInt(id));
    res.json(db.successResponse(null, '菜品删除成功'));
  } catch (error) {
    console.error('[Admin Delete Snack]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/supermarket/categories', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const rows = await db.getSupermarketCategories({});
    const categories = rows.map(c => ({ id: c.id, name: c.name, icon: c.icon, parentId: c.parent_id }));
    res.json(db.successResponse(categories));
  } catch (error) {
    console.error('[Admin Categories]', error);
    res.status(500).json(db.errorResponse('获取分类失败'));
  }
});

router.post('/supermarket/categories', [authMiddleware, adminAuthMiddleware], [
  body('name').notEmpty().withMessage('名称不能为空'),
  body('icon').notEmpty().withMessage('图标不能为空')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { name, icon, parentId } = req.body;
  try {
    const result = await DatabaseAdapter.insert('supermarket_categories', {
      name,
      icon,
      parent_id: parentId || null
    });
    const [rows] = await DatabaseAdapter.query('SELECT * FROM supermarket_categories WHERE id = ?', [result.insertId]);
    const c = rows[0];
    res.json(db.successResponse({ id: c.id, name: c.name, icon: c.icon, parentId: c.parent_id }, '分类添加成功'));
  } catch (error) {
    console.error('[Admin Add Category]', error);
    res.status(500).json(db.errorResponse('添加失败'));
  }
});

router.put('/supermarket/categories/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  const { name, icon, parentId } = req.body;

  try {
    const [rows] = await DatabaseAdapter.query('SELECT * FROM supermarket_categories WHERE id = ?', [parseInt(id)]);
    if (!rows || !rows.length) return res.status(404).json(db.errorResponse('分类不存在'));
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (parentId !== undefined) updateData.parent_id = parentId;
    if (Object.keys(updateData).length) await DatabaseAdapter.update('supermarket_categories', updateData, { id: parseInt(id) });
    const [updated] = await DatabaseAdapter.query('SELECT * FROM supermarket_categories WHERE id = ?', [parseInt(id)]);
    const c = updated[0];
    res.json(db.successResponse({ id: c.id, name: c.name, icon: c.icon, parentId: c.parent_id }, '分类更新成功'));
  } catch (error) {
    console.error('[Admin Update Category]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/supermarket/categories/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await DatabaseAdapter.query('SELECT * FROM supermarket_categories WHERE id = ?', [parseInt(id)]);
    if (!rows || !rows.length) return res.status(404).json(db.errorResponse('分类不存在'));
    await DatabaseAdapter.delete('supermarket_categories', { id: parseInt(id) });
    res.json(db.successResponse(null, '分类删除成功'));
  } catch (error) {
    console.error('[Admin Delete Category]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/supermarket/products', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { categoryId, status } = req.query;
    const where = {};
    if (categoryId) where.category_id = parseInt(categoryId);
    if (status) where.status = status;
    const rows = await db.getSupermarketProducts(where);
    const products = rows.map(p => ({ ...p, categoryId: p.category_id }));
    res.json(db.successResponse(products));
  } catch (error) {
    console.error('[Admin Products]', error);
    res.status(500).json(db.errorResponse('获取商品失败'));
  }
});

router.post('/supermarket/products', [authMiddleware, adminAuthMiddleware], [
  body('name').notEmpty().withMessage('名称不能为空'),
  body('categoryId').notEmpty().withMessage('分类不能为空'),
  body('price').isFloat({ min: 0 }).withMessage('价格不能为负数'),
  body('spec').notEmpty().withMessage('规格不能为空'),
  body('stock').isInt({ min: 0 }).withMessage('库存不能为负数')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }

  const { name, categoryId, price, spec, stock, image, description } = req.body;
  try {
    const result = await db.createSupermarketProduct({
      name,
      categoryId: parseInt(categoryId),
      price: parseFloat(price),
      spec,
      stock: parseInt(stock) || 0,
      image: image || '',
      description: description || '',
      status: 'active'
    });
    const product = await db.getSupermarketProductById(result.id);
    res.json(db.successResponse({ ...product, categoryId: product.category_id }, '商品添加成功'));
  } catch (error) {
    console.error('[Admin Add Product]', error);
    res.status(500).json(db.errorResponse('添加失败'));
  }
});

router.put('/supermarket/products/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  const { name, categoryId, price, spec, stock, image, description, status } = req.body;
  try {
    const product = await db.getSupermarketProductById(parseInt(id));
    if (!product) return res.status(404).json(db.errorResponse('商品不存在'));
    await db.updateSupermarketProduct(parseInt(id), {
      name: name !== undefined ? name : product.name,
      categoryId: categoryId !== undefined ? categoryId : product.category_id,
      price: price !== undefined ? price : product.price,
      spec: spec !== undefined ? spec : product.spec,
      stock: stock !== undefined ? stock : product.stock,
      image: image !== undefined ? image : product.image,
      description: description !== undefined ? description : product.description,
      status: status !== undefined ? status : product.status
    });
    const updated = await db.getSupermarketProductById(parseInt(id));
    res.json(db.successResponse({ ...updated, categoryId: updated.category_id }, '商品更新成功'));
  } catch (error) {
    console.error('[Admin Update Product]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/supermarket/products/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const product = await db.getSupermarketProductById(parseInt(id));
    if (!product) return res.status(404).json(db.errorResponse('商品不存在'));
    await db.deleteSupermarketProduct(parseInt(id));
    res.json(db.successResponse(null, '商品删除成功'));
  } catch (error) {
    console.error('[Admin Delete Product]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/tutors', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const rows = await db.getTutors(where);
    const tutors = rows.map(t => ({ ...t, userId: t.user_id }));
    res.json(db.successResponse(tutors));
  } catch (error) {
    console.error('[Admin Tutors]', error);
    res.status(500).json(db.errorResponse('获取家教列表失败'));
  }
});

router.put('/tutors/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['pending', 'active', 'inactive']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const tutor = await db.getTutorById(parseInt(id));
    if (!tutor) return res.status(404).json(db.errorResponse('家教信息不存在'));
    await db.updateTutor(parseInt(id), { status });
    const updated = await db.getTutorById(parseInt(id));
    res.json(db.successResponse({ ...updated, userId: updated.user_id }, '家教信息审核成功'));
  } catch (error) {
    console.error('[Admin Tutor Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/tutors/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const tutor = await db.getTutorById(parseInt(id));
    if (!tutor) return res.status(404).json(db.errorResponse('家教信息不存在'));
    await db.deleteTutor(parseInt(id));
    res.json(db.successResponse(null, '家教信息删除成功'));
  } catch (error) {
    console.error('[Admin Delete Tutor]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/secondhand', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { status } = req.query;
    const where = (status !== undefined && status !== '') ? { status } : {};
    const rows = await db.getSecondhandItems(where);
    const items = rows.map(i => ({ ...i, userId: i.user_id, images: typeof i.images === 'string' ? (i.images ? JSON.parse(i.images) : []) : i.images }));
    res.json(db.successResponse(items));
  } catch (error) {
    console.error('[Admin Secondhand]', error);
    res.status(500).json(db.errorResponse('获取二手列表失败'));
  }
});

router.put('/secondhand/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['pending', 'active', 'rejected', 'sold']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const item = await db.getSecondhandItemById(parseInt(id));
    if (!item) return res.status(404).json(db.errorResponse('二手商品不存在'));
    await db.updateSecondhandItem(parseInt(id), { status });
    const updated = await db.getSecondhandItemById(parseInt(id));
    const formatted = {
      ...updated,
      userId: updated.user_id,
      images: typeof updated.images === 'string' ? (updated.images ? JSON.parse(updated.images) : []) : (updated.images || [])
    };
    res.json(db.successResponse(formatted, '二手商品审核成功'));
  } catch (error) {
    console.error('[Admin Secondhand Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/secondhand/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const item = await db.getSecondhandItemById(parseInt(id));
    if (!item) return res.status(404).json(db.errorResponse('二手商品不存在'));
    await db.deleteSecondhandItem(parseInt(id));
    res.json(db.successResponse(null, '二手商品删除成功'));
  } catch (error) {
    console.error('[Admin Delete Secondhand]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/study-materials', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { status } = req.query;
    const where = (status !== undefined && status !== '') ? { status } : {};
    const rows = await db.getStudyMaterials(where);
    const materials = rows.map(m => ({ ...m, uploaderId: m.uploader_id, uploaderName: m.uploader_name }));
    res.json(db.successResponse(materials));
  } catch (error) {
    console.error('[Admin Study Materials]', error);
    res.status(500).json(db.errorResponse('获取学习资料失败'));
  }
});

router.put('/study-materials/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['pending', 'active']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const material = await db.getStudyMaterialById(parseInt(id));
    if (!material) return res.status(404).json(db.errorResponse('学习资料不存在'));
    await db.updateStudyMaterial(parseInt(id), { status });
    const updated = await db.getStudyMaterialById(parseInt(id));
    res.json(db.successResponse({ ...updated, uploaderId: updated.uploader_id, uploaderName: updated.uploader_name }, '学习资料审核成功'));
  } catch (error) {
    console.error('[Admin Study Material Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/study-materials/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const material = await db.getStudyMaterialById(parseInt(id));
    if (!material) return res.status(404).json(db.errorResponse('学习资料不存在'));
    await db.deleteStudyMaterial(parseInt(id));
    res.json(db.successResponse(null, '学习资料删除成功'));
  } catch (error) {
    console.error('[Admin Delete Study Material]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/forum-posts', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const rows = await db.getForumPosts(where);
    const posts = rows.map(p => ({ ...p, userId: p.user_id, userName: p.user_name, images: typeof p.images === 'string' ? (p.images ? JSON.parse(p.images) : []) : p.images }));
    res.json(db.successResponse(posts));
  } catch (error) {
    console.error('[Admin Forum Posts]', error);
    res.status(500).json(db.errorResponse('获取帖子失败'));
  }
});

router.put('/forum-posts/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['pending', 'active']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const post = await db.getForumPostById(parseInt(id));
    if (!post) return res.status(404).json(db.errorResponse('帖子不存在'));
    await db.updateForumPost(parseInt(id), { status });
    const updated = await db.getForumPostById(parseInt(id));
    res.json(db.successResponse({ ...updated, userId: updated.user_id, userName: updated.user_name }, '帖子审核成功'));
  } catch (error) {
    console.error('[Admin Forum Post Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/forum-posts/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const post = await db.getForumPostById(parseInt(id));
    if (!post) return res.status(404).json(db.errorResponse('帖子不存在'));
    await db.deleteForumPost(parseInt(id));
    res.json(db.successResponse(null, '帖子删除成功'));
  } catch (error) {
    console.error('[Admin Delete Forum Post]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/orders', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = {};
    if (type && type !== '') where.type = type;
    if (status && status !== '') where.status = status;
    const rows = await db.getOrders(where);
    const orders = rows.map(o => ({ ...o, userId: o.user_id, totalAmount: o.total_amount, items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items }));
    res.json(db.successResponse(orders.reverse()));
  } catch (error) {
    console.error('[Admin Orders]', error);
    res.status(500).json(db.errorResponse('获取订单失败'));
  }
});

router.put('/orders/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['pending', 'completed', 'cancelled']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const order = await db.getOrderById(parseInt(id));
    if (!order) return res.status(404).json(db.errorResponse('订单不存在'));
    await db.updateOrder(parseInt(id), { status });
    const updated = await db.getOrderById(parseInt(id));
    res.json(db.successResponse({ ...updated, userId: updated.user_id, totalAmount: updated.total_amount, items: typeof updated.items === 'string' ? JSON.parse(updated.items || '[]') : updated.items }, '订单状态更新成功'));
  } catch (error) {
    console.error('[Admin Order Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

// ========== 驾校管理 ==========
router.get('/driving-schools', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const rows = await db.getDrivingSchools(where);
    const schools = rows.map(s => ({
      ...s,
      features: typeof s.features === 'string' ? (s.features ? JSON.parse(s.features) : []) : s.features
    }));
    res.json(db.successResponse(schools));
  } catch (error) {
    console.error('[Admin Driving Schools]', error);
    res.status(500).json(db.errorResponse('获取驾校列表失败'));
  }
});

router.post('/driving-schools', [authMiddleware, adminAuthMiddleware], [
  body('name').notEmpty().withMessage('驾校名称不能为空'),
  body('address').notEmpty().withMessage('地址不能为空'),
  body('phone').notEmpty().withMessage('联系电话不能为空'),
  body('price').isInt({ min: 0 }).withMessage('价格无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { name, address, phone, price, description, features } = req.body;
  try {
    const result = await db.createDrivingSchool({
      name,
      address,
      phone,
      price: parseInt(price),
      description: description || '',
      features: Array.isArray(features) ? features : (features ? JSON.parse(features) : []),
      status: 'active'
    });
    const school = await db.getDrivingSchoolById(result.id);
    res.json(db.successResponse({
      ...school,
      features: typeof school.features === 'string' ? (school.features ? JSON.parse(school.features) : []) : school.features
    }, '驾校添加成功'));
  } catch (error) {
    console.error('[Admin Add Driving School]', error);
    res.status(500).json(db.errorResponse('添加失败'));
  }
});

router.put('/driving-schools/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, price, description, features, status } = req.body;
  try {
    const school = await db.getDrivingSchoolById(parseInt(id));
    if (!school) return res.status(404).json(db.errorResponse('驾校不存在'));
    await db.updateDrivingSchool(parseInt(id), {
      name: name !== undefined ? name : school.name,
      address: address !== undefined ? address : school.address,
      phone: phone !== undefined ? phone : school.phone,
      price: price !== undefined ? price : school.price,
      description: description !== undefined ? description : school.description,
      features: features !== undefined ? (Array.isArray(features) ? features : JSON.parse(features || '[]')) : undefined,
      status: status !== undefined ? status : school.status
    });
    const updated = await db.getDrivingSchoolById(parseInt(id));
    res.json(db.successResponse({
      ...updated,
      features: typeof updated.features === 'string' ? (updated.features ? JSON.parse(updated.features) : []) : updated.features
    }, '驾校更新成功'));
  } catch (error) {
    console.error('[Admin Update Driving School]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

router.delete('/driving-schools/:id', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  const { id } = req.params;
  try {
    const school = await db.getDrivingSchoolById(parseInt(id));
    if (!school) return res.status(404).json(db.errorResponse('驾校不存在'));
    await db.deleteDrivingSchool(parseInt(id));
    res.json(db.successResponse(null, '驾校删除成功'));
  } catch (error) {
    console.error('[Admin Delete Driving School]', error);
    res.status(500).json(db.errorResponse('删除失败'));
  }
});

router.get('/driving-inquiries', [authMiddleware, adminAuthMiddleware], async (req, res) => {
  try {
    const [rows] = await DatabaseAdapter.query(
      'SELECT di.*, ds.name as school_name FROM driving_inquiries di LEFT JOIN driving_schools ds ON di.school_id = ds.id ORDER BY di.created_at DESC'
    );
    const inquiries = (rows || []).map(i => ({
      id: i.id,
      userId: i.user_id,
      schoolId: i.school_id,
      schoolName: i.school_name,
      name: i.name,
      phone: i.phone,
      question: i.question,
      status: i.status,
      createdAt: i.created_at
    }));
    res.json(db.successResponse(inquiries));
  } catch (error) {
    console.error('[Admin Driving Inquiries]', error);
    res.status(500).json(db.errorResponse('获取咨询列表失败'));
  }
});

router.put('/driving-inquiries/:id/status', [authMiddleware, adminAuthMiddleware], [
  body('status').isIn(['pending', 'replied']).withMessage('状态无效')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse('参数验证失败', 400));
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.updateDrivingInquiry(parseInt(id), { status });
    res.json(db.successResponse(null, '咨询状态更新成功'));
  } catch (error) {
    console.error('[Admin Driving Inquiry Status]', error);
    res.status(500).json(db.errorResponse('更新失败'));
  }
});

module.exports = router;
