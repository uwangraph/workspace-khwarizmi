<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { X, Search, Check, Send, Hash, MessageSquare } from 'lucide-svelte'
  import type { ChatMessage, ChatRoom, Profile } from '$lib/type'

  let {
    showForwardModal = $bindable(null),
    forwardSearchQuery = $bindable(''),
    selectedForwardIds = $bindable([]),
    filteredProfiles,
    otherRooms,
    onToggleForwardSelection,
    onForwardBulk
  }: {
    showForwardModal: ChatMessage | null,
    forwardSearchQuery: string,
    selectedForwardIds: string[],
    filteredProfiles: Profile[],
    otherRooms: ChatRoom[],
    onToggleForwardSelection: (id: string) => void,
    onForwardBulk: () => void
  } = $props()

</script>

{#if showForwardModal}
  <div class="fixed inset-0 z-[250] bg-black/40 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm" transition:fade>
    <div class="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
      
      <!-- Header -->
      <div class="p-6 pb-2 border-b border-slate-50">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-extrabold text-slate-800 text-lg">Teruskan Pesan</h3>
          <button onclick={() => { showForwardModal = null; selectedForwardIds = []; forwardSearchQuery = '' }} class="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <!-- Search Bar -->
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} class="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input type="text" 
                 bind:value={forwardSearchQuery}
                 placeholder="Cari chat atau kontak..." 
                 class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none transition-all focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5" />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
        {#if forwardSearchQuery.trim() !== ''}
          <p class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Hasil Pencarian Kontak</p>
          {#each filteredProfiles as profile}
            <button onclick={() => onToggleForwardSelection(profile.id)} 
                    class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-left relative">
              <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=random&color=fff`} 
                   alt="" class="w-12 h-12 rounded-full object-cover shadow-sm" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Karyawan</p>
              </div>
              <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                         {selectedForwardIds.includes(profile.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200'}">
                {#if selectedForwardIds.includes(profile.id)}<Check size={12} strokeWidth={4} />{/if}
              </div>
            </button>
          {/each}
          {#if filteredProfiles.length === 0}
            <p class="p-8 text-center text-xs font-bold text-slate-400">Kontak tidak ditemukan</p>
          {/if}
        {:else}
          <p class="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Chat Terbaru</p>
          {#each otherRooms as room}
            <button onclick={() => onToggleForwardSelection(room.id)} 
                    class="w-full flex items-center gap-3 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-left relative">
              {#if room.type === 'direct'}
                <img src={room.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name ?? '')}&background=random&color=fff`}
                     alt="" class="w-12 h-12 rounded-full object-cover shadow-sm" />
              {:else}
                <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center font-bold">
                  <Hash size={20} />
                </div>
              {/if}
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">{room.name}</p>
                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{room.type === 'direct' ? 'Pesan Langsung' : 'Grup Proyek'}</p>
              </div>
              <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                         {selectedForwardIds.includes(room.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200'}">
                {#if selectedForwardIds.includes(room.id)}<Check size={12} strokeWidth={4} />{/if}
              </div>
            </button>
          {/each}
          {#if otherRooms.length === 0}
             <div class="py-12 flex flex-col items-center justify-center text-center px-6">
              <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <MessageSquare size={32} />
              </div>
              <p class="text-sm font-bold text-slate-400">Tidak ada obrolan lain</p>
              <p class="text-[10px] text-slate-300 mt-1 max-w-[180px]">Cari kontak di atas untuk meneruskan pesan.</p>
            </div>
          {/if}
        {/if}
      </div>

      {#if selectedForwardIds.length > 0}
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-700 truncate">{selectedForwardIds.length} terpilih</p>
            <p class="text-[10px] text-slate-400 font-bold uppercase truncate tracking-widest">Siap meneruskan</p>
          </div>
          <button onclick={onForwardBulk}
                  class="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">
            <Send size={24} class="ml-1" />
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
