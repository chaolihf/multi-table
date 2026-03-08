import { useRef, useEffect, useCallback, useState } from 'react'
import { useSheetStore } from '../../store/sheetStore'
import type { CellPosition } from '../../types'
import { ContextMenu } from '../ContextMenu'

interface CanvasRendererProps {
  width: number
  height: number
  isMobile?: boolean
}

interface Viewport {
  startX: number
  startY: number
  endX: number
  endY: number
  scrollLeft: number
  scrollTop: number
}

const ROW_HEADER_WIDTH = 50
const COL_HEADER_HEIGHT = 30

export function CanvasRenderer({ width, height }: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { sheets, activeSheetId, selection, setSelection, setEditingCell, getCell, setCell, setColumnWidth, setRowHeight, insertRow, insertColumn, deleteRow, deleteColumn, clearCell } = useSheetStore()

  // 编辑状态
  const [editingCell, setEditingCellLocal] = useState<CellPosition | null>(null)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 拖动调整状态
  const [resizing, setResizing] = useState<{
    type: 'col' | 'row'
    index: number
    startX: number
    startY: number
    startSize: number
  } | null>(null)

  // 滚动状态
  const scrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 })

  // 获取当前工作表
  const activeSheet = sheets.find((s) => s.id === activeSheetId)

  // 获取单元格 X 偏移量
  const getCellOffsetX = useCallback((col: number, sheet: typeof activeSheet) => {
    if (!sheet) return 0
    let offset = 0
    for (let i = 0; i < col; i++) {
      offset += sheet.colWidths[i] || 100
    }
    return offset
  }, [])

  // 获取单元格 Y 偏移量
  const getCellOffsetY = useCallback((row: number, sheet: typeof activeSheet) => {
    if (!sheet) return 0
    let offset = 0
    for (let i = 0; i < row; i++) {
      offset += sheet.rowHeights[i] || 25
    }
    return offset
  }, [])

  // 处理编辑完成
  const handleEditComplete = useCallback((value: string) => {
    if (editingCell) {
      setCell(editingCell, value)
      setEditingCellLocal(null)
      setEditingCell(null)
    }
  }, [editingCell, setCell, setEditingCell])

  // 处理编辑取消
  const handleEditCancel = useCallback(() => {
    setEditingCellLocal(null)
    setEditingCell(null)
  }, [setEditingCell])

  // 处理拖动调整开始
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>, type: 'col' | 'row', index: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!activeSheet) return
    
    const startSize = type === 'col' 
      ? (activeSheet.colWidths[index] || 100)
      : (activeSheet.rowHeights[index] || 25)
    
    setResizing({
      type,
      index,
      startX: e.clientX,
      startY: e.clientY,
      startSize,
    })
  }, [activeSheet])

  // 处理拖动调整
  const handleResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!resizing || !activeSheet) return

    const delta = resizing.type === 'col'
      ? e.clientX - resizing.startX
      : e.clientY - resizing.startY

    const newSize = Math.max(20, resizing.startSize + delta) // 最小 20px

    if (resizing.type === 'col') {
      setColumnWidth(resizing.index, newSize)
    } else {
      setRowHeight(resizing.index, newSize)
    }
  }, [resizing, activeSheet, setColumnWidth, setRowHeight])

  // 处理拖动调整结束
  const handleResizeEnd = useCallback(() => {
    setResizing(null)
  }, [])

  // 计算可视区域
  const getViewport = useCallback((): Viewport => {
    if (!activeSheet) {
      return { startX: 0, startY: 0, endX: 0, endY: 0, scrollLeft: 0, scrollTop: 0 }
    }

    const { left: scrollLeft, top: scrollTop } = scrollRef.current

    return {
      startX: 0,
      startY: 0,
      endX: activeSheet.cols,
      endY: activeSheet.rows,
      scrollLeft,
      scrollTop,
    }
  }, [activeSheet])

  // 绘制网格
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
      if (!activeSheet) return

      ctx.strokeStyle = '#d0d0d0'
      ctx.lineWidth = 1

      let x = ROW_HEADER_WIDTH - viewport.scrollLeft
      let y = COL_HEADER_HEIGHT - viewport.scrollTop

      // 绘制垂直线（列）
      for (let col = 0; col <= activeSheet.cols; col++) {
        if (x >= -1 && x <= width) {
          ctx.beginPath()
          ctx.moveTo(x, COL_HEADER_HEIGHT - viewport.scrollTop)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        if (col < activeSheet.cols) {
          x += activeSheet.colWidths[col]
        }
      }

      // 绘制水平线（行）
      x = ROW_HEADER_WIDTH - viewport.scrollLeft
      y = COL_HEADER_HEIGHT - viewport.scrollTop
      for (let row = 0; row <= activeSheet.rows; row++) {
        if (y >= -1 && y <= height) {
          ctx.beginPath()
          ctx.moveTo(ROW_HEADER_WIDTH - viewport.scrollLeft, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
        if (row < activeSheet.rows) {
          y += activeSheet.rowHeights[row]
        }
      }

      // 绘制行列标题分割线（更粗的线）
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ROW_HEADER_WIDTH - viewport.scrollLeft, COL_HEADER_HEIGHT - viewport.scrollTop)
      ctx.lineTo(width, COL_HEADER_HEIGHT - viewport.scrollTop)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ROW_HEADER_WIDTH - viewport.scrollLeft, COL_HEADER_HEIGHT - viewport.scrollTop)
      ctx.moveTo(ROW_HEADER_WIDTH - viewport.scrollLeft, COL_HEADER_HEIGHT - viewport.scrollTop)
      ctx.lineTo(ROW_HEADER_WIDTH - viewport.scrollLeft, height)
      ctx.stroke()
    },
    [activeSheet, width, height]
  )

  // 绘制列标题
  const drawColumnHeaders = useCallback(
    (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
      if (!activeSheet) return

      ctx.fillStyle = '#f8f9fa'
      ctx.fillRect(0, 0, width, COL_HEADER_HEIGHT)

      ctx.strokeStyle = '#d0d0d0'
      ctx.lineWidth = 1
      ctx.strokeRect(0, 0, width, COL_HEADER_HEIGHT)

      ctx.fillStyle = '#333'
      ctx.font = '13px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      let x = ROW_HEADER_WIDTH - viewport.scrollLeft
      for (let col = 0; col < activeSheet.cols; col++) {
        const colWidth = activeSheet.colWidths[col]
        if (x + colWidth > 0 && x < width) {
          const colLabel = String.fromCharCode(65 + (col % 26))
          const prefix = col >= 26 ? String.fromCharCode(65 + Math.floor(col / 26) - 1) : ''
          ctx.fillText(prefix + colLabel, x + colWidth / 2, COL_HEADER_HEIGHT / 2)
        }
        x += colWidth
      }
    },
    [activeSheet, width]
  )

  // 绘制行标题
  const drawRowHeaders = useCallback(
    (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
      if (!activeSheet) return

      ctx.fillStyle = '#f8f9fa'
      ctx.fillRect(0, 0, ROW_HEADER_WIDTH, height)

      ctx.strokeStyle = '#d0d0d0'
      ctx.lineWidth = 1
      ctx.strokeRect(0, 0, ROW_HEADER_WIDTH, height)

      ctx.fillStyle = '#333'
      ctx.font = '13px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      let y = COL_HEADER_HEIGHT - viewport.scrollTop
      for (let row = 0; row < activeSheet.rows; row++) {
        const rowHeight = activeSheet.rowHeights[row]
        if (y + rowHeight > 0 && y < height) {
          ctx.fillText(String(row + 1), ROW_HEADER_WIDTH / 2, y + rowHeight / 2)
        }
        y += rowHeight
      }
    },
    [activeSheet, height]
  )

  // 绘制单元格内容
  const drawCells = useCallback(
    (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
      if (!activeSheet) return

      let x = ROW_HEADER_WIDTH - viewport.scrollLeft
      let y = COL_HEADER_HEIGHT - viewport.scrollTop

      for (let row = 0; row < activeSheet.rows; row++) {
        const rowHeight = activeSheet.rowHeights[row]
        x = ROW_HEADER_WIDTH - viewport.scrollLeft

        for (let col = 0; col < activeSheet.cols; col++) {
          const colWidth = activeSheet.colWidths[col]

          // 只在可视区域内绘制
          if (x + colWidth > ROW_HEADER_WIDTH && x < width && y + rowHeight > COL_HEADER_HEIGHT && y < height) {
            const key = `${row},${col}`
            const cell = activeSheet.cells.get(key)

            if (cell) {
              // 绘制背景
              if (cell.style?.backgroundColor) {
                ctx.fillStyle = cell.style.backgroundColor
                ctx.fillRect(x + 1, y + 1, colWidth - 2, rowHeight - 2)
              }

              // 绘制内容
              const value = cell.computedValue ?? cell.value
              ctx.fillStyle = cell.style?.color || '#000'
              ctx.font = `${cell.style?.fontWeight || 'normal'} ${cell.style?.fontSize || 13}px ${cell.style?.fontFamily || 'Arial'}`
              ctx.textAlign = cell.style?.textAlign || 'left'
              ctx.textBaseline = cell.style?.verticalAlign || 'middle'

              const padding = 4
              const textX =
                cell.style?.textAlign === 'center'
                  ? x + colWidth / 2
                  : cell.style?.textAlign === 'right'
                    ? x + colWidth - padding
                    : x + padding
              const textY = y + rowHeight / 2

              ctx.fillText(String(value), textX, textY)
            }
          }
          x += colWidth
        }
        y += rowHeight
      }
    },
    [activeSheet, width, height]
  )

  // 绘制选区
  const drawSelection = useCallback(
    (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
      if (!activeSheet || !selection) return

      const { anchor, focus } = selection
      const minRow = Math.min(anchor.row, focus.row)
      const maxRow = Math.max(anchor.row, focus.row)
      const minCol = Math.min(anchor.col, focus.col)
      const maxCol = Math.max(anchor.col, focus.col)

      let x = ROW_HEADER_WIDTH - viewport.scrollLeft
      let y = COL_HEADER_HEIGHT - viewport.scrollTop

      // 计算选区起始位置
      for (let col = 0; col < minCol; col++) {
        x += activeSheet.colWidths[col]
      }
      const startX = x

      for (let row = 0; row < minRow; row++) {
        y += activeSheet.rowHeights[row]
      }
      const startY = y

      // 计算选区宽高
      let selectionWidth = 0
      for (let col = minCol; col <= maxCol; col++) {
        selectionWidth += activeSheet.colWidths[col]
      }

      let selectionHeight = 0
      for (let row = minRow; row <= maxRow; row++) {
        selectionHeight += activeSheet.rowHeights[row]
      }

      // 绘制选区背景
      ctx.fillStyle = 'rgba(0, 120, 215, 0.1)'
      ctx.fillRect(startX, startY, selectionWidth, selectionHeight)

      // 绘制选区边框
      ctx.strokeStyle = '#0078d4'
      ctx.lineWidth = 2
      ctx.strokeRect(startX, startY, selectionWidth, selectionHeight)
    },
    [activeSheet, selection]
  )

  // 主绘制函数
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const viewport = getViewport()

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 绘制背景
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)

    // 绘制各层
    drawColumnHeaders(ctx, viewport)
    drawRowHeaders(ctx, viewport)
    drawGrid(ctx, viewport)
    drawCells(ctx, viewport)
    drawSelection(ctx, viewport)
  }, [getViewport, drawColumnHeaders, drawRowHeaders, drawGrid, drawCells, drawSelection, width, height])

  // 初始化 Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }

    render()
  }, [width, height, render])

  // 处理滚动
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      scrollRef.current = {
        left: target.scrollLeft,
        top: target.scrollTop,
      }
      // 使用 requestAnimationFrame 确保流畅滚动
      requestAnimationFrame(() => {
        render()
      })
    },
    [render]
  )

  // 处理触摸开始
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!activeSheet) return
      const touch = e.touches[0]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = touch.clientX - rect.left + scrollRef.current.left
      const y = touch.clientY - rect.top + scrollRef.current.top

      // 计算点击的行列
      let col = -1
      let row = -1

      // 检查是否点击在行/列标题上
      if (x < ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        let yAccum = COL_HEADER_HEIGHT
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y >= yAccum && y < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
        }
        if (row >= 0) {
          setSelection({ anchor: { row, col: 0 }, focus: { row, col: activeSheet.cols - 1 } })
          return
        }
      } else if (y < COL_HEADER_HEIGHT && x >= ROW_HEADER_WIDTH) {
        let xAccum = ROW_HEADER_WIDTH
        for (let c = 0; c < activeSheet.cols; c++) {
          if (x >= xAccum && x < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
        }
        if (col >= 0) {
          setSelection({ anchor: { row: 0, col }, focus: { row: activeSheet.rows - 1, col } })
          return
        }
      } else if (x >= ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        let xAccum = ROW_HEADER_WIDTH
        let yAccum = COL_HEADER_HEIGHT
        for (let c = 0; c < activeSheet.cols; c++) {
          if (x < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
          col = c
        }
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
          row = r
        }
      }

      if (row < 0 || col < 0) return

      const position: CellPosition = { row, col }
      setSelection({ anchor: position, focus: position })

      // 存储触摸起始位置用于判断是否为长按
      ;(containerRef.current as any)._touchStart = { x, y, row, col, time: Date.now() }
    },
    [activeSheet, setSelection]
  )

  // 处理触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!activeSheet || !selection) return
      const touch = e.touches[0]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = touch.clientX - rect.left + scrollRef.current.left
      const y = touch.clientY - rect.top + scrollRef.current.top

      // 计算触摸位置对应的行列
      let col = -1
      let row = -1
      let xAccum = ROW_HEADER_WIDTH
      let yAccum = COL_HEADER_HEIGHT

      for (let c = 0; c < activeSheet.cols; c++) {
        if (x < xAccum + activeSheet.colWidths[c]) {
          col = c
          break
        }
        xAccum += activeSheet.colWidths[c]
        col = c
      }
      for (let r = 0; r < activeSheet.rows; r++) {
        if (y < yAccum + activeSheet.rowHeights[r]) {
          row = r
          break
        }
        yAccum += activeSheet.rowHeights[r]
        row = r
      }

      if (row >= 0 && col >= 0) {
        // 扩展选区
        setSelection({ ...selection, focus: { row, col } })
      }
    },
    [activeSheet, selection, setSelection]
  )

  // 处理键盘输入（直接输入内容）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selection || !activeSheet) return
      
      // 如果已经在编辑模式，不处理
      if (editingCell) return

      // 如果是字母、数字或符号键，直接进入编辑模式
      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault()
        const { anchor } = selection
        setEditingCellLocal(anchor)
        // 将按键值传递给编辑框
        setTimeout(() => {
          const editor = document.querySelector('.cell-editor') as HTMLInputElement
          if (editor) {
            editor.value = e.key
            editor.focus()
            editor.setSelectionRange(1, 1)
          }
        }, 0)
      } else if (e.key === 'F2') {
        // F2 进入编辑模式
        e.preventDefault()
        const { anchor } = selection
        const cell = getCell(anchor)
        setEditingCellLocal(anchor)
        setTimeout(() => {
          const editor = document.querySelector('.cell-editor') as HTMLInputElement
          if (editor) {
            editor.value = cell?.value ? String(cell.value) : ''
            editor.focus()
            editor.setSelectionRange(editor.value.length, editor.value.length)
          }
        }, 0)
      }
    },
    [selection, activeSheet, editingCell, getCell]
  )

  // 处理触摸结束
  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent<HTMLDivElement>) => {
      const touchStart = (containerRef.current as any)._touchStart
      if (!touchStart) return

      const touchDuration = Date.now() - touchStart.time
      // 长按超过 500ms 进入编辑模式
      if (touchDuration > 500) {
        const cell = getCell({ row: touchStart.row, col: touchStart.col })
        setEditingCell({ row: touchStart.row, col: touchStart.col }, cell ? String(cell.value) : '')
      }
      delete (containerRef.current as any)._touchStart
    },
    [getCell, setEditingCell]
  )

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeSheet) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left + scrollRef.current.left
      const y = e.clientY - rect.top + scrollRef.current.top

      // 检查是否点击在行/列标题的边框上（用于调整大小）
      if (y < COL_HEADER_HEIGHT && x >= ROW_HEADER_WIDTH) {
        // 检查是否在列边框附近
        let xAccum = ROW_HEADER_WIDTH
        for (let c = 0; c < activeSheet.cols; c++) {
          const colWidth = activeSheet.colWidths[c] || 100
          if (Math.abs(x - (xAccum + colWidth)) < 5) {
            // 点击在列边框上，不处理选择
            return
          }
          xAccum += colWidth
        }
      }

      // 计算点击的行列
      let col = -1
      let row = -1

      // 检查是否点击在行/列标题上
      if (x < ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        // 行标题 - 选择整行
        let yAccum = COL_HEADER_HEIGHT
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y >= yAccum && y < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
        }
        if (row >= 0) {
          setSelection({ anchor: { row, col: 0 }, focus: { row, col: activeSheet.cols - 1 } })
          return
        }
      } else if (y < COL_HEADER_HEIGHT && x >= ROW_HEADER_WIDTH) {
        // 列标题 - 选择整列
        let xAccum = ROW_HEADER_WIDTH
        for (let c = 0; c < activeSheet.cols; c++) {
          if (x >= xAccum && x < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
        }
        if (col >= 0) {
          setSelection({ anchor: { row: 0, col }, focus: { row: activeSheet.rows - 1, col } })
          return
        }
      } else if (x >= ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        // 数据区域
        let xAccum = ROW_HEADER_WIDTH
        let yAccum = COL_HEADER_HEIGHT
        for (let c = 0; c < activeSheet.cols; c++) {
          if (x < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
          col = c
        }
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
          row = r
        }
      }

      if (row < 0 || col < 0) return

      const position: CellPosition = { row, col }

      // 如果已经在编辑模式，先保存编辑内容
      if (editingCell) {
        // 不自动保存，让用户手动保存
      }

      if (e.shiftKey && selection) {
        // Shift+ 点击扩展选区（保持锚点不变）
        setSelection({ anchor: selection.anchor, focus: position })
      } else {
        // 普通点击 - 设置新选区
        setSelection({ anchor: position, focus: position })
      }

      // 双击进入编辑模式
      if (e.detail === 2) {
        setEditingCellLocal(position)
      }
    },
    [activeSheet, setSelection, getCell, selection]
  )

  // 处理鼠标拖动（扩展选区）
  const handleMouseDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeSheet || !selection) return
      if (e.buttons !== 1) return // 只在左键按下时拖动

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left + scrollRef.current.left
      const y = e.clientY - rect.top + scrollRef.current.top

      // 计算拖动位置的行列
      let col = -1
      let row = -1
      let xAccum = ROW_HEADER_WIDTH
      let yAccum = COL_HEADER_HEIGHT

      for (let c = 0; c < activeSheet.cols; c++) {
        if (x < xAccum + activeSheet.colWidths[c]) {
          col = c
          break
        }
        xAccum += activeSheet.colWidths[c]
        col = c
      }
      for (let r = 0; r < activeSheet.rows; r++) {
        if (y < yAccum + activeSheet.rowHeights[r]) {
          row = r
          break
        }
        yAccum += activeSheet.rowHeights[r]
        row = r
      }

      if (row >= 0 && col >= 0) {
        // 扩展选区
        setSelection({ ...selection, focus: { row, col } })
      }
    },
    [activeSheet, selection, setSelection]
  )

  // 处理右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setContextMenu({ x, y })
    },
    []
  )

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // 右键菜单操作
  const handleCopy = useCallback(async () => {
    if (!selection) return
    const cells = activeSheet?.cells || new Map()
    await navigator.clipboard.writeText(
      Array.from(cells.entries())
        .map(([_, cell]) => cell.value)
        .join('\t')
    )
    closeContextMenu()
  }, [selection, activeSheet, closeContextMenu])

  const handlePaste = useCallback(async () => {
    closeContextMenu()
  }, [closeContextMenu])

  const handleCut = useCallback(async () => {
    closeContextMenu()
  }, [closeContextMenu])

  const handleClear = useCallback(() => {
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
    closeContextMenu()
  }, [selection, clearCell, closeContextMenu])

  const handleInsertRow = useCallback(() => {
    if (!selection) return
    insertRow(selection.anchor.row)
    closeContextMenu()
  }, [selection, insertRow, closeContextMenu])

  const handleInsertColumn = useCallback(() => {
    if (!selection) return
    insertColumn(selection.anchor.col)
    closeContextMenu()
  }, [selection, insertColumn, closeContextMenu])

  const handleDeleteRow = useCallback(() => {
    if (!selection) return
    deleteRow(selection.anchor.row)
    closeContextMenu()
  }, [selection, deleteRow, closeContextMenu])

  const handleDeleteColumn = useCallback(() => {
    if (!selection) return
    deleteColumn(selection.anchor.col)
    closeContextMenu()
  }, [selection, deleteColumn, closeContextMenu])

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        overflow: 'auto',
        position: 'relative',
        touchAction: 'none', // 防止浏览器默认触摸行为
        cursor: resizing ? 'col-resize' : 'default',
        outline: 'none', // 移除焦点边框
      }}
      tabIndex={0} // 使 div 可以接收键盘事件
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        if (resizing) {
          handleResize(e)
        } else {
          handleMouseDrag(e)
        }
      }}
      onMouseUp={handleResizeEnd}
      onMouseLeave={handleResizeEnd}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          width: activeSheet ? ROW_HEADER_WIDTH + activeSheet.colWidths.reduce((a, b) => a + b, 0) : width,
          height: activeSheet ? COL_HEADER_HEIGHT + activeSheet.rowHeights.reduce((a, b) => a + b, 0) : height,
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />

        {/* 列调整手柄 */}
        {activeSheet && !resizing && activeSheet.colWidths.map((colWidth, colIndex) => {
          const x = ROW_HEADER_WIDTH + getCellOffsetX(colIndex, activeSheet) + colWidth
          return (
            <div
              key={`col-resize-${colIndex}`}
              style={{
                position: 'absolute',
                left: x - 3,
                top: 0,
                width: 6,
                height: COL_HEADER_HEIGHT,
                cursor: 'col-resize',
                zIndex: 50,
                background: 'transparent',
              }}
              onMouseDown={(e) => handleResizeStart(e, 'col', colIndex)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 120, 212, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            />
          )
        })}

        {/* 行调整手柄 */}
        {activeSheet && !resizing && activeSheet.rowHeights.map((rowHeight, rowIndex) => {
          const y = COL_HEADER_HEIGHT + getCellOffsetY(rowIndex, activeSheet) + rowHeight
          return (
            <div
              key={`row-resize-${rowIndex}`}
              style={{
                position: 'absolute',
                left: 0,
                top: y - 3,
                width: ROW_HEADER_WIDTH,
                height: 6,
                cursor: 'row-resize',
                zIndex: 50,
                background: 'transparent',
              }}
              onMouseDown={(e) => handleResizeStart(e, 'row', rowIndex)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 120, 212, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            />
          )
        })}

        {/* 编辑覆盖层 */}
        {editingCell && activeSheet && (
          <input
            ref={(el) => {
              if (el) {
                el.focus()
                el.select()
              }
            }}
            type="text"
            className="cell-editor"
            style={{
              position: 'absolute',
              left: ROW_HEADER_WIDTH + getCellOffsetX(editingCell.col, activeSheet) - scrollRef.current.left,
              top: COL_HEADER_HEIGHT + getCellOffsetY(editingCell.row, activeSheet) - scrollRef.current.top,
              width: (activeSheet.colWidths[editingCell.col] || 100),
              height: (activeSheet.rowHeights[editingCell.row] || 25),
              boxSizing: 'border-box',
              zIndex: 100,
            }}
            defaultValue={String(getCell(editingCell)?.value ?? '')}
            onBlur={(e) => handleEditComplete(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditComplete(e.currentTarget.value)
              } else if (e.key === 'Escape') {
                handleEditCancel()
              }
              e.stopPropagation()
            }}
          />
        )}
      </div>

      {contextMenu && selection && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onCut={handleCut}
          onClear={handleClear}
          onDeleteRow={handleDeleteRow}
          onDeleteColumn={handleDeleteColumn}
          onInsertRow={handleInsertRow}
          onInsertColumn={handleInsertColumn}
        />
      )}
    </div>
  )
}
