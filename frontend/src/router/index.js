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
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false, keepAlive: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true, keepAlive: false },
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
        meta: { title: '家教板块', keepAlive: true }
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
        meta: { title: '驾校板块', keepAlive: true }
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
        meta: { title: '校园论坛', keepAlive: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: '我的订单', keepAlive: true }
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token
  const isInitialNavigation = from.matched.length === 0
  const startupLoginShown = sessionStorage.getItem('startup-login-shown') === '1'

  if (isInitialNavigation && !startupLoginShown) {
    sessionStorage.setItem('startup-login-shown', '1')

    if (to.path !== '/login' && to.path !== '/register') {
      next('/login')
      return
    }
  }

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && userStore.user?.role !== 'admin') {
    next('/')
  } else if ((to.path === '/login' || to.path === '/register') && token) {
    next('/')
  } else {
    next()
  }
})

export default router
