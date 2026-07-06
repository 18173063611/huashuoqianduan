<template>
  <article class="pet-template-card">
    <div class="pet-template-cover" :class="{ 'has-image': !!template.coverUrl }" :style="coverStyle">
      <span>{{ indexLabel }}</span>
      <i aria-hidden="true">▶</i>
    </div>
    <div class="pet-template-body">
      <strong>{{ template.title }}</strong>
      <p>{{ template.description }}</p>
      <div class="pet-template-card-tags">
        <span v-for="tag in template.tags" :key="tag">{{ tag }}</span>
      </div>
      <small>推荐 {{ template.durationSeconds }} 秒 / {{ template.aspectRatio }}</small>
      <RouterLink class="pet-template-card-action" :to="{ name: 'pet-render', query: { templateId: template.id } }">
        使用模板
      </RouterLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetTemplate } from '../petCreationTypes'

const props = defineProps<{
  template: PetTemplate
  index?: number
}>()

const indexLabel = computed(() => String((props.index || 0) + 1).padStart(2, '0'))

const coverStyle = computed(() => {
  if (!props.template.coverUrl) return undefined
  return {
    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.12)), url("${props.template.coverUrl.replace(/"/g, '\\"')}")`,
  }
})
</script>

<style scoped>
.pet-template-card {
  display: grid;
  overflow: hidden;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-template-cover {
  position: relative;
  min-height: 150px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(20, 184, 166, 0.14)),
    #f8fafc;
  background-position: center;
  background-size: cover;
}

.pet-template-cover span,
.pet-template-cover i {
  position: absolute;
  display: inline-grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.9);
  color: #2563eb;
  font-style: normal;
  font-weight: 900;
}

.pet-template-cover span {
  top: 12px;
  left: 12px;
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  font-size: 14px;
}

.pet-template-cover i {
  right: 12px;
  bottom: 12px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 12px;
  padding-left: 2px;
}

.pet-template-body {
  display: grid;
  min-height: 190px;
  grid-template-rows: auto 1fr auto auto auto;
  gap: 10px;
  padding: 16px;
}

.pet-template-card strong {
  display: block;
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.pet-template-card p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-template-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pet-template-card-tags span {
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
}

.pet-template-card small {
  color: #7f8aaa;
  font-size: 12px;
  font-weight: 750;
}

.pet-template-card-action {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}
</style>
