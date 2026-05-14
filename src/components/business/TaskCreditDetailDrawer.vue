<template>
  <el-drawer
    :model-value="modelValue"
    title="AI 任务积分详情"
    direction="rtl"
    size="min(560px, 100vw)"
    class="task-credit-drawer"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="loading">
      <p class="drawer-muted">加载中…</p>
    </template>
    <template v-else-if="error">
      <p class="drawer-error">{{ error }}</p>
    </template>
    <template v-else-if="detail">
      <div v-if="detail.unpaidCreditCost > 0" class="debt-banner" role="alert">
        <strong>存在待补扣积分</strong>
        <p>
          本次任务实际消耗超出预估，当前仍有
          <strong>{{ detail.unpaidCreditCost }}</strong>
          积分待补扣。请充值后由系统完成后续结算。
        </p>
      </div>

      <section class="detail-block">
        <h4>基础信息</h4>
        <dl class="detail-dl">
          <div><dt>任务 ID</dt><dd>{{ detail.taskId }}</dd></div>
          <div><dt>任务名称</dt><dd>{{ detail.taskTitle }}</dd></div>
          <div>
            <dt>任务类型</dt>
            <dd>
              <el-tooltip v-if="detail.taskType && detail.taskType.trim()" :content="detail.taskType" placement="top">
                <span>{{ taskTypeLabel(detail.taskType) }}</span>
              </el-tooltip>
              <span v-else>{{ taskTypeLabel(detail.taskType) }}</span>
            </dd>
          </div>
          <div><dt>Provider</dt><dd>{{ detail.provider }}</dd></div>
          <div><dt>模型</dt><dd>{{ detail.modelCode }}</dd></div>
          <div>
            <dt>任务状态</dt>
            <dd><el-tag :type="taskStatusTag(detail.taskStatus)" size="small">{{ detail.taskStatus }}</el-tag></dd>
          </div>
          <div>
            <dt>结算状态</dt>
            <dd>
              <el-tag :type="settlementTag(detail.settlementStatus)" size="small">{{
                detail.settlementStatusLabel
              }}</el-tag>
              <span class="code-pill">{{ detail.settlementStatus }}</span>
            </dd>
          </div>
          <div><dt>创建时间</dt><dd>{{ formatFriendlyDateTime(detail.createdAt) }}</dd></div>
          <div><dt>完成时间</dt><dd>{{ detail.finishedAt ? formatFriendlyDateTime(detail.finishedAt) : '—' }}</dd></div>
        </dl>
      </section>

      <section class="detail-block">
        <h4>积分汇总</h4>
        <ul class="money-lines">
          <li>预扣（提交时）<span class="neg">−{{ detail.estimatedCreditCost ?? 0 }}</span></li>
          <li v-if="(detail.actualCreditCost ?? 0) > 0">
            实际消耗（结算后）<span class="neg">{{ detail.actualCreditCost }}</span>
          </li>
          <li>已计入账户的消耗 <span>{{ detail.paidCreditCost }}</span></li>
          <li v-if="detail.unpaidCreditCost > 0">
            待补扣（欠费）<span class="warn">{{ detail.unpaidCreditCost }}</span>
          </li>
        </ul>
      </section>

      <section v-if="hasUsage(detail.usage)" class="detail-block">
        <h4>用量（实际/最新一条）</h4>
        <ul class="usage-list">
          <li v-if="detail.usage.totalTokens != null">总 Token：{{ detail.usage.totalTokens }}</li>
          <li v-if="detail.usage.promptTokens != null">Prompt：{{ detail.usage.promptTokens }}</li>
          <li v-if="detail.usage.completionTokens != null">Completion：{{ detail.usage.completionTokens }}</li>
          <li v-if="detail.usage.characterCount != null">字符数：{{ detail.usage.characterCount }}</li>
          <li v-if="detail.usage.imageCount != null">图片数：{{ detail.usage.imageCount }}</li>
          <li v-if="usageNum(detail.usage.durationSeconds) != null">
            视频时长：{{ usageNum(detail.usage.durationSeconds) }} 秒
          </li>
          <li v-if="usageNum(detail.usage.providerCredits) != null">
            第三方点数：{{ usageNum(detail.usage.providerCredits) }}
          </li>
        </ul>
      </section>

      <section class="detail-block">
        <h4>积分说明</h4>
        <div class="explain-box">
          <p v-for="(line, i) in detail.creditExplanation" :key="i">{{ line }}</p>
        </div>
      </section>

      <section class="detail-block">
        <h4>步骤积分组成</h4>
        <div class="table-scroll">
          <el-table :data="detail.steps" size="small" stripe border style="width: 100%">
            <el-table-column prop="stepName" label="步骤" min-width="120" />
            <el-table-column prop="modelApi" label="模型/API" min-width="140" show-overflow-tooltip />
            <el-table-column prop="usageUnit" label="单位" width="90" />
            <el-table-column prop="usageDisplay" label="用量说明" min-width="120" show-overflow-tooltip />
            <el-table-column prop="estimatedCredits" label="预计积分" width="100" />
            <el-table-column prop="actualCredits" label="实际积分" width="100">
              <template #default="{ row }">
                {{ row.actualCredits ?? '—' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" min-width="140" show-overflow-tooltip />
          </el-table>
        </div>
      </section>

      <section class="detail-block">
        <h4>积分流水（本任务）</h4>
        <div class="table-scroll">
          <el-table :data="detail.logs" size="small" stripe border style="width: 100%">
            <el-table-column prop="createdAt" label="时间" width="170">
              <template #default="{ row }">{{ formatFriendlyDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="operationLabel" label="操作" width="100" />
            <el-table-column label="变动" width="100">
              <template #default="{ row }">
                <span :class="row.changeAmount < 0 ? 'neg' : 'pos'">{{ formatDelta(row.changeAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="afterBalance" label="发生后余额" width="120" />
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          </el-table>
        </div>
      </section>

      <p class="drawer-footer-link">
        <RouterLink to="/assets?tab=credits" @click="emit('update:modelValue', false)">前往资产中心 · 积分明细</RouterLink>
      </p>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getTaskCreditDetail } from '../../services/accountApi'
import type { TaskCreditDetailResponse, TaskCreditUsageSnapshot } from '../../types/accountTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'
import { formatFriendlyDateTime } from '../../utils/timeFormat'

const props = defineProps<{
  modelValue: boolean
  taskId: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const loading = ref(false)
const error = ref('')
const detail = ref<TaskCreditDetailResponse | null>(null)

watch(
  () => [props.modelValue, props.taskId] as const,
  async ([open, id]) => {
    if (!open || id == null) {
      detail.value = null
      error.value = ''
      return
    }
    loading.value = true
    error.value = ''
    try {
      detail.value = await getTaskCreditDetail(id)
    } catch (e) {
      detail.value = null
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

function taskStatusTag(s: string) {
  if (s === 'SUCCESS') return 'success'
  if (s === 'FAILED') return 'danger'
  if (s === 'RUNNING' || s === 'QUEUED') return 'primary'
  return 'info'
}

function settlementTag(s: string) {
  if (s === 'PARTIAL_SETTLED') return 'warning'
  if (s === 'SETTLE_FAILED') return 'danger'
  if (s === 'REFUNDED') return 'success'
  if (s === 'PARTIAL_REFUNDED') return 'success'
  if (s === 'SETTLED') return 'success'
  if (s === 'PRECHARGED') return 'info'
  return 'info'
}

function hasUsage(u: TaskCreditUsageSnapshot) {
  return (
    u.totalTokens != null ||
    u.promptTokens != null ||
    u.characterCount != null ||
    u.imageCount != null ||
    usageNum(u.durationSeconds) != null ||
    usageNum(u.providerCredits) != null
  )
}

function usageNum(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function formatDelta(n: number) {
  if (n > 0) return `+${n}`
  return String(n)
}
</script>

<style scoped>
.drawer-muted {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}
.drawer-error {
  margin: 0;
  color: #b91c1c;
  font-size: 14px;
}
.debt-banner {
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #9a3412;
}
.debt-banner p {
  margin: 8px 0 0;
}
.detail-block {
  margin-bottom: 20px;
}
.detail-block h4 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #0f172a;
}
.detail-dl {
  display: grid;
  gap: 8px 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  margin: 0;
}
.detail-dl > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-dl dt {
  font-size: 12px;
  color: #64748b;
}
.detail-dl dd {
  margin: 0;
  font-size: 13px;
  color: #0f172a;
}
.code-pill {
  margin-left: 8px;
  font-size: 11px;
  color: #94a3b8;
}
.money-lines {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: #334155;
}
.money-lines li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}
.neg {
  color: #b91c1c;
  font-weight: 600;
}
.pos {
  color: #15803d;
  font-weight: 600;
}
.warn {
  color: #c2410c;
  font-weight: 600;
}
.usage-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #334155;
}
.explain-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
  color: #334155;
  line-height: 1.55;
}
.explain-box p {
  margin: 0 0 6px;
}
.explain-box p:last-child {
  margin-bottom: 0;
}
.table-scroll {
  overflow-x: auto;
  width: 100%;
}

.drawer-footer-link {
  margin: 16px 0 0;
  font-size: 13px;
}

.drawer-footer-link a {
  color: #4f46e5;
  font-weight: 600;
  text-decoration: none;
}

.drawer-footer-link a:hover {
  text-decoration: underline;
}
</style>

<style>
.task-credit-drawer .el-drawer__body {
  padding: 16px 20px 24px;
}
</style>
