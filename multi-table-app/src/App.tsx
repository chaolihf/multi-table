import { useEffect, useState } from 'react'
import { CanvasRenderer } from './components/CanvasRenderer'
import { useSheetStore } from './store/sheetStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWebSocket, type WSUser } from './hooks/useWebSocket'
import { Collaborators } from './components/Collaborators'
import './App.css'

function App() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [formulaBarValue, setFormulaBarValue] = useState('')
  const [collaborators, setCollaborators] = useState<WSUser[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const { createSheet, sheets, activeSheetId, getCell, selection, loadFromStorage, saveToStorage, setCell } = useSheetStore()

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
  }, [loadFromStorage])

  // 初始化工作表（如果没有数据）
  useEffect(() => {
    if (sheets.length === 0 && !activeSheetId) {
      const newSheet = createSheet('Sheet1', 100, 26)
      console.log('Created initial sheet:', newSheet.id)
    }
  }, [createSheet, sheets.length, activeSheetId])

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Multi-Table</h1>
      </header>

      <div className="toolbar">
        <button onClick={() => createSheet(`Sheet${sheets.length + 1}`)}>+ 新建工作表</button>
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
        <div className="sheet-tabs">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              className={`sheet-tab ${sheet.id === activeSheetId ? 'active' : ''}`}
              onClick={() => createSheet(sheet.name)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      </div>

      <div id="canvas-container" className="canvas-container">
        <CanvasRenderer width={canvasSize.width} height={canvasSize.height} isMobile={isMobile} />

        {/* 编辑覆盖层 - 由 CanvasRenderer 内部处理 */}
      </div>
    </div>
  )
}

export default App
