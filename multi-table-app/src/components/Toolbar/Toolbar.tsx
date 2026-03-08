import { useCallback } from 'react'
import './Toolbar.css'

export function Toolbar() {
  const applyStyle = useCallback((style: string, value: any) => {
    // TODO: 实现样式应用
    console.log('Apply style:', style, value)
  }, [])

  const handleBold = () => applyStyle('fontWeight', 'bold')
  const handleItalic = () => applyStyle('fontStyle', 'italic')
  const handleAlignLeft = () => applyStyle('textAlign', 'left')
  const handleAlignCenter = () => applyStyle('textAlign', 'center')
  const handleAlignRight = () => applyStyle('textAlign', 'right')

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleBold} title="加粗 (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button className="toolbar-btn" onClick={handleItalic} title="斜体 (Ctrl+I)">
          <em>I</em>
        </button>
        <button className="toolbar-btn" title="下划线 (Ctrl+U)">
          <u>U</u>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleAlignLeft} title="左对齐">
          ⫷
        </button>
        <button className="toolbar-btn" onClick={handleAlignCenter} title="居中">
          ≡
        </button>
        <button className="toolbar-btn" onClick={handleAlignRight} title="右对齐">
          ⫸
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <div className="toolbar-color-picker">
          <input type="color" title="文字颜色" />
        </div>
        <div className="toolbar-color-picker">
          <input type="color" title="背景颜色" />
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <select className="toolbar-select" title="字体大小">
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
          <option value="24">24</option>
        </select>
      </div>
    </div>
  )
}
