import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { CanvasRenderer } from './components/CanvasRenderer'
import { Toolbar } from './components/Toolbar/Toolbar'
import { InsertLinkDialog } from './components/InsertLinkDialog/InsertLinkDialog'
import { InsertImageDialog } from './components/InsertImageDialog/InsertImageDialog'
import { ChartView } from './components/ChartView/ChartView'
import { useSheetStore } from './store/sheetStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWebSocket, type WSUser } from './hooks/useWebSocket'
import { Collaborators } from './components/Collaborators'
import type { CellStyle } from './types'
import './App.css'

function App() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [formulaBarValue, setFormulaBarValue] = useState('')
  const [collaborators, setCollaborators] = useState<WSUser[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sheetId: string } | null>(null)
  const [cellContextMenu, setCellContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [renameInput, setRenameInput] = useState<{ sheetId: string; name: string } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  
  // 链接和图片状态
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showChart, setShowChart] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_setChartData, _setChartType] = [useState<any[]>([]), useState<'bar' | 'line' | 'pie'>('bar')]
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const { createSheet, sheets, activeSheetId, getCell, selection, loadFromStorage, saveToStorage, setCell, setActiveSheet, deleteSheet, renameSheet, moveSheet } = useSheetStore()

  // 模拟当前用户（实际应从认证系统获取）
  const currentUser = {
    id: 'user-1',
    name: '我',
  }

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 启用键盘快捷键
  useKeyboardShortcuts()

  // WebSocket 协作
  const { connected } = useWebSocket({
    sheetId: activeSheetId || null,
    userName: currentUser.name,
    onConnected: (id) => {
      setCurrentUserId(id)
    },
    onOperation: (op) => {
      // 处理远程操作
      if (op.type === 'SET_CELL') {
        const { position, value } = op.payload
        setCell(position, value)
      }
      // TODO: 处理其他操作类型
    },
    onUsers: (users) => {
      setCollaborators(users)
    },
    onCursor: (cursor) => {
      // TODO: 显示其他用户的光标
      console.log('Cursor update:', cursor)
    },
  })

  // 加载存储的数据
  useEffect(() => {
    loadFromStorage()
    setIsLoaded(true)
  }, [loadFromStorage])

  // 初始化工作表（只有在已加载且没有数据时）
  useEffect(() => {
    if (isLoaded && sheets.length === 0 && !activeSheetId) {
      // 创建三个默认工作表
      createSheet('Sheet1', 100, 26)
      createSheet('Sheet2', 100, 26)
      createSheet('Sheet3', 100, 26)
      console.log('Created 3 default sheets')
    }
  }, [isLoaded, createSheet, sheets.length, activeSheetId])

  // 自动保存（当 sheets 或 activeSheetId 变化时）
  useEffect(() => {
    if (sheets.length > 0) {
      saveToStorage()
    }
  }, [sheets, activeSheetId, saveToStorage])

  // 更新公式栏
  useEffect(() => {
    if (selection && activeSheetId) {
      const cell = getCell(selection.focus)
      setFormulaBarValue(cell ? String(cell.value) : '')
    }
  }, [selection, activeSheetId, getCell])

  // 响应式调整 Canvas 大小
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container')
      if (container) {
        setCanvasSize({
          width: container.clientWidth,
          height: container.clientHeight,
        })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 处理公式栏变化
  const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulaBarValue(e.target.value)
  }

  // 处理公式栏确认
  const handleFormulaBarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selection) {
      setCell(selection.focus, formulaBarValue)
    }
  }

  // 处理标签页右键
  const handleSheetContextMenu = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault()
    // 菜单向上弹出，避免被标签页遮挡
    // 菜单高度约 200px，确保在可视区域内
    const menuHeight = 220
    const menuWidth = 150
    const padding = 10
    
    // 计算菜单位置，确保不超出屏幕
    let x = e.clientX
    let y = e.clientY - menuHeight
    
    // 如果上方空间不够，向下弹出
    if (y < padding) {
      y = e.clientY + padding
    }
    
    // 确保不超出右边界
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding
    }
    
    // 确保不超出左边界
    if (x < padding) {
      x = padding
    }
    
    setContextMenu({
      x,
      y,
      sheetId
    })
  }

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(null)
    setRenameInput(null)
  }

  // 删除标签页
  const handleDeleteSheet = () => {
    if (contextMenu?.sheetId) {
      deleteSheet(contextMenu.sheetId)
      closeContextMenu()
    }
  }

  // 重命名标签页
  const handleRenameSheet = () => {
    if (contextMenu?.sheetId) {
      const sheet = sheets.find((s) => s.id === contextMenu.sheetId)
      if (sheet) {
        setRenameInput({ sheetId: contextMenu.sheetId, name: sheet.name })
      }
    }
  }

  const handleRenameConfirm = () => {
    if (renameInput) {
      renameSheet(renameInput.sheetId, renameInput.name)
      setRenameInput(null)
      closeContextMenu()
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameConfirm()
    } else if (e.key === 'Escape') {
      setRenameInput(null)
      closeContextMenu()
    }
  }

  // 移动标签页
  const handleMoveLeft = () => {
    if (contextMenu?.sheetId) {
      moveSheet(contextMenu.sheetId, 'left')
      closeContextMenu()
    }
  }

  const handleMoveRight = () => {
    if (contextMenu?.sheetId) {
      moveSheet(contextMenu.sheetId, 'right')
      closeContextMenu()
    }
  }

  const handleMoveFirst = () => {
    if (contextMenu?.sheetId) {
      moveSheet(contextMenu.sheetId, 'first')
      closeContextMenu()
    }
  }

  const handleMoveLast = () => {
    if (contextMenu?.sheetId) {
      moveSheet(contextMenu.sheetId, 'last')
      closeContextMenu()
    }
  }

  // 切换标签页
  const handleSwitchSheet = (sheetId: string) => {
    setActiveSheet(sheetId)
  }

  // 新建工作表
  const handleCreateSheet = () => {
    createSheet(`Sheet${sheets.length + 1}`)
  }

  // 导出到 Excel
  const handleExportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      // 统计名称出现次数，确保导出时名称唯一
      const nameCount = new Map<string, number>()

      sheets.forEach((sheet, index) => {
        // 构建二维数组
        const data: any[][] = []
        for (let row = 0; row < sheet.rows; row++) {
          const rowData: any[] = []
          for (let col = 0; col < sheet.cols; col++) {
            const key = `${row},${col}`
            const cell = sheet.cells.get(key)
            
            // 优先导出公式（以=开头），这样 Excel 可以识别并计算
            if (cell?.formula) {
              rowData.push(cell.formula)
            } else if (cell?.value !== undefined && cell.value !== '') {
              rowData.push(cell.value)
            } else {
              rowData.push('')
            }
          }
          data.push(rowData)
        }

        const ws = XLSX.utils.aoa_to_sheet(data)
        
        // 重新遍历单元格，为公式设置正确的格式
        for (let row = 0; row < sheet.rows; row++) {
          for (let col = 0; col < sheet.cols; col++) {
            const key = `${row},${col}`
            const cell = sheet.cells.get(key)
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            
            if (cell?.formula && ws[cellRef]) {
              // 设置公式格式：f 属性存储公式（去掉=前缀）
              ws[cellRef].f = cell.formula.startsWith('=') ? cell.formula.slice(1) : cell.formula
              // 设置计算结果作为显示值
              if (cell.computedValue !== undefined) {
                ws[cellRef].v = cell.computedValue
              }
            }
          }
        }
        
        // 确保工作表名称唯一
        let sheetName = sheet.name
        const count = nameCount.get(sheetName) || 0
        if (count > 0) {
          sheetName = `${sheetName}_${count + 1}`
        }
        nameCount.set(sheet.name, count + 1)
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      })

      XLSX.writeFile(wb, 'multi-table.xlsx')
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    }
  }

  // 从 Excel 导入
  const triggerImportExcel = () => {
    document.getElementById('import-excel')?.click()
  }

  const handleImportFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result
      if (!data) return
      
      const wb = XLSX.read(data, { type: 'array' })
      
      // 导入第一个工作表
      const wsName = wb.SheetNames[0]
      const ws = wb.Sheets[wsName]
      const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      
      // 创建新工作表并填充数据
      createSheet(wsName || 'Imported', jsonData.length, jsonData[0]?.length || 26)
      
      // 填充数据
      jsonData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell !== null && cell !== undefined) {
            setCell({ row: rowIndex, col: colIndex }, String(cell))
          }
        })
      })
    }
    
    reader.readAsArrayBuffer(file)
    // 重置 input
    e.target.value = ''
  }

  // 单元格右键菜单
  const handleCellContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setCellContextMenu({ x: e.clientX, y: e.clientY })
  }

  const closeCellContextMenu = () => {
    setCellContextMenu(null)
  }

  // 复制单元格
  const handleCopyCell = async () => {
    if (!selection || !activeSheetId) return
    const sheet = sheets.find(s => s.id === activeSheetId)
    if (!sheet) return
    
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)
    
    const rows: string[] = []
    for (let row = minRow; row <= maxRow; row++) {
      const cells: string[] = []
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`
        const cell = sheet.cells.get(key)
        cells.push(cell?.value ? String(cell.value) : '')
      }
      rows.push(cells.join('\t'))
    }
    
    await navigator.clipboard.writeText(rows.join('\n'))
    closeCellContextMenu()
  }

  // 粘贴单元格
  const handlePasteCell = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text || !selection) return
      
      const rows = text.split('\n')
      const { anchor } = selection
      
      rows.forEach((rowText, rowIndex) => {
        const cells = rowText.split('\t')
        cells.forEach((cellText, colIndex) => {
          const targetRow = anchor.row + rowIndex
          const targetCol = anchor.col + colIndex
          setCell({ row: targetRow, col: targetCol }, cellText)
        })
      })
    } catch (err) {
      console.error('粘贴失败:', err)
    }
    closeCellContextMenu()
  }

  // 清除单元格
  const handleClearCell = () => {
    if (!selection) return
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        clearCell({ row, col })
      }
    }
    closeCellContextMenu()
  }

  // 设置单元格样式
  // 菜单栏菜单失去焦点自动隐藏
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 如果点击的不是菜单栏区域，关闭所有菜单
      if (!target.closest('.menubar') && !target.closest('.menubar-dropdown')) {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 右键菜单失去焦点自动隐藏
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 如果点击的不是右键菜单，关闭所有右键菜单
      if (!target.closest('.context-menu')) {
        closeContextMenu()
        closeCellContextMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [closeContextMenu, closeCellContextMenu])

  const handleSetCellStyle = (style: Partial<CellStyle>) => {
    if (!selection) return
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
    
    // 使用 Toolbar 中的 setCellStyle
    console.log('Set style:', style, positions)
    closeCellContextMenu()
  }

  // 插入链接
  // const handleInsertLink = () => {
  //   if (!selection) return
  //   setShowLinkDialog(true)
  // }

  const handleLinkConfirm = (_url: string, text: string) => {
    if (!selection) return
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`
        const sheet = sheets.find(s => s.id === activeSheetId)
        const existingCell = sheet?.cells.get(key)
        // 暂时只设置值，后续扩展 setCell 支持 link 字段
        if (existingCell) {
          setCell({ row, col }, text)
        }
      }
    }
    setShowLinkDialog(false)
  }

  // 插入图片
  // const handleInsertImage = () => {
  //   if (!selection) return
  //   setShowImageDialog(true)
  // }

  const handleImageConfirm = (_src: string) => {
    // 后续扩展 setCell 支持 image 字段
    setShowImageDialog(false)
  }

  const handleImageClick = (src: string) => {
    setImagePreview(src)
  }

  // 创建图表
  // const handleCreateChart = (type: 'bar' | 'line' | 'pie') => {
  //   if (!selection || !activeSheetId) return
  //   const sheet = sheets.find(s => s.id === activeSheetId)
  //   if (!sheet) return

  //   const { anchor, focus } = selection
  //   const minRow = Math.min(anchor.row, focus.row)
  //   const maxRow = Math.max(anchor.row, focus.row)
  //   const minCol = Math.min(anchor.col, focus.col)
  //   const maxCol = Math.max(anchor.col, focus.col)

  //   // 提取图表数据
  //   const data: any[] = []
  //   for (let row = minRow; row <= maxRow; row++) {
  //     const item: any = {}
  //     for (let col = minCol; col <= maxCol; col++) {
  //       const cell = sheet.cells.get(`${row},${col}`)
  //       const value = cell?.value ?? ''
  //       if (col === minCol) {
  //         item.name = String(value)
  //       } else {
  //         const colName = String.fromCharCode(65 + col)
  //         item[colName] = Number(value) || 0
  //       }
  //     }
  //     data.push(item)
  //   }

  //   setChartData(data)
  //   setChartType(type)
  //   setShowChart(true)
  // }

  return (
    <div className="app">
      {/* 菜单栏 */}
      <div className="menubar">
        <div 
          className={`menubar-item ${activeMenu === 'file' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          onMouseEnter={() => activeMenu && setActiveMenu('file')}
        >
          文件
        </div>
        <div 
          className={`menubar-item ${activeMenu === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
          onMouseEnter={() => activeMenu && setActiveMenu('edit')}
        >
          编辑
        </div>
        <div 
          className={`menubar-item ${activeMenu === 'format' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'format' ? null : 'format')}
          onMouseEnter={() => activeMenu && setActiveMenu('format')}
        >
          格式
        </div>
        <div 
          className={`menubar-item ${activeMenu === 'view' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
          onMouseEnter={() => activeMenu && setActiveMenu('view')}
        >
          视图
        </div>
        <div 
          className={`menubar-item ${activeMenu === 'help' ? 'active' : ''}`}
          onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
          onMouseEnter={() => activeMenu && setActiveMenu('help')}
        >
          帮助
        </div>

        {/* 文件菜单 */}
        {activeMenu === 'file' && (
          <div className="menubar-dropdown" onClick={() => setActiveMenu(null)}>
            <div className="menubar-dropdown-item" onClick={triggerImportExcel}>
              📥 导入 Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                style={{ display: 'none' }}
                id="import-excel"
              />
              <label htmlFor="import-excel" style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                cursor: 'pointer'
              }} />
            </div>
            <div className="menubar-dropdown-item" onClick={handleExportToExcel}>
              📤 导出 Excel
            </div>
          </div>
        )}

        {/* 编辑菜单 */}
        {activeMenu === 'edit' && (
          <div className="menubar-dropdown" onClick={() => setActiveMenu(null)}>
            <div className="menubar-dropdown-item" onClick={handleCopyCell}>
              📋 复制
            </div>
            <div className="menubar-dropdown-item" onClick={handlePasteCell}>
              📥 粘贴
            </div>
            <div className="menubar-dropdown-item" onClick={handleClearCell}>
              🗑️ 清除内容
            </div>
          </div>
        )}

        {/* 格式菜单 */}
        {activeMenu === 'format' && (
          <div className="menubar-dropdown" onClick={() => setActiveMenu(null)}>
            <div className="menubar-dropdown-item" onClick={() => handleSetCellStyle({ fontWeight: 'bold' })}>
              <strong>B</strong> 加粗
            </div>
            <div className="menubar-dropdown-item" onClick={() => handleSetCellStyle({ fontStyle: 'italic' })}>
              <em>I</em> 斜体
            </div>
          </div>
        )}
      </div>

      <div className="toolbar">
        <Toolbar />
        <button className="toolbar-btn-import" onClick={() => document.getElementById('import-excel-toolbar')?.click()}>
          📥 导入
        </button>
        <button className="toolbar-btn-export" onClick={handleExportToExcel}>
          📤 导出
        </button>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImportFromExcel}
          style={{ display: 'none' }}
          id="import-excel-toolbar"
        />
        <div className="formula-bar">
          <input
            type="text"
            value={formulaBarValue}
            onChange={handleFormulaBarChange}
            onKeyDown={handleFormulaBarKeyDown}
            placeholder="输入值或公式（如 =SUM(A1:A10)）"
          />
        </div>
        <div className="connection-status">
          {connected ? '🟢 已连接' : '🔴 未连接'}
        </div>
        <Collaborators users={collaborators} currentUserId={currentUserId} />
      </div>

      <div id="canvas-container" className="canvas-container">
        <CanvasRenderer width={canvasSize.width} height={canvasSize.height} isMobile={isMobile} onCellContextMenu={handleCellContextMenu} onImageClick={handleImageClick} />

        {/* 编辑覆盖层 - 由 CanvasRenderer 内部处理 */}
      </div>

      {/* 底部标签页 */}
      <div className="sheet-tabs-bottom">
        <button
          className="sheet-tab-add"
          onClick={handleCreateSheet}
          title="新建工作表"
        >
          +
        </button>
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            className={`sheet-tab ${sheet.id === activeSheetId ? 'active' : ''}`}
            onClick={() => handleSwitchSheet(sheet.id)}
            onContextMenu={(e) => handleSheetContextMenu(e, sheet.id)}
          >
            {sheet.name}
          </button>
        ))}
      </div>

      {/* 标签页右键菜单 */}
      {contextMenu && !renameInput && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            padding: '4px 0',
            zIndex: 1000,
            minWidth: '150px',
          }}
          onClick={closeContextMenu}
        >
          <div
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              handleRenameSheet()
            }}
          >
            ✏️ 重命名
          </div>
          <div
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              handleMoveLeft()
            }}
          >
            ⬅️ 向左移动
          </div>
          <div
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              handleMoveRight()
            }}
          >
            ➡️ 向右移动
          </div>
          <div
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              handleMoveFirst()
            }}
          >
            ⬆️ 移到最前
          </div>
          <div
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              handleMoveLast()
            }}
          >
            ⬇️ 移到最后
          </div>
          <div
            className={`context-menu-item ${sheets.length <= 1 ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteSheet()
            }}
          >
            🗑️ 删除工作表
          </div>
        </div>
      )}

      {/* 重命名输入框 */}
      {renameInput && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu?.x,
            top: contextMenu?.y,
            backgroundColor: 'white',
            border: '1px solid #0078d4',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            padding: '8px',
            zIndex: 1001,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={renameInput.name}
            onChange={(e) => setRenameInput({ ...renameInput, name: e.target.value })}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameConfirm}
            autoFocus
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              padding: '4px',
              width: '120px',
            }}
          />
        </div>
      )}

      {/* 单元格右键菜单 */}
      {cellContextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: cellContextMenu.x,
            top: cellContextMenu.y,
            zIndex: 1000,
            minWidth: '150px',
          }}
          onClick={closeCellContextMenu}
        >
          <div className="context-menu-item" onClick={handleCopyCell}>
            📋 复制
          </div>
          <div className="context-menu-item" onClick={handlePasteCell}>
            📥 粘贴
          </div>
          <div className="context-menu-item" onClick={handleClearCell}>
            🗑️ 清除内容
          </div>
        </div>
      )}

      {/* 插入链接对话框 */}
      {showLinkDialog && (
        <InsertLinkDialog
          onConfirm={handleLinkConfirm}
          onCancel={() => setShowLinkDialog(false)}
        />
      )}

      {/* 插入图片对话框 */}
      {showImageDialog && (
        <InsertImageDialog
          onConfirm={handleImageConfirm}
          onCancel={() => setShowImageDialog(false)}
        />
      )}

      {/* 图片预览 */}
      {imagePreview && (
        <div className="image-preview-overlay" onClick={() => setImagePreview(null)}>
          <div className="image-preview" onClick={(e) => e.stopPropagation()}>
            <img src={imagePreview} alt="预览" />
            <button onClick={() => setImagePreview(null)}>关闭</button>
          </div>
        </div>
      )}

      {/* 图表视图 */}
      {showChart && (
        <ChartView
          data={[]}
          type="bar"
          onClose={() => setShowChart(false)}
        />
      )}
    </div>
  )
}

export default App
