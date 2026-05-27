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

  const INFO_COL_SIZES = [130, 150, 100, 180, 200]
  const INFO_COL_COUNT = INFO_COL_SIZES.length
  const INFO_COL_LEFTS = INFO_COL_SIZES.reduce<number[]>((acc, size, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + INFO_COL_SIZES[i - 1])
    return acc
  }, [])
  const INFO_COL_TOTAL = INFO_COL_SIZES.reduce((a, b) => a + b, 0)

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
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => <span className="text-xs">{info.getValue() ?? '—'}</span>,
        size: 200,
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
              <th
                colSpan={INFO_COL_COUNT}
                className="border border-gray-200 px-2 py-1 sticky left-0 bg-gray-100 z-20"
                style={{ minWidth: INFO_COL_TOTAL }}
              />
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
                {headerGroup.headers.map((header, colIdx) => {
                  const isInfoCol = colIdx < INFO_COL_COUNT
                  return (
                    <th
                      key={header.id}
                      className={`border border-gray-200 px-2 py-1.5 text-left text-xs font-medium text-gray-600 whitespace-nowrap sticky top-0 bg-gray-50 ${
                        isInfoCol ? 'z-[30]' : 'z-10'
                      }`}
                      style={{
                        width: header.getSize(),
                        ...(isInfoCol ? { left: INFO_COL_LEFTS[colIdx] } : {}),
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  )
                })}
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
              table.getRowModel().rows.map((row, rowIdx) => (
                <tr key={row.id} className="hover:bg-gray-50 even:bg-gray-50/30">
                  {row.getVisibleCells().map((cell, colIdx) => {
                    const isLineCell = cell.column.id.startsWith('line_')
                    const isInfoCol = colIdx < INFO_COL_COUNT
                    const lineKey = isLineCell ? cell.column.id.replace('line_', '') : null
                    const line = lineKey ? lines.find((l) => l.key === lineKey) : null
                    const cellEditable = isLineCell && line && canEditCell(row.original, line)
                    const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'

                    return (
                      <td
                        key={cell.id}
                        className={`border border-gray-200 px-2 py-1 ${
                          isInfoCol ? `sticky z-10 ${rowBg}` : ''
                        } ${
                          cellEditable
                            ? 'cursor-pointer hover:bg-blue-50 transition-colors'
                            : ''
                        }`}
                        style={isInfoCol ? { left: INFO_COL_LEFTS[colIdx] } : undefined}
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
          solutionId={selected.solution.id}
          solutionName={selected.solution.name}
          tankLineId={selected.line.id}
          lineName={selected.line.name}
          lineKey={selected.line.key}
          current={selected.current}
          statuses={statuses}
        />
      )}
    </>
  )
}
