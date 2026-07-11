<template>
  <section class="pet-asset-quick-picker">
    <header>
      <div>
        <h4>选择素材</h4>
        <p>{{ summaryText }}</p>
      </div>
      <button type="button" @click="$emit('open-assets')">资产中心</button>
    </header>

    <div class="pet-asset-quick-slots">
      <button
        v-for="slot in slots"
        :key="slot.role"
        type="button"
        :class="{ filled: countByRole(slot.role) > 0 }"
        @click="$emit('choose-role', slot.role)"
      >
        <strong>{{ slot.label }}</strong>
        <span>{{ countByRole(slot.role) > 0 ? `${countByRole(slot.role)} 个已选` : slot.hint }}</span>
      </button>
    </div>

    <button class="pet-asset-upload" type="button" @click="$emit('upload')">上传/选择宠物素材</button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetReferenceMaterial } from '../petCreationTypes'

const props = defineProps<{
  materials: PetReferenceMaterial[]
}>()

defineEmits<{
  'open-assets': []
  upload: []
  'choose-role': [role: PetReferenceMaterial['role']]
}>()

const slots: Array<{ role: PetReferenceMaterial['role']; label: string; hint: string }> = [
  { role: 'main_pet', label: '主宠物', hint: '必填' },
  { role: 'second_pet', label: '第二宠物', hint: '多宠可选' },
  { role: 'human_avatar', label: '人物/主人', hint: '人宠剧情' },
  { role: 'scene', label: '背景/场景', hint: '场景参考' },
]

const summaryText = computed(() => {
  const count = props.materials.filter((item) => item.assetId || item.url).length
  return count > 0 ? `已选择 ${count} 个宠物创作素材` : '先准备主宠物照片，再补人物、背景或道具。'
})

function countByRole(role: PetReferenceMaterial['role']) {
  return props.materials.filter((item) => item.role === role && (item.assetId || item.url)).length
}
</script>

<style scoped>
.pet-asset-quick-picker {
  display: grid;
  gap: 12px;
}

.pet-asset-quick-picker header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.pet-asset-quick-picker h4 {
  margin: 0;
  color: #2b211d;
  font-size: 14px;
  font-weight: 900;
}

.pet-asset-quick-picker p {
  margin: 4px 0 0;
  color: #7a6255;
  font-size: 12px;
  line-height: 1.5;
}

.pet-asset-quick-picker header button,
.pet-asset-upload {
  min-height: 34px;
  border: 1px solid #f2c4a7;
  border-radius: 12px;
  background: #fff7ed;
  color: #c2410c;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 900;
}

.pet-asset-quick-slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pet-asset-quick-slots button {
  display: grid;
  gap: 4px;
  min-height: 62px;
  border: 1px solid #eadfd5;
  border-radius: 14px;
  background: #ffffff;
  color: #4a352c;
  padding: 10px;
  text-align: left;
}

.pet-asset-quick-slots button.filled {
  border-color: #86efac;
  background: #f0fdf4;
}

.pet-asset-quick-slots strong {
  font-size: 12px;
  font-weight: 900;
}

.pet-asset-quick-slots span {
  color: #8a7062;
  font-size: 11px;
}

.pet-asset-upload {
  width: 100%;
  background: #ef8354;
  color: #ffffff;
}
</style>
