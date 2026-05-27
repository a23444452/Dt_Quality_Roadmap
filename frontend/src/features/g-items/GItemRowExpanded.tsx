import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import apiClient from '@/lib/api-client'
import type { GItemEntry, GItemSolutionMapEntry } from './types'
import type { User } from '@/types/auth'

interface Props {
  item: GItemEntry
  user: User | null
  statuses: { id: number; code: string; name: string; color: string }[]
  selectedPlantIds?: number[]
}

type CellCoord = { plantId: number; lineId: number }

export function GItemRowExpanded({ item, user, statuses, selectedPlantIds }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<CellCoord | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  async function toggleGTracking(cell: GItemSolutionMapEntry, newDate?: string) {
    setError(null)
    const newTracking = !cell.is_g_tracking
    try {
      await apiClient.put(`/solution-map/${cell.solution_map_id}/g-tracking`, {
        is_g_tracking: newTracking,
        g_complete_date: newTracking ? (newDate || cell.g_complete_date) : null,
      })
      qc.invalidateQueries({ queryKey: ['g-items'] })
      qc.invalidateQueries({ queryKey: ['g-tracking'] })
    } catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string }
      const detail = axiosErr?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : axiosErr?.message ?? 'Failed to update')
    }
  }

  async function updateCompleteDate(cell: GItemSolutionMapEntry, dateStr: string) {
    setError(null)
    try {
      await apiClient.put(`/solution-map/${cell.solution_map_id}/g-tracking`, {
        is_g_tracking: true,
        g_complete_date: dateStr || null,
      })
      qc.invalidateQueries({ queryKey: ['g-items'] })
      qc.invalidateQueries({ queryKey: ['g-tracking'] })
    } catch (err) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string }
      const detail = axiosErr?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : axiosErr?.message ?? 'Failed to update')
    }
  }

  if (item.solution_map.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground">
        No solution map entries yet for this solution.
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
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
                  <td key={ln.id} className="px-1 py-1 border text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className={`px-2 py-0.5 rounded text-xs text-white ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
                        style={{ backgroundColor: cell.status_color }}
                        title={editable ? 'Click to edit status' : ''}
                        onClick={() => editable && setEditing({ plantId: p.id, lineId: ln.id })}
                      >
                        {cell.status_code}
                      </div>
                      {editable && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => toggleGTracking(cell)}
                            className={`p-0.5 rounded ${cell.is_g_tracking ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                            title={cell.is_g_tracking ? 'Remove from G$ Tracking' : 'Add to G$ Tracking'}
                          >
                            <Star size={12} fill={cell.is_g_tracking ? 'currentColor' : 'none'} />
                          </button>
                          {cell.is_g_tracking && (
                            <input
                              type="date"
                              className="text-[10px] w-[90px] border rounded px-0.5"
                              value={cell.g_complete_date ?? ''}
                              onChange={(e) => updateCompleteDate(cell, e.target.value)}
                              title="Complete Date"
                            />
                          )}
                        </div>
                      )}
                      {!editable && cell.is_g_tracking && (
                        <Star size={10} className="text-amber-500" fill="currentColor" />
                      )}
                    </div>
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
