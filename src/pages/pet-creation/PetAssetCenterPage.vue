<template>
  <section class="pet-asset-center-page app-page-stack">
    <header class="pet-asset-page-head">
      <div>
        <span>宠物创作中心</span>
        <h1>宠物资产中心</h1>
        <p>只管理宠物创作相关素材，按背景、宠物、人物、视频、音频、文案和分镜组织，与车辆资产隔离。</p>
      </div>
    </header>

    <div class="pet-asset-stage-grid">
      <RouterLink
        v-for="item in assetStages"
        :key="item.workflowStage"
        :to="{ name: 'pet-assets', query: assetStageQuery(item) }"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.text }}</span>
      </RouterLink>
    </div>

    <AssetCenter panel-mode="materials" business-domain="pet" />
  </section>
</template>

<script setup lang="ts">
import AssetCenter from '../asset/AssetCenter.vue'

const assetStages = [
  { workflowStage: 'petBackground', title: '背景', text: '宠物视频背景图、场景图和氛围参考。' },
  { workflowStage: 'petPet', title: '宠物', text: '主宠、第二宠和用品道具等主体参考。' },
  { workflowStage: 'petDigitalHuman', title: '人物', text: '主人、讲解人和人宠同框参考形象。' },
  { workflowStage: 'petVideo', title: '视频', text: '宠物参考视频、生成结果和可下载成片。' },
  { workflowStage: 'petAudio', title: '音频', text: '角色台词、旁白、BGM 和音效素材。' },
  { workflowStage: 'petCopy', title: '文案', text: '口播脚本、字幕文本和对话文案。' },
  { workflowStage: 'petStoryboard', title: '分镜', text: '镜头脚本、场景结构和分镜 JSON。' },
]

function assetStageQuery(item: { workflowStage: string }) {
  return {
    workflowStage: item.workflowStage,
  }
}
</script>

<style scoped>
.pet-asset-center-page {
  display: grid;
  gap: 16px;
}

.pet-asset-page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px 20px;
}

.pet-asset-page-head span {
  display: block;
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-asset-page-head h1 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.pet-asset-page-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.55;
}

.pet-asset-stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.pet-asset-stage-grid a {
  display: grid;
  gap: 6px;
  min-height: 86px;
  align-content: center;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  padding: 14px 16px;
  text-decoration: none;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-asset-stage-grid a:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.pet-asset-stage-grid strong {
  color: #172033;
  font-size: 14px;
  font-weight: 900;
}

.pet-asset-stage-grid span {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}
</style>
