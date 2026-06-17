<template>
  <section class="selling-template-page">
    <header class="selling-template-head">
      <div>
        <p>汽车销售模板体系</p>
        <h2>卖点模板管理</h2>
        <span>维护卖点、Prompt 示例、关联文案模板和分镜模板，服务一键成片自动匹配。</span>
      </div>
      <div class="selling-template-actions">
        <button type="button" class="selling-template-button" :disabled="loading" @click="loadTemplates">
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
        <button type="button" class="selling-template-primary" @click="openCreateForm">+ 新增模板</button>
      </div>
    </header>

    <div class="selling-template-stats">
      <article>
        <span>模板总数</span>
        <strong>{{ filteredRows.length }}</strong>
      </article>
      <article>
        <span>已发布</span>
        <strong>{{ publishedCount }}</strong>
      </article>
      <article>
        <span>覆盖标签</span>
        <strong>{{ tagOptions.length - 1 }}</strong>
      </article>
    </div>

    <section class="selling-template-card">
      <div class="selling-template-toolbar">
        <input v-model.trim="keyword" type="search" placeholder="搜索模板名称、标签或 Prompt" />
        <select v-model="activeTag">
          <option v-for="tag in tagOptions" :key="tag" :value="tag">{{ tag }}</option>
        </select>
      </div>

      <p v-if="error" class="selling-template-error">{{ error }}</p>

      <div class="selling-template-table-wrap">
        <table class="selling-template-table">
          <thead>
            <tr>
              <th>模板名称</th>
              <th>标签</th>
              <th>Prompt 示例</th>
              <th>关联文案模板</th>
              <th>关联分镜模板</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>
                <strong>{{ row.name }}</strong>
                <small>{{ row.updatedAt }}</small>
              </td>
              <td>
                <div class="selling-template-tags">
                  <span v-for="tag in row.tags" :key="tag">{{ tag }}</span>
                </div>
              </td>
              <td>{{ row.prompt }}</td>
              <td>{{ row.copyTemplate }}</td>
              <td>{{ row.storyboardTemplate }}</td>
              <td>
                <span class="selling-template-status" :class="{ 'is-published': row.published }">
                  {{ row.published ? '已发布' : '草稿' }}
                </span>
              </td>
              <td>
                <div class="selling-template-row-actions">
                  <button type="button" @click="openDetail(row)">详情</button>
                  <button type="button" @click="openCopyForm(row)">
                    复制编辑
                  </button>
                  <button
                    v-if="!row.published"
                    type="button"
                    :disabled="!row.templateId || actionBusyId === `publish-${row.id}`"
                    @click="handlePublish(row)"
                  >
                    {{ actionBusyId === `publish-${row.id}` ? '发布中' : '发布' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="detailOpen" class="selling-template-detail-mask" @click.self="closeDetail">
      <section class="selling-template-detail" role="dialog" aria-modal="true" aria-label="卖点模板详情">
        <header class="selling-template-detail-head">
          <div>
            <p>模板详情</p>
            <h3>{{ selectedDetailRow?.name || '卖点模板' }}</h3>
            <span>{{ selectedDetailRow?.published ? '已发布' : '草稿' }} · {{ selectedDetailRow?.updatedAt || '未记录更新时间' }}</span>
          </div>
          <button type="button" aria-label="关闭详情" @click="closeDetail">×</button>
        </header>

        <p v-if="detailError" class="selling-template-error">{{ detailError }}</p>
        <p v-if="detailLoading" class="selling-template-loading">正在读取模板详情...</p>

        <div v-if="selectedDetailRow" class="selling-template-detail-body">
          <div class="selling-template-detail-preview">
            <span>{{ selectedDetailRow.name.slice(0, 1) }}</span>
            <strong>{{ selectedDetailRow.name }}</strong>
            <small>{{ selectedDetailRow.copyTemplate }} / {{ selectedDetailRow.storyboardTemplate }}</small>
          </div>

          <dl class="selling-template-detail-list">
            <div>
              <dt>Prompt 示例</dt>
              <dd>{{ selectedDetailRow.prompt }}</dd>
            </div>
            <div>
              <dt>关联文案模板</dt>
              <dd>{{ selectedDetailRow.copyTemplate }}</dd>
            </div>
            <div>
              <dt>关联分镜模板</dt>
              <dd>{{ selectedDetailRow.storyboardTemplate }}</dd>
            </div>
            <div>
              <dt>标签</dt>
              <dd>
                <span v-for="tag in selectedDetailRow.tags" :key="tag" class="selling-template-detail-tag">{{ tag }}</span>
              </dd>
            </div>
            <div>
              <dt>版本 / 可见性</dt>
              <dd>v{{ selectedDetailRow.versionNo || 1 }} · {{ selectedDetailRow.visibility || '内置样例' }}</dd>
            </div>
            <div>
              <dt>封面资产</dt>
              <dd>{{ selectedDetailRow.coverAssetId ? `资产 ID ${selectedDetailRow.coverAssetId}` : '未配置' }}</dd>
            </div>
          </dl>

          <section class="selling-template-detail-section">
            <h4>关联素材</h4>
            <div v-if="selectedDetailAssets.length" class="selling-template-asset-list">
              <span v-for="asset in selectedDetailAssets" :key="`${asset.assetId}-${asset.role}`">
                {{ asset.role || 'asset' }} #{{ asset.assetId }}
              </span>
            </div>
            <p v-else>暂无关联素材。</p>
          </section>

          <section class="selling-template-detail-section">
            <h4>扩展字段</h4>
            <div v-if="detailMetadataEntries.length" class="selling-template-meta-list">
              <div v-for="item in detailMetadataEntries" :key="item.key">
                <span>{{ item.key }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
            <p v-else>暂无扩展字段。</p>
          </section>
        </div>

        <footer class="selling-template-detail-actions">
          <button type="button" class="selling-template-button" @click="closeDetail">关闭</button>
          <button
            type="button"
            class="selling-template-primary"
            :disabled="!selectedDetailRow"
            @click="selectedDetailRow && openCopyForm(selectedDetailRow)"
          >
            复制并编辑
          </button>
        </footer>
      </section>
    </div>

    <div v-if="formOpen" class="selling-template-detail-mask" @click.self="closeForm">
      <section class="selling-template-form" role="dialog" aria-modal="true" aria-label="模板表单">
        <header class="selling-template-detail-head">
          <div>
            <p>{{ formMode === 'create' ? '新增模板' : '复制为新模板' }}</p>
            <h3>{{ formMode === 'create' ? '新增卖点模板' : '复制并编辑草稿' }}</h3>
            <span>保存后会创建一个新的私有草稿模板；当前后端未提供直接更新原模板接口。</span>
          </div>
          <button type="button" aria-label="关闭表单" @click="closeForm">×</button>
        </header>

        <p v-if="formError" class="selling-template-error">{{ formError }}</p>

        <div class="selling-template-form-grid">
          <label>
            <span>模板名称</span>
            <input v-model.trim="form.title" maxlength="80" placeholder="例如：家用空间" />
          </label>
          <label>
            <span>标签</span>
            <input v-model.trim="form.tags" maxlength="120" placeholder="例如：SUV,空间,家庭" />
          </label>
          <label>
            <span>关联文案模板</span>
            <input v-model.trim="form.copyTemplate" maxlength="80" placeholder="例如：文案模板-家用空间" />
          </label>
          <label>
            <span>关联分镜模板</span>
            <input v-model.trim="form.storyboardTemplate" maxlength="80" placeholder="例如：分镜模板-空间展示" />
          </label>
          <label>
            <span>封面资产 ID</span>
            <input v-model.trim="form.coverAssetId" inputmode="numeric" placeholder="可选，例如：123" />
          </label>
          <label>
            <span>适用场景</span>
            <input v-model.trim="form.scene" maxlength="80" placeholder="例如：家庭用户 / 门店促销" />
          </label>
          <label class="is-wide">
            <span>Prompt 示例</span>
            <textarea v-model.trim="form.prompt" rows="4" maxlength="400" placeholder="填写 AI 自动匹配时使用的卖点提示词。"></textarea>
          </label>
          <label class="is-wide">
            <span>关联素材</span>
            <textarea
              v-model.trim="form.assetsText"
              rows="3"
              placeholder="可选，每行一个：assetId:role，例如 1001:cover"
            ></textarea>
          </label>
        </div>

        <footer class="selling-template-detail-actions">
          <button type="button" class="selling-template-button" @click="closeForm">取消</button>
          <button type="button" class="selling-template-primary" :disabled="formSaving" @click="submitForm">
            {{ formSaving ? '保存中...' : '保存为草稿' }}
          </button>
        </footer>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createTemplate, getTemplateDetail, getTemplates, publishTemplate } from '../../services/templateApi'
import type { TemplateItem } from '../../types/templateTypes'
import { formatFriendlyDateTime } from '../../utils/timeFormat'

interface SellingPointTemplateRow {
  id: string
  templateId?: number | null
  name: string
  tags: string[]
  prompt: string
  copyTemplate: string
  storyboardTemplate: string
  published: boolean
  updatedAt: string
  visibility?: string
  versionNo?: number
  coverAssetId?: number | null
  metadataJson?: string | null
  assets?: TemplateItem['assets']
}

interface SellingTemplateFormState {
  title: string
  tags: string
  prompt: string
  copyTemplate: string
  storyboardTemplate: string
  coverAssetId: string
  scene: string
  assetsText: string
}

const fallbackRows: SellingPointTemplateRow[] = [
  {
    id: 'builtin-family-space',
    name: '家用空间',
    tags: ['SUV', '空间', '家庭'],
    prompt: '突出后排空间、后备箱容量和家庭出行舒适性。',
    copyTemplate: '文案模板-家用空间',
    storyboardTemplate: '分镜模板-空间展示',
    published: true,
    updatedAt: '内置模板',
  },
  {
    id: 'builtin-smart-cabin',
    name: '智能座舱',
    tags: ['科技', '智能', '年轻用户'],
    prompt: '强调大屏、语音交互、辅助驾驶和座舱科技感。',
    copyTemplate: '文案模板-智能座舱',
    storyboardTemplate: '分镜模板-科技座舱',
    published: true,
    updatedAt: '内置模板',
  },
  {
    id: 'builtin-exterior',
    name: '外观颜值',
    tags: ['外观', '设计', '灯组'],
    prompt: '突出车身线条、灯组细节、运动姿态和到店实拍质感。',
    copyTemplate: '文案模板-外观颜值',
    storyboardTemplate: '分镜模板-外观展示',
    published: true,
    updatedAt: '内置模板',
  },
  {
    id: 'builtin-performance',
    name: '动力性能',
    tags: ['性能', '操控', '试驾'],
    prompt: '强调动力响应、操控稳定、试驾体验和驾驶乐趣。',
    copyTemplate: '文案模板-动力性能',
    storyboardTemplate: '分镜模板-试驾路线',
    published: false,
    updatedAt: '内置模板',
  },
  {
    id: 'builtin-store-promo',
    name: '到店促销',
    tags: ['促销', '权益', '转化'],
    prompt: '突出限时到店权益、预约试驾、置换补贴和成交引导。',
    copyTemplate: '文案模板-促销活动',
    storyboardTemplate: '分镜模板-门店促销',
    published: true,
    updatedAt: '内置模板',
  },
]

const templates = ref<TemplateItem[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const activeTag = ref('全部')
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const selectedDetailRow = ref<SellingPointTemplateRow | null>(null)
const selectedDetailTemplate = ref<TemplateItem | null>(null)
const actionBusyId = ref('')
const formOpen = ref(false)
const formMode = ref<'create' | 'copy'>('create')
const formSaving = ref(false)
const formError = ref('')
const form = ref<SellingTemplateFormState>(emptyForm())

const rows = computed(() => {
  const mapped = templates.value.map(templateToRow)
  return mapped.length ? mapped : fallbackRows
})

const filteredRows = computed(() => {
  const key = keyword.value.toLowerCase()
  return rows.value.filter((row) => {
    const tagMatched = activeTag.value === '全部' || row.tags.includes(activeTag.value)
    const text = [row.name, row.tags.join(' '), row.prompt, row.copyTemplate, row.storyboardTemplate].join(' ').toLowerCase()
    return tagMatched && (!key || text.includes(key))
  })
})

const tagOptions = computed(() => ['全部', ...Array.from(new Set(rows.value.flatMap((row) => row.tags))).slice(0, 18)])
const publishedCount = computed(() => filteredRows.value.filter((row) => row.published).length)
const selectedDetailAssets = computed(() => selectedDetailRow.value?.assets || selectedDetailTemplate.value?.assets || [])
const detailMetadataEntries = computed(() => {
  const metadata = parseMetadata(selectedDetailRow.value?.metadataJson || selectedDetailTemplate.value?.metadataJson || null)
  return Object.entries(metadata)
    .map(([key, value]) => ({
      key,
      value: Array.isArray(value) ? value.join('、') : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
    }))
    .filter((item) => item.value && item.value !== 'undefined')
    .slice(0, 10)
})

onMounted(() => {
  void loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  error.value = ''
  try {
    templates.value = await getTemplates({ scope: 'all', sort: 'publishedAtDesc' })
  } catch (loadError) {
    templates.value = []
    error.value = loadError instanceof Error ? loadError.message : '模板列表加载失败，当前展示内置样例。'
  } finally {
    loading.value = false
  }
}

function templateToRow(template: TemplateItem): SellingPointTemplateRow {
  const metadata = parseMetadata(template.metadataJson)
  const tags = splitTags(template.tags || stringMetadata(metadata, 'tags') || '')
  return {
    id: `template-${template.templateId}`,
    templateId: template.templateId,
    name: template.title || `模板 ${template.templateId}`,
    tags: tags.length ? tags : ['模板'],
    prompt: stringMetadata(metadata, 'prompt') || template.description || '暂无 Prompt 示例',
    copyTemplate: stringMetadata(metadata, 'copyTemplate') || stringMetadata(metadata, 'copywritingTemplate') || '未关联',
    storyboardTemplate: stringMetadata(metadata, 'storyboardTemplate') || '未关联',
    published: ['PUBLISHED', 'ENABLED', 'ACTIVE'].includes(String(template.status || '').toUpperCase()) || template.visibility === 'PUBLIC',
    updatedAt: template.updatedAt ? formatFriendlyDateTime(template.updatedAt) : '未记录',
    visibility: template.visibility || 'PRIVATE',
    versionNo: template.versionNo,
    coverAssetId: template.coverAssetId,
    metadataJson: template.metadataJson,
    assets: template.assets || [],
  }
}

async function openDetail(row: SellingPointTemplateRow) {
  selectedDetailRow.value = row
  selectedDetailTemplate.value = null
  detailError.value = ''
  detailOpen.value = true
  if (!row.templateId) {
    return
  }
  detailLoading.value = true
  try {
    const detail = await getTemplateDetail(row.templateId)
    selectedDetailTemplate.value = detail
    selectedDetailRow.value = templateToRow(detail)
  } catch (loadError) {
    detailError.value = loadError instanceof Error ? loadError.message : '模板详情读取失败，当前展示列表字段。'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detailError.value = ''
}

function emptyForm(): SellingTemplateFormState {
  return {
    title: '',
    tags: '',
    prompt: '',
    copyTemplate: '',
    storyboardTemplate: '',
    coverAssetId: '',
    scene: '',
    assetsText: '',
  }
}

function openCreateForm() {
  formMode.value = 'create'
  form.value = emptyForm()
  formError.value = ''
  formOpen.value = true
}

function openCopyForm(row: SellingPointTemplateRow) {
  const metadata = parseMetadata(row.metadataJson || null)
  formMode.value = 'copy'
  form.value = {
    title: `${row.name} 副本`,
    tags: row.tags.join(','),
    prompt: row.prompt === '暂无 Prompt 示例' ? '' : row.prompt,
    copyTemplate: row.copyTemplate === '未关联' ? '' : row.copyTemplate,
    storyboardTemplate: row.storyboardTemplate === '未关联' ? '' : row.storyboardTemplate,
    coverAssetId: row.coverAssetId ? String(row.coverAssetId) : '',
    scene: stringMetadata(metadata, 'scene') || stringMetadata(metadata, 'scenario') || '',
    assetsText: (row.assets || []).map((asset) => `${asset.assetId}:${asset.role || 'asset'}`).join('\n'),
  }
  formError.value = ''
  detailOpen.value = false
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  formError.value = ''
}

async function submitForm() {
  const payload = buildCreatePayload()
  if (!payload) return
  formSaving.value = true
  try {
    await createTemplate(payload)
    ElMessage.success('已保存草稿模板')
    closeForm()
    await loadTemplates()
  } catch (createError) {
    const message = createError instanceof Error ? createError.message : '保存模板失败'
    formError.value = message
    ElMessage.error(message)
  } finally {
    formSaving.value = false
  }
}

function buildCreatePayload() {
  const title = form.value.title.trim()
  const prompt = form.value.prompt.trim()
  if (!title) {
    formError.value = '请填写模板名称。'
    return null
  }
  if (!prompt) {
    formError.value = '请填写 Prompt 示例。'
    return null
  }
  const coverAssetId = form.value.coverAssetId.trim() ? Number(form.value.coverAssetId.trim()) : undefined
  if (coverAssetId !== undefined && (!Number.isFinite(coverAssetId) || coverAssetId <= 0)) {
    formError.value = '封面资产 ID 必须是正整数。'
    return null
  }
  const assets = parseAssetsText(form.value.assetsText)
  if (!assets) {
    return null
  }
  const metadata = {
    prompt,
    copyTemplate: form.value.copyTemplate.trim(),
    storyboardTemplate: form.value.storyboardTemplate.trim(),
    scene: form.value.scene.trim(),
    templateRole: 'selling_point',
  }
  formError.value = ''
  return {
    title,
    description: prompt,
    tags: form.value.tags.trim(),
    coverAssetId,
    metadataJson: JSON.stringify(metadata),
    assets,
  }
}

function parseAssetsText(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const assets: Array<{ assetId: number; role?: string }> = []
  for (const line of lines) {
    const [idText, roleText] = line.split(':')
    const assetId = Number(idText)
    if (!Number.isFinite(assetId) || assetId <= 0) {
      formError.value = `关联素材格式错误：${line}`
      return null
    }
    assets.push({ assetId, role: roleText?.trim() || 'asset' })
  }
  return assets
}

async function handlePublish(row: SellingPointTemplateRow) {
  if (!row.templateId) {
    ElMessage.info('内置样例暂不支持发布。')
    return
  }
  actionBusyId.value = `publish-${row.id}`
  try {
    await publishTemplate(row.templateId)
    ElMessage.success('已发布模板')
    await loadTemplates()
  } catch (publishError) {
    ElMessage.error(publishError instanceof Error ? publishError.message : '发布模板失败')
  } finally {
    actionBusyId.value = ''
  }
}

function parseMetadata(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function stringMetadata(metadata: Record<string, unknown>, key: string) {
  const raw = metadata[key]
  if (Array.isArray(raw)) {
    return raw.filter((item) => typeof item === 'string').join('、')
  }
  return typeof raw === 'string' ? raw : ''
}

function splitTags(value: string) {
  return value
    .split(/[、,，/|;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5)
}
</script>

<style scoped>
.selling-template-page {
  display: grid;
  gap: 18px;
}

.selling-template-head,
.selling-template-card,
.selling-template-stats article {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(16, 24, 40, 0.05);
}

.selling-template-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px;
}

.selling-template-head p,
.selling-template-head h2,
.selling-template-head span {
  margin: 0;
}

.selling-template-head p {
  color: #155eef;
  font-size: 12px;
  font-weight: 900;
}

.selling-template-head h2 {
  margin-top: 4px;
  color: #101828;
  font-size: 24px;
  font-weight: 900;
}

.selling-template-head span {
  display: block;
  margin-top: 8px;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.selling-template-actions,
.selling-template-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selling-template-button,
.selling-template-primary,
.selling-template-row-actions button {
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 6px;
  background: #fff;
  color: #344054;
  cursor: pointer;
  font-size: 13px;
  font-weight: 850;
  padding: 0 14px;
}

.selling-template-button:disabled,
.selling-template-row-actions button:disabled,
.selling-template-primary:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.selling-template-primary {
  border-color: #155eef;
  background: #155eef;
  color: #fff;
}

.selling-template-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.selling-template-stats article {
  display: grid;
  gap: 6px;
  padding: 16px;
}

.selling-template-stats span {
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.selling-template-stats strong {
  color: #101828;
  font-size: 26px;
  font-weight: 900;
}

.selling-template-card {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.selling-template-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px;
  gap: 10px;
}

.selling-template-toolbar input,
.selling-template-toolbar select {
  min-height: 40px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  padding: 0 12px;
  outline: none;
}

.selling-template-error {
  margin: 0;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.selling-template-table-wrap {
  overflow-x: auto;
}

.selling-template-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.selling-template-table th,
.selling-template-table td {
  border-bottom: 1px solid #edf0f6;
  color: #344054;
  padding: 11px 12px;
  text-align: left;
  vertical-align: top;
}

.selling-template-table th {
  color: #667085;
  font-size: 12px;
  font-weight: 900;
}

.selling-template-table td {
  font-size: 13px;
  line-height: 1.55;
}

.selling-template-table td strong,
.selling-template-table td small {
  display: block;
}

.selling-template-table td strong {
  color: #101828;
  font-weight: 900;
}

.selling-template-table td small {
  margin-top: 5px;
  color: #98a2b3;
  font-size: 12px;
}

.selling-template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selling-template-tags span,
.selling-template-status {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 850;
}

.selling-template-tags span {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #155eef;
}

.selling-template-status {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #667085;
}

.selling-template-status.is-published {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.selling-template-detail-mask {
  position: fixed;
  z-index: 90;
  inset: 0;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 28px;
  background: rgba(15, 23, 42, 0.42);
}

.selling-template-detail {
  display: grid;
  width: min(860px, 100%);
  max-height: calc(100dvh - 56px);
  overflow: auto;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 52px rgba(15, 23, 42, 0.18);
  padding: 20px;
  gap: 16px;
}

.selling-template-form {
  display: grid;
  width: min(780px, 100%);
  max-height: calc(100dvh - 56px);
  overflow: auto;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 52px rgba(15, 23, 42, 0.18);
  padding: 20px;
  gap: 16px;
}

.selling-template-detail-head,
.selling-template-detail-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.selling-template-detail-head {
  border-bottom: 1px solid #edf0f6;
  padding-bottom: 14px;
}

.selling-template-detail-head p,
.selling-template-detail-head h3,
.selling-template-detail-head span {
  margin: 0;
}

.selling-template-detail-head p {
  color: #155eef;
  font-size: 12px;
  font-weight: 900;
}

.selling-template-detail-head h3 {
  margin-top: 4px;
  color: #101828;
  font-size: 22px;
  font-weight: 900;
}

.selling-template-detail-head span {
  display: block;
  margin-top: 6px;
  color: #667085;
  font-size: 13px;
}

.selling-template-detail-head button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dfe7f5;
  border-radius: 6px;
  background: #fff;
  color: #667085;
  cursor: pointer;
  font-size: 20px;
}

.selling-template-loading {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.selling-template-detail-body {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.selling-template-detail-preview {
  display: grid;
  min-height: 260px;
  align-content: end;
  gap: 8px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(16, 24, 40, 0.04), rgba(16, 24, 40, 0.72)),
    linear-gradient(135deg, #dbeafe, #94a3b8 52%, #1f2937);
  color: #fff;
  padding: 18px;
}

.selling-template-detail-preview span {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 20px;
  font-weight: 900;
}

.selling-template-detail-preview strong,
.selling-template-detail-preview small {
  display: block;
}

.selling-template-detail-preview strong {
  font-size: 20px;
  font-weight: 900;
}

.selling-template-detail-preview small {
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
}

.selling-template-detail-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.selling-template-detail-list div,
.selling-template-detail-section {
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
}

.selling-template-detail-list dt,
.selling-template-detail-list dd {
  margin: 0;
}

.selling-template-detail-list dt,
.selling-template-detail-section h4 {
  color: #667085;
  font-size: 12px;
  font-weight: 900;
}

.selling-template-detail-list dd {
  margin-top: 6px;
  color: #172033;
  font-size: 13px;
  line-height: 1.65;
}

.selling-template-detail-tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  margin: 0 6px 6px 0;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #155eef;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 850;
}

.selling-template-detail-section {
  grid-column: 1 / -1;
}

.selling-template-detail-section h4,
.selling-template-detail-section p {
  margin: 0;
}

.selling-template-detail-section p {
  margin-top: 8px;
  color: #667085;
  font-size: 13px;
}

.selling-template-asset-list,
.selling-template-meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.selling-template-asset-list span,
.selling-template-meta-list div {
  border: 1px solid #dfe7f5;
  border-radius: 6px;
  background: #fff;
  color: #344054;
  padding: 8px 10px;
  font-size: 12px;
}

.selling-template-meta-list div {
  display: grid;
  gap: 4px;
}

.selling-template-meta-list span {
  color: #667085;
  font-weight: 900;
}

.selling-template-meta-list strong {
  color: #172033;
  font-weight: 700;
}

.selling-template-detail-actions {
  justify-content: flex-end;
  border-top: 1px solid #edf0f6;
  padding-top: 14px;
}

.selling-template-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.selling-template-form-grid label {
  display: grid;
  gap: 7px;
}

.selling-template-form-grid label.is-wide {
  grid-column: 1 / -1;
}

.selling-template-form-grid span {
  color: #667085;
  font-size: 12px;
  font-weight: 900;
}

.selling-template-form-grid input,
.selling-template-form-grid textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dfe7f5;
  border-radius: 6px;
  background: #fff;
  color: #172033;
  font-size: 13px;
  outline: none;
}

.selling-template-form-grid input {
  min-height: 38px;
  padding: 0 11px;
}

.selling-template-form-grid textarea {
  resize: vertical;
  padding: 10px 11px;
  line-height: 1.6;
}

.selling-template-form-grid input:focus,
.selling-template-form-grid textarea:focus {
  border-color: #155eef;
  box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.1);
}

@media (max-width: 760px) {
  .selling-template-head,
  .selling-template-toolbar {
    grid-template-columns: 1fr;
  }

  .selling-template-head {
    display: grid;
  }

  .selling-template-stats {
    grid-template-columns: 1fr;
  }

  .selling-template-detail-mask {
    padding: 14px;
  }

  .selling-template-detail,
  .selling-template-form {
    max-height: calc(100dvh - 28px);
    padding: 16px;
  }

  .selling-template-detail-body,
  .selling-template-detail-list,
  .selling-template-form-grid {
    grid-template-columns: 1fr;
  }

  .selling-template-detail-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
