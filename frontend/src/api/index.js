import request from '@/utils/request'

export const authApi = {
  sendVerification: (data) => request.post('/auth/send-verification', data),
  register: (data) => request.post('/auth/register', data),
  login: (data) => request.post('/auth/login', data),
  getUserInfo: () => request.get('/auth/me'),
  logout: () => request.post('/auth/logout')
}

export const snackApi = {
  getMerchants: () => request.get('/snack/merchants'),
  getSnacks: (params) => request.get('/snack/list', { params }),
  getSnackDetail: (id) => request.get(`/snack/detail/${id}`),
  createOrder: (data) => request.post('/snack/order', data),
  getOrders: () => request.get('/snack/orders')
}

export const supermarketApi = {
  getCategories: () => request.get('/supermarket/categories'),
  getProducts: (params) => request.get('/supermarket/products', { params }),
  getProductDetail: (id) => request.get(`/supermarket/product/${id}`),
  addToCart: (data) => request.post('/supermarket/cart/add', data),
  getCart: () => request.get('/supermarket/cart'),
  updateCart: (data) => request.put('/supermarket/cart/update', data),
  removeFromCart: (data) => request.delete('/supermarket/cart/remove', { data }),
  checkout: (data) => request.post('/supermarket/checkout', data),
  getOrders: () => request.get('/supermarket/orders'),
  getOrderDetail: (id) => request.get(`/supermarket/order/${id}`)
}

export const tutorApi = {
  getTutors: (params) => request.get('/tutor/list', { params }),
  getTutorDetail: (id) => request.get(`/tutor/detail/${id}`),
  publishTutor: (data) => request.post('/tutor/publish', data),
  getMyTutors: () => request.get('/tutor/my')
}

export const secondhandApi = {
  getItems: (params) => request.get('/secondhand/list', { params }),
  getItemDetail: (id) => request.get(`/secondhand/detail/${id}`),
  publishItem: (data) => request.post('/secondhand/publish', data),
  getMyItems: () => request.get('/secondhand/my'),
  getFavorites: () => request.get('/secondhand/favorites'),
  favoriteItem: (id) => request.post(`/secondhand/favorite/${id}`),
  unfavoriteItem: (id) => request.delete(`/secondhand/favorite/${id}`)
}

export const drivingSchoolApi = {
  getSchools: () => request.get('/driving-school/list'),
  getSchoolDetail: (id) => request.get(`/driving-school/detail/${id}`),
  submitInquiry: (data) => request.post('/driving-school/inquiry', data),
  getMyInquiries: () => request.get('/driving-school/my-inquiries')
}

export const studyMaterialApi = {
  getMaterials: (params) => request.get('/study-material/list', { params }),
  getMaterialDetail: (id) => request.get(`/study-material/detail/${id}`),
  uploadMaterial: (data) => request.post('/study-material/upload', data),
  getMyMaterials: () => request.get('/study-material/my'),
  downloadMaterial: (id) => request.post(`/study-material/download/${id}`)
}

export const forumApi = {
  getCategories: () => request.get('/forum/categories'),
  getPosts: (params) => request.get('/forum/list', { params }),
  getPostDetail: (id) => request.get(`/forum/detail/${id}`),
  publishPost: (data) => request.post('/forum/publish', data),
  likePost: (id) => request.post(`/forum/like/${id}`),
  commentPost: (id, data) => request.post(`/forum/comment/${id}`, data),
  getMyPosts: () => request.get('/forum/my')
}

export const adminApi = {
  getStats: () => request.get('/admin/stats'),
  getUsers: (params) => request.get('/admin/users', { params }),
  updateUserStatus: (id, data) => request.put(`/admin/users/${id}/status`, data),
  getSnacks: (params) => request.get('/admin/snacks', { params }),
  addSnack: (data) => request.post('/admin/snacks', data),
  updateSnack: (id, data) => request.put(`/admin/snacks/${id}`, data),
  deleteSnack: (id) => request.delete(`/admin/snacks/${id}`),
  getSupermarketCategories: () => request.get('/admin/supermarket/categories'),
  addSupermarketCategory: (data) => request.post('/admin/supermarket/categories', data),
  updateSupermarketCategory: (id, data) => request.put(`/admin/supermarket/categories/${id}`, data),
  deleteSupermarketCategory: (id) => request.delete(`/admin/supermarket/categories/${id}`),
  getSupermarketProducts: (params) => request.get('/admin/supermarket/products', { params }),
  addSupermarketProduct: (data) => request.post('/admin/supermarket/products', data),
  updateSupermarketProduct: (id, data) => request.put(`/admin/supermarket/products/${id}`, data),
  deleteSupermarketProduct: (id) => request.delete(`/admin/supermarket/products/${id}`),
  getTutors: (params) => request.get('/admin/tutors', { params }),
  updateTutorStatus: (id, data) => request.put(`/admin/tutors/${id}/status`, data),
  deleteTutor: (id) => request.delete(`/admin/tutors/${id}`),
  getSecondhandItems: (params) => request.get('/admin/secondhand', { params }),
  updateSecondhandStatus: (id, data) => request.put(`/admin/secondhand/${id}/status`, data),
  deleteSecondhandItem: (id) => request.delete(`/admin/secondhand/${id}`),
  getStudyMaterials: (params) => request.get('/admin/study-materials', { params }),
  updateStudyMaterialStatus: (id, data) => request.put(`/admin/study-materials/${id}/status`, data),
  deleteStudyMaterial: (id) => request.delete(`/admin/study-materials/${id}`),
  getForumPosts: (params) => request.get('/admin/forum-posts', { params }),
  updateForumPostStatus: (id, data) => request.put(`/admin/forum-posts/${id}/status`, data),
  deleteForumPost: (id) => request.delete(`/admin/forum-posts/${id}`),
  getOrders: (params) => request.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => request.put(`/admin/orders/${id}/status`, data),
  getDrivingSchools: (params) => request.get('/admin/driving-schools', { params }),
  addDrivingSchool: (data) => request.post('/admin/driving-schools', data),
  updateDrivingSchool: (id, data) => request.put(`/admin/driving-schools/${id}`, data),
  deleteDrivingSchool: (id) => request.delete(`/admin/driving-schools/${id}`),
  getDrivingInquiries: () => request.get('/admin/driving-inquiries'),
  updateDrivingInquiryStatus: (id, data) => request.put(`/admin/driving-inquiries/${id}/status`, data)
}
