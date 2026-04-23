// Process 區塊熱點（圓點位置）
export interface ProcessZone {
  id: string
  process: string // API 中的 process 名稱
  displayName: string // 顯示用的名稱
  processCategory: string
  stations: string[] // 該 Process 包含的站點名稱
  x: number // percentage - 圓點中心 X 座標
  y: number // percentage - 圓點中心 Y 座標
}

// Process Category 顏色（對應圖片上的區塊顏色）
export const PROCESS_CATEGORY_COLORS: Record<string, string> = {
  Melting: '#dc2626', // red - 熔融製程
  Finishing: '#2563eb', // blue - 加工製程
}

// 各 Process 的顏色（用於圓點顯示）
export const PROCESS_COLORS: Record<string, string> = {
  Melting: '#dc2626', // red
  Forming: '#7c3aed', // violet
  BOD: '#f97316', // orange
  CBW: '#2563eb', // blue
  INSP: '#16a34a', // green
  DP: '#0891b2', // cyan
}

// Process 區塊熱點（對應圖片底部的彩色 Process 標籤位置）
// 站點資料來源：D^t Solution Quality Roadmap.xlsx - Station 工作表
export const PROCESS_ZONES: ProcessZone[] = [
  {
    id: 'melting',
    process: 'Melting',
    displayName: 'Melting',
    processCategory: 'Melting',
    stations: ['Melting'],
    x: 11,
    y: 93.8,
  },
  {
    id: 'forming',
    process: 'Forming',
    displayName: 'Forming',
    processCategory: 'Melting',
    stations: ['FDM'],
    x: 17.6,
    y: 88.3,
  },
  {
    id: 'bod',
    process: 'BOD',
    displayName: 'BOD',
    processCategory: 'Melting',
    stations: ['TAM', 'VBS', 'Inspection', 'LAM', 'ST10', 'FB', 'BTF'],
    x: 26.2,
    y: 82.1,
  },
  {
    id: 'cbw',
    process: 'CBW',
    displayName: 'CBW',
    processCategory: 'Finishing',
    stations: [
      'ASF', 'CFS', 'Cutting', 'OUT C/V',
      'CC', 'EP', 'R', 'Pre Washer',
      'BJ', 'USN', 'DB', 'RB', 'AK', 'ULB', 'System',
    ],
    x: 48.1,
    y: 65.5,
  },
  {
    id: 'inspection',
    process: 'INSP',
    displayName: 'Inspection',
    processCategory: 'Finishing',
    stations: ['SA/Tilt', 'IPC', 'EIS', 'ISIS/LSIS', 'MRS', 'VCV(INSP)', 'OGA', 'System'],
    x: 69,
    y: 49.3,
  },
  {
    id: 'dense-pack',
    process: 'DP',
    displayName: 'Dense Pack',
    processCategory: 'Finishing',
    stations: ['VCV(DP)', 'GT', 'OHCV/TRCV', 'Packing', 'Paper feeder', 'Paper transporter'],
    x: 83.7,
    y: 36.9,
  },
]
