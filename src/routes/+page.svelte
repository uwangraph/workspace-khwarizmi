<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import { Bell, ArrowRight, Zap, ShieldCheck } from 'lucide-svelte'
  
  import { authService } from '$lib/services/authService'
  import { taskService } from '$lib/services/taskService'
  import { attendanceService } from '$lib/services/attendanceService'
  import { notificationService } from '$lib/services/notificationService'
  import type { Profile, Task, AttendanceRecord, AppNotification } from '$lib/type'

  import HeroCard from '$lib/components/dashboard/HeroCard.svelte'
  import AttendanceSummary from '$lib/components/dashboard/AttendanceSummary.svelte'
  import TaskSummary from '$lib/components/dashboard/TaskSummary.svelte'
  import NotifPreview from '$lib/components/dashboard/NotifPreview.svelte'

  // AppNotification extends our own type (not window.Notification)
  type DashboardNotification = AppNotification

  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const PRIORITY_DOT: Record<string, string> = { low: '#94A3B8', medium: '#F59E0B', high: '#EF4444' }
  const STATUS_LABEL: Record<string, string> = { not_started: 'Belum Dikerjakan', in_progress: 'Sedang Dikerjakan', review: 'Review', revision: 'Revisi', done: 'Selesai' }

  const ICON_MAP: Record<string, { bg: string; color: string; path: string }> = {
    task_collaboration_invite: { bg: 'bg-blue-50',    color: 'text-blue-500',    path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    collaboration_accepted:    { bg: 'bg-green-50',   color: 'text-green-500',   path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    collaboration_rejected:    { bg: 'bg-red-50',     color: 'text-red-500',     path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    task_completed:            { bg: 'bg-emerald-50', color: 'text-emerald-500', path: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    task_ready_review:         { bg: 'bg-purple-50',  color: 'text-purple-500',  path: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    task_deadline_today:       { bg: 'bg-red-50',     color: 'text-red-500',     path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    task_deleted:              { bg: 'bg-slate-100',  color: 'text-slate-500',   path: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
    task_revision:             { bg: 'bg-amber-50',   color: 'text-amber-500',   path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    task_assigned:             { bg: 'bg-blue-50',    color: 'text-blue-500',    path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  }
  const DEFAULT_ICON = { bg: 'bg-slate-50', color: 'text-slate-500', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  const getIcon = (type: string) => ICON_MAP[type] ?? DEFAULT_ICON

  function getNavigationUrl(n: AppNotification): string {
    switch (n.type) {
      case 'task_collaboration_invite': case 'task_assigned': case 'task_deadline_today': case 'task_ready_review': case 'task_revision': case 'task_completed': case 'task_deleted': return '/tasks'
      case 'collaboration_accepted': case 'collaboration_rejected': return '/absensi'
      default: return '/dashboard'
    }
  }

  let user = $state<User | null>(null), profile = $state<Profile | null>(null), attendance = $state<AttendanceRecord[]>([]), tasks = $state<Task[]>([]), notifications = $state<DashboardNotification[]>([])
  let isLoading = $state(true), gpsActive = $state(false), isNavigating = $state(false), now = $state(new Date())
  let clockInterval: ReturnType<typeof setInterval>
  let notifSubscription: any;

  onMount(() => { 
    clockInterval = setInterval(() => { now = new Date() }, 60000); 
    loadData(); 
    initGps(); 
    

    return () => { 
      clearInterval(clockInterval); 
      if (notifSubscription) supabase.removeChannel(notifSubscription);
    } 
  })

  function getGreeting() { const h = now.getHours(); if (h < 4) return 'Selamat malam'; if (h < 11) return 'Selamat pagi'; if (h < 15) return 'Selamat siang'; if (h < 18) return 'Selamat sore'; return 'Selamat malam' }
  let heroDate = $derived(`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`)
  function getFirstName() { if (!profile) return 'Pengguna'; const n = profile.full_name.split(' ')[0]; return n.charAt(0).toUpperCase() + n.slice(1) }

  let totalIn = $derived(attendance.filter(a => a.check_in !== null).length), taskActive = $derived(tasks.filter(t => t.status !== 'done').length), taskDone = $derived(tasks.filter(t => t.status === 'done').length), taskTotal = $derived(tasks.length), completionRate = $derived(taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0), unreadCount = $derived(notifications.filter(n => !n.is_read).length), recentNotifs = $derived(notifications.slice(0, 3)), totalSessions = $derived(now.getDay() === 5 ? 0 : now.getDay() === 4 ? 1 : 4)
  let recentTasks = $derived(tasks.filter(t => t.status !== 'done').sort((a, b) => { const p: Record<string, number> = { high: 0, medium: 1, low: 2 }; return p[a.priority] - p[b.priority] }).slice(0, 3))

  function formatDue(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso); d.setHours(0, 0, 0, 0); const today = new Date(); today.setHours(0, 0, 0, 0); const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: 'Terlambat', color: '#EF4444', urgent: true }
    if (diff === 0) return { label: 'Hari ini', color: '#EA580C', urgent: true }
    if (diff === 1) return { label: 'Besok', color: '#F59E0B', urgent: false }
    return { label: `${diff} hari`, color: '#64748B', urgent: false }
  }

  function formatTimeAgo(iso: string) {
    const date = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'); const diff = Date.now() - date.getTime()
    if (diff < 0) return 'Baru saja'
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24)
    if (s < 60) return 'Baru saja'; if (m < 60) return `${m} menit lalu`; if (h < 24) return `${h} jam lalu`; if (d === 1) return 'Kemarin'; if (d < 7) return `${d} hari lalu`; return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  async function loadData() {
    isLoading = true
    const u = await authService.getUser()
    if (!u) { window.location.assign('/auth'); return }
    user = u
    
    const { data: p } = await authService.getProfile(u.id)
    if (p) profile = p as Profile
    
    const { attendance: attend, appSettings } = await attendanceService.getTodayData(u.id)
    attendance = (attend as any[]) || []
    
    tasks = await taskService.getTasks(u.id, profile?.role || 'user')
    
    const { data: notifs } = await notificationService.getNotifications(u.id, 10)
    notifications = (notifs || []) as DashboardNotification[]
    
    // Subscribe to real-time notifications for this specific user
    if (!notifSubscription) {
      notifSubscription = supabase.channel(`dashboard:notifications:${u.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${u.id}`
        }, payload => {
          notifications = [payload.new as DashboardNotification, ...notifications]
        })
        .subscribe()
    }

    isLoading = false
  }

  function initGps() { if (!navigator.geolocation) return; navigator.geolocation.watchPosition(() => { gpsActive = true }, () => { gpsActive = false }) }

  async function handleNotifClick(n: DashboardNotification) {
    if (isNavigating) return; isNavigating = true
    if (!n.is_read) {
      notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: true } : x)
      await notificationService.markAsRead(n.id)
    }
    location.href = getNavigationUrl(n)
  }
</script>

<svelte:head><title>Dashboard — Workspace Khwarizmi</title></svelte:head>

<div class="min-h-screen bg-[#FFF9F0]/30 font-sans">
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/logo-khwarizmi.png" alt="Logo" class="w-9 h-9 rounded-xl shadow-sm p-1 bg-white border border-orange-200 object-contain cursor-pointer flex-shrink-0" />
      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Workspace Khwarizmi</span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">Dashboard</p>
      </div>
    </div>
    <a href="/notifications" class="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
      <Bell size={16} class="text-slate-600" />
      {#if unreadCount > 0}
        <span class="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full text-[9px] font-bold text-white bg-red-500 flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>
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
      <HeroCard {heroDate} greeting={getGreeting()} firstName={getFirstName()} {gpsActive} {totalIn} {totalSessions} {taskActive} {completionRate} />

      {#if profile?.role === 'admin'}
        <section class="relative overflow-hidden rounded-3xl p-6 shadow-xl border border-slate-800" style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);">
          <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-orange-500/20 blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex items-center justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1.5">
                <ShieldCheck size={18} class="text-orange-400" />
                <h3 class="text-[12px] font-bold text-white tracking-widest uppercase" style="font-family:'Plus Jakarta Sans',sans-serif;">Mode Admin Aktif</h3>
              </div>
              <p class="text-[11px] text-slate-300/90 leading-relaxed mb-4 pr-2">Kelola pengguna, pantau tugas seluruh tim, dan kendalikan sistem secara penuh melalui panel khusus.</p>
              <a href="/admin" class="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 transition-all text-white text-[11px] font-extrabold py-2.5 px-4 rounded-xl shadow-lg shadow-orange-500/30 border border-orange-400/50">
                Masuk Panel Admin <ArrowRight size={14} strokeWidth={3} />
              </a>
            </div>
            <div class="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner backdrop-blur-md">
              <Zap size={24} class="text-orange-400/80" />
            </div>
          </div>
        </section>
      {/if}

      {#if recentNotifs.length > 0}
        <NotifPreview {recentNotifs} {getIcon} {formatTimeAgo} onClick={handleNotifClick} />
      {/if}

      <AttendanceSummary {attendance} sessions={[{ id: 1, label: 'Pagi', time: '08:00 - 11:30' }, { id: 2, label: 'Siang', time: '13:30 - 15:00' }, { id: 3, label: 'Sore', time: '16:00 - 17:00' }]} />

      <TaskSummary {recentTasks} {formatDue} statusLabel={STATUS_LABEL} priorityDot={PRIORITY_DOT} />
    </main>
  {/if}
</div>