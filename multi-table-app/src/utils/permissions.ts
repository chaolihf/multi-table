/**
 * 用户角色
 */
export type UserRole = 'admin' | 'editor' | 'viewer'

/**
 * 权限级别
 */
export interface Permission {
  canView: boolean
  canEdit: boolean
  canShare: boolean
  canDelete: boolean
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: string
  name: string
  email?: string
  role: UserRole
}

/**
 * 区域权限
 */
export interface RegionPermission {
  id: string
  sheetId: string
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  users: string[] // 用户 ID 列表
  role: UserRole
}

/**
 * 工作表权限配置
 */
export interface SheetPermissions {
  sheetId: string
  owner: string // 所有者用户 ID
  defaultRole: UserRole // 默认角色
  users: Map<string, UserRole> // 用户权限映射
  regions: RegionPermission[] // 区域权限
}

/**
 * 角色对应的权限
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    canView: true,
    canEdit: true,
    canShare: true,
    canDelete: true,
  },
  editor: {
    canView: true,
    canEdit: true,
    canShare: false,
    canDelete: false,
  },
  viewer: {
    canView: true,
    canEdit: false,
    canShare: false,
    canDelete: false,
  },
}

/**
 * 检查用户是否有指定权限
 */
export function checkPermission(
  user: UserInfo | null,
  sheetPermissions: SheetPermissions,
  position?: { row: number; col: number },
  action: 'view' | 'edit' | 'share' | 'delete' = 'view'
): boolean {
  if (!user) return false

  // 所有者拥有所有权限
  if (user.id === sheetPermissions.owner) return true

  // 获取用户角色
  let userRole = sheetPermissions.users.get(user.id) || sheetPermissions.defaultRole

  // 检查区域权限
  if (position) {
    for (const region of sheetPermissions.regions) {
      if (
        position.row >= region.startRow &&
        position.row <= region.endRow &&
        position.col >= region.startCol &&
        position.col <= region.endCol
      ) {
        // 用户在区域内，检查区域权限
        if (region.users.includes(user.id)) {
          userRole = region.role
          break
        }
      }
    }
  }

  // 获取角色权限
  const permissions = ROLE_PERMISSIONS[userRole]

  // 检查具体操作权限
  switch (action) {
    case 'view':
      return permissions.canView
    case 'edit':
      return permissions.canEdit
    case 'share':
      return permissions.canShare
    case 'delete':
      return permissions.canDelete
    default:
      return false
  }
}

/**
 * 创建默认权限配置
 */
export function createDefaultPermissions(sheetId: string, ownerId: string): SheetPermissions {
  return {
    sheetId,
    owner: ownerId,
    defaultRole: 'viewer',
    users: new Map(),
    regions: [],
  }
}

/**
 * 添加用户权限
 */
export function addUserPermission(
  permissions: SheetPermissions,
  userId: string,
  role: UserRole
): void {
  permissions.users.set(userId, role)
}

/**
 * 移除用户权限
 */
export function removeUserPermission(permissions: SheetPermissions, userId: string): void {
  permissions.users.delete(userId)
}

/**
 * 添加区域权限
 */
export function addRegionPermission(
  permissions: SheetPermissions,
  region: Omit<RegionPermission, 'id'>
): RegionPermission {
  const newRegion: RegionPermission = {
    ...region,
    id: `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
  permissions.regions.push(newRegion)
  return newRegion
}

/**
 * 移除区域权限
 */
export function removeRegionPermission(permissions: SheetPermissions, regionId: string): void {
  const index = permissions.regions.findIndex((r) => r.id === regionId)
  if (index !== -1) {
    permissions.regions.splice(index, 1)
  }
}
