// ── Shared Types — Admin Panel ──────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  role: 'admin' | 'user'
  avatar_url?: string | null
  phone?: string | null
  position?: string | null
  joined_at?: string | null
}

export interface Task {
  id: string
  title: string
  description?: string | null
  status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  start_date?: string | null
  progress: number
  created_by: string
  created_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  session_id: number
  date: string
  check_in: string | null
  check_out: string | null
  late: boolean
  forgot_checkout: boolean
}

export interface TaskAssignment {
  task_id: string
  user_id: string
  status: string
}

export interface Holiday {
  id: string
  date: string
  name: string
  created_by?: string | null
  created_at: string
}

export type AdminTab = 'overview' | 'users' | 'tasks' | 'attendance' | 'rekap' | 'holidays'
export type RekapSubTab = 'tasks' | 'attendance' | 'users'
