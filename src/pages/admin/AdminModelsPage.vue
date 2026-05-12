<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>模型配置</h2>
        <p>管理模型启用状态、默认模型和每次任务消耗积分。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadModels">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增模型</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="模型类型">
          <el-select v-model="filters.modelType" clearable placeholder="全部类型" style="width: 140px">
            <el-option label="图片生成" value="IMAGE" />
            <el-option label="视频生成" value="VIDEO" />
            <el-option label="语音合成" value="TTS" />
            <el-option label="文本生成" value="TEXT" />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="filters.provider" clearable placeholder="输入供应商" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-select v-model="filters.enabled" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="modelId" border :empty-text="emptyText">
        <el-table-column prop="modelCode" label="模型编码" min-width="180" />
        <el-table-column label="模型名称" min-width="160">
          <template #default="{ row }">{{ formatEmpty(row.modelName) }}</template>
        </el-table-column>
        <el-table-column label="模型类型" width="120">
          <template #default="{ row }">{{ getModelTypeLabel(row.modelType) }}</template>
        </el-table-column>
        <el-table-column label="供应商" width="130">
          <template #default="{ row }">{{ getProviderLabel(row.provider) }}</template>
        </el-table-column>
        <el-table-column label="每次消耗积分" width="130">
          <template #default="{ row }">{{ formatCreditAmount(row.creditCost, '积分/次') }}</template>
        </el-table-column>
        <el-table-column label="是否默认" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.defaultModel" type="warning">默认模型</el-tag>
            <el-tag v-else type="info" effect="plain">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getTagTypeByStatus(row.enabled)">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" :disabled="row.defaultModel || !row.enabled" @click="makeDefault(row)">
              设为默认
            </el-button>
            <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggleEnabled(row)">
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="admin-pagination"
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="loadModels"
        @current-change="loadModels"
      />
    </el-card>

    <el-dialog v-model="editorVisible" :title="editingModelId ? '编辑模型' : '新增模型'" width="680px">
      <el-form :model="form" label-position="top">
        <el-row :gutter="14">
          <el-col :span="12"><el-form-item label="模型编码"><el-input v-model="form.modelCode" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="模型名称"><el-input v-model="form.modelName" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="模型类型">
              <el-select v-model="form.modelType" style="width: 100%">
                <el-option label="图片生成" value="IMAGE" />
                <el-option label="视频生成" value="VIDEO" />
                <el-option label="语音合成" value="TTS" />
                <el-option label="文本生成" value="TEXT" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12"><el-form-item label="供应商"><el-input v-model="form.provider" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="供应商模型"><el-input v-model="form.providerModel" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="每次消耗积分">
              <el-input-number v-model="form.creditCost" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="能力 JSON"><el-input v-model="form.capabilityJson" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="默认参数 JSON"><el-input v-model="form.defaultParamsJson" type="textarea" :rows="3" /></el-form-item>
        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="每分钟限流">
              <el-input-number v-model="form.rateLimitPerMinute" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="并发上限">
              <el-input-number v-model="form.concurrencyLimit" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-checkbox v-model="form.enabled">启用</el-checkbox>
        <el-checkbox v-model="form.defaultModel">设为默认</el-checkbox>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveModel">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  createAdminModel,
  disableAdminModel,
  enableAdminModel,
  listAdminModels,
  setDefaultAdminModel,
  updateAdminModel,
} from '../../services/adminApi'
import type { AdminModelItem, AdminModelQuery, AdminModelSaveRequest } from '../../types/adminTypes'
import {
  formatCreditAmount,
  formatDateTime,
  formatEmpty,
  getEmptyText,
  getModelTypeLabel,
  getProviderLabel,
  getTagTypeByStatus,
} from '../../utils/adminDisplay'

const filters = reactive<AdminModelQuery>({ modelType: '', provider: '', enabled: '', pageNo: 1, pageSize: 10 })
const records = ref<AdminModelItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const editorVisible = ref(false)
const saving = ref(false)
const editingModelId = ref<number | null>(null)
const form = reactive<AdminModelSaveRequest>(emptyForm())
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无模型配置'))

function emptyForm(): AdminModelSaveRequest {
  return {
    modelCode: '',
    modelName: '',
    modelType: 'IMAGE',
    provider: 'VOLCENGINE',
    providerModel: '',
    creditCost: 0,
    enabled: true,
    defaultModel: false,
    capabilityJson: '{}',
    defaultParamsJson: '{}',
  }
}

async function loadModels() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminModels(filters)
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
  void loadModels()
}

function resetFilters() {
  Object.assign(filters, { modelType: '', provider: '', enabled: '', pageNo: 1, pageSize: 10 })
  void loadModels()
}

function hasFilter() {
  return Boolean(filters.modelType || filters.provider || filters.enabled !== '')
}

function openCreate() {
  editingModelId.value = null
  Object.assign(form, emptyForm())
  editorVisible.value = true
}

function openEdit(row: AdminModelItem) {
  editingModelId.value = row.modelId
  Object.assign(form, {
    modelCode: row.modelCode,
    modelName: row.modelName,
    modelType: row.modelType,
    provider: row.provider,
    providerModel: row.providerModel || '',
    creditCost: row.creditCost,
    enabled: row.enabled,
    defaultModel: row.defaultModel,
    capabilityJson: row.capabilityJson || '{}',
    defaultParamsJson: row.defaultParamsJson || '{}',
    rateLimitPerMinute: row.rateLimitPerMinute,
    concurrencyLimit: row.concurrencyLimit,
  })
  editorVisible.value = true
}

async function saveModel() {
  saving.value = true
  try {
    if (editingModelId.value) await updateAdminModel(editingModelId.value, form)
    else await createAdminModel(form)
    ElMessage.success('模型配置已保存')
    editorVisible.value = false
    await loadModels()
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(row: AdminModelItem) {
  if (row.enabled) await disableAdminModel(row.modelId)
  else await enableAdminModel(row.modelId)
  ElMessage.success('模型状态已更新')
  await loadModels()
}

async function makeDefault(row: AdminModelItem) {
  await setDefaultAdminModel(row.modelId)
  ElMessage.success('默认模型已更新')
  await loadModels()
}

onMounted(loadModels)
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

.page-actions {
  display: flex;
  gap: 10px;
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
