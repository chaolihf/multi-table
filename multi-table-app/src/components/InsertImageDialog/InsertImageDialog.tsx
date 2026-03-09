import { useState, useRef } from 'react'
import './InsertImageDialog.css'

interface InsertImageDialogProps {
  initialSrc?: string
  onConfirm: (src: string) => void
  onCancel: () => void
}

export function InsertImageDialog({ initialSrc = '', onConfirm, onCancel }: InsertImageDialogProps) {
  const [imageUrl, setImageUrl] = useState(initialSrc)
  const [preview, setPreview] = useState(initialSrc)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 限制文件大小 100KB
    if (file.size > 100 * 1024) {
      alert('图片大小不能超过 100KB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setImageUrl(result)
      setPreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    setPreview(e.target.value)
  }

  const handleConfirm = () => {
    if (!imageUrl) return
    onConfirm(imageUrl)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="insert-image-dialog-overlay" onClick={onCancel}>
      <div className="insert-image-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>插入图片</h3>
        
        <div className="form-group">
          <label>上传图片</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          <small>支持 JPG、PNG、GIF 格式，最大 100KB</small>
        </div>

        <div className="form-group">
          <label>或输入图片 URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {preview && (
          <div className="preview-group">
            <label>预览</label>
            <div className="preview-container">
              <img src={preview} alt="预览" />
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <button onClick={onCancel}>取消</button>
          <button onClick={handleConfirm} disabled={!imageUrl} className="primary">
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
