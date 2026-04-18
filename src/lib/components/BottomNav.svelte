<script lang="ts">
  import { page } from '$app/stores'
  import { supabase } from '$lib/supabase'
  import { onMount } from 'svelte'
  
  let currentPath = $derived($page.url.pathname)
  let unreadCount = $state(0)
  
  const navItems = [
    { path: '/', label: 'Beranda', icon: 'home' },
    { path: '/absensi', label: 'Presensi', icon: 'calendar' },
    { path: '/tasks', label: 'Tugas', icon: 'tasks' },
    { path: '/notifications', label: 'Notifikasi', icon: 'bell' },
  ]
  
  async function loadUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (!error && count !== null) {
      unreadCount = count
    }
  }
  
  onMount(() => {
    loadUnreadCount()
    // Refresh setiap 30 detik
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  })
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-lg safe-bottom">
  <div class="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
    {#each navItems as item}
      <a
        href={item.path}
        class="flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200
               {currentPath === item.path
                 ? 'text-orange-600 bg-orange-50'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}"
      >
        {#if item.icon === 'home'}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        {:else if item.icon === 'calendar'}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        {:else if item.icon === 'tasks'}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        {:else if item.icon === 'bell'}
          <div class="relative">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {#if unreadCount > 0}
              <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white bg-red-500 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            {/if}
          </div>
        {/if}
        <span class="text-[10px] font-semibold">{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0.5rem);
  }
</style>