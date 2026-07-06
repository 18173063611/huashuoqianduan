<template>
  <section class="pet-role-page">
    <header class="pet-page-head">
      <span>宠物创作中心</span>
      <h2>素材上传与宠物角色设定</h2>
      <p>上传主宠物和参考素材，设置角色一致性、宠物信息和拟人化程度。</p>
    </header>

    <PetMaterialPicker v-model="draft.materials" />

    <div class="pet-role-layout">
      <section v-for="(role, index) in draft.roles" :key="role.id" class="pet-panel">
        <div class="pet-role-panel-head">
          <h3>{{ index === 0 ? '主宠物信息' : '第二只宠物信息' }}</h3>
          <button v-if="index > 0" type="button" @click="removeSecondRole">移除</button>
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

    <button v-if="draft.roles.length < 2" class="pet-secondary-role-button" type="button" @click="addSecondRole">
      添加第二只宠物
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

    <div class="pet-actions">
      <button type="button" :disabled="saving" @click="saveAndGo('pet-dialogue-create')">
        {{ saving ? '保存中...' : '进入对话创建' }}
      </button>
      <button type="button" :disabled="saving" @click="saveAndGo('pet-storyboard')">
        {{ saving ? '保存中...' : '进入脚本分镜' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePetCreationState } from './usePetCreationState'
import PetMaterialPicker from './components/PetMaterialPicker.vue'
import type { PetRole } from './petCreationTypes'
import type { WorkbenchRouteName } from '../../router'
import { hasMainPetMaterial, mainPetMaterialWarning, petErrorMessage } from './petCreationValidation'

const router = useRouter()
const { draft, loadDraft, saveDraft } = usePetCreationState()
const saving = ref(false)

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

function addSecondRole() {
  const secondRole: PetRole = {
    id: `second-pet-${Date.now()}`,
    name: '布丁',
    type: 'dog',
    breed: '柯基',
    ageFeel: '青年',
    personalityTags: ['机智', '吐槽'],
    speakingTone: '机智但很认真',
    roleTags: ['搭档'],
    anthropomorphic: true,
    referenceAssetIds: [],
  }
  draft.roles.push(secondRole)
}

function removeSecondRole() {
  draft.roles.splice(1, 1)
}

async function saveAndGo(routeName: WorkbenchRouteName) {
  if (saving.value) return
  if (!hasMainPetMaterial(draft)) {
    ElMessage.warning(mainPetMaterialWarning())
  }
  saving.value = true
  try {
    await saveDraft()
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
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物草稿恢复失败，请返回首页重试。'))
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

.pet-switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.pet-role-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-role-panel-head button,
.pet-secondary-role-button {
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

</style>
