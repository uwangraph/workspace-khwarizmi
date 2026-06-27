<script lang="ts">
  import { slide } from 'svelte/transition'
  import { ArrowLeft, Search, X, Hash, Info, Palette, MoreVertical, Video, Phone, Trash2 } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import type { ChatRoom, Profile } from '$lib/type'

  let {
    activeRoom,
    partnerProfile,
    typingUsers,
    memberNames = '',
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
    onVideoCall,
    onVoiceCall,
    onClearChat,
    getStatusText
  }: {
    activeRoom: ChatRoom | null,
    partnerProfile: Profile | null,
    typingUsers: Set<string>,
    memberNames?: string,
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
    onVideoCall?: () => void,
    onVoiceCall?: () => void,
    onClearChat?: () => void,
    getStatusText: (p: Profile | null) => string
  } = $props()

  let showMainMenu = $state(false)

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
    <button onclick={onInfo} class="flex flex-1 min-w-0 items-center gap-3 rounded-2xl px-1 py-1 text-left hover:bg-slate-50 transition-colors">
      {#if activeRoom?.type === 'group'}
        {#if (activeRoom as any)?.avatar_url}
          <img src={(activeRoom as any).avatar_url} alt={activeRoom.name} class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm" />
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
        {#if typingUsers.size > 0}
          <p class="text-[10px] font-medium text-orange-500 animate-pulse">Sedang mengetik...</p>
        {:else if activeRoom?.type === 'group'}
          <p class="text-[10px] font-medium text-slate-400 truncate">{memberNames || 'Grup'}</p>
        {:else}
          <p class="text-[10px] font-medium {getStatusText(partnerProfile) === 'Online' ? 'text-emerald-500' : 'text-slate-400'}">
            {getStatusText(partnerProfile)}
          </p>
        {/if}
      </div>
    </button>

    {#if onVoiceCall}
      <button
        onclick={onVoiceCall}
        title="Panggilan Suara"
        class="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all"
      >
        <Phone size={20} />
      </button>
    {/if}

    {#if onVideoCall}
      <button
        onclick={onVideoCall}
        title="Video Call"
        class="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all"
      >
        <Video size={20} />
      </button>
    {/if}

    <div class="relative">
      <button onclick={() => showMainMenu = !showMainMenu} class="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
        <MoreVertical size={20} />
      </button>

      {#if showMainMenu}
        <div class="absolute right-0 top-12 z-[100] bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 min-w-[160px]" transition:slide={{ duration: 150 }}>
          <button onclick={() => { showMainMenu = false; isSearching = true }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Search size={16} /> Cari Pesan
          </button>
          <button onclick={() => { showMainMenu = false; onInfo() }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Info size={16} /> Info {activeRoom?.type === 'group' ? 'Grup' : 'Profil'}
          </button>
          <button onclick={() => { showMainMenu = false; showWallpaperMenu = true }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Palette size={16} /> Ganti Wallpaper
          </button>
          {#if onClearChat}
            <button onclick={() => { showMainMenu = false; onClearChat() }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
              <Trash2 size={16} /> Bersihkan Chat
            </button>
          {/if}
        </div>
      {/if}

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
                    class="w-full px-4 py-2 text-left text-xs font-bold {selectedWallpaper === wp.id ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:bg-slate-50'}">
              {wp.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
