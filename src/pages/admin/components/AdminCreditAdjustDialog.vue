<template>
  <el-dialog v-model="dialogVisible" title="调整积分" width="520px">
    <el-form :model="form" label-position="top">
      <el-form-item label="当前可用积分">
        <el-input :model-value="formatCreditAmount(account?.balance ?? user?.creditBalance)" disabled />
      </el-form-item>
      <el-form-item label="调整类型">
        <el-radio-group v-model="form.changeType">
          <el-radio-button label="ADMIN_ADD">增加积分</el-radio-button>
          <el-radio-button label="ADMIN_DEDUCT">扣减积分</el-radio-button>
          <el-radio-button label="ADMIN_SET">修正余额</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="积分数量">
        <el-input-number v-model="form.amount" :min="0" :precision="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" maxlength="500" show-word-limit type="textarea" placeholder="请填写调整原因，便于后续查账" />
      </el-form-item>
    </el-form>

    <el-divider />
    <div class="credit-log-header">
      <strong>最近积分流水</strong>
    </div>
    <el-table v-loading="logsLoading" :data="logs" size="small" border max-height="260" empty-text="暂无积分流水">
      <el-table-column label="类型" min-width="120">
        <template #default="{ row }">{{ getCreditChangeTypeLabel(row.changeType) }}</template>
      </el-table-column>
      <el-table-column label="变动" width="90">
        <template #default="{ row }">
          <span :class="['credit-change', Number(row.changeAmount) >= 0 ? 'is-positive' : 'is-negative']">
            {{ formatCreditChange(row.changeAmount) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="余额" width="100">
        <template #default="{ row }">{{ formatCreditAmount(row.afterBalance) }}</template>
      </el-table-column>
      <el-table-column label="任务" width="90">
        <template #default="{ row }">{{ row.relatedTaskId ?? '无' }}</template>
      </el-table-column>
      <el-table-column label="模型" min-width="120">
        <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
      </el-table-column>
      <el-table-column label="备注" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ formatEmpty(row.remark, '暂无备注') }}</template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">确认调整</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type {
  AdminCreditAccount,
  AdminCreditAdjustRequest,
  AdminCreditLogItem,
  AdminUserItem,
} from '../../../types/adminTypes'
import {
  compactCode,
  formatCreditAmount,
  formatCreditChange,
  formatEmpty,
  getCreditChangeTypeLabel,
} from '../../../utils/adminDisplay'

const props = defineProps<{
  visible: boolean
  user: AdminUserItem | null
  account: AdminCreditAccount | null
  logs: AdminCreditLogItem[]
  logsLoading: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  submit: [payload: AdminCreditAdjustRequest]
}>()

const form = reactive<AdminCreditAdjustRequest>({
  changeType: 'ADMIN_ADD',
  amount: 0,
  remark: '',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    Object.assign(form, { changeType: 'ADMIN_ADD', amount: 0, remark: '' })
  },
)

function submit() {
  if (form.amount <= 0) {
    ElMessage.warning('请输入大于 0 的积分数量')
    return
  }
  if (!form.remark.trim()) {
    ElMessage.warning('请填写积分调整备注')
    return
  }
  emit('submit', { ...form, remark: form.remark.trim() })
}
</script>

<style scoped>
.credit-log-header {
  margin-bottom: 10px;
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
