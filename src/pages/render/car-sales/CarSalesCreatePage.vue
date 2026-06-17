<template>
  <div class="car-sales-create-page app-page-stack" :class="`car-sales-create-page--${mode}`">
    <header class="car-sales-create-head">
      <div class="car-sales-create-title">
        <h1 v-if="isQuickMode">用 <span>AI</span> 轻松生成汽车销售视频</h1>
        <h1 v-else>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>

      <div v-if="isManualMode" class="car-sales-mode-switch" aria-label="视频制作模式">
        <button
          type="button"
          :class="{ active: isQuickMode }"
          :aria-pressed="isQuickMode"
          @click="setMode('quick')"
        >
          一键汽车销售视频
        </button>
        <button
          type="button"
          :class="{ active: isManualMode }"
          :aria-pressed="isManualMode"
          @click="setMode('manual')"
        >
          手动制作
        </button>
      </div>
    </header>

    <nav v-if="isManualMode" class="car-sales-flow" aria-label="汽车销售视频制作流程">
      <span
        v-for="section in sections"
        :key="section.key"
        :class="`car-sales-flow-item car-sales-flow-item--${section.status}`"
      >
        {{ section.label }}
      </span>
    </nav>

    <QuickRenderPage v-if="isQuickMode" embedded />
    <RenderVideoPage v-else embedded />
  </div>
</template>

<script setup lang="ts">
import QuickRenderPage from '../QuickRenderPage.vue'
import RenderVideoPage from '../RenderVideoPage.vue'
import { useCarSalesCreateState } from './useCarSalesCreateState'

const {
  mode,
  isQuickMode,
  isManualMode,
  title,
  subtitle,
  sections,
  setMode,
} = useCarSalesCreateState()
</script>

<style scoped>
.car-sales-create-page {
  display: grid;
  gap: 20px;
  margin-top: 0;
  padding-top: 18px;
}

.car-sales-create-head {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 18px;
}

.car-sales-create-title {
  min-width: 0;
  text-align: center;
}

.car-sales-create-title h1 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.18;
  text-align: center;
}

.car-sales-create-title h1 span {
  color: #2563eb;
}

.car-sales-create-page--quick .car-sales-create-title h1::after {
  content: " ✦";
  color: #78a9ff;
  font-size: 22px;
  line-height: 1;
}

.car-sales-create-title p {
  margin: 0;
  color: #64748b;
  font-size: 15px;
  line-height: 1.7;
  text-align: center;
}

.car-sales-mode-switch {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  border: 1px solid #dfe7f5;
  border-radius: 10px;
  background: #fff;
  padding: 4px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.car-sales-mode-switch button {
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.car-sales-mode-switch button.active {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.2);
}

.car-sales-flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.car-sales-flow-item {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.car-sales-flow-item--done {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.car-sales-flow-item--active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.car-sales-flow-item--pending {
  background: #f8fafc;
}

@media (max-width: 900px) {
  .car-sales-create-head {
    display: grid;
  }

  .car-sales-mode-switch {
    width: 100%;
  }

  .car-sales-mode-switch button {
    flex: 1;
  }
}

@media (max-width: 640px) {
  .car-sales-create-page {
    width: calc(100% - 24px);
    padding-top: 18px;
  }

  .car-sales-create-title h1 {
    font-size: 26px;
  }

  .car-sales-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
