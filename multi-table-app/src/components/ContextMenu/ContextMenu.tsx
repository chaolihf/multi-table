import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onCopy: () => void
  onPaste: () => void
  onCut: () => void
  onClear: () => void
  onDeleteRow: () => void
  onDeleteColumn: () => void
  onInsertRow: () => void
  onInsertColumn: () => void
}

export function ContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onPaste,
  onCut,
  onClear,
  onDeleteRow,
  onDeleteColumn,
  onInsertRow,
  onInsertColumn,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    padding: '4px 0',
    zIndex: 1000,
    minWidth: '180px',
  }

  const menuItemStyle: React.CSSProperties = {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#333',
  }

  const separatorStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '4px 0',
  }

  return (
    <div ref={menuRef} style={menuStyle}>
      <div style={menuItemStyle} onClick={onCopy}>
        📋 复制
      </div>
      <div style={menuItemStyle} onClick={onPaste}>
        📥 粘贴
      </div>
      <div style={menuItemStyle} onClick={onCut}>
        ✂️ 剪切
      </div>
      <div style={separatorStyle} />
      <div style={menuItemStyle} onClick={onClear}>
        🗑️ 清除内容
      </div>
      <div style={separatorStyle} />
      <div style={menuItemStyle} onClick={onInsertRow}>
        ⬇️ 插入行
      </div>
      <div style={menuItemStyle} onClick={onInsertColumn}>
        ➡️ 插入列
      </div>
      <div style={separatorStyle} />
      <div style={menuItemStyle} onClick={onDeleteRow}>
        ❌ 删除行
      </div>
      <div style={menuItemStyle} onClick={onDeleteColumn}>
        ❌ 删除列
      </div>
    </div>
  )
}
