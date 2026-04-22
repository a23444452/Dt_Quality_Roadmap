export interface SankeyNode {
  id: string
  name: string
  layer: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface PlantCoverage {
  plant: string
  mp_percentage: number
  total: number
}

export interface KpiData {
  total_solutions: number
  mp_count: number
  mp_percentage: number
  developing_count: number
  planned_count: number
  coverage_by_plant: PlantCoverage[]
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export interface FilterOption {
  id: number
  name: string
}

export interface DashboardFilterOptions {
  defect_categories: FilterOption[]
  processes: FilterOption[]
}

export interface DashboardSummary {
  kpi: KpiData
  sankey: SankeyData
  filter_options: DashboardFilterOptions
}
