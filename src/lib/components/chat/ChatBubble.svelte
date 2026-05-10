<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { Send, Paperclip, Mic, Hash, ArrowLeft, Image as ImageIcon, ListTodo, Check, CheckCheck, X, Plus, Trash2, Maximize2, Play, Pause, ChevronDown, Reply, Edit2, Copy, Search, ExternalLink, Palette, Pin, Info, FileText, Star, Forward, CheckSquare, MessageSquare } from 'lucide-svelte'
  import type { ChatMessage, Profile } from '$lib/type'

  let { 
    msg, 
    isMe, 
    isSelectMode, 
    isSelected,
    searchQuery = '',
    playingId = null,
    audioProgress = 0,
    audioPlayer = null,
    starredMessages = [],
    activeMenuId = $bindable(null),
    user,
    partnerProfile,
    onReaction,
    onReply,
    onStar,
    onPin,
    onForward,
    onEdit,
    onCopy,
    onInfo,
    onDelete,
    onToggleSelect,
    onToggleAudio,
    onVote,
    onImagePreview,
    formatTime,
    highlightText,
    getUrlPreview,
    getPollResults,
    getWaveform
  }: {
    msg: ChatMessage,
    isMe: boolean,
    isSelectMode: boolean,
    isSelected: boolean,
    searchQuery: string,
    playingId: string | null,
    audioProgress: number,
    audioPlayer: any,
    starredMessages: string[],
    activeMenuId: string | null,
    user: any,
    partnerProfile: Profile | null,
    onReaction: (id: string, emoji: string) => void,
    onReply: (msg: ChatMessage) => void,
    onStar: (msg: ChatMessage) => void,
    onPin: (msg: ChatMessage) => void,
    onForward: (msg: ChatMessage) => void,
    onEdit: (msg: ChatMessage) => void,
    onCopy: (content: string) => void,
    onInfo: (msg: ChatMessage) => void,
    onDelete: (id: string) => void,
    onToggleSelect: (id: string) => void,
    onToggleAudio: (id: string, url: string) => void,
    onVote: (msgId: string, optId: string) => void,
    onImagePreview: (url: string) => void,
    formatTime: (iso: string) => string,
    highlightText: (t: string, q: string) => string,
    getUrlPreview: (t: string) => string | null,
    getPollResults: (id: string, opts: any[]) => any[],
    getWaveform: (seed: string) => number[]
  } = $props()

  function handleLongPressStart(e: any) {
    // Logic moved to parent for simplicity or keep here?
    // Let's assume parent handles long press for now to keep bubble clean
  }
</script>

<div id="msg-{msg.id}" class="flex {isMe ? 'justify-end' : 'justify-start'} group relative {activeMenuId === msg.id ? 'z-[110]' : 'z-0'}" transition:fade={{ duration: 100 }}>
  
  {#if activeMenuId === msg.id}
    <button class="fixed inset-0 z-[120] cursor-default bg-black/5" onclick={() => activeMenuId = null}></button>
  {/if}

  {#if isSelectMode}
    <div class="flex items-center px-2 z-[20]">
      <button onclick={() => onToggleSelect(msg.id)} 
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                     {isSelected ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-slate-300'}">
        {#if isSelected}
          <Check size={14} strokeWidth={4} />
        {/if}
      </button>
    </div>
  {/if}

  <div class="max-w-[78%] flex flex-col {isMe ? 'items-end' : 'items-start'} relative {activeMenuId === msg.id ? 'z-[130]' : 'z-[10]'}">
    
    <button onclick={() => activeMenuId = activeMenuId === msg.id ? null : msg.id}
            class="absolute {isMe ? '-left-6' : '-right-6'} top-1 opacity-0 lg:group-hover:opacity-100 transition-all p-1 text-slate-400 hover:text-slate-600 hidden lg:block">
      <ChevronDown size={16} />
    </button>

    {#if activeMenuId === msg.id}
      <div class="absolute {isMe ? 'right-0' : 'left-0'} top-8 z-[100] bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 min-w-[180px]" transition:slide={{ duration: 150 }}>
        <div class="flex items-center justify-around px-2 py-1.5 border-b border-slate-50 mb-1">
          {#each ['❤️', '👍', '😂', '😮', '😢', '🙏'] as emoji}
            <button onclick={() => onReaction(msg.id, emoji)} class="text-lg hover:scale-125 transition-transform p-1">
              {emoji}
            </button>
          {/each}
        </div>
        
        <button onclick={() => { onReply(msg); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <Reply size={16} class="text-orange-500" /> Balas
        </button>
        <button onclick={() => { onStar(msg); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <Star size={16} class={starredMessages.includes(msg.id) ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-500'} /> {starredMessages.includes(msg.id) ? 'Hapus Bintang' : 'Bintangi'}
        </button>
        <button onclick={() => { onPin(msg); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <Pin size={16} class="text-orange-500" /> Sematkan
        </button>
        <button onclick={() => { onForward(msg); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <Forward size={16} class="text-blue-500" /> Teruskan
        </button>
        {#if isMe && msg.type === 'text'}
          <button onclick={() => { onEdit(msg); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
            <Edit2 size={16} class="text-emerald-500" /> Edit
          </button>
        {/if}
        <button onclick={() => { onCopy(msg.content); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <Copy size={16} class="text-blue-500" /> Salin
        </button>
        <button onclick={() => { onInfo(msg); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <Info size={16} class="text-slate-400" /> Info
        </button>
        <div class="h-px bg-slate-50 my-1"></div>
        {#if isMe}
          <button onclick={() => { onDelete(msg.id); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3">
            <Trash2 size={16} /> Hapus
          </button>
        {/if}
        <button onclick={() => { onToggleSelect(msg.id); activeMenuId = null }} class="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
          <CheckSquare size={16} class="text-orange-400" /> Pilih pesan
        </button>
      </div>
    {/if}

    <div class="px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm relative overflow-hidden select-none active:scale-[0.98] transition-transform
                {isMe ? 'bg-orange-100 text-orange-900 border border-orange-200/50 rounded-br-sm' : 'bg-emerald-100 text-emerald-900 border border-emerald-200/50 rounded-bl-sm'}">
      
      {#if msg.metadata?.forwarded && msg.metadata?.original_sender !== msg.sender_id}
        <div class="flex items-center gap-1 mb-1 opacity-50">
          <Forward size={10} class="italic" />
          <span class="text-[10px] font-medium italic">Diteruskan</span>
        </div>
      {/if}

      {#if msg.metadata?.reply_to}
        <div class="mb-2 p-2 rounded-lg bg-black/5 border-l-4 {isMe ? 'border-orange-400' : 'border-emerald-400'} cursor-pointer"
             onclick={() => { /* scrollToMessage logic if available */ }}>
          <p class="text-[10px] font-bold {isMe ? 'text-orange-600' : 'text-emerald-600'} mb-0.5">
            {msg.metadata.reply_name || 'User'}
          </p>
          <p class="text-[11px] text-slate-500 line-clamp-2 italic">
            {msg.metadata.reply_content || '...'}
          </p>
        </div>
      {/if}

      {#if msg.type === 'text'}
        {@const url = getUrlPreview(msg.content)}
        {#if url}
          <a href={url} target="_blank" class="block mb-2 rounded-xl overflow-hidden bg-white/50 border border-slate-200/50 hover:bg-white/80 transition-all">
            <div class="p-2.5">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-4 h-4 bg-orange-100 rounded flex items-center justify-center">
                  <ExternalLink size={10} class="text-orange-600" />
                </div>
                <span class="text-[10px] font-bold text-slate-500 truncate">{new URL(url).hostname}</span>
              </div>
              <p class="text-[11px] font-bold text-slate-800 line-clamp-1">Kunjungi Tautan</p>
              <p class="text-[10px] text-slate-500 line-clamp-2 leading-tight mt-0.5">{url}</p>
            </div>
          </a>
        {/if}
        <span>{@html highlightText(msg.content, searchQuery)}</span>
        <div class="flex items-center justify-end gap-1 mt-1 -mb-1 ml-4 self-end shrink-0">
          <span class="text-[9px] font-medium {isMe ? 'text-orange-700/60' : 'text-emerald-700/60'}">
            {#if starredMessages.includes(msg.id)}
              <Star size={10} class="inline-block mr-1 fill-yellow-500 text-yellow-500" />
            {/if}
            {formatTime(msg.created_at)}
            {#if msg.metadata?.edited}
              <span class="ml-1 italic text-[8px]">diedit</span>
            {/if}
          </span>
          {#if isMe}
            <CheckCheck size={11} class="{msg.metadata?.is_read ? 'text-blue-500' : 'text-slate-400'}" strokeWidth={3} />
          {/if}
        </div>
      {:else if msg.type === 'image'}
        <div class="relative group/img cursor-pointer" onclick={() => onImagePreview(msg.metadata?.url)}>
          <img src={msg.metadata?.url} alt="Gambar" class="max-w-full rounded-xl mb-1 max-h-60 object-cover" />
          <div class="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
            <Maximize2 size={24} class="text-white" />
          </div>
        </div>
        {#if msg.content && !msg.content.match(/\.(jpg|jpeg|png|gif|webp)$/i)}
          <p class="mt-1.5 text-xs font-medium leading-relaxed">{msg.content}</p>
        {/if}
        <div class="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-4">
          <span class="text-[9px] font-medium {isMe ? 'text-orange-700/60' : 'text-emerald-700/60'}">
            {#if starredMessages.includes(msg.id)}
              <Star size={10} class="inline-block mr-1 fill-yellow-500 text-yellow-500" />
            {/if}
            {formatTime(msg.created_at)}
          </span>
          {#if isMe}
            <CheckCheck size={11} class="{msg.metadata?.is_read ? 'text-blue-500' : 'text-slate-400'}" strokeWidth={3} />
          {/if}
        </div>
      {:else if msg.type === 'audio'}
        <div class="flex items-center gap-3 {isMe ? 'bg-orange-200/40' : 'bg-emerald-200/40'} rounded-[24px] px-3 py-2 min-w-[200px]">
          <button onclick={() => onToggleAudio(msg.id, msg.metadata?.url)}
                  class="w-9 h-9 rounded-full bg-white {isMe ? 'text-orange-600' : 'text-emerald-600'} flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition-transform">
            {#if playingId === msg.id}
              <Pause size={18} fill="currentColor" />
            {:else}
              <Play size={18} class="ml-1" fill="currentColor" />
            {/if}
          </button>
          
          <div class="flex-1 flex items-center gap-[2px] h-10 overflow-hidden px-1">
            {#each getWaveform(msg.id) as height, i}
              {@const barProgress = (i / 30) * 100}
              {@const isActive = playingId === msg.id && audioProgress >= barProgress}
              <div class="w-[3px] rounded-full transition-all duration-300
                         {isActive ? (isMe ? 'bg-orange-500' : 'bg-emerald-500') : (isMe ? 'bg-orange-300/50' : 'bg-emerald-300/50')}"
                   style="height: {height}%"></div>
            {/each}
          </div>
          <div class="flex flex-col items-end gap-0.5 min-w-[32px]">
            <span class="text-[9px] font-bold {isMe ? 'text-orange-700' : 'text-emerald-700'} opacity-90 leading-none">
              {playingId === msg.id ? Math.round((audioPlayer?.duration || 0) * (audioProgress/100)) + 's' : (msg.metadata?.duration || '0s')}
            </span>
            <div class="w-1.5 h-1.5 rounded-full {isMe ? 'bg-orange-400' : 'bg-emerald-400'}"></div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-4">
          <span class="text-[9px] font-medium {isMe ? 'text-orange-700/60' : 'text-emerald-700/60'}">
            {#if starredMessages.includes(msg.id)}
              <Star size={10} class="inline-block mr-1 fill-yellow-500 text-yellow-500" />
            {/if}
            {formatTime(msg.created_at)}
          </span>
          {#if isMe}
            <CheckCheck size={11} class="{msg.metadata?.is_read ? 'text-blue-500' : 'text-slate-400'}" strokeWidth={3} />
          {/if}
        </div>
      {:else if msg.type === 'file'}
        <a href={msg.metadata?.url} target="_blank" class="flex items-center gap-2 p-2 rounded-xl bg-black/5 hover:bg-black/10 transition-colors">
          <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center"><Paperclip size={14} class="text-orange-500" /></div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-xs truncate">{msg.metadata?.originalName || msg.content}</p>
            <p class="text-[9px] opacity-60">{((msg.metadata?.size || 0) / 1024).toFixed(1)} KB</p>
          </div>
        </a>
        {#if msg.metadata?.caption}
          <p class="mt-1.5 text-xs font-medium leading-relaxed">{msg.metadata.caption}</p>
        {/if}
        <div class="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-4">
          <span class="text-[9px] font-medium {isMe ? 'text-orange-700/60' : 'text-emerald-700/60'}">
            {#if starredMessages.includes(msg.id)}
              <Star size={10} class="inline-block mr-1 fill-yellow-500 text-yellow-500" />
            {/if}
            {formatTime(msg.created_at)}
          </span>
          {#if isMe}
            <CheckCheck size={11} class="{msg.metadata?.is_read ? 'text-blue-500' : 'text-slate-400'}" strokeWidth={3} />
          {/if}
        </div>
      {:else if msg.type === 'poll'}
        <div class="min-w-[200px] py-1">
          <p class="font-bold text-sm mb-3">{msg.content}</p>
          <div class="space-y-2">
            {#each getPollResults(msg.id, msg.metadata?.options || []) as opt}
              <button onclick={() => onVote(msg.id, opt.id)}
                      class="w-full relative group overflow-hidden rounded-xl border transition-all
                             {opt.isSelected ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}">
                <div class="absolute inset-y-0 left-0 bg-emerald-500/10 transition-all duration-500" 
                     style="width: {opt.percent}%"></div>
                
                <div class="relative px-3 py-2.5 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    {#if opt.isSelected}
                      <div class="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                        <Check size={10} class="text-white" strokeWidth={4} />
                      </div>
                    {/if}
                    <span class="text-xs font-bold truncate {opt.isSelected ? 'text-emerald-700' : 'text-slate-700'}">{opt.text}</span>
                  </div>
                  <span class="text-[10px] font-bold text-slate-400">{Math.round(opt.percent)}%</span>
                </div>
              </button>
            {/each}
          </div>
        </div>
        <div class="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-4">
          <span class="text-[9px] font-medium {isMe ? 'text-orange-700/60' : 'text-emerald-700/60'}">
            {#if starredMessages.includes(msg.id)}
              <Star size={10} class="inline-block mr-1 fill-yellow-500 text-yellow-500" />
            {/if}
            {formatTime(msg.created_at)}
          </span>
          {#if isMe}
            <CheckCheck size={11} class="{msg.metadata?.is_read ? 'text-blue-500' : 'text-slate-400'}" strokeWidth={3} />
          {/if}
        </div>
      {/if}

      {#if msg.metadata?.reactions && Object.keys(msg.metadata.reactions).length > 0}
        <div class="absolute -bottom-3 {isMe ? 'left-0' : 'right-0'} flex -space-x-1 items-center bg-white border border-slate-100 rounded-full px-1.5 py-0.5 shadow-sm z-10 scale-90 origin-top">
          {#each Object.entries(msg.metadata.reactions).slice(0, 3) as [uid, emoji]}
            <span class="text-[10px]">{emoji}</span>
          {/each}
          {#if Object.keys(msg.metadata.reactions).length > 1}
            <span class="text-[8px] font-bold text-slate-400 ml-1">{Object.keys(msg.metadata.reactions).length}</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
