<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

  interface Notification {
    id: string
    user_id: string
    type: 'task_assigned' | 'task_accepted' | 'task_rejected' | 'task_completed' | 'task_revision'
    title: string
    message: string
    data: Record<string, unknown>
    is_read: boolean
    created_at: string
  }

  let user = $state<User | null>(null)
  let notifications = $state<Notification[]>([])
  let isLoading = $state(true)
  let isUpdating = $state(false)

  // Toast State
  let toastMsg = $state('')
  let toastVisible = $state(false)
  let toastTimer: number

  function showToast(msg: string, dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  function formatDate(iso: string) {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    if (days < 7) return `${days} hari lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function getNotificationIcon(type: string) {
    const icons: Record<string, { bg: string; color: string; path: string }> = {
      task_assigned: {
        bg: 'bg-blue-50', color: 'text-blue-500',
        path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
      },
      task_accepted: {
        bg: 'bg-green-50', color: 'text-green-500',
        path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      },
      task_rejected: {
        bg: 'bg-red-50', color: 'text-red-500',
        path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
      },
      task_completed: {
        bg: 'bg-emerald-50', color: 'text-emerald-500',
        path: 'M5 13l4 4L19 7'
      },
      task_revision: {
        bg: 'bg-amber-50', color: 'text-amber-500',
        path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
      },
    }
    const icon = icons[type] ?? { bg: 'bg-slate-50', color: 'text-slate-500', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
    return icon
  }

  // ── Derived ────────────────────────────────────────
  let unreadCount = $derived(notifications.filter(n => !n.is_read).length)

  // ── Data ───────────────────────────────────────────
  async function loadNotifications() {
    if (!user) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) notifications = data as Notification[]
    isLoading = false
  }

  // ── Realtime ───────────────────────────────────────
  let channel: ReturnType<typeof supabase.channel> | null = null

  function setupRealtime() {
    if (!user || channel) return
    channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Hindari duplikat jika sudah ada
          const exists = notifications.some(n => n.id === payload.new.id)
          if (!exists) notifications = [payload.new as Notification, ...notifications]
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          notifications = notifications.map(n => n.id === payload.new.id ? payload.new as Notification : n)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          notifications = notifications.filter(n => n.id !== payload.old.id)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[Notif] Realtime terhubung')
        if (status === 'CLOSED') console.warn('[Notif] Realtime terputus')
      })
  }

  // ── Actions ────────────────────────────────────────
  async function markAsRead(id: string) {
    // Optimistic update
    notifications = notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) {
      // Rollback
      notifications = notifications.map(n => n.id === id ? { ...n, is_read: false } : n)
      showToast('Gagal memperbarui status')
    }
  }

  async function markAllAsRead() {
    if (!user || notifications.every(n => n.is_read)) return
    isUpdating = true
    // Optimistic
    const prev = [...notifications]
    notifications = notifications.map(n => ({ ...n, is_read: true }))
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (error) {
      notifications = prev
      showToast('Gagal memperbarui')
    } else {
      showToast('Semua notifikasi dibaca ✓')
    }
    isUpdating = false
  }

  async function deleteNotification(id: string) {
    // Optimistic
    const prev = [...notifications]
    notifications = notifications.filter(n => n.id !== id)
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      notifications = prev
      showToast('Gagal menghapus')
    } else {
      showToast('Notifikasi dihapus')
    }
  }

  async function clearAll() {
    if (!user || notifications.length === 0) return
    if (!confirm('Hapus semua riwayat notifikasi?')) return
    const prev = [...notifications]
    notifications = []
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)
    if (error) {
      notifications = prev
      showToast('Gagal menghapus semua')
    } else {
      showToast('Riwayat dibersihkan')
    }
  }

  onMount(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return location.assign('/auth')
    user = u
    await loadNotifications()
    setupRealtime()
  })

  onDestroy(() => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  })
</script>

<svelte:head>
  <title>Notifikasi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-2xl"
       style="background: linear-gradient(135deg, #F97316, #EA580C); font-family:'Inter',sans-serif;">
    {toastMsg}
  </div>
{/if}

<div class="min-h-screen pb-24" style="background: #FFF9F0; font-family:'Inter',sans-serif;">
  
  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-orange-100 px-5 py-4">
    <div class="max-w-lg mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" class="p-2 -ml-2 hover:bg-orange-50 rounded-full transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </a>
        <div class="flex items-center gap-2">
          <h1 class="font-bold text-slate-900 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Notifikasi
          </h1>
          {#if unreadCount > 0}
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
              {unreadCount}
            </span>
          {/if}
        </div>
      </div>

      {#if notifications.length > 0}
        <div class="flex gap-1">
          <button onclick={markAllAsRead}
                  disabled={isUpdating || unreadCount === 0}
                  class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Tandai semua dibaca">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7m-6 0l-4 4-4-4"/>
            </svg>
          </button>
          <button onclick={clearAll}
                  class="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                  title="Hapus semua">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </header>

  <main class="max-w-lg mx-auto p-4">
    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-20 gap-3">
        <div class="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
        <p class="text-xs font-medium text-slate-400">Memuat notifikasi...</p>
      </div>

    {:else if notifications.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-5 border-2 border-orange-100">
          <svg class="w-9 h-9 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p class="text-sm font-bold text-slate-500" style="font-family:'Plus Jakarta Sans',sans-serif;">
          Kotak masuk kosong
        </p>
        <p class="text-xs text-slate-400 mt-1">Semua info tugas akan muncul di sini</p>
      </div>

    {:else}
      <!-- Unread section -->
      {#if notifications.some(n => !n.is_read)}
        <p class="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-2 px-1">Belum Dibaca</p>
        <div class="flex flex-col gap-2 mb-5">
          {#each notifications.filter(n => !n.is_read) as n (n.id)}
            {@const icon = getNotificationIcon(n.type)}
            <div class="group relative bg-white border border-orange-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                 onclick={() => markAsRead(n.id)}
                 role="button" tabindex="0"
                 onkeydown={(e) => e.key === 'Enter' && markAsRead(n.id)}>
              <!-- Unread dot -->
              <div class="absolute top-4 right-4 w-2 h-2 rounded-full" style="background:#F97316;"></div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 p-2 rounded-xl {icon.bg}">
                  <svg class="w-5 h-5 {icon.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d={icon.path}/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0 pr-4">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h3 class="text-sm font-bold text-slate-800 leading-snug" style="font-family:'Plus Jakarta Sans',sans-serif;">
                      {n.title}
                    </h3>
                    <span class="text-[9px] font-medium text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 leading-relaxed mb-2">{n.message}</p>
                  <div class="flex items-center justify-between">
                    {#if n.data?.task_id}
                      <a href="/tasks" 
                         class="text-[10px] font-bold text-orange-600 hover:underline"
                         onclick={(e) => e.stopPropagation()}>
                        LIHAT TUGAS →
                      </a>
                    {:else}
                      <span></span>
                    {/if}
                    <button
                      onclick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                      class="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      HAPUS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Read section -->
      {#if notifications.some(n => n.is_read)}
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Sudah Dibaca</p>
        <div class="flex flex-col gap-2">
          {#each notifications.filter(n => n.is_read) as n (n.id)}
            {@const icon = getNotificationIcon(n.type)}
            <div class="group relative bg-white/60 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-sm">
              <div class="flex gap-3">
                <div class="flex-shrink-0 p-2 rounded-xl {icon.bg} opacity-60">
                  <svg class="w-5 h-5 {icon.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d={icon.path}/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h3 class="text-sm font-semibold text-slate-500 leading-snug">{n.title}</h3>
                    <span class="text-[9px] font-medium text-slate-300 whitespace-nowrap flex-shrink-0">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 leading-relaxed mb-2">{n.message}</p>
                  <div class="flex items-center justify-between">
                    {#if n.data?.task_id}
                      <a href="/tasks" class="text-[10px] font-bold text-slate-400 hover:text-orange-600 hover:underline transition-colors">
                        LIHAT TUGAS →
                      </a>
                    {:else}
                      <span></span>
                    {/if}
                    <button
                      onclick={() => deleteNotification(n.id)}
                      class="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      HAPUS
                    </button>
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