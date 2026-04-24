import { LayoutGrid, TrendingUp, Wrench, CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { KpiData } from '@/types/dashboard'

interface KpiCardsProps {
  data: KpiData
}

export function KpiCards({ data }: KpiCardsProps) {
  const nonMpCount = data.total_solutions - data.mp_count
  const developingPercentage = nonMpCount > 0 ? (data.developing_count / nonMpCount) * 100 : 0
  const plannedPercentage = nonMpCount > 0 ? (data.planned_count / nonMpCount) * 100 : 0

  const cards = [
    {
      title: 'Total Solutions',
      value: data.total_solutions.toLocaleString(),
      icon: LayoutGrid,
      accent: 'text-foreground',
      iconBg: 'bg-slate-100',
      extra: (
        <p className="text-xs text-muted-foreground mt-2">
          {data.mp_count} MP + {data.developing_count} Developing + {data.planned_count} Planned
        </p>
      ),
    },
    {
      title: 'MP Rate',
      value: `${data.mp_percentage.toFixed(1)}%`,
      icon: TrendingUp,
      accent: 'text-green-600',
      iconBg: 'bg-green-50',
      extra: (
        <div className="mt-2">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(data.mp_percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{data.mp_count} of {data.total_solutions} solutions</p>
        </div>
      ),
    },
    {
      title: 'Developing',
      value: data.developing_count.toLocaleString(),
      icon: Wrench,
      accent: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      extra: (
        <p className="text-xs text-muted-foreground mt-2">
          {developingPercentage.toFixed(1)}% of {nonMpCount} non-MP solutions
        </p>
      ),
    },
    {
      title: 'Planned',
      value: data.planned_count.toLocaleString(),
      icon: CalendarClock,
      accent: 'text-blue-600',
      iconBg: 'bg-blue-50',
      extra: (
        <p className="text-xs text-muted-foreground mt-2">
          {plannedPercentage.toFixed(1)}% of {nonMpCount} non-MP solutions
        </p>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.accent}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${card.accent}`}>{card.value}</p>
              {card.extra}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
