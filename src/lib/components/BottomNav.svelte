<script lang="ts">
  import { page } from '$app/stores'
  import { globalUnreadChatCount } from '$lib/stores/globalChatStore'
  
  let currentPath = $derived($page.url.pathname)
  
  const navItems = [
    { path: '/', label: 'Beranda', icon: 'home' },
    { path: '/absensi', label: 'Presensi', icon: 'calendar' },
    { path: '/tasks', label: 'Tugas', icon: 'tasks' },
    { path: '/chat', label: 'Obrolan', icon: 'chat' },
    { path: '/profile', label: 'Profil', icon: 'profile' },
  ]
</script>

<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 bg-white/95 backdrop-blur-xl border-t-2 border-slate-200 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] sm:border-x-2 sm:border-slate-200 safe-bottom">
  <div class="flex items-center justify-around px-2 py-2.5">
    {#each navItems as item}
      <a
        href={item.path}
        class="relative flex flex-col items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95
               {currentPath === item.path
                 ? 'text-orange-600 bg-orange-100 font-black border-b-[4px] border-orange-500 shadow-sm'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-extrabold'}"
      >
        {#if item.icon === 'home'}
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        {:else if item.icon === 'calendar'}
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        {:else if item.icon === 'tasks'}
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        {:else if item.icon === 'chat'}
          <div class="relative">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {#if $globalUnreadChatCount > 0}
              <span class="absolute -top-1.5 -right-2.5 bg-orange-500 text-white text-[10px] font-black px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md border-2 border-white">
                {$globalUnreadChatCount > 99 ? '99+' : $globalUnreadChatCount}
              </span>
            {/if}
          </div>
        {:else if item.icon === 'profile'}
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        {/if}

        <span class="text-xs tracking-tight">{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0.75rem);
  }
</style>