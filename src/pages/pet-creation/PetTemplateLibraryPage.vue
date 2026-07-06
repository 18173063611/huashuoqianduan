<template>
  <section class="pet-library-page">
    <header class="pet-library-head">
      <span>宠物创作中心</span>
      <h2>选择萌宠视频模板</h2>
      <p>选择一个玩法模板，快速生成适合短视频平台传播的宠物内容。</p>
    </header>

    <div class="pet-library-shell">
      <main class="pet-library-main">
        <div class="pet-filter-row">
          <button
            v-for="filter in petTemplateFilters"
            :key="filter"
            type="button"
            :class="{ active: filter === selectedFilter }"
            @click="selectedFilter = filter"
          >
            {{ filter }}
          </button>
        </div>

        <div v-if="filteredTemplates.length === 0" class="pet-library-empty">
          <strong>暂无符合条件的萌宠模板</strong>
          <p>可以切换分类，或先回到首页使用自定义创意创建。</p>
          <RouterLink to="/pet-render">返回宠物首页</RouterLink>
        </div>
        <div v-else class="pet-library-grid">
          <PetTemplateCard
            v-for="(template, index) in filteredTemplates"
            :key="template.id"
            :template="template"
            :index="index"
            @use-template="handleUseTemplate"
          />
        </div>
      </main>

      <aside class="pet-playbook">
        <h3>玩法说明</h3>
        <ol>
          <li v-for="step in templateGuideSteps" :key="step.title">
            <i>{{ step.index }}</i>
            <div>
              <strong>{{ step.title }}</strong>
              <span>{{ step.text }}</span>
            </div>
          </li>
        </ol>
        <div class="pet-playbook-tip">
          <strong>小贴士</strong>
          <p>建议根据账号调性和受众偏好挑选模板，再进入素材与角色设定补齐宠物参考图。</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PetTemplateCard from './components/PetTemplateCard.vue'
import { petTemplateFilters, petTemplates } from './petTemplateConfig'
import { usePetCreationState } from './usePetCreationState'
import type { PetTemplate } from './petCreationTypes'

const router = useRouter()
const { applyTemplate, loadDraft, saveDraft } = usePetCreationState()
const selectedFilter = ref('热门玩法')
const templateGuideSteps = [
  { index: '01', title: '上传宠物图', text: '上传宠物照片或视频，支持多图参考。' },
  { index: '02', title: '填写台词', text: '输入或 AI 生成台词，设置宠物对话内容。' },
  { index: '03', title: '选择配音', text: '选择适合的音色，让宠物开口说话。' },
  { index: '04', title: '生成视频', text: '一键生成高清视频，支持多平台比例复用。' },
]
const filteredTemplates = computed(() => {
  if (selectedFilter.value === '热门玩法') return petTemplates
  return petTemplates.filter(
    (template) => template.category === selectedFilter.value || template.tags.includes(selectedFilter.value),
  )
})

async function handleUseTemplate(template: PetTemplate) {
  await loadDraft()
  applyTemplate(template)
  await saveDraft()
  ElMessage.success(`已应用「${template.title}」模板`)
  void router.push({ name: 'pet-render', query: { templateId: template.id } })
}
</script>

<style scoped>
.pet-library-page {
  display: grid;
  gap: 16px;
}

.pet-library-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 288px;
  gap: 16px;
}

.pet-library-main,
.pet-playbook {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-library-main {
  display: grid;
  gap: 16px;
}

.pet-library-head,
.pet-library-empty {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-library-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-library-head h2 {
  margin: 6px 0;
  color: #172033;
  font-size: 20px;
  font-weight: 900;
}

.pet-library-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-filter-row button {
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 999px;
  background: #ffffff;
  color: #1f2a44;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 800;
}

.pet-filter-row button.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.pet-library-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pet-library-empty {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 28px 20px;
}

.pet-library-empty strong {
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.pet-library-empty p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-library-empty a {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}

.pet-playbook {
  align-content: start;
}

.pet-playbook h3 {
  margin: 0 0 18px;
  color: #172033;
  font-size: 18px;
  font-weight: 900;
}

.pet-playbook ol {
  display: grid;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pet-playbook li {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: start;
}

.pet-playbook i {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-style: normal;
  font-weight: 900;
}

.pet-playbook strong {
  display: block;
  color: #172033;
  font-size: 14px;
  font-weight: 900;
}

.pet-playbook span,
.pet-playbook-tip p {
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.pet-playbook-tip {
  margin-top: 18px;
  border-radius: 8px;
  background: #f3f7ff;
  padding: 14px;
}

.pet-playbook-tip p {
  margin: 6px 0 0;
}

@media (max-width: 1200px) {
  .pet-library-shell {
    grid-template-columns: 1fr;
  }

  .pet-library-grid {
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  }
}
</style>
