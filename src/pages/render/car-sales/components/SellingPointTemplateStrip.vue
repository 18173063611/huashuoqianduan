<template>
  <section class="quick-template-section" aria-label="推荐卖点模板">
    <div class="quick-section-head">
      <div>
        <h2>推荐卖点模板</h2>
      </div>
      <button type="button" class="quick-more-button">更多模板</button>
    </div>

    <div class="quick-template-strip">
      <button
        v-for="template in templates"
        :key="template.id"
        type="button"
        :class="{ active: selectedSellingPointIds.includes(template.id) }"
        :disabled="busy"
        @click="$emit('apply-template', template)"
      >
        <span class="quick-template-icon">{{ template.title.slice(0, 1) }}</span>
        <strong>
          {{ template.title }}
          <em>{{ template.matchScore }}%</em>
        </strong>
        <span>{{ template.tags }}</span>
        <small>{{ template.matchReason }}</small>
        <b>使用模板</b>
      </button>
    </div>

    <details class="quick-match-panel" aria-label="AI 自动匹配建议">
      <summary>
        <strong>AI 自动匹配</strong>
        <span>{{ matchSummaryLabel }}</span>
        <button type="button" :disabled="templateMatchLoading || busy" @click.prevent="$emit('refresh-match', true)">
          {{ templateMatchLoading ? '匹配中...' : '刷新匹配' }}
        </button>
      </summary>

      <div v-if="matchTags.length" class="quick-match-tags" aria-label="已识别标签">
        <span v-for="tag in matchTags.slice(0, 8)" :key="tag">{{ tag }}</span>
      </div>

      <div class="quick-match-grid">
        <article v-if="topSellingPointMatch" class="quick-match-card quick-match-card--primary">
          <div class="quick-match-score">{{ topSellingPointMatch.matchScore }}%</div>
          <div>
            <strong>推荐卖点：{{ topSellingPointMatch.title }}</strong>
            <p>{{ topSellingPointMatch.matchReason }}</p>
            <div class="quick-match-mini-tags">
              <span v-for="tag in topSellingPointMatch.matchTags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </article>

        <article v-for="candidate in matchedTemplateCandidates" :key="candidate.id" class="quick-match-card">
          <div class="quick-match-score">{{ candidate.score }}%</div>
          <div>
            <strong>{{ candidate.title }}</strong>
            <p>{{ candidate.typeLabel }} · {{ candidate.reasons.join('，') }}</p>
            <div class="quick-match-mini-tags">
              <span v-for="tag in candidate.tags.slice(0, 4)" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <button type="button" :disabled="busy" @click="$emit('apply-candidate', candidate)">应用</button>
        </article>
      </div>

      <p v-if="templateMatchError" class="quick-match-error">{{ templateMatchError }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import type { AssetItem } from '../../../../types/assetTypes'
import type { TemplateItem } from '../../../../types/templateTypes'

export interface SellingPointTemplateView {
  id: string
  title: string
  tags: string
  prompt: string
  keywords: string[]
  vehicleKeywords: string[]
  sceneKeywords: string[]
  matchScore: number
  matchReason: string
  matchTags: string[]
}

export interface MatchedTemplateCandidateView {
  id: string
  source: 'template' | 'asset'
  title: string
  typeLabel: string
  score: number
  tags: string[]
  reasons: string[]
  template?: TemplateItem
  asset?: AssetItem
}

defineProps<{
  templates: SellingPointTemplateView[]
  selectedSellingPointIds: string[]
  busy: boolean
  topSellingPointMatch: SellingPointTemplateView | null
  matchSummaryLabel: string
  matchTags: string[]
  matchedTemplateCandidates: MatchedTemplateCandidateView[]
  templateMatchLoading: boolean
  templateMatchError: string
}>()

defineEmits<{
  'apply-template': [template: SellingPointTemplateView]
  'refresh-match': [showAuthPrompt: boolean]
  'apply-candidate': [candidate: MatchedTemplateCandidateView]
}>()
</script>
