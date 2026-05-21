<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>资产管理</h2>
        <p>查看全站公共与私有资产，处理发布、私有化、下架和删除。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadAssets">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="用户ID">
          <el-input-number v-model="filters.ownerUserId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="可见性">
          <el-select v-model="filters.visibility" clearable placeholder="全部可见性" style="width: 130px">
            <el-option label="公共" value="PUBLIC" />
            <el-option label="私有" value="PRIVATE" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="可用" value="ACTIVE" />
            <el-option label="待保存" value="PENDING_SAVE" />
            <el-option label="已下架" value="REMOVED" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.assetType" clearable placeholder="全部类型" style="width: 130px">
            <el-option label="图片" value="IMAGE" />
            <el-option label="封面" value="COVER" />
            <el-option label="音频" value="AUDIO" />
            <el-option label="视频" value="VIDEO" />
            <el-option label="文本" value="TEXT" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="filters.sourceType" clearable placeholder="sourceType" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="文件名" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="assetId" border :empty-text="emptyText">
        <el-table-column label="预览" width="96">
          <template #default="{ row }">
            <div class="asset-preview">
              <img v-if="isImageAsset(row)" :src="previewUrl(row)" :alt="row.fileName" />
              <video v-else-if="isVideoAsset(row)" :src="previewUrl(row)" muted preload="metadata" />
              <span v-else>{{ row.assetType }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="assetId" label="资产ID" width="92" />
        <el-table-column label="文件名" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ formatEmpty(row.fileName) }}</template>
        </el-table-column>
        <el-table-column label="归属用户" width="110">
          <template #default="{ row }">{{ formatEmpty(row.ownerUserId) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ row.assetType }}</template>
        </el-table-column>
        <el-table-column label="可见性" width="105">
          <template #default="{ row }">
            <el-tag :type="row.visibility === 'PUBLIC' ? 'success' : 'info'" effect="light">
              {{ visibilityLabel(row.visibility) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="105">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatEmpty(row.sourceType) }}</template>
        </el-table-column>
        <el-table-column label="大小" width="110">
          <template #default="{ row }">{{ formatBytes(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="发布时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.publishedAt) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.visibility !== 'PUBLIC'"
              link
              type="primary"
              :loading="isRunning(row, 'public')"
              @click="setPublic(row)"
            >
              设为公共
            </el-button>
            <el-button
              v-if="row.visibility !== 'PRIVATE'"
              link
              type="primary"
              :disabled="!row.ownerUserId"
              :title="!row.ownerUserId ? '缺少归属用户，不能设为私有资产' : ''"
              :loading="isRunning(row, 'private')"
              @click="setPrivate(row)"
            >
              设为私有
            </el-button>
            <el-button
              v-if="row.status !== 'REMOVED'"
              link
              type="warning"
              :loading="isRunning(row, 'remove')"
              @click="removeAsset(row)"
            >
              下架
            </el-button>
            <el-button v-else link type="success" :loading="isRunning(row, 'restore')" @click="restoreAsset(row)">
              恢复
            </el-button>
            <el-button link type="danger" :loading="isRunning(row, 'delete')" @click="deleteAssetRow(row)">
              删除
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
        @size-change="loadAssets"
        @current-change="loadAssets"
      />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { TagProps } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  deleteAdminAsset,
  listAdminAssets,
  privatizeAdminAsset,
  publishAdminAsset,
  removeAdminAsset,
  restoreAdminAsset,
} from '../../services/adminApi'
import { API_ORIGIN } from '../../services/request'
import type { AdminAssetItem, AdminAssetQuery } from '../../types/adminTypes'
import { formatDateTime, formatEmpty, getEmptyText } from '../../utils/adminDisplay'

type AssetAction = 'public' | 'private' | 'remove' | 'restore' | 'delete'

const filters = reactive<AdminAssetQuery>({
  pageNo: 1,
  pageSize: 10,
  visibility: '',
  status: '',
  assetType: '',
  sourceType: '',
  keyword: '',
})
const records = ref<AdminAssetItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const runningKey = ref('')
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无资产记录'))

async function loadAssets() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminAssets(filters)
    records.value = page.records
    total.value = page.total
  } catch (unknownError) {
    records.value = []
    total.value = 0
    error.value = unknownError instanceof Error ? unknownError.message : '资产管理接口请求失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.pageNo = 1
  void loadAssets()
}

function resetFilters() {
  Object.assign(filters, {
    ownerUserId: undefined,
    visibility: '',
    status: '',
    assetType: '',
    sourceType: '',
    keyword: '',
    pageNo: 1,
    pageSize: 10,
  })
  void loadAssets()
}

async function setPublic(row: AdminAssetItem) {
  await runAssetAction(row, 'public', '确认将该资产设为公共资产？', publishAdminAsset, '已设为公共资产')
}

async function setPrivate(row: AdminAssetItem) {
  if (!row.ownerUserId) return
  await runAssetAction(row, 'private', '确认将该资产设为私有资产？', privatizeAdminAsset, '已设为私有资产')
}

async function removeAsset(row: AdminAssetItem) {
  await runAssetAction(row, 'remove', '确认下架该资产？下架后用户侧不会展示。', removeAdminAsset, '资产已下架')
}

async function restoreAsset(row: AdminAssetItem) {
  await runAssetAction(row, 'restore', '确认恢复该资产？', restoreAdminAsset, '资产已恢复')
}

async function deleteAssetRow(row: AdminAssetItem) {
  await runAssetAction(row, 'delete', '确认删除该资产？删除后不会再出现在资产列表。', deleteAdminAsset, '资产已删除')
}

async function runAssetAction(
  row: AdminAssetItem,
  action: AssetAction,
  confirmText: string,
  requestFn: (assetId: number) => Promise<unknown>,
  successText: string,
) {
  await ElMessageBox.confirm(`${confirmText}\n资产ID：${row.assetId}`, '资产管理', { type: 'warning' })
  runningKey.value = actionKey(row, action)
  try {
    await requestFn(row.assetId)
    ElMessage.success(successText)
    await loadAssets()
  } finally {
    runningKey.value = ''
  }
}

function isRunning(row: AdminAssetItem, action: AssetAction) {
  return runningKey.value === actionKey(row, action)
}

function actionKey(row: AdminAssetItem, action: AssetAction) {
  return `${row.assetId}:${action}`
}

function hasFilter() {
  return Boolean(filters.ownerUserId || filters.visibility || filters.status || filters.assetType || filters.sourceType || filters.keyword)
}

function isImageAsset(row: AdminAssetItem) {
  return row.assetType === 'IMAGE' || row.assetType === 'COVER' || row.mimeType?.startsWith('image/')
}

function isVideoAsset(row: AdminAssetItem) {
  return row.assetType === 'VIDEO' || row.mimeType?.startsWith('video/')
}

function previewUrl(row: AdminAssetItem) {
  const url = row.thumbnailUrl || row.fileUrl
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

function visibilityLabel(value?: string | null) {
  if (value === 'PUBLIC') return '公共'
  if (value === 'PRIVATE') return '私有'
  return formatEmpty(value)
}

function statusLabel(value?: string | null) {
  const map: Record<string, string> = {
    ACTIVE: '可用',
    REMOVED: '已下架',
    PENDING_SAVE: '待保存',
  }
  return value ? map[value] || value : '暂无'
}

function statusTagType(value?: string | null): TagProps['type'] {
  if (value === 'ACTIVE') return 'success'
  if (value === 'REMOVED') return 'danger'
  if (value === 'PENDING_SAVE') return 'warning'
  return 'info'
}

function formatBytes(value?: number | null) {
  const size = Number(value ?? 0)
  if (!size) return '暂无'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(loadAssets)
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

.asset-preview {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}

.asset-preview img,
.asset-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
