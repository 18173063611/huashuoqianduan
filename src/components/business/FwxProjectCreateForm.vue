<template>
  <form class="fwx-card fwx-form" @submit.prevent="handleSubmit">
    <div>
      <p class="fwx-eyebrow">项目管理基础接口</p>
      <h2>创建视频制作项目</h2>
    </div>

    <label>
      项目名称
      <input v-model.trim="form.projectName" required maxlength="80" placeholder="例如：AI 数字人口播测试" />
    </label>

    <label>
      项目描述
      <textarea v-model.trim="form.description" maxlength="500" placeholder="填写项目用途、素材来源或验收目标" />
    </label>

    <button class="fwx-primary-button" type="submit" :disabled="loading">
      {{ loading ? '创建中...' : '创建项目' }}
    </button>

    <p v-if="errorMessage" class="fwx-error">{{ errorMessage }}</p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { fwxCreateProject } from '../../services/fwxProjectApi'
import type { FwxProjectItem } from '../../types/fwxProjectTypes'

const emit = defineEmits<{
  created: [project: FwxProjectItem]
}>()

const form = reactive({
  projectName: '',
  description: '',
})
const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''
  try {
    const project = await fwxCreateProject({
      projectName: form.projectName,
      description: form.description,
    })
    form.projectName = ''
    form.description = ''
    emit('created', project)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建项目失败'
  } finally {
    loading.value = false
  }
}
</script>
