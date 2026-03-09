import { useRef, useEffect, useCallback, useState } from 'react'
import { useSheetStore } from '../../store/sheetStore'
import type { CellPosition } from '../../types'
import { ContextMenu } from '../ContextMenu'

interface CanvasRendererProps {
  width: number
  height: number
  isMobile?: boolean
  onCellContextMenu?: (e: React.MouseEvent, position: { row: number; col: number }) => void
  onLinkClick?: (url: string) => void
  onImageClick?: (src: string) => void
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

export function CanvasRenderer({ width, height, onCellContextMenu, onImageClick }: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { sheets, activeSheetId, selection, setSelection, editingCell, setEditingCell, getCell, setCell, setColumnWidth, setRowHeight, insertRow, insertColumn, deleteRow, deleteColumn, clearCell } = useSheetStore()

  // 本地编辑状态（用于受控组件）
  const [editInputValue, setEditInputValue] = useState<string>('')

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 图片缓存
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())

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

  // 保存最新的 selection 和 activeSheet 用于全局事件监听
  const selectionRef = useRef<typeof selection>(null)
  const activeSheetRef = useRef<typeof activeSheet>(null)

  // 更新 ref
  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    activeSheetRef.current = activeSheet
  }, [activeSheet])

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
      setEditingCell(null)
      setEditInputValue('')
      // 焦点回到容器
      setTimeout(() => containerRef.current?.focus(), 0)
    }
  }, [editingCell, setCell, setEditingCell])

  // 处理编辑取消
  const handleEditCancel = useCallback(() => {
    setEditingCell(null)
    setEditInputValue('')
    // 焦点回到容器
    setTimeout(() => containerRef.current?.focus(), 0)
  }, [setEditingCell])

  // 同步 editingCell 位置变化时更新本地状态（只在进入新单元格时）
  const lastEditingCellRef = useRef<{ row: number; col: number } | null>(null)
  const editorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingCell) {
      // 检查是否是新单元格
      if (!lastEditingCellRef.current ||
          lastEditingCellRef.current.row !== editingCell.row ||
          lastEditingCellRef.current.col !== editingCell.col) {
        const cell = getCell(editingCell)
        setEditInputValue(cell ? String(cell.value) : '')
        lastEditingCellRef.current = { row: editingCell.row, col: editingCell.col }
      }
    } else {
      setEditInputValue('')
      lastEditingCellRef.current = null
    }
  }, [editingCell, getCell])

  // 当 editingCell 变化时聚焦到编辑框
  useEffect(() => {
    if (editingCell && editorRef.current) {
      editorRef.current.focus()
      editorRef.current.select()
    }
  }, [editingCell?.row, editingCell?.col])

  // 监听全局键盘事件，确保方向键和字符键能被正确捕获
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 如果编辑框有焦点，不处理（由编辑框自己处理）
      if (editingCell) return

      // 如果容器或其内部元素没有焦点，不处理
      const container = containerRef.current
      if (!container || !container.contains(document.activeElement)) {
        return
      }

      // 如果没有选区，不处理
      const currentSelection = selectionRef.current
      const currentActiveSheet = activeSheetRef.current
      if (!currentSelection || !currentActiveSheet) return

      const { anchor } = currentSelection

      // 阻止方向键和 Tab 的默认行为（防止页面滚动）
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }

      // 如果是字母、数字或符号键，直接进入编辑模式
      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault()
        setEditingCell(anchor, '')
        // 将按键值传递给编辑框
        setTimeout(() => {
          setEditInputValue(e.key)
          const editor = document.querySelector('.cell-editor') as HTMLInputElement
          if (editor) {
            editor.focus()
            editor.setSelectionRange(1, 1)
          }
        }, 0)
      } else if (e.key === 'F2') {
        // F2 进入编辑模式
        e.preventDefault()
        setEditingCell(anchor, '')
      } else if (e.key === 'Tab') {
        // Tab 键移动（非编辑模式）
        const nextCol = e.shiftKey ? anchor.col - 1 : anchor.col + 1
        if (nextCol >= 0 && nextCol < currentActiveSheet.cols) {
          const newPosition = { row: anchor.row, col: nextCol }
          setSelection({ anchor: newPosition, focus: newPosition })
          // 保持焦点在容器上
          container.focus()
        } else if (anchor.row + 1 < currentActiveSheet.rows) {
          // 移动到下一行第一列
          const newPosition = { row: anchor.row + 1, col: 0 }
          setSelection({ anchor: newPosition, focus: newPosition })
          // 保持焦点在容器上
          container.focus()
        }
      } else if (e.key === 'ArrowRight' && !e.shiftKey) {
        // 右箭头键移动
        if (anchor.col + 1 < currentActiveSheet.cols) {
          const newPosition = { row: anchor.row, col: anchor.col + 1 }
          setSelection({ anchor: newPosition, focus: newPosition })
          // 保持焦点在容器上
          container.focus()
        }
      } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
        // 左箭头键移动
        if (anchor.col - 1 >= 0) {
          const newPosition = { row: anchor.row, col: anchor.col - 1 }
          setSelection({ anchor: newPosition, focus: newPosition })
          // 保持焦点在容器上
          container.focus()
        }
      } else if (e.key === 'ArrowDown' && !e.shiftKey) {
        // 下箭头键移动
        if (anchor.row + 1 < currentActiveSheet.rows) {
          const newPosition = { row: anchor.row + 1, col: anchor.col }
          setSelection({ anchor: newPosition, focus: newPosition })
          // 保持焦点在容器上
          container.focus()
        }
      } else if (e.key === 'ArrowUp' && !e.shiftKey) {
        // 上箭头键移动
        if (anchor.row - 1 >= 0) {
          const newPosition = { row: anchor.row - 1, col: anchor.col }
          setSelection({ anchor: newPosition, focus: newPosition })
          // 保持焦点在容器上
          container.focus()
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [editingCell, setEditingCell, setSelection, setEditInputValue])

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

              // 绘制图片
              if (cell.image?.src) {
                // 图片绘制将在 useEffect 中通过 Image 对象完成
              }

              // 绘制内容
              let displayValue = String(cell.computedValue ?? cell.value)
              
              // 如果有链接，使用链接文本
              if (cell.link?.text) {
                displayValue = cell.link.text
              }
              
              // 设置样式
              ctx.fillStyle = cell.link ? '#0066cc' : (cell.style?.color || '#000')
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

              ctx.fillText(displayValue, textX, textY)
              
              // 如果是链接，绘制下划线
              if (cell.link) {
                ctx.strokeStyle = '#0066cc'
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo(x + padding, textY + 2)
                ctx.lineTo(x + colWidth - padding, textY + 2)
                ctx.stroke()
              }
            }
          }
          x += colWidth
        }
        y += rowHeight
      }
    },
    [activeSheet, width, height]
  )

  // 绘制图片
  const drawImages = useCallback(
    (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
      if (!activeSheet) return

      let x = ROW_HEADER_WIDTH - viewport.scrollLeft
      let y = COL_HEADER_HEIGHT - viewport.scrollTop

      for (let row = 0; row < activeSheet.rows; row++) {
        const rowHeight = activeSheet.rowHeights[row]
        x = ROW_HEADER_WIDTH - viewport.scrollLeft

        for (let col = 0; col < activeSheet.cols; col++) {
          const colWidth = activeSheet.colWidths[col]

          if (x + colWidth > ROW_HEADER_WIDTH && x < width && y + rowHeight > COL_HEADER_HEIGHT && y < height) {
            const key = `${row},${col}`
            const cell = activeSheet.cells.get(key)

            if (cell?.image?.src) {
              // 检查缓存
              let img = imageCache.current.get(cell.image.src)
              
              if (!img) {
                // 加载图片
                img = new Image()
                img.src = cell.image.src
                imageCache.current.set(cell.image.src, img)
              }
              
              // 如果图片已加载，绘制它
              if (img.complete) {
                const padding = 2
                const imgWidth = colWidth - padding * 2
                const imgHeight = rowHeight - padding * 2
                ctx.drawImage(img, x + padding, y + padding, imgWidth, imgHeight)
              }
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
    
    // 绘制图片
    drawImages(ctx, viewport)
  }, [getViewport, drawColumnHeaders, drawRowHeaders, drawGrid, drawCells, drawSelection, drawImages, width, height])

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

  // 处理键盘输入（作为全局事件监听的备用）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selection || !activeSheet) return

      // 如果已经在编辑模式，不处理（由编辑框自己处理）
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
        setEditingCell(anchor, '')
        // 将按键值传递给编辑框
        setTimeout(() => {
          setEditInputValue(e.key)
          const editor = document.querySelector('.cell-editor') as HTMLInputElement
          if (editor) {
            editor.focus()
            editor.setSelectionRange(1, 1)
          }
        }, 0)
      } else if (e.key === 'F2') {
        // F2 进入编辑模式
        e.preventDefault()
        const { anchor } = selection
        setEditingCell(anchor, '')
      }
      // 注意：方向键和 Tab 键已在全局事件监听器中处理
    },
    [selection, activeSheet, editingCell, setEditingCell, setEditInputValue]
  )

  // 处理触摸结束
  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent<HTMLDivElement>) => {
      const touchStart = (containerRef.current as any)._touchStart
      if (!touchStart) return

      const touchDuration = Date.now() - touchStart.time
      // 长按超过 500ms 进入编辑模式
      if (touchDuration > 500) {
        setEditingCell({ row: touchStart.row, col: touchStart.col }, '')
      }
      delete (containerRef.current as any)._touchStart
    },
    [setEditingCell]
  )

  // 处理鼠标按下（捕获阶段）
  const handleMouseDownCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 首先确保容器获得焦点
    containerRef.current?.focus()
  }, [])

  // 处理鼠标按下
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeSheet) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left + scrollRef.current.left
      const y = e.clientY - rect.top + scrollRef.current.top

      // 检查是否点击在链接或图片上
      if (x >= ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        let xAccum = ROW_HEADER_WIDTH
        let yAccum = COL_HEADER_HEIGHT
        let col = -1
        let row = -1

        for (let c = 0; c < activeSheet.cols; c++) {
          if (x < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
        }
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
        }

        if (row >= 0 && col >= 0) {
          const cell = activeSheet.cells.get(`${row},${col}`)
          
          // 检查是否点击链接
          if (cell?.link && e.button === 0) {
            window.open(cell.link.url, '_blank')
            return
          }
          
          // 检查是否点击图片
          if (cell?.image && e.button === 0) {
            onImageClick?.(cell.image.src)
            return
          }
        }
      }

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
    },
    [activeSheet, setSelection, selection, editingCell, onImageClick]
  )

  // 处理双击进入编辑模式
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeSheet || !selection) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left + scrollRef.current.left
      const y = e.clientY - rect.top + scrollRef.current.top

      // 检查是否点击在数据区域
      if (x >= ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        let xAccum = ROW_HEADER_WIDTH
        let yAccum = COL_HEADER_HEIGHT
        let col = -1
        let row = -1

        for (let c = 0; c < activeSheet.cols; c++) {
          if (x < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
        }
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
        }

        if (row >= 0 && col >= 0) {
          setEditingCell({ row, col }, '')
        }
      }
    },
    [activeSheet, selection, setEditingCell]
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
      if (!rect || !activeSheet) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // 检查是否点击在数据区域
      if (x >= ROW_HEADER_WIDTH && y >= COL_HEADER_HEIGHT) {
        const scrollX = scrollRef.current.left
        const scrollY = scrollRef.current.top
        let col = -1
        let row = -1
        let xAccum = ROW_HEADER_WIDTH
        let yAccum = COL_HEADER_HEIGHT

        for (let c = 0; c < activeSheet.cols; c++) {
          if (x + scrollX < xAccum + activeSheet.colWidths[c]) {
            col = c
            break
          }
          xAccum += activeSheet.colWidths[c]
        }
        for (let r = 0; r < activeSheet.rows; r++) {
          if (y + scrollY < yAccum + activeSheet.rowHeights[r]) {
            row = r
            break
          }
          yAccum += activeSheet.rowHeights[r]
        }

        if (row >= 0 && col >= 0) {
          onCellContextMenu?.(e, { row, col })
          return
        }
      }

      setContextMenu({ x, y })
    },
    [activeSheet, onCellContextMenu]
  )

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // 右键菜单操作
  const handleCopy = useCallback(async () => {
    if (!selection || !activeSheet) return
    
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)
    
    // 构建选中区域的文本（制表符分隔，换行分隔行）
    const rows: string[] = []
    for (let row = minRow; row <= maxRow; row++) {
      const cells: string[] = []
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`
        const cell = activeSheet.cells.get(key)
        cells.push(cell?.value ? String(cell.value) : '')
      }
      rows.push(cells.join('\t'))
    }
    
    await navigator.clipboard.writeText(rows.join('\n'))
    closeContextMenu()
  }, [selection, activeSheet, closeContextMenu])

  const handlePaste = useCallback(async () => {
    if (!selection || !activeSheet) return
    
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return
      
      const { anchor } = selection
      const rows = text.split('\n')
      
      // 从选中区域的起点开始粘贴
      rows.forEach((rowText, rowIndex) => {
        const cells = rowText.split('\t')
        cells.forEach((cellText, colIndex) => {
          const targetRow = anchor.row + rowIndex
          const targetCol = anchor.col + colIndex
          if (targetRow < activeSheet.rows && targetCol < activeSheet.cols) {
            setCell({ row: targetRow, col: targetCol }, cellText)
          }
        })
      })
    } catch (err) {
      console.error('粘贴失败:', err)
    }
    
    closeContextMenu()
  }, [selection, activeSheet, setCell, closeContextMenu])

  const handleCut = useCallback(async () => {
    if (!selection || !activeSheet) return
    
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)
    
    // 先复制内容
    const rows: string[] = []
    for (let row = minRow; row <= maxRow; row++) {
      const cells: string[] = []
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`
        const cell = activeSheet.cells.get(key)
        cells.push(cell?.value ? String(cell.value) : '')
      }
      rows.push(cells.join('\t'))
    }
    
    await navigator.clipboard.writeText(rows.join('\n'))
    
    // 然后清除内容
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        clearCell({ row, col })
      }
    }
    
    closeContextMenu()
  }, [selection, activeSheet, clearCell, closeContextMenu])

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
      onMouseDownCapture={handleMouseDownCapture}
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
      onDoubleClick={handleDoubleClick}
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
        <canvas ref={canvasRef} style={{ display: 'block', pointerEvents: 'none' }} />

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
            key={`${editingCell.row},${editingCell.col}`}
            ref={(el) => {
              editorRef.current = el
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
            value={editInputValue}
            onChange={(e) => setEditInputValue(e.target.value)}
            onBlur={(e) => handleEditComplete(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault()
                e.stopPropagation()
                // 保存当前编辑内容
                const currentValue = e.currentTarget.value
                setCell(editingCell, currentValue)
                // 移动到下一个单元格
                const nextCol = e.shiftKey ? editingCell.col - 1 : editingCell.col + 1
                if (nextCol >= 0 && nextCol < activeSheet.cols) {
                  const newPosition = { row: editingCell.row, col: nextCol }
                  setSelection({ anchor: newPosition, focus: newPosition })
                  setEditingCell(newPosition, '')
                } else if (!e.shiftKey && editingCell.row + 1 < activeSheet.rows) {
                  // 移动到下一行第一列
                  const newPosition = { row: editingCell.row + 1, col: 0 }
                  setSelection({ anchor: newPosition, focus: newPosition })
                  setEditingCell(newPosition, '')
                } else if (e.shiftKey && editingCell.row > 0) {
                  // 移动到上一行最后一列
                  const newPosition = { row: editingCell.row - 1, col: activeSheet.cols - 1 }
                  setSelection({ anchor: newPosition, focus: newPosition })
                  setEditingCell(newPosition, '')
                }
                return
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.stopPropagation()
                // 保存当前编辑内容
                const currentValue = e.currentTarget.value
                setCell(editingCell, currentValue)
                // 移动到下一行
                const nextRow = editingCell.row + 1
                if (nextRow < activeSheet.rows) {
                  const newPosition = { row: nextRow, col: editingCell.col }
                  setSelection({ anchor: newPosition, focus: newPosition })
                  setEditingCell(newPosition, '')
                }
                return
              } else if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                e.stopPropagation()
                // 保存当前编辑内容
                const currentValue = e.currentTarget.value
                setCell(editingCell, currentValue)
                return
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                handleEditCancel()
                return
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
