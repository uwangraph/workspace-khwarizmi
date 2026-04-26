// ── Shared Utilities & Constants — Admin Panel ──────────────────────────────
import type { AttendanceRecord, Holiday, Task, TaskAssignment, ThursdayRule } from './_types'

// ── Constants ────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  not_started: 'Belum Mulai',
  in_progress:  'Dikerjakan',
  review:       'Review',
  revision:     'Revisi',
  done:         'Selesai',
}

export const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-600' },
  in_progress:  { bg: 'bg-blue-50',   text: 'text-blue-700'  },
  review:       { bg: 'bg-purple-50', text: 'text-purple-700' },
  revision:     { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  done:         { bg: 'bg-green-50',  text: 'text-green-700'  },
}

export const PRIORITY_DOT: Record<string, string> = {
  low: '#94A3B8', medium: '#F59E0B', high: '#EF4444',
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi',
}

export const SESSIONS = [
  { id: 1, label: 'Pagi' },
  { id: 2, label: 'Siang' },
  { id: 3, label: 'Sore' },
  { id: 4, label: 'Lembur' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
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
export function getWorkingDays(month: string, holidays: Holiday[]): number {
  const [year, m] = month.split('-').map(Number)
  const daysInMonth = new Date(year, m, 0).getDate()
  const holidaySet = new Set(
    holidays.filter(h => h.date.startsWith(month)).map(h => h.date)
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

/** Dapatkan rule Kamis untuk tanggal tertentu, atau undefined jika belum diatur */
export function getThursdayRule(date: string, rules: ThursdayRule[]): ThursdayRule | undefined {
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
  month: string,
  attendance: AttendanceRecord[],
  holidays: Holiday[]
) {
  const records = attendance.filter(a => a.user_id === userId && a.date.startsWith(month))
  const dateSet = new Set(records.map(r => r.date))
  let totalPresentDays = 0
  let totalLate = 0

  dateSet.forEach(date => {
    if (isHoliday(date, holidays)) return
    const dayRecords = records.filter(r => r.date === date)
    if (dayRecords.some(r => r.check_in)) totalPresentDays++
    if (dayRecords.some(r => r.late)) totalLate++
  })

  const totalWorkingDays = getWorkingDays(month, holidays)
  const presentRate = totalWorkingDays > 0
    ? Math.round((totalPresentDays / totalWorkingDays) * 100)
    : 0

  return { totalPresentDays, totalLate, totalWorkingDays, presentRate }
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
  return { total, done, overdue, completionRate }
}
