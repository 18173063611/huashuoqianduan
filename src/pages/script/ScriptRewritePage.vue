<template>
  <div class="script-workspace">
    <section class="app-card script-panel script-panel-side">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>输入对标视频链接</h2>
          <p class="app-muted">提交后由后端解析视频结构，解析结果可作为文案改写参考。</p>
        </div>
      </div>

      <div v-if="!project" class="app-empty">请先在「工作台」中选择当前项目。</div>
      <template v-else>
        <div class="script-input-row">
          <input v-model.trim="videoUrl" placeholder="请输入抖音/快手/视频链接" />
          <button class="app-primary-button" type="button" :disabled="parsing || !videoUrl" @click="handleParseVideo">
            {{ parsing ? '解析中...' : '解析' }}
          </button>
        </div>

        <article v-if="parseResult" class="script-video-card">
          <div class="script-video-cover">{{ parseResult.summary.slice(0, 1) || 'AI' }}</div>
          <div>
            <strong>对标视频分析</strong>
            <p>{{ parseResult.summary }}</p>
            <small>时长 {{ parseResult.durationSeconds }} 秒 · 场景 {{ parseResult.scenes.length }} 个</small>
          </div>
        </article>

        <div v-if="parseResult" class="script-analysis-list">
          <h3>爆款分析结果</h3>
          <div v-for="scene in parseResult.scenes" :key="`${scene.startSec}-${scene.endSec}-${scene.label}`" class="script-analysis-item">
            <span>{{ scene.startSec }}s</span>
            <p>{{ scene.label }}</p>
          </div>
        </div>

        <p v-if="parseError" class="app-error">{{ parseError }}</p>
      </template>
    </section>

    <section class="app-card script-panel script-panel-main">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>文案改写</h2>
          <p class="app-muted">内容来自当前输入或解析结果，提交后由后端生成并保存脚本版本。</p>
        </div>
      </div>

      <div v-if="!project" class="app-empty">请选择项目后开始改写。</div>
      <template v-else>
        <div class="script-tabs">
          <button class="active" type="button">AI 智能改写</button>
          <button type="button">自定义文案</button>
        </div>

        <form class="script-form" @submit.prevent="handleRewrite">
          <label>
            原文案
            <textarea v-model.trim="sourceText" required placeholder="请输入原文案，或先解析视频后使用解析摘要作为参考" />
          </label>

          <div class="script-form-grid">
            <label>
              改写风格
              <select v-model="style">
                <option value="爆款口播">爆款口播</option>
                <option value="专业讲解">专业讲解</option>
                <option value="种草转化">种草转化</option>
                <option value="剧情引导">剧情引导</option>
              </select>
            </label>
            <label>
              目标字数
              <input v-model.number="targetLength" min="40" max="1000" type="number" />
            </label>
          </div>

          <label>
            改写结果
            <textarea :value="rewrittenText" readonly placeholder="提交后这里展示后端返回的改写文案" />
          </label>

          <div class="script-actions">
            <button class="app-secondary-button" type="button" :disabled="!sourceText" @click="sourceText = ''">清空文案</button>
            <button class="app-primary-button" type="submit" :disabled="rewriting || !sourceText">
              {{ rewriting ? '改写中...' : '应用文案并继续' }}
            </button>
          </div>
        </form>

        <div class="script-version-list">
          <div class="app-card-header">
            <div>
              <h3>历史文案版本</h3>
              <p class="app-muted">来自后端脚本版本接口。</p>
            </div>
            <button class="app-secondary-button" type="button" :disabled="loadingScripts" @click="loadScripts">
              {{ loadingScripts ? '加载中...' : '刷新' }}
            </button>
          </div>
          <div v-if="scripts.length === 0" class="app-empty">暂无文案版本。</div>
          <button
            v-for="script in scripts"
            :key="script.scriptVersionId"
            class="script-version-item"
            type="button"
            @click="sourceText = script.content"
          >
            <span>V{{ script.versionNo }}</span>
            <p>{{ script.content }}</p>
            <small>{{ script.sourceType }}</small>
          </button>
        </div>

        <p v-if="rewriteError" class="app-error">{{ rewriteError }}</p>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getProjectScripts, rewriteScript } from '../../services/scriptApi'
import { parseVideoSource } from '../../services/videoApi'
import type { ProjectItem } from '../../types/projectTypes'
import type { ScriptVersionItem } from '../../types/scriptTypes'
import type { VideoParseResultItem } from '../../types/videoTypes'

const props = defineProps<{
  project?: ProjectItem
}>()

const videoUrl = ref('')
const sourceText = ref('')
const style = ref('爆款口播')
const targetLength = ref(180)
const rewrittenText = ref('')
const parseResult = ref<VideoParseResultItem>()
const scripts = ref<ScriptVersionItem[]>([])
const parsing = ref(false)
const rewriting = ref(false)
const loadingScripts = ref(false)
const parseError = ref('')
const rewriteError = ref('')

watch(
  () => props.project?.projectId,
  async () => {
    parseResult.value = undefined
    rewrittenText.value = ''
    sourceText.value = ''
    scripts.value = []
    parseError.value = ''
    rewriteError.value = ''
    if (props.project) {
      await loadScripts()
    }
  },
  { immediate: true },
)

async function handleParseVideo() {
  if (!props.project || !videoUrl.value) {
    return
  }
  parsing.value = true
  parseError.value = ''
  try {
    const result = await parseVideoSource({
      projectId: props.project.projectId,
      videoUrl: videoUrl.value,
    })
    parseResult.value = result.mockParseResult
    if (!sourceText.value) {
      sourceText.value = result.mockParseResult.summary
    }
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '解析失败'
  } finally {
    parsing.value = false
  }
}

async function handleRewrite() {
  if (!props.project || !sourceText.value) {
    return
  }
  rewriting.value = true
  rewriteError.value = ''
  try {
    const result = await rewriteScript({
      projectId: props.project.projectId,
      sourceText: sourceText.value,
      style: style.value,
      targetLength: targetLength.value,
    })
    rewrittenText.value = result.rewrittenText
    await loadScripts()
  } catch (error) {
    rewriteError.value = error instanceof Error ? error.message : '改写失败'
  } finally {
    rewriting.value = false
  }
}

async function loadScripts() {
  if (!props.project) {
    return
  }
  loadingScripts.value = true
  try {
    scripts.value = await getProjectScripts(props.project.projectId)
  } catch (error) {
    rewriteError.value = error instanceof Error ? error.message : '加载文案版本失败'
  } finally {
    loadingScripts.value = false
  }
}
</script>
