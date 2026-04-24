import { useState, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { StatusBadge } from '@/components/charts/StatusBadge'
import { StatusCellEditor } from './StatusCellEditor'
import type { SolutionRow, LineColumn, SolutionMapStatus } from '@/types/solution-map'
import type { Status } from '@/types/reference-data'
import type { User } from '@/types/auth'

interface PivotTableProps {
  solutions: SolutionRow[]
  lines: LineColumn[]
  statuses: Status[]
  canEdit: boolean
  user: User | null
}

interface CellSelection {
  solution: SolutionRow
  line: LineColumn
  current: SolutionMapStatus | null
}

const columnHelper = createColumnHelper<SolutionRow>()

function getStatusColor(statuses: Status[], code: string): string {
  return statuses.find((s) => s.code === code)?.color ?? '#6b7280'
}

export function PivotTable({ solutions, lines, statuses, canEdit, user }: PivotTableProps) {
  const [selected, setSelected] = useState<CellSelection | null>(null)

  // Check if user can edit a specific cell based on their assigned plants and processes
  const canEditCell = useCallback((solution: SolutionRow, line: LineColumn): boolean => {
    if (!canEdit || !user) return false
    if (user.role === 'admin') return true

    // Editor can only edit if they have access to both the process and plant
    const userProcessNames = user.processes?.map((p) => p.name) ?? []
    const userPlantNames = user.plants?.map((p) => p.name) ?? []

    const hasProcessAccess = userProcessNames.includes(solution.process)
    const hasPlantAccess = userPlantNames.includes(line.plant)

    return hasProcessAccess && hasPlantAccess
  }, [canEdit, user])

  const columns = useMemo(() => {
    const infoColumns = [
      columnHelper.accessor('defect_category', {
        header: 'Defect Category',
        cell: (info) => <span className="font-medium text-xs">{info.getValue()}</span>,
        size: 130,
      }),
      columnHelper.accessor('quality_attribute', {
        header: 'Quality Attribute',
        cell: (info) => <span className="text-xs">{info.getValue() ?? '—'}</span>,
        size: 150,
      }),
      columnHelper.accessor('station', {
        header: 'Station',
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
        size: 100,
      }),
      columnHelper.accessor('name', {
        header: 'D^t Solution',
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
        size: 180,
      }),
    ]

    // Group lines by plant
    const plantGroups = lines.reduce<Record<string, LineColumn[]>>((acc, line) => {
      if (!acc[line.plant]) acc[line.plant] = []
      acc[line.plant].push(line)
      return acc
    }, {})

    const lineColumns = Object.entries(plantGroups).flatMap(([, plantLines]) =>
      plantLines.map((line) =>
        columnHelper.accessor(
          (row) => row.statuses[line.key] ?? null,
          {
            id: `line_${line.key}`,
            header: line.name,
            cell: (info) => {
              const status = info.getValue() as SolutionMapStatus | null
              if (!status) return <span className="text-gray-300 text-xs">—</span>
              return (
                <StatusBadge
                  code={status.status_code}
                  color={getStatusColor(statuses, status.status_code)}
                />
              )
            },
            size: 80,
          }
        )
      )
    )

    return [...infoColumns, ...lineColumns]
  }, [lines, statuses])

  const table = useReactTable({
    data: solutions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Group lines by plant for column header grouping
  const plantGroups = useMemo(() => {
    return lines.reduce<Record<string, LineColumn[]>>((acc, line) => {
      if (!acc[line.plant]) acc[line.plant] = []
      acc[line.plant].push(line)
      return acc
    }, {})
  }, [lines])

  function handleCellClick(solution: SolutionRow, line: LineColumn) {
    if (!canEditCell(solution, line)) return
    setSelected({
      solution,
      line,
      current: solution.statuses[line.key] ?? null,
    })
  }

  return (
    <>
      <div>
        <table className="border-collapse text-sm" style={{ minWidth: 'max-content' }}>
          <thead>
            {/* Plant group header row */}
            <tr className="bg-gray-100">
              <th colSpan={5} className="border border-gray-200 px-2 py-1" />
              {Object.entries(plantGroups).map(([plant, plantLines]) => (
                <th
                  key={plant}
                  colSpan={plantLines.length}
                  className="border border-gray-200 px-2 py-1 text-center text-xs font-semibold text-gray-600 bg-blue-50"
                >
                  {plant}
                </th>
              ))}
            </tr>
            {/* Column headers */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border border-gray-200 px-2 py-1.5 text-left text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 z-10"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border border-gray-200 px-4 py-8 text-center text-gray-400"
                >
                  No solutions found. Adjust filters or add solutions.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 even:bg-gray-50/30">
                  {row.getVisibleCells().map((cell) => {
                    const isLineCell = cell.column.id.startsWith('line_')
                    const lineKey = isLineCell ? cell.column.id.replace('line_', '') : null
                    const line = lineKey ? lines.find((l) => l.key === lineKey) : null
                    const cellEditable = isLineCell && line && canEditCell(row.original, line)

                    return (
                      <td
                        key={cell.id}
                        className={`border border-gray-200 px-2 py-1 ${
                          cellEditable
                            ? 'cursor-pointer hover:bg-blue-50 transition-colors'
                            : ''
                        }`}
                        onClick={() => {
                          if (isLineCell && line) handleCellClick(row.original, line)
                        }}
                        title={
                          cellEditable
                            ? `Click to edit ${row.original.name} × ${line?.name}`
                            : isLineCell && canEdit && !cellEditable
                            ? 'No permission to edit this cell'
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <StatusCellEditor
          open={true}
          onClose={() => setSelected(null)}
          solutionName={selected.solution.name}
          lineName={selected.line.name}
          lineKey={selected.line.key}
          current={selected.current}
          statuses={statuses}
        />
      )}
    </>
  )
}
