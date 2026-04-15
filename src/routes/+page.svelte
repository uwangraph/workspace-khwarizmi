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
  const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember']

  const PRIORITY_LABEL: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }
  const PRIORITY_COLOR: Record<string, string> = {
    low:    'bg-slate-100 text-slate-500 border-slate-200',
    medium: 'bg-amber-50 text-amber-600 border-amber-200',
    high:   'bg-red-50 text-red-500 border-red-200',
  }
  const STATUS_LABEL: Record<string, string> = { todo: 'To Do', in_progress: 'On Progress', done: 'Selesai' }
  const STATUS_COLOR: Record<string, string> = {
    todo:        'bg-slate-100 text-slate-500',
    in_progress: 'bg-blue-50 text-blue-600',
    done:        'bg-green-50 text-green-600',
  }

  // ── State ──────────────────────────────────────────
  let user       = $state<User | null>(null)
  let profile    = $state<Profile | null>(null)
  let attendance = $state<AttendanceRecord[]>([])
  let tasks      = $state<Task[]>([])
  let isLoading  = $state(true)
  let gpsActive  = $state(false)

  let now = $state(new Date())
  $effect(() => {
    const t = setInterval(() => now = new Date(), 60_000)
    return () => clearInterval(t)
  })

  // ── Computed ───────────────────────────────────────
  let greeting = $derived(() => {
    const h = now.getHours()
    return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'
  })

  let heroDate = $derived(
    `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  )

  let firstName = $derived(() => {
    if (!profile) return ''
    const n = profile.full_name.split(' ')[0]
    return n.charAt(0).toUpperCase() + n.slice(1)
  })

  let totalIn   = $derived(attendance.length)
  let totalOut  = $derived(attendance.filter(a => a.check_out).length)
  let taskTodo  = $derived(tasks.filter(t => t.status === 'todo').length)
  let taskDone  = $derived(tasks.filter(t => t.status === 'done').length)
  let taskTotal = $derived(tasks.length)

  let recentTasks = $derived(
    tasks.filter(t => t.status !== 'done').slice(0, 3)
  )

  // ── Data ───────────────────────────────────────────
  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
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

    if (profileRes.data) profile    = profileRes.data
    if (attendRes.data)  attendance = attendRes.data
    if (taskRes.data)    tasks      = taskRes.data
    isLoading = false
  }

  function initGps() {
    if (!navigator.geolocation) return
    navigator.geolocation.watchPosition(
      () => gpsActive = true,
      () => gpsActive = false
    )
  }

  function signOut() {
    if (confirm('Yakin ingin keluar?')) {
      supabase.auth.signOut().then(() => location.assign('/auth'))
    }
  }

  function formatDue(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0,0,0,0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0)  return { label: 'Terlambat', color: 'text-red-500' }
    if (diff === 0) return { label: 'Hari ini', color: 'text-amber-500' }
    if (diff === 1) return { label: 'Besok', color: 'text-blue-500' }
    return { label: `${diff} hari lagi`, color: 'text-slate-400' }
  }

  onMount(() => {
    loadData()
    initGps()
  })
</script>

<svelte:head>
  <title>Khwarizmi Hub</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen" style="background:#f0f2f5;font-family:'DM Sans',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
           style="background:linear-gradient(135deg,#3b82f6,#6366f1);">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="font-bold text-slate-900 text-base" style="font-family:'Syne',sans-serif;">Khwarizmi</span>
    </div>
    <button onclick={signOut}
            class="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-4 py-2
                   hover:bg-red-100 transition-colors tracking-wide uppercase"
            style="font-family:'DM Sans',sans-serif;">
      Keluar
    </button>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-32">
      <svg class="animate-spin w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
    </div>
  {:else}
  <main class="max-w-lg mx-auto px-4 py-5 pb-12 flex flex-col gap-5">

    <!-- Hero Card -->
    <div class="rounded-3xl p-6" style="background:#0f172a;">
      <div class="flex items-start justify-between mb-5">
        <div>
          <p class="text-[11px] font-bold tracking-widest uppercase mb-1.5" style="color:#475569;">{heroDate}</p>
          <h2 class="text-xl font-bold text-white" style="font-family:'Syne',sans-serif;">
            {greeting()},<br />{firstName()}
          </h2>
        </div>
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
             style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);">
          <span class="w-2 h-2 rounded-full flex-shrink-0 {gpsActive ? 'bg-green-400' : 'bg-slate-600'}"
                style="{gpsActive ? 'box-shadow:0 0 0 3px rgba(34,197,94,0.2)' : ''}"></span>
          <span class="text-[10px] font-bold tracking-widest uppercase" style="color:#64748b;">
            {gpsActive ? 'GPS Aktif' : 'GPS Off'}
          </span>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl px-4 py-3" style="background:rgba(255,255,255,0.07);">
          <p class="text-[10px] font-bold tracking-widest uppercase mb-1" style="color:#475569;">Absensi Hari Ini</p>
          <p class="text-2xl font-bold text-white" style="font-family:'Syne',sans-serif;">
            {totalIn}<span class="text-sm font-medium" style="color:#475569;">/3 sesi</span>
          </p>
          <p class="text-[10px] mt-1" style="color:#64748b;">{totalOut} sesi selesai</p>
        </div>
        <div class="rounded-2xl px-4 py-3" style="background:rgba(255,255,255,0.07);">
          <p class="text-[10px] font-bold tracking-widest uppercase mb-1" style="color:#475569;">Task Aktif</p>
          <p class="text-2xl font-bold text-white" style="font-family:'Syne',sans-serif;">
            {taskTodo}<span class="text-sm font-medium" style="color:#475569;"> todo</span>
          </p>
          <p class="text-[10px] mt-1" style="color:#64748b;">{taskDone}/{taskTotal} selesai</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 gap-3">
      <a href="/absensi"
         class="bg-white rounded-2xl px-5 py-4 border border-slate-100 flex items-center gap-3
                hover:border-slate-200 hover:shadow-sm transition-all group">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style="background:#eff6ff;">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                  stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold text-slate-900">Absensi</p>
          <p class="text-[10px] font-semibold text-slate-400 mt-0.5">{totalIn}/3 sesi</p>
        </div>
      </a>

      <a href="/tasks"
         class="bg-white rounded-2xl px-5 py-4 border border-slate-100 flex items-center gap-3
                hover:border-slate-200 hover:shadow-sm transition-all group">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style="background:#faf5ff;">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#8b5cf6" stroke-width="2"/>
            <path d="M8 12h8M8 8h8M8 16h5" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold text-slate-900">Tasks</p>
          <p class="text-[10px] font-semibold text-slate-400 mt-0.5">{taskTodo} perlu dikerjakan</p>
        </div>
      </a>
    </div>

    <!-- Absensi Progress Today -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-blue-500"></span>
          <p class="text-[11px] font-bold tracking-widest uppercase text-slate-400">Status Absensi Hari Ini</p>
        </div>
        <a href="/absensi" class="text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors">
          Lihat semua →
        </a>
      </div>

      <div class="bg-white rounded-2xl overflow-hidden border border-slate-100">
        {#each [
          { id: 1, name: 'Sesi Pagi',  time: '08:00 – 11:30' },
          { id: 2, name: 'Sesi Siang', time: '13:30 – 15:00' },
          { id: 3, name: 'Sesi Sore',  time: '16:00 – 22:00' },
        ] as s, i}
          {@const rec = attendance.find(a => a.session_id === s.id)}
          <div class="flex items-center gap-3 px-4 py-3.5 {i < 2 ? 'border-b border-slate-50' : ''}">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                        {rec?.check_out ? 'bg-green-50' : rec?.check_in ? 'bg-blue-50' : 'bg-slate-50'}">
              {#if rec?.check_out}
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              {:else if rec?.check_in}
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke="#3b82f6" stroke-width="2"/>
                  <path d="M12 8v4l2 2" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                </svg>
              {:else}
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke="#cbd5e1" stroke-width="2"/>
                </svg>
              {/if}
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-900">{s.name}</p>
              <p class="text-[10px] font-semibold text-slate-400 mt-0.5">{s.time}</p>
            </div>
            <span class="text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full
                         {rec?.check_out
                           ? 'bg-green-50 text-green-600'
                           : rec?.check_in
                             ? 'bg-blue-50 text-blue-600'
                             : 'bg-slate-100 text-slate-400'}">
              {rec?.check_out ? 'Selesai' : rec?.check_in ? 'Check-in' : 'Belum'}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Recent Tasks -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-violet-500"></span>
          <p class="text-[11px] font-bold tracking-widest uppercase text-slate-400">Task Perlu Dikerjakan</p>
        </div>
        <a href="/tasks" class="text-[11px] font-bold text-violet-500 hover:text-violet-600 transition-colors">
          Lihat semua →
        </a>
      </div>

      <div class="bg-white rounded-2xl overflow-hidden border border-slate-100">
        {#if recentTasks.length === 0}
          <div class="py-10 text-center">
            <p class="text-slate-300 text-sm font-semibold">Semua task sudah selesai 🎉</p>
          </div>
        {:else}
          {#each recentTasks as task, i}
            {@const due = formatDue(task.due_date)}
            <div class="flex items-start gap-3 px-4 py-3.5 {i < recentTasks.length - 1 ? 'border-b border-slate-50' : ''}">
              <div class="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0
                          {task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-300'}">
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-900 truncate">{task.title}</p>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border
                               {PRIORITY_COLOR[task.priority]}">
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                  <span class="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full
                               {STATUS_COLOR[task.status]}">
                    {STATUS_LABEL[task.status]}
                  </span>
                  {#if due}
                    <span class="text-[10px] font-semibold {due.color}">{due.label}</span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

  </main>
  {/if}
</div>