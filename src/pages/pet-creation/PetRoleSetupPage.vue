<template>
  <section class="pet-role-page">
    <header class="pet-page-head">
      <span>宠物创作中心</span>
      <h2>素材上传与宠物角色设定</h2>
      <p>上传主宠物和参考素材，设置角色一致性、宠物信息和拟人化程度。</p>
    </header>

    <section v-if="returnToPath" class="pet-return-banner">
      <div>
        <strong>已从多宠物对话页进入素材与角色设定</strong>
        <span>选择主宠、添加更多宠物角色后，可以直接保存并回到对话生产页继续写台词。</span>
      </div>
      <button type="button" :disabled="saving" @click="saveAndReturnToSource">
        {{ saving ? '保存中...' : '保存并返回多宠物对话页' }}
      </button>
    </section>

    <div class="pet-role-workbench">
      <div class="pet-role-main">
        <PetMaterialPicker v-model="draft.materials" @change="handleMaterialChange" />
        <p v-if="materialSaving" class="pet-material-saving">正在保存宠物素材...</p>

        <PetPostProductionPanel
          id="pet-background-scene"
          :draft="draft"
          show-sync-button
          @change="saveDraft"
        />
      </div>

      <aside class="pet-role-side">
        <section id="pet-role-manager" class="pet-panel pet-role-manager">
          <div>
            <h3>多宠物角色管理</h3>
            <p>当前已配置 {{ draft.roles.length }} / {{ MAX_PET_ROLES }} 个角色，新增角色后可在多宠物对话页为它分配台词。</p>
          </div>
          <div class="pet-role-manager-actions">
            <button type="button" :disabled="draft.roles.length >= MAX_PET_ROLES" @click="addPetRole">
              新增宠物角色
            </button>
            <button v-if="returnToPath" type="button" :disabled="saving" @click="saveAndReturnToSource">
              保存并返回
            </button>
          </div>
        </section>

        <div class="pet-role-layout">
          <section v-for="(role, index) in draft.roles" :key="role.id" class="pet-panel">
            <div class="pet-role-panel-head">
              <h3>{{ roleTitle(index) }}</h3>
              <button v-if="index > 0" type="button" @click="removeRole(index)">移除</button>
            </div>
            <label>
              宠物名称
              <input v-model="role.name" />
            </label>
            <label>
              宠物类型
              <select v-model="role.type">
                <option value="cat">小猫</option>
                <option value="dog">小狗</option>
                <option value="other">其他宠物</option>
              </select>
            </label>
            <label>
              品种
              <input v-model="role.breed" />
            </label>
            <label>
              年龄感
              <input v-model="role.ageFeel" />
            </label>
            <label>
              性格标签
              <input :value="role.personalityTags.join(' / ')" @input="updateTags(role.id, 'personalityTags', $event)" />
            </label>
            <label>
              说话口吻
              <input v-model="role.speakingTone" />
            </label>
            <label>
              角色标签
              <input :value="role.roleTags.join(' / ')" @input="updateTags(role.id, 'roleTags', $event)" />
            </label>
            <label class="pet-role-check">
              <input v-model="role.anthropomorphic" type="checkbox" />
              <span>允许该角色拟人化表达</span>
            </label>
          </section>
        </div>

        <button v-if="draft.roles.length < MAX_PET_ROLES" class="pet-secondary-role-button" type="button" @click="addPetRole">
          添加宠物角色
        </button>

        <section class="pet-panel">
          <h3>角色一致性设置</h3>
          <div class="pet-switch-grid">
            <label>
              <input v-model="draft.consistency.keepAppearance" type="checkbox" />
              <span>保持宠物外观一致</span>
            </label>
            <label>
              <input v-model="draft.consistency.keepFurPattern" type="checkbox" />
              <span>保持毛色和花纹一致</span>
            </label>
            <label>
              <input v-model="draft.consistency.keepScene" type="checkbox" />
              <span>保留背景场景</span>
            </label>
            <label>
              <input v-model="draft.consistency.allowAnthropomorphic" type="checkbox" />
              <span>允许轻微拟人化</span>
            </label>
            <label>
              <input v-model="draft.consistency.multiShotPriority" type="checkbox" />
              <span>多镜头一致性优先</span>
            </label>
          </div>
        </section>
      </aside>
    </div>

    <div class="pet-actions">
      <button type="button" :disabled="saving" @click="saveAndGo('pet-dialogue-create')">
        {{ saving ? '保存中...' : primaryActionLabel }}
      </button>
      <button type="button" :disabled="saving" @click="saveAndGo('pet-storyboard')">
        {{ saving ? '保存中...' : '进入脚本分镜' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePetCreationState } from './usePetCreationState'
import PetMaterialPicker from './components/PetMaterialPicker.vue'
import PetPostProductionPanel from './components/PetPostProductionPanel.vue'
import type { PetReferenceMaterial, PetRole } from './petCreationTypes'
import type { WorkbenchRouteName } from '../../router'
import { hasMainPetMaterial, mainPetMaterialWarning, petErrorMessage } from './petCreationValidation'
import { findPetTemplate } from './petTemplateConfig'
import { syncPetRoleReferenceAssets } from './petAssetAutoMatch'

const route = useRoute()
const router = useRouter()
const { draft, applyTemplate, loadDraft, saveDraft } = usePetCreationState()
const saving = ref(false)
const materialSaving = ref(false)
const MAX_PET_ROLES = 6
const PET_ROLE_NAME_SEEDS = ['布丁', '豆包', '可乐', '团子', '小七']

const MATERIAL_ROLE_LABELS: Record<PetReferenceMaterial['role'], string> = {
  main_pet: '主宠物参考',
  second_pet: '第二/更多宠物参考',
  prop: '产品/道具参考',
  scene: '背景/场景参考',
  audio: '口播/BGM 音频',
}

const returnToPath = computed(() => {
  const value = Array.isArray(route.query.returnTo) ? route.query.returnTo[0] : route.query.returnTo
  if (!value) return ''
  if (value === '/pet-render' || value.startsWith('/pet-render/')) return value
  return ''
})

const primaryActionLabel = computed(() => (returnToPath.value ? '保存并返回对话创建' : '进入对话创建'))

function roleTitle(index: number) {
  if (index === 0) return '主宠物信息'
  if (index === 1) return '第二只宠物信息'
  return `第 ${index + 1} 只宠物信息`
}

function parseTags(value: string) {
  return value
    .split(/[\/,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function updateTags(roleId: string, field: 'personalityTags' | 'roleTags', event: Event) {
  const role = draft.roles.find((item) => item.id === roleId)
  if (!role) return
  role[field] = parseTags((event.target as HTMLInputElement).value)
}

function addPetRole() {
  if (draft.roles.length >= MAX_PET_ROLES) {
    ElMessage.warning(`最多支持 ${MAX_PET_ROLES} 个宠物角色。`)
    return
  }
  const roleIndex = draft.roles.length
  const roleName = PET_ROLE_NAME_SEEDS[roleIndex - 1] || `宠物${roleIndex + 1}`
  const petRole: PetRole = {
    id: `pet-role-${Date.now()}-${roleIndex}`,
    name: roleName,
    type: roleIndex % 2 === 1 ? 'dog' : 'cat',
    breed: roleIndex % 2 === 1 ? '柯基' : '英短',
    ageFeel: '青年',
    personalityTags: roleIndex % 2 === 1 ? ['机智', '吐槽'] : ['好奇', '撒娇'],
    speakingTone: roleIndex % 2 === 1 ? '机智但很认真' : '软萌但理直气壮',
    roleTags: roleIndex === 1 ? ['搭档'] : ['配角', '对话角色'],
    anthropomorphic: true,
    referenceAssetIds: [],
  }
  draft.roles.push(petRole)
  ElMessage.success(`已添加角色：${roleName}`)
}

function removeRole(index: number) {
  if (index <= 0 || index >= draft.roles.length) return
  const removedRole = draft.roles[index]
  draft.roles.splice(index, 1)
  const fallbackRoleId = draft.roles[Math.max(0, Math.min(index - 1, draft.roles.length - 1))]?.id || draft.roles[0]?.id
  if (fallbackRoleId) {
    draft.dialogueLines = draft.dialogueLines.map((line) =>
      line.speakerRoleId === removedRole.id ? { ...line, speakerRoleId: fallbackRoleId } : line,
    )
  }
  syncRoleReferenceAssets()
}

function syncRoleReferenceAssets(materials: PetReferenceMaterial[] = draft.materials) {
  draft.materials = materials
  syncPetRoleReferenceAssets(draft)
}

async function handleMaterialChange(materials: PetReferenceMaterial[], material: PetReferenceMaterial | null) {
  draft.materials = materials
  syncRoleReferenceAssets(materials)
  materialSaving.value = true
  try {
    await saveDraft()
    const label = material ? MATERIAL_ROLE_LABELS[material.role] : '宠物素材'
    ElMessage.success(material ? `已加入${label}` : '已更新宠物素材')
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存宠物素材失败，请稍后重试。'))
  } finally {
    materialSaving.value = false
  }
}

async function applyRouteTemplateIfNeeded() {
  const template = findPetTemplate(String(route.query.templateId || ''))
  if (!template || draft.templateId === template.id) return
  applyTemplate(template)
  await saveDraft()
}

async function saveAndReturnToSource() {
  await saveAndGo('pet-dialogue-create')
}

async function saveAndGo(routeName: WorkbenchRouteName) {
  if (saving.value) return
  if (!hasMainPetMaterial(draft)) {
    ElMessage.warning(mainPetMaterialWarning())
  }
  saving.value = true
  try {
    await saveDraft()
    if (returnToPath.value && routeName === 'pet-dialogue-create') {
      void router.push(returnToPath.value)
      return
    }
    void router.push({ name: routeName })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存宠物角色失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await loadDraft()
    syncRoleReferenceAssets()
    await applyRouteTemplateIfNeeded()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物草稿恢复失败，请返回首页重试。'))
  }
  if (route.query.focus === 'scene') {
    window.setTimeout(() => document.getElementById('pet-background-scene')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }
  if (route.query.focus === 'roles') {
    window.setTimeout(() => document.getElementById('pet-role-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }
})
</script>

<style scoped>
.pet-role-page,
.pet-panel {
  display: grid;
  gap: 16px;
}

.pet-page-head,
.pet-panel {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-page-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-page-head h2,
.pet-panel h3 {
  margin: 0;
  color: #172033;
  font-weight: 900;
}

.pet-page-head h2 {
  margin-top: 6px;
  font-size: 20px;
}

.pet-page-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-return-banner {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 14px 16px;
}

.pet-return-banner div {
  display: grid;
  gap: 4px;
}

.pet-return-banner strong {
  color: #1e3a8a;
  font-size: 15px;
  font-weight: 900;
}

.pet-return-banner span {
  color: #475467;
  font-size: 13px;
  line-height: 1.5;
}

.pet-return-banner button,
.pet-role-manager-actions button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}

.pet-return-banner button:disabled,
.pet-role-manager-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.pet-material-saving {
  margin: -8px 0 0;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.pet-role-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.pet-role-main,
.pet-role-side {
  display: grid;
  gap: 16px;
}

.pet-role-manager {
  gap: 12px;
}

.pet-role-manager p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.pet-role-manager-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.pet-role-manager-actions button:first-child {
  background: #ffffff;
  color: #2563eb;
}

.pet-switch-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.pet-panel input,
.pet-panel select {
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
}

.pet-role-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.pet-role-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-role-panel-head span {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.pet-role-panel-head button,
.pet-secondary-role-button,
.pet-background-presets button {
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}

.pet-panel label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-panel .pet-role-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 0 12px;
}

.pet-role-check input {
  min-height: auto;
}

.pet-panel input,
.pet-panel select {
  padding: 0 12px;
}

.pet-background-panel textarea {
  min-height: 92px;
  resize: vertical;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  padding: 12px;
  font-size: 13px;
  line-height: 1.65;
}

.pet-background-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-switch-grid label {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 0 12px;
}

.pet-switch-grid input {
  min-height: auto;
}

.pet-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.pet-actions button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 1120px) {
  .pet-role-workbench {
    grid-template-columns: 1fr;
  }

  .pet-return-banner {
    align-items: stretch;
    flex-direction: column;
  }

  .pet-switch-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
}

</style>
