import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import WorkbenchShell from '../components/layout/WorkbenchShell.vue'
import { clearAuthSession, setAuthUser, type AuthClientType } from '../services/authSession'
import { me } from '../services/authApi'
import { getAuthToken } from '../services/request'

export type WorkbenchRouteName =
  | 'video-parse'
  | 'storyboard'
  | 'voice'
  | 'avatar'
  | 'render'
  | 'AssetCenter'

const businessRouteMeta = {
  requiresAuth: true,
} as const

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/LoginPage.vue'),
    props: { initialMode: 'login' },
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/auth/LoginPage.vue'),
    props: { initialMode: 'register' },
    meta: { public: true },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../pages/admin/AdminLoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/admin',
    component: () => import('../pages/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('../pages/admin/AdminDashboardPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '运营概览' },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('../pages/admin/AdminUsersPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '用户管理' },
      },
      {
        path: 'users/:userId',
        name: 'admin-user-detail',
        component: () => import('../pages/admin/AdminUserDetailPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '用户详情' },
      },
      {
        path: 'models',
        name: 'admin-models',
        component: () => import('../pages/admin/AdminModelsPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '模型配置' },
      },
      {
        path: 'billing-config',
        name: 'admin-billing-config',
        component: () => import('../pages/admin/AdminBillingConfigPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'AI 计费配置' },
      },
      {
        path: 'tasks',
        name: 'admin-tasks',
        component: () => import('../pages/admin/AdminTasksPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '任务管理' },
      },
      {
        path: 'assets',
        name: 'admin-assets',
        component: () => import('../pages/admin/AdminAssetsPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '资产管理' },
      },
      {
        path: 'credit-logs',
        name: 'admin-credit-logs',
        component: () => import('../pages/admin/AdminCreditLogsPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '积分流水' },
      },
      {
          path: 'activation-codes',
          name: 'admin-activation-codes',
          component: () => import('../pages/admin/AdminActivationCodesPage.vue'),
          meta: { title: '内测码' },
        },
        {
          path: 'operation-logs',
        name: 'admin-operation-logs',
        component: () => import('../pages/admin/AdminOperationLogsPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '操作日志' },
      },
    ],
  },
  {
    path: '/',
    redirect: '/video-parse',
  },
  {
    path: '/',
    component: WorkbenchShell,
    children: [
      {
        path: 'video-parse',
        name: 'video-parse',
        component: () => import('../pages/video/VideoParsePage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'video-parse' },
      },
      {
        path: 'storyboard',
        name: 'storyboard',
        component: () => import('../pages/script/StoryboardPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'storyboard' },
      },
      {
        path: 'voice',
        name: 'voice',
        component: () => import('../pages/voice/VoiceTtsPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'voice' },
      },
      {
        path: 'avatar',
        name: 'avatar',
        component: () => import('../pages/avatar/AvatarGeneratePage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'avatar' },
      },
      {
        path: 'quick-render',
        redirect: { name: 'render', query: { mode: 'quick' } },
      },
      {
        path: 'render',
        name: 'render',
        component: () => import('../pages/render/RenderVideoPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'render' },
      },
      {
        path: 'account',
        redirect: '/assets',
      },
      {
        path: 'assets',
        name: 'AssetCenter',
        component: () => import('../pages/AssetCenterPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'AssetCenter', title: '资产中心' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (!to.matched.some((record) => record.meta.requiresAuth)) {
    return true
  }

  const needsAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const clientType: AuthClientType = needsAdmin ? 'ADMIN_WEB' : 'USER_WEB'
  const token = getAuthToken(clientType)
  const loginPath = to.path.startsWith('/admin') ? '/admin/login' : '/login'
  const redirectToLogin = () => ({
    path: loginPath,
    query: { redirect: to.fullPath },
  })

  if (!token) {
    return redirectToLogin()
  }

  try {
    const user = await me(clientType)
    setAuthUser(user, clientType)
    if (user.status && user.status !== 'ENABLED') {
      clearAuthSession(clientType)
      return redirectToLogin()
    }
    if (needsAdmin && user.role !== 'ADMIN') {
      return {
        path: '/admin/login',
        query: { redirect: to.fullPath },
      }
    }
    return true
  } catch {
    clearAuthSession(clientType)
    return redirectToLogin()
  }
})

export default router
