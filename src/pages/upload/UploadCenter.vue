<template>
  <FileUploadPanel :project="project" />
</template>

<script setup lang="ts">
import FileUploadPanel from '../../components/business/FileUploadPanel.vue'
import type { ProjectItem } from '../../types/projectTypes'

defineProps<{
  project?: ProjectItem
}>()
</script>
