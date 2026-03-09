import { evaluate } from 'mathjs'
import type { Cell } from '../types'

/**
 * 公式错误类型
 */
export class FormulaError extends Error {
  code: string

  constructor(
    code: string,
    message: string
  ) {
    super(message)
    this.name = 'FormulaError'
    this.code = code
  }
}

/**
 * 解析单元格引用 (如 A1, B2:C10)
 */
export function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null

  const colStr = match[1].toUpperCase()
  const row = parseInt(match[2], 10) - 1

  let col = 0
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64)
  }
  col -= 1

  return { row, col }
}

/**
 * 将行列转换为单元格引用 (如 0,0 -> A1)
 */
export function getCellRef(row: number, col: number): string {
  let colStr = ''
  let n = col + 1
  while (n > 0) {
    colStr = String.fromCharCode(((n - 1) % 26) + 65) + colStr
    n = Math.floor((n - 1) / 26)
  }
  return `${colStr}${row + 1}`
}

/**
 * 解析区域引用 (如 A1:B10)
 */
export function parseRangeRef(ref: string): { startRow: number; startCol: number; endRow: number; endCol: number } | null {
  const parts = ref.split(':')
  if (parts.length !== 2) return null

  const start = parseCellRef(parts[0].trim())
  const end = parseCellRef(parts[1].trim())

  if (!start || !end) return null

  return {
    startRow: start.row,
    startCol: start.col,
    endRow: end.row,
    endCol: end.col,
  }
}

/**
 * 从单元格引用获取值
 */
export function getCellValue(
  ref: string,
  getCell: (pos: { row: number; col: number }) => Cell | undefined
): number | string | boolean {
  const parsed = parseCellRef(ref)
  if (!parsed) {
    throw new FormulaError('NAME', `无效的单元格引用：${ref}`)
  }

  const cell = getCell(parsed)
  if (!cell) {
    return 0
  }

  const value = cell.computedValue ?? cell.value
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
  return value
}

/**
 * 从区域引用获取值数组
 */
export function getRangeValues(
  rangeRef: string,
  getCell: (pos: { row: number; col: number }) => Cell | undefined
): number[][] {
  const range = parseRangeRef(rangeRef)
  if (!range) {
    throw new FormulaError('VALUE', `无效的区域引用：${rangeRef}`)
  }

  const { startRow, startCol, endRow, endCol } = range
  const values: number[][] = []

  for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
    const rowValues: number[] = []
    for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
      const cell = getCell({ row, col })
      // 空单元格返回 NaN，SUM 等函数会忽略 NaN 值
      if (!cell || cell.value === '' || cell.value === undefined || cell.value === null) {
        rowValues.push(NaN)
      } else {
        const value = cell.computedValue ?? cell.value
        const num = typeof value === 'string' ? Number(value) : value
        rowValues.push(isNaN(num as number) ? NaN : (num as number))
      }
    }
    values.push(rowValues)
  }

  return values
}

/**
 * 公式计算函数
 */
export function calculateFormula(
  formula: string,
  getCell: (pos: { row: number; col: number }) => Cell | undefined
): string | number | boolean {
  try {
    // 移除开头的 =
    const expression = formula.startsWith('=') ? formula.slice(1) : formula

    // 转换 Excel 函数为 mathjs 函数
    let processedExpression = expression
      .replace(/\bSUM\b/gi, 'sum')
      .replace(/\bAVERAGE\b/gi, 'mean')
      .replace(/\bMIN\b/gi, 'min')
      .replace(/\bMAX\b/gi, 'max')
      .replace(/\bCOUNT\b/gi, 'count')
      .replace(/\bIF\b/gi, 'if')
      .replace(/\bAND\b/gi, 'and')
      .replace(/\bOR\b/gi, 'or')
      .replace(/\bNOT\b/gi, 'not')
      .replace(/\bABS\b/gi, 'abs')
      .replace(/\bROUND\b/gi, 'round')
      .replace(/\bPOWER\b/gi, 'pow')
      .replace(/\bSQRT\b/gi, 'sqrt')
      .replace(/\bLOG\b/gi, 'log10')
      .replace(/\bLN\b/gi, 'log')
      .replace(/\bEXP\b/gi, 'exp')
      .replace(/\bSIN\b/gi, 'sin')
      .replace(/\bCOS\b/gi, 'cos')
      .replace(/\bTAN\b/gi, 'tan')
      .replace(/\bPI\b/gi, 'pi')
      .replace(/\bCONCATENATE\b/gi, 'concat')
      .replace(/\bTEXT\b/gi, 'format')

    // 处理 sum 函数的区域引用
    processedExpression = processedExpression.replace(/sum\(([A-Z]+[0-9]+:[A-Z]+[0-9]+)\)/gi, (_match, rangeRef) => {
      const values = getRangeValues(rangeRef, getCell)
      const flat = values.flat()
      const nums = flat.filter(x => typeof x === 'number' && !isNaN(x))
      return nums.reduce((a, b) => a + b, 0).toString()
    })

    // 处理 mean 函数的区域引用
    processedExpression = processedExpression.replace(/mean\(([A-Z]+[0-9]+:[A-Z]+[0-9]+)\)/gi, (_match, rangeRef) => {
      const values = getRangeValues(rangeRef, getCell)
      const flat = values.flat()
      const nums = flat.filter(x => typeof x === 'number' && !isNaN(x))
      return nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toString() : '0'
    })

    // 处理 min 函数的区域引用
    processedExpression = processedExpression.replace(/min\(([A-Z]+[0-9]+:[A-Z]+[0-9]+)\)/gi, (_match, rangeRef) => {
      const values = getRangeValues(rangeRef, getCell)
      const flat = values.flat()
      const nums = flat.filter(x => typeof x === 'number' && !isNaN(x))
      return nums.length > 0 ? Math.min(...nums).toString() : '0'
    })

    // 处理 max 函数的区域引用
    processedExpression = processedExpression.replace(/max\(([A-Z]+[0-9]+:[A-Z]+[0-9]+)\)/gi, (_match, rangeRef) => {
      const values = getRangeValues(rangeRef, getCell)
      const flat = values.flat()
      const nums = flat.filter(x => typeof x === 'number' && !isNaN(x))
      return nums.length > 0 ? Math.max(...nums).toString() : '0'
    })

    // 处理 count 函数的区域引用
    processedExpression = processedExpression.replace(/count\(([A-Z]+[0-9]+:[A-Z]+[0-9]+)\)/gi, (_match, rangeRef) => {
      const values = getRangeValues(rangeRef, getCell)
      const flat = values.flat()
      const nums = flat.filter(x => typeof x === 'number' && !isNaN(x))
      return nums.length.toString()
    })

    // 替换单元格引用 (如 A1, B2)
    processedExpression = processedExpression.replace(/\b([A-Z]+[0-9]+)\b/gi, (match) => {
      const value = getCellValue(match, getCell)
      return typeof value === 'number' ? value.toString() : `"${value}"`
    })
    processedExpression = processedExpression.replace(
      /\bVLOOKUP\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/gi,
      (_match, lookupValue, range, colIndex, exact) => {
        return `vlookup(${lookupValue}, ${range}, ${colIndex}, ${exact})`
      }
    )

    // 处理 HLOOKUP
    processedExpression = processedExpression.replace(
      /\bHLOOKUP\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/gi,
      (_match, lookupValue, range, rowIndex, exact) => {
        return `hlookup(${lookupValue}, ${range}, ${rowIndex}, ${exact})`
      }
    )

    // 处理 INDEX
    processedExpression = processedExpression.replace(
      /\bINDEX\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]*)\s*\)/gi,
      (_match, range, rowNum, colNum) => {
        return colNum ? `index(${range}, ${rowNum}, ${colNum})` : `index(${range}, ${rowNum})`
      }
    )

    // 处理 MATCH
    processedExpression = processedExpression.replace(
      /\bMATCH\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/gi,
      (_match, lookupValue, range, matchType) => {
        return `match(${lookupValue}, ${range}, ${matchType})`
      }
    )

    // 计算表达式
    const result = evaluate(processedExpression, {
      vlookup: (lookupValue: any, range: any[][], colIndex: number, exact: boolean = true) => {
        // VLOOKUP 实现
        for (const row of range) {
          if (exact ? row[0] === lookupValue : Math.abs(row[0] - lookupValue) < 0.001) {
            return row[Math.min(colIndex - 1, row.length - 1)]
          }
        }
        return '#N/A'
      },
      hlookup: (lookupValue: any, range: any[][], rowIndex: number, exact: boolean = true) => {
        // HLOOKUP 实现
        if (range.length === 0) return '#N/A'
        const firstRow = range[0]
        for (let i = 0; i < firstRow.length; i++) {
          if (exact ? firstRow[i] === lookupValue : Math.abs(firstRow[i] - lookupValue) < 0.001) {
            return range[Math.min(rowIndex - 1, range.length - 1)]?.[i] || '#N/A'
          }
        }
        return '#N/A'
      },
      index: (range: any[][], rowNum: number, colNum?: number) => {
        // INDEX 实现
        if (!range || range.length === 0) return '#REF!'
        const row = range[rowNum - 1]
        if (!row) return '#REF!'
        return colNum ? row[colNum - 1] ?? '#REF!' : row
      },
      match: (lookupValue: any, range: any[][], _matchType: number = 1) => {
        // MATCH 实现
        const flatRange = range.flat()
        for (let i = 0; i < flatRange.length; i++) {
          if (flatRange[i] === lookupValue) {
            return i + 1
          }
        }
        return '#N/A'
      },
    })

    if (typeof result === 'number' && !isFinite(result)) {
      throw new FormulaError('DIV/0', '除数不能为零')
    }

    return result
  } catch (error) {
    if (error instanceof FormulaError) {
      return `#${error.code}!`
    }
    console.error('Formula calculation error:', error)
    return '#ERROR!'
  }
}

/**
 * 检测循环引用
 */
export function detectCircularReference(
  startRow: number,
  startCol: number,
  formula: string,
  getCell: (pos: { row: number; col: number }) => Cell | undefined,
  visited = new Set<string>()
): boolean {
  const key = `${startRow},${startCol}`
  if (visited.has(key)) {
    return true
  }

  visited.add(key)

  // 提取公式中的所有单元格引用
  const refs = formula.match(/\b([A-Z]+[0-9]+)\b/gi) || []

  for (const ref of refs) {
    const parsed = parseCellRef(ref)
    if (!parsed) continue

    const cell = getCell(parsed)
    if (cell?.formula) {
      if (detectCircularReference(parsed.row, parsed.col, cell.formula, getCell, new Set(visited))) {
        return true
      }
    }
  }

  return false
}
