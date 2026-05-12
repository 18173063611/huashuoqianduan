<template>
  <section class="admin-page">
    <el-card shadow="never">
      <template #header>
        <div class="admin-page-header">
          <span>全站积分流水</span>
        </div>
      </template>

      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="用户ID">
          <el-input-number v-model="filters.userId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.changeType" clearable placeholder="全部类型" style="width: 170px">
            <el-option label="管理员加分" value="ADMIN_ADD" />
            <el-option label="管理员扣分" value="ADMIN_DEDUCT" />
            <el-option label="管理员修正" value="ADMIN_SET" />
            <el-option label="AI任务扣费" value="AI_CONSUME" />
            <el-option label="任务失败退款" value="AI_REFUND" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务ID">
          <el-input-number v-model="filters.relatedTaskId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="creditLogId" border>
        <el-table-column prop="creditLogId" label="流水ID" width="100" />
        <el-table-column prop="userId" label="用户ID" width="95" />
        <el-table-column label="类型" min-width="140">
          <template #default="{ row }">{{ creditChangeTypeText(row.changeType) }}</template>
        </el-table-column>
        <el-table-column prop="changeAmount" label="变动" width="100" />
        <el-table-column prop="beforeBalance" label="前余额" width="100" />
        <el-table-column prop="afterBalance" label="后余额" width="100" />
        <el-table-column prop="relatedTaskId" label="任务ID" width="100">
          <template #default="{ row }">{{ row.relatedTaskId || '-' }}</template>
        </el-table-column>
        <el-table-column prop="modelCode" label="模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" min-width="170" />
      </el-table>

      <el-pagination
        class="admin-pagination"
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="loadLogs"
        @current-change="loadLogs"
      />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAdminCreditLogs } from '../../services/adminApi'
import type { AdminCreditLogItem } from '../../types/adminTypes'
import { compactCode, creditChangeTypeText } from './adminDisplay'

const route = useRoute()
const filters = reactive<{ userId?: number; changeType?: string; relatedTaskId?: number; pageNo: number; pageSize: number }>({
  userId: numberFromQuery(route.query.userId),
  changeType: stringFromQuery(route.query.changeType),
  relatedTaskId: numberFromQuery(route.query.relatedTaskId),
  pageNo: 1,
  pageSize: 20,
})
const records = ref<AdminCreditLogItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminCreditLogs(filters)
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
  void loadLogs()
}

function resetFilters() {
  Object.assign(filters, { userId: undefined, changeType: '', relatedTaskId: undefined, pageNo: 1, pageSize: 20 })
  void loadLogs()
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

onMounted(loadLogs)
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
