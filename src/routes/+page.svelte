<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import { Bell, ArrowRight, Zap, ShieldCheck } from 'lucide-svelte'
  
  import { authService } from '$lib/services/authService'
  import { taskService } from '$lib/services/taskService'
  import { attendanceService } from '$lib/services/attendanceService'
  import { notificationService } from '$lib/services/notificationService'
  import { adminService } from '$lib/services/adminService'
  import type { Profile, Task, AttendanceRecord, AppNotification } from '$lib/type'
  import { getContext } from 'svelte'
  import type { Writable } from 'svelte/store'

  import HeroCard from '$lib/components/dashboard/HeroCard.svelte'
  import AttendanceSummary from '$lib/components/dashboard/AttendanceSummary.svelte'
  import TaskSummary from '$lib/components/dashboard/TaskSummary.svelte'
  import NotifPreview from '$lib/components/dashboard/NotifPreview.svelte'
  import TopPerformers from '$lib/components/dashboard/TopPerformers.svelte'

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
    leave_request:             { bg: 'bg-orange-50',  color: 'text-orange-500',  path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    workload_alert:            { bg: 'bg-yellow-50',  color: 'text-yellow-600',  path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    task_comment:              { bg: 'bg-indigo-50',  color: 'text-indigo-500',  path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  }
  const DEFAULT_ICON = { bg: 'bg-slate-50', color: 'text-slate-500', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  const getIcon = (type: string) => ICON_MAP[type] ?? DEFAULT_ICON

  function getNavigationUrl(n: AppNotification): string {
    switch (n.type) {
      case 'task_collaboration_invite': case 'task_assigned': case 'task_deadline_today': case 'task_ready_review': case 'task_revision': case 'task_completed': case 'task_deleted': return '/tasks'
      case 'collaboration_accepted': case 'collaboration_rejected': return '/absensi'
      case 'leave_request': return '/admin'
      case 'workload_alert': return '/admin'
      case 'task_comment': return '/tasks'
      default: return '/dashboard'
    }
  }

  let user = $state<User | null>(null), profile = $state<Profile | null>(null), attendance = $state<AttendanceRecord[]>([]), tasks = $state<Task[]>([]), notifications = $state<DashboardNotification[]>([])
  let pendingLeavesCount = $state(0)
  let topPerformers = $state<any[]>([])
  let performerMonth = $state(new Date().toISOString().slice(0, 7))
  let isLoading = $state(true), gpsActive = $state(false), isNavigating = $state(false), now = $state(new Date())
  let clockInterval: ReturnType<typeof setInterval>
  let notifSubscription: any;

  const deletionStore = getContext<Writable<boolean>>('deletionStore')
  let isDataHidden = $state(false)

  $effect(() => {
    const unsubscribe = deletionStore?.subscribe(value => {
      isDataHidden = value
      if (value) {
        attendance = []
        tasks = []
        notifications = []
        if (notifSubscription) {
            supabase.removeChannel(notifSubscription)
            notifSubscription = null
        }
      } else if (!isLoading && user) {
        // Safe to let it reload
      }
    })
    return unsubscribe
  })

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

  let totalIn = $derived(attendance.filter(a => a.clock_in !== null).length), taskActive = $derived(tasks.filter(t => t.status !== 'done').length), completionRate = $derived(tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0), unreadCount = $derived(notifications.filter(n => !n.is_read).length), recentNotifs = $derived(notifications.slice(0, 3)), totalSessions = $derived(now.getDay() === 5 ? 0 : now.getDay() === 4 ? 1 : 4)
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
    
    if (isDataHidden) {
      isLoading = false
      return
    }

    const { attendance: attend } = await attendanceService.getTodayData(u.id)
    attendance = (attend as any[]) || []
    
    tasks = await taskService.getTasks(u.id, profile?.role || 'user')
    
    const { data: notifs } = await notificationService.getNotifications(u.id, 10)
    notifications = (notifs || []) as DashboardNotification[]
    
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

    if (profile?.role === 'admin') {
      pendingLeavesCount = await adminService.getPendingLeavesCount()
    }

    const { data: performers } = await supabase.rpc('get_top_performers', {
      p_month: performerMonth
    })
    if (performers) topPerformers = performers

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

<svelte:head><title>Dashboard — Khwarizmi Workspace</title></svelte:head>

<div class="min-h-screen bg-[#FFF9F0]/50 font-sans">
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b-2 border-orange-100 px-6 py-4 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-3.5">
      <img src="/logo-khwarizmi.png" alt="Logo" class="w-11 h-11 rounded-2xl shadow-sm p-1.5 bg-white border-2 border-b-[4px] border-orange-200 object-contain cursor-pointer flex-shrink-0" />
      <div>
        <span class="font-black text-slate-900 text-lg tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Khwarizmi Workspace</span>
        <p class="text-xs font-extrabold text-orange-600">Dashboard</p>
      </div>
    </div>
    <a href="/notifications" class="relative w-11 h-11 rounded-2xl bg-white border-2 border-b-[4px] border-slate-200 flex items-center justify-center cursor-pointer hover:border-slate-300 active:translate-y-0.5 active:border-b-2 transition-all">
      <Bell size={20} strokeWidth={2.5} class="text-slate-600" />
      {#if unreadCount > 0}
        <span class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white bg-red-500 flex items-center justify-center border-2 border-white shadow-sm">{unreadCount > 99 ? '99+' : unreadCount}</span>
      {/if}
    </a>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-40">
      <div class="w-12 h-12 border-4 border-orange-200 border-t-orange-500 animate-spin rounded-full mb-4"></div>
      <p class="text-sm font-bold text-slate-500">Menyiapkan workspace...</p>
    </div>
  {:else}
    <main class="max-w-lg mx-auto px-5 py-7 pb-28 flex flex-col gap-8">
      <HeroCard {heroDate} greeting={getGreeting()} firstName={getFirstName()} {gpsActive} {totalIn} {totalSessions} {taskActive} {completionRate} />

      {#if profile?.role === 'admin'}
        <section class="relative overflow-hidden rounded-[32px] p-7 border-2 border-b-[8px] text-white shadow-lg" style="border-color:#1a9980; background:linear-gradient(to right,#2BB89A,#1a9980); box-shadow:0 10px 30px #2BB89A33">
          <div class="relative z-10 flex items-center justify-between gap-5">
            <div class="flex-1">
              <div class="flex items-center gap-2.5 mb-5">
                <ShieldCheck size={28} strokeWidth={2.5} class="text-white/70" />
                <h3 class="text-xl sm:text-2xl font-black tracking-tight leading-none" style="font-family:'Plus Jakarta Sans',sans-serif;">Mode Admin Aktif</h3>
              </div>
              <div class="relative inline-block">
                <a href="/admin" class="inline-flex items-center gap-2.5 bg-white active:translate-y-0.5 active:border-b-[2px] transition-all text-sm font-black py-3.5 px-6 rounded-2xl border-2 border-b-[4px] shadow-sm cursor-pointer" style="color:#1a9980; border-color:#1a9980aa">
                  Masuk Panel Admin <ArrowRight size={18} strokeWidth={2.5} />
                </a>
                {#if pendingLeavesCount > 0}
                  <span class="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-xs font-black min-w-[26px] h-6 px-2 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10">
                    {pendingLeavesCount}
                  </span>
                {/if}
              </div>
            </div>
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-b-[4px] border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap size={36} strokeWidth={2.5} class="text-amber-300" />
            </div>
          </div>
        </section>
      {/if}

      {#if recentNotifs.length > 0}
        <NotifPreview {recentNotifs} {getIcon} {formatTimeAgo} onClick={handleNotifClick} />
      {/if}

      <AttendanceSummary {attendance} sessions={[{ id: 1, label: 'Pagi', time: '08:00 - 11:30' }, { id: 2, label: 'Siang', time: '13:30 - 15:00' }, { id: 3, label: 'Sore', time: '16:00 - 17:00' }]} />

      <TaskSummary {recentTasks} {formatDue} statusLabel={STATUS_LABEL} priorityDot={PRIORITY_DOT} />

      <TopPerformers performers={topPerformers} currentUserId={user?.id ?? ''} month={performerMonth} />
    </main>
  {/if}
</div>