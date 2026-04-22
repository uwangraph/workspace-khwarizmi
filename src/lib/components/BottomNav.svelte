<script lang="ts">
  import { page } from '$app/stores'
  
  // Menggunakan Svelte 5 $derived untuk tracking path aktif
  let currentPath = $derived($page.url.pathname)
  
  // Menghapus item notifikasi dari daftar navigasi
  const navItems = [
    { path: '/', label: 'Beranda', icon: 'home' },
    { path: '/absensi', label: 'Presensi', icon: 'calendar' },
    { path: '/tasks', label: 'Tugas', icon: 'tasks' },
    { path: '/profile', label: 'Profil', icon: 'profile' },
  ]
</script>

<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-lg sm:border-x sm:border-slate-200 safe-bottom">
  <div class="flex items-center justify-around px-2 py-2">
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
        {:else if item.icon === 'profile'}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
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