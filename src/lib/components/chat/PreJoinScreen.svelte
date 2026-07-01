<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Mic, MicOff, Video, VideoOff, Users, X, Settings } from 'lucide-svelte'
  import { callService } from '$lib/services/callService'
  import { callState } from '$lib/stores/callStore'
  import toast from 'svelte-french-toast'

  let { onJoin, onCancel, userName = '' }: {
    onJoin: () => void | Promise<void>
    onCancel: () => void
    userName?: string
  } = $props()

  let videoEl = $state<HTMLVideoElement | null>(null)
  let isMicOn = $state(true)
  let isCamOn = $state(true)
  let hasMediaError = $state(false)
  let isJoining = $state(false)

  let prejoin = $derived($callState.status === 'prejoin' ? $callState : null)

  async function setupPreview() {
    try {
      const stream = await callService.getLocalStream(true, true)
      if (videoEl) videoEl.srcObject = stream
      hasMediaError = false
    } catch {
      hasMediaError = true
      toast.error('Izin kamera/mikrofon diperlukan')
    }
  }

  onMount(() => {
    setupPreview()
  })

  onDestroy(() => {
    if (videoEl) videoEl.srcObject = null
  })

  $effect(() => {
    if (videoEl && callService.localStream && !videoEl.srcObject) {
      videoEl.srcObject = callService.localStream
    }
  })

  function toggleMic() {
    isMicOn = !isMicOn
    callService.toggleAudio(isMicOn)
  }

  function toggleCam() {
    isCamOn = !isCamOn
    callService.toggleVideo(isCamOn)
  }

  async function handleJoin() {
    if (isJoining) return
    isJoining = true
    try {
      await onJoin()
    } catch {
      isJoining = false
    }
  }

  function handleCancel() {
    callService.releaseLocalStream()
    onCancel()
  }

  let initials = $derived((userName || 'U').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase())
</script>

{#if prejoin}
  <div class="fixed inset-0 z-[300] bg-slate-50 flex flex-col" transition:fade={{ duration: 200 }}>
    <!-- Top bar -->
    <div class="px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-3 flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <button onclick={handleCancel} class="p-2 -ml-2 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
          <X size={20} />
        </button>
        <div class="min-w-0">
          <p class="text-[10px] font-black uppercase tracking-widest text-emerald-500">Siap untuk bergabung?</p>
          <h1 class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {prejoin.roomName}
          </h1>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex items-center justify-center px-5 pb-5">
      <div class="w-full max-w-md flex flex-col items-center gap-6">
        <!-- Preview -->
        <div class="relative w-full aspect-[4/3] rounded-[32px] overflow-hidden bg-slate-900 shadow-2xl border-4 border-white">
          {#if hasMediaError}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <VideoOff size={28} class="text-red-500" />
              </div>
              <p class="text-white/80 text-sm font-bold">Kamera/mikrofon tidak tersedia</p>
              <p class="text-white/40 text-xs">Periksa izin browser kamu</p>
            </div>
          {:else if !isCamOn}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900">
              <div class="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center">
                <span class="text-2xl font-black text-emerald-300">{initials}</span>
              </div>
              <p class="text-white/60 text-xs font-bold">Kamera dimatikan</p>
            </div>
          {:else}
            <video bind:this={videoEl} autoplay playsinline muted class="w-full h-full object-cover scale-x-[-1]"></video>
          {/if}

          <!-- Floating mic indicator -->
          <div class="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md flex items-center gap-2">
            {#if isMicOn}
              <Mic size={12} class="text-emerald-300" />
              <span class="text-white text-[10px] font-bold">{userName || 'Kamu'}</span>
            {:else}
              <MicOff size={12} class="text-red-300" />
              <span class="text-white text-[10px] font-bold">Mic mati</span>
            {/if}
          </div>
        </div>

        <!-- Mic / Cam toggles -->
        <div class="flex items-center gap-4">
          <button onclick={toggleMic} disabled={hasMediaError}
                  class="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2
                         {isMicOn ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/40'}
                         disabled:opacity-40 disabled:cursor-not-allowed">
            {#if isMicOn}<Mic size={22} />{:else}<MicOff size={22} />{/if}
          </button>

          <button onclick={toggleCam} disabled={hasMediaError}
                  class="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2
                         {isCamOn ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/40'}
                         disabled:opacity-40 disabled:cursor-not-allowed">
            {#if isCamOn}<Video size={22} />{:else}<VideoOff size={22} />{/if}
          </button>
        </div>

        <!-- Info & Join -->
        <div class="w-full flex flex-col items-center gap-4 pt-2">
          <div class="flex items-center gap-2 text-slate-500">
            <Users size={14} />
            <p class="text-xs font-bold">
              {prejoin.mode === 'start' ? 'Kamu yang memulai rapat' : 'Bergabung ke rapat'}
            </p>
          </div>

          <button onclick={handleJoin} disabled={hasMediaError || isJoining}
                  class="w-full py-4 bg-emerald-500 text-white text-sm font-black rounded-2xl border-2 border-b-[6px] border-emerald-700 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:translate-y-0.5 active:border-b-[3px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {#if isJoining}
              <span class="flex items-center justify-center gap-2">
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menghubungkan...
              </span>
            {:else}
              {prejoin.mode === 'start' ? 'Mulai Rapat' : 'Gabung Sekarang'}
            {/if}
          </button>

          <button onclick={handleCancel}
                  class="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
