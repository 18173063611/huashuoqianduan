/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PET_CREATION_ALLOWED_USER_IDS?: string
  readonly VITE_PET_CREATION_API_MODE?: 'mock' | 'auto' | 'real'
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}
