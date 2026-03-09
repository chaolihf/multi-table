import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'
import './ChartView.css'

export type ChartType = 'bar' | 'line' | 'pie'

interface ChartDataItem {
  name: string
  [key: string]: any
}

interface ChartViewProps {
  data: ChartDataItem[]
  type: ChartType
  title?: string
  onClose: () => void
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D']

export function ChartView({ data, type, title = '数据图表', onClose }: ChartViewProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!chartRef.current) return
    setLoading(true)
    try {
      const dataUrl = await toPng(chartRef.current, { quality: 1.0 })
      const link = document.createElement('a')
      link.download = `${title}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.length > 0 && Object.keys(data[0])
              .filter((key) => key !== 'name')
              .map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
              ))}
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.length > 0 && Object.keys(data[0])
              .filter((key) => key !== 'name')
              .map((key, index) => (
                <Line key={key} dataKey={key} stroke={COLORS[index % COLORS.length]} />
              ))}
          </LineChart>
        )
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={Object.keys(data[0]).find((key) => key !== 'name') || 'value'}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )
      default:
        return null
    }
  }

  return (
    <div className="chart-view-overlay" onClick={onClose}>
      <div className="chart-view" onClick={(e) => e.stopPropagation()}>
        <div className="chart-header">
          <h3>{title}</h3>
          <div className="chart-actions">
            <button onClick={handleExport} disabled={loading}>
              {loading ? '导出中...' : '📥 导出图片'}
            </button>
            <button onClick={onClose}>关闭</button>
          </div>
        </div>
        <div className="chart-container" ref={chartRef}>
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
