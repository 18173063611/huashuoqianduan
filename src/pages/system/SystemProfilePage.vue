<template>
  <main class="profile-page app-page-stack">
    <section class="profile-head">
      <div>
        <span class="profile-eyebrow">个人中心</span>
        <h1>账号资料</h1>
        <p>管理头像、昵称、联系方式和账号安全。</p>
      </div>
    </section>

    <p v-if="profileMessage" class="profile-success">{{ profileMessage }}</p>
    <p v-if="profileError" class="profile-error">{{ profileError }}</p>

    <section class="profile-layout">
      <div class="profile-stack">
        <section class="profile-panel">
          <header class="profile-panel-head">
            <div>
              <h2>个人资料</h2>
              <p>这些信息会用于工作台头像、用户菜单和账号识别。</p>
            </div>
          </header>

          <div class="avatar-row">
            <div class="profile-avatar" aria-label="当前头像">
              <img v-if="avatarPreview" :src="avatarPreview" :alt="profileForm.displayName || '头像'" />
              <span v-else>{{ profileInitial }}</span>
            </div>
            <div class="avatar-actions">
              <input
                ref="avatarInput"
                class="avatar-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                @change="handleAvatarChange"
              />
              <button
                class="app-primary-button"
                type="button"
                :disabled="avatarUploading"
                @click="triggerAvatarPicker"
              >
                {{ avatarUploading ? '上传中...' : '选择头像' }}
              </button>
              <button
                class="app-secondary-button"
                type="button"
                :disabled="avatarUploading || !avatarPreview"
                @click="removeAvatar"
              >
                移除头像
              </button>
              <span>JPG、PNG、WEBP、GIF，5MB 内</span>
            </div>
          </div>

          <form class="profile-form" @submit.prevent="saveProfile">
            <label class="profile-field">
              <span>登录账号</span>
              <input :value="currentUser?.username || ''" type="text" disabled />
            </label>
            <label class="profile-field">
              <span>昵称</span>
              <input v-model.trim="profileForm.displayName" type="text" maxlength="80" placeholder="请输入昵称" />
            </label>
            <label class="profile-field">
              <span>手机号</span>
              <input v-model.trim="profileForm.phone" type="tel" maxlength="30" placeholder="未填写" />
            </label>
            <label class="profile-field">
              <span>邮箱</span>
              <input v-model.trim="profileForm.email" type="email" maxlength="120" placeholder="未填写" />
            </label>
            <label class="profile-field profile-field--wide">
              <span>个人说明</span>
              <textarea v-model.trim="profileForm.remark" maxlength="500" rows="4" placeholder="未填写" />
            </label>
            <div class="profile-form-actions">
              <button class="app-secondary-button" type="button" :disabled="profileSaving" @click="resetProfileForm">
                还原
              </button>
              <button class="app-primary-button" type="submit" :disabled="profileSaving">
                {{ profileSaving ? '保存中...' : '保存资料' }}
              </button>
            </div>
          </form>
        </section>

        <section class="profile-panel">
          <header class="profile-panel-head">
            <div>
              <h2>账号安全</h2>
              <p>修改密码后，下次登录请使用新密码。</p>
            </div>
          </header>

          <p v-if="passwordMessage" class="profile-success profile-inline-message">{{ passwordMessage }}</p>
          <p v-if="passwordError" class="profile-error profile-inline-message">{{ passwordError }}</p>

          <form class="profile-form" @submit.prevent="savePassword">
            <label class="profile-field">
              <span>当前密码</span>
              <input v-model.trim="passwordForm.currentPassword" type="password" autocomplete="current-password" />
            </label>
            <label class="profile-field">
              <span>新密码</span>
              <input v-model.trim="passwordForm.newPassword" type="password" autocomplete="new-password" />
            </label>
            <label class="profile-field">
              <span>确认新密码</span>
              <input v-model.trim="passwordForm.confirmPassword" type="password" autocomplete="new-password" />
            </label>
            <div class="profile-form-actions">
              <button class="app-primary-button" type="submit" :disabled="passwordSaving">
                {{ passwordSaving ? '修改中...' : '修改密码' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <aside class="profile-summary">
        <h2>账号概览</h2>
        <dl>
          <div>
            <dt>账号身份</dt>
            <dd>{{ roleLabel }}</dd>
          </div>
          <div>
            <dt>账号状态</dt>
            <dd>{{ statusLabel }}</dd>
          </div>
          <div>
            <dt>可用积分</dt>
            <dd>{{ currentUser?.creditBalance ?? 0 }}</dd>
          </div>
          <div v-if="(currentUser?.creditFrozenBalance ?? 0) > 0">
            <dt>冻结积分</dt>
            <dd>{{ currentUser?.creditFrozenBalance }}</dd>
          </div>
        </dl>
        <RouterLink class="app-secondary-button profile-summary-link" to="/system/credits">积分记录</RouterLink>
        <RouterLink class="app-primary-button profile-summary-link" to="/assets">资产中心</RouterLink>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  changePassword,
  clearProfileAvatar,
  me,
  setAuthUser,
  updateProfile,
  uploadProfileAvatar,
} from '../../services/authApi'
import { notifyAuthRefresh } from '../../services/authRefreshHub'
import { getAuthUser } from '../../services/authSession'
import type { UserMe } from '../../types/userTypes'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024

const currentUser = ref<UserMe | null>(getAuthUser() as UserMe | null)
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const profileSaving = ref(false)
const passwordSaving = ref(false)
const profileMessage = ref('')
const profileError = ref('')
const passwordMessage = ref('')
const passwordError = ref('')

const profileForm = reactive({
  displayName: '',
  phone: '',
  email: '',
  remark: '',
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const avatarPreview = computed(() => currentUser.value?.avatarUrl?.trim() || '')
const profileInitial = computed(() => {
  const name = profileForm.displayName || currentUser.value?.username || 'U'
  return name.trim().slice(0, 1).toUpperCase()
})
const roleLabel = computed(() => (currentUser.value?.role === 'ADMIN' ? '管理员' : '门店账号'))
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    ENABLED: '正常',
    DISABLED: '已禁用',
    LOCKED: '已锁定',
  }
  return map[currentUser.value?.status || ''] || '正常'
})

onMounted(async () => {
  syncProfileForm(currentUser.value)
  try {
    applyUser(await me())
  } catch (error) {
    profileError.value = messageOf(error, '账号信息加载失败')
  }
})

function triggerAvatarPicker() {
  avatarInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > AVATAR_MAX_BYTES) {
    profileError.value = '头像图片不能超过 5MB'
    return
  }
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    profileError.value = '头像仅支持 JPG、PNG、WEBP 或 GIF 图片'
    return
  }
  avatarUploading.value = true
  profileError.value = ''
  profileMessage.value = ''
  try {
    applyUser(await uploadProfileAvatar(file))
    profileMessage.value = '头像已更新'
    clearLater(profileMessage)
  } catch (error) {
    profileError.value = messageOf(error, '头像上传失败')
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar() {
  if (!avatarPreview.value) return
  avatarUploading.value = true
  profileError.value = ''
  profileMessage.value = ''
  try {
    applyUser(await clearProfileAvatar())
    profileMessage.value = '头像已移除'
    clearLater(profileMessage)
  } catch (error) {
    profileError.value = messageOf(error, '头像移除失败')
  } finally {
    avatarUploading.value = false
  }
}

async function saveProfile() {
  if (!profileForm.displayName.trim()) {
    profileError.value = '请输入昵称'
    return
  }
  profileSaving.value = true
  profileError.value = ''
  profileMessage.value = ''
  try {
    applyUser(await updateProfile({
      displayName: profileForm.displayName,
      phone: emptyToNull(profileForm.phone),
      email: emptyToNull(profileForm.email),
      remark: emptyToNull(profileForm.remark),
    }))
    profileMessage.value = '资料已保存'
    clearLater(profileMessage)
  } catch (error) {
    profileError.value = messageOf(error, '资料保存失败')
  } finally {
    profileSaving.value = false
  }
}

function resetProfileForm() {
  syncProfileForm(currentUser.value)
  profileError.value = ''
}

async function savePassword() {
  passwordError.value = ''
  passwordMessage.value = ''
  if (!passwordForm.currentPassword || !passwordForm.newPassword) {
    passwordError.value = '请输入当前密码和新密码'
    return
  }
  if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 60) {
    passwordError.value = '新密码长度需要为 6 到 60 位'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }
  passwordSaving.value = true
  try {
    await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordMessage.value = '密码已修改'
    clearLater(passwordMessage)
  } catch (error) {
    passwordError.value = messageOf(error, '密码修改失败')
  } finally {
    passwordSaving.value = false
  }
}

function applyUser(user: UserMe) {
  currentUser.value = user
  setAuthUser(user)
  syncProfileForm(user)
  notifyAuthRefresh()
}

function syncProfileForm(user: UserMe | null) {
  profileForm.displayName = user?.displayName || user?.username || ''
  profileForm.phone = user?.phone || ''
  profileForm.email = user?.email || ''
  profileForm.remark = user?.remark || ''
}

function emptyToNull(value: string) {
  const text = value.trim()
  return text ? text : null
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function clearLater(target: { value: string }) {
  window.setTimeout(() => {
    target.value = ''
  }, 2400)
}
</script>

<style scoped>
.profile-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px;
}

.profile-head,
.profile-panel,
.profile-summary {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.profile-head {
  padding: 24px;
}

.profile-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #2563eb;
  font-weight: 700;
}

.profile-head h1,
.profile-panel h2,
.profile-summary h2 {
  margin: 0;
  color: #0f172a;
}

.profile-head p,
.profile-panel p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}

.profile-stack {
  display: grid;
  gap: 18px;
}

.profile-panel {
  padding: 20px;
}

.profile-panel-head {
  margin-bottom: 18px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.profile-avatar {
  display: grid;
  width: 88px;
  height: 88px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 30px;
  font-weight: 900;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar-actions span {
  flex-basis: 100%;
  color: #64748b;
  font-size: 13px;
}

.avatar-input {
  display: none;
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profile-field {
  display: grid;
  gap: 8px;
}

.profile-field--wide,
.profile-form-actions {
  grid-column: 1 / -1;
}

.profile-field span {
  color: #334155;
  font-weight: 700;
}

.profile-field input,
.profile-field textarea {
  width: 100%;
  min-height: 42px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  padding: 0 12px;
  font: inherit;
}

.profile-field textarea {
  min-height: 96px;
  padding: 12px;
  resize: vertical;
}

.profile-field input:disabled {
  background: #f8fafc;
  color: #64748b;
}

.profile-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.profile-summary {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 14px;
  padding: 20px;
}

.profile-summary dl {
  display: grid;
  gap: 14px;
  margin: 0;
}

.profile-summary div {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.profile-summary dt {
  color: #64748b;
  font-size: 13px;
}

.profile-summary dd {
  margin: 6px 0 0;
  color: #0f172a;
  font-weight: 800;
}

.profile-summary-link {
  width: 100%;
}

.profile-success,
.profile-error {
  border-radius: 8px;
  padding: 12px 14px;
}

.profile-success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #047857;
}

.profile-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.profile-inline-message {
  margin-bottom: 14px;
}

@media (max-width: 980px) {
  .profile-page {
    padding: 16px;
  }

  .profile-layout,
  .profile-form {
    grid-template-columns: 1fr;
  }

  .profile-summary {
    position: static;
  }
}

@media (max-width: 560px) {
  .avatar-row {
    align-items: flex-start;
  }

  .profile-form-actions {
    justify-content: stretch;
  }

  .profile-form-actions button,
  .avatar-actions button {
    flex: 1;
  }
}
</style>
