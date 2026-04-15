<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

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
    status: 'todo' | 'in_progress' | 'done'
    priority: 'low' | 'medium' | 'high'
    due_date: string | null
  }

  // ── Constants ──────────────────────────────────────
  const DAYS   = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  const PRIORITY_LABEL: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }
  const PRIORITY_COLOR: Record<string, string> = {
    low:    'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high:   'bg-red-50 text-red-600 border-red-200',
  }
  const STATUS_LABEL: Record<string, string> = { todo: 'Perlu Dikerjakan', in_progress: 'Sedang Dikerjakan', done: 'Selesai' }
  const STATUS_COLOR: Record<string, string> = {
    todo:        'bg-slate-100 text-slate-600',
    in_progress: 'bg-orange-50 text-orange-700',
    done:        'bg-green-50 text-green-700',
  }

  // ── State ──────────────────────────────────────────
  let user       = $state<User | null>(null)
  let profile    = $state<Profile | null>(null)
  let attendance = $state<AttendanceRecord[]>([])
  let tasks      = $state<Task[]>([])
  let isLoading  = $state(true)
  let gpsActive  = $state(false)

  let now = $state(new Date())
  
  let interval: NodeJS.Timeout
  onMount(() => {
    interval = setInterval(() => {
      now = new Date()
    }, 60000)
    return () => clearInterval(interval)
  })

  // ── Computed ───────────────────────────────────────
  function getGreeting() {
    const h = now.getHours()
    if (h < 4) return 'Selamat malam'
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

  let totalIn = $derived(attendance.length)
  let totalOut = $derived(attendance.filter(a => a.check_out).length)
  let taskTodo = $derived(tasks.filter(t => t.status === 'todo').length)
  let taskInProgress = $derived(tasks.filter(t => t.status === 'in_progress').length)
  let taskDone = $derived(tasks.filter(t => t.status === 'done').length)
  let taskTotal = $derived(tasks.length)
  let completionRate = $derived(taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0)

  let recentTasks = $derived(
    tasks.filter(t => t.status !== 'done').slice(0, 3)
  )

  // ── Data ───────────────────────────────────────────
  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { 
      location.assign('/auth')
      return 
    }
    user = u

    const today = new Date().toISOString().split('T')[0]
    const [profileRes, attendRes, taskRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('attendance').select('session_id,check_in,check_out')
        .eq('user_id', u.id).eq('date', today),
      supabase.from('tasks').select('id,title,status,priority,due_date')
        .or(`assigned_to.eq.${u.id},created_by.eq.${u.id}`)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (profileRes.data) profile = profileRes.data
    if (attendRes.data) attendance = attendRes.data
    if (taskRes.data) tasks = taskRes.data
    isLoading = false
  }

  function initGps() {
    if (!navigator.geolocation) return
    navigator.geolocation.watchPosition(
      () => { gpsActive = true },
      () => { gpsActive = false },
      { enableHighAccuracy: true }
    )
  }

  async function signOut() {
    const confirmed = confirm('Apakah Anda yakin ingin keluar dari aplikasi?')
    if (confirmed) {
      await supabase.auth.signOut()
      location.assign('/auth')
    }
  }

  function formatDue(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: 'Terlambat', color: 'text-red-600' }
    if (diff === 0) return { label: 'Hari ini', color: 'text-orange-600' }
    if (diff === 1) return { label: 'Besok', color: 'text-green-600' }
    if (diff <= 3) return { label: `${diff} hari lagi`, color: 'text-orange-600' }
    return { label: `${diff} hari lagi`, color: 'text-slate-500' }
  }

  onMount(() => {
    loadData()
    initGps()
  })
</script>

<svelte:head>
  <title>Dashboard — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%); font-family:'Inter',sans-serif;">

  <!-- Header Navigation -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
<!-- Logo Image -->
<img 
  src="/logo-khwarizmi.png" 
  alt="Logo Khwarizmi" 
  class="w-9 h-9 rounded-xl object-contain shadow-lg p-1 bg-white border border-orange-200"
/>      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
          Workspace Khwarizmi
        </span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">Platform Manajemen Kerja</p>
      </div>
    </div>
    <button onclick={signOut}
            class="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl px-4 py-2.5 transition-all duration-200">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      <span>Keluar</span>
    </button>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-40">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-medium text-slate-500">Memuat data dashboard...</p>
      </div>
    </div>
  {:else}
  <main class="max-w-lg mx-auto px-4 py-6 pb-20 flex flex-col gap-6">

    <!-- Hero Section with Khwarizmi Brand Colors -->
    <div class="rounded-2xl p-6 shadow-xl" style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);">
      <div class="flex items-start justify-between mb-6">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FED7AA" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <p class="text-[11px] font-medium tracking-wide text-orange-100">{heroDate}</p>
          </div>
          <h2 class="text-2xl font-bold text-white leading-tight mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {getGreeting()},<br />{getFirstName()}
          </h2>
          <p class="text-sm text-orange-100 mt-2">Semangat bekerja hari ini!</p>
        </div>
        
        <!-- GPS Status -->
        <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
             style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2);">
          <div class="relative">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={gpsActive ? '#86EFAC' : '#FED7AA'} stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div class="absolute -top-1 -right-1 w-2 h-2 rounded-full {gpsActive ? 'bg-green-400 animate-pulse' : 'bg-orange-300'}"></div>
          </div>
          <span class="text-[10px] font-semibold tracking-wide uppercase text-orange-100">
            {gpsActive ? 'Lokasi Terdeteksi' : 'Lokasi Tidak Aktif'}
          </span>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl p-4 transition-all hover:scale-[1.02] duration-200"
             style="background:rgba(255,255,255,0.12); backdrop-filter:blur(10px);">
          <div class="flex items-center justify-between mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FED7AA" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="text-[10px] font-bold text-orange-200 tracking-wide">HARI INI</span>
          </div>
          <p class="text-3xl font-bold text-white mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {totalIn}<span class="text-sm font-medium text-orange-200">/3</span>
          </p>
          <p class="text-xs text-orange-100">Sesi kehadiran</p>
          <div class="mt-2 h-1.5 bg-orange-800 rounded-full overflow-hidden">
            <div class="h-full bg-white rounded-full transition-all duration-500" style="width: {(totalIn/3)*100}%"></div>
          </div>
          <p class="text-[10px] text-orange-200 mt-2">{totalOut} sesi telah selesai</p>
        </div>

        <div class="rounded-xl p-4 transition-all hover:scale-[1.02] duration-200"
             style="background:rgba(255,255,255,0.12); backdrop-filter:blur(10px);">
          <div class="flex items-center justify-between mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A7F3D0" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span class="text-[10px] font-bold text-green-200 tracking-wide">PROGRES</span>
          </div>
          <p class="text-3xl font-bold text-white mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {completionRate}<span class="text-sm font-medium text-green-200">%</span>
          </p>
          <p class="text-xs text-orange-100">Penyelesaian task</p>
          <div class="mt-2 h-1.5 bg-orange-800 rounded-full overflow-hidden">
            <div class="h-full bg-green-400 rounded-full transition-all duration-500" style="width: {completionRate}%"></div>
          </div>
          <p class="text-[10px] text-orange-200 mt-2">{taskDone} dari {taskTotal} task selesai</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions Menu -->
    <div class="grid grid-cols-2 gap-3">
      <a href="/absensi"
         class="group bg-white rounded-xl p-4 border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all duration-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 group-hover:bg-orange-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold text-slate-800">Presensi</p>
            <p class="text-xs font-medium text-slate-500 mt-0.5">{totalIn} dari 3 sesi</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2" class="group-hover:translate-x-1 transition-transform">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </a>

      <a href="/tasks"
         class="group bg-white rounded-xl p-4 border border-green-100 hover:border-green-300 hover:shadow-md transition-all duration-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 group-hover:bg-green-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold text-slate-800">Tugas</p>
            <p class="text-xs font-medium text-slate-500 mt-0.5">{taskTodo + taskInProgress} perlu dikerjakan</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" class="group-hover:translate-x-1 transition-transform">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </a>
    </div>

    <!-- Attendance Status Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-1 h-5 rounded-full bg-orange-500"></div>
          <p class="text-xs font-bold tracking-wide uppercase text-slate-500">Status Kehadiran Hari Ini</p>
        </div>
        <a href="/absensi" class="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1">
          <span>Detail</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
      </div>

      <div class="bg-white rounded-xl overflow-hidden border border-slate-200 divide-y divide-slate-100">
        {#each [
          { id: 1, name: 'Sesi Pagi', time: '08:00 – 11:30' },
          { id: 2, name: 'Sesi Siang', time: '13:30 – 15:00' },
          { id: 3, name: 'Sesi Sore', time: '16:10 – 22:00' },
        ] as s}
          {@const rec = attendance.find(a => a.session_id === s.id)}
          <div class="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                        {rec?.check_out ? 'bg-green-50' : rec?.check_in ? 'bg-orange-50' : 'bg-slate-50'}">
              {#if rec?.check_out}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {:else if rec?.check_in}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              {/if}
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-800">{s.name}</p>
              <p class="text-[11px] font-medium text-slate-500 mt-0.5">{s.time}</p>
            </div>
            <span class="text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-lg
                         {rec?.check_out
                           ? 'bg-green-50 text-green-700'
                           : rec?.check_in
                             ? 'bg-orange-50 text-orange-700'
                             : 'bg-slate-100 text-slate-500'}">
              {rec?.check_out ? 'Selesai' : rec?.check_in ? 'Sedang Berlangsung' : 'Belum Masuk'}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Active Tasks Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-1 h-5 rounded-full bg-green-500"></div>
          <p class="text-xs font-bold tracking-wide uppercase text-slate-500">Tugas yang Perlu Dikerjakan</p>
        </div>
        <a href="/tasks" class="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors flex items-center gap-1">
          <span>Kelola</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
      </div>

      <div class="bg-white rounded-xl overflow-hidden border border-slate-200">
        {#if recentTasks.length === 0}
          <div class="py-12 text-center">
            <div class="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p class="text-base font-semibold text-slate-700 mb-1">Semua Tugas Selesai!</p>
            <p class="text-xs text-slate-500">Selamat, Anda telah menyelesaikan semua tugas</p>
          </div>
        {:else}
          <div class="divide-y divide-slate-100">
            {#each recentTasks as task}
              {@const due = formatDue(task.due_date)}
              <div class="px-4 py-3.5 hover:bg-slate-50 transition-colors">
                <div class="flex items-start gap-3">
                  <div class="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0
                              {task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-orange-500' : 'bg-slate-400'}">
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                    <div class="flex items-center gap-2 mt-2 flex-wrap">
                      <span class="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border
                                   {PRIORITY_COLOR[task.priority]}">
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                      <span class="text-[9px] font-bold tracking-wide uppercase px-2 py-1 rounded-full
                                   {STATUS_COLOR[task.status]}">
                        {STATUS_LABEL[task.status]}
                      </span>
                      {#if due}
                        <span class="text-[10px] font-semibold {due.color} flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          {due.label}
                        </span>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Task Summary -->
      {#if taskTotal > 0}
        <div class="mt-3 flex items-center justify-between text-xs">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-slate-400"></div>
              <span class="text-slate-500">To Do: {taskTodo}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-orange-500"></div>
              <span class="text-slate-500">Progress: {taskInProgress}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-slate-500">Selesai: {taskDone}</span>
            </div>
          </div>
          <span class="text-slate-400 font-medium">{completionRate}% tercapai</span>
        </div>
      {/if}
    </div>

    <!-- Footer Info -->
    <div class="text-center pt-4">
      <p class="text-[10px] text-slate-400">
        © {new Date().getFullYear()} Workspace Khwarizmi · Platform Manajemen Kinerja
      </p>
    </div>

  </main>
  {/if}
</div>