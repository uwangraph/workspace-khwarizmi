export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url?: string | null
  phone?: string | null
  position?: string | null
  address?: string | null
  birth_date?: string | null
  joined_at?: string | null
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
  priority: 'low' | 'medium' | 'high'
  progress: number
  start_date: string | null
  due_date: string | null
  created_by: string
  created_at: string
  subtasks?: any[]
}

export interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  accepted_at: string | null
  completed_at: string | null
}

export interface AttendanceRecord {
  id: string
  user_id: string
  session_id: number
  date: string
  check_in: string | null
  check_out: string | null
  photo_in_url: string | null
  photo_out_url: string | null
  forgot_checkout: boolean
  late: boolean
  late_reason: string | null
}

export interface Holiday {
  id: string
  date: string
  name: string
}

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}