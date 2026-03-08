import { describe, it, expect } from 'vitest'
import { parseCellRef, getCellRef, parseRangeRef, FormulaError } from '../utils/formula'

describe('Formula Utils', () => {
  describe('parseCellRef', () => {
    it('should parse simple cell reference A1', () => {
      const result = parseCellRef('A1')
      expect(result).toEqual({ row: 0, col: 0 })
    })

    it('should parse cell reference B2', () => {
      const result = parseCellRef('B2')
      expect(result).toEqual({ row: 1, col: 1 })
    })

    it('should parse cell reference Z26', () => {
      const result = parseCellRef('Z26')
      expect(result).toEqual({ row: 25, col: 25 })
    })

    it('should parse cell reference AA1', () => {
      const result = parseCellRef('AA1')
      expect(result).toEqual({ row: 0, col: 26 })
    })

    it('should return null for invalid reference', () => {
      const result = parseCellRef('invalid')
      expect(result).toBeNull()
    })

    it('should handle lowercase input', () => {
      const result = parseCellRef('a1')
      expect(result).toEqual({ row: 0, col: 0 })
    })
  })

  describe('getCellRef', () => {
    it('should convert row 0, col 0 to A1', () => {
      const result = getCellRef(0, 0)
      expect(result).toBe('A1')
    })

    it('should convert row 1, col 1 to B2', () => {
      const result = getCellRef(1, 1)
      expect(result).toBe('B2')
    })

    it('should convert row 0, col 26 to AA1', () => {
      const result = getCellRef(0, 26)
      expect(result).toBe('AA1')
    })
  })

  describe('parseRangeRef', () => {
    it('should parse range A1:B2', () => {
      const result = parseRangeRef('A1:B2')
      expect(result).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 1,
        endCol: 1,
      })
    })

    it('should parse range with spaces A1 : B2', () => {
      const result = parseRangeRef('A1 : B2')
      expect(result).toEqual({
        startRow: 0,
        startCol: 0,
        endRow: 1,
        endCol: 1,
      })
    })

    it('should return null for invalid range', () => {
      const result = parseRangeRef('invalid')
      expect(result).toBeNull()
    })
  })
})

describe('FormulaError', () => {
  it('should create error with code and message', () => {
    const error = new FormulaError('DIV/0', 'Division by zero')
    expect(error.code).toBe('DIV/0')
    expect(error.message).toBe('Division by zero')
    expect(error.name).toBe('FormulaError')
  })
})
