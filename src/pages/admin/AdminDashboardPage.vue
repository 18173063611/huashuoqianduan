<template>
  <section class="admin-dashboard">
    <el-row :gutter="16">
      <el-col v-for="card in statCards" :key="card.label" :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="admin-stat-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="admin-dashboard-panel" shadow="never">
      <template #header>
        <div class="admin-panel-header">
          <span>下一步联调重点</span>
          <el-button type="primary" link :loading="loading" @click="loadSummary">刷新概览</el-button>
        </div>
      </template>

      <el-alert
        v-if="error"
        :title="error"
        type="warning"
        show-icon
        :closable="false"
      />

      <el-timeline>
        <el-timeline-item timestamp="账号权限" type="primary">
          管理员登录后只进入后台，普通账号访问后台会被路由拦截。
        </el-timeline-item>
        <el-timeline-item timestamp="用户管理" type="success">
          用户列表、创建、编辑、启用、禁用、删除和重置密码走 `/api/v1/admin/users`。
        </el-timeline-item>
        <el-timeline-item timestamp="积分展示" type="warning">
          管理后台已接入积分余额与流水，普通工作台顶部会显示当前账号积分。
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAdminDashboardSummary } from '../../services/adminApi'
import type { AdminDashboardSummary } from '../../types/adminTypes'

const loading = ref(false)
const error = ref('')
const summary = ref<AdminDashboardSummary>({
  userCount: 0,
  todayTaskCount: 0,
  todayCreditConsumed: 0,
  failedTaskCount: 0,
  queueBacklog: 0,
})

const statCards = computed(() => [
  { label: '用户总数', value: summary.value.userCount },
  { label: '今日任务', value: summary.value.todayTaskCount },
  { label: '今日积分消耗', value: summary.value.todayCreditConsumed },
  { label: '失败任务', value: summary.value.failedTaskCount },
])

async function loadSummary() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await getAdminDashboardSummary()
  } catch {
    error.value = '概览接口尚未联调完成，页面结构已就绪。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSummary()
})
</script>

<style scoped>
.admin-dashboard {
  display: grid;
  gap: 16px;
}

.admin-stat-card {
  min-height: 112px;
}

.admin-stat-card :deep(.el-card__body) {
  display: grid;
  gap: 14px;
}

.admin-stat-card span {
  color: #6b7280;
}

.admin-stat-card strong {
  font-size: 30px;
  color: #111827;
}

.admin-dashboard-panel {
  border-radius: 8px;
}

.admin-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
