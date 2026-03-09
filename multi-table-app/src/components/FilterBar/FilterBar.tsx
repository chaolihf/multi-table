import { useState, useRef, useEffect } from 'react'
import { useSheetStore } from '../../store/sheetStore'
import './FilterBar.css'

interface FilterBarProps {
  sheetId: string
  column: number
  columnName: string
}

type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between'

const textOperators: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: '包含' },
  { value: 'equals', label: '等于' },
  { value: 'startsWith', label: '开头是' },
  { value: 'endsWith', label: '结尾是' },
]

const numberOperators: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: '等于' },
  { value: 'greaterThan', label: '大于' },
  { value: 'lessThan', label: '小于' },
  { value: 'between', label: '介于' },
]

export function FilterBar({ sheetId, column, columnName }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasFilter, setHasFilter] = useState(false)
  const [operator, setOperator] = useState<FilterOperator>('contains')
  const [value, setValue] = useState('')
  const [value2, setValue2] = useState('')
  const [isNumber, setIsNumber] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const { filters, setFilter, removeFilter, clearFilters } = useSheetStore()

  const sheetFilters = filters.get(sheetId) || []
  const currentFilter = sheetFilters.find((f) => f.column === column)

  useEffect(() => {
    if (currentFilter) {
      setHasFilter(true)
      setOperator(currentFilter.operator)
      setValue(String(currentFilter.value))
      setValue2(currentFilter.value2 ? String(currentFilter.value2) : '')
      // 判断是否为数字列
      setIsNumber(['greaterThan', 'lessThan', 'between'].includes(currentFilter.operator))
    } else {
      setHasFilter(false)
      setValue('')
      setValue2('')
    }
  }, [currentFilter])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleApply = () => {
    setFilter(sheetId, column, {
      column,
      operator,
      value: isNumber ? Number(value) : value,
      value2: isNumber && value2 ? Number(value2) : undefined,
    })
    setHasFilter(true)
    setIsOpen(false)
  }

  const handleClear = () => {
    removeFilter(sheetId, column)
    setHasFilter(false)
    setValue('')
    setValue2('')
    setIsOpen(false)
  }

  const handleClearAll = () => {
    clearFilters(sheetId)
    setHasFilter(false)
    setIsOpen(false)
  }

  const operators = isNumber ? numberOperators : textOperators

  return (
    <div className="filter-bar" ref={menuRef}>
      <button
        className={`filter-button ${hasFilter ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="筛选"
      >
        🗂️
      </button>

      {isOpen && (
        <div className="filter-menu">
          <div className="filter-menu-header">
            <strong>{columnName}</strong>
            <button className="clear-all" onClick={handleClearAll}>清除所有筛选</button>
          </div>

          <div className="filter-menu-body">
            <div className="filter-row">
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as FilterOperator)}
              >
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-row">
              <input
                type={isNumber ? 'number' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="输入值"
                autoFocus
              />
            </div>

            {operator === 'between' && (
              <div className="filter-row">
                <input
                  type={isNumber ? 'number' : 'text'}
                  value={value2}
                  onChange={(e) => setValue2(e.target.value)}
                  placeholder="输入上限值"
                />
              </div>
            )}

            <div className="filter-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isNumber}
                  onChange={(e) => setIsNumber(e.target.checked)}
                />
                数值比较
              </label>
            </div>

            <div className="filter-actions">
              <button onClick={handleClear}>清除</button>
              <button onClick={handleApply} className="primary" disabled={!value}>
                应用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
