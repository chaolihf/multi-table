import { create } from 'zustand'
import type { Sheet, Cell, CellPosition, Selection, Operation } from '../types'
import { calculateFormula, detectCircularReference, getCellRef, parseRangeRef } from '../utils/formula'

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
  const { row: changedRow, col: changedCol } = changedPosition

  // 遍历所有单元格，查找依赖此单元格的公式
  for (const [key, cell] of cells.entries()) {
    if (!cell.formula) continue

    // 检查公式是否包含变化的单元格引用（包括区域引用）
    let needsRecalc = false
    
    // 检查是否直接引用（如 A1）
    if (cell.formula.includes(changedRef)) {
      needsRecalc = true
    } else {
      // 检查区域引用（如 A1:B2）
      const rangeRefs = cell.formula.match(/\b([A-Z]+[0-9]+:[A-Z]+[0-9]+)\b/gi) || []
      for (const rangeRef of rangeRefs) {
        const range = parseRangeRef(rangeRef)
        if (range) {
          const { startRow, startCol, endRow, endCol } = range
          const minRow = Math.min(startRow, endRow)
          const maxRow = Math.max(startRow, endRow)
          const minCol = Math.min(startCol, endCol)
          const maxCol = Math.max(startCol, endCol)
          
          // 检查变化的单元格是否在区域内
          if (changedRow >= minRow && changedRow <= maxRow &&
              changedCol >= minCol && changedCol <= maxCol) {
            needsRecalc = true
            break
          }
        }
      }
    }
    
    if (needsRecalc) {
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

interface SheetFilter {
  column: number
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between'
  value: string | number
  value2?: string | number // for between
}

interface SheetSort {
  column: number
  direction: 'asc' | 'desc'
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

  // 筛选和排序
  filters: Map<string, SheetFilter[]> // sheetId -> filters
  sort: Map<string, SheetSort> // sheetId -> sort

  // 操作历史
  history: Operation[]
  historyIndex: number

  // Actions
  createSheet: (name: string, rows?: number, cols?: number) => Sheet
  setActiveSheet: (sheetId: string) => void
  deleteSheet: (sheetId: string) => void
  renameSheet: (sheetId: string, newName: string) => void
  moveSheet: (sheetId: string, direction: 'left' | 'right' | 'first' | 'last') => void
  setCell: (position: CellPosition, value: string) => void
  clearCell: (position: CellPosition) => void
  getCell: (position: CellPosition) => Cell | undefined
  setSelection: (selection: Selection | null) => void
  setEditingCell: (position: CellPosition | null, value?: string) => void
  setCellStyle: (positions: CellPosition[], style: Partial<import('../types').CellStyle>) => void
  setFilter: (sheetId: string, column: number, filter: SheetFilter) => void
  removeFilter: (sheetId: string, column: number) => void
  clearFilters: (sheetId: string) => void
  setSort: (sheetId: string, column: number, direction: 'asc' | 'desc') => void
  clearSort: (sheetId: string) => void
  getFilteredAndSortedRows: (sheetId: string) => number[]
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
  filters: new Map(),
  sort: new Map(),
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

  deleteSheet: (sheetId) => {
    const { sheets, activeSheetId } = get()
    // 至少保留一个 sheet
    if (sheets.length <= 1) return

    set((state) => {
      const newSheets = state.sheets.filter((s) => s.id !== sheetId)
      // 如果删除的是当前激活的 sheet，切换到第一个可用的 sheet
      let newActiveSheetId = activeSheetId
      if (activeSheetId === sheetId) {
        newActiveSheetId = newSheets[0]?.id || null
      }
      return {
        sheets: newSheets,
        activeSheetId: newActiveSheetId,
      }
    })
  },

  renameSheet: (sheetId, newName) => {
    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId ? { ...s, name: newName } : s
      ),
    }))
  },

  moveSheet: (sheetId, direction) => {
    const { sheets } = get()
    const index = sheets.findIndex((s) => s.id === sheetId)
    if (index === -1) return

    set((state) => {
      const newSheets = [...state.sheets]
      const [removed] = newSheets.splice(index, 1)

      let newIndex: number
      switch (direction) {
        case 'left':
          newIndex = Math.max(0, index - 1)
          break
        case 'right':
          newIndex = Math.min(newSheets.length, index + 1)
          break
        case 'first':
          newIndex = 0
          break
        case 'last':
          newIndex = newSheets.length
          break
      }

      newSheets.splice(newIndex, 0, removed)
      return { sheets: newSheets }
    })
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

  setCellStyle: (positions, style) => {
    const { activeSheetId } = get()
    if (!activeSheetId) return

    set((state) => {
      const sheet = state.sheets.find((s) => s.id === activeSheetId)
      if (!sheet) return state

      const newCells = new Map(sheet.cells)

      for (const pos of positions) {
        const key = `${pos.row},${pos.col}`
        const existingCell = newCells.get(key)

        newCells.set(key, {
          ...existingCell,
          value: existingCell?.value ?? '',
          style: {
            ...existingCell?.style,
            ...style,
          },
        })
      }

      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === activeSheetId ? { ...s, cells: newCells } : s
        ),
      }
    })
  },

  setFilter: (sheetId, column, filter) => {
    set((state) => {
      const sheetFilters = state.filters.get(sheetId) || []
      const existingIndex = sheetFilters.findIndex((f) => f.column === column)
      
      if (existingIndex >= 0) {
        sheetFilters[existingIndex] = filter
      } else {
        sheetFilters.push(filter)
      }
      
      return {
        filters: new Map(state.filters).set(sheetId, sheetFilters),
      }
    })
  },

  removeFilter: (sheetId, column) => {
    set((state) => {
      const sheetFilters = state.filters.get(sheetId) || []
      const newFilters = sheetFilters.filter((f) => f.column !== column)
      
      return {
        filters: new Map(state.filters).set(sheetId, newFilters),
      }
    })
  },

  clearFilters: (sheetId) => {
    set((state) => ({
      filters: new Map(state.filters).set(sheetId, []),
    }))
  },

  setSort: (sheetId, column, direction) => {
    set((state) => ({
      sort: new Map(state.sort).set(sheetId, { column, direction }),
    }))
  },

  clearSort: (sheetId) => {
    set((state) => {
      const newSort = new Map(state.sort)
      newSort.delete(sheetId)
      return { sort: newSort }
    })
  },

  getFilteredAndSortedRows: (sheetId) => {
    const { sheets, filters, sort } = get()
    const sheet = sheets.find((s) => s.id === sheetId)
    if (!sheet) return []

    let rows = Array.from({ length: sheet.rows }, (_, i) => i)

    // 应用筛选
    const sheetFilters = filters.get(sheetId) || []
    if (sheetFilters.length > 0) {
      rows = rows.filter((rowIndex) => {
        return sheetFilters.every((filter) => {
          const cell = sheet.cells.get(`${rowIndex},${filter.column}`)
          const cellValue = cell?.value ?? ''
          const strValue = String(cellValue)
          const numValue = Number(cellValue)

          switch (filter.operator) {
            case 'contains':
              return strValue.includes(String(filter.value))
            case 'equals':
              return strValue === String(filter.value)
            case 'startsWith':
              return strValue.startsWith(String(filter.value))
            case 'endsWith':
              return strValue.endsWith(String(filter.value))
            case 'greaterThan':
              return numValue > Number(filter.value)
            case 'lessThan':
              return numValue < Number(filter.value)
            case 'between':
              return numValue >= Number(filter.value) && numValue <= Number(filter.value2 ?? filter.value)
            default:
              return true
          }
        })
      })
    }

    // 应用排序
    const sheetSort = sort.get(sheetId)
    if (sheetSort) {
      const { column, direction } = sheetSort
      rows.sort((a, b) => {
        const cellA = sheet.cells.get(`${a},${column}`)
        const cellB = sheet.cells.get(`${b},${column}`)
        const valueA = cellA?.value ?? ''
        const valueB = cellB?.value ?? ''

        const numA = Number(valueA)
        const numB = Number(valueB)

        // 如果都是数字，按数字排序
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === 'asc' ? numA - numB : numB - numA
        }
        // 否则按字符串排序
        const cmp = String(valueA).localeCompare(String(valueB))
        return direction === 'asc' ? cmp : -cmp
      })
    }

    return rows
  },
}))
