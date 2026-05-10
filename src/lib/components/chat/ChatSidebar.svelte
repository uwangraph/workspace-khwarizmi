<script lang="ts">
  import { slide, fade } from 'svelte/transition'
  import { X, Info, ImageIcon, FileText, ExternalLink } from 'lucide-svelte'
  import type { ChatRoom, Profile, ChatMessage } from '$lib/type'

  let {
    showSidebar = $bindable(false),
    activeRoom,
    partnerProfile,
    chatImages,
    chatFiles,
    onImagePreview
  }: {
    showSidebar: boolean,
    activeRoom: ChatRoom | null,
    partnerProfile: Profile | null,
    chatImages: ChatMessage[],
    chatFiles: ChatMessage[],
    onImagePreview: (url: string) => void
  } = $props()

</script>

{#if showSidebar}
  <div class="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-300" transition:slide={{ axis: 'x' }}>
    <div class="h-16 border-b border-slate-100 flex items-center justify-between px-6">
      <h2 class="text-sm font-bold text-slate-800">Info Obrolan</h2>
      <button onclick={() => showSidebar = false} class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-all">
        <X size={20} />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Room Profile -->
      <div class="p-8 flex flex-col items-center text-center border-b border-slate-50">
        {#if activeRoom?.type === 'group'}
          <div class="w-24 h-24 rounded-3xl bg-orange-100 text-orange-500 flex items-center justify-center mb-4 shadow-inner">
            <Info size={40} />
          </div>
        {:else}
          <img src={partnerProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRoom?.name || 'U')}&background=random&color=fff&size=160`}
               alt={activeRoom?.name} class="w-24 h-24 rounded-3xl object-cover mb-4 shadow-md" />
        {/if}
        <h3 class="text-base font-bold text-slate-800">{activeRoom?.name}</h3>
        <p class="text-xs text-slate-500 mt-1">{activeRoom?.type === 'group' ? 'Grup Publik' : (partnerProfile?.email || 'Informasi Kontak')}</p>
      </div>

      <!-- Media Gallery -->
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Media & File</h4>
          <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{chatImages.length + chatFiles.length}</span>
        </div>

        {#if chatImages.length > 0}
          <div class="grid grid-cols-3 gap-2 mb-6">
            {#each chatImages.slice(0, 6) as img}
              <button onclick={() => onImagePreview(img.metadata?.url)} 
                      class="aspect-square rounded-lg overflow-hidden border border-slate-100 hover:opacity-80 transition-opacity">
                <img src={img.metadata?.url} alt="Media" class="w-full h-full object-cover" />
              </button>
            {/each}
          </div>
        {/if}

        <div class="space-y-2">
          {#each chatFiles.slice(0, 3) as file}
            <a href={file.metadata?.url} target="_blank" 
               class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-50 hover:bg-slate-50 transition-all group">
              <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <FileText size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-slate-700 truncate">{file.metadata?.originalName || file.content}</p>
                <p class="text-[9px] text-slate-400">File Dokumen</p>
              </div>
              <ExternalLink size={14} class="text-slate-300 group-hover:text-indigo-500" />
            </a>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
