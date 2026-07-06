export const PET_CREATION_PERMISSION = 'PET_CREATION_ACCESS'
export const VEHICLE_CREATION_PERMISSION = 'VEHICLE_CREATION_ACCESS'

export const PET_CREATION_MENU_KEYS = ['pet-render', 'pet-templates', 'pet-works', 'pet-assets'] as const

export type PetCreationMenuKey = (typeof PET_CREATION_MENU_KEYS)[number]

export interface PetCreationAccessUser {
  userId?: number | string | null
  username?: string | null
  role?: string | null
  permissions?: readonly string[] | null
  features?: readonly string[] | null
}

function parseAllowedUserIds(value?: string) {
  return (value || '')
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export const PET_CREATION_ALLOWED_USER_IDS: readonly string[] = parseAllowedUserIds(
  import.meta.env.VITE_PET_CREATION_ALLOWED_USER_IDS,
)

export function canAccessPetCreation(user?: PetCreationAccessUser | null) {
  if (!user) return false

  const permissionCodes = permissionCodesFor(user)
  if (permissionCodes.includes(PET_CREATION_PERMISSION)) return true

  return PET_CREATION_ALLOWED_USER_IDS.includes(String(user.userId || ''))
}

export function canAccessVehicleCreation(user?: PetCreationAccessUser | null) {
  if (!user) return true
  if (String(user.role || '').toUpperCase() === 'ADMIN') return true

  const permissionCodes = permissionCodesFor(user)
  if (permissionCodes.includes(VEHICLE_CREATION_PERMISSION)) return true

  return !canAccessPetCreation(user)
}

export function isPetOnlyWorkspaceUser(user?: PetCreationAccessUser | null) {
  return canAccessPetCreation(user) && !canAccessVehicleCreation(user)
}

export function isPetCreationMenuKey(key: string): key is PetCreationMenuKey {
  return PET_CREATION_MENU_KEYS.includes(key as PetCreationMenuKey)
}

function permissionCodesFor(user: PetCreationAccessUser) {
  return [
    ...(user.permissions || []),
    ...(user.features || []),
  ].map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)
}
