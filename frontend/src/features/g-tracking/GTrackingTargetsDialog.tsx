import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'

interface MonthlyRow {
  month: number
  budget: number
  stretch: number
}

interface PlantRow {
  plant_id: number
  plant_name: string
  budget: number
  stretch: number
}

interface TargetsData {
  year: number
  monthly: MonthlyRow[]
  plants: PlantRow[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function GTrackingTargetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'monthly' | 'plants'>('monthly')
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [plants, setPlants] = useState<PlantRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['g-tracking-targets'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<TargetsData>>('/g-tracking/targets?year=2026')
      return resp.data.data!
    },
    enabled: open,
  })

  useEffect(() => {
    if (data) {
      setMonthly(data.monthly.length > 0 ? data.monthly : MONTH_NAMES.map((_, i) => ({ month: i + 1, budget: 0, stretch: 0 })))
      setPlants(data.plants)
    }
  }, [data])

  if (!open) return null

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await apiClient.put('/g-tracking/targets', {
        year: 2026,
        monthly,
        plants: plants.map((p) => ({ plant_id: p.plant_id, budget: p.budget, stretch: p.stretch })),
      })
      qc.invalidateQueries({ queryKey: ['g-tracking'] })
      qc.invalidateQueries({ queryKey: ['g-tracking-targets'] })
      onClose()
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string }
      setError(axiosErr?.response?.data?.detail ?? axiosErr?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function updateMonthly(idx: number, field: 'budget' | 'stretch', value: string) {
    setMonthly((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: parseFloat(value) || 0 } : r)),
    )
  }

  function updatePlant(idx: number, field: 'budget' | 'stretch', value: string) {
    setPlants((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: parseInt(value) || 0 } : r)),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Edit G$ Targets (2026)</h2>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          <button
            className={`px-3 py-1 rounded text-sm ${tab === 'monthly' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setTab('monthly')}
          >
            Monthly Targets
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${tab === 'plants' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setTab('plants')}
          >
            Plant Targets
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
              {error}
            </div>
          )}

          {tab === 'monthly' && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-left">Month</th>
                  <th className="border px-2 py-1 text-right">Budget (Cumulative)</th>
                  <th className="border px-2 py-1 text-right">Stretch (Cumulative)</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((r, idx) => (
                  <tr key={r.month}>
                    <td className="border px-2 py-1">{MONTH_NAMES[r.month - 1]}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-right border rounded px-1 py-0.5"
                        value={r.budget}
                        onChange={(e) => updateMonthly(idx, 'budget', e.target.value)}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-right border rounded px-1 py-0.5"
                        value={r.stretch}
                        onChange={(e) => updateMonthly(idx, 'stretch', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'plants' && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-left">Plant</th>
                  <th className="border px-2 py-1 text-right">Budget</th>
                  <th className="border px-2 py-1 text-right">Stretch</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((r, idx) => (
                  <tr key={r.plant_id}>
                    <td className="border px-2 py-1">{r.plant_name}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        className="w-full text-right border rounded px-1 py-0.5"
                        value={r.budget}
                        onChange={(e) => updatePlant(idx, 'budget', e.target.value)}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        className="w-full text-right border rounded px-1 py-0.5"
                        value={r.stretch}
                        onChange={(e) => updatePlant(idx, 'stretch', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
