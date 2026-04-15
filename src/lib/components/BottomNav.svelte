<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  
  let currentPath = $derived($page.url.pathname)
  
  const navItems = [
    { path: '/', label: 'Beranda', icon: 'home', activeIcon: 'home-filled' },
    { path: '/absensi', label: 'Presensi', icon: 'calendar', activeIcon: 'calendar-filled' },
    { path: '/tasks', label: 'Tugas', icon: 'tasks', activeIcon: 'tasks-filled' },
    { path: '/profile', label: 'Profil', icon: 'user', activeIcon: 'user-filled' },
  ]
  
  function isActive(path: string) {
    if (path === '/' && currentPath === '/') return true
    if (path !== '/' && currentPath.startsWith(path)) return true
    return false
  }
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-lg safe-bottom">
  <div class="flex items-center justify-around max-w-md mx-auto px-3 py-1.5">
    {#each navItems as item}
      <button
        onclick={() => goto(item.path)}
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200
               {isActive(item.path)
                 ? 'text-orange-600'
                 : 'text-slate-400 hover:text-slate-600'}"
      >
        <div class="relative">
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
          {:else if item.icon === 'user'}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          {/if}
          
          <!-- Active indicator dot -->
          {#if isActive(item.path)}
            <span class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          {/if}
        </div>
        <span class="text-[9px] font-medium tracking-wide">{item.label}</span>
      </button>
    {/each}
  </div>
</nav>

<style>
  /* Safe area untuk iPhone dengan notch */
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0.5rem);
  }
</style>