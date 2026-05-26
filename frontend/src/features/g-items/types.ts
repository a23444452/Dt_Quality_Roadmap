export type ReasonCode = 'QI' | 'FMEA_H_RISK' | 'OTHER'

export interface GItemSolutionMapEntry {
  plant_id: number
  plant_name: string
  tank_line_id: number
  tank_line_name: string
  status_id: number
  status_code: string
  status_color: string
  solution_map_id: number
  version: number
  is_g_tracking: boolean
  g_complete_date: string | null
}

export interface GItemEntry {
  id: number
  name: string
  process: string
  station: string
  quality_attribute: string | null
  reason: ReasonCode | null
  remark: string | null
  solution_map: GItemSolutionMapEntry[]
}

export interface GItemFilters {
  plant_ids?: number[]
  process_ids?: number[]
  /** Include 'UNSPECIFIED' to match NULL reason. */
  reasons?: (ReasonCode | 'UNSPECIFIED')[]
  search?: string
  page?: number
  limit?: number
}

export interface GItemUpdatePayload {
  reason?: ReasonCode | null
  remark?: string | null
}

export const REASON_LABELS: Record<ReasonCode | 'UNSPECIFIED', string> = {
  QI: 'QI',
  FMEA_H_RISK: 'FMEA H-risk',
  OTHER: 'Other',
  UNSPECIFIED: 'Unspecified',
}
