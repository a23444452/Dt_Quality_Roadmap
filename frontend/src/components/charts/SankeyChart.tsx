import ReactECharts from 'echarts-for-react'
import type { SankeyData } from '@/types/dashboard'

interface SankeyChartProps {
  data: SankeyData
}

const LAYER_COLORS: Record<string, string> = {
  defect_category: '#5470c6',
  defect_type: '#91cc75',
  solution: '#fac858',
  plant: '#ee6666',
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen - 2) + '..'
}

export function SankeyChart({ data }: SankeyChartProps) {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]))

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
        fontSize: 13,
      },
      formatter: (params: { data?: { name?: string; value?: number; source?: string; target?: string } }) => {
        if (!params.data) return ''
        if (params.data.source && params.data.target) {
          const sourceNode = nodeMap.get(params.data.source)
          const targetNode = nodeMap.get(params.data.target)
          return `<div style="font-weight:600;margin-bottom:4px">${sourceNode?.name ?? params.data.source}</div>
                  <div style="color:#6b7280">→ ${targetNode?.name ?? params.data.target}</div>
                  <div style="margin-top:4px;font-size:14px;font-weight:600">${params.data.value} Solutions</div>`
        }
        const node = nodeMap.get(params.data.name ?? '')
        return `<div style="font-weight:600">${node?.name ?? params.data.name}</div>
                <div style="color:#6b7280;font-size:12px">${node?.layer?.replace('_', ' ').toUpperCase() ?? ''}</div>`
      },
    },
    grid: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
    },
    series: [
      {
        type: 'sankey',
        left: 120,
        right: 120,
        top: 20,
        bottom: 20,
        nodeWidth: 18,
        nodeGap: 12,
        layoutIterations: 32,
        orient: 'horizontal',
        draggable: true,
        data: data.nodes.map((n) => ({
          name: n.id,
          itemStyle: {
            color: LAYER_COLORS[n.layer] ?? '#999',
            borderColor: LAYER_COLORS[n.layer] ?? '#999',
          },
          label: {
            show: true,
            position: n.layer === 'plant' ? 'right' : 'left',
            fontSize: 11,
            color: '#374151',
            formatter: () => truncateText(n.name, 18),
            padding: [0, 4],
          },
        })),
        links: data.links.map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value,
        })),
        emphasis: {
          focus: 'adjacency',
          itemStyle: {
            borderWidth: 2,
          },
          lineStyle: {
            opacity: 0.8,
          },
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.4,
        },
        levels: [
          { depth: 0, itemStyle: { color: LAYER_COLORS.defect_category }, lineStyle: { color: 'source', opacity: 0.4 } },
          { depth: 1, itemStyle: { color: LAYER_COLORS.defect_type }, lineStyle: { color: 'source', opacity: 0.4 } },
          { depth: 2, itemStyle: { color: LAYER_COLORS.solution }, lineStyle: { color: 'source', opacity: 0.4 } },
          { depth: 3, itemStyle: { color: LAYER_COLORS.plant }, lineStyle: { color: 'source', opacity: 0.4 } },
        ],
      },
    ],
  }

  const chartHeight = Math.max(450, data.nodes.length * 12)

  return (
    <div>
      <ReactECharts option={option} style={{ height: chartHeight }} notMerge />
      <div className="flex justify-center gap-6 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.defect_category }} />
          Defect Category
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.defect_type }} />
          Defect Type
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.solution }} />
          D^t Solution
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.plant }} />
          Plant
        </div>
      </div>
    </div>
  )
}
