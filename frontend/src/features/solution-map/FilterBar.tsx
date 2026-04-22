import { Button } from '@/components/ui/button'
import type { FilterOptions } from '@/types/reference-data'

interface Filters {
  process_category?: string
  process_id?: number
  station_id?: number
  defect_category_id?: number
  plant_id?: number
  status_id?: number
}

interface FilterBarProps {
  filterOptions: FilterOptions | undefined
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function FilterBar({ filterOptions, filters, onFiltersChange }: FilterBarProps) {
  // Filter processes by selected category
  const filteredProcesses = filterOptions?.processes.filter(
    (p) => !filters.process_category || p.category === filters.process_category
  ) ?? []

  // Filter stations by selected process
  const filteredStations = filterOptions?.stations.filter(
    (s) => !filters.process_id || s.process_id === filters.process_id
  ) ?? []

  function handleChange(key: keyof Filters, value: string) {
    if (key === 'process_category') {
      // Reset process and station when category changes
      onFiltersChange({ ...filters, process_category: value || undefined, process_id: undefined, station_id: undefined })
    } else if (key === 'process_id') {
      // Reset station when process changes
      const numVal = value === '' ? undefined : Number(value)
      onFiltersChange({ ...filters, process_id: numVal, station_id: undefined })
    } else {
      const numVal = value === '' ? undefined : Number(value)
      onFiltersChange({ ...filters, [key]: numVal })
    }
  }

  function handleReset() {
    onFiltersChange({})
  }

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-white border-b">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Process Category</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[140px]"
          value={filters.process_category ?? ''}
          onChange={(e) => handleChange('process_category', e.target.value)}
        >
          <option value="">All Categories</option>
          {filterOptions?.process_categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Process</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[140px]"
          value={filters.process_id ?? ''}
          onChange={(e) => handleChange('process_id', e.target.value)}
        >
          <option value="">All Processes</option>
          {filteredProcesses.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Station</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[140px]"
          value={filters.station_id ?? ''}
          onChange={(e) => handleChange('station_id', e.target.value)}
          disabled={filteredStations.length === 0}
        >
          <option value="">All Stations</option>
          {filteredStations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Defect Category</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[160px]"
          value={filters.defect_category_id ?? ''}
          onChange={(e) => handleChange('defect_category_id', e.target.value)}
        >
          <option value="">All Categories</option>
          {filterOptions?.defect_categories.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Plant</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[120px]"
          value={filters.plant_id ?? ''}
          onChange={(e) => handleChange('plant_id', e.target.value)}
        >
          <option value="">All Plants</option>
          {filterOptions?.plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Status</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[120px]"
          value={filters.status_id ?? ''}
          onChange={(e) => handleChange('status_id', e.target.value)}
        >
          <option value="">All Statuses</option>
          {filterOptions?.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium invisible">Reset</label>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  )
}
