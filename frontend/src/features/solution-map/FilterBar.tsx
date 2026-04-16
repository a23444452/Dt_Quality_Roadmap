import { Button } from '@/components/ui/button'
import type { FilterOptions } from '@/types/reference-data'

interface Filters {
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
  const filteredStations = filterOptions?.stations.filter(
    (s) => !filters.process_id || s.process_id === filters.process_id
  ) ?? []

  function handleChange(key: keyof Filters, value: string) {
    const numVal = value === '' ? undefined : Number(value)
    if (key === 'process_id') {
      onFiltersChange({ ...filters, process_id: numVal, station_id: undefined })
    } else {
      onFiltersChange({ ...filters, [key]: numVal })
    }
  }

  function handleReset() {
    onFiltersChange({})
  }

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-white border-b">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Process</label>
        <select
          className="border rounded px-2 py-1.5 text-sm min-w-[140px]"
          value={filters.process_id ?? ''}
          onChange={(e) => handleChange('process_id', e.target.value)}
        >
          <option value="">All Processes</option>
          {filterOptions?.processes.map((p) => (
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
