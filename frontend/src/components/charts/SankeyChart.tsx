import ReactECharts from 'echarts-for-react'
import type { SankeyData } from '@/types/dashboard'

interface SankeyChartProps {
  data: SankeyData
}

export function SankeyChart({ data }: SankeyChartProps) {
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: 'sankey',
        data: data.nodes.map((n) => ({
          name: n.id,
          label: {
            show: true,
            formatter: () => n.name,
          },
        })),
        links: data.links.map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value,
        })),
        emphasis: { focus: 'adjacency' },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: 400 }} notMerge />
}
