<script lang="ts">
  import { getContext } from 'svelte'
  import type { Writable } from 'svelte/store'
  import { onMount, onDestroy, untrack } from 'svelte'
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
  let showDeleteModal = $state(false)
  let notifToDelete = $state<PageNotification | null>(null)
  let isDeletingOne = $state(false)
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
      } else {
        // Use untrack to prevent this effect from re-running when isLoading or user changes
        const currentLoading = untrack(() => isLoading);
        const currentUser = untrack(() => user);
        if (!currentLoading && currentUser) {
          fetchNotifications()
        }
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

  function handleDeleteClick(n: PageNotification, e: Event) {
    e.stopPropagation()
    notifToDelete = n
    showDeleteModal = true
  }

  async function confirmDeleteOne() {
    if (!notifToDelete || isDeletingOne) return
    isDeletingOne = true
    const id = notifToDelete.id
    const prev = notifications
    notifications = notifications.filter(n => n.id !== id)
    
    try {
      const { error } = await notificationService.deleteNotification(id)
      if (error) {
        notifications = prev
        toast.error('Gagal menghapus')
      } else {
        toast.success('Notifikasi dihapus')
      }
    } catch {
      notifications = prev
      toast.error('Terjadi kesalahan')
    } finally {
      isDeletingOne = false
      showDeleteModal = false
      notifToDelete = null
    }
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

<div class="min-h-screen pb-24" style="background:#FFFBF7; font-family:'Inter',sans-serif;">
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
    <div class="max-w-2xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/" class="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <div>
          <h1 class="font-bold text-slate-900 text-lg leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Notifikasi</h1>
          {#if unreadCount > 0}
            <p class="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{unreadCount} Belum Dibaca</p>
          {/if}
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick={() => fetchNotifications()} class="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all active:scale-95" title="Refresh">
          <svg class="w-5 h-5 {isLoading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
        {#if notifications.length > 0}
          <button onclick={markAllAsRead} disabled={isUpdating || unreadCount===0} class="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 rounded-xl transition-all disabled:opacity-30" title="Tandai semua dibaca">
            <Check size={20} />
          </button>
          <button onclick={() => showClearAllModal = true} class="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all" title="Bersihkan semua">
            <Trash2 size={20} />
          </button>
        {/if}
      </div>
    </div>
  </header>

  <main class="max-w-2xl mx-auto p-6">
    {#if loadError}
      <div class="mb-6 bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-4">
        <div class="p-2 bg-white rounded-lg shadow-sm">
          <X size={20} class="text-red-500" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-slate-800 mb-1">Gagal memuat notifikasi</p>
          <p class="text-xs text-slate-500 mb-4 leading-relaxed">{loadError}</p>
          <button onclick={() => fetchNotifications()} class="text-[11px] font-bold text-white px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 transition-all shadow-md shadow-red-500/10">Coba Lagi</button>
        </div>
      </div>
    {/if}

    {#if isLoading}
      <LoadingSpinner message="Memuat notifikasi..." />
    {:else if notifications.length === 0 && !loadError}
      <EmptyState title="Kotak masuk kosong" subtitle="Semua info tugas akan muncul di sini">
        <Bell size={40} class="text-slate-200" />
      </EmptyState>
    {:else}
      <div class="relative mb-8">
        <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={16} class="text-slate-300" />
        </div>
        <input bind:value={notifSearch} placeholder="Cari notifikasi..."
               class="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm shadow-slate-200/40 placeholder:text-slate-300" />
      </div>

      {#if filteredNotifs.length === 0}
        <EmptyState title="Tidak ditemukan" subtitle="Coba kata kunci lain">
          <Search size={48} class="text-slate-100" />
        </EmptyState>
      {:else}
        <div class="flex items-center justify-between mb-4 px-1">
          <div class="flex items-center gap-2">
            <p class="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
              {filteredNotifs.length} NOTIFIKASI {unreadCount > 0 ? `· ` : ''}
              {#if unreadCount > 0}
                <span class="text-orange-600">{unreadCount} BARU</span>
              {/if}
            </p>
          </div>
          {#if unreadCount > 1}
            <button onclick={markAllAsRead} disabled={isUpdating} class="text-[10px] font-bold text-slate-400 hover:text-orange-600 uppercase tracking-wider disabled:opacity-50 transition-colors flex items-center gap-1.5">
              Sapu Semua <Check size={12} />
            </button>
          {/if}
        </div>
        <div class="flex flex-col gap-8 mb-8">
          {#each groupedNotifs as group}
            <div>
              <div class="flex items-center gap-3 mb-4 pl-1">
                <h2 class="text-xs font-black text-slate-900 uppercase tracking-widest">{group.label}</h2>
                <div class="flex-1 h-px bg-slate-100"></div>
              </div>
              <div class="flex flex-col gap-3">
                {#each group.items as n (n.id)}
                  {@const ic = getIcon(n.type)}
                  <div class="group relative flex gap-4 bg-white border {n.is_read ? 'border-slate-100' : 'border-orange-100 bg-white/50 backdrop-blur-sm shadow-sm shadow-orange-500/5'} rounded-3xl p-5 transition-all hover:border-orange-200 hover:shadow-xl hover:shadow-slate-200/30 cursor-pointer"
                       onclick={() => handleCardClick(n)} role="button" tabindex="0"
                       onkeydown={(e) => e.key === 'Enter' && handleCardClick(n)}>
                    
                    <div class="flex-shrink-0">
                      <div class="w-12 h-12 rounded-2xl {ic.bg} flex items-center justify-center {n.is_read ? 'grayscale opacity-40' : ''} transition-all group-hover:scale-110">
                        <svg class="w-6 h-6 {ic.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d={ic.path}/>
                        </svg>
                      </div>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-3 mb-1">
                        <h3 class="text-sm font-bold {n.is_read ? 'text-slate-500' : 'text-slate-900'} leading-snug tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{n.title}</h3>
                        <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">{formatRelative(n.created_at)}</span>
                      </div>
                      <p class="text-xs {n.is_read ? 'text-slate-400' : 'text-slate-600'} leading-relaxed mb-4">{n.message}</p>
                      
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                          {#if n.data && (n.data as any).sender_name}
                            <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                {(n.data as any).sender_name}
                              </span>
                            </div>
                          {/if}
                          {#if n.data && (n.data as any).is_reply}
                            <div class="bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">BALASAN</span>
                            </div>
                          {/if}
                        </div>

                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          {#if n.data && (n.data as any).sender_id && (n.data as any).sender_id !== user?.id}
                            <button onclick={(e) => handleReply(n, e)} class="px-4 py-1.5 rounded-xl text-[10px] font-black text-white bg-gradient-to-br from-orange-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-95 shadow-lg shadow-orange-500/10">
                              BALAS
                            </button>
                          {/if}
                          <button onclick={(e) => toggleRead(n, e)} class="p-2 rounded-lg text-slate-300 hover:text-orange-600 hover:bg-orange-50 transition-all">
                            <Check size={16} />
                          </button>
                          <button onclick={(e) => handleDeleteClick(n, e)} class="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 size={16} />
                          </button>
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

{#if showDeleteModal && notifToDelete}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background:rgba(15, 23, 42, 0.3); backdrop-filter:blur(8px);" onclick={() => !isDeletingOne && (showDeleteModal = false)}>
    <div class="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-white/20" style="animation:zoomIn .2s ease-out;" onclick={(e) => e.stopPropagation()}>
      <div class="px-8 py-10 text-center">
        <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <Trash2 size={28} class="text-red-500" />
        </div>
        <h3 class="text-xl font-black text-slate-900 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Notifikasi?</h3>
        <p class="text-sm text-slate-500 leading-relaxed mb-8">Notifikasi ini akan dihapus permanen dari riwayat Anda.</p>
        <div class="flex gap-3">
          <button onclick={() => showDeleteModal = false} disabled={isDeletingOne} class="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all">Batal</button>
          <button onclick={confirmDeleteOne} disabled={isDeletingOne} class="flex-1 py-4 rounded-2xl text-sm font-black text-white shadow-xl shadow-red-500/20 transition-all active:scale-95 bg-red-500 hover:bg-red-600">
            {isDeletingOne ? '...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

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
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style="background:rgba(15, 23, 42, 0.3); backdrop-filter:blur(12px);" onclick={() => !isSendingReply && (showReplyModal = false)}>
    <div class="w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl flex flex-col border border-white/20" style="animation:slideUp .4s cubic-bezier(0.16, 1, 0.3, 1);" onclick={(e) => e.stopPropagation()}>
      <div class="px-8 pt-10 pb-8">
        <div class="flex items-start justify-between mb-8">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-2xl font-black text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Balas Pesan</h3>
            </div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Kirim ke: <span class="text-orange-600">{replyTarget.name}</span></p>
          </div>
          <button onclick={() => showReplyModal = false} class="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div class="mb-8 bg-slate-50 border border-slate-100 rounded-2xl p-5">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Mengenai Tugas</p>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <Bell size={14} />
            </div>
            <p class="text-sm font-bold text-slate-700">{replyTarget.taskTitle || 'Tugas Tanpa Judul'}</p>
          </div>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Pesan Anda</label>
            <div class="relative group">
              <textarea 
                bind:value={replyMessage}
                placeholder="Tulis balasan profesional Anda di sini..."
                rows="5"
                class="w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 text-sm font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all resize-none shadow-sm placeholder:text-slate-300"
              ></textarea>
              <div class="absolute bottom-4 right-4 text-[10px] font-bold text-slate-300 group-focus-within:text-slate-900 transition-colors">
                {replyMessage.length} Karakter
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-4 mt-10 mb-2">
          <button onclick={() => showReplyModal = false} disabled={isSendingReply} class="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">Batal</button>
          <button onclick={submitReply} disabled={isSendingReply || !replyMessage.trim()} 
                  class="flex-[2] py-4 rounded-2xl text-sm font-black text-white shadow-2xl shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isSendingReply}
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span>MENGIRIM...</span>
            {:else}
              <Send size={18} />
              <span>KIRIM BALASAN</span>
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