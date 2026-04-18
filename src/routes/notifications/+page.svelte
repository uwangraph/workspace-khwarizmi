<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

  interface Notification {
    id: string
    user_id: string
    type: 'task_assigned' | 'task_accepted' | 'task_rejected' | 'task_completed' | 'task_revision'
    title: string
    message: string
    data: any
    is_read: boolean
    created_at: string
  }

  let user = $state<User | null>(null)
  let notifications = $state<Notification[]>([])
  let isLoading = $state(true)
  let isUpdating = $state(false)

  // Toast
  let toastMsg = $state('')
  let toastVisible = $state(false)
  let toastTimer = 0

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
    return `${days} hari lalu`
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'task_assigned':
        return '<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>'
      case 'task_accepted':
        return '<svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
      case 'task_rejected':
        return '<svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
      case 'task_completed':
        return '<svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
      case 'task_revision':
        return '<svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>'
      default:
        return '<svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
    }
  }

  async function loadNotifications() {
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      notifications = data as Notification[]
    }
    isLoading = false
  }

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (!error) {
      notifications = notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    }
  }

  async function markAllAsRead() {
    isUpdating = true
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

    if (unreadIds.length === 0) {
      showToast('Tidak ada notifikasi baru')
      isUpdating = false
      return
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    if (!error) {
      notifications = notifications.map(n => ({ ...n, is_read: true }))
      showToast('Semua notifikasi ditandai sudah dibaca')
    } else {
      showToast('Gagal menandai notifikasi')
    }
    isUpdating = false
  }

  async function deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (!error) {
      notifications = notifications.filter(n => n.id !== notificationId)
      showToast('Notifikasi dihapus')
    } else {
      showToast('Gagal menghapus notifikasi')
    }
  }

  async function clearAllNotifications() {
    if (notifications.length === 0) {
      showToast('Tidak ada notifikasi')
      return
    }

    const confirmed = confirm('Hapus semua notifikasi? Tindakan ini tidak dapat dibatalkan.')
    if (!confirmed) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user!.id)

    if (!error) {
      notifications = []
      showToast('Semua notifikasi dihapus')
    } else {
      showToast('Gagal menghapus notifikasi')
    }
  }

  async function loadData() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) {
      location.assign('/auth')
      return
    }
    user = u
    await loadNotifications()
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Notifikasi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast Notification -->
{#if toastVisible}
  <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
       style="background: linear-gradient(135deg, #F97316, #EA580C); font-family:'Inter',sans-serif; backdrop-filter:blur(10px);">
    {toastMsg}
  </div>
{/if}

<div class="min-h-screen" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%); font-family:'Inter',sans-serif;">
  
  <!-- Animated Background Blobs -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
  </div>

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img 
        src="/logo-khwarizmi.png" 
        alt="Logo Khwarizmi" 
        class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200"
      />
      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
          Notifikasi
        </span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">Pemberitahuan terbaru</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if notifications.length > 0}
        <button onclick={markAllAsRead}
                disabled={isUpdating}
                class="text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-2 rounded-lg transition-all">
          Baca Semua
        </button>
        <button onclick={clearAllNotifications}
                class="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-2 rounded-lg transition-all">
          Hapus Semua
        </button>
      {/if}
    </div>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-40">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-medium text-slate-500">Memuat notifikasi...</p>
      </div>
    </div>
  {:else if notifications.length === 0}
    <div class="flex items-center justify-center py-40">
      <div class="text-center">
        <svg class="w-20 h-20 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <p class="text-slate-400 text-sm font-medium">Belum ada notifikasi</p>
        <p class="text-xs text-slate-300 mt-1">Notifikasi akan muncul saat ada tugas baru</p>
      </div>
    </div>
  {:else}
    <main class="max-w-lg mx-auto px-4 py-6 pb-24 flex flex-col gap-2 relative z-10">
      {#each notifications as notification}
        <div 
          class="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border transition-all hover:shadow-md
                 {notification.is_read ? 'border-white/50 opacity-70' : 'border-orange-200 bg-orange-50/50'}"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              {@html getNotificationIcon(notification.type)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-bold text-slate-800">{notification.title}</p>
                  <p class="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                  <p class="text-[10px] text-slate-400 mt-2">{formatDate(notification.created_at)}</p>
                </div>
                <div class="flex items-center gap-1">
                  {#if !notification.is_read}
                    <button 
                      onclick={() => markAsRead(notification.id)}
                      class="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                      title="Tandai sudah dibaca"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  {/if}
                  <button 
                    onclick={() => deleteNotification(notification.id)}
                    class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Hapus"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {#if notification.type === 'task_assigned' && notification.data?.task_id}
                <a 
                  href="/tasks"
                  class="inline-block mt-2 text-[10px] font-semibold text-orange-600 hover:text-orange-700"
                >
                  Lihat tugas →
                </a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </main>
  {/if}
</div>

<style>
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-in {
    animation: fade-in 0.3s ease-out;
  }
</style>