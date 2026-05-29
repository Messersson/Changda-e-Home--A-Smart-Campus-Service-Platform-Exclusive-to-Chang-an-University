import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false, keepAlive: false }
  },
  {
    path: '/merchant-login',
    name: 'MerchantLogin',
    component: () => import('@/views/MerchantLogin.vue'),
    meta: { requiresAuth: false, keepAlive: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false, keepAlive: false }
  },
  {
    path: '/merchant-register',
    name: 'MerchantRegister',
    component: () => import('@/views/MerchantRegister.vue'),
    meta: { requiresAuth: false, keepAlive: false }
  },
  {
    path: '/pay/:paymentId',
    name: 'PayCenter',
    component: () => import('@/views/PayCenter.vue'),
    meta: { requiresAuth: true, keepAlive: false, title: '订单支付' }
  },
  {
    path: '/pay/mock/:paymentId',
    redirect: (to) => `/pay/${to.params.paymentId}`
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: false, keepAlive: false },
    redirect: '/snack',
    children: [
      {
        path: 'snack',
        name: 'Snack',
        component: () => import('@/views/Snack.vue'),
        meta: { title: '东门小吃摊', keepAlive: true }
      },
      {
        path: 'supermarket',
        name: 'Supermarket',
        component: () => import('@/views/Supermarket.vue'),
        meta: { title: '校园超市', keepAlive: true }
      },
      {
        path: 'tutor',
        name: 'Tutor',
        component: () => import('@/views/Tutor.vue'),
        meta: { title: '家教板块', requiresAuth: true, keepAlive: true }
      },
      {
        path: 'secondhand',
        name: 'Secondhand',
        component: () => import('@/views/Secondhand.vue'),
        meta: { title: '二手交易', keepAlive: true }
      },
      {
        path: 'driving-school',
        name: 'DrivingSchool',
        component: () => import('@/views/DrivingSchool.vue'),
        meta: { title: '驾校板块', requiresAuth: true, keepAlive: true }
      },
      {
        path: 'study-material',
        name: 'StudyMaterial',
        component: () => import('@/views/StudyMaterial.vue'),
        meta: { title: '学习资料', keepAlive: true }
      },
      {
        path: 'forum',
        name: 'Forum',
        component: () => import('@/views/Forum.vue'),
        meta: { title: '校园论坛', keepAlive: true, merchantAllowed: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: '我的订单', requiresAuth: true, keepAlive: true }
      }
    ]
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/Index.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, keepAlive: false },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '数据统计', keepAlive: true }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/Users.vue'),
        meta: { title: '用户管理', keepAlive: true }
      },
      {
        path: 'merchants',
        name: 'AdminMerchants',
        component: () => import('@/views/admin/Merchants.vue'),
        meta: { title: '商家管理', keepAlive: true }
      },
      {
        path: 'snacks',
        name: 'AdminSnacks',
        component: () => import('@/views/admin/Snacks.vue'),
        meta: { title: '小吃摊管理', keepAlive: true }
      },
      {
        path: 'supermarket',
        name: 'AdminSupermarket',
        component: () => import('@/views/admin/Supermarket.vue'),
        meta: { title: '超市管理', keepAlive: true }
      },
      {
        path: 'tutors',
        name: 'AdminTutors',
        component: () => import('@/views/admin/Tutors.vue'),
        meta: { title: '家教管理', keepAlive: true }
      },
      {
        path: 'secondhand',
        name: 'AdminSecondhand',
        component: () => import('@/views/admin/Secondhand.vue'),
        meta: { title: '二手交易管理', keepAlive: true }
      },
      {
        path: 'study-materials',
        name: 'AdminStudyMaterials',
        component: () => import('@/views/admin/StudyMaterials.vue'),
        meta: { title: '学习资料管理', keepAlive: true }
      },
      {
        path: 'forum',
        name: 'AdminForum',
        component: () => import('@/views/admin/Forum.vue'),
        meta: { title: '论坛管理', keepAlive: true }
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: () => import('@/views/admin/Orders.vue'),
        meta: { title: '订单管理', keepAlive: true }
      },
      {
        path: 'driving-schools',
        name: 'AdminDrivingSchools',
        component: () => import('@/views/admin/DrivingSchools.vue'),
        meta: { title: '驾校管理', keepAlive: true }
      }
    ]
  },
  {
    path: '/merchant',
    name: 'Merchant',
    component: () => import('@/views/merchant/Index.vue'),
    meta: { requiresAuth: true, requiresMerchant: true, keepAlive: false },
    redirect: '/merchant/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'MerchantDashboard',
        component: () => import('@/views/merchant/Dashboard.vue'),
        meta: { title: '商家概览', keepAlive: true }
      },
      {
        path: 'snacks',
        name: 'MerchantSnacks',
        component: () => import('@/views/merchant/Snacks.vue'),
        meta: { title: '小吃商品', keepAlive: true }
      },
      {
        path: 'products',
        name: 'MerchantProducts',
        component: () => import('@/views/merchant/Products.vue'),
        meta: { title: '超市商品', keepAlive: true }
      },
      {
        path: 'orders',
        name: 'MerchantOrders',
        component: () => import('@/views/merchant/Orders.vue'),
        meta: { title: '商家订单', keepAlive: true }
      },
      {
        path: 'after-sales',
        name: 'MerchantAfterSales',
        component: () => import('@/views/merchant/AfterSales.vue'),
        meta: { title: '退款退货', keepAlive: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token
  const role = userStore.user?.role
  const publicAuthPaths = ['/login', '/merchant-login', '/register', '/merchant-register']

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && role !== 'admin') {
    next(role === 'merchant' ? '/merchant/dashboard' : '/')
  } else if (to.meta.requiresMerchant && role !== 'merchant' && role !== 'admin') {
    next('/')
  } else if (role === 'merchant' && to.matched.some((item) => item.name === 'Home') && !to.meta.merchantAllowed) {
    next('/forum')
  } else if (publicAuthPaths.includes(to.path) && token) {
    next(role === 'admin' ? '/admin/dashboard' : role === 'merchant' ? '/merchant/dashboard' : '/')
  } else {
    next()
  }
})

export default router
