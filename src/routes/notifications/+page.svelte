<script lang="ts">
  import { getContext } from 'svelte'
  import type { Writable } from 'svelte/store'
  import { onMount, onDestroy } from 'svelte'
  import { supabase } from '$lib/supabase'  // kept for realtime channel
  import toast from 'svelte-french-toast'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  import EmptyState from '$lib/components/shared/EmptyState.svelte'
  import PaginationBar from '$lib/components/shared/PaginationBar.svelte'
  import type { User } from '@supabase/supabase-js'
  import { unreadCount as unreadStore, fetchUnreadCount, decrementUnread } from '$lib/stores/notificationStore'
  import { authService } from '$lib/services/authService'
  import { notificationService } from '$lib/services/notificationService'
  import type { AppNotification } from '$lib/type'
  import { Check, Bell, Search, RefreshCw, Trash2, X, Send } from 'lucide-svelte'

  type NotifType = 'task_collaboration_invite'|'task_deadline_today'|'collaboration_accepted'|'collaboration_rejected'|'task_completed'|'task_ready_review'|'task_deleted'|'task_assigned'|'task_revision'|(string & {})
  // Use AppNotification from type.ts to avoid shadowing the browser's Notification API
  type PageNotification = AppNotification & { type: NotifType }

  let user = $state<User | null>(null)
  let notifications = $state<PageNotification[]>([])
  let isLoading = $state(true)
  let isUpdating = $state(false)
  let loadError = $state<string | null>(null)
  let showClearAllModal = $state(false)
  let isClearingAll = $state(false)
  let notifSubscription: any = null

  const deletionStore = getContext<Writable<boolean>>('deletionStore')
  let isDataHidden = $state(false)

  $effect(() => {
    const unsubscribe = deletionStore?.subscribe(value => {
      isDataHidden = value
      if (value) {
        notifications = []
        if (notifSubscription) {
            notifSubscription.unsubscribe()
            notifSubscription = null
        }
      } else if (!isLoading && user) {
        fetchNotifications()
      }
    })
    return unsubscribe
  })
  
  let showReplyModal = $state(false)
  let replyMessage = $state('')
  let replyTarget = $state<{ id: string, name: string, taskTitle?: string, taskId?: string } | null>(null)
  let isSendingReply = $state(false)

  let isNavigating = $state(false)
  let notifSearch = $state('')
  let currentPage = $state(1)
  const itemsPerPage = 15

  function parseDate(iso: string) { return new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z') }
  function formatRelative(iso: string) {
    const diff = Date.now() - parseDate(iso).getTime()
    if (diff < 0) return 'Baru saja'
    const s=Math.floor(diff/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24)
    if (s<60) return 'Baru saja'; if (m<60) return `${m} menit lalu`; if (h<24) return `${h} jam lalu`
    if (d===1) return 'Kemarin'; if (d<7) return `${d} hari lalu`
    return parseDate(iso).toLocaleDateString('id-ID', { day:'numeric', month:'short' })
  }
  function formatDetail(iso: string) {
    const d=parseDate(iso)
    return `${d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} pukul ${d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace(':','.')}`
  }

  const ICON_MAP: Record<string,{bg:string;color:string;path:string}> = {
    task_collaboration_invite:{bg:'bg-blue-50',color:'text-blue-500',path:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'},
    collaboration_accepted:{bg:'bg-green-50',color:'text-green-500',path:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'},
    collaboration_rejected:{bg:'bg-red-50',color:'text-red-500',path:'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'},
    task_completed:{bg:'bg-emerald-50',color:'text-emerald-500',path:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'},
    task_ready_review:{bg:'bg-purple-50',color:'text-purple-500',path:'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'},
    task_deadline_today:{bg:'bg-red-50',color:'text-red-500',path:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'},
    task_deleted:{bg:'bg-slate-100',color:'text-slate-500',path:'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'},
    task_revision:{bg:'bg-amber-50',color:'text-amber-500',path:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'},
    task_assigned:{bg:'bg-blue-50',color:'text-blue-500',path:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
  }
  const DEFAULT_ICON = {bg:'bg-slate-50',color:'text-slate-500',path:'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}
  const getIcon = (t: string) => ICON_MAP[t] ?? DEFAULT_ICON

  let unreadCount = $derived(notifications.filter(n => !n.is_read).length)
  let filteredNotifs = $derived(notifications.filter(n => !notifSearch || n.title.toLowerCase().includes(notifSearch.toLowerCase()) || n.message.toLowerCase().includes(notifSearch.toLowerCase())))
  let paginatedNotifs = $derived(filteredNotifs.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage))
  let totalPages = $derived(Math.ceil(filteredNotifs.length / itemsPerPage))
  
  function getDateLabel(iso: string) {
    const d = parseDate(iso)
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const itemDate = new Date(d); itemDate.setHours(0,0,0,0)
    
    if (itemDate.getTime() === today.getTime()) return 'Hari Ini'
    if (itemDate.getTime() === yesterday.getTime()) return 'Kemarin'
    return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year: 'numeric' })
  }

  let groupedNotifs = $derived.by(() => {
    const groups: { label: string; items: PageNotification[] }[] = []
    let currentLabel = ''
    for (const n of paginatedNotifs) {
      const label = getDateLabel(n.created_at)
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, items: [n] })
      } else {
        groups[groups.length - 1].items.push(n)
      }
    }
    return groups
  })

  $effect(() => { notifSearch; currentPage = 1 })

  function getNavUrl(n: PageNotification) {
    switch (n.type) {
      case 'task_collaboration_invite': case 'task_assigned': case 'task_deadline_today':
      case 'task_ready_review': case 'task_revision': case 'task_completed': case 'task_deleted': return '/tasks'
      case 'collaboration_accepted': case 'collaboration_rejected': return '/absensi'
      default: return '/'
    }
  }

  async function fetchNotifications() {
    if (!user || isDataHidden) {
      isLoading = false
      return
    }
    
    isLoading = true
    loadError = null
    
    try {
      const { data, error } = await notificationService.getNotifications(user.id)
      if (error) {
        loadError = error.message
      } else {
        notifications = (data ?? []) as PageNotification[]
      }
      
      // Subscribe to real-time notifications for this specific user
      if (!notifSubscription) {
        notifSubscription = supabase.channel(`notifications_page:${user.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, payload => {
            notifications = [payload.new as PageNotification, ...notifications]
          })
          .subscribe()
      }
    } catch (e: any) {
      loadError = e.message || 'Terjadi kesalahan sistem'
    } finally {
      isLoading = false
    }
  }

  async function handleCardClick(n: PageNotification) {
    if (isNavigating) return; isNavigating = true
    if (!n.is_read) {
      await markAsRead(n.id)
    }
    location.href = getNavUrl(n)
  }

  async function markAsRead(id: string) {
    if (!user) return
    const n = notifications.find(x => x.id === id)
    if (!n || n.is_read) return
    
    try {
      const { error } = await notificationService.markAsRead(id)
      if (error) throw error
      n.is_read = true; notifications = [...notifications]
      decrementUnread()
    } catch { toast.error('Gagal memperbarui') }
  }

  async function toggleRead(n: PageNotification, e: Event) {
    e.stopPropagation()
    const newVal = !n.is_read
    notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: newVal } : x)
    const { error } = newVal
      ? await notificationService.markAsRead(n.id)
      : await notificationService.markAsUnread(n.id)
    if (error) {
      notifications = notifications.map(x => x.id === n.id ? { ...x, is_read: !newVal } : x)
    } else {
      if (newVal) decrementUnread(); else unreadStore.update(c => c + 1)
    }
  }

  async function markAllAsRead() {
    if (!user || unreadCount === 0 || isUpdating) return; isUpdating = true
    const prev = notifications
    notifications = notifications.map(n => ({ ...n, is_read: true }))
    const { error } = await notificationService.markAllAsRead(user.id)
    if (error) { notifications = prev; toast.error('Gagal menandai') }
    else { toast.success('Semua ditandai dibaca'); unreadStore.set(0) }
    isUpdating = false
  }

  async function deleteOne(id: string, e: Event) {
    e.stopPropagation()
    const prev = notifications
    notifications = notifications.filter(n => n.id !== id)
    const { error } = await notificationService.deleteNotification(id)
    if (error) { toast.error('Gagal menghapus'); notifications = prev }
  }

  async function clearAll() {
    if (!user) return; isClearingAll = true
    const prev = notifications; notifications = []
    const { error } = await notificationService.deleteAll(user.id)
    if (error) { notifications = prev; toast.error('Gagal menghapus') }
    else { toast.success('Riwayat dibersihkan'); fetchUnreadCount(user.id) }
    isClearingAll = false; showClearAllModal = false
  }

  function handleReply(n: PageNotification, e: Event) {
    e.stopPropagation()
    const d = n.data as any
    if (!d || !d.sender_id) return
    
    replyTarget = {
      id: d.sender_id,
      name: d.sender_name || 'Admin',
      taskTitle: d.task_title,
      taskId: d.task_id
    }
    replyMessage = ''
    showReplyModal = true
    
    if (!n.is_read) markAsRead(n.id)
  }

  async function submitReply() {
    if (!user || !replyTarget || !replyMessage.trim() || isSendingReply) return
    isSendingReply = true
    
    const title = `Balasan: ${replyTarget.taskTitle || 'Tugas'}`
    const message = replyMessage.trim()
    
    const success = await notificationService.send(
      replyTarget.id,
      'task_revision',
      title,
      message,
      {
        is_reply: true,
        replied_to_task_id: replyTarget.taskId,
        replied_to_task_title: replyTarget.taskTitle,
        sender_name: user.user_metadata?.full_name || user.email
      }
    )

    if (success) {
      toast.success('Balasan terkirim')
      showReplyModal = false
    } else {
      toast.error('Gagal mengirim balasan')
    }
    
    isSendingReply = false
  }

  function onVisible() { if (document.visibilityState==='visible' && user) fetchNotifications() }

  onMount(async () => {
    const u = await authService.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u; await fetchNotifications()
    document.addEventListener('visibilitychange', onVisible)
  })

  onDestroy(() => {
    document.removeEventListener('visibilitychange', onVisible)
    if (notifSubscription) supabase.removeChannel(notifSubscription)
  })
</script>

<svelte:head>
  <title>Notifikasi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen pb-24" style="background:#FFF9F0; font-family:'Inter',sans-serif;">
  <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-orange-100 px-5 py-4">
    <div class="max-w-lg mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" class="p-2 -ml-2 hover:bg-orange-50 rounded-full transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <h1 class="font-bold text-slate-900 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Notifikasi</h1>
        {#if unreadCount > 0}<span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style="background:linear-gradient(135deg,#F97316,#EA580C);">{unreadCount}</span>{/if}
      </div>
      <div class="flex gap-1">
        <button onclick={() => fetchNotifications()} class="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors" title="Refresh">
          <svg class="w-5 h-5 {isLoading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
        {#if notifications.length > 0}
          <button onclick={markAllAsRead} disabled={isUpdating || unreadCount===0} class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7m-6 0l-4 4-4-4"/></svg>
          </button>
          <button onclick={() => showClearAllModal = true} class="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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
        <button onclick={() => fetchNotifications()} class="text-xs font-bold text-white px-3 py-1.5 rounded-lg cursor-pointer" style="background:#DC2626;">Coba Lagi</button>
      </div>
    {/if}

    {#if isLoading}
      <LoadingSpinner message="Memuat notifikasi..." />
    {:else if notifications.length === 0 && !loadError}
      <EmptyState title="Kotak masuk kosong" subtitle="Semua info tugas akan muncul di sini">
        <Bell size={40} class="text-slate-200" />
      </EmptyState>
    {:else}
      <div class="relative mb-4">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input bind:value={notifSearch} placeholder="Cari notifikasi..."
               class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-orange-100 text-sm bg-white/90 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm" />
      </div>

      {#if filteredNotifs.length === 0}
        <EmptyState title="Tidak ditemukan" subtitle="Coba kata kunci lain">
          <Search size={40} class="text-slate-200" />
        </EmptyState>
      {:else}
        <div class="flex items-center justify-between mb-2 px-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-orange-500">
            {filteredNotifs.length} Notifikasi {unreadCount > 0 ? `· ${unreadCount} Belum Dibaca` : ''}
          </p>
          {#if unreadCount > 1}
            <button onclick={markAllAsRead} disabled={isUpdating} class="text-[10px] font-bold text-orange-600 uppercase tracking-wider disabled:opacity-50 cursor-pointer flex items-center gap-1">
              Tandai Semua <Check size={10} />
            </button>
          {/if}
        </div>
        <div class="flex flex-col gap-5 mb-5">
          {#each groupedNotifs as group}
            <div>
              <h2 class="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">{group.label}</h2>
              <div class="flex flex-col gap-2">
                {#each group.items as n (n.id)}
                  {@const ic = getIcon(n.type)}
                  <div class="group relative {n.is_read ? 'bg-white/60 border-slate-100' : 'bg-white border-orange-100 shadow-sm'} border rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer {!n.is_read ? 'hover:shadow-md' : 'hover:bg-white hover:shadow-sm'}"
                       onclick={() => handleCardClick(n)} role="button" tabindex="0"
                       onkeydown={(e) => e.key === 'Enter' && handleCardClick(n)}>
                    {#if !n.is_read}<div class="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500"></div>{/if}
                    <div class="flex gap-3">
                      <div class="flex-shrink-0 p-2 rounded-xl {ic.bg} h-fit {n.is_read ? 'opacity-60' : ''}">
                        <svg class="w-5 h-5 {ic.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d={ic.path}/>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0 {!n.is_read ? 'pr-4' : ''}">
                        <div class="flex items-start justify-between gap-2 mb-1">
                          <h3 class="text-sm {n.is_read ? 'font-semibold text-slate-500' : 'font-bold text-slate-800'} leading-snug" style="font-family:'Plus Jakarta Sans',sans-serif;">{n.title}</h3>
                          <span class="text-[9px] {n.is_read ? 'text-slate-300' : 'font-medium text-slate-400'} whitespace-nowrap flex-shrink-0">{formatRelative(n.created_at)}</span>
                        </div>
                        <p class="text-xs {n.is_read ? 'text-slate-400' : 'text-slate-600'} leading-relaxed mb-2">{n.message}</p>
                        <div class="flex items-center justify-between gap-2">
                          <span class="text-[10px] {n.is_read ? 'text-slate-300' : 'text-slate-400'}">{formatDetail(n.created_at)}</span>
                          <div class="flex gap-2">
                            {#if n.data && (n.data as any).is_admin_reminder && (n.data as any).sender_id}
                              <button onclick={(e) => handleReply(n, e)} class="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 shadow-sm transition-all active:scale-95 cursor-pointer">
                                BALAS
                              </button>
                            {/if}
                            <button onclick={(e) => toggleRead(n, e)} class="text-[10px] font-bold {n.is_read ? 'text-slate-300 hover:text-orange-600' : 'text-orange-600 px-2 py-1 rounded-md bg-orange-50 hover:bg-orange-100'} transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100">
                              {n.is_read ? 'BELUM DIBACA' : 'TANDAI'}
                            </button>
                            <button onclick={(e) => deleteOne(n.id, e)} class="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100">HAPUS</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
        <PaginationBar {currentPage} {totalPages} onPrev={() => currentPage = Math.max(1, currentPage-1)} onNext={() => currentPage = Math.min(totalPages, currentPage+1)} />
      {/if}
    {/if}
  </main>
</div>

{#if showClearAllModal}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);" onclick={() => !isClearingAll && (showClearAllModal = false)}>
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation:zoomIn .2s ease-out;" onclick={(e) => e.stopPropagation()}>
      <div class="px-6 py-5">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <p class="text-center font-bold text-slate-800 text-base mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Semua?</p>
        <p class="text-center text-sm text-slate-600"><span class="font-semibold">{notifications.length} notifikasi</span> akan dihapus permanen.</p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showClearAllModal = false} disabled={isClearingAll} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 disabled:opacity-60 cursor-pointer">Batal</button>
          <button onclick={clearAll} disabled={isClearingAll} class="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 cursor-pointer" style="background:#DC2626;">
            {isClearingAll ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showReplyModal && replyTarget}
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);" onclick={() => !isSendingReply && (showReplyModal = false)}>
    <div class="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style="animation:slideUp .3s ease-out;" onclick={(e) => e.stopPropagation()}>
      <div class="px-8 pt-8 pb-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-xl font-black text-slate-900" style="font-family:'Plus Jakarta Sans',sans-serif;">Balas Pengingat</h3>
            <p class="text-xs font-medium text-slate-500 mt-1">Kepada: <span class="font-bold text-orange-600">{replyTarget.name}</span></p>
          </div>
          <button onclick={() => showReplyModal = false} class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="mb-6 bg-orange-50/50 border border-orange-100 rounded-2xl p-4">
          <p class="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Tugas Terkait</p>
          <p class="text-sm font-bold text-slate-800">{replyTarget.taskTitle || 'Tugas Tanpa Judul'}</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pesan Balasan</label>
            <textarea 
              bind:value={replyMessage}
              placeholder="Contoh: Baik bos, segera saya selesaikan..."
              rows="4"
              class="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-slate-800 outline-none focus:border-orange-400 focus:bg-white transition-all resize-none shadow-inner"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-8 mb-4">
          <button onclick={() => showReplyModal = false} disabled={isSendingReply} class="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all">Batal</button>
          <button onclick={submitReply} disabled={isSendingReply || !replyMessage.trim()} 
                  class="flex-[2] py-4 rounded-2xl text-sm font-black text-white shadow-xl shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isSendingReply}
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span>Mengirim...</span>
            {:else}
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              <span>Kirim Balasan</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes zoomIn { from { transform:scale(.9); opacity:0 } to { transform:scale(1); opacity:1 } }
  @keyframes slideUp { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
</style>