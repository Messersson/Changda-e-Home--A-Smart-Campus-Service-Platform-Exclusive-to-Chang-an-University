const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';

const marker = `E2E-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
const runSuffix = String(Date.now()).slice(-8);
const buyerStudentId = `91${runSuffix}`;
const sellerStudentId = `92${runSuffix}`;

const state = {
  created: {
    snacks: [],
    supermarketProducts: [],
    supermarketCategories: [],
    tutors: [],
    secondhandItems: [],
    studyMaterials: [],
    forumPosts: [],
    drivingSchools: []
  }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toQuery(query) {
  const entries = Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  let body;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${path}${toQuery(options.query)}`, { method, headers, body });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error(`${method} ${path} returned non-JSON: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || response.statusText || text;
    throw new Error(`${method} ${path} failed (${response.status}): ${message}`);
  }
  return Object.prototype.hasOwnProperty.call(payload || {}, 'success') ? payload.data : payload;
}

async function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  const started = Date.now();
  const result = await fn();
  console.log(`OK (${Date.now() - started}ms)`);
  return result;
}

async function registerUser(studentId, roleName) {
  const password = `Pass${studentId}!`;
  const email = `${studentId}@chd.edu.cn`;
  const verification = await request('/auth/send-verification', {
    method: 'POST',
    body: { studentId, email }
  });
  assert(verification.debugCode, `${roleName} verification code was not exposed in dev mode`);

  const auth = await request('/auth/register', {
    method: 'POST',
    body: {
      studentId,
      email,
      code: verification.debugCode,
      password,
      name: `${marker}-${roleName}`,
      major: '软件工程',
      grade: '2026'
    }
  });
  assert(auth.token, `${roleName} registration did not return a token`);
  assert(auth.user?.id, `${roleName} registration did not return a user id`);
  return { ...auth, password, email, studentId };
}

async function login(studentId, password) {
  const auth = await request('/auth/login', {
    method: 'POST',
    body: { studentId, password }
  });
  assert(auth.token, `login failed to return token for ${studentId}`);
  return auth;
}

async function cleanup(adminToken) {
  const jobs = [];
  for (const id of state.created.drivingSchools.reverse()) {
    jobs.push(() => request(`/admin/driving-schools/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.forumPosts.reverse()) {
    jobs.push(() => request(`/admin/forum-posts/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.studyMaterials.reverse()) {
    jobs.push(() => request(`/admin/study-materials/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.secondhandItems.reverse()) {
    jobs.push(() => request(`/admin/secondhand/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.tutors.reverse()) {
    jobs.push(() => request(`/admin/tutors/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.supermarketProducts.reverse()) {
    jobs.push(() => request(`/admin/supermarket/products/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.supermarketCategories.reverse()) {
    jobs.push(() => request(`/admin/supermarket/categories/${id}`, { method: 'DELETE', token: adminToken }));
  }
  for (const id of state.created.snacks.reverse()) {
    jobs.push(() => request(`/admin/snacks/${id}`, { method: 'DELETE', token: adminToken }));
  }

  for (const job of jobs) {
    try {
      await job();
    } catch (error) {
      console.warn(`cleanup warning: ${error.message}`);
    }
  }
}

async function main() {
  console.log(`API smoke test marker: ${marker}`);

  let adminToken;
  try {
    await step('health endpoint', async () => {
      const health = await request('/health');
      assert(health.status === 'ok', 'health status is not ok');
    });

    await step('frontend root is reachable', async () => {
      const response = await fetch(FRONTEND_URL);
      const html = await response.text();
      assert(response.ok, `frontend root returned ${response.status}`);
      assert(html.includes('id="app"') || html.includes('<div id=app'), 'frontend html does not look like the Vue app shell');
    });

    const admin = await step('admin login', async () => login('2024000000', 'admin123'));
    adminToken = admin.token;

    const buyer = await step('buyer registration/login/profile/password', async () => {
      const user = await registerUser(buyerStudentId, 'buyer');
      const me = await request('/auth/me', { token: user.token });
      assert(me.studentId === buyerStudentId, 'auth/me returned the wrong buyer');
      const updated = await request('/auth/me', {
        method: 'PUT',
        token: user.token,
        body: { name: `${marker}-buyer-updated`, major: '计算机科学', grade: '2025' }
      });
      assert(updated.name === `${marker}-buyer-updated`, 'profile update did not persist');
      await request('/auth/password', {
        method: 'PUT',
        token: user.token,
        body: { currentPassword: user.password, newPassword: `${user.password}2` }
      });
      const relogin = await login(buyerStudentId, `${user.password}2`);
      return { ...relogin, studentId: buyerStudentId, password: `${user.password}2` };
    });

    const seller = await step('seller registration', async () => registerUser(sellerStudentId, 'seller'));

    await step('admin user list/status update', async () => {
      const users = await request('/admin/users', { token: adminToken, query: { keyword: sellerStudentId } });
      assert(users.some((user) => user.studentId === sellerStudentId), 'admin user search did not find seller');
      await request(`/admin/users/${seller.user.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'disabled' }
      });
      const disabledUsers = await request('/admin/users', { token: adminToken, query: { keyword: sellerStudentId } });
      assert(disabledUsers.find((user) => user.studentId === sellerStudentId)?.status === 'disabled', 'user status was not disabled');
      await request(`/admin/users/${seller.user.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'active' }
      });
    });

    await step('snack add/list/detail/order/cancel/delete', async () => {
      const snack = await request('/admin/snacks', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `${marker}-snack`,
          price: 6.5,
          description: 'API smoke snack',
          image: '/uploads/e2e-snack.jpg',
          merchant: `${marker}-merchant`,
          status: 'active'
        }
      });
      state.created.snacks.push(snack.id);
      const updated = await request(`/admin/snacks/${snack.id}`, {
        method: 'PUT',
        token: adminToken,
        body: { price: 7.5, description: 'updated API smoke snack' }
      });
      assert(Number(updated.price) === 7.5, 'snack price update did not persist');
      const list = await request('/snack/list', { query: { merchant: `${marker}-merchant` } });
      assert(list.some((item) => item.id === snack.id), 'public snack list did not include added snack');
      const detail = await request(`/snack/detail/${snack.id}`);
      assert(detail.name === `${marker}-snack`, 'snack detail returned wrong record');
      const order = await request('/snack/order', {
        method: 'POST',
        token: buyer.token,
        body: { items: [{ snackId: snack.id, quantity: 2 }], remark: marker }
      });
      assert(order.orderId, 'snack order did not return orderId');
      const orders = await request('/snack/orders', { token: buyer.token });
      assert(orders.some((item) => item.id === order.orderId), 'snack orders did not include created order');
      const cancelled = await request(`/snack/orders/${order.orderId}/cancel`, { method: 'PUT', token: buyer.token });
      assert(cancelled.status === 'cancelled', 'snack order was not cancelled');
      await request(`/admin/snacks/${snack.id}`, { method: 'DELETE', token: adminToken });
      state.created.snacks = state.created.snacks.filter((id) => id !== snack.id);
    });

    await step('supermarket category/product/cart/checkout/payment/refund/delete', async () => {
      const category = await request('/admin/supermarket/categories', {
        method: 'POST',
        token: adminToken,
        body: { name: `${marker}-category`, icon: 'test', parentId: null }
      });
      state.created.supermarketCategories.push(category.id);
      const categoryUpdated = await request(`/admin/supermarket/categories/${category.id}`, {
        method: 'PUT',
        token: adminToken,
        body: { name: `${marker}-category-updated`, icon: 'test2' }
      });
      assert(categoryUpdated.name === `${marker}-category-updated`, 'category update did not persist');

      const product = await request('/admin/supermarket/products', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `${marker}-product`,
          categoryId: category.id,
          price: 12.5,
          spec: '1份',
          stock: 10,
          image: '/uploads/e2e-product.jpg',
          description: 'API smoke product',
          status: 'active'
        }
      });
      state.created.supermarketProducts.push(product.id);
      const productUpdated = await request(`/admin/supermarket/products/${product.id}`, {
        method: 'PUT',
        token: adminToken,
        body: { stock: 12, price: 13.5 }
      });
      assert(Number(productUpdated.stock) === 12, 'product stock update did not persist');
      const products = await request('/supermarket/products', { query: { keyword: marker } });
      assert(products.some((item) => item.id === product.id), 'public product list did not include added product');
      await request('/supermarket/cart/add', {
        method: 'POST',
        token: buyer.token,
        body: { productId: product.id, quantity: 1 }
      });
      let cart = await request('/supermarket/cart', { token: buyer.token });
      assert(cart.items.some((item) => item.productId === product.id), 'cart did not include added product');
      cart = await request('/supermarket/cart/update', {
        method: 'PUT',
        token: buyer.token,
        body: { productId: product.id, quantity: 2 }
      });
      assert(cart.items.find((item) => item.productId === product.id)?.quantity === 2, 'cart quantity update did not persist');
      cart = await request('/supermarket/cart/remove', {
        method: 'DELETE',
        token: buyer.token,
        body: { productId: product.id }
      });
      assert(!cart.items.some((item) => item.productId === product.id), 'cart remove did not remove product');

      await request('/supermarket/cart/add', {
        method: 'POST',
        token: buyer.token,
        body: { productId: product.id, quantity: 2 }
      });
      const cancelOrder = await request('/supermarket/checkout', {
        method: 'POST',
        token: buyer.token,
        body: { address: '长安大学测试地址', phone: '13900000000', remark: marker }
      });
      assert(cancelOrder.orderId, 'supermarket checkout did not return orderId');
      let afterCheckout = await request(`/supermarket/product/${product.id}`);
      assert(Number(afterCheckout.stock) === 10, 'checkout did not reserve stock');
      const cancelled = await request(`/supermarket/orders/${cancelOrder.orderId}/cancel`, { method: 'PUT', token: buyer.token });
      assert(cancelled.status === 'cancelled', 'supermarket order was not cancelled');
      afterCheckout = await request(`/supermarket/product/${product.id}`);
      assert(Number(afterCheckout.stock) === 12, 'cancel did not restore stock');

      await request('/supermarket/cart/add', {
        method: 'POST',
        token: buyer.token,
        body: { productId: product.id, quantity: 1 }
      });
      const paidOrder = await request('/supermarket/checkout', {
        method: 'POST',
        token: buyer.token,
        body: { address: '长安大学测试地址', phone: '13900000000', remark: `${marker}-pay` }
      });
      const payment = await request('/payments/create', {
        method: 'POST',
        token: buyer.token,
        body: { orderId: paidOrder.orderId, provider: 'mock' }
      });
      assert(payment.id && payment.payUrl, 'payment create did not return id/payUrl');
      const confirmed = await request(`/payments/${payment.id}/mock/confirm`, { method: 'POST', token: buyer.token });
      assert(confirmed.status === 'paid', 'mock payment was not confirmed');
      const refund = await request(`/payments/${payment.id}/refund`, {
        method: 'POST',
        token: buyer.token,
        body: { reason: marker }
      });
      assert(refund.status === 'success', 'refund did not succeed');

      await request(`/admin/supermarket/products/${product.id}`, { method: 'DELETE', token: adminToken });
      state.created.supermarketProducts = state.created.supermarketProducts.filter((id) => id !== product.id);
      await request(`/admin/supermarket/categories/${category.id}`, { method: 'DELETE', token: adminToken });
      state.created.supermarketCategories = state.created.supermarketCategories.filter((id) => id !== category.id);
    });

    await step('tutor publish/audit/list/order/cancel/delete', async () => {
      const tutor = await request('/tutor/publish', {
        method: 'POST',
        token: seller.token,
        body: { subject: `${marker}-math`, grade: '大一', salary: 80, description: 'API smoke tutor', contact: '13900000001' }
      });
      state.created.tutors.push(tutor.id);
      const audited = await request(`/admin/tutors/${tutor.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'active' }
      });
      assert(audited.status === 'active', 'tutor audit did not set active');
      const list = await request('/tutor/list', { query: { subject: marker } });
      assert(list.some((item) => item.id === tutor.id), 'public tutor list did not include audited tutor');
      const order = await request('/tutor/order', {
        method: 'POST',
        token: buyer.token,
        body: { tutorId: tutor.id, hours: 2, address: '长安大学测试地址', phone: '13900000000', remark: marker }
      });
      assert(order.orderId, 'tutor order did not return orderId');
      const cancelled = await request(`/tutor/orders/${order.orderId}/cancel`, { method: 'PUT', token: buyer.token });
      assert(cancelled.status === 'cancelled', 'tutor order was not cancelled');
      await request(`/admin/tutors/${tutor.id}`, { method: 'DELETE', token: adminToken });
      state.created.tutors = state.created.tutors.filter((id) => id !== tutor.id);
    });

    await step('secondhand publish/audit/favorite/order/cancel/delete', async () => {
      const item = await request('/secondhand/publish', {
        method: 'POST',
        token: seller.token,
        body: {
          title: `${marker}-secondhand`,
          category: '学习用品',
          price: 45,
          description: 'API smoke secondhand item',
          images: ['/uploads/e2e-secondhand.jpg']
        }
      });
      state.created.secondhandItems.push(item.id);
      await request(`/admin/secondhand/${item.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'active' }
      });
      const list = await request('/secondhand/list', { query: { keyword: marker } });
      assert(list.some((row) => row.id === item.id), 'public secondhand list did not include item');
      await request(`/secondhand/favorite/${item.id}`, { method: 'POST', token: buyer.token });
      let favorites = await request('/secondhand/favorites', { token: buyer.token });
      assert(favorites.some((row) => row.id === item.id), 'favorite list did not include item');
      await request(`/secondhand/favorite/${item.id}`, { method: 'DELETE', token: buyer.token });
      favorites = await request('/secondhand/favorites', { token: buyer.token });
      assert(!favorites.some((row) => row.id === item.id), 'favorite removal did not persist');
      const order = await request('/secondhand/order', {
        method: 'POST',
        token: buyer.token,
        body: { itemId: item.id, address: '长安大学测试地址', phone: '13900000000', remark: marker }
      });
      assert(order.orderId, 'secondhand order did not return orderId');
      let detail = await request(`/secondhand/detail/${item.id}`);
      assert(detail.status === 'sold', 'secondhand order did not mark item sold');
      const cancelled = await request(`/secondhand/orders/${order.orderId}/cancel`, { method: 'PUT', token: buyer.token });
      assert(cancelled.status === 'cancelled', 'secondhand order was not cancelled');
      detail = await request(`/secondhand/detail/${item.id}`);
      assert(detail.status === 'active', 'secondhand cancel did not restore item status');
      await request(`/admin/secondhand/${item.id}`, { method: 'DELETE', token: adminToken });
      state.created.secondhandItems = state.created.secondhandItems.filter((id) => id !== item.id);
    });

    await step('study material upload/audit/list/download/delete', async () => {
      const material = await request('/study-material/upload', {
        method: 'POST',
        token: buyer.token,
        body: {
          title: `${marker}-material`,
          major: '软件工程',
          grade: '2026',
          subject: marker,
          type: 'pdf',
          size: '1MB',
          description: 'API smoke study material'
        }
      });
      state.created.studyMaterials.push(material.id);
      await request(`/admin/study-materials/${material.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'active' }
      });
      const list = await request('/study-material/list', { query: { subject: marker } });
      assert(list.some((row) => row.id === material.id), 'public study material list did not include material');
      const download = await request(`/study-material/download/${material.id}`, { method: 'POST', token: buyer.token });
      assert(download.downloadCount >= 1, 'download did not increment count');
      await request(`/admin/study-materials/${material.id}`, { method: 'DELETE', token: adminToken });
      state.created.studyMaterials = state.created.studyMaterials.filter((id) => id !== material.id);
    });

    await step('forum publish/audit/list/like/comment/delete', async () => {
      const post = await request('/forum/publish', {
        method: 'POST',
        token: buyer.token,
        body: { title: `${marker}-post`, content: 'API smoke forum content', category: 'study', images: [] }
      });
      state.created.forumPosts.push(post.id);
      await request(`/admin/forum-posts/${post.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'active' }
      });
      const list = await request('/forum/list', { query: { keyword: marker } });
      assert(list.some((row) => row.id === post.id), 'public forum list did not include post');
      const liked = await request(`/forum/like/${post.id}`, { method: 'POST', token: buyer.token });
      assert(liked.likes >= 1, 'forum like did not increment count');
      const comment = await request(`/forum/comment/${post.id}`, {
        method: 'POST',
        token: seller.token,
        body: { content: `${marker}-comment` }
      });
      assert(comment.id, 'forum comment did not return id');
      const detail = await request(`/forum/detail/${post.id}`);
      assert(detail.comments.some((row) => row.id === comment.id), 'forum detail did not include comment');
      await request(`/admin/forum-posts/${post.id}`, { method: 'DELETE', token: adminToken });
      state.created.forumPosts = state.created.forumPosts.filter((id) => id !== post.id);
    });

    await step('driving school add/update/list/inquiry/order/cancel/delete', async () => {
      const school = await request('/admin/driving-schools', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `${marker}-driving`,
          address: '长安大学测试训练场',
          phone: '029-12345678',
          price: 3000,
          description: 'API smoke driving school',
          features: ['一人一车', '周末练车'],
          status: 'active'
        }
      });
      state.created.drivingSchools.push(school.id);
      const updated = await request(`/admin/driving-schools/${school.id}`, {
        method: 'PUT',
        token: adminToken,
        body: { price: 3100, features: ['一人一车', '夜间练车'] }
      });
      assert(Number(updated.price) === 3100, 'driving school update did not persist');
      const list = await request('/driving-school/list');
      assert(list.some((row) => row.id === school.id), 'public driving school list did not include school');
      await request('/driving-school/inquiry', {
        method: 'POST',
        token: buyer.token,
        body: { schoolId: school.id, name: `${marker}-buyer`, phone: '13900000000', question: '测试咨询' }
      });
      const inquiries = await request('/driving-school/my-inquiries', { token: buyer.token });
      const inquiry = inquiries.find((row) => row.schoolId === school.id || row.school_id === school.id);
      assert(inquiry?.id, 'my inquiries did not include created inquiry');
      await request(`/admin/driving-inquiries/${inquiry.id}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'processed' }
      });
      const order = await request('/driving-school/order', {
        method: 'POST',
        token: buyer.token,
        body: { schoolId: school.id, studentName: `${marker}-buyer`, address: '长安大学测试地址', phone: '13900000000', remark: marker }
      });
      assert(order.orderId, 'driving school order did not return orderId');
      const cancelled = await request(`/driving-school/orders/${order.orderId}/cancel`, { method: 'PUT', token: buyer.token });
      assert(cancelled.status === 'cancelled', 'driving school order was not cancelled');
      await request(`/admin/driving-schools/${school.id}`, { method: 'DELETE', token: adminToken });
      state.created.drivingSchools = state.created.drivingSchools.filter((id) => id !== school.id);
    });

    await step('admin stats/orders remain queryable', async () => {
      const stats = await request('/admin/stats', { token: adminToken });
      assert(Number(stats.userCount) >= 2, 'admin stats userCount looks wrong');
      const orders = await request('/admin/orders', { token: adminToken, query: { status: 'cancelled' } });
      assert(Array.isArray(orders), 'admin orders did not return a list');
    });
  } finally {
    if (adminToken) {
      await step('cleanup admin-created test catalog records', async () => cleanup(adminToken));
    }
  }

  console.log('All API smoke checks passed.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
