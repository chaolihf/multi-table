import { useSheetStore } from '../../store/sheetStore'
import './SortButton.css'

interface SortButtonProps {
  sheetId: string
  column: number
}

export function SortButton({ sheetId, column }: SortButtonProps) {
  const { sort, setSort, clearSort } = useSheetStore()
  
  const sheetSort = sort.get(sheetId)
  const currentSort = sheetSort?.column === column ? sheetSort : null

  const handleSort = (direction: 'asc' | 'desc') => {
    if (currentSort?.direction === direction) {
      clearSort(sheetId)
    } else {
      setSort(sheetId, column, direction)
    }
  }

  return (
    <div className="sort-button">
      <button
        className={`sort-icon ${currentSort?.direction === 'asc' ? 'active' : ''}`}
        onClick={() => handleSort('asc')}
        title="升序"
      >
        ▲
      </button>
      <button
        className={`sort-icon ${currentSort?.direction === 'desc' ? 'active' : ''}`}
        onClick={() => handleSort('desc')}
        title="降序"
      >
        ▼
      </button>
    </div>
  )
}
