<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" @success="handleLoginSuccess" />
  </RouterView>
</template>

<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router'
import type { UserMe } from './types/userTypes'

const route = useRoute()
const router = useRouter()

function handleLoginSuccess(_user: UserMe) {
  const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
  const target = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/video-parse'
  void router.replace(target)
}
</script>
