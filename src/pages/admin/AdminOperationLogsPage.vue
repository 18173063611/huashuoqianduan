<template>
  <section class="admin-page">
    <el-card shadow="never">
      <template #header>
        <div class="admin-page-header">
          <span>管理员操作审计</span>
        </div>
      </template>

      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="管理员ID">
          <el-input-number v-model="filters.adminUserId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-input v-model="filters.operationType" clearable placeholder="调整积分 / 编辑用户" />
        </el-form-item>
        <el-form-item label="目标类型">
          <el-input v-model="filters.targetType" clearable placeholder="用户 / 积分账户 / 模型" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="operationId" border>
        <el-table-column prop="operationId" label="日志ID" width="95" />
        <el-table-column prop="adminUserId" label="管理员" width="100" />
        <el-table-column label="操作" min-width="150">
          <template #default="{ row }">{{ operationTypeText(row.operationType) }}</template>
        </el-table-column>
        <el-table-column label="目标类型" width="120">
          <template #default="{ row }">{{ operationTargetTypeText(row.targetType) }}</template>
        </el-table-column>
        <el-table-column prop="targetId" label="目标ID" width="100" />
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column prop="traceId" label="TraceId" min-width="180" show-overflow-tooltip />
        <el-table-column prop="afterJson" label="结果快照" min-width="240" show-overflow-tooltip />
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
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAdminOperationLogs } from '../../services/adminApi'
import type { AdminOperationLogItem, AdminOperationLogQuery } from '../../types/adminTypes'
import { operationTargetTypeText, operationTypeText } from './adminDisplay'

const filters = reactive<AdminOperationLogQuery>({ pageNo: 1, pageSize: 20 })
const records = ref<AdminOperationLogItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminOperationLogs(filters)
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
  Object.assign(filters, { adminUserId: undefined, operationType: '', targetType: '', pageNo: 1, pageSize: 20 })
  void loadLogs()
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
