export interface Status {
  id: number
  code: string
  name: string
  color: string
}

export interface FilterOptions {
  process_categories: Array<{ name: string }>
  processes: Array<{ id: number; name: string; category: string }>
  stations: Array<{ id: number; name: string; process_id: number }>
  defect_categories: Array<{ id: number; name: string }>
  plants: Array<{ id: number; name: string }>
  statuses: Status[]
}
