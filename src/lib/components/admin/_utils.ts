// ── Shared Utilities & Constants — Admin Panel ──────────────────────────────
import type { AttendanceRecord, Holiday, Task, TaskAssignment, SpecialRule } from './_types'

// ── Constants ────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  not_started: 'Belum Mulai',
  in_progress:  'Dikerjakan',
  review:       'Review',
  revision:     'Revisi',
  done:         'Selesai',
}

export const STATUS_STYLE: Record<string, { bg: string; text: string; bar: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-200' },
  in_progress:  { bg: 'bg-blue-50',   text: 'text-blue-700',  bar: 'bg-blue-400'  },
  review:       { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-400' },
  revision:     { bg: 'bg-amber-50',  text: 'text-amber-700',  bar: 'bg-amber-400'  },
  done:         { bg: 'bg-green-50',  text: 'text-green-700',  bar: 'bg-green-400'  },
}

export const PRIORITY_DOT: Record<string, string> = {
  low: '#94A3B8', medium: '#F59E0B', high: '#EF4444',
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi',
}

export const PRIORITY_WEIGHT: Record<string, number> = {
  low: 10, medium: 30, high: 100,
}

export const SESSIONS = [
  { id: 1, label: 'Pagi',   name: 'Sesi Pagi',  start: '08:00', end: '11:30' },
  { id: 2, label: 'Siang',  name: 'Sesi Siang', start: '13:30', end: '15:00' },
  { id: 3, label: 'Sore',   name: 'Sesi Sore',  start: '16:00', end: '17:00' },
  { id: 4, label: 'Lembur', name: 'Lembur',     start: '20:00', end: '23:59' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function formatWA(phone: string | null | undefined): string {
  if (!phone) return ''
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  return cleaned
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function isHoliday(date: string, holidays: Holiday[]): boolean {
  return holidays.some(h => h.date === date)
}

export function getHolidayName(date: string, holidays: Holiday[]): string | null {
  return holidays.find(h => h.date === date)?.name ?? null
}

/**
 * Hitung hari kerja aktual dalam sebulan
 * Mengecualikan: Sabtu, Minggu, JUMAT (libur mingguan), dan hari libur terdaftar.
 * Kamis tetap 1 hari kerja (meski hanya sesi pagi).
 */
export function getWorkingDays(period: string, holidays: Holiday[]): number {
  // Jika formatnya YYYY (Tahunan)
  if (period.length === 4) {
    let total = 0
    for (let m = 1; m <= 12; m++) {
      total += getWorkingDays(`${period}-${String(m).padStart(2, '0')}`, holidays)
    }
    return total
  }

  const [year, m] = period.split('-').map(Number)
  const daysInMonth = new Date(year, m, 0).getDate()
  const holidaySet = new Set(
    holidays.filter(h => h.date.startsWith(period)).map(h => h.date)
  )
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, m - 1, d).getDay()
    const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // 0=Minggu, 5=Jumat, 6=Sabtu → libur mingguan
    if (dow !== 0 && dow !== 5 && dow !== 6 && !holidaySet.has(dateStr)) count++
  }
  return count
}

// ── Thursday Helpers ─────────────────────────────────────────────────────────

/** Cek apakah tanggal adalah hari Kamis (dow === 4) */
export function isThursday(dateStr: string): boolean {
  return new Date(dateStr).getDay() === 4
}

/** Cek apakah tanggal adalah hari Jumat (dow === 5) — libur mingguan */
export function isFriday(dateStr: string): boolean {
  return new Date(dateStr).getDay() === 5
}

/** Dapatkan rule khusus untuk tanggal tertentu, atau undefined jika belum diatur */
export function getSpecialRule(date: string, rules: SpecialRule[]): SpecialRule | undefined {
  return rules.find(r => r.date === date)
}

/**
 * Ambil daftar n hari Kamis ke depan mulai dari hari ini
 */
export function getUpcomingThursdays(count = 10): string[] {
  const result: string[] = []
  const d = new Date()
  // Mulai dari hari ini, cari Kamis
  while (result.length < count) {
    if (d.getDay() === 4) {
      result.push(d.toISOString().split('T')[0])
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

/**
 * Statistik kehadiran bulanan satu user (holiday-aware)
 */
export function getMonthlyAttendanceStat(
  userId: string,
  period: string,
  attendance: AttendanceRecord[],
  holidays: Holiday[]
) {
  const records = attendance.filter(a => a.user_id === userId && a.date.startsWith(period))
  const dateSet = new Set(records.map(r => r.date))
  let totalPresentDays = 0
  let totalLate = 0

  dateSet.forEach(date => {
    if (isHoliday(date, holidays)) return
    const dayRecords = records.filter(r => r.date === date)
    if (dayRecords.some(r => r.clock_in)) totalPresentDays++
    if (dayRecords.some(r => r.late)) totalLate++
  })

  // Calculate Overtime (Session 4)
  const overtimeRecords = records.filter(r => r.session_id === 4 && r.clock_in && r.clock_out)
  let totalOvertimeMs = 0
  overtimeRecords.forEach(r => {
    totalOvertimeMs += new Date(r.clock_out!).getTime() - new Date(r.clock_in!).getTime()
  })
  const totalOvertimeHours = Math.round((totalOvertimeMs / (1000 * 60 * 60)) * 10) / 10

  const totalWorkingDays = getWorkingDays(period, holidays)
  const presentRate = totalWorkingDays > 0
    ? Math.round((totalPresentDays / totalWorkingDays) * 100)
    : 0

  return { totalPresentDays, totalLate, totalWorkingDays, presentRate, totalOvertimeHours }
}

/**
 * Statistik performa task satu user
 */
export function getUserPerformanceStats(
  userId: string,
  tasks: Task[],
  assignments: TaskAssignment[]
) {
  const taskIds = assignments
    .filter(a => a.user_id === userId && a.status !== 'rejected')
    .map(a => a.task_id)
  const userTasks = tasks.filter(t => taskIds.includes(t.id))
  
  const total = userTasks.length
  const done = userTasks.filter(t => t.status === 'done').length
  const overdue = userTasks.filter(
    t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()
  ).length
  
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

  // Calculate Weighted Performance Score
  // Logic: Earned Points * (Completion Rate / 100)
  // This rewards both volume/difficulty and reliability.
  const pointsEarned = userTasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + (PRIORITY_WEIGHT[t.priority] || 10), 0)
    
  const performanceScore = Math.round(pointsEarned * (completionRate / 100))

  return { total, done, overdue, completionRate, performanceScore }
}
