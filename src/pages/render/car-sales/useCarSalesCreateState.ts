import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type CarSalesCreateMode = 'quick' | 'manual'

export interface CarSalesCreateSection {
  key: string
  label: string
  status: 'done' | 'active' | 'pending'
}

export function useCarSalesCreateState() {
  const route = useRoute()
  const router = useRouter()

  const hasImportTask = computed(() => {
    const raw = route.query.importTask
    const value = Array.isArray(raw) ? raw[0] : raw
    return Boolean(value && String(value).trim())
  })
  const redirectedToManual = computed(() => {
    const raw = route.query.redirect
    const value = Array.isArray(raw) ? raw[0] : raw
    if (!value) {
      return false
    }
    try {
      const url = new URL(String(value), window.location.origin)
      return url.pathname.endsWith('/render') && url.searchParams.get('mode') === 'manual'
    } catch {
      return String(value).includes('/render') && String(value).includes('mode=manual')
    }
  })

  const mode = computed<CarSalesCreateMode>(() =>
    route.query.mode === 'manual' || hasImportTask.value || redirectedToManual.value ? 'manual' : 'quick',
  )
  const isQuickMode = computed(() => mode.value === 'quick')
  const isManualMode = computed(() => mode.value === 'manual')

  const title = computed(() =>
    isQuickMode.value ? '用 AI 轻松生成汽车销售视频' : '手动制作汽车销售视频',
  )
  const subtitle = computed(() =>
    isQuickMode.value
      ? '上传车辆图片，选择卖点或输入需求，AI 帮你生成高质量销售视频。'
      : '手动制作保留原有高级链路，可继续编辑素材、分镜、口播、字幕和后期参数。',
  )

  const sections = computed<CarSalesCreateSection[]>(() => [
    {
      key: 'prompt',
      label: '描述需求',
      status: isQuickMode.value ? 'active' : 'done',
    },
    {
      key: 'material',
      label: '车辆素材',
      status: isQuickMode.value ? 'active' : 'done',
    },
    {
      key: 'plan',
      label: '方案确认',
      status: 'pending',
    },
    {
      key: 'result',
      label: '生成结果',
      status: 'pending',
    },
  ])

  async function setMode(nextMode: CarSalesCreateMode) {
    const nextQuery = { ...route.query }
    if (nextMode === 'manual') {
      nextQuery.mode = 'manual'
    } else {
      delete nextQuery.mode
      delete nextQuery.importTask
    }
    await router.replace({ name: 'render', query: nextQuery })
  }

  return {
    mode,
    isQuickMode,
    isManualMode,
    hasImportTask,
    title,
    subtitle,
    sections,
    setMode,
  }
}
