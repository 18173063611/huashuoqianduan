<template>
  <div class="billing-estimate-banner" :class="{ 'billing-estimate-banner--insufficient': isInsufficient }">
    <span v-if="loading" class="billing-estimate-banner__loading">预估积分加载中…</span>
    <template v-else>
      <span class="billing-estimate-banner__balance">
        当前余额：<strong>{{ balanceDisplay }}</strong> 积分
      </span>
      <span class="billing-estimate-banner__sep">·</span>
      <span class="billing-estimate-banner__estimate">
        预计消耗：<strong>{{ estimatedCreditCost }}</strong> 积分
      </span>
      <span v-if="showStepHint && steps.length > 0" class="billing-estimate-banner__steps" :title="stepTooltip">
        ({{ steps.length }} 个步骤)
      </span>
      <p v-if="isInsufficient" class="billing-estimate-banner__hint">
        当前积分不足，请充值或降低生成配置
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 八个 AI 功能页面统一展示的"预计消耗 / 当前余额"横幅。
 * 数据来自 useBillingEstimate composable，与后端 createTask 预扣金额严格一致。
 */
import { computed } from 'vue'
import type { BillingEstimateStep } from '../../types/creditTypes'

const props = withDefaults(
  defineProps<{
    estimatedCreditCost: number
    balance: number | null
    loading?: boolean
    steps?: BillingEstimateStep[]
    showStepHint?: boolean
  }>(),
  {
    loading: false,
    steps: () => [],
    showStepHint: false,
  },
)

const balanceDisplay = computed(() => (props.balance == null ? '—' : props.balance))
const isInsufficient = computed(() => {
  if (props.balance == null) return false
  if (props.estimatedCreditCost <= 0) return false
  return props.balance < props.estimatedCreditCost
})
const stepTooltip = computed(() =>
  (props.steps ?? [])
    .map((s) => `${s.stepName ?? '步骤'}：${s.creditCost} 积分${s.enabled ? '' : '（已禁用）'}`)
    .join('\n'),
)
</script>

<style scoped>
.billing-estimate-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #f3f6ff;
  border: 1px solid #d9e2ff;
  border-radius: 8px;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.6;
}
.billing-estimate-banner--insufficient {
  background: #fff4f1;
  border-color: #ffc7b8;
}
.billing-estimate-banner__loading {
  color: #9ca3af;
}
.billing-estimate-banner__balance strong,
.billing-estimate-banner__estimate strong {
  color: #2563eb;
  font-weight: 600;
}
.billing-estimate-banner__sep {
  color: #9ca3af;
}
.billing-estimate-banner__steps {
  color: #6b7280;
  font-size: 12px;
  cursor: help;
}
.billing-estimate-banner__hint {
  flex-basis: 100%;
  margin: 4px 0 0;
  color: #c2410c;
  font-weight: 500;
  font-size: 12px;
}
</style>
