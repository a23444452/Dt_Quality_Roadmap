export interface SolutionMapStatus {
  map_id: number
  status_id: number
  status_code: string
  notes: string | null
  version: number
}

export interface SolutionRow {
  id: number
  name: string
  description: string | null
  quality_attribute: string | null
  defect_type: string
  defect_category: string
  station: string
  process: string
  statuses: Record<string, SolutionMapStatus | null>
}

export interface LineColumn {
  id: number
  key: string
  name: string
  plant: string
  line_type: string
}

export interface PivotData {
  solutions: SolutionRow[]
  lines: LineColumn[]
  filters: import('@/types/reference-data').FilterOptions
}
