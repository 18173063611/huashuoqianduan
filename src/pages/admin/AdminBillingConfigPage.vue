<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>AI 计费配置</h2>
        <p>维护各任务类型的计费步骤（积分汇总来源）和模型单价表。修改仅影响后续新建任务，不会回溯已有任务结算。</p>
      </div>
    </div>

    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 计费步骤 -->
        <el-tab-pane label="计费步骤" name="steps">
          <el-form class="admin-filter" :model="stepFilters" inline>
            <el-form-item label="任务类型">
              <el-input v-model="stepFilters.taskType" clearable placeholder="如 TTS_GENERATE" style="width: 200px" />
            </el-form-item>
            <el-form-item label="功能模块">
              <el-input v-model="stepFilters.functionModule" clearable placeholder="模糊匹配" style="width: 160px" />
            </el-form-item>
            <el-form-item label="启用状态">
              <el-select v-model="stepFilters.enabled" clearable placeholder="全部状态" style="width: 140px">
                <el-option label="启用" :value="true" />
                <el-option label="禁用" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleStepSearch">查询</el-button>
              <el-button :icon="Refresh" @click="resetStepFilters">重置</el-button>
              <el-button type="primary" :icon="Plus" @click="openStepCreate">新增步骤</el-button>
            </el-form-item>
          </el-form>

          <el-alert v-if="stepError" class="admin-page-alert" :title="stepError" type="warning" show-icon :closable="false" />

          <el-table
            v-loading="stepLoading"
            :data="stepRecords"
            row-key="stepId"
            border
            :empty-text="stepEmptyText"
          >
            <el-table-column prop="taskType" label="任务类型" min-width="200" />
            <el-table-column label="功能模块" min-width="140">
              <template #default="{ row }">{{ formatEmpty(row.functionModule) }}</template>
            </el-table-column>
            <el-table-column label="步骤名称" min-width="160">
              <template #default="{ row }">{{ formatEmpty(row.stepName) }}</template>
            </el-table-column>
            <el-table-column label="供应商" width="120">
              <template #default="{ row }">{{ formatEmpty(row.provider) }}</template>
            </el-table-column>
            <el-table-column label="模型/API" min-width="180">
              <template #default="{ row }">{{ formatEmpty(row.modelCode) }}</template>
            </el-table-column>
            <el-table-column label="计量单位" width="110">
              <template #default="{ row }">{{ formatEmpty(row.usageUnit) }}</template>
            </el-table-column>
            <el-table-column label="单次成本描述" min-width="160">
              <template #default="{ row }">{{ formatEmpty(row.costText) }}</template>
            </el-table-column>
            <el-table-column label="积分" width="110">
              <template #default="{ row }">{{ formatCreditAmount(row.creditCost, '积分') }}</template>
            </el-table-column>
            <el-table-column label="启用状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getTagTypeByStatus(row.enabled)">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openStepEdit(row)">编辑</el-button>
                <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggleStepEnabled(row)">
                  {{ row.enabled ? '禁用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="admin-pagination"
            v-model:current-page="stepFilters.pageNo"
            v-model:page-size="stepFilters.pageSize"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="stepTotal"
            @size-change="loadSteps"
            @current-change="loadSteps"
          />
        </el-tab-pane>

        <!-- 用量统计 -->
        <el-tab-pane label="用量统计" name="usage">
          <el-form class="admin-filter" :model="usageFilters" inline>
            <el-form-item label="统计维度">
              <el-select v-model="usageFilters.dimension" style="width: 160px" @change="loadUsage">
                <el-option label="按日期" value="DATE" />
                <el-option label="按功能模块" value="FUNCTION_MODULE" />
                <el-option label="按任务类型" value="TASK_TYPE" />
                <el-option label="按供应商" value="PROVIDER" />
                <el-option label="按模型编码" value="MODEL_CODE" />
                <el-option label="按计量单位" value="USAGE_UNIT" />
              </el-select>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="usageDateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="~"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 260px"
              />
            </el-form-item>
            <el-form-item label="任务类型">
              <el-input v-model="usageFilters.taskType" clearable placeholder="可选" style="width: 160px" />
            </el-form-item>
            <el-form-item label="功能模块">
              <el-input v-model="usageFilters.functionModule" clearable placeholder="可选" style="width: 140px" />
            </el-form-item>
            <el-form-item label="供应商">
              <el-input v-model="usageFilters.provider" clearable placeholder="可选" style="width: 140px" />
            </el-form-item>
            <el-form-item label="模型编码">
              <el-input v-model="usageFilters.modelCode" clearable placeholder="可选" style="width: 160px" />
            </el-form-item>
            <el-form-item label="计量单位">
              <el-select v-model="usageFilters.usageUnit" clearable placeholder="全部" style="width: 130px">
                <el-option label="TOKEN" value="TOKEN" />
                <el-option label="CHAR" value="CHAR" />
                <el-option label="IMAGE" value="IMAGE" />
                <el-option label="SECOND" value="SECOND" />
                <el-option label="PROVIDER_CREDIT" value="PROVIDER_CREDIT" />
                <el-option label="TASK" value="TASK" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleUsageSearch">查询</el-button>
              <el-button :icon="Refresh" @click="resetUsageFilters">重置</el-button>
              <el-button :icon="Download" :loading="usageExporting" @click="exportUsageCsv">导出 CSV</el-button>
            </el-form-item>
          </el-form>

          <el-alert v-if="usageError" class="admin-page-alert" :title="usageError" type="warning" show-icon :closable="false" />

          <el-table
            v-loading="usageLoading"
            :data="usageRecords"
            row-key="groupKey"
            border
            :empty-text="usageEmptyText"
            show-summary
            :summary-method="usageSummaryRow"
          >
            <el-table-column :label="usageDimensionLabel" min-width="160">
              <template #default="{ row }">{{ row.groupLabel }}</template>
            </el-table-column>
            <el-table-column label="调用次数" width="110" align="right">
              <template #default="{ row }">{{ row.callCount }}</template>
            </el-table-column>
            <el-table-column label="预估积分" width="120" align="right">
              <template #default="{ row }">{{ row.estimatedCreditCost }}</template>
            </el-table-column>
            <el-table-column label="实际积分" width="120" align="right">
              <template #default="{ row }">{{ row.actualCreditCost }}</template>
            </el-table-column>
            <el-table-column label="最终成本" width="120" align="right">
              <template #default="{ row }">
                <strong>{{ row.finalCreditCost }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="prompt_tokens" width="130" align="right">
              <template #default="{ row }">{{ row.promptTokens }}</template>
            </el-table-column>
            <el-table-column label="completion_tokens" width="150" align="right">
              <template #default="{ row }">{{ row.completionTokens }}</template>
            </el-table-column>
            <el-table-column label="total_tokens" width="130" align="right">
              <template #default="{ row }">{{ row.totalTokens }}</template>
            </el-table-column>
            <el-table-column label="字符数" width="110" align="right">
              <template #default="{ row }">{{ row.characterCount }}</template>
            </el-table-column>
            <el-table-column label="图片数" width="110" align="right">
              <template #default="{ row }">{{ row.imageCount }}</template>
            </el-table-column>
            <el-table-column label="时长(s)" width="120" align="right">
              <template #default="{ row }">{{ formatNumeric(row.durationSeconds) }}</template>
            </el-table-column>
            <el-table-column label="provider_credits" width="150" align="right">
              <template #default="{ row }">{{ formatNumeric(row.providerCredits) }}</template>
            </el-table-column>
          </el-table>

          <p class="usage-hint">
            最终成本规则：每个任务取 ACTUAL.actual_credit_cost &gt; 0；否则回退 ESTIMATE.estimated_credit_cost。
          </p>
        </el-tab-pane>

        <!-- 模型单价 -->
        <el-tab-pane label="模型单价" name="prices">
          <el-form class="admin-filter" :model="priceFilters" inline>
            <el-form-item label="供应商">
              <el-input v-model="priceFilters.provider" clearable placeholder="如 VOLCENGINE" style="width: 160px" />
            </el-form-item>
            <el-form-item label="任务类型">
              <el-input v-model="priceFilters.taskType" clearable placeholder="如 TTS_GENERATE" style="width: 200px" />
            </el-form-item>
            <el-form-item label="启用状态">
              <el-select v-model="priceFilters.enabled" clearable placeholder="全部状态" style="width: 140px">
                <el-option label="启用" :value="true" />
                <el-option label="禁用" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handlePriceSearch">查询</el-button>
              <el-button :icon="Refresh" @click="resetPriceFilters">重置</el-button>
              <el-button type="primary" :icon="Plus" @click="openPriceCreate">新增单价</el-button>
            </el-form-item>
          </el-form>

          <el-alert v-if="priceError" class="admin-page-alert" :title="priceError" type="warning" show-icon :closable="false" />

          <el-table
            v-loading="priceLoading"
            :data="priceRecords"
            row-key="priceId"
            border
            :empty-text="priceEmptyText"
          >
            <el-table-column prop="provider" label="供应商" width="130" />
            <el-table-column prop="modelCode" label="模型编码" min-width="180" />
            <el-table-column label="模型名称" min-width="160">
              <template #default="{ row }">{{ formatEmpty(row.modelName) }}</template>
            </el-table-column>
            <el-table-column label="任务类型" min-width="160">
              <template #default="{ row }">{{ formatEmpty(row.taskType) }}</template>
            </el-table-column>
            <el-table-column label="计量单位" width="120">
              <template #default="{ row }">{{ formatEmpty(row.usageUnit) }}</template>
            </el-table-column>
            <el-table-column label="单价" width="130">
              <template #default="{ row }">{{ formatNumeric(row.unitCreditPrice) }}</template>
            </el-table-column>
            <el-table-column label="输入/千Token" width="130">
              <template #default="{ row }">{{ formatNumeric(row.inputCreditPer1k) }}</template>
            </el-table-column>
            <el-table-column label="输出/千Token" width="130">
              <template #default="{ row }">{{ formatNumeric(row.outputCreditPer1k) }}</template>
            </el-table-column>
            <el-table-column label="启用状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getTagTypeByStatus(row.enabled)">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openPriceEdit(row)">编辑</el-button>
                <el-button link :type="row.enabled ? 'warning' : 'success'" @click="togglePriceEnabled(row)">
                  {{ row.enabled ? '禁用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="admin-pagination"
            v-model:current-page="priceFilters.pageNo"
            v-model:page-size="priceFilters.pageSize"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="priceTotal"
            @size-change="loadPrices"
            @current-change="loadPrices"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 计费步骤 编辑器 -->
    <el-dialog v-model="stepEditorVisible" :title="editingStepId ? '编辑计费步骤' : '新增计费步骤'" width="720px">
      <el-form :model="stepForm" label-position="top">
        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="任务类型（task_type）" required>
              <el-input v-model="stepForm.taskType" placeholder="如 TTS_GENERATE" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="功能模块">
              <el-input v-model="stepForm.functionModule" placeholder="如 抖音解析" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="步骤名称" required>
              <el-input v-model="stepForm.stepName" placeholder="如 文本转语音" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商">
              <el-input v-model="stepForm.provider" placeholder="如 VOLCENGINE" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模型 / API 编码">
              <el-input v-model="stepForm.modelCode" placeholder="如 doubao-seed-2-0-mini-260215" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计量单位（usage_unit）">
              <el-select v-model="stepForm.usageUnit" clearable placeholder="TOKEN / CHAR / IMAGE / SECOND / TASK" style="width: 100%">
                <el-option label="TOKEN" value="TOKEN" />
                <el-option label="CHAR" value="CHAR" />
                <el-option label="IMAGE" value="IMAGE" />
                <el-option label="SECOND" value="SECOND" />
                <el-option label="PROVIDER_CREDIT" value="PROVIDER_CREDIT" />
                <el-option label="TASK" value="TASK" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="调用次数文案">
              <el-input v-model="stepForm.callCount" placeholder="如 1 次 / 多次轮询" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单次成本描述">
              <el-input v-model="stepForm.costText" placeholder="如 1 元/百万 Token" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="建议积分（credit_cost）">
              <el-input-number v-model="stepForm.creditCost" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序权重（小在前）">
              <el-input-number v-model="stepForm.sortOrder" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="stepForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-checkbox v-model="stepForm.enabled">启用</el-checkbox>
      </el-form>
      <template #footer>
        <el-button @click="stepEditorVisible = false">取消</el-button>
        <el-button type="primary" :loading="stepSaving" @click="saveStep">保存</el-button>
      </template>
    </el-dialog>

    <!-- 模型单价 编辑器 -->
    <el-dialog v-model="priceEditorVisible" :title="editingPriceId ? '编辑模型单价' : '新增模型单价'" width="720px">
      <el-form :model="priceForm" label-position="top">
        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-input v-model="priceForm.provider" placeholder="如 VOLCENGINE" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模型编码" required>
              <el-input v-model="priceForm.modelCode" placeholder="如 doubao-seedance-2-0-pro" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模型名称">
              <el-input v-model="priceForm.modelName" placeholder="便于后台展示" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务类型">
              <el-input v-model="priceForm.taskType" placeholder="如 TEXT_TO_VIDEO_SEEDANCE_2_0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计量单位">
              <el-select v-model="priceForm.usageUnit" clearable placeholder="TOKEN / SECOND / IMAGE" style="width: 100%">
                <el-option label="TOKEN" value="TOKEN" />
                <el-option label="CHAR" value="CHAR" />
                <el-option label="IMAGE" value="IMAGE" />
                <el-option label="SECOND" value="SECOND" />
                <el-option label="PROVIDER_CREDIT" value="PROVIDER_CREDIT" />
                <el-option label="TASK" value="TASK" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价（unit_credit_price）">
              <el-input-number
                v-model="priceForm.unitCreditPrice"
                :min="0"
                :precision="4"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="输入积分 / 千 Token">
              <el-input-number
                v-model="priceForm.inputCreditPer1k"
                :min="0"
                :precision="4"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="输出积分 / 千 Token">
              <el-input-number
                v-model="priceForm.outputCreditPer1k"
                :min="0"
                :precision="4"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="估算输出比例">
              <el-input-number
                v-model="priceForm.estimateOutputRatio"
                :min="0"
                :precision="4"
                :step="0.1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="估算缓冲比例">
              <el-input-number
                v-model="priceForm.estimateBufferRatio"
                :min="0"
                :precision="4"
                :step="0.05"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-checkbox v-model="priceForm.enabled">启用</el-checkbox>
      </el-form>
      <template #footer>
        <el-button @click="priceEditorVisible = false">取消</el-button>
        <el-button type="primary" :loading="priceSaving" @click="savePrice">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  createAdminBillingStep,
  createAdminModelPrice,
  disableAdminBillingStep,
  disableAdminModelPrice,
  downloadAdminUsageSummaryCsv,
  enableAdminBillingStep,
  enableAdminModelPrice,
  getAdminUsageSummary,
  listAdminBillingSteps,
  listAdminModelPrices,
  updateAdminBillingStep,
  updateAdminModelPrice,
} from '../../services/adminApi'
import type {
  AdminBillingStepItem,
  AdminBillingStepQuery,
  AdminBillingStepSaveRequest,
  AdminModelPriceItem,
  AdminModelPriceQuery,
  AdminModelPriceSaveRequest,
  AdminUsageSummaryDimension,
  AdminUsageSummaryQuery,
  AdminUsageSummaryRow,
} from '../../types/adminTypes'
import {
  formatCreditAmount,
  formatEmpty,
  getEmptyText,
  getTagTypeByStatus,
} from '../../utils/adminDisplay'

const activeTab = ref<'steps' | 'prices' | 'usage'>('steps')

// ----- 计费步骤 -----
const stepFilters = reactive<AdminBillingStepQuery>({
  taskType: '',
  functionModule: '',
  enabled: '',
  pageNo: 1,
  pageSize: 20,
})
const stepRecords = ref<AdminBillingStepItem[]>([])
const stepTotal = ref(0)
const stepLoading = ref(false)
const stepError = ref('')
const stepEditorVisible = ref(false)
const stepSaving = ref(false)
const editingStepId = ref<number | null>(null)
const stepForm = reactive<AdminBillingStepSaveRequest>(emptyStepForm())
const stepEmptyText = computed(() =>
  getEmptyText(stepLoading.value, stepTotal.value, hasStepFilter(), '暂无计费步骤配置'),
)

function emptyStepForm(): AdminBillingStepSaveRequest {
  return {
    taskType: '',
    functionModule: '',
    stepName: '',
    provider: '',
    modelCode: '',
    usageUnit: '',
    callCount: '',
    costText: '',
    creditCost: 0,
    enabled: true,
    sortOrder: 0,
    remark: '',
  }
}

async function loadSteps() {
  stepLoading.value = true
  stepError.value = ''
  try {
    const page = await listAdminBillingSteps(stepFilters)
    stepRecords.value = page.records
    stepTotal.value = page.total
  } catch (unknownError) {
    stepRecords.value = []
    stepTotal.value = 0
    stepError.value = unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
  } finally {
    stepLoading.value = false
  }
}

function handleStepSearch() {
  stepFilters.pageNo = 1
  void loadSteps()
}

function resetStepFilters() {
  Object.assign(stepFilters, { taskType: '', functionModule: '', enabled: '', pageNo: 1, pageSize: 20 })
  void loadSteps()
}

function hasStepFilter() {
  return Boolean(stepFilters.taskType || stepFilters.functionModule || stepFilters.enabled !== '')
}

function openStepCreate() {
  editingStepId.value = null
  Object.assign(stepForm, emptyStepForm())
  stepEditorVisible.value = true
}

function openStepEdit(row: AdminBillingStepItem) {
  editingStepId.value = row.stepId
  Object.assign(stepForm, {
    taskType: row.taskType,
    functionModule: row.functionModule || '',
    stepName: row.stepName,
    provider: row.provider || '',
    modelCode: row.modelCode || '',
    usageUnit: row.usageUnit || '',
    callCount: row.callCount || '',
    costText: row.costText || '',
    creditCost: row.creditCost,
    enabled: row.enabled,
    sortOrder: row.sortOrder ?? 0,
    remark: row.remark || '',
  })
  stepEditorVisible.value = true
}

async function saveStep() {
  stepSaving.value = true
  try {
    if (editingStepId.value) await updateAdminBillingStep(editingStepId.value, stepForm)
    else await createAdminBillingStep(stepForm)
    ElMessage.success('计费步骤已保存')
    stepEditorVisible.value = false
    await loadSteps()
  } finally {
    stepSaving.value = false
  }
}

async function toggleStepEnabled(row: AdminBillingStepItem) {
  if (row.enabled) await disableAdminBillingStep(row.stepId)
  else await enableAdminBillingStep(row.stepId)
  ElMessage.success('启用状态已更新')
  await loadSteps()
}

// ----- 模型单价 -----
const priceFilters = reactive<AdminModelPriceQuery>({
  provider: '',
  taskType: '',
  enabled: '',
  pageNo: 1,
  pageSize: 20,
})
const priceRecords = ref<AdminModelPriceItem[]>([])
const priceTotal = ref(0)
const priceLoading = ref(false)
const priceError = ref('')
const priceEditorVisible = ref(false)
const priceSaving = ref(false)
const editingPriceId = ref<number | null>(null)
const priceForm = reactive<AdminModelPriceSaveRequest>(emptyPriceForm())
const priceEmptyText = computed(() =>
  getEmptyText(priceLoading.value, priceTotal.value, hasPriceFilter(), '暂无模型单价配置'),
)

function emptyPriceForm(): AdminModelPriceSaveRequest {
  return {
    provider: '',
    modelCode: '',
    modelName: '',
    taskType: '',
    usageUnit: '',
    inputCreditPer1k: undefined,
    outputCreditPer1k: undefined,
    unitCreditPrice: undefined,
    estimateOutputRatio: undefined,
    estimateBufferRatio: undefined,
    enabled: true,
  }
}

async function loadPrices() {
  priceLoading.value = true
  priceError.value = ''
  try {
    const page = await listAdminModelPrices(priceFilters)
    priceRecords.value = page.records
    priceTotal.value = page.total
  } catch (unknownError) {
    priceRecords.value = []
    priceTotal.value = 0
    priceError.value = unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
  } finally {
    priceLoading.value = false
  }
}

function handlePriceSearch() {
  priceFilters.pageNo = 1
  void loadPrices()
}

function resetPriceFilters() {
  Object.assign(priceFilters, { provider: '', taskType: '', enabled: '', pageNo: 1, pageSize: 20 })
  void loadPrices()
}

function hasPriceFilter() {
  return Boolean(priceFilters.provider || priceFilters.taskType || priceFilters.enabled !== '')
}

function openPriceCreate() {
  editingPriceId.value = null
  Object.assign(priceForm, emptyPriceForm())
  priceEditorVisible.value = true
}

function openPriceEdit(row: AdminModelPriceItem) {
  editingPriceId.value = row.priceId
  Object.assign(priceForm, {
    provider: row.provider,
    modelCode: row.modelCode,
    modelName: row.modelName || '',
    taskType: row.taskType || '',
    usageUnit: row.usageUnit || '',
    inputCreditPer1k: row.inputCreditPer1k,
    outputCreditPer1k: row.outputCreditPer1k,
    unitCreditPrice: row.unitCreditPrice,
    estimateOutputRatio: row.estimateOutputRatio,
    estimateBufferRatio: row.estimateBufferRatio,
    enabled: row.enabled,
  })
  priceEditorVisible.value = true
}

async function savePrice() {
  priceSaving.value = true
  try {
    if (editingPriceId.value) await updateAdminModelPrice(editingPriceId.value, priceForm)
    else await createAdminModelPrice(priceForm)
    ElMessage.success('模型单价已保存')
    priceEditorVisible.value = false
    await loadPrices()
  } finally {
    priceSaving.value = false
  }
}

async function togglePriceEnabled(row: AdminModelPriceItem) {
  if (row.enabled) await disableAdminModelPrice(row.priceId)
  else await enableAdminModelPrice(row.priceId)
  ElMessage.success('启用状态已更新')
  await loadPrices()
}

function formatNumeric(value?: number | string | null) {
  if (value === null || value === undefined) return '暂无'
  const text = String(value).trim()
  return text ? text : '暂无'
}

// ----- 用量统计 -----
const usageDateRange = ref<[string, string] | null>(defaultRange())
const usageFilters = reactive<AdminUsageSummaryQuery>({
  dimension: 'DATE',
  taskType: '',
  functionModule: '',
  provider: '',
  modelCode: '',
  usageUnit: '',
})
const usageRecords = ref<AdminUsageSummaryRow[]>([])
const usageTotal = ref<AdminUsageSummaryRow | null>(null)
const usageLoading = ref(false)
const usageExporting = ref(false)
const usageError = ref('')

const usageDimensionLabel = computed(() => {
  const map: Record<AdminUsageSummaryDimension, string> = {
    DATE: '日期',
    FUNCTION_MODULE: '功能模块',
    TASK_TYPE: '任务类型',
    PROVIDER: '供应商',
    MODEL_CODE: '模型编码',
    USAGE_UNIT: '计量单位',
  }
  return map[(usageFilters.dimension || 'DATE') as AdminUsageSummaryDimension]
})
const usageEmptyText = computed(() =>
  getEmptyText(usageLoading.value, usageRecords.value.length, hasUsageFilter(), '当前时间范围内暂无用量记录'),
)

function defaultRange(): [string, string] {
  const today = new Date()
  const end = today.toISOString().slice(0, 10)
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  return [from.toISOString().slice(0, 10), end]
}

function hasUsageFilter() {
  return Boolean(
    usageFilters.taskType
      || usageFilters.functionModule
      || usageFilters.provider
      || usageFilters.modelCode
      || usageFilters.usageUnit,
  )
}

function buildUsageQuery(): AdminUsageSummaryQuery {
  return {
    dimension: usageFilters.dimension,
    from: usageDateRange.value?.[0],
    to: usageDateRange.value?.[1],
    taskType: usageFilters.taskType,
    functionModule: usageFilters.functionModule,
    provider: usageFilters.provider,
    modelCode: usageFilters.modelCode,
    usageUnit: usageFilters.usageUnit,
  }
}

async function loadUsage() {
  usageLoading.value = true
  usageError.value = ''
  try {
    const response = await getAdminUsageSummary(buildUsageQuery())
    usageRecords.value = response.rows
    usageTotal.value = response.total
  } catch (unknownError) {
    usageRecords.value = []
    usageTotal.value = null
    usageError.value = unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
  } finally {
    usageLoading.value = false
  }
}

function handleUsageSearch() {
  void loadUsage()
}

function resetUsageFilters() {
  Object.assign(usageFilters, {
    dimension: 'DATE',
    taskType: '',
    functionModule: '',
    provider: '',
    modelCode: '',
    usageUnit: '',
  })
  usageDateRange.value = defaultRange()
  void loadUsage()
}

async function exportUsageCsv() {
  usageExporting.value = true
  try {
    await downloadAdminUsageSummaryCsv(buildUsageQuery())
    ElMessage.success('CSV 导出已开始下载')
  } catch (unknownError) {
    ElMessage.error(unknownError instanceof Error ? unknownError.message : 'CSV 导出失败')
  } finally {
    usageExporting.value = false
  }
}

interface SummaryParam {
  columns: Array<{ property?: string; label?: string }>
}

/**
 * 用合计行替代 Element Plus 默认 sum(columns)：调用次数、积分、tokens 等都用后端给的 total 行，与 finalCost 规则一致。
 */
function usageSummaryRow({ columns }: SummaryParam): string[] {
  const total = usageTotal.value
  return columns.map((_, index) => {
    if (index === 0) return '合计'
    if (!total) return '-'
    switch (index) {
      case 1: return String(total.callCount)
      case 2: return String(total.estimatedCreditCost)
      case 3: return String(total.actualCreditCost)
      case 4: return String(total.finalCreditCost)
      case 5: return String(total.promptTokens)
      case 6: return String(total.completionTokens)
      case 7: return String(total.totalTokens)
      case 8: return String(total.characterCount)
      case 9: return String(total.imageCount)
      case 10: return formatNumeric(total.durationSeconds)
      case 11: return formatNumeric(total.providerCredits)
      default: return '-'
    }
  })
}

let pricesLoaded = false
let usageLoaded = false

watch(activeTab, async (tab) => {
  if (tab === 'prices' && !pricesLoaded) {
    pricesLoaded = true
    await loadPrices()
  }
  if (tab === 'usage' && !usageLoaded) {
    usageLoaded = true
    await loadUsage()
  }
})

onMounted(async () => {
  await loadSteps()
})
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

.usage-hint {
  margin: 10px 0 0;
  color: #94a3b8;
  font-size: 12px;
}
</style>
