<template>
  <el-card shadow="never" class="admin-coming-soon">
    <el-empty :description="`${title} 页面正在按计划接入`">
      <el-tag type="info" effect="plain">接口契约先行，后续逐步联调</el-tag>
    </el-empty>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => String(route.meta.title || '后台功能'))
</script>

<style scoped>
.admin-coming-soon {
  min-height: 360px;
  display: grid;
  place-items: center;
}
</style>
