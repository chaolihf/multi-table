import { create } from 'zustand'
import type { Sheet, Cell, CellPosition, Selection, Operation } from '../types'
import { calculateFormula, detectCircularReference, getCellRef } from '../utils/formula'

const STORAGE_KEY = 'multi-table-sheets'

/**
 * 将 Sheet 转换为可序列化的格式
 */
function serializeSheet(sheet: Sheet): any {
  return {
    ...sheet,
    cells: Array.from(sheet.cells.entries()),
  }
}

/**
 * 从序列化格式恢复 Sheet
 */
function deserializeSheet(data: any): Sheet {
  return {
    ...data,
    cells: new Map(data.cells),
  }
}

/**
 * 重新计算依赖指定单元格的其他公式单元格
 */
function recalculateDependentCells(
  cells: Map<string, Cell>,
  changedPosition: CellPosition
): Map<string, Cell> {
  const result = new Map(cells)
  const changedRef = getCellRef(changedPosition.row, changedPosition.col)

  // 遍历所有单元格，查找依赖此单元格的公式
  for (const [key, cell] of cells.entries()) {
    if (!cell.formula) continue

    // 检查公式是否包含变化的单元格引用
    if (cell.formula.includes(changedRef)) {
      const getCell = (pos: { row: number; col: number }) => {
        const cellKey = `${pos.row},${pos.col}`
        return result.get(cellKey)
      }
      const computedValue = calculateFormula(cell.formula, getCell)
      result.set(key, {
        ...cell,
        computedValue,
      })
    }
  }

  return result
}

interface SheetStore {
  // 工作表
  sheets: Sheet[]
  activeSheetId: string | null

  // 选中区域
  selection: Selection | null

  // 编辑状态
  editingCell: CellPosition | null
  editValue: string

  // 操作历史
  history: Operation[]
  historyIndex: number

  // Actions
  createSheet: (name: string, rows?: number, cols?: number) => Sheet
  setActiveSheet: (sheetId: string) => void
  setCell: (position: CellPosition, value: string) => void
  clearCell: (position: CellPosition) => void
  getCell: (position: CellPosition) => Cell | undefined
  setSelection: (selection: Selection | null) => void
  setEditingCell: (position: CellPosition | null, value?: string) => void
  insertRow: (rowIndex: number) => void
  insertColumn: (colIndex: number) => void
  deleteRow: (rowIndex: number) => void
  deleteColumn: (colIndex: number) => void
  setColumnWidth: (colIndex: number, width: number) => void
  setRowHeight: (rowIndex: number, height: number) => void
  undo: () => void
  redo: () => void
  // 持久化
  loadFromStorage: () => void
  saveToStorage: () => void
}

const createDefaultSheet = (name: string, rows = 100, cols = 26): Sheet => ({
  id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  rows,
  cols,
  cells: new Map(),
  colWidths: Array(cols).fill(100),
  rowHeights: Array(rows).fill(25),
})

export const useSheetStore = create<SheetStore>((set, get) => ({
  sheets: [],
  activeSheetId: null,
  selection: null,
  editingCell: null,
  editValue: '',
  history: [],
  historyIndex: -1,

  createSheet: (name, rows = 100, cols = 26) => {
    const sheet = createDefaultSheet(name, rows, cols)
    set((state) => ({
      sheets: [...state.sheets, sheet],
      activeSheetId: sheet.id,
    }))
    return sheet
  },

  setActiveSheet: (sheetId) => {
    set({ activeSheetId: sheetId })
  },

  setCell: (position, value) => {
    const { activeSheetId, history, historyIndex } = get()
    if (!activeSheetId) return

    const key = `${position.row},${position.col}`
    const timestamp = Date.now()

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const isFormula = value.startsWith('=')
      
      // 检测循环引用
      if (isFormula) {
        const hasCircular = detectCircularReference(
          position.row,
          position.col,
          value,
          (pos) => {
            const cellKey = `${pos.row},${pos.col}`
            return sheet.cells.get(cellKey)
          }
        )
        if (hasCircular) {
          // 如果有循环引用，显示错误
          const newCells = new Map(sheet.cells)
          newCells.set(key, {
            value,
            formula: value,
            computedValue: '#CIRCULAR REF!',
            style: sheet.cells.get(key)?.style,
          })
          return {
            ...state,
            sheets: state.sheets.map((s) => (s.id === activeSheetId ? { ...s, cells: newCells } : s)),
          }
        }
      }

      // 计算新值
      let cellValue: string | number | boolean
      let computedValue: string | number | boolean
      let formula: string | undefined

      if (isFormula) {
        formula = value
        // 创建临时 getCell 函数用于计算
        const tempCells = new Map(sheet.cells)
        const getCell = (pos: { row: number; col: number }) => {
          const tempKey = `${pos.row},${pos.col}`
          return tempCells.get(tempKey)
        }
        computedValue = calculateFormula(value, getCell)
        cellValue = value
      } else {
        cellValue = value.trim() === '' ? '' : (Number(value) || value)
        computedValue = cellValue
        formula = undefined
      }

      const newCells = new Map(sheet.cells)
      const existingCell = newCells.get(key)

      if (value.trim() === '') {
        newCells.delete(key)
      } else {
        newCells.set(key, {
          value: cellValue,
          formula,
          computedValue,
          style: existingCell?.style,
        })
      }

      // 重新计算依赖此单元格的其他公式
      const updatedCells = recalculateDependentCells(newCells, position)

      const operation: Operation = {
        type: 'SET_CELL',
        sheetId: activeSheetId,
        payload: { position, value, key },
        timestamp,
        userId: 'current-user',
      }

      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(operation)

      return {
        sheets: state.sheets.map((s) => (s.id === activeSheetId ? { ...s, cells: updatedCells } : s)),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },

  getCell: (position) => {
    const { activeSheetId, sheets } = get()
    if (!activeSheetId) return undefined

    const sheet = sheets.find((s) => s.id === activeSheetId)
    if (!sheet) return undefined

    const key = `${position.row},${position.col}`
    return sheet.cells.get(key)
  },

  clearCell: (position) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const key = `${position.row},${position.col}`
      const newCells = new Map(sheet.cells)
      const existingCell = newCells.get(key)

      // 只清除值，保留样式
      if (existingCell) {
        newCells.set(key, {
          ...existingCell,
          value: '',
          formula: undefined,
          computedValue: '',
        })
      }

      return {
        ...state,
        sheets: state.sheets.map((s) => (s.id === activeSheetId ? { ...s, cells: newCells } : s)),
      }
    })
  },

  setSelection: (selection) => {
    set({ selection })
  },

  setEditingCell: (position, value = '') => {
    set({ editingCell: position, editValue: value })
  },

  insertRow: (rowIndex) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const newCells = new Map<string, Cell>()
      // 移动现有单元格
      for (const [key, cell] of sheet.cells.entries()) {
        const [row, col] = key.split(',').map(Number)
        if (row >= rowIndex) {
          // 向下移动
          newCells.set(`${row + 1},${col}`, cell)
        } else {
          newCells.set(key, cell)
        }
      }

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId
            ? {
                ...s,
                cells: newCells,
                rows: s.rows + 1,
                rowHeights: [
                  ...s.rowHeights.slice(0, rowIndex),
                  25,
                  ...s.rowHeights.slice(rowIndex),
                ],
              }
            : s
        ),
      }
    })
  },

  insertColumn: (colIndex) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const newCells = new Map<string, Cell>()
      // 移动现有单元格
      for (const [key, cell] of sheet.cells.entries()) {
        const [row, col] = key.split(',').map(Number)
        if (col >= colIndex) {
          // 向右移动
          newCells.set(`${row},${col + 1}`, cell)
        } else {
          newCells.set(key, cell)
        }
      }

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId
            ? {
                ...s,
                cells: newCells,
                cols: s.cols + 1,
                colWidths: [
                  ...s.colWidths.slice(0, colIndex),
                  100,
                  ...s.colWidths.slice(colIndex),
                ],
              }
            : s
        ),
      }
    })
  },

  deleteRow: (rowIndex) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet || sheet.rows <= 1) return state

      const newCells = new Map<string, Cell>()
      // 删除并移动单元格
      for (const [key, cell] of sheet.cells.entries()) {
        const [row, col] = key.split(',').map(Number)
        if (row === rowIndex) {
          // 删除此行
          continue
        } else if (row > rowIndex) {
          // 向上移动
          newCells.set(`${row - 1},${col}`, cell)
        } else {
          newCells.set(key, cell)
        }
      }

      const newRowHeights = [...sheet.rowHeights]
      newRowHeights.splice(rowIndex, 1)

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId
            ? {
                ...s,
                cells: newCells,
                rows: s.rows - 1,
                rowHeights: newRowHeights,
              }
            : s
        ),
      }
    })
  },

  deleteColumn: (colIndex) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet || sheet.cols <= 1) return state

      const newCells = new Map<string, Cell>()
      // 删除并移动单元格
      for (const [key, cell] of sheet.cells.entries()) {
        const [row, col] = key.split(',').map(Number)
        if (col === colIndex) {
          // 删除此列
          continue
        } else if (col > colIndex) {
          // 向左移动
          newCells.set(`${row},${col - 1}`, cell)
        } else {
          newCells.set(key, cell)
        }
      }

      const newColWidths = [...sheet.colWidths]
      newColWidths.splice(colIndex, 1)

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId
            ? {
                ...s,
                cells: newCells,
                cols: s.cols - 1,
                colWidths: newColWidths,
              }
            : s
        ),
      }
    })
  },

  undo: () => {
    const { historyIndex } = get()
    if (historyIndex < 0) return

    // TODO: 实现撤销逻辑
    set({ historyIndex: historyIndex - 1 })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return

    // TODO: 实现重做逻辑
    set({ historyIndex: historyIndex + 1 })
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const data = JSON.parse(stored)
      if (data.sheets && Array.isArray(data.sheets)) {
        set({
          sheets: data.sheets.map(deserializeSheet),
          activeSheetId: data.activeSheetId,
        })
      }
    } catch (error) {
      console.error('Failed to load from storage:', error)
    }
  },

  saveToStorage: () => {
    try {
      const { sheets, activeSheetId } = get()
      const data = {
        sheets: sheets.map(serializeSheet),
        activeSheetId,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save to storage:', error)
    }
  },

  setColumnWidth: (colIndex, width) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const newColWidths = [...sheet.colWidths]
      newColWidths[colIndex] = Math.max(20, width)

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId ? { ...s, colWidths: newColWidths } : s
        ),
      }
    })
  },

  setRowHeight: (rowIndex, height) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const newRowHeights = [...sheet.rowHeights]
      newRowHeights[rowIndex] = Math.max(20, height)

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId ? { ...s, rowHeights: newRowHeights } : s
        ),
      }
    })
  },
}))
