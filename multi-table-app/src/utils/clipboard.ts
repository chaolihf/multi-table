import type { CellPosition, Cell } from '../types'

/**
 * 将单元格数据复制到剪贴板
 */
export async function copyToClipboard(
  cells: Map<string, Cell>,
  selection: { anchor: CellPosition; focus: CellPosition }
): Promise<boolean> {
  try {
    const { anchor, focus } = selection
    const minRow = Math.min(anchor.row, focus.row)
    const maxRow = Math.max(anchor.row, focus.row)
    const minCol = Math.min(anchor.col, focus.col)
    const maxCol = Math.max(anchor.col, focus.col)

    // 构建 TSV (Tab-Separated Values) 格式
    const rows: string[] = []
    for (let row = minRow; row <= maxRow; row++) {
      const rowValues: string[] = []
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`
        const cell = cells.get(key)
        const value = cell?.computedValue ?? cell?.value ?? ''
        // 处理包含制表符或换行符的值
        const escapedValue = String(value).replace(/\t/g, ' ').replace(/\n/g, ' ')
        rowValues.push(escapedValue)
      }
      rows.push(rowValues.join('\t'))
    }

    const tsv = rows.join('\n')
    await navigator.clipboard.writeText(tsv)
    return true
  } catch (error) {
    console.error('Copy failed:', error)
    return false
  }
}

/**
 * 从剪贴板粘贴数据
 */
export async function pasteFromClipboard(
  startPosition: CellPosition,
  setCell: (position: CellPosition, value: string) => void
): Promise<{ rows: number; cols: number } | null> {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) return null

    const rows = text.split('\n').filter((row) => row.trim() !== '')
    const parsedData: string[][] = []

    for (const row of rows) {
      const cells = row.split('\t')
      parsedData.push(cells)
    }

    if (parsedData.length === 0) return null

    // 粘贴数据
    for (let rowOffset = 0; rowOffset < parsedData.length; rowOffset++) {
      for (let colOffset = 0; colOffset < parsedData[rowOffset].length; colOffset++) {
        const row = startPosition.row + rowOffset
        const col = startPosition.col + colOffset
        const value = parsedData[rowOffset][colOffset]
        setCell({ row, col }, value)
      }
    }

    return { rows: parsedData.length, cols: Math.max(...parsedData.map((r) => r.length)) }
  } catch (error) {
    console.error('Paste failed:', error)
    return null
  }
}

/**
 * 剪切单元格数据
 */
export async function cutToClipboard(
  cells: Map<string, Cell>,
  selection: { anchor: CellPosition; focus: CellPosition },
  clearCell: (position: CellPosition) => void
): Promise<boolean> {
  const success = await copyToClipboard(cells, selection)
  if (success) {
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
  return success
}
