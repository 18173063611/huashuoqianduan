<template>
  <el-drawer v-model="drawerVisible" :title="editingUserId ? '编辑账号' : '新增账号'" size="520px">
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
      <el-form-item label="业务权限">
        <el-checkbox-group v-model="form.permissions" class="permission-list">
          <el-checkbox v-for="option in permissionOptions" :key="option.value" :label="option.value" border>
            <span class="permission-title">{{ option.label }}</span>
            <span class="permission-desc">{{ option.desc }}</span>
          </el-checkbox>
        </el-checkbox-group>
        <p class="form-tip">只勾选宠物创作中心就是宠物专用账号；同时勾选汽车创作中心则可访问两个中心。</p>
      </el-form-item>
      <el-form-item v-if="!editingUserId" label="初始积分" prop="initialCredits">
        <el-input-number
          v-model="form.initialCredits"
          :min="0"
          :max="100000000"
          :step="1000"
          controls-position="right"
          style="width: 100%"
        />
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
import type { AdminFeaturePermission, AdminUserSaveRequest } from '../../../types/adminTypes'

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
  permissions: [],
  initialCredits: 0,
})

const permissionOptions: { label: string; value: AdminFeaturePermission; desc: string }[] = [
  { label: '宠物创作中心', value: 'PET_CREATION_ACCESS', desc: '允许进入宠物创作中心并调用宠物生成能力' },
  { label: '汽车创作中心', value: 'VEHICLE_CREATION_ACCESS', desc: '允许进入汽车创作中心' },
  { label: '宠物公共资产编辑', value: 'PET_PUBLIC_ASSET_EDITOR', desc: '允许管理宠物公共素材' },
]

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
    Object.assign(form, props.initialValue, {
      permissions: [...(props.initialValue.permissions || [])],
      initialCredits: props.initialValue.initialCredits ?? 0,
    })
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

<style scoped>
.permission-list {
  display: grid;
  gap: 10px;
}

.permission-list :deep(.el-checkbox) {
  height: auto;
  margin-right: 0;
  padding: 10px 12px;
}

.permission-list :deep(.el-checkbox__label) {
  display: grid;
  gap: 2px;
  line-height: 1.35;
  white-space: normal;
}

.permission-title {
  color: #111827;
  font-weight: 700;
}

.permission-desc,
.form-tip {
  color: #6b7280;
  font-size: 12px;
}

.form-tip {
  margin: 8px 0 0;
}
</style>
