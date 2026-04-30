const DatabaseAdapter = require('./adapter');
const { validationResult } = require('express-validator');

class DatabaseInterface {
  validateRequest(req) {
    const errors = validationResult(req);
    return { success: errors.isEmpty(), errors: errors.array() };
  }

  generateId(prefix) {
    return Date.now() + Math.floor(Math.random() * 10000);
  }
  async getUsers(where = {}) {
    return await DatabaseAdapter.select('users', where);
  }

  async getUserById(id) {
    const users = await DatabaseAdapter.select('users', { id });
    return users[0] || null;
  }

  async getUserByStudentId(studentId) {
    const users = await DatabaseAdapter.select('users', { student_id: studentId });
    return users[0] || null;
  }

  async getUserByEmail(email) {
    const users = await DatabaseAdapter.select('users', { email });
    return users[0] || null;
  }

  async createUser(userData) {
    const result = await DatabaseAdapter.insert('users', {
      student_id: userData.studentId,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      major: userData.major,
      grade: userData.grade,
      role: userData.role || 'student',
      status: userData.status || 'active'
    });
    return { id: result.insertId };
  }

  async updateUser(id, userData) {
    const updateData = {};
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.major !== undefined) updateData.major = userData.major;
    if (userData.grade !== undefined) updateData.grade = userData.grade;
    if (userData.password !== undefined) updateData.password = userData.password;
    if (userData.status !== undefined) updateData.status = userData.status;
    
    await DatabaseAdapter.update('users', updateData, { id });
    return { success: true };
  }

  async deleteUser(id) {
    await DatabaseAdapter.delete('users', { id });
    return { success: true };
  }

  async getSnacks(where = {}) {
    return await DatabaseAdapter.select('snacks', where);
  }

  async getSnackById(id) {
    const snacks = await DatabaseAdapter.select('snacks', { id });
    return snacks[0] || null;
  }

  async createSnack(snackData) {
    const result = await DatabaseAdapter.insert('snacks', {
      name: snackData.name,
      price: snackData.price,
      description: snackData.description,
      image: snackData.image,
      merchant: snackData.merchant,
      status: snackData.status || 'active'
    });
    return { id: result.insertId };
  }

  async updateSnack(id, snackData) {
    const updateData = {};
    if (snackData.name !== undefined) updateData.name = snackData.name;
    if (snackData.price !== undefined) updateData.price = snackData.price;
    if (snackData.description !== undefined) updateData.description = snackData.description;
    if (snackData.image !== undefined) updateData.image = snackData.image;
    if (snackData.merchant !== undefined) updateData.merchant = snackData.merchant;
    if (snackData.status !== undefined) updateData.status = snackData.status;
    
    await DatabaseAdapter.update('snacks', updateData, { id });
    return { success: true };
  }

  async deleteSnack(id) {
    await DatabaseAdapter.delete('snacks', { id });
    return { success: true };
  }

  async getSupermarketCategories(where = {}) {
    return await DatabaseAdapter.select('supermarket_categories', where);
  }

  async getSupermarketProducts(where = {}) {
    return await DatabaseAdapter.select('supermarket_products', where);
  }

  async getSupermarketProductById(id) {
    const products = await DatabaseAdapter.select('supermarket_products', { id });
    return products[0] || null;
  }

  async createSupermarketProduct(productData) {
    const result = await DatabaseAdapter.insert('supermarket_products', {
      name: productData.name,
      category_id: productData.categoryId,
      price: productData.price,
      spec: productData.spec,
      stock: productData.stock,
      image: productData.image,
      description: productData.description,
      status: productData.status || 'active'
    });
    return { id: result.insertId };
  }

  async updateSupermarketProduct(id, productData) {
    const updateData = {};
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.categoryId !== undefined) updateData.category_id = productData.categoryId;
    if (productData.price !== undefined) updateData.price = productData.price;
    if (productData.spec !== undefined) updateData.spec = productData.spec;
    if (productData.stock !== undefined) updateData.stock = productData.stock;
    if (productData.image !== undefined) updateData.image = productData.image;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.status !== undefined) updateData.status = productData.status;
    
    await DatabaseAdapter.update('supermarket_products', updateData, { id });
    return { success: true };
  }

  async deleteSupermarketProduct(id) {
    await DatabaseAdapter.delete('supermarket_products', { id });
    return { success: true };
  }

  async getCartItems(userId) {
    return await DatabaseAdapter.selectWithJoin(
      'cart_items',
      [
        {
          table: 'supermarket_products',
          on: 'cart_items.product_id = supermarket_products.id'
        }
      ],
      { 'cart_items.user_id': userId },
      'cart_items.*, supermarket_products.name, supermarket_products.price, supermarket_products.image, supermarket_products.stock'
    );
  }

  async addToCart(userId, productId, quantity) {
    try {
      await DatabaseAdapter.insert('cart_items', {
        user_id: userId,
        product_id: productId,
        quantity: quantity
      });
      return { success: true };
    } catch (error) {
      if (error.message === '数据已存在') {
        await DatabaseAdapter.query(
          'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
          [quantity, userId, productId]
        );
        return { success: true };
      }
      throw error;
    }
  }

  async updateCartItem(userId, productId, quantity) {
    await DatabaseAdapter.update('cart_items', { quantity }, { user_id: userId, product_id: productId });
    return { success: true };
  }

  async deleteCartItem(userId, productId) {
    await DatabaseAdapter.delete('cart_items', { user_id: userId, product_id: productId });
    return { success: true };
  }

  async clearCart(userId) {
    await DatabaseAdapter.delete('cart_items', { user_id: userId });
    return { success: true };
  }

  async getOrders(where = {}) {
    return await DatabaseAdapter.select('orders', where);
  }

  async getOrderById(id) {
    const orders = await DatabaseAdapter.select('orders', { id });
    return orders[0] || null;
  }

  async createOrder(orderData) {
    const result = await DatabaseAdapter.insert('orders', {
      user_id: orderData.userId,
      type: orderData.type,
      items: JSON.stringify(orderData.items),
      total_amount: orderData.totalAmount,
      address: orderData.address,
      phone: orderData.phone,
      remark: orderData.remark,
      status: orderData.status || 'pending'
    });
    return { id: result.insertId };
  }

  async updateOrder(id, orderData) {
    const updateData = {};
    if (orderData.status !== undefined) updateData.status = orderData.status;
    if (orderData.paymentStatus !== undefined) updateData.payment_status = orderData.paymentStatus;
    if (orderData.paidAt !== undefined) updateData.paid_at = orderData.paidAt;
    if (orderData.address !== undefined) updateData.address = orderData.address;
    if (orderData.phone !== undefined) updateData.phone = orderData.phone;
    if (orderData.remark !== undefined) updateData.remark = orderData.remark;
     
    await DatabaseAdapter.update('orders', updateData, { id });
    return { success: true };
  }

  async getPayments(where = {}) {
    return await DatabaseAdapter.select('payments', where);
  }

  async getPaymentById(id) {
    const payments = await DatabaseAdapter.select('payments', { id });
    return payments[0] || null;
  }

  async getPaymentByOutTradeNo(outTradeNo) {
    const payments = await DatabaseAdapter.select('payments', { out_trade_no: outTradeNo });
    return payments[0] || null;
  }

  async getLatestActivePaymentByOrderId(orderId) {
    const [rows] = await DatabaseAdapter.query(
      'SELECT * FROM payments WHERE order_id = ? AND status = ? ORDER BY id DESC LIMIT 1',
      [orderId, 'created']
    );
    return rows[0] || null;
  }

  async createPayment(paymentData) {
    const result = await DatabaseAdapter.insert('payments', {
      order_id: paymentData.orderId,
      user_id: paymentData.userId,
      provider: paymentData.provider,
      out_trade_no: paymentData.outTradeNo,
      amount: paymentData.amount,
      status: paymentData.status || 'created',
      pay_url: paymentData.payUrl
    });

    return { id: result.insertId };
  }

  async updatePayment(id, paymentData) {
    const updateData = {};
    if (paymentData.status !== undefined) updateData.status = paymentData.status;
    if (paymentData.payUrl !== undefined) updateData.pay_url = paymentData.payUrl;
    if (paymentData.paidAt !== undefined) updateData.paid_at = paymentData.paidAt;
    if (paymentData.notifyPayload !== undefined) updateData.notify_payload = paymentData.notifyPayload;

    await DatabaseAdapter.update('payments', updateData, { id });
    return { success: true };
  }

  async createRefund(refundData) {
    const result = await DatabaseAdapter.insert('refunds', {
      payment_id: refundData.paymentId,
      order_id: refundData.orderId,
      user_id: refundData.userId,
      provider: refundData.provider,
      out_refund_no: refundData.outRefundNo,
      refund_no: refundData.refundNo,
      amount: refundData.amount,
      reason: refundData.reason,
      status: refundData.status || 'created',
      raw_response: refundData.rawResponse
    });

    return { id: result.insertId };
  }

  async getRefundById(id) {
    const refunds = await DatabaseAdapter.select('refunds', { id });
    return refunds[0] || null;
  }

  async getRefundByOutRefundNo(outRefundNo) {
    const refunds = await DatabaseAdapter.select('refunds', { out_refund_no: outRefundNo });
    return refunds[0] || null;
  }

  async updateRefund(id, refundData) {
    const updateData = {};
    if (refundData.status !== undefined) updateData.status = refundData.status;
    if (refundData.refundNo !== undefined) updateData.refund_no = refundData.refundNo;
    if (refundData.rawResponse !== undefined) updateData.raw_response = refundData.rawResponse;
    if (refundData.refundedAt !== undefined) updateData.refunded_at = refundData.refundedAt;

    await DatabaseAdapter.update('refunds', updateData, { id });
    return { success: true };
  }

  async deleteOrder(id) {
    await DatabaseAdapter.delete('orders', { id });
    return { success: true };
  }

  async getTutors(where = {}) {
    return await DatabaseAdapter.select('tutors', where);
  }

  async getTutorById(id) {
    const tutors = await DatabaseAdapter.select('tutors', { id });
    return tutors[0] || null;
  }

  async createTutor(tutorData) {
    const result = await DatabaseAdapter.insert('tutors', {
      user_id: tutorData.userId,
      name: tutorData.name,
      subject: tutorData.subject,
      grade: tutorData.grade,
      salary: tutorData.salary,
      description: tutorData.description,
      contact: tutorData.contact,
      status: tutorData.status || 'pending'
    });
    return { id: result.insertId };
  }

  async updateTutor(id, tutorData) {
    const updateData = {};
    if (tutorData.name !== undefined) updateData.name = tutorData.name;
    if (tutorData.subject !== undefined) updateData.subject = tutorData.subject;
    if (tutorData.grade !== undefined) updateData.grade = tutorData.grade;
    if (tutorData.salary !== undefined) updateData.salary = tutorData.salary;
    if (tutorData.description !== undefined) updateData.description = tutorData.description;
    if (tutorData.contact !== undefined) updateData.contact = tutorData.contact;
    if (tutorData.status !== undefined) updateData.status = tutorData.status;
    
    await DatabaseAdapter.update('tutors', updateData, { id });
    return { success: true };
  }

  async deleteTutor(id) {
    await DatabaseAdapter.delete('tutors', { id });
    return { success: true };
  }

  async getSecondhandItems(where = {}) {
    return await DatabaseAdapter.select('secondhand_items', where);
  }

  async getSecondhandItemById(id) {
    const items = await DatabaseAdapter.select('secondhand_items', { id });
    return items[0] || null;
  }

  async createSecondhandItem(itemData) {
    const result = await DatabaseAdapter.insert('secondhand_items', {
      user_id: itemData.userId,
      title: itemData.title,
      category: itemData.category,
      price: itemData.price,
      description: itemData.description,
      images: JSON.stringify(itemData.images || []),
      status: itemData.status || 'pending'
    });
    return { id: result.insertId };
  }

  async updateSecondhandItem(id, itemData) {
    const updateData = {};
    if (itemData.title !== undefined) updateData.title = itemData.title;
    if (itemData.category !== undefined) updateData.category = itemData.category;
    if (itemData.price !== undefined) updateData.price = itemData.price;
    if (itemData.description !== undefined) updateData.description = itemData.description;
    if (itemData.images !== undefined) updateData.images = JSON.stringify(itemData.images);
    if (itemData.status !== undefined) {
      console.log('[updateSecondhandItem] Setting status to:', itemData.status);
      updateData.status = itemData.status;
    }
    
    console.log('[updateSecondhandItem] updateData:', updateData, 'where id:', id);
    await DatabaseAdapter.update('secondhand_items', updateData, { id });
    return { success: true };
  }

  async deleteSecondhandItem(id) {
    await DatabaseAdapter.delete('secondhand_items', { id });
    return { success: true };
  }

  async getUserFavorites(userId, type) {
    return await DatabaseAdapter.select('user_favorites', { user_id: userId, type });
  }

  async addFavorite(userId, type, itemId) {
    try {
      await DatabaseAdapter.insert('user_favorites', {
        user_id: userId,
        type: type,
        item_id: itemId
      });
      return { success: true };
    } catch (error) {
      if (error.message === '数据已存在') {
        return { success: true };
      }
      throw error;
    }
  }

  async removeFavorite(userId, type, itemId) {
    await DatabaseAdapter.delete('user_favorites', { user_id: userId, type, item_id: itemId });
    return { success: true };
  }

  async getDrivingSchools(where = {}) {
    return await DatabaseAdapter.select('driving_schools', where);
  }

  async getDrivingSchoolById(id) {
    const schools = await DatabaseAdapter.select('driving_schools', { id });
    return schools[0] || null;
  }

  async createDrivingSchool(schoolData) {
    const result = await DatabaseAdapter.insert('driving_schools', {
      name: schoolData.name,
      address: schoolData.address,
      phone: schoolData.phone,
      price: schoolData.price,
      description: schoolData.description,
      features: JSON.stringify(schoolData.features || []),
      status: schoolData.status || 'active'
    });
    return { id: result.insertId };
  }

  async updateDrivingSchool(id, schoolData) {
    const updateData = {};
    if (schoolData.name !== undefined) updateData.name = schoolData.name;
    if (schoolData.address !== undefined) updateData.address = schoolData.address;
    if (schoolData.phone !== undefined) updateData.phone = schoolData.phone;
    if (schoolData.price !== undefined) updateData.price = schoolData.price;
    if (schoolData.description !== undefined) updateData.description = schoolData.description;
    if (schoolData.features !== undefined) updateData.features = JSON.stringify(schoolData.features);
    if (schoolData.status !== undefined) updateData.status = schoolData.status;
    
    await DatabaseAdapter.update('driving_schools', updateData, { id });
    return { success: true };
  }

  async deleteDrivingSchool(id) {
    await DatabaseAdapter.delete('driving_schools', { id });
    return { success: true };
  }

  async getDrivingInquiries(where = {}) {
    return await DatabaseAdapter.select('driving_inquiries', where);
  }

  async createDrivingInquiry(inquiryData) {
    const result = await DatabaseAdapter.insert('driving_inquiries', {
      user_id: inquiryData.userId,
      school_id: inquiryData.schoolId,
      name: inquiryData.name,
      phone: inquiryData.phone,
      question: inquiryData.question,
      status: inquiryData.status || 'pending'
    });
    return { id: result.insertId };
  }

  async updateDrivingInquiry(id, inquiryData) {
    const updateData = {};
    if (inquiryData.status !== undefined) updateData.status = inquiryData.status;
    
    await DatabaseAdapter.update('driving_inquiries', updateData, { id });
    return { success: true };
  }

  async getStudyMaterials(where = {}) {
    return await DatabaseAdapter.select('study_materials', where);
  }

  async getStudyMaterialById(id) {
    const materials = await DatabaseAdapter.select('study_materials', { id });
    return materials[0] || null;
  }

  async createStudyMaterial(materialData) {
    const result = await DatabaseAdapter.insert('study_materials', {
      title: materialData.title,
      major: materialData.major,
      grade: materialData.grade,
      subject: materialData.subject,
      type: materialData.type,
      size: materialData.size,
      uploader_id: materialData.uploaderId,
      uploader_name: materialData.uploaderName,
      description: materialData.description,
      status: materialData.status || 'pending'
    });
    return { id: result.insertId };
  }

  async updateStudyMaterial(id, materialData) {
    const updateData = {};
    if (materialData.title !== undefined) updateData.title = materialData.title;
    if (materialData.major !== undefined) updateData.major = materialData.major;
    if (materialData.grade !== undefined) updateData.grade = materialData.grade;
    if (materialData.subject !== undefined) updateData.subject = materialData.subject;
    if (materialData.type !== undefined) updateData.type = materialData.type;
    if (materialData.size !== undefined) updateData.size = materialData.size;
    if (materialData.description !== undefined) updateData.description = materialData.description;
    if (materialData.status !== undefined) updateData.status = materialData.status;
    
    await DatabaseAdapter.update('study_materials', updateData, { id });
    return { success: true };
  }

  async deleteStudyMaterial(id) {
    await DatabaseAdapter.delete('study_materials', { id });
    return { success: true };
  }

  async incrementDownloadCount(id) {
    await DatabaseAdapter.query(
      'UPDATE study_materials SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );
    return { success: true };
  }

  async getForumPosts(where = {}) {
    return await DatabaseAdapter.select('forum_posts', where);
  }

  async getForumPostById(id) {
    const posts = await DatabaseAdapter.select('forum_posts', { id });
    return posts[0] || null;
  }

  async createForumPost(postData) {
    const result = await DatabaseAdapter.insert('forum_posts', {
      user_id: postData.userId,
      user_name: postData.userName,
      title: postData.title,
      content: postData.content,
      category: postData.category,
      images: JSON.stringify(postData.images || []),
      status: postData.status || 'pending'
    });
    return { id: result.insertId };
  }

  async updateForumPost(id, postData) {
    const updateData = {};
    if (postData.title !== undefined) updateData.title = postData.title;
    if (postData.content !== undefined) updateData.content = postData.content;
    if (postData.category !== undefined) updateData.category = postData.category;
    if (postData.images !== undefined) updateData.images = JSON.stringify(postData.images);
    if (postData.status !== undefined) updateData.status = postData.status;
    
    await DatabaseAdapter.update('forum_posts', updateData, { id });
    return { success: true };
  }

  async deleteForumPost(id) {
    await DatabaseAdapter.delete('forum_posts', { id });
    return { success: true };
  }

  async incrementPostLikes(id) {
    await DatabaseAdapter.query(
      'UPDATE forum_posts SET likes = likes + 1 WHERE id = ?',
      [id]
    );
    return { success: true };
  }

  async getForumComments(postId) {
    return await DatabaseAdapter.select('forum_comments', { post_id: postId });
  }

  async createForumComment(commentData) {
    const result = await DatabaseAdapter.insert('forum_comments', {
      post_id: commentData.postId,
      user_id: commentData.userId,
      user_name: commentData.userName,
      content: commentData.content
    });
    return { id: result.insertId };
  }

  async deleteForumComment(id) {
    await DatabaseAdapter.delete('forum_comments', { id });
    return { success: true };
  }

  async getEmailVerification(where = {}) {
    const verifications = await DatabaseAdapter.select('email_verifications', where);
    return verifications[0] || null;
  }

  async createEmailVerification(verificationData) {
    await DatabaseAdapter.insert('email_verifications', {
      email: verificationData.email,
      student_id: verificationData.studentId,
      code: verificationData.code,
      expiry_time: verificationData.expiryTime
    });
    return { success: true };
  }

  async deleteEmailVerification(where) {
    await DatabaseAdapter.delete('email_verifications', where);
    return { success: true };
  }

  async getStats() {
    const [userCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM users');
    const [snackOrderCount] = await DatabaseAdapter.query("SELECT COUNT(*) as count FROM orders WHERE type = 'snack'");
    const [supermarketOrderCount] = await DatabaseAdapter.query("SELECT COUNT(*) as count FROM orders WHERE type = 'supermarket'");
    const [snackCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM snacks');
    const [productCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM supermarket_products');
    const [tutorCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM tutors');
    const [secondhandCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM secondhand_items');
    const [materialCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM study_materials');
    const [postCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM forum_posts');
    const [drivingSchoolCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM driving_schools');
    const [drivingInquiryCount] = await DatabaseAdapter.query('SELECT COUNT(*) as count FROM driving_inquiries');

    return {
      userCount: userCount[0].count,
      snackOrderCount: snackOrderCount[0].count,
      supermarketOrderCount: supermarketOrderCount[0].count,
      tutorCount: tutorCount[0].count,
      secondhandCount: secondhandCount[0].count,
      forumPostCount: postCount[0].count,
      studyMaterialCount: materialCount[0].count,
      drivingSchoolCount: drivingSchoolCount[0].count,
      drivingInquiryCount: drivingInquiryCount[0].count,
      snacks: snackCount[0].count,
      products: productCount[0].count
    };
  }

  successResponse(data, message = '操作成功') {
    return {
      success: true,
      message,
      data
    };
  }

  errorResponse(message, code = 400) {
    return {
      success: false,
      message
    };
  }
}

module.exports = new DatabaseInterface();
