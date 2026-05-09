import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import WorkbenchShell from '../components/layout/WorkbenchShell.vue'
import { getAuthToken } from '../services/request'

export type WorkbenchRouteName = 'video-parse' | 'storyboard' | 'voice' | 'avatar' | 'render'

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
        path: 'render',
        name: 'render',
        component: () => import('../pages/render/RenderVideoPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'render' },
      },
      {
        path: 'assets',
        redirect: { name: 'video-parse' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (!to.matched.some((record) => record.meta.requiresAuth)) {
    return true
  }

  if (getAuthToken()) {
    return true
  }

  return {
    path: '/login',
    query: { redirect: to.fullPath },
  }
})

export default router
