import { useState } from 'react'
import './InsertLinkDialog.css'

interface InsertLinkDialogProps {
  initialUrl?: string
  initialText?: string
  onConfirm: (url: string, text: string) => void
  onCancel: () => void
}

export function InsertLinkDialog({ initialUrl = '', initialText = '', onConfirm, onCancel }: InsertLinkDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [text, setText] = useState(initialText)

  const handleConfirm = () => {
    if (!url) return
    onConfirm(url, text || url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="insert-link-dialog-overlay" onClick={onCancel}>
      <div className="insert-link-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>插入链接</h3>
        <div className="form-group">
          <label>URL 地址</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>显示文本</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="链接文本"
          />
        </div>
        <div className="dialog-actions">
          <button onClick={onCancel}>取消</button>
          <button onClick={handleConfirm} disabled={!url} className="primary">
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
