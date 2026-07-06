import { onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

export function usePetApiFallbackNotice() {
  function handleFallback() {
    ElMessage.warning('真实宠物接口暂不可用，已自动回退到本地 mock 数据。')
  }

  onMounted(() => {
    window.addEventListener('pet-creation-api-fallback', handleFallback)
  })

  onUnmounted(() => {
    window.removeEventListener('pet-creation-api-fallback', handleFallback)
  })
}
