import { useEffect } from 'react'
import { useSheetStore } from '../store/sheetStore'
import { copyToClipboard, pasteFromClipboard } from '../utils/clipboard'

export function useKeyboardShortcuts() {
  const { selection, setCell, clearCell, setSelection, sheets, activeSheetId } = useSheetStore()

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 如果在输入元素中，不处理快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (!selection || !activeSheetId) return

      const sheet = sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return

      // Ctrl+C / Cmd+C - 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        const cells = sheet.cells
        await copyToClipboard(cells, selection)
      }

      // Ctrl+V / Cmd+V - 粘贴
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        await pasteFromClipboard(selection.anchor, setCell)
      }

      // Ctrl+X / Cmd+X - 剪切
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault()
        const cells = sheet.cells
        await copyToClipboard(cells, selection)
        // 清除选中区域内容
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
      }

      // Delete / Backspace - 清除内容
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
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
      }

      // 方向键导航
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!selection) return

        const { anchor, focus } = selection
        let newRow = focus.row
        let newCol = focus.col

        if (e.key === 'ArrowUp') newRow = Math.max(0, focus.row - 1)
        if (e.key === 'ArrowDown') newRow = Math.min(sheet.rows - 1, focus.row + 1)
        if (e.key === 'ArrowLeft') newCol = Math.max(0, focus.col - 1)
        if (e.key === 'ArrowRight') newCol = Math.min(sheet.cols - 1, focus.col + 1)

        if (e.shiftKey) {
          // Shift+ 方向键扩展选区
          setSelection({ anchor, focus: { row: newRow, col: newCol } })
        } else {
          // 移动选区
          const newPosition = { row: newRow, col: newCol }
          setSelection({ anchor: newPosition, focus: newPosition })
        }
        e.preventDefault()
      }

      // Enter - 向下移动
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const { focus } = selection
        const newRow = Math.min(sheet.rows - 1, focus.row + 1)
        const newPosition = { row: newRow, col: focus.col }
        setSelection({ anchor: newPosition, focus: newPosition })
      }

      // Shift+Enter - 向上移动
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        const { focus } = selection
        const newRow = Math.max(0, focus.row - 1)
        const newPosition = { row: newRow, col: focus.col }
        setSelection({ anchor: newPosition, focus: newPosition })
      }

      // Tab - 向右移动
      if (e.key === 'Tab') {
        e.preventDefault()
        const { focus } = selection
        const newCol = e.shiftKey
          ? Math.max(0, focus.col - 1)
          : Math.min(sheet.cols - 1, focus.col + 1)
        const newPosition = { row: focus.row, col: newCol }
        setSelection({ anchor: newPosition, focus: newPosition })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection, activeSheetId, sheets, setCell, clearCell, setSelection])
}
