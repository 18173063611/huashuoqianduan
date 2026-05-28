<template>
  <section class="activation-codes-page">
    <div class="page-heading">
      <div>
        <h2>内测码</h2>
        <p>管理内测激活码，支持新增、查询、删除和停用。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadCodes">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增内测码</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-form class="activation-filter" :model="filters" inline>
        <el-form-item label="内测码">
          <el-input v-model="filters.keyword" clearable placeholder="输入内测码关键字" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="未使用" :value="1" />
            <el-option label="已使用/停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="error"
        class="activation-alert"
        :title="error"
        type="warning"
        show-icon
        :closable="false"
      />

      <el-table v-loading="loading" :data="pagedCodes" row-key="id" border :empty-text="emptyText">
        <el-table-column label="内测码" min-width="260" align="center">
          <template #default="{ row }">
            <el-text class="code-text">{{ row.key || '-' }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="plain">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="warning" :disabled="row.status !== 1" @click="confirmDisable(row)">停用</el-button>
            <el-button link type="danger" @click="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="activation-pagination"
        v-model:current-page="pagination.pageNo"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        :total="filteredCodes.length"
      />
    </el-card>

    <el-dialog v-model="createVisible" title="新增内测码" width="460px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="88px">
        <el-form-item label="内测码" prop="key">
          <el-input v-model.trim="createForm.key" maxlength="80" show-word-limit placeholder="请输入内测码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { getAuthToken } from '../../services/request'

interface ActivationCode {
  id: number
  key: string
  status: number
}

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const activationPath = '/activation/activate-codes'

const codes = ref<ActivationCode[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const createVisible = ref(false)
const createFormRef = ref<FormInstance>()

const filters = reactive({
  keyword: '',
  status: undefined as number | undefined,
})

const pagination = reactive({
  pageNo: 1,
  pageSize: 10,
})

const createForm = reactive({
  key: '',
})

const createRules: FormRules = {
  key: [
    { required: true, message: '请输入内测码', trigger: 'blur' },
    { min: 2, max: 80, message: '内测码长度需要为 2 到 80 位', trigger: 'blur' },
  ],
}

const filteredCodes = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return codes.value.filter((item) => {
    const keywordMatched = !keyword || String(item.key || '').toLowerCase().includes(keyword)
    const statusMatched = filters.status === undefined || item.status === filters.status
    return keywordMatched && statusMatched
  })
})

const pagedCodes = computed(() => {
  const start = (pagination.pageNo - 1) * pagination.pageSize
  return filteredCodes.value.slice(start, start + pagination.pageSize)
})

const emptyText = computed(() => {
  if (loading.value) return '正在加载内测码...'
  if (filters.keyword || filters.status !== undefined) return '没有匹配的内测码'
  return '暂无内测码'
})

watch(
  () => [filters.keyword, filters.status],
  () => {
    pagination.pageNo = 1
  },
)

watch(
  () => pagination.pageSize,
  () => {
    pagination.pageNo = 1
  },
)

async function requestActivation<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken('ADMIN_WEB')
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(getErrorMessage(payload) || `请求失败：HTTP ${response.status}`)
  }
  return unwrapActivationResponse<T>(payload)
}

function unwrapActivationResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'code' in payload) {
    const response = payload as { code?: number | string; message?: string; data?: T }
    if (String(response.code) !== '0') throw new Error(response.message || '请求失败')
    return response.data as T
  }
  return payload as T
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: string }).message || '')
  }
  return ''
}

async function loadCodes() {
  loading.value = true
  error.value = ''
  try {
    const list = await requestActivation<ActivationCode[]>(activationPath)
    codes.value = Array.isArray(list) ? list : []
    clampPageNo()
  } catch (unknownError) {
    codes.value = []
    error.value = unknownError instanceof Error ? unknownError.message : '内测码接口请求失败'
  } finally {
    loading.value = false
  }
}

function clampPageNo() {
  const maxPage = Math.max(1, Math.ceil(filteredCodes.value.length / pagination.pageSize))
  if (pagination.pageNo > maxPage) pagination.pageNo = maxPage
}

function handleSearch() {
  pagination.pageNo = 1
}

function resetFilters() {
  Object.assign(filters, { keyword: '', status: undefined })
  pagination.pageNo = 1
}

function openCreate() {
  createForm.key = ''
  createVisible.value = true
}

async function submitCreate() {
  if (!createFormRef.value) return
  await createFormRef.value.validate()
  saving.value = true
  try {
    await requestActivation<boolean>(activationPath, {
      method: 'POST',
      body: JSON.stringify({ key: createForm.key }),
    })
    ElMessage.success('内测码已新增')
    createVisible.value = false
    await loadCodes()
  } finally {
    saving.value = false
  }
}

async function confirmDisable(row: ActivationCode) {
  const latest = await loadCodeById(row.id)
  await confirmByCode(latest, '停用内测码', '停用后该内测码将不可继续使用，请输入内测码完成二次确认。')
  await requestActivation<boolean>(`${activationPath}/${row.id}/disable`, { method: 'PATCH' })
  ElMessage.success('内测码已停用')
  await loadCodes()
}

async function confirmDelete(row: ActivationCode) {
  const latest = await loadCodeById(row.id)
  await confirmByCode(latest, '删除内测码', `请确认是否要删除 ${latest.key} 内测码`)
  await requestActivation<boolean>(`${activationPath}/${row.id}`, { method: 'DELETE' })
  ElMessage.success('内测码已删除')
  await loadCodes()
}

async function loadCodeById(id: number) {
  const latest = await requestActivation<ActivationCode>(`${activationPath}/${id}`)
  if (!latest) throw new Error('未找到该内测码')
  return latest
}

async function confirmByCode(code: ActivationCode, title: string, message: string) {
  await ElMessageBox.prompt(message, title, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入上方内测码',
    inputPattern: new RegExp(`^${escapeRegExp(code.key)}$`),
    inputErrorMessage: '输入的内测码不一致',
    type: title.includes('删除') ? 'warning' : 'info',
  })
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getStatusLabel(status: number) {
  return status === 1 ? '未使用' : '已使用/停用'
}

onMounted(loadCodes)
</script>

<style scoped>
.activation-codes-page,
.page-heading {
  display: grid;
  gap: 16px;
}

.page-heading {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.page-heading h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.page-heading p {
  margin: 6px 0 0;
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 10px;
}

.activation-filter {
  margin-bottom: 8px;
}

.activation-alert {
  margin-bottom: 14px;
}

.code-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.activation-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
