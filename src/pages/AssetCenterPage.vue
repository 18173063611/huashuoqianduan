<template>
  <section class="asset-center-page app-page-stack">
    <header class="asset-page-hero asset-page-hero--compact">
      <div>
        <h1 class="asset-page-title">资产中心</h1>
        <p class="asset-page-lead">账号、积分与素材/音色入口；下方 Tab 切换不同模块。</p>
      </div>
      <div class="asset-page-hero-actions">
        <button class="app-ghost-button" type="button" :disabled="loading" @click="refreshAll">
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
        <RouterLink v-if="user?.role === 'ADMIN'" class="app-ghost-button admin-link" to="/admin/dashboard">
          管理后台
        </RouterLink>
      </div>
    </header>

    <p v-if="error" class="asset-page-error" role="alert">{{ error }}</p>

    <div class="asset-page-top-grid asset-page-top-grid--compact">
      <section class="app-card asset-page-card">
        <h2 class="asset-card-title">用户信息</h2>
        <dl v-if="user" class="asset-dl asset-dl--compact">
          <div class="asset-dl-row">
            <dt>用户名</dt>
            <dd>{{ user.username }}</dd>
          </div>
          <div class="asset-dl-row">
            <dt>显示名</dt>
            <dd>{{ user.displayName || '—' }}</dd>
          </div>
          <div class="asset-dl-row">
            <dt>角色</dt>
            <dd>{{ roleLabel(user.role) }}</dd>
          </div>
          <div class="asset-dl-row">
            <dt>状态</dt>
            <dd>{{ statusLabel(user.status) }}</dd>
          </div>
        </dl>
        <p v-else-if="!loading" class="asset-muted">未获取到账户信息，请先登录。</p>
      </section>

      <section class="app-card asset-page-card asset-page-card--credit">
        <h2 class="asset-card-title">积分余额</h2>
        <dl v-if="user" class="asset-dl asset-dl--compact">
          <div class="asset-dl-row">
            <dt>当前余额</dt>
            <dd class="asset-credit-balance">{{ user.creditBalance ?? 0 }}</dd>
          </div>
          <div v-if="(user.creditFrozenBalance ?? 0) > 0" class="asset-dl-row">
            <dt>冻结积分</dt>
            <dd>{{ user.creditFrozenBalance }}</dd>
          </div>
          <div class="asset-dl-row">
            <dt>累计消耗</dt>
            <dd>{{ user.creditTotalConsumed ?? 0 }}</dd>
          </div>
        </dl>
        <p v-else-if="!loading" class="asset-muted">—</p>
      </section>
    </div>

    <div class="asset-hub-tabs app-card">
      <div class="asset-hub-tablist" role="tablist" aria-label="资产中心模块">
        <button
          v-for="key in tabOrder"
          :key="key"
          type="button"
          role="tab"
          class="asset-hub-tab"
          :class="{ 'asset-hub-tab--active': activeTab === key }"
          :aria-selected="activeTab === key"
          @click="setAssetTab(key)"
        >
          {{ ASSET_HUB_TAB_LABEL[key] }}
        </button>
      </div>

      <div class="asset-hub-tab-panels" role="tabpanel">
        <AssetMaterialTab
          v-if="activeTab === 'materials'"
          :highlight-asset-id="effectiveHighlightAssetId"
          @highlight-consumed="onHighlightConsumed"
        />
        <AssetVoiceTab v-if="activeTab === 'voices'" />
        <AssetCreditLogTab
          v-if="activeTab === 'credits'"
          :credit-logs="creditLogs"
          :credit-logs-loading="creditLogsLoading"
          :credit-logs-error="creditLogsError"
        />
        <AssetTaskTab
          v-if="activeTab === 'tasks'"
          :recent-tasks="recentTasks"
          :tasks-loading="tasksLoading"
          :tasks-error="tasksError"
          @open-credit-detail="openCreditDetail"
        />
      </div>
    </div>

    <TaskCreditDetailDrawer v-model="detailOpen" :task-id="detailTaskId" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AssetCreditLogTab from './asset/AssetCreditLogTab.vue'
import AssetMaterialTab from './asset/AssetMaterialTab.vue'
import AssetTaskTab from './asset/AssetTaskTab.vue'
import AssetVoiceTab from './asset/AssetVoiceTab.vue'
import TaskCreditDetailDrawer from '../components/business/TaskCreditDetailDrawer.vue'
import { me, setAuthUser } from '../services/authApi'
import { getCreditLogRecent } from '../services/accountApi'
import { listTasks } from '../services/taskApi'
import type { UserMe, UserRole, UserStatus } from '../types/userTypes'
import type { TaskItem } from '../types/taskTypes'
import type { AccountCreditLogRecentRow } from '../types/accountTypes'
import {
  ASSET_HUB_TAB_LABEL,
  ASSET_HUB_TAB_ORDER,
  parseAssetHubTab,
  readStoredAssetHubTab,
  writeStoredAssetHubTab,
  type AssetHubTabKey,
} from './asset/assetHubTabs'

const props = defineProps<{
  highlightAssetId?: number | null
}>()

const route = useRoute()
const router = useRouter()

const tabOrder = ASSET_HUB_TAB_ORDER

const highlightFromRoute = computed(() => {
  const h = route.query.highlight
  const raw = Array.isArray(h) ? h[0] : h
  const n = typeof raw === 'string' ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
})

const effectiveHighlightAssetId = computed(() => {
  if (props.highlightAssetId != null && props.highlightAssetId > 0) {
    return props.highlightAssetId
  }
  return highlightFromRoute.value
})

function resolveDefaultTab(): AssetHubTabKey {
  const fromQuery = parseAssetHubTab(route.query.tab)
  if (fromQuery) {
    return fromQuery
  }
  if (highlightFromRoute.value) {
    return 'materials'
  }
  return readStoredAssetHubTab() ?? 'materials'
}

const activeTab = ref<AssetHubTabKey>(resolveDefaultTab())

const user = ref<UserMe | null>(null)
const recentTasks = ref<TaskItem[]>([])
const creditLogs = ref<AccountCreditLogRecentRow[]>([])
const loading = ref(false)
const tasksLoading = ref(false)
const creditLogsLoading = ref(false)
const error = ref('')
const tasksError = ref('')
const creditLogsError = ref('')

const detailOpen = ref(false)
const detailTaskId = ref<number | null>(null)

function roleLabel(role?: UserRole | string) {
  if (role === 'ADMIN') return '管理员'
  if (role === 'USER') return '普通用户'
  return role || '—'
}

function statusLabel(status?: UserStatus | string) {
  if (status === 'ENABLED') return '正常'
  if (status === 'DISABLED') return '已禁用'
  if (status === 'LOCKED') return '已锁定'
  return status || '—'
}

function openCreditDetail(taskId: number) {
  detailTaskId.value = taskId
  detailOpen.value = true
}

function setAssetTab(tab: AssetHubTabKey) {
  activeTab.value = tab
  writeStoredAssetHubTab(tab)
  void router.replace({ path: route.path, query: { ...route.query, tab } })
}

function onHighlightConsumed() {
  if (route.query.highlight == null) return
  const next = { ...route.query }
  delete next.highlight
  void router.replace({ path: route.path, query: next })
}

async function refreshAll() {
  loading.value = true
  tasksLoading.value = true
  creditLogsLoading.value = true
  error.value = ''
  tasksError.value = ''
  creditLogsError.value = ''
  try {
    const u = await me()
    setAuthUser(u)
    user.value = u
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载账户信息失败'
    user.value = null
  } finally {
    loading.value = false
  }
  try {
    recentTasks.value = await listTasks({ pageNo: 1, pageSize: 8 })
  } catch (e) {
    tasksError.value = e instanceof Error ? e.message : '加载任务列表失败'
    recentTasks.value = []
  } finally {
    tasksLoading.value = false
  }
  try {
    creditLogs.value = await getCreditLogRecent(20)
  } catch (e) {
    creditLogsError.value = e instanceof Error ? e.message : '加载积分流水失败'
    creditLogs.value = []
  } finally {
    creditLogsLoading.value = false
  }
}

function syncTabQueryFromRoute() {
  const p = parseAssetHubTab(route.query.tab)
  if (p) {
    activeTab.value = p
    writeStoredAssetHubTab(p)
  }
}

onMounted(() => {
  document.title = '资产中心 · AI爆款视频改造'
})

watch(
  () => route.query.tab,
  () => {
    if (route.name !== 'AssetCenter') return
    syncTabQueryFromRoute()
  },
)

watch(
  () => route.name,
  (n) => {
    if (n === 'AssetCenter') {
      void refreshAll()
      const initial = resolveDefaultTab()
      activeTab.value = initial
      if (parseAssetHubTab(route.query.tab) !== initial) {
        void router.replace({ path: route.path, query: { ...route.query, tab: initial } })
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.asset-center-page.app-page-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.asset-page-hero--compact .asset-page-title {
  font-size: 20px;
}

.asset-page-hero--compact .asset-page-lead {
  font-size: 12px;
  max-width: 560px;
}

.asset-page-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.asset-page-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.asset-page-lead {
  margin: 0;
  max-width: 720px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.45;
}

.asset-page-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.asset-page-error {
  margin: 0;
  font-size: 13px;
  color: #b45309;
}

.asset-muted {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.asset-page-top-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.asset-page-top-grid--compact .asset-page-card {
  padding: 14px 16px;
}

.asset-page-card {
  padding: 20px 22px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.asset-page-card--credit .asset-credit-balance {
  font-size: 20px;
  font-weight: 700;
  color: #1d4ed8;
}

.asset-card-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 650;
  color: #0f172a;
}

.asset-dl {
  margin: 0;
  display: grid;
  gap: 8px 16px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.asset-dl--compact {
  gap: 6px 14px;
}

.asset-dl-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asset-dl dt {
  font-size: 11px;
  color: #64748b;
}

.asset-dl dd {
  margin: 0;
  font-size: 13px;
  color: #0f172a;
}

.asset-hub-tabs {
  padding: 0 0 16px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.asset-hub-tablist {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #eef0f6;
  background: linear-gradient(180deg, #fafbff 0%, #ffffff 100%);
}

.asset-hub-tab {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 14px;
  font-weight: 650;
  padding: 10px 18px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.asset-hub-tab:hover {
  border-color: #c7d2fe;
  color: #312e81;
  background: #eef2ff;
}

.asset-hub-tab--active {
  border-color: rgba(79, 70, 229, 0.55);
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.28);
}

.asset-hub-tab-panels {
  padding: 14px 16px 6px;
}

@media (max-width: 640px) {
  .asset-page-card {
    padding: 14px;
  }

  .asset-hub-tab {
    flex: 1 1 auto;
    justify-content: center;
    text-align: center;
  }
}
</style>
