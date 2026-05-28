<template>
  <div class="car-bundle-backdrop" @click.self="emit('close')">
    <section class="car-bundle-modal" role="dialog" aria-modal="true" aria-label="创建车型素材包">
      <header class="car-bundle-head">
        <div>
          <strong>创建车型素材包</strong>
          <p>上传同一款车型的车辆部位图片，保存后可在视频生成页按分镜自动取用。</p>
        </div>
        <button class="app-secondary-button" type="button" :disabled="saving" @click="emit('close')">关闭</button>
      </header>

      <div class="car-bundle-guidance">
        <strong>素材准备建议</strong>
        <span>优先上传分镜会展示的部位。常用组合是正面、侧面、45 度角、中控台、前排和后排；细节镜头再补车灯、轮毂、Logo 或座椅材质。展厅、道路、门店等场景图请在视频制作页的“场景图片”单独上传，便于替换地点。</span>
      </div>

      <div class="car-bundle-grid">
        <label class="car-bundle-field">
          <span>车型名称</span>
          <input v-model.trim="brandModel" :disabled="saving" placeholder="例如：吉利银河 L7" />
        </label>
        <label class="car-bundle-field">
          <span>颜色/版本</span>
          <input v-model.trim="color" :disabled="saving" placeholder="例如：白色 展厅版" />
        </label>
      </div>

      <div class="car-bundle-role-grid">
        <label v-for="role in carRoleOptions" :key="role.value" class="car-bundle-role">
          <span>{{ role.label }}</span>
          <input type="file" accept="image/*" :disabled="saving" @change="handleRoleFile(role.value, $event)" />
          <small>{{ fileNameByRole[role.value] || '未上传' }}</small>
        </label>
      </div>

      <label class="car-bundle-field">
        <span>备注</span>
        <textarea v-model.trim="notes" :disabled="saving" rows="3" placeholder="可选：门店、拍摄环境、卖点提示" />
      </label>

      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <footer class="car-bundle-actions">
        <span>{{ selectedCount }} 张图片</span>
        <button class="app-primary-button" type="button" :disabled="saving || selectedCount === 0" @click="saveBundle">
          {{ saving ? '保存中...' : '保存车型素材包' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { uploadMaterialAsset } from '../../services/assetApi'
import type { AssetItem } from '../../types/assetTypes'

const props = defineProps<{
  publish?: boolean
}>()

const emit = defineEmits<{
  close: []
  created: [asset: AssetItem]
}>()

const carRoleOptions = [
  { value: 'car_exterior_front', label: '正面' },
  { value: 'car_exterior_side', label: '侧面' },
  { value: 'car_exterior_rear', label: '背面' },
  { value: 'car_exterior_45', label: '45 度角' },
  { value: 'car_interior_dashboard', label: '中控台' },
  { value: 'car_interior_front_seat', label: '前排' },
  { value: 'car_interior_back_seat', label: '后排' },
  { value: 'car_interior_steering', label: '方向盘/仪表' },
  { value: 'car_interior_trunk', label: '后备箱' },
  { value: 'car_detail_light', label: '车灯' },
  { value: 'car_detail_wheel', label: '轮毂' },
  { value: 'car_detail_logo', label: 'Logo' },
  { value: 'car_detail_seat_material', label: '座椅材质' },
] as const

const brandModel = ref('')
const color = ref('')
const notes = ref('')
const filesByRole = ref<Record<string, File>>({})
const fileNameByRole = ref<Record<string, string>>({})
const saving = ref(false)
const errorMessage = ref('')

const selectedCount = computed(() => Object.keys(filesByRole.value).length)

function handleRoleFile(role: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  filesByRole.value = { ...filesByRole.value, [role]: file }
  fileNameByRole.value = { ...fileNameByRole.value, [role]: file.name }
}

async function saveBundle() {
  if (selectedCount.value === 0) {
    errorMessage.value = '请至少上传一张车型图片'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const imageItems = []
    for (const role of carRoleOptions) {
      const file = filesByRole.value[role.value]
      if (!file) continue
      const asset = await uploadMaterialAsset(file, {
        publish: props.publish,
        metadataJson: JSON.stringify({
          from: 'car_model_bundle_image',
          assetRole: role.value,
          brandModel: brandModel.value,
          color: color.value,
        }),
      })
      imageItems.push({
        role: role.value,
        label: role.label,
        assetId: asset.assetId,
        url: asset.fileUrl,
        fileName: asset.fileName,
      })
    }
    const payload = {
      bundleType: 'car_model',
      assetRole: 'car_model_bundle',
      brandModel: brandModel.value,
      color: color.value,
      notes: notes.value,
      images: imageItems,
      createdAt: new Date().toISOString(),
    }
    const safeName = (brandModel.value || '车型素材包').replace(/[\\/:*?"<>|]+/g, '_')
    const file = new File([JSON.stringify(payload, null, 2)], `${safeName}-车型素材包.json`, {
      type: 'application/json',
    })
    const bundleAsset = await uploadMaterialAsset(file, {
      publish: props.publish,
      metadataJson: JSON.stringify({
        from: 'car_model_bundle',
        assetRole: 'car_model_bundle',
        bundleType: 'car_model',
        brandModel: brandModel.value,
        color: color.value,
      }),
    })
    emit('created', bundleAsset)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '车型素材包保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.car-bundle-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 24px;
}

.car-bundle-modal {
  display: grid;
  width: min(960px, 100%);
  max-height: min(86vh, 860px);
  overflow: auto;
  gap: 16px;
  border-radius: 12px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.car-bundle-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.car-bundle-head strong {
  display: block;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.car-bundle-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}

.car-bundle-guidance {
  display: grid;
  gap: 5px;
  border: 1px solid #d8d2ff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 12px;
}

.car-bundle-guidance strong {
  color: #5541d7;
  font-size: 13px;
  font-weight: 900;
}

.car-bundle-guidance span {
  color: #4f586c;
  font-size: 12.5px;
  line-height: 1.6;
}

.car-bundle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.car-bundle-field {
  display: grid;
  gap: 6px;
}

.car-bundle-field span,
.car-bundle-role span {
  color: #344054;
  font-size: 12.5px;
  font-weight: 850;
}

.car-bundle-field input,
.car-bundle-field textarea {
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  color: #111827;
  padding: 10px 12px;
  outline: none;
}

.car-bundle-role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.car-bundle-role {
  display: grid;
  gap: 7px;
  border: 1px dashed #d8d2ff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 10px;
}

.car-bundle-role input {
  width: 100%;
  color: #667085;
  font-size: 12px;
}

.car-bundle-role small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-bundle-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #edf0f6;
  padding-top: 14px;
}

.car-bundle-actions span {
  color: #667085;
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 720px) {
  .car-bundle-grid,
  .car-bundle-role-grid {
    grid-template-columns: 1fr;
  }
}
</style>
