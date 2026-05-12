<template>
  <section class="admin-page">
    <el-card shadow="never">
      <template #header>
        <div class="admin-page-header">
          <span>全站任务查询</span>
        </div>
      </template>

      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="用户ID">
          <el-input-number v-model="filters.ownerUserId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="任务类型">
          <el-input v-model="filters.taskType" clearable placeholder="语音合成 / 形象生成" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 150px">
            <el-option label="排队中" value="QUEUED" />
            <el-option label="运行中" value="RUNNING" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="可重试" value="RETRYABLE" />
            <el-option label="已取消" value="CANCELED" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="filters.modelCode" clearable placeholder="模型编码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="taskId" border>
        <el-table-column prop="taskId" label="任务ID" width="95" />
        <el-table-column prop="ownerUserId" label="用户ID" width="95" />
        <el-table-column label="类型" min-width="170">
          <template #default="{ row }">{{ taskTypeText(row.taskType) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="115">
          <template #default="{ row }">{{ taskStatusText(row.status) }}</template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="90" />
        <el-table-column prop="modelCode" label="模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column prop="creditCost" label="积分" width="90" />
        <el-table-column prop="creditLogId" label="流水" width="100">
          <template #default="{ row }">{{ row.creditLogId || '-' }}</template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误" min-width="220" show-overflow-tooltip />
        <el-table-column prop="traceId" label="TraceId" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
      </el-table>

      <el-pagination
        class="admin-pagination"
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="loadTasks"
        @current-change="loadTasks"
      />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAdminTasks } from '../../services/adminApi'
import type { AdminTaskItem, AdminTaskQuery } from '../../types/adminTypes'
import { compactCode, taskStatusText, taskTypeText } from './adminDisplay'

const route = useRoute()
const filters = reactive<AdminTaskQuery>({
  ownerUserId: numberFromQuery(route.query.ownerUserId),
  taskType: stringFromQuery(route.query.taskType),
  status: stringFromQuery(route.query.status),
  modelCode: stringFromQuery(route.query.modelCode),
  pageNo: 1,
  pageSize: 10,
})
const records = ref<AdminTaskItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminTasks(filters)
    records.value = page.records
    total.value = page.total
  } catch (unknownError) {
    records.value = []
    total.value = 0
    error.value = requestErrorMessage(unknownError)
  } finally {
    loading.value = false
  }
}

function requestErrorMessage(unknownError: unknown) {
  return unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
}

function handleSearch() {
  filters.pageNo = 1
  void loadTasks()
}

function resetFilters() {
  Object.assign(filters, { ownerUserId: undefined, taskType: '', status: '', modelCode: '', pageNo: 1, pageSize: 10 })
  void loadTasks()
}

function stringFromQuery(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

function numberFromQuery(value: unknown) {
  const raw = stringFromQuery(value)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

onMounted(loadTasks)
</script>

<style scoped>
.admin-page,
.admin-page-header {
  display: grid;
  gap: 16px;
}

.admin-filter {
  margin-bottom: 10px;
}

.admin-page-alert {
  margin-bottom: 12px;
}

.admin-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
