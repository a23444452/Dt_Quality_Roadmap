import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { GItemEntry, GItemSolutionMapEntry } from './types'
import type { User } from '@/types/auth'

interface Props {
  item: GItemEntry
  user: User | null
  /** All status options available to change to (for the editor). */
  statuses: { id: number; code: string; name: string; color: string }[]
  selectedPlantIds?: number[]
}

type CellCoord = { plantId: number; lineId: number }

export function GItemRowExpanded({ item, user, statuses, selectedPlantIds }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<CellCoord | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Build unique plants and lines for this solution, filtered by selectedPlantIds
  const { plants, lines, cellMap } = useMemo(() => {
    const filterSet = selectedPlantIds && selectedPlantIds.length > 0
      ? new Set(selectedPlantIds)
      : null

    const plantIds = new Set<number>()
    const lineIds = new Set<number>()
    const cm = new Map<string, GItemSolutionMapEntry>()
    for (const sm of item.solution_map) {
      if (filterSet && !filterSet.has(sm.plant_id)) continue
      plantIds.add(sm.plant_id)
      lineIds.add(sm.tank_line_id)
      cm.set(`${sm.plant_id}:${sm.tank_line_id}`, sm)
    }
    const plantList = Array.from(plantIds).map((id) => {
      const first = item.solution_map.find((sm) => sm.plant_id === id)!
      return { id, name: first.plant_name }
    })
    const lineList = Array.from(lineIds).map((id) => {
      const first = item.solution_map.find((sm) => sm.tank_line_id === id)!
      return { id, name: first.tank_line_name, plant_id: first.plant_id }
    })
    return { plants: plantList, lines: lineList, cellMap: cm }
  }, [item.solution_map, selectedPlantIds])

  function canEditCell(plantId: number): boolean {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role !== 'editor') return false
    const plantMatch = user.plants?.some((p) => p.id === plantId) ?? false
    // Process name match is an approximation; the backend enforces precise scope.
    const processMatch = user.processes?.some((p) => p.name === item.process) ?? false
    return plantMatch && processMatch
  }

  async function saveCell(newStatusId: number) {
    if (!editing) return
    const cell = cellMap.get(`${editing.plantId}:${editing.lineId}`)
    if (!cell) return
    setError(null)
    try {
      await apiClient.put(`/solution-map/${cell.solution_map_id}`, {
        status_id: newStatusId,
        version: cell.version,
      })
      qc.invalidateQueries({ queryKey: ['g-items'] })
      qc.invalidateQueries({ queryKey: ['solution-map'] })
      setEditing(null)
    } catch (err) {
      const axiosErr = err as {
        response?: { status?: number; data?: { detail?: unknown } }
        message?: string
      }
      const status = axiosErr?.response?.status
      const detail = axiosErr?.response?.data?.detail
      const detailText =
        typeof detail === 'string'
          ? detail
          : detail !== undefined
          ? JSON.stringify(detail)
          : axiosErr?.message ?? 'Unknown error'
      if (status === 409) {
        setError('Someone else updated this cell. Refresh and try again.')
      } else if (status === 403) {
        setError('Out of your permission scope.')
      } else {
        setError(`Save failed (${status ?? 'network'}): ${detailText}`)
      }
    }
  }

  if (item.solution_map.length === 0) {
    return (
      <div className="px-6 py-4 bg-gray-50 text-sm text-muted-foreground">
        No solution map entries yet for this solution.
      </div>
    )
  }

  return (
    <div className="px-6 py-4 bg-gray-50">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
          {error}
        </div>
      )}
      <div className="overflow-auto max-h-[60vh] border rounded bg-white">
        <table className="text-sm border-collapse min-w-max">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="text-left px-2 py-1 text-xs font-semibold text-gray-600 border sticky left-0 bg-gray-100 z-20 whitespace-nowrap">
                Plant
              </th>
              {lines.map((ln) => (
                <th
                  key={ln.id}
                  className="px-2 py-1 text-xs font-semibold text-gray-600 border whitespace-nowrap"
                >
                  {ln.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plants.map((p) => (
              <tr key={p.id}>
                <td className="px-2 py-1 border font-medium whitespace-nowrap sticky left-0 bg-white z-10">
                  {p.name}
                </td>
                {lines.map((ln) => {
                  const cell = cellMap.get(`${p.id}:${ln.id}`)
                  if (!cell) {
                    return (
                      <td key={ln.id} className="px-2 py-1 border text-center text-gray-300">
                        —
                      </td>
                    )
                  }
                  const editable = canEditCell(p.id)
                  return (
                    <td
                      key={ln.id}
                      className={`px-2 py-1 border text-center whitespace-nowrap ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
                      style={{ backgroundColor: cell.status_color, color: '#fff' }}
                      title={editable ? 'Click to edit' : 'Out of your permission scope'}
                      onClick={() => editable && setEditing({ plantId: p.id, lineId: ln.id })}
                    >
                      {cell.status_code}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm">Change to:</span>
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => saveCell(s.id)}
              className="px-2 py-1 rounded text-xs text-white"
              style={{ backgroundColor: s.color }}
            >
              {s.code}
            </button>
          ))}
          <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
