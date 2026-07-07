import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import WorkbenchShell from '../components/layout/WorkbenchShell.vue'
import { clearAuthSession, getAuthUser, setAuthUser, type AuthClientType } from '../services/authSession'
import { me } from '../services/authApi'
import { getAuthToken } from '../services/request'
import { recordRecentTool } from '../services/systemWorkspaceStore'
import { canAccessPetCreation, isPetOnlyWorkspaceUser } from '../config/petCreationAccess'

export type WorkbenchRouteName =
  | 'video-parse'
  | 'benchmark-create-page'
  | 'asset-reuse'
  | 'script-rewrite'
  | 'storyboard'
  | 'voice'
  | 'avatar'
  | 'render'
  | 'render-manual'
  | 'pet-render'
  | 'pet-dialogue-create'
  | 'pet-role-setup'
  | 'pet-storyboard'
  | 'pet-generation-status'
  | 'pet-templates'
  | 'pet-works'
  | 'pet-assets'
  | 'pet-video-parse'
  | 'pet-storyboard-tool'
  | 'pet-ai-pet-generate'
  | 'pet-background-generate'
  | 'pet-voice'
  | 'my-videos'
  | 'AssetCenter'
  | 'system-credits'
  | 'system-profile'
  | 'system-favorites'
  | 'system-recent'
  | 'system-preferences'
  | 'help'
  | 'help-tutorials'
  | 'help-faq'
  | 'help-changelog'
  | 'help-contact'

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
        path: 'selling-point-templates',
        name: 'admin-selling-point-templates',
        component: () => import('../pages/admin/AdminSellingPointTemplatesPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '卖点模板管理' },
      },
      {
        path: 'provider-ops',
        name: 'admin-provider-ops',
        component: () => import('../pages/admin/AdminProviderOpsTicketsPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '运维工单' },
      },
      {
        path: 'feedback',
        name: 'admin-feedback',
        component: () => import('../pages/admin/AdminCustomerFeedbackPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: '客服工单' },
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
    redirect: '/render',
  },
  {
    path: '/',
    component: WorkbenchShell,
    children: [
      {
        path: 'video-parse',
        name: 'video-parse',
        component: () => import('../pages/video/AssetBenchmarkPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'video-parse', title: '爆款对标' },
      },
      {
        path: 'benchmark-create',
        name: 'benchmark-create-page',
        component: () => import('../pages/video/VideoParsePage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'benchmark-create', title: '爆款对标创作' },
      },
      {
        path: 'asset-reuse',
        name: 'asset-reuse',
        component: () => import('../pages/render/AssetReuseCreatePage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'asset-reuse', title: '资产复用创作' },
      },
      {
        path: 'storyboard',
        name: 'storyboard',
        component: () => import('../pages/script/StoryboardPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'storyboard' },
      },
        {
          path: 'copywriting',
          name: 'script-rewrite',
          component: () => import('../pages/script/ScriptRewritePage.vue'),
          meta: { ...businessRouteMeta, menuKey: 'script-rewrite', title: '爆款对标' },
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
        redirect: { name: 'render' },
      },
      {
        path: 'render',
        name: 'render',
        component: () => import('../pages/render/car-sales/CarSalesCreatePage.vue'),
        meta: { public: true, menuKey: 'render' },
      },
      {
        path: 'pet-render',
        name: 'pet-render',
        component: () => import('../pages/pet-creation/PetCreationHomePage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-render',
          title: 'AI萌宠创作',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-render/dialogue',
        name: 'pet-dialogue-create',
        component: () => import('../pages/pet-creation/PetDialogueCreatePage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-render',
          title: '宠物对话视频创建',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-render/role',
        name: 'pet-role-setup',
        component: () => import('../pages/pet-creation/PetRoleSetupPage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-render',
          title: '素材上传与角色设定',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-render/storyboard',
        name: 'pet-storyboard',
        component: () => import('../pages/pet-creation/PetStoryboardPage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-render',
          title: '脚本与分镜生成',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-render/progress/:taskId?',
        name: 'pet-generation-status',
        component: () => import('../pages/pet-creation/PetGenerationStatusPage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-render',
          title: '视频生成中',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-templates',
        name: 'pet-templates',
        component: () => import('../pages/pet-creation/PetTemplateLibraryPage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-templates',
          title: '萌宠模板库',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-works',
        name: 'pet-works',
        component: () => import('../pages/pet-creation/PetWorksPage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-works',
          title: '我的宠物作品',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-assets',
        name: 'pet-assets',
        component: () => import('../pages/pet-creation/PetAssetCenterPage.vue'),
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-assets',
          title: '宠物资产中心',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-tools/benchmark',
        name: 'pet-video-parse',
        component: () => import('../pages/pet-creation/PetAssetScriptToolPage.vue'),
        props: { mode: 'benchmark' },
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-video-parse',
          title: '宠物爆款对标',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-tools/storyboard',
        name: 'pet-storyboard-tool',
        component: () => import('../pages/pet-creation/PetAssetScriptToolPage.vue'),
        props: { mode: 'storyboard' },
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-storyboard-tool',
          title: '宠物分镜生成',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-tools/ai-pet',
        name: 'pet-ai-pet-generate',
        component: () => import('../pages/pet-creation/PetImageAssetGeneratePage.vue'),
        props: { mode: 'pet' },
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-ai-pet-generate',
          title: 'AI宠物生成',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-tools/background',
        name: 'pet-background-generate',
        component: () => import('../pages/pet-creation/PetImageAssetGeneratePage.vue'),
        props: { mode: 'background' },
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-background-generate',
          title: '背景图生成',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'pet-tools/voice',
        name: 'pet-voice',
        component: () => import('../pages/voice/VoiceTtsPage.vue'),
        props: {
          businessDomain: 'pet',
          pageTitle: '声音生成',
          pageDescription: '生成宠物口播、旁白或角色台词音频，并保存到宠物资产中心。',
        },
        meta: {
          ...businessRouteMeta,
          menuKey: 'pet-voice',
          title: '声音生成',
          requiresPetCreationAccess: true,
        },
      },
      {
        path: 'my-videos',
        name: 'my-videos',
        component: () => import('../pages/task/TaskCenter.vue'),
        meta: { ...businessRouteMeta, menuKey: 'my-videos', title: '我的视频' },
      },
      {
        path: 'account',
        redirect: '/system/profile',
      },
      {
        path: 'assets',
        name: 'AssetCenter',
        component: () => import('../pages/AssetCenterPage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'AssetCenter', title: '资产中心' },
      },
      {
        path: 'system',
        redirect: '/system/profile',
      },
      {
        path: 'system/profile',
        name: 'system-profile',
        component: () => import('../pages/system/SystemProfilePage.vue'),
        meta: { ...businessRouteMeta, menuKey: 'system-profile', title: '个人中心' },
      },
      {
        path: 'system/credits',
        name: 'system-credits',
        component: () => import('../pages/workbench/WorkbenchInfoPage.vue'),
        props: {
          eyebrow: '系统管理',
          title: '积分记录',
          description: '查看积分余额、冻结积分和扣费记录；当前先与资产中心积分明细复用，后续再补账户侧完整报表。',
          cards: [
            {
              title: '积分明细',
              description: '查看生成任务预扣、结算、退款和补扣记录。',
              to: '/assets?tab=credits',
              actionLabel: '进入明细',
            },
            {
              title: '扣费口径',
              description: '生成前展示预计积分，任务完成后按实际用量结算。',
              status: '已接入',
            },
            {
              title: '余额提醒',
              description: '余额不足时会在生成前提示，避免提交后才失败。',
              status: '已接入',
            },
          ],
        },
        meta: { ...businessRouteMeta, menuKey: 'system-credits', title: '积分记录' },
      },
      {
        path: 'system/favorites',
        name: 'system-favorites',
        component: () => import('../pages/system/SystemFavoritesPage.vue'),
        props: {
          eyebrow: '系统管理',
          title: '我的收藏',
          description: '用于沉淀常用模板、数字人、音色和素材；当前保留入口，优先不打断主创作链路。',
          cards: [
            {
              title: '收藏素材',
              description: '后续可从资产中心把高频图片、视频、文案、分镜加入收藏。',
              status: '规划中',
            },
            {
              title: '收藏模板',
              description: '后续可收藏高匹配卖点模板和分镜模板，用于自动匹配排序。',
              status: '规划中',
            },
            {
              title: '收藏数字人与音色',
              description: '后续可把常用销售顾问形象和口播音色加入快捷入口。',
              status: '规划中',
            },
          ],
        },
        meta: { ...businessRouteMeta, menuKey: 'system-favorites', title: '我的收藏' },
      },
      {
        path: 'system/recent',
        name: 'system-recent',
        component: () => import('../pages/system/SystemRecentPage.vue'),
        props: {
          eyebrow: '系统管理',
          title: '最近使用',
          description: '汇总最近生成任务、最近访问资产和最近使用工具；当前先复用任务中心和资产中心入口。',
          cards: [
            {
              title: '最近生成',
              description: '查看最近提交、运行中和已完成的视频生成任务。',
              to: '/my-videos',
              actionLabel: '进入我的视频',
            },
            {
              title: '最近资产',
              description: '按时间查看最近上传、生成或保存的素材资产。',
              to: '/assets?tab=materials',
              actionLabel: '进入资产中心',
            },
            {
              title: '最近工具',
              description: '后续记录爆款对标、分镜生成等工具使用历史。',
              status: '规划中',
            },
          ],
        },
        meta: { ...businessRouteMeta, menuKey: 'system-recent', title: '最近使用' },
      },
      {
        path: 'system/preferences',
        name: 'system-preferences',
        component: () => import('../pages/system/SystemPreferencesPage.vue'),
        props: {
          eyebrow: '系统管理',
          title: '偏好设置',
          description: '沉淀默认视频比例、语言、字幕、音色和数字人偏好；当前保留轻量入口。',
          cards: [
            {
              title: '生成默认值',
              description: '后续可保存默认比例、时长、语言、字幕策略和模型偏好。',
              status: '规划中',
            },
            {
              title: '数字人与音色偏好',
              description: '后续可指定默认数字人形象、音色和讲述风格。',
              status: '规划中',
            },
            {
              title: '推荐偏好',
              description: '后续可影响卖点模板、素材和背景音乐的自动匹配排序。',
              status: '规划中',
            },
          ],
        },
        meta: { ...businessRouteMeta, menuKey: 'system-preferences', title: '偏好设置' },
      },
      {
        path: 'help',
        redirect: '/help/tutorials',
      },
      {
        path: 'help/tutorials',
        name: 'help-tutorials',
        component: () => import('../pages/help/TutorialPage.vue'),
        meta: { public: true, menuKey: 'help-tutorials', title: '使用教程' },
      },
      {
        path: 'help/faq',
        name: 'help-faq',
        component: () => import('../pages/workbench/WorkbenchInfoPage.vue'),
        props: {
          eyebrow: '帮助中心',
          title: '常见问题',
          description: '沉淀生成失败、积分扣费、素材选择、第三方模型等待等高频问题。',
          cards: [
            {
              title: '生成为什么排队',
              description: '模型任务会经历排队、运行、合成和结算阶段，任务中心会展示当前状态。',
              status: '已说明',
            },
            {
              title: '素材怎么选择',
              description: '车辆图片建议 3-8 张，按外观、内饰、细节、场景补齐更利于分镜。',
              status: '已说明',
            },
            {
              title: '积分怎么结算',
              description: '提交前预估，完成后按实际使用结算；失败任务按后端结算策略处理。',
              to: '/system/credits',
              actionLabel: '查看积分',
            },
          ],
        },
        meta: { public: true, menuKey: 'help-faq', title: '常见问题' },
      },
      {
        path: 'help/changelog',
        name: 'help-changelog',
        component: () => import('../pages/workbench/WorkbenchInfoPage.vue'),
        props: {
          eyebrow: '帮助中心',
          title: '更新日志',
          description: '记录汽车销售一键成片、资产中心、任务中心和 AI 工具区的前端改造进展。',
          cards: [
            {
              title: '创作中心三条链路',
              description: '已补齐 AI 智能创作、爆款对标创作和资产复用创作入口。',
              status: '已完成',
            },
            {
              title: '资产与模板体系',
              description: '已补业务视图、自动匹配、标签和推荐理由展示。',
              status: '已完成',
            },
            {
              title: '系统与帮助入口',
              description: '当前补齐轻量入口，后续按真实运营需求逐步落地。',
              status: '本次新增',
            },
          ],
        },
        meta: { public: true, menuKey: 'help-changelog', title: '更新日志' },
      },
      {
        path: 'help/contact',
        name: 'help-contact',
        component: () => import('../pages/workbench/WorkbenchInfoPage.vue'),
        props: {
          eyebrow: '帮助中心',
          title: '联系客服',
          description: '用于后续接入客服工单、问题反馈和供应商异常反馈；当前先保留入口说明。',
          cards: [
            {
              title: '问题反馈',
              description: '后续支持提交页面问题、生成异常和素材使用问题。',
              status: '规划中',
            },
            {
              title: '任务异常',
              description: '生成失败或长时间运行时，可先在任务中心查看状态和错误信息。',
              to: '/my-videos',
              actionLabel: '进入我的视频',
            },
            {
              title: '资产问题',
              description: '素材无法预览、分类不准或复用失败时，可先在资产中心定位资产。',
              to: '/assets?tab=materials',
              actionLabel: '进入资产中心',
            },
          ],
        },
        meta: { public: true, menuKey: 'help-contact', title: '联系客服' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const PET_ONLY_BLOCKED_ROUTE_NAMES = new Set([
  'render',
  'render-manual',
  'benchmark-create-page',
  'asset-reuse',
  'video-parse',
  'script-rewrite',
  'storyboard',
  'avatar',
  'voice',
  'my-videos',
  'AssetCenter',
  'help-tutorials',
  'help-faq',
  'help-changelog',
  'help-contact',
])

function petOnlyRedirectFor(toName: unknown) {
  return PET_ONLY_BLOCKED_ROUTE_NAMES.has(String(toName || '')) ? { name: 'pet-render' as const } : null
}

router.beforeEach(async (to) => {
  if (to.name === 'render' && to.query.mode === 'manual' && !getAuthToken('USER_WEB')) {
    return {
      name: 'render',
      query: { login: 'required', redirect: to.fullPath },
    }
  }

  const cachedWorkbenchUser = getAuthUser('USER_WEB')
  const cachedPetOnlyRedirect = cachedWorkbenchUser && isPetOnlyWorkspaceUser(cachedWorkbenchUser)
    ? petOnlyRedirectFor(to.name)
    : null
  if (cachedPetOnlyRedirect) {
    return cachedPetOnlyRedirect
  }

  if (!to.matched.some((record) => record.meta.requiresAuth)) {
    return true
  }

  const needsAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const needsPetCreationAccess = to.matched.some((record) => record.meta.requiresPetCreationAccess)
  const clientType: AuthClientType = needsAdmin ? 'ADMIN_WEB' : 'USER_WEB'
  const token = getAuthToken(clientType)
  const redirectToAuthEntry = () => {
    if (needsAdmin || to.path.startsWith('/admin')) {
      return {
        path: '/admin/login',
        query: { redirect: to.fullPath },
      }
    }
    return {
      name: 'render',
      query: { login: 'required', redirect: to.fullPath },
    }
  }
  const redirectNoPetAccess = () => ({ name: 'render' as const })

  if (!token) {
    return redirectToAuthEntry()
  }

  const cachedUser = getAuthUser(clientType)
  if (cachedUser) {
    if (cachedUser.status && cachedUser.status !== 'ENABLED') {
      clearAuthSession(clientType)
      return redirectToAuthEntry()
    }
    if (needsAdmin && cachedUser.role !== 'ADMIN') {
      return {
        path: '/admin/login',
        query: { redirect: to.fullPath },
      }
    }
    if (needsPetCreationAccess) {
      if (canAccessPetCreation(cachedUser)) return true
      try {
        const user = await me(clientType)
        setAuthUser(user, clientType)
        if (user.status && user.status !== 'ENABLED') {
          clearAuthSession(clientType)
          return redirectToAuthEntry()
        }
        return canAccessPetCreation(user) ? true : redirectNoPetAccess()
      } catch {
        clearAuthSession(clientType)
        return redirectToAuthEntry()
      }
    }
    const petOnlyRedirect = isPetOnlyWorkspaceUser(cachedUser) ? petOnlyRedirectFor(to.name) : null
    if (petOnlyRedirect) {
      return petOnlyRedirect
    }
    return true
  }

  if (clientType === 'USER_WEB') {
    if (needsPetCreationAccess) {
      try {
        const user = await me(clientType)
        setAuthUser(user, clientType)
        if (user.status && user.status !== 'ENABLED') {
          clearAuthSession(clientType)
          return redirectToAuthEntry()
        }
        return canAccessPetCreation(user) ? true : redirectNoPetAccess()
      } catch {
        clearAuthSession(clientType)
        return redirectToAuthEntry()
      }
    }
    return true
  }

  try {
    const user = await me(clientType)
    setAuthUser(user, clientType)
    if (user.status && user.status !== 'ENABLED') {
      clearAuthSession(clientType)
      return redirectToAuthEntry()
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
    return redirectToAuthEntry()
  }
})

const recentToolTitles: Partial<Record<WorkbenchRouteName, string>> = {
  render: 'AI 智能创作',
  'pet-render': 'AI 萌宠创作',
  'pet-dialogue-create': '宠物对话视频创建',
  'pet-role-setup': '素材上传与角色设定',
  'pet-storyboard': '脚本与分镜生成',
  'pet-generation-status': '视频生成中',
  'pet-templates': '萌宠模板库',
  'pet-works': '我的宠物作品',
  'pet-assets': '宠物资产中心',
  'pet-video-parse': '宠物爆款对标',
  'pet-storyboard-tool': '宠物分镜生成',
  'pet-ai-pet-generate': 'AI宠物生成',
  'pet-background-generate': '背景图生成',
  'pet-voice': '声音生成',
  'video-parse': '爆款对标',
  'benchmark-create-page': '爆款对标创作',
  'asset-reuse': '资产复用创作',
  'script-rewrite': '爆款对标',
  storyboard: '分镜生成',
  avatar: '数字人形象',
  voice: '声音生成',
  'my-videos': '我的视频',
  AssetCenter: '资产中心',
  'system-profile': '个人中心',
  'system-credits': '积分记录',
  'system-favorites': '我的收藏',
  'system-preferences': '偏好设置',
  help: '帮助中心',
  'help-tutorials': '使用教程',
  'help-faq': '常见问题',
  'help-changelog': '更新日志',
  'help-contact': '联系客服',
}

const recentToolSubtitles: Partial<Record<WorkbenchRouteName, string>> = {
  render: '创作中心',
  'pet-render': '宠物创作中心',
  'pet-dialogue-create': '宠物创作中心',
  'pet-role-setup': '宠物创作中心',
  'pet-storyboard': '宠物创作中心',
  'pet-generation-status': '宠物创作中心',
  'pet-templates': '宠物创作中心',
  'pet-works': '宠物创作中心',
  'pet-assets': '宠物创作中心',
  'pet-video-parse': '宠物 AI 资产生产工具',
  'pet-storyboard-tool': '宠物 AI 资产生产工具',
  'pet-ai-pet-generate': '宠物 AI 资产生产工具',
  'pet-background-generate': '宠物 AI 资产生产工具',
  'pet-voice': '宠物 AI 资产生产工具',
  'video-parse': 'AI 资产生产工具',
  'benchmark-create-page': '创作中心',
  'asset-reuse': '创作中心',
  'script-rewrite': 'AI 资产生产工具',
  storyboard: 'AI 资产生产工具',
  avatar: 'AI 资产生产工具',
  voice: 'AI 资产生产工具',
  'my-videos': '我的视频',
  AssetCenter: '资产中心',
  'system-profile': '系统管理',
  'system-credits': '系统管理',
  'system-favorites': '系统管理',
  'system-preferences': '系统管理',
  help: '帮助中心',
  'help-tutorials': '帮助中心',
  'help-faq': '帮助中心',
  'help-changelog': '帮助中心',
  'help-contact': '帮助中心',
}

router.afterEach((to) => {
  const routeName = typeof to.name === 'string' ? to.name : ''
  if (!routeName || routeName === 'system-recent' || routeName.startsWith('admin') || routeName === 'login' || routeName === 'register') {
    return
  }
  if (!to.meta.menuKey) {
    return
  }
  const workbenchRouteName = routeName as WorkbenchRouteName
  const entry = to.query.entry
  const isBenchmarkCreation =
    routeName === 'benchmark-create-page' ||
    (routeName === 'video-parse' && (Array.isArray(entry) ? entry[0] : entry) === 'creation')
  const title =
    (isBenchmarkCreation ? '爆款对标创作' : undefined) ||
    recentToolTitles[workbenchRouteName] ||
    (typeof to.meta.title === 'string' ? to.meta.title : routeName)
  recordRecentTool({
    routeName,
    path: to.fullPath,
    title,
    subtitle: isBenchmarkCreation ? '创作中心' : recentToolSubtitles[workbenchRouteName],
  })
})

export default router
