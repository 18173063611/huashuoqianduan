<template>
  <el-drawer v-model="drawerVisible" :title="editingUserId ? '编辑账号' : '新增账号'" size="440px">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="登录账号" prop="username">
        <el-input v-model="form.username" :disabled="!!editingUserId" maxlength="60" />
      </el-form-item>
      <el-form-item label="初始密码" prop="password">
        <el-input v-model="form.password" maxlength="60" show-password type="password" />
      </el-form-item>
      <el-form-item label="用户昵称" prop="displayName">
        <el-input v-model="form.displayName" maxlength="80" />
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-radio-group v-model="form.role" :disabled="protectedUser">
          <el-radio-button label="USER">普通用户</el-radio-button>
          <el-radio-button label="ADMIN">系统管理员</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="账号状态" prop="status">
        <el-select v-model="form.status" :disabled="protectedUser" style="width: 100%">
          <el-option label="正常" value="ENABLED" />
          <el-option label="已禁用" value="DISABLED" />
          <el-option label="已锁定" value="LOCKED" />
        </el-select>
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="form.phone" maxlength="30" placeholder="未填写" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" maxlength="120" placeholder="未填写" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" maxlength="500" show-word-limit type="textarea" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { AdminUserSaveRequest } from '../../../types/adminTypes'

const props = defineProps<{
  visible: boolean
  editingUserId: number | null
  initialValue: AdminUserSaveRequest
  protectedUser?: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  save: [payload: AdminUserSaveRequest]
}>()

const formRef = ref<FormInstance>()
const form = reactive<AdminUserSaveRequest>({
  username: '',
  password: '',
  displayName: '',
  role: 'USER',
  status: 'ENABLED',
  phone: '',
  email: '',
  remark: '',
})

const drawerVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
const protectedUser = computed(() => Boolean(props.protectedUser))

const rules: FormRules<AdminUserSaveRequest> = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value: string, callback) => {
        if (!props.editingUserId && (!value || value.length < 6)) callback(new Error('新账号密码至少 6 位'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

watch(
  () => [props.visible, props.initialValue] as const,
  () => {
    if (!props.visible) return
    Object.assign(form, props.initialValue)
    formRef.value?.clearValidate()
  },
  { immediate: true },
)

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('save', { ...form })
}
</script>
