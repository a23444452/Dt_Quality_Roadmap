export interface Status {
  id: number
  code: string
  name: string
  color: string
}

export interface FilterOptions {
  processes: Array<{ id: number; name: string }>
  stations: Array<{ id: number; name: string; process_id: number }>
  defect_categories: Array<{ id: number; name: string }>
  plants: Array<{ id: number; name: string }>
  statuses: Status[]
}
