const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function login(studentId, password) {
  try {
    const resp = await axios.post(`${API_BASE}/auth/login`, { studentId, password });
    return resp.data.data.token;
  } catch (e) {
    console.error('login error', studentId, e.response ? e.response.data : e.message);
    return null;
  }
}

async function publish(token) {
  try {
    const resp = await axios.post(`${API_BASE}/secondhand/publish`, {
      title: '测试物品-' + Date.now(),
      category: '测试',
      price: 1.23,
      description: '用于复现的测试商品',
      images: []
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('publish resp', resp.data);
    return resp.data.data && resp.data.data.id;
  } catch (e) {
    console.error('publish error', e.response ? e.response.data : e.message);
    return null;
  }
}

async function approve(adminToken, id) {
  try {
    const resp = await axios.put(`${API_BASE}/admin/secondhand/${id}/status`, { status: 'active' }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('approve resp', resp.data);
    return true;
  } catch (e) {
    console.error('approve error', e.response ? e.response.data : e.message);
    return false;
  }
}

async function listItems() {
  try {
    const resp = await axios.get(`${API_BASE}/secondhand/list`);
    console.log('list count', Array.isArray(resp.data.data) ? resp.data.data.length : 'unknown');
    return resp.data.data;
  } catch (e) {
    console.error('list error', e.response ? e.response.data : e.message);
    return null;
  }
}

async function run() {
  console.log('Attempting user login...');
  const userToken = await login('20220001', '123456');
  if (!userToken) {
    console.warn('User login failed; trying fallback admin login only');
  }

  console.log('Attempting admin login...');
  const adminToken = await login('2024000000', 'admin123');
  if (!adminToken) {
    console.error('Admin login failed; cannot continue');
    process.exit(1);
  }

  let itemId = null;
  if (userToken) {
    console.log('Publishing item as user...');
    itemId = await publish(userToken);
    console.log('Published item id:', itemId);
  }

  if (!itemId) {
    console.log('No item created by user; attempting to create a placeholder via admin');
    // admin cannot publish secondhand via admin endpoint; skip
  }

  if (itemId) {
    console.log('Approving item as admin...');
    const ok = await approve(adminToken, itemId);
    console.log('Approve ok:', ok);
  }

  console.log('Fetching public list...');
  const items = await listItems();
  if (items) {
    const found = itemId ? items.find(i => i.id === itemId) : null;
    console.log('Item found in public list:', !!found);
    if (found) console.log('Found item:', found);
  }
}

run().catch(e => console.error('run failed', e));
