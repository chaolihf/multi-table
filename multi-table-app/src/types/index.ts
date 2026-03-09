/**
 * 单元格位置标识
 */
export interface CellPosition {
  row: number
  col: number
}

/**
 * 单元格样式
 */
export interface CellStyle {
  backgroundColor?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  borderTop?: string
  borderBottom?: string
  borderLeft?: string
  borderRight?: string
}

/**
 * 单元格链接
 */
export interface CellLink {
  url: string
  text: string
}

/**
 * 单元格图片
 */
export interface CellImage {
  src: string
  alt?: string
  width?: number
  height?: number
}

/**
 * 单元格数据
 */
export interface Cell {
  value: string | number | boolean
  style?: CellStyle
  formula?: string
  computedValue?: string | number | boolean
  link?: CellLink
  image?: CellImage
}

/**
 * 工作表数据
 */
export interface Sheet {
  id: string
  name: string
  rows: number
  cols: number
  cells: Map<string, Cell> // key: "row,col"
  colWidths: number[]
  rowHeights: number[]
}

/**
 * 选区范围
 */
export interface Selection {
  anchor: CellPosition
  focus: CellPosition
}

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'editor' | 'viewer'

/**
 * 用户信息
 */
export interface User {
  id: string
  name: string
  role: UserRole
  color?: string
}

/**
 * 操作类型
 */
export type OperationType =
  | 'SET_CELL'
  | 'DELETE_CELL'
  | 'INSERT_ROW'
  | 'DELETE_ROW'
  | 'INSERT_COL'
  | 'DELETE_COL'
  | 'SET_STYLE'
  | 'SET_COL_WIDTH'
  | 'SET_ROW_HEIGHT'

/**
 * 操作记录
 */
export interface Operation {
  type: OperationType
  sheetId: string
  payload: Record<string, unknown>
  timestamp: number
  userId: string
}
