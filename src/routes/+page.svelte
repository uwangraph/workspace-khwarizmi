<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import { 
    Bell, ArrowRight, Check, Clock, AlertCircle, 
    CheckCircle2, Zap, Target, ListTodo,
    AlertTriangle, Calendar
  } from 'lucide-svelte'

  // ── Types ──────────────────────────────────────────
  interface Profile {
    id: string
    full_name: string
    role: 'admin' | 'user'
  }

  interface AttendanceRecord {
    session_id: number
    check_in: string | null
    check_out: string | null
  }

  interface Task {
    id: string
    title: string
    status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
    priority: 'low' | 'medium' | 'high'
    due_date: string | null
    progress: number
    created_by: string
  }

  interface Notification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
  }

  // ── Constants ──────────────────────────────────────
  const DAYS   = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  const PRIORITY_DOT: Record<string, string> = {
    low: '#94A3B8', medium: '#F59E0B', high: '#EF4444'
  }

  const STATUS_LABEL: Record<string, string> = {
    not_started: 'Belum Dikerjakan',
    in_progress: 'Sedang Dikerjakan',
    review: 'Review',
    revision: 'Revisi',
    done: 'Selesai',
  }

  // ── State ──────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let attendance = $state<AttendanceRecord[]>([])
  let tasks = $state<Task[]>([])
  let notifications = $state<Notification[]>([])
  let isLoading = $state(true)
  let gpsActive = $state(false)

  let now = $state(new Date())
  let clockInterval: any

  onMount(() => {
    clockInterval = setInterval(() => { now = new Date() }, 60000)
    return () => clearInterval(clockInterval)
  })

  // ── Helpers ────────────────────────────────────────
  function getGreeting() {
    const h = now.getHours()
    if (h < 4)  return 'Selamat malam'
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }

  let heroDate = $derived(
    `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  )

  function getFirstName() {
    if (!profile) return 'Pengguna'
    const n = profile.full_name.split(' ')[0]
    return n.charAt(0).toUpperCase() + n.slice(1)
  }

  let totalIn = $derived(attendance.filter(a => a.check_in !== null).length)
  let taskActive = $derived(tasks.filter(t => t.status !== 'done').length)
  let taskDone = $derived(tasks.filter(t => t.status === 'done').length)
  let taskTotal = $derived(tasks.length)
  let completionRate = $derived(taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0)
  let unreadCount = $derived(notifications.filter(n => !n.is_read).length)
  let recentNotifs = $derived(notifications.slice(0, 3))

  let recentTasks = $derived(
    tasks
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        const p: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return p[a.priority] - p[b.priority]
      })
      .slice(0, 3)
  )

  function formatDue(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: 'Terlambat', color: '#EF4444', urgent: true }
    if (diff === 0) return { label: 'Hari ini', color: '#EA580C', urgent: true }
    if (diff === 1) return { label: 'Besok', color: '#F59E0B', urgent: false }
    return { label: `${diff} hari`, color: '#64748B', urgent: false }
  }

  function formatTimeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (m < 1)  return 'Baru saja'
    if (m < 60) return `${m}m`
    if (h < 24) return `${h}h`
    return `${d}d`
  }

  function getNotifIcon(type: string): { Icon: any; bg: string; color: string } {
    const map: Record<string, { Icon: any; bg: string; color: string }> = {
      task_assigned:  { Icon: ListTodo, bg: 'bg-blue-50', color: 'text-blue-600' },
      task_accepted:  { Icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
      task_completed: { Icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
      task_ready_review: { Icon: Target, bg: 'bg-amber-50', color: 'text-amber-600' },
    }
    return map[type] ?? { Icon: Bell, bg: 'bg-slate-50', color: 'text-slate-600' }
  }

  // ── Data ───────────────────────────────────────────
  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { window.location.assign('/auth'); return }
    user = u

    const today = new Date().toISOString().split('T')[0]

    const { data: assignmentData } = await supabase
      .from('task_assignments')
      .select('task_id')
      .eq('user_id', u.id)
      .in('status', ['pending', 'accepted', 'completed'])

    const assignedTaskIds = (assignmentData ?? []).map((a: { task_id: string }) => a.task_id)

    const [profileRes, attendRes, taskRes, notifRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('attendance').select('session_id,check_in,check_out').eq('user_id', u.id).eq('date', today),
      assignedTaskIds.length > 0
        ? supabase.from('tasks').select('*').or(`created_by.eq.${u.id},id.in.(${assignedTaskIds.join(',')})`).order('created_at', { ascending: false })
        : supabase.from('tasks').select('*').eq('created_by', u.id).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10)
    ])

    if (profileRes.data) profile = profileRes.data
    if (attendRes.data)  attendance = attendRes.data
    if (taskRes.data)    tasks = taskRes.data
    if (notifRes.data)   notifications = notifRes.data
    isLoading = false
  }

  function initGps() {
    if (!navigator.geolocation) return
    navigator.geolocation.watchPosition(() => { gpsActive = true }, () => { gpsActive = false })
  }

  async function markAllRead() {
    if (!user || unreadCount === 0) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    notifications = notifications.map(n => ({ ...n, is_read: true }))
  }

  onMount(() => { loadData(); initGps() })
</script>

<svelte:head>
  <title>Dashboard — Workspace Khwarizmi</title>
</svelte:head>

<div class="min-h-screen bg-[#FFF9F0]/30 font-sans">
  
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/logo-khwarizmi.png" alt="Logo" class="w-9 h-9 rounded-xl shadow-sm p-1 bg-white border border-orange-200" />
      <div>
        <span class="font-bold text-slate-900 text-base">Workspace</span>
        <p class="text-[10px] font-medium text-orange-600">Dashboard</p>
      </div>
    </div>
    <a href="/notifications" class="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
      <Bell size={16} class="text-slate-600" />
      {#if unreadCount > 0}
        <span class="absolute -top-1 -right-1 min-w-[18px] h-5 rounded-full text-[9px] font-bold text-white bg-red-500 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      {/if}
    </a>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-40">
      <div class="w-10 h-10 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full mb-4"></div>
      <p class="text-xs text-slate-500">Menyiapkan workspace...</p>
    </div>
  {:else}
    <main class="max-w-lg mx-auto px-4 py-5 pb-24 flex flex-col gap-5">
      
      <div class="rounded-3xl p-6 shadow-lg shadow-orange-200/50" style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);">
        <div class="flex justify-between items-start mb-6">
          <div>
            <p class="text-[11px] text-orange-100/80 mb-1">{heroDate}</p>
            <h2 class="text-2xl font-bold text-white leading-tight">{getGreeting()},<br/>{getFirstName()}</h2>
          </div>
          <div class="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md flex items-center gap-2">
            <div class="w-2 h-2 rounded-full {gpsActive ? 'bg-green-400 animate-pulse' : 'bg-orange-300'}"></div>
            <span class="text-[10px] font-bold text-white">{gpsActive ? 'GPS AKTIF' : 'GPS OFF'}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
            <p class="text-xl font-bold text-white">{totalIn}/3</p>
            <p class="text-[9px] text-orange-100 font-medium">Kehadiran</p>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
            <p class="text-xl font-bold text-white">{taskActive}</p>
            <p class="text-[9px] text-orange-100 font-medium">Task Aktif</p>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
            <p class="text-xl font-bold text-white">{completionRate}%</p>
            <p class="text-[9px] text-orange-100 font-medium">Selesai</p>
          </div>
        </div>
      </div>

      {#if recentNotifs.length > 0}
        <section class="flex flex-col gap-2">
          <div class="flex justify-between items-center px-1">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pemberitahuan</p>
            <a href="/notifications" class="text-[10px] font-bold text-orange-600 flex items-center gap-1">
              Lihat Semua <ArrowRight size={12} />
            </a>
          </div>
          <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {#each recentNotifs as notif}
              {@const icon = getNotifIcon(notif.type)}
              <div class="flex items-start gap-3 p-4 {notif.is_read ? '' : 'bg-orange-50/30'}">
                <div class="w-9 h-9 rounded-xl {icon.bg} flex items-center justify-center flex-shrink-0">
                  <svelte:component this={icon.Icon} size={16} class={icon.color} />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">{notif.title}</p>
                  <p class="text-[11px] text-slate-500 truncate">{notif.message}</p>
                  <p class="text-[9px] text-slate-400 mt-1 font-medium">{formatTimeAgo(notif.created_at)}</p>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <section class="flex flex-col gap-2">
        <div class="flex justify-between items-center px-1">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Absensi Hari Ini</p>
          <a href="/absensi" class="text-[10px] font-bold text-orange-600 flex items-center gap-1">
            Detail Absensi <ArrowRight size={12} />
          </a>
        </div>
        <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {#each [
            { id: 1, label: 'Pagi', time: '08:00 - 11:30' },
            { id: 2, label: 'Siang', time: '13:30 - 15:00' },
            { id: 3, label: 'Sore', time: '16:00 - 17:00' }
          ] as s}
            {@const log = attendance.find(a => a.session_id === s.id)}
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full {log?.check_out ? 'bg-green-500' : log?.check_in ? 'bg-orange-500' : 'bg-slate-200'}"></div>
                <div>
                  <p class="text-sm font-semibold text-slate-800">{s.label}</p>
                  <p class="text-[10px] text-slate-400">{s.time}</p>
                </div>
              </div>
              <div class="text-right">
                {#if log?.check_out}
                  <span class="text-[9px] font-bold px-2 py-1 bg-green-50 text-green-600 rounded-lg">SELESAI</span>
                {:else if log?.check_in}
                  <span class="text-[9px] font-bold px-2 py-1 bg-orange-50 text-orange-600 rounded-lg">AKTIF</span>
                {:else}
                  <span class="text-[9px] font-bold px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">BELUM</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex justify-between items-center px-1">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tugas Utama</p>
          <a href="/tasks" class="text-[10px] font-bold text-green-600 flex items-center gap-1">
            Manajemen Task <ArrowRight size={12} />
          </a>
        </div>
        {#if recentTasks.length === 0}
          <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <CheckCircle2 size={32} class="text-green-200 mx-auto mb-2" />
            <p class="text-xs font-semibold text-slate-400">Tidak ada tugas mendesak</p>
          </div>
        {:else}
          <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {#each recentTasks as task}
              {@const due = formatDue(task.due_date)}
              <a href="/tasks" class="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                <div class="w-1.5 h-6 rounded-full" style="background: {PRIORITY_DOT[task.priority]}"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                  <div class="flex items-center gap-3 mt-1">
                    <span class="text-[9px] font-medium text-slate-400">{STATUS_LABEL[task.status]}</span>
                    {#if due}
                      <span class="text-[9px] font-bold flex items-center gap-1" style="color: {due.color}">
                        <Clock size={10} /> {due.label}
                      </span>
                    {/if}
                  </div>
                </div>
                {#if task.progress > 0}
                  <span class="text-[10px] font-bold text-orange-500">{task.progress}%</span>
                {/if}
              </a>
            {/each}
          </div>
        {/if}
      </section>

      <footer class="text-center py-4">
        <p class="text-[9px] text-slate-300 font-medium tracking-widest uppercase">© {now.getFullYear()} Workspace Khwarizmi</p>
      </footer>
    </main>
  {/if}
</div>