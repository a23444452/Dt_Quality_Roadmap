export interface PlantRef {
  id: number
  name: string
}

export interface ProcessRef {
  id: number
  name: string
}

export interface User {
  id: number
  username: string
  display_name: string
  role: 'viewer' | 'editor' | 'admin'
  plants: PlantRef[]
  processes: ProcessRef[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  display_name: string
  plant_ids: number[]
  process_ids: number[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}
