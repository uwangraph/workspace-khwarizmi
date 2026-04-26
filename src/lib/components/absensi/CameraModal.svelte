<script lang="ts">
  import { X, Camera, RotateCcw, Send, MapPin } from 'lucide-svelte'
  interface Session { id: number; name: string }
  interface Props {
    sessionId: number
    type: 'in' | 'out'
    sessions: Session[]
    status: string
    stream: MediaStream | null
    capturedUrl: string
    isSubmitting: boolean
    onClose: () => void
    onTakePhoto: () => void
    onRetake: () => void
    onSubmit: () => void
  }
  let { sessionId, type, sessions, status, stream, capturedUrl, isSubmitting, onClose, onTakePhoto, onRetake, onSubmit }: Props = $props()

  let videoEl = $state<HTMLVideoElement | null>(null)

  $effect(() => { if (videoEl && stream) videoEl.srcObject = stream })

  let sessionName = $derived(sessions.find(s => s.id === sessionId)?.name || 'Kamera')
</script>

<div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
     style="background:rgba(0,0,0,0.92); backdrop-filter:blur(16px);">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style="animation: zoomIn 0.2s ease-out;">
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-transparent">
      <div>
        <span class="text-sm font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{sessionName}</span>
        <span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full {type === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}">
          {type === 'in' ? 'Check-in' : 'Check-out'}
        </span>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
        <X size={14} />
      </button>
    </div>

    <div class="relative bg-black" style="aspect-ratio:3/4; overflow:hidden;">
      {#if capturedUrl}
        <img src={capturedUrl} alt="Preview Foto" class="w-full h-full object-cover" />
      {:else if stream}
        <video autoplay playsinline muted bind:this={videoEl}
               class="w-full h-full object-cover" style="transform: scaleX(-1);"></video>
        <div class="absolute inset-0 m-3 rounded-2xl border-2 border-white/20 pointer-events-none"></div>
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5"
             style="background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);">
          <Camera size={12} /> Posisikan wajah dalam bingkai
        </div>
      {:else}
        <div class="w-full h-full flex items-center justify-center">
          <div class="text-center">
            {#if status.includes('lokasi')}
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <MapPin size={20} class="text-white animate-pulse" />
              </div>
            {:else}
              <div class="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto mb-3"></div>
            {/if}
            <p class="text-sm text-slate-400">{status || 'Mengaktifkan kamera...'}</p>
          </div>
        </div>
      {/if}
    </div>

    <div class="px-5 pt-4 pb-5">
      {#if status && capturedUrl}
        <p class="text-center text-xs text-slate-500 mb-3">{status}</p>
      {/if}
      <div class="flex gap-3">
        {#if capturedUrl}
          <button onclick={onRetake} disabled={isSubmitting}
                  class="py-3 px-5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2">
            <RotateCcw size={14} /> Ulang
          </button>
        {/if}
        <button onclick={capturedUrl ? onSubmit : onTakePhoto}
                disabled={isSubmitting || (!capturedUrl && !stream)}
                class="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          {#if isSubmitting}
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Mengirim...
          {:else if capturedUrl}
            <Send size={14} /> Konfirmasi
          {:else}
            <Camera size={14} /> Ambil Foto
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
