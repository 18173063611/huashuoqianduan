<template>
  <section class="user-center app-page-stack">
    <div class="app-card user-summary-card">
      <header class="user-summary-head">
        <div>
          <h2>账户中心</h2>
          <p>查看当前登录账号、积分与最近任务；下方为资产中心。</p>
        </div>
        <div class="user-summary-actions">
          <button class="app-ghost-button" type="button" :disabled="loading" @click="refreshAll">
            {{ loading ? '刷新中…' : '刷新' }}
          </button>
          <RouterLink v-if="user?.role === 'ADMIN'" class="app-ghost-button admin-link" to="/admin/dashboard">
            管理后台
          </RouterLink>
        </div>
      </header>

      <p v-if="error" class="user-error" role="alert">{{ error }}</p>

      <dl v-if="user" class="user-dl">
        <div class="user-dl-row">
          <dt>用户名</dt>
          <dd>{{ user.username }}</dd>
        </div>
        <div class="user-dl-row">
          <dt>显示名</dt>
          <dd>{{ user.displayName || '—' }}</dd>
        </div>
        <div class="user-dl-row">
          <dt>角色</dt>
          <dd>{{ roleLabel(user.role) }}</dd>
        </div>
        <div class="user-dl-row">
          <dt>状态</dt>
          <dd>{{ statusLabel(user.status) }}</dd>
        </div>
        <div class="user-dl-row">
          <dt>积分余额</dt>
          <dd class="user-credit">{{ user.creditBalance ?? 0 }}</dd>
        </div>
        <div v-if="(user.creditFrozenBalance ?? 0) > 0" class="user-dl-row">
          <dt>冻结积分</dt>
          <dd>{{ user.creditFrozenBalance }}</dd>
        </div>
        <div class="user-dl-row">
          <dt>累计消耗</dt>
          <dd>{{ user.creditTotalConsumed ?? 0 }}</dd>
        </div>
      </dl>
      <p v-else-if="!loading" class="user-muted">未获取到账户信息，请先登录。</p>

      <div class="recent-tasks">
        <h3>最近任务</h3>
        <p v-if="tasksError" class="user-error">{{ tasksError }}</p>
        <p v-else-if="!tasksLoading && recentTasks.length === 0" class="user-muted">暂无任务记录。</p>
        <div v-else class="user-table-wrap">
          <table class="user-task-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>类型</th>
                <th>模型</th>
                <th>积分</th>
                <th>状态</th>
                <th>进度</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in recentTasks" :key="t.taskId">
                <td>{{ t.taskId }}</td>
                <td>{{ t.taskType }}</td>
                <td>{{ t.modelCode || '—' }}</td>
                <td>{{ t.creditCost ?? '—' }}</td>
                <td>{{ t.status }}</td>
                <td>{{ t.progress ?? '—' }}</td>
                <td>{{ t.updatedAt || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <section class="app-card asset-wrap">
      <AssetCenter :highlight-asset-id="highlightAssetId" @highlight-consumed="$emit('highlightConsumed')" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AssetCenter from '../asset/AssetCenter.vue'
import { me, setAuthUser } from '../../services/authApi'
import { listTasks } from '../../services/taskApi'
import type { UserMe, UserRole, UserStatus } from '../../types/userTypes'
import type { TaskItem } from '../../types/taskTypes'

defineProps<{
  highlightAssetId?: number | null
}>()

defineEmits<{
  highlightConsumed: []
}>()

const user = ref<UserMe | null>(null)
const recentTasks = ref<TaskItem[]>([])
const loading = ref(false)
const tasksLoading = ref(false)
const error = ref('')
const tasksError = ref('')

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

async function refreshAll() {
  loading.value = true
  tasksLoading.value = true
  error.value = ''
  tasksError.value = ''
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
}

onMounted(() => {
  void refreshAll()
})
</script>

<style scoped>
.user-center.app-page-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-summary-card,
.asset-wrap {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.user-summary-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.user-summary-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: #0f172a;
}

.user-summary-head p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.user-summary-actions {
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

.user-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: #b45309;
}

.user-muted {
  margin: 0 0 12px;
  font-size: 13px;
  color: #94a3b8;
}

.user-dl {
  margin: 0 0 20px;
  display: grid;
  gap: 8px 24px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.user-dl-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-dl dt {
  font-size: 12px;
  color: #64748b;
}

.user-dl dd {
  margin: 0;
  font-size: 14px;
  color: #0f172a;
}

.user-credit {
  font-weight: 600;
  color: #1d4ed8;
}

.recent-tasks h3 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #0f172a;
}

.user-table-wrap {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.user-task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.user-task-table th,
.user-task-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.user-task-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}

.user-task-table tbody tr:last-child td {
  border-bottom: none;
}
</style>
