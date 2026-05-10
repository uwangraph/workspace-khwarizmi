<script lang="ts">
  import { slide } from 'svelte/transition'
  import { ArrowLeft, Search, X, Hash, Info, Palette } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import type { ChatRoom, Profile } from '$lib/type'

  let {
    activeRoom,
    partnerProfile,
    typingUsers,
    isSearching = $bindable(false),
    searchQuery = $bindable(''),
    showSidebar = $bindable(false),
    selectedWallpaper = $bindable('none'),
    customBgColor = $bindable('#f8fafc'),
    showWallpaperMenu = $bindable(false),
    wallpapers,
    onWallpaperUpload,
    onColorSelect,
    onInfo,
    getStatusText
  }: {
    activeRoom: ChatRoom | null,
    partnerProfile: Profile | null,
    typingUsers: Set<string>,
    isSearching: boolean,
    searchQuery: string,
    showSidebar: boolean,
    selectedWallpaper: string,
    customBgColor: string,
    showWallpaperMenu: boolean,
    wallpapers: any[],
    onWallpaperUpload: () => void,
    onColorSelect: () => void,
    onInfo: () => void,
    getStatusText: (p: Profile | null) => string
  } = $props()

</script>

<div class="h-16 bg-white border-b border-slate-200 flex items-center px-3 gap-3 shrink-0 shadow-sm">
  <button onclick={() => goto('/chat')} class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
    <ArrowLeft size={20} />
  </button>

  {#if isSearching}
    <div class="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 animate-in slide-in-from-right-2 duration-200">
      <Search size={16} class="text-slate-400" />
      <input type="text" bind:value={searchQuery} placeholder="Cari pesan..." 
             class="bg-transparent border-none outline-none text-xs flex-1 text-slate-700" 
             autoFocus />
      <button onclick={() => { isSearching = false; searchQuery = '' }} class="p-1 text-slate-400 hover:text-slate-600">
        <X size={16} />
      </button>
    </div>
  {:else}
    {#if activeRoom?.type === 'group'}
      {#if activeRoom?.avatar_url}
        <img src={activeRoom.avatar_url} alt={activeRoom.name} class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm" />
      {:else}
        <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
          <Hash size={18} strokeWidth={2.5} />
        </div>
      {/if}
    {:else}
      <img src={partnerProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRoom?.name || 'U')}&background=random&color=fff&size=80`}
           alt={activeRoom?.name} class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm" />
    {/if}

    <div class="flex-1 min-w-0">
      <h1 class="text-sm font-bold text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{activeRoom?.name || 'Obrolan'}</h1>
      <p class="text-[10px] font-medium {typingUsers.size > 0 ? 'text-orange-500 animate-pulse' : (getStatusText(partnerProfile) === 'Online' ? 'text-emerald-500' : 'text-slate-400')}">
        {typingUsers.size > 0 ? 'Sedang mengetik...' : getStatusText(partnerProfile)}
      </p>
    </div>

    <button onclick={() => isSearching = true} class="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
      <Search size={20} />
    </button>

    <button onclick={onInfo} class="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-all">
      <Info size={20} />
    </button>

    <div class="relative">
      <button onclick={() => showWallpaperMenu = !showWallpaperMenu} class="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-all">
        <Palette size={20} />
      </button>
      
      {#if showWallpaperMenu}
        <div class="absolute right-0 top-12 z-[100] bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 min-w-[140px]" transition:slide={{ duration: 150 }}>
          {#each wallpapers as wp}
            <button onclick={() => { 
                      if (wp.id === 'custom') {
                        onWallpaperUpload()
                      } else if (wp.id === 'color') {
                        onColorSelect()
                      } else {
                        selectedWallpaper = wp.id
                        localStorage.setItem('chat_wallpaper', wp.id)
                        showWallpaperMenu = false 
                      }
                    }} 
                    class="w-full px-4 py-2 text-left text-xs font-bold {selectedWallpaper === wp.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}">
              {wp.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
