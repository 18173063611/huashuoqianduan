<template>
  <section class="pet-library-page">
    <header class="pet-library-head">
      <span>宠物创作中心</span>
      <h2>选择宠物创作模板</h2>
      <p>模板已收敛为四个清晰入口；旧模板 ID 仍保留兼容，会自动进入合并后的生产页。</p>
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
        <h3>{{ playbookTitle }}</h3>
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
import { getPetTemplatesForFilter, petTemplateFilters, petTemplates } from './petTemplateConfig'
import { usePetCreationState } from './usePetCreationState'
import type { PetTemplate } from './petCreationTypes'
import { petTemplateGuideByWorkflow, petTemplateWorkflowFor, routeForPetTemplate } from './petTemplateWorkflow'

const router = useRouter()
const { applyTemplate, loadDraft, saveDraft } = usePetCreationState()
const selectedFilter = ref('全部')
const filteredTemplates = computed(() => getPetTemplatesForFilter(selectedFilter.value))
const genericGuideSteps = [
  { index: '01', title: '选择入口', text: '自由描述用 AI 智能创作；有参考视频用爆款对标；动图用表情包；互动对白用剧情对话。' },
  { index: '02', title: '自动分流', text: '首页一句话会复用现有模板路由，直接进入对应生产页。' },
  { index: '03', title: '补齐素材', text: '按玩法补主宠、第二宠物、人物、道具和场景；人物图会自动触发人宠模式。' },
  { index: '04', title: '确认生成', text: '生成前核对草稿、分镜、积分和真实接口预检。' },
]
const activeWorkflow = computed(() => selectedFilter.value === '全部' ? 'smart' : filteredTemplates.value[0]?.workflow || 'smart')
const playbookTitle = computed(() => {
  if (selectedFilter.value === '全部') return '玩法选择流程'
  const template = filteredTemplates.value[0] || petTemplates[0]
  return template ? `${petTemplateWorkflowFor(template).label}流程` : '玩法说明'
})
const templateGuideSteps = computed(() =>
  selectedFilter.value === '全部' ? genericGuideSteps : petTemplateGuideByWorkflow[activeWorkflow.value],
)

async function handleUseTemplate(template: PetTemplate) {
  await loadDraft()
  applyTemplate(template)
  await saveDraft()
  ElMessage.success(`已应用「${template.title}」模板`)
  void router.push(routeForPetTemplate(template))
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  grid-auto-rows: 1fr;
  gap: 16px;
}

.pet-library-grid > * {
  min-width: 0;
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
