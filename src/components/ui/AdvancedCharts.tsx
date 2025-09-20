import React from 'react'
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart, LineChart } from 'lucide-react'
import { TimeSeriesData, ComparisonData } from '@/lib/advancedReports'

interface ChartProps {
  data: any[]
  title: string
  className?: string
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[]
  title: string
  color?: string
  className?: string
}

interface ComparisonCardProps {
  title: string
  current: number
  comparison: ComparisonData
  format?: 'currency' | 'number' | 'percentage'
  icon?: React.ReactNode
  className?: string
}

interface DonutChartProps {
  data: { [key: string]: { count: number; value: number; percentage: number } }
  title: string
  className?: string
}

interface InsightCardProps {
  insight: {
    type: 'positive' | 'negative' | 'neutral' | 'warning'
    title: string
    description: string
    value?: number
    recommendation?: string
  }
  className?: string
}

// ===== UTILITY FUNCTIONS =====
const formatValue = (value: number, format: 'currency' | 'number' | 'percentage' = 'number'): string => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('ar-EG', { 
        style: 'currency', 
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(safeValue)
    case 'percentage':
      return `${safeValue.toFixed(1)}%`
    default:
      return safeValue.toLocaleString('ar-EG')
  }
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-500" />
  }
}

const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return 'text-green-600'
    case 'down':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

// ===== SIMPLE LINE CHART =====
export const SimpleLineChart: React.FC<TimeSeriesChartProps> = ({ 
  data, 
  title, 
  color = '#3B82F6', 
  className = '' 
}) => {
  // فحص البيانات وتنظيفها
  const cleanData = data?.filter(d => d && typeof d.value === 'number' && !isNaN(d.value)) || []
  
  if (!cleanData || cleanData.length === 0) {
    return (
      <div className={`bg-white p-6 rounded-lg border ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-text">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <LineChart className="h-12 w-12 mb-2" />
          <p className="arabic-text">لا توجد بيانات للعرض</p>
        </div>
      </div>
    )
  }

  const values = cleanData.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v))
  const maxValue = values.length > 0 ? Math.max(...values) : 0
  const minValue = values.length > 0 ? Math.min(...values) : 0
  const range = maxValue - minValue || 1

  return (
    <div className={`bg-white p-6 rounded-lg border ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-text">{title}</h3>
      
      <div className="relative h-48">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{formatValue(maxValue, 'currency')}</span>
          <span>{formatValue((maxValue + minValue) / 2, 'currency')}</span>
          <span>{formatValue(minValue, 'currency')}</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-16 h-full relative">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Data line */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={cleanData.map((point, index) => {
                const x = cleanData.length > 1 ? (index / (cleanData.length - 1)) * 380 + 10 : 200
                const y = 190 - ((point.value - minValue) / range) * 180
                return `${x},${y}`
              }).join(' ')}
            />
            
            {/* Data points */}
            {cleanData.map((point, index) => {
              const x = cleanData.length > 1 ? (index / (cleanData.length - 1)) * 380 + 10 : 200
              const y = 190 - ((point.value - minValue) / range) * 180
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color}
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>{`${point.label}: ${formatValue(point.value, 'currency')}`}</title>
                </circle>
              )
            })}
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="ml-16 mt-2 flex justify-between text-xs text-gray-500">
          {data.slice(0, 5).map((point, index) => (
            <span key={index} className="arabic-text">{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== COMPARISON CARD =====
export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  current,
  comparison,
  format = 'number',
  icon,
  className = ''
}) => {
  return (
    <div className={`bg-white p-6 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon && <div className="p-2 bg-blue-100 rounded-lg ml-3">{icon}</div>}
          <div>
            <p className="text-sm font-medium text-gray-600 arabic-text">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(current, format)}</p>
          </div>
        </div>
        
        <div className="text-left">
          <div className={`flex items-center ${getTrendColor(comparison.trend)}`}>
            {getTrendIcon(comparison.trend)}
            <span className="mr-1 text-sm font-medium">
              {comparison.changePercent > 0 ? '+' : ''}{(typeof comparison.changePercent === 'number' && !isNaN(comparison.changePercent) ? comparison.changePercent : 0).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {comparison.change > 0 ? '+' : ''}{formatValue(Math.abs(comparison.change), format)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ===== DONUT CHART =====
export const DonutChart: React.FC<DonutChartProps> = ({ data, title, className = '' }) => {
  const entries = Object.entries(data)
  const total = entries.reduce((sum, [, value]) => sum + value.count, 0)
  
  if (total === 0) {
    return (
      <div className={`bg-white p-6 rounded-lg border ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-text">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <PieChart className="h-12 w-12 mb-2" />
          <p className="arabic-text">لا توجد بيانات للعرض</p>
        </div>
      </div>
    )
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
  let currentAngle = 0

  return (
    <div className={`bg-white p-6 rounded-lg border ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-text">{title}</h3>
      
      <div className="flex items-center">
        {/* Chart */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="8"
            />
            
            {entries.map(([key, value], index) => {
              const percentage = total > 0 && value.count ? (value.count / total) * 100 : 0
              const angle = (percentage / 100) * 360
              const startAngle = currentAngle
              const endAngle = currentAngle + angle
              
              const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
              const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
              const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)
              const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)
              
              const largeArcFlag = angle > 180 ? 1 : 0
              
              const pathData = [
                `M 50 50`,
                `L ${startX} ${startY}`,
                `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `Z`
              ].join(' ')
              
              currentAngle += angle
              
              return (
                <path
                  key={key}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{`${key}: ${value.count} (${percentage.toFixed(1)}%)`}</title>
                </path>
              )
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{total}</div>
              <div className="text-xs text-gray-500 arabic-text">المجموع</div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mr-6 space-y-2">
          {entries.map(([key, value], index) => (
            <div key={key} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full ml-2"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-700 arabic-text">{key}</span>
              <span className="text-sm text-gray-500 mr-2">({value.count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== BAR CHART =====
export const SimpleBarChart: React.FC<ChartProps> = ({ data, title, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white p-6 rounded-lg border ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-text">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          <BarChart3 className="h-12 w-12 mb-2" />
          <p className="arabic-text">لا توجد بيانات للعرض</p>
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value || 0))

  return (
    <div className={`bg-white p-6 rounded-lg border ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 arabic-text">{title}</h3>
      
      <div className="space-y-3">
        {data.slice(0, 8).map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 text-sm text-gray-700 arabic-text truncate">
              {item.name || item.label}
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-gray-200 rounded-full h-4 relative overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((item.value || 0) / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-20 text-sm text-gray-900 text-left">
              {formatValue(item.value || 0, 'currency')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== INSIGHT CARD =====
export const InsightCard: React.FC<InsightCardProps> = ({ insight, className = '' }) => {
  const getInsightStyles = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return '✅'
      case 'negative':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${getInsightStyles(insight.type)} ${className}`}>
      <div className="flex items-start">
        <span className="text-lg ml-3">{getInsightIcon(insight.type)}</span>
        <div className="flex-1">
          <h4 className="font-medium arabic-text">{insight.title}</h4>
          <p className="text-sm mt-1 arabic-text">{insight.description}</p>
          {insight.recommendation && (
            <p className="text-sm mt-2 font-medium arabic-text">
              💡 {insight.recommendation}
            </p>
          )}
        </div>
        {insight.value !== undefined && (
          <div className="text-right">
            <span className="text-lg font-bold">
              {formatValue(insight.value, insight.type === 'warning' ? 'percentage' : 'number')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== METRICS GRID =====
interface MetricsGridProps {
  metrics: Array<{
    title: string
    value: number
    change?: number
    format?: 'currency' | 'number' | 'percentage'
    icon?: React.ReactNode
    color?: string
  }>
  className?: string
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white p-6 rounded-lg border">
          <div className="flex items-center">
            {metric.icon && (
              <div className={`p-2 rounded-lg ml-3 ${metric.color || 'bg-blue-100'}`}>
                {metric.icon}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 arabic-text">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(metric.value, metric.format)}
              </p>
              {metric.change !== undefined && typeof metric.change === 'number' && !isNaN(metric.change) && (
                <p className={`text-sm mt-1 ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
