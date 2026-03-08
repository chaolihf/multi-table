import { describe, it, expect } from 'vitest'
import {
  checkPermission,
  ROLE_PERMISSIONS,
  createDefaultPermissions,
  addUserPermission,
  removeUserPermission,
  addRegionPermission,
  removeRegionPermission,
} from '../utils/permissions'

describe('Permissions', () => {
  describe('ROLE_PERMISSIONS', () => {
    it('should have correct admin permissions', () => {
      expect(ROLE_PERMISSIONS.admin).toEqual({
        canView: true,
        canEdit: true,
        canShare: true,
        canDelete: true,
      })
    })

    it('should have correct editor permissions', () => {
      expect(ROLE_PERMISSIONS.editor).toEqual({
        canView: true,
        canEdit: true,
        canShare: false,
        canDelete: false,
      })
    })

    it('should have correct viewer permissions', () => {
      expect(ROLE_PERMISSIONS.viewer).toEqual({
        canView: true,
        canEdit: false,
        canShare: false,
        canDelete: false,
      })
    })
  })

  describe('createDefaultPermissions', () => {
    it('should create default permissions with owner', () => {
      const permissions = createDefaultPermissions('sheet-1', 'user-1')
      expect(permissions.sheetId).toBe('sheet-1')
      expect(permissions.owner).toBe('user-1')
      expect(permissions.defaultRole).toBe('viewer')
      expect(permissions.users.size).toBe(0)
      expect(permissions.regions).toEqual([])
    })
  })

  describe('checkPermission', () => {
    it('should return true for owner', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      const owner = { id: 'owner-1', name: 'Owner', role: 'admin' as const }
      expect(checkPermission(owner, permissions)).toBe(true)
    })

    it('should return false for null user', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      expect(checkPermission(null, permissions)).toBe(false)
    })

    it('should check user role permissions', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      permissions.users.set('user-1', 'editor')

      const user = { id: 'user-1', name: 'User', role: 'editor' as const }
      expect(checkPermission(user, permissions, undefined, 'edit')).toBe(true)
      expect(checkPermission(user, permissions, undefined, 'delete')).toBe(false)
    })

    it('should use default role for unknown user', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      permissions.defaultRole = 'viewer'

      const user = { id: 'unknown', name: 'Unknown', role: 'viewer' as const }
      expect(checkPermission(user, permissions, undefined, 'edit')).toBe(false)
      expect(checkPermission(user, permissions, undefined, 'view')).toBe(true)
    })
  })

  describe('addUserPermission', () => {
    it('should add user with specified role', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      addUserPermission(permissions, 'user-1', 'editor')
      expect(permissions.users.get('user-1')).toBe('editor')
    })
  })

  describe('removeUserPermission', () => {
    it('should remove user permission', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      permissions.users.set('user-1', 'editor')
      removeUserPermission(permissions, 'user-1')
      expect(permissions.users.has('user-1')).toBe(false)
    })
  })

  describe('addRegionPermission', () => {
    it('should add region permission', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      const region = addRegionPermission(permissions, {
        sheetId: 'sheet-1',
        startRow: 0,
        endRow: 10,
        startCol: 0,
        endCol: 5,
        users: ['user-1'],
        role: 'editor',
      })
      expect(permissions.regions.length).toBe(1)
      expect(region.id).toBeDefined()
      expect(region.startRow).toBe(0)
    })
  })

  describe('removeRegionPermission', () => {
    it('should remove region permission', () => {
      const permissions = createDefaultPermissions('sheet-1', 'owner-1')
      const region = addRegionPermission(permissions, {
        sheetId: 'sheet-1',
        startRow: 0,
        endRow: 10,
        startCol: 0,
        endCol: 5,
        users: ['user-1'],
        role: 'editor',
      })
      removeRegionPermission(permissions, region.id)
      expect(permissions.regions.length).toBe(0)
    })
  })
})
