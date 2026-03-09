import { useCallback } from 'react'
import { useSheetStore } from '../../store/sheetStore'
import './Toolbar.css'

export function Toolbar() {
  const { selection, setCellStyle } = useSheetStore()

  const applyStyle = useCallback((style: string, value: any) => {
    if (!selection) return
    // 获取选区范围内的所有单元格
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)
    
    const positions: { row: number; col: number }[] = []
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        positions.push({ row, col })
      }
    }
    
    setCellStyle(positions, { [style]: value })
  }, [selection, setCellStyle])

  const handleBold = () => applyStyle('fontWeight', 'bold')
  const handleItalic = () => applyStyle('fontStyle', 'italic')
  const handleAlignLeft = () => applyStyle('textAlign', 'left')
  const handleAlignCenter = () => applyStyle('textAlign', 'center')
  const handleAlignRight = () => applyStyle('textAlign', 'right')
  
  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyStyle('backgroundColor', e.target.value)
  }
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyStyle('color', e.target.value)
  }
  
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyStyle('fontSize', Number(e.target.value))
  }

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
          <input 
            type="color" 
            title="文字颜色" 
            onChange={handleColorChange}
          />
        </div>
        <div className="toolbar-color-picker">
          <input 
            type="color" 
            title="背景颜色" 
            onChange={handleBackgroundColorChange}
          />
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <select 
          className="toolbar-select" 
          title="字体大小"
          onChange={handleFontSizeChange}
          defaultValue="13"
        >
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
          <option value="13">13</option>
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
