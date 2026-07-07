<template>
  <section class="pet-script-tool app-page-stack">
    <header class="tool-page-hero">
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.description }}</p>
    </header>

    <div class="pet-script-layout">
      <section class="app-card pet-script-panel">
        <label>
          创作主题
          <textarea v-model.trim="prompt" rows="7" :placeholder="copy.placeholder" />
        </label>
        <div class="pet-script-field-grid">
          <label>
            视频类型
            <select v-model="videoType">
              <option value="dialogue">宠物对话</option>
              <option value="short_drama">萌宠剧情</option>
              <option value="monologue">宠物独白</option>
              <option value="talking">宠物口播</option>
              <option value="image_to_video">图生视频</option>
            </select>
          </label>
          <label>
            风格
            <select v-model="style">
              <option value="cute">可爱治愈</option>
              <option value="funny">反差搞笑</option>
              <option value="realistic">真实写实</option>
              <option value="anthropomorphic">拟人表达</option>
              <option value="healing">温暖陪伴</option>
            </select>
          </label>
          <label>
            时长
            <select v-model.number="durationSeconds">
              <option :value="10">10 秒</option>
              <option :value="15">15 秒</option>
              <option :value="30">30 秒</option>
            </select>
          </label>
          <label>
            比例
            <select v-model="aspectRatio">
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
            </select>
          </label>
        </div>
        <label>
          背景/场景要求
          <input v-model.trim="backgroundPrompt" type="text" maxlength="160" placeholder="例如：午后客厅、宠物店货架、草坪露营场景" />
        </label>
        <button class="app-primary-button" type="button" :disabled="busy || !prompt" @click="generate">
          {{ busy ? '生成中...' : copy.actionLabel }}
        </button>
        <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="app-muted">{{ successMessage }}</p>
      </section>

      <section class="app-card pet-script-panel pet-script-result">
        <div class="pet-script-section-head">
          <div>
            <h3>生成结果</h3>
            <span>已生成内容会写入宠物草稿，可继续进入宠物分镜页调整。</span>
          </div>
          <button type="button" class="app-secondary-button" :disabled="!resultDraft" @click="goStoryboard">
            进入分镜页
          </button>
        </div>

        <div v-if="!resultDraft" class="app-empty-block">生成后将在这里展示脚本和镜头结构。</div>
        <template v-else>
          <section class="pet-script-output">
            <h4>脚本文案</h4>
            <p>{{ resultDraft.scriptText || '暂无脚本文案' }}</p>
          </section>
          <div class="pet-shot-list">
            <article v-for="shot in resultDraft.shots" :key="shot.id" class="pet-shot-card">
              <strong>镜头 {{ shot.index }}</strong>
              <p>{{ shot.frameDescription }}</p>
              <span>{{ shot.characterAction }} · {{ shot.cameraMove }}</span>
              <small>{{ shot.subtitle }}</small>
            </article>
          </div>
        </template>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clonePetDraft, defaultPetDraft } from './petCreationMock'
import { generatePetScript, generatePetStoryboard, savePetDraft } from '../../services/petCreationApi'
import type { PetAspectRatio, PetCreationDraft, PetCreationStyle, PetVideoType } from './petCreationTypes'

const props = withDefaults(defineProps<{
  mode?: 'benchmark' | 'storyboard'
}>(), {
  mode: 'storyboard',
})

const router = useRouter()
const prompt = ref(defaultPrompt())
const videoType = ref<PetVideoType>('short_drama')
const style = ref<PetCreationStyle>('funny')
const durationSeconds = ref<10 | 15 | 30>(15)
const aspectRatio = ref<PetAspectRatio>('9:16')
const backgroundPrompt = ref('')
const busy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const resultDraft = ref<PetCreationDraft | null>(null)

const copy = computed(() => {
  if (props.mode === 'benchmark') {
    return {
      title: '宠物爆款对标',
      description: '按萌宠短视频的反差钩子、表情递进和结尾包袱生成对标脚本与分镜。',
      placeholder: '例如：小猫偷吃冻干被发现，先嘴硬解释，最后用撒娇反转收尾',
      actionLabel: '生成爆款分镜',
    }
  }
  return {
    title: '宠物分镜生成',
    description: '把宠物创意拆成镜头结构、宠物动作、字幕和运镜，供后续视频生成复用。',
    placeholder: '例如：小狗听见零食袋后从装睡到秒醒，跑到镜头前卖萌',
    actionLabel: '生成分镜',
  }
})

function defaultPrompt() {
  return props.mode === 'benchmark'
    ? '小猫偷吃冻干被发现，前 3 秒用反差钩子，中段用表情和动作递进，结尾撒娇反转'
    : '小狗听见零食袋后从装睡到秒醒，跑到镜头前卖萌'
}

async function generate() {
  if (busy.value || !prompt.value.trim()) return
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const draft = clonePetDraft(defaultPetDraft)
    draft.prompt = props.mode === 'benchmark'
      ? `请生成萌宠爆款对标结构：${prompt.value.trim()}。要求前 3 秒反差钩子，中段表情/动作递进，结尾治愈或反转包袱。`
      : prompt.value.trim()
    draft.videoType = videoType.value
    draft.generationMode = videoType.value === 'dialogue' ? 'dialogue_video' : 'text_video'
    draft.style = style.value
    draft.durationSeconds = durationSeconds.value
    draft.aspectRatio = aspectRatio.value
    draft.visualSettings.backgroundPrompt = backgroundPrompt.value.trim()
    const nextDraft = props.mode === 'benchmark'
      ? await generatePetStoryboard(draft)
      : await generatePetStoryboard(await generatePetScript(draft))
    resultDraft.value = nextDraft
    await savePetDraft(nextDraft)
    successMessage.value = '已写入宠物创作草稿。'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成失败'
  } finally {
    busy.value = false
  }
}

function goStoryboard() {
  void router.push({ name: 'pet-storyboard' })
}
</script>

<style scoped>
.pet-script-tool {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto 32px;
}

.pet-script-layout {
  display: grid;
  grid-template-columns: minmax(340px, 440px) minmax(0, 1fr);
  gap: 16px;
}

.pet-script-panel {
  display: grid;
  gap: 16px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
  box-shadow: none;
}

.pet-script-panel label {
  display: grid;
  gap: 8px;
  color: var(--hs-text, #172033);
  font-size: 13px;
  font-weight: 800;
}

.pet-script-panel textarea,
.pet-script-panel input,
.pet-script-panel select {
  width: 100%;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 6px;
  background: #ffffff;
  color: var(--hs-text, #172033);
  padding: 10px 12px;
  outline: none;
}

.pet-script-panel textarea:focus,
.pet-script-panel input:focus,
.pet-script-panel select:focus {
  border-color: var(--hs-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pet-script-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pet-script-result {
  align-content: start;
}

.pet-script-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-script-section-head h3 {
  margin: 0 0 4px;
  color: var(--hs-text, #172033);
  font-size: 16px;
}

.pet-script-section-head span {
  color: var(--hs-muted, #667085);
  font-size: 12px;
}

.pet-script-output {
  display: grid;
  gap: 8px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
  padding: 12px;
}

.pet-script-output h4 {
  margin: 0;
  color: var(--hs-text, #172033);
  font-size: 14px;
}

.pet-script-output p {
  margin: 0;
  color: var(--hs-muted, #667085);
  font-size: 13px;
  line-height: 1.7;
}

.pet-shot-list {
  display: grid;
  gap: 10px;
}

.pet-shot-card {
  display: grid;
  gap: 6px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.pet-shot-card strong {
  color: var(--hs-primary, #2563eb);
  font-size: 13px;
}

.pet-shot-card p,
.pet-shot-card span,
.pet-shot-card small {
  margin: 0;
  color: var(--hs-muted, #667085);
  font-size: 12px;
  line-height: 1.55;
}

.pet-shot-card p {
  color: var(--hs-text, #172033);
  font-size: 13px;
  font-weight: 750;
}

.app-empty-block {
  padding: 24px;
}

@media (max-width: 1024px) {
  .pet-script-tool {
    width: calc(100% - 32px);
  }

  .pet-script-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .pet-script-tool {
    width: calc(100% - 24px);
  }

  .pet-script-field-grid {
    grid-template-columns: 1fr;
  }

  .pet-script-section-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
