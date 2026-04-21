<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

  type NotifType =
    | 'task_collaboration_invite'
    | 'task_deadline_today'
    | 'collaboration_accepted'
    | 'collaboration_rejected'
    | 'task_completed'
    | 'task_ready_review'
    | 'task_deleted'
    | 'task_assigned'
    | 'task_revision'
    | (string & {})

  interface Notification {
    id: string
    user_id: string
    type: NotifType
    title: string
    message: string
    data: Record<string, unknown> | null
    is_read: boolean
    created_at: string
  }

  let user = $state<User | null>(null)
  let notifications = $state<Notification[]>([])
  let isLoading = $state(true)
  let isUpdating = $state(false)
  let loadError = $state<string | null>(null)
  let showClearAllModal = $state(false)
  let isClearingAll = $state(false)
  let isNavigating = $state(false)

  let toastMsg = $state('')
  let toastType = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer = 0

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success', dur = 2500) {
    clearTimeout(toastTimer)
    toastMsg = msg; toastType = type; toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  // ── Time ───────────────────────────────────────────
  function parseDate(iso: string): Date {
    return new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z')
  }

  function formatRelative(iso: string): string {
    const date = parseDate(iso)
    const diff = Date.now() - date.getTime()
    if (diff < 0) return 'Baru saja'
    const s = Math.floor(diff / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (s < 60)  return 'Baru saja'
    if (m < 60)  return `${m} menit lalu`
    if (h < 24)  return `${h} jam lalu`
    if (d === 1) return 'Kemarin'
    if (d < 7)   return `${d} hari lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  // Format: "20 April 2026 pukul 17.19"
  function formatDetail(iso: string): string {
    const date = parseDate(iso)
    const tanggal = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const jam = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')
    return `${tanggal} pukul ${jam}`
  }

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

  let unreadCount = $derived(notifications.filter(n => !n.is_read).length)
  let unreadList  = $derived(notifications.filter(n => !n.is_read))
  let readList    = $derived(notifications.filter(n => n.is_read))

  // ── Navigation Map ────────────────────────────────
  function getNavigationUrl(n: Notification): string {
    switch (n.type) {
      // Task-related
      case 'task_collaboration_invite':
      case 'task_assigned':
      case 'task_deadline_today':
      case 'task_ready_review':
      case 'task_revision':
      case 'task_completed':
      case 'task_deleted':
        return '/tasks'
      
      // Collaboration-related (absensi)
      case 'collaboration_accepted':
      case 'collaboration_rejected':
        return '/absensi'
      
      default:
        return '/dashboard'
    }
  }

  // ── Fetch ──────────────────────────────────────────
  async function fetchNotifications() {
    if (!user) return
    isLoading = true
    loadError = null

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[notifications] fetch error:', error)
      loadError = error.code === '42501'
        ? 'Akses ditolak oleh RLS. Pastikan policy SELECT pada tabel notifications mengizinkan user yang login.'
        : error.message
    } else {
      notifications = (data ?? []) as Notification[]
    }

    isLoading = false
  }

  // ── Actions ────────────────────────────────────────

  // Klik kartu = mark as read (optimistic) + navigate
  async function handleCardClick(n: Notification) {
    if (isNavigating) return
    isNavigating = true

    // Mark as read optimistically
    if (!n.is_read) {
      notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: true } : x)
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', n.id)
      
      if (error) {
        // Revert if update failed
        notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: false } : x)
        showToast('Gagal memperbarui notifikasi', 'error')
        isNavigating = false
        return
      }
    }
    
    // Navigate to appropriate page
    const url = getNavigationUrl(n)
    location.href = url
  }

  async function toggleRead(n: Notification, e: Event) {
    e.stopPropagation()
    const newVal = !n.is_read
    notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: newVal } : x)
    const { error } = await supabase.from('notifications').update({ is_read: newVal }).eq('id', n.id)
    if (error) {
      notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: !newVal } : x)
      showToast('Gagal memperbarui', 'error')
    }
  }

  async function markAllAsRead() {
    if (!user || unreadCount === 0 || isUpdating) return
    isUpdating = true
    const prev = notifications
    notifications = notifications.map(n => ({ ...n, is_read: true }))
    const { error } = await supabase
      .from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false)
    if (error) { notifications = prev; showToast('Gagal', 'error') }
    else showToast('Semua ditandai dibaca')
    isUpdating = false
  }

  async function deleteOne(id: string, e: Event) {
    e.stopPropagation()
    notifications = notifications.filter(n => n.id !== id)
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) { showToast('Gagal menghapus', 'error'); await fetchNotifications() }
  }

  async function clearAll() {
    if (!user) return
    isClearingAll = true
    notifications = []
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)
    if (error) { showToast('Gagal', 'error'); await fetchNotifications() }
    else showToast('Riwayat dibersihkan')
    isClearingAll = false
    showClearAllModal = false
  }

  function onVisible() {
    if (document.visibilityState === 'visible' && user) fetchNotifications()
  }

  onMount(async () => {
    const { data: { user: u }, error } = await supabase.auth.getUser()
    if (error || !u) { location.assign('/auth'); return }
    user = u
    await fetchNotifications()
    document.addEventListener('visibilitychange', onVisible)
  })

  onDestroy(() => {
    clearTimeout(toastTimer)
    document.removeEventListener('visibilitychange', onVisible)
  })
</script>

<svelte:head>
  <title>Notifikasi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

{#if toastVisible}
  <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-2xl max-w-[90vw]"
       style="background:{toastType==='success'?'linear-gradient(135deg,#F97316,#EA580C)':toastType==='error'?'#DC2626':'linear-gradient(135deg,#3B82F6,#2563EB)'}; font-family:'Inter',sans-serif; animation:slideInUp .3s ease-out;">
    {toastMsg}
  </div>
{/if}

<div class="min-h-screen pb-24" style="background:#FFF9F0; font-family:'Inter',sans-serif;">

  <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-orange-100 px-5 py-4">
    <div class="max-w-lg mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" class="p-2 -ml-2 hover:bg-orange-50 rounded-full transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <h1 class="font-bold text-slate-900 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Notifikasi</h1>
        {#if unreadCount > 0}
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style="background:linear-gradient(135deg,#F97316,#EA580C);">{unreadCount}</span>
        {/if}
      </div>
      <div class="flex gap-1">
        <button onclick={() => fetchNotifications()}
                class="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Refresh">
          <svg class="w-5 h-5 {isLoading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
        {#if notifications.length > 0}
          <button onclick={markAllAsRead} disabled={isUpdating || unreadCount === 0}
                  class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40 cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7m-6 0l-4 4-4-4"/>
            </svg>
          </button>
          <button onclick={() => showClearAllModal = true}
                  class="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        {/if}
      </div>
    </div>
  </header>

  <main class="max-w-lg mx-auto p-4">

    {#if loadError}
      <div class="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
        <p class="text-sm font-bold text-red-700 mb-1">Gagal memuat notifikasi</p>
        <p class="text-xs text-red-600 mb-3">{loadError}</p>
        <button onclick={() => fetchNotifications()}
                class="text-xs font-bold text-white px-3 py-1.5 rounded-lg cursor-pointer" style="background:#DC2626;">
          Coba Lagi
        </button>
      </div>
    {/if}

    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-20 gap-3">
        <div class="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
        <p class="text-xs font-medium text-slate-400">Memuat notifikasi...</p>
      </div>

    {:else if notifications.length === 0 && !loadError}
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-5 border-2 border-orange-100">
          <svg class="w-9 h-9 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <p class="text-sm font-bold text-slate-500" style="font-family:'Plus Jakarta Sans',sans-serif;">Kotak masuk kosong</p>
        <p class="text-xs text-slate-400 mt-1">Semua info tugas akan muncul di sini</p>
      </div>

    {:else}
      <!-- Unread -->
      {#if unreadList.length > 0}
        <div class="flex items-center justify-between mb-2 px-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-orange-500">Belum Dibaca · {unreadList.length}</p>
          {#if unreadList.length > 1}
            <button onclick={markAllAsRead} disabled={isUpdating}
                    class="text-[10px] font-bold text-orange-600 uppercase tracking-wider disabled:opacity-50 cursor-pointer">
              Tandai Semua ✓
            </button>
          {/if}
        </div>
        <div class="flex flex-col gap-2 mb-5">
          {#each unreadList as n (n.id)}
            {@const ic = getIcon(n.type)}
            <div class="group relative bg-white border border-orange-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                 onclick={() => handleCardClick(n)} role="button" tabindex="0"
                 onkeydown={(e) => e.key === 'Enter' && handleCardClick(n)}>
              <!-- Unread dot -->
              <div class="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500"></div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 p-2 rounded-xl {ic.bg} h-fit">
                  <svg class="w-5 h-5 {ic.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d={ic.path}/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0 pr-4">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h3 class="text-sm font-bold text-slate-800 leading-snug" style="font-family:'Plus Jakarta Sans',sans-serif;">{n.title}</h3>
                    <span class="text-[9px] font-medium text-slate-400 whitespace-nowrap flex-shrink-0">{formatRelative(n.created_at)}</span>
                  </div>
                  <p class="text-xs text-slate-600 leading-relaxed mb-2">{n.message}</p>
                  <div class="flex items-center justify-between gap-2">
                    <!-- Tanggal detail -->
                    <span class="text-[10px] text-slate-400">{formatDetail(n.created_at)}</span>
                    <div class="flex gap-2">
                      <button onclick={(e) => toggleRead(n, e)}
                              class="text-[10px] font-bold text-orange-600 px-2 py-1 rounded-md bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
                        TANDAI
                      </button>
                      <button onclick={(e) => deleteOne(n.id, e)}
                              class="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer">
                        HAPUS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Read -->
      {#if readList.length > 0}
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Sudah Dibaca · {readList.length}</p>
        <div class="flex flex-col gap-2">
          {#each readList as n (n.id)}
            {@const ic = getIcon(n.type)}
            <div class="group relative bg-white/60 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-sm cursor-pointer"
                 onclick={() => handleCardClick(n)} role="button" tabindex="0"
                 onkeydown={(e) => e.key === 'Enter' && handleCardClick(n)}>
              <div class="flex gap-3">
                <div class="flex-shrink-0 p-2 rounded-xl {ic.bg} opacity-60 h-fit">
                  <svg class="w-5 h-5 {ic.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d={ic.path}/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h3 class="text-sm font-semibold text-slate-500 leading-snug">{n.title}</h3>
                    <span class="text-[9px] text-slate-300 whitespace-nowrap flex-shrink-0">{formatRelative(n.created_at)}</span>
                  </div>
                  <p class="text-xs text-slate-400 leading-relaxed mb-2">{n.message}</p>
                  <div class="flex items-center justify-between gap-2">
                    <!-- Tanggal detail -->
                    <span class="text-[10px] text-slate-300">{formatDetail(n.created_at)}</span>
                    <div class="flex gap-2">
                      <button onclick={(e) => toggleRead(n, e)}
                              class="text-[10px] font-bold text-slate-300 hover:text-orange-600 transition-colors sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer">
                        BELUM DIBACA
                      </button>
                      <button onclick={(e) => deleteOne(n.id, e)}
                              class="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer">
                        HAPUS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </main>
</div>

{#if showClearAllModal}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);"
       onclick={() => !isClearingAll && (showClearAllModal = false)}>
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl"
         style="animation:zoomIn .2s ease-out;"
         onclick={(e) => e.stopPropagation()}>
      <div class="px-6 py-5">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p class="text-center font-bold text-slate-800 text-base mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Semua?</p>
        <p class="text-center text-sm text-slate-600"><span class="font-semibold">{notifications.length} notifikasi</span> akan dihapus permanen.</p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showClearAllModal = false} disabled={isClearingAll}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 disabled:opacity-60 cursor-pointer">
            Batal
          </button>
          <button onclick={clearAll} disabled={isClearingAll}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                  style="background:#DC2626;">
            {isClearingAll ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideInUp { from { transform:translate(-50%,20px); opacity:0 } to { transform:translate(-50%,0); opacity:1 } }
  @keyframes zoomIn    { from { transform:scale(.9); opacity:0 } to { transform:scale(1); opacity:1 } }
</style>