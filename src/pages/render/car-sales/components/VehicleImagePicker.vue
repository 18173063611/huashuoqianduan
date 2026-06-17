<template>
  <div class="quick-vehicle-area">
    <h2>车型素材包 <span class="quick-info-icon" title="车型素材包会自动带入车辆图片、卖点和参数">i</span></h2>

    <div class="quick-source-grid quick-source-grid--single quick-bundle-select-grid">
      <button type="button" class="quick-bundle-select" :disabled="busy" @click="$emit('select-asset')">
        <span class="quick-bundle-select-icon" aria-hidden="true">
          <el-icon><Collection /></el-icon>
        </span>
        <span class="quick-bundle-select-copy">
          <strong>从资产中心选择车型素材包</strong>
          <small>自动带入车辆图集、卖点和车型参数</small>
        </span>
        <span class="quick-bundle-select-action">选择</span>
      </button>
    </div>

    <p>选择 1 个已整理好的车型素材包即可一键生成，其他文案、BGM、数字人可在高级参数中补充。</p>

    <div v-if="validationMessage" class="quick-vehicle-hint quick-vehicle-hint--error" role="alert">
      <strong>{{ validationMessage }}</strong>
      <span>点击上方按钮，从资产中心选择一个车型素材包。</span>
    </div>

    <div v-if="hasVehicleInput" class="quick-vehicle-hint">
      <strong>{{ vehicleImageCountLabel }}</strong>
      <span>车型素材包也会计入车辆素材；场景图、BGM、文案属于辅助素材。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Collection } from '@element-plus/icons-vue'

defineProps<{
  uploading: boolean
  busy: boolean
  hasVehicleInput: boolean
  vehicleImageCountLabel: string
  validationMessage?: string
}>()

defineEmits<{
  'guard-file-input': [event: MouseEvent]
  'images-change': [event: Event]
  'select-asset': []
}>()
</script>
