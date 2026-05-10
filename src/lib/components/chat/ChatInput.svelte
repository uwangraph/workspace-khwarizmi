<script lang="ts">
  import { slide } from 'svelte/transition'
  import { Paperclip, ImageIcon, ListTodo, Mic, Send, X, Plus } from 'lucide-svelte'
  import type { ChatMessage, ChatRoom } from '$lib/type'

  let {
    newMessage = $bindable(''),
    replyingTo = $bindable(null),
    editingMessage = $bindable(null),
    pendingFiles = $bindable([]),
    isRecording,
    isSending,
    isUploadingMedia,
    activeRoom,
    recordingSeconds,
    recordingWaveform,
    onSendMessage,
    onFileSelect,
    onTyping,
    onStartRecording,
    onStopRecording,
    onCancelEdit,
    onRemovePendingFile,
    triggerMediaSelect,
    showPollModal = $bindable(false),
    formatRecordingTime
  }: {
    newMessage: string,
    replyingTo: ChatMessage | null,
    editingMessage: ChatMessage | null,
    pendingFiles: any[],
    isRecording: boolean,
    isSending: boolean,
    isUploadingMedia: boolean,
    activeRoom: ChatRoom | null,
    recordingSeconds: number,
    recordingWaveform: number[],
    onSendMessage: () => void,
    onFileSelect: (e: Event, type: 'image' | 'file') => void,
    onTyping: () => void,
    onStartRecording: () => void,
    onStopRecording: () => void,
    onCancelEdit: () => void,
    onRemovePendingFile: (i: number) => void,
    triggerMediaSelect: (type: 'image' | 'file') => void,
    showPollModal: boolean,
    formatRecordingTime: (s: number) => string
  } = $props()

</script>

<div class="bg-white border-t border-slate-200 p-3 shrink-0 relative">
  
  <!-- Reply Preview Overlay -->
  {#if replyingTo}
    <div class="absolute bottom-full left-0 right-0 bg-emerald-50 border-t border-emerald-100 px-4 py-2.5 flex items-center gap-3 transition-all z-30" transition:slide>
      <div class="w-1 h-10 bg-orange-500 rounded-full shrink-0"></div>
      <div class="flex-1 min-w-0">
        <p class="text-[10px] font-bold text-orange-600 mb-0.5">Membalas {replyingTo.sender?.full_name || 'User'}</p>
        <p class="text-xs text-slate-500 truncate">{replyingTo.content}</p>
      </div>
      <button onclick={() => replyingTo = null} class="p-1.5 rounded-full hover:bg-emerald-200 text-slate-400 transition-colors shrink-0">
        <X size={16} />
      </button>
    </div>
  {/if}

  <!-- Edit Mode Overlay -->
  {#if editingMessage}
    <div class="absolute bottom-full left-0 right-0 bg-emerald-50 border-t border-emerald-100 px-4 py-2.5 flex items-center gap-3 transition-all z-30" transition:slide>
      <div class="w-1 h-10 bg-emerald-500 rounded-full shrink-0"></div>
      <div class="flex-1 min-w-0">
        <p class="text-[10px] font-bold text-emerald-600 mb-0.5">Mengedit pesan</p>
        <p class="text-xs text-slate-500 truncate">{editingMessage.content}</p>
      </div>
      <button onclick={onCancelEdit} class="p-1.5 rounded-full hover:bg-emerald-200 text-slate-400 transition-colors shrink-0">
        <X size={16} />
      </button>
    </div>
  {/if}

  <!-- Pending Files Preview -->
  {#if pendingFiles.length > 0}
    <div class="absolute bottom-full left-0 right-0 bg-white border-t border-slate-100 p-3 flex gap-3 overflow-x-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20" transition:slide>
      {#each pendingFiles as item, i}
        <div class="relative shrink-0 group">
          {#if item.type === 'image'}
            <img src={item.previewUrl} alt="Preview" class="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-sm" />
          {:else}
            <div class="w-20 h-20 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-2 text-center">
              <Paperclip size={20} class="text-indigo-500 mb-1" />
              <p class="text-[8px] font-bold text-slate-500 line-clamp-2">{item.file.name}</p>
            </div>
          {/if}
          <button onclick={() => onRemovePendingFile(i)}
                  class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      {/each}
      
      <button onclick={() => triggerMediaSelect('image')} 
              class="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all">
        <Plus size={20} />
        <span class="text-[9px] font-bold mt-1">Tambah</span>
      </button>
    </div>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); onSendMessage() }} class="flex items-end gap-2">
    <div class="flex gap-1 shrink-0 pb-0.5">
      <button type="button" onclick={() => triggerMediaSelect('file')} class="w-9 h-9 rounded-full text-slate-400 hover:bg-orange-50 hover:text-orange-500 flex items-center justify-center transition-colors">
        <Paperclip size={18} />
      </button>
      <button type="button" onclick={() => triggerMediaSelect('image')} class="w-9 h-9 rounded-full text-slate-400 hover:bg-orange-50 hover:text-orange-500 flex items-center justify-center transition-colors">
        <ImageIcon size={18} />
      </button>
      {#if activeRoom?.type === 'group'}
        <button type="button" onclick={() => showPollModal = true} class="w-9 h-9 rounded-full text-slate-400 hover:bg-orange-50 hover:text-orange-500 flex items-center justify-center transition-colors">
          <ListTodo size={18} />
        </button>
      {/if}
    </div>

    <div class="flex-1 bg-slate-50 border border-slate-200 rounded-3xl flex items-center px-1 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
      {#if isRecording}
        <div class="flex-1 flex items-center gap-1.5 px-4 h-10 overflow-hidden">
          <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-bold text-red-500 min-w-[35px]">{formatRecordingTime(recordingSeconds)}</span>
          <div class="flex-1 flex items-center gap-[2px] h-6">
            {#each recordingWaveform as height}
              <div class="w-1 bg-red-400/50 rounded-full transition-all duration-75" style="height: {height}%"></div>
            {/each}
          </div>
        </div>
      {:else}
        <input type="text" bind:value={newMessage} oninput={onTyping}
               placeholder={pendingFiles.length > 0 ? 'Tambah keterangan...' : 'Ketik pesan...'}
               class="flex-1 bg-transparent px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
      {/if}
      
      <button type="button" onclick={isRecording ? onStopRecording : onStartRecording}
              class="w-8 h-8 rounded-full flex items-center justify-center transition-colors mr-1
                     {isRecording ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-orange-50 hover:text-orange-500'}">
        <Mic size={18} />
      </button>
    </div>

    <button type="submit" disabled={(!newMessage.trim() && pendingFiles.length === 0 && !isUploadingMedia) || isSending || isRecording}
            class="w-12 h-12 shrink-0 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-all disabled:opacity-50 shadow-md shadow-orange-200">
      {#if isSending || isUploadingMedia}
        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      {:else}
        <Send size={18} class="ml-0.5" />
      {/if}
    </button>
  </form>
</div>
