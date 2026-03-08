import type { CellPosition, Cell } from '../types'

/**
 * 分析选区内容，判断是复制模式还是序列填充模式
 */
export function analyzeSelectionPattern(
  cells: Map<string, Cell>,
  selection: { anchor: CellPosition; focus: CellPosition }
): { type: 'copy' | 'sequence'; values: any[] } {
  const { anchor, focus } = selection
  const minRow = Math.min(anchor.row, focus.row)
  const maxRow = Math.max(anchor.row, focus.row)
  const minCol = Math.min(anchor.col, focus.col)
  const maxCol = Math.max(anchor.col, focus.col)

  const values: any[] = []

  // 收集选区中的值
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const key = `${row},${col}`
      const cell = cells.get(key)
      values.push(cell?.value ?? '')
    }
  }

  // 检测是否为数字序列
  const numbers = values.map((v) => parseFloat(v)).filter((n) => !isNaN(n))
  if (numbers.length >= 2) {
    // 检查是否为等差数列
    const diff = numbers[1] - numbers[0]
    let isSequence = true
    for (let i = 2; i < numbers.length; i++) {
      if (numbers[i] - numbers[i - 1] !== diff) {
        isSequence = false
        break
      }
    }
    if (isSequence) {
      return { type: 'sequence', values: numbers }
    }
  }

  return { type: 'copy', values }
}

/**
 * 填充手柄功能
 */
export function fillHandle(
  cells: Map<string, Cell>,
  sourceSelection: { anchor: CellPosition; focus: CellPosition },
  targetRange: { startRow: number; endRow: number; startCol: number; endCol: number },
  setCell: (position: CellPosition, value: string) => void
): void {
  const { anchor, focus } = sourceSelection
  const minRow = Math.min(anchor.row, focus.row)
  const maxRow = Math.max(anchor.row, focus.row)
  const minCol = Math.min(anchor.col, focus.col)
  const maxCol = Math.max(anchor.col, focus.col)

  const sourceHeight = maxRow - minRow + 1
  const sourceWidth = maxCol - minCol + 1
  const targetWidth = targetRange.endCol - targetRange.startCol + 1

  // 分析模式
  const pattern = analyzeSelectionPattern(cells, sourceSelection)

  // 填充目标区域
  for (let row = targetRange.startRow; row <= targetRange.endRow; row++) {
    for (let col = targetRange.startCol; col <= targetRange.endCol; col++) {
      // 跳过源区域
      if (
        row >= minRow &&
        row <= maxRow &&
        col >= minCol &&
        col <= maxCol
      ) {
        continue
      }

      let value: string

      if (pattern.type === 'sequence') {
        // 序列填充
        const sourceIndex =
          (row - targetRange.startRow) * targetWidth + (col - targetRange.startCol)
        const sequenceIndex = Math.floor(sourceIndex / sourceHeight / sourceWidth)
        const remainder = sourceIndex % (sourceHeight * sourceWidth)

        if (pattern.values.length >= 2) {
          const diff = pattern.values[1] - pattern.values[0]
          const lastValue = pattern.values[pattern.values.length - 1]
          value = String(lastValue + diff * (sequenceIndex + 1) + remainder * diff)
        } else {
          value = String(pattern.values[0] || '')
        }
      } else {
        // 复制模式
        const sourceRow = minRow + ((row - targetRange.startRow) % sourceHeight)
        const sourceCol = minCol + ((col - targetRange.startCol) % sourceWidth)
        const key = `${sourceRow},${sourceCol}`
        const sourceCell = cells.get(key)
        value = sourceCell ? String(sourceCell.value) : ''
      }

      setCell({ row, col }, value)
    }
  }
}
