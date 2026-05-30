import ReactECharts from 'echarts-for-react'
import type { ChartData } from './types'

interface AgentChartProps {
  chart: ChartData
}

export function AgentChart({ chart }: AgentChartProps) {
  if (chart.type === 'table') {
    return <AgentTable chart={chart} />
  }

  const option = buildChartOption(chart)
  return (
    <div className="my-3 rounded-lg border bg-white p-3">
      <ReactECharts option={option} style={{ height: 280 }} />
    </div>
  )
}

function buildChartOption(chart: ChartData): Record<string, unknown> {
  const { type, config, data, title } = chart

  if (type === 'bar') {
    const xField = config.x_field || 'name'
    const yField = config.y_field || 'value'
    return {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(d => String(d[xField] ?? '')),
        axisLabel: { rotate: data.length > 6 ? 30 : 0, fontSize: 11 },
      },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.map(d => d[yField]), itemStyle: { color: '#3b82f6' } }],
      grid: { bottom: 60, left: 50, right: 20 },
    }
  }

  if (type === 'pie') {
    const seriesField = config.series_field || 'name'
    const valueField = config.value_field || 'value'
    return {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['30%', '65%'],
        data: data.map(d => ({ name: String(d[seriesField] ?? ''), value: d[valueField] })),
        label: { fontSize: 11 },
      }],
    }
  }

  if (type === 'line') {
    const xField = config.x_field || 'month'
    const yFields = config.y_fields || [config.y_field || 'value']
    const colors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444']
    return {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: yFields },
      xAxis: { type: 'category', data: data.map(d => String(d[xField] ?? '')) },
      yAxis: { type: 'value' },
      series: yFields.map((field, i) => ({
        name: field,
        type: 'line',
        data: data.map(d => d[field]),
        itemStyle: { color: colors[i % colors.length] },
      })),
      grid: { bottom: 60, left: 50, right: 20 },
    }
  }

  return {}
}

function AgentTable({ chart }: { chart: ChartData }) {
  const { data, title } = chart
  if (!data.length) return <p className="text-sm text-gray-500">No data</p>

  const columns = Object.keys(data[0])

  return (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <p className="bg-gray-50 px-3 py-2 text-sm font-medium">{title}</p>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-3 py-2 font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map(col => (
                <td key={col} className="px-3 py-1.5">{String(row[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && (
        <p className="px-3 py-2 text-xs text-gray-500">Showing 20 of {data.length} rows</p>
      )}
    </div>
  )
}
