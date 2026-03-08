import { useState } from 'react'
import type { UserRole, SheetPermissions, UserInfo } from '../../utils/permissions'
import { addUserPermission, removeUserPermission } from '../../utils/permissions'
import './PermissionDialog.css'

interface PermissionDialogProps {
  isOpen: boolean
  onClose: () => void
  permissions: SheetPermissions
  currentUser: UserInfo
  onSave: (permissions: SheetPermissions) => void
}

export function PermissionDialog({ isOpen, onClose, permissions, currentUser, onSave }: PermissionDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [userIdInput, setUserIdInput] = useState('')
  const [userNameInput, setUserNameInput] = useState('')
  const [userRoleInput, setUserRoleInput] = useState<UserRole>('viewer')

  if (!isOpen) return null

  const handleAddUser = () => {
    if (!userIdInput.trim() || !userNameInput.trim()) return

    const updatedPermissions = { ...permissions, users: new Map(permissions.users) }
    addUserPermission(updatedPermissions, userIdInput, userRoleInput)
    onSave(updatedPermissions)

    setUserIdInput('')
    setUserNameInput('')
    setUserRoleInput('viewer')
    setShowAddForm(false)
  }

  const handleRemoveUser = (userId: string) => {
    const updatedPermissions = { ...permissions, users: new Map(permissions.users) }
    removeUserPermission(updatedPermissions, userId)
    onSave(updatedPermissions)
  }

  const handleRoleChange = (userId: string, role: UserRole) => {
    const updatedPermissions = { ...permissions, users: new Map(permissions.users) }
    updatedPermissions.users.set(userId, role)
    onSave(updatedPermissions)
  }

  return (
    <div className="permission-dialog-overlay" onClick={onClose}>
      <div className="permission-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="permission-dialog-header">
          <h2>共享设置</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="permission-dialog-content">
          {/* 当前用户列表 */}
          <div className="user-list">
            <h3>有访问权限的用户</h3>
            
            {/* 所有者 */}
            <div className="user-item">
              <div className="user-info">
                <span className="user-name">{currentUser.name} (所有者)</span>
                <span className="user-email">{currentUser.id}</span>
              </div>
              <span className="user-role owner">所有者</span>
            </div>

            {/* 已添加的用户 */}
            {Array.from(permissions.users.entries()).map(([userId, role]) => (
              <div key={userId} className="user-item">
                <div className="user-info">
                  <span className="user-name">用户 {userId.slice(0, 8)}</span>
                  <span className="user-email">{userId}</span>
                </div>
                <div className="user-actions">
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(userId, e.target.value as UserRole)}
                    className="role-select"
                  >
                    <option value="viewer">查看者</option>
                    <option value="editor">编辑者</option>
                    <option value="admin">管理员</option>
                  </select>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveUser(userId)}
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 添加新用户 */}
          <div className="add-user-section">
            <h3>添加用户</h3>
            {showAddForm ? (
              <div className="add-user-form">
                <input
                  type="text"
                  placeholder="用户 ID"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="用户名称"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  className="input-field"
                />
                <select
                  value={userRoleInput}
                  onChange={(e) => setUserRoleInput(e.target.value as UserRole)}
                  className="role-select"
                >
                  <option value="viewer">查看者</option>
                  <option value="editor">编辑者</option>
                  <option value="admin">管理员</option>
                </select>
                <div className="form-actions">
                  <button onClick={handleAddUser} className="confirm-btn">
                    添加
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="cancel-btn">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)} className="add-user-btn">
                + 添加用户
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
