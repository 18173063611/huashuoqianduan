<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>积分流水</h2>
        <p>按用户、流水类型和关联任务查询积分变化，辅助运营查账。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadLogs">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="用户ID">
          <el-input-number v-model="filters.userId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="流水类型">
          <el-select v-model="filters.changeType" clearable placeholder="全部类型" style="width: 170px">
            <el-option label="管理员增加" value="ADMIN_ADD" />
            <el-option label="管理员扣减" value="ADMIN_DEDUCT" />
            <el-option label="管理员修正" value="ADMIN_SET" />
            <el-option label="AI任务消耗" value="AI_CONSUME" />
            <el-option label="AI任务退款" value="AI_REFUND" />
            <el-option label="系统初始化" value="SYSTEM_INIT" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联任务ID">
          <el-input-number v-model="filters.relatedTaskId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="creditLogId" border :empty-text="emptyText">
        <el-table-column prop="creditLogId" label="流水ID" width="100" />
        <el-table-column label="用户" width="100">
          <template #default="{ row }">{{ formatEmpty(row.userId) }}</template>
        </el-table-column>
        <el-table-column label="类型" min-width="140">
          <template #default="{ row }">{{ getCreditChangeTypeLabel(row.changeType) }}</template>
        </el-table-column>
        <el-table-column label="变动积分" width="110">
          <template #default="{ row }">
            <span :class="['credit-change', Number(row.changeAmount) >= 0 ? 'is-positive' : 'is-negative']">
              {{ formatCreditChange(row.changeAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变动前余额" width="120">
          <template #default="{ row }">{{ formatCreditAmount(row.beforeBalance) }}</template>
        </el-table-column>
        <el-table-column label="变动后余额" width="120">
          <template #default="{ row }">{{ formatCreditAmount(row.afterBalance) }}</template>
        </el-table-column>
        <el-table-column label="关联任务" width="110">
          <template #default="{ row }">{{ row.relatedTaskId || '无' }}</template>
        </el-table-column>
        <el-table-column label="操作管理员" width="120">
          <template #default="{ row }">{{ formatEmpty(row.operatorAdminId) }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ formatEmpty(row.remark, '暂无备注') }}</template>
        </el-table-column>
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAdminCreditLogs } from '../../services/adminApi'
import type { AdminCreditLogItem } from '../../types/adminTypes'
import {
  formatCreditAmount,
  formatCreditChange,
  formatDateTime,
  formatEmpty,
  getCreditChangeTypeLabel,
  getEmptyText,
} from '../../utils/adminDisplay'

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
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无积分流水'))

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
    error.value = unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.pageNo = 1
  void loadLogs()
}

function resetFilters() {
  Object.assign(filters, { userId: undefined, changeType: '', relatedTaskId: undefined, pageNo: 1, pageSize: 20 })
  void loadLogs()
}

function hasFilter() {
  return Boolean(filters.userId || filters.changeType || filters.relatedTaskId)
}

function stringFromQuery(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

function numberFromQuery(value: unknown) {
  const parsed = Number(stringFromQuery(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

onMounted(loadLogs)
</script>

<style scoped>
.admin-page,
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

.credit-change {
  font-weight: 700;
}

.credit-change.is-positive {
  color: #16a34a;
}

.credit-change.is-negative {
  color: #dc2626;
}
</style>
