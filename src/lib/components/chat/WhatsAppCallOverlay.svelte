<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Mic, MicOff, Video, VideoOff, PhoneOff, PictureInPicture, ChevronDown } from 'lucide-svelte'
  import { callService } from '$lib/services/callService'
  import { callState } from '$lib/stores/callStore'
  import toast from 'svelte-french-toast'

  let { partnerAvatarUrl = '' }: { partnerAvatarUrl?: string } = $props()

  let localVideoEl = $state<HTMLVideoElement | null>(null)
  let remoteStreams = $state<Map<string, { stream: MediaStream; name: string }>>(new Map())

  let isMuted = $state(false)
  let isCameraOff = $state(true)
  let isTogglingCamera = $state(false)
  let callDuration = $state(0)
  let currentTime = $state(new Date())
  let durationInterval: ReturnType<typeof setInterval> | null = null
  let clockInterval: ReturnType<typeof setInterval> | null = null

  // PiP drag state (local video saat video mode)
  const PIP_W = 96
  const PIP_H = 128
  const MARGIN = 16
  let pipX = $state(0)
  let pipY = $state(0)
  let isDragging = $state(false)
  let dragOffsetX = 0
  let dragOffsetY = 0

  let status = $derived($callState.status)
  let initialVoiceOnly = $derived(
    ($callState.status === 'calling' || $callState.status === 'ongoing') ? !!$callState.voiceOnly : false
  )
  let roomName = $derived($callState.status !== 'idle' && 'roomName' in $callState ? $callState.roomName : '')

  let remoteTiles = $derived(Array.from(remoteStreams.entries()).map(([id, v]) => ({ id, ...v })))
  let primaryRemote = $derived(remoteTiles[0] ?? null)
  let isConnected = $derived(status === 'ongoing' && remoteTiles.length > 0)

  let remoteHasVideo = $derived.by(() => {
    if (!primaryRemote) return false
    const tracks = primaryRemote.stream.getVideoTracks()
    return tracks.length > 0 && tracks.some(t => t.readyState === 'live' && t.enabled)
  })

  // Video mode tampil kalau salah satu pihak punya video aktif
  let isVideoMode = $derived(!isCameraOff || remoteHasVideo)

  function formatDuration(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function initials(name: string) {
    return (name || '?').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      pipX = window.innerWidth - PIP_W - MARGIN
      pipY = window.innerHeight - PIP_H - MARGIN - 140
    }
    // Default kamera: off saat voice call, on saat video call
    isCameraOff = initialVoiceOnly

    callService.onRemoteStream = (peerId, peerName, stream) => {
      remoteStreams = new Map(remoteStreams).set(peerId, { stream, name: peerName })
    }
    callService.onPeerLeft = (peerId) => {
      const next = new Map(remoteStreams)
      next.delete(peerId)
      remoteStreams = next
    }
    callService.onCallEnded = () => {
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {})
      }
      cleanup()
    }
    callService.onLocalStreamChanged = () => {
      if (localVideoEl && callService.localStream) {
        localVideoEl.srcObject = null
        localVideoEl.srcObject = callService.localStream
      }
    }

    durationInterval = setInterval(() => {
      if (status === 'ongoing') callDuration++
    }, 1000)

    // Update clock
    clockInterval = setInterval(() => currentTime = new Date(), 60000)

    // Suggestion 10: Auto PiP when tab hidden
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !document.pictureInPictureElement && (status === 'ongoing' || status === 'calling')) {
        const videoEls = Array.from(document.querySelectorAll('video'))
        const target = videoEls.find(v => v.srcObject)
        if (target) target.requestPictureInPicture().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onDestroy(() => cleanup())

  function cleanup() {
    if (durationInterval) clearInterval(durationInterval)
    if (clockInterval) clearInterval(clockInterval)
  }

  function attachStream(node: HTMLVideoElement, stream: MediaStream | null) {
    if (stream && node.srcObject !== stream) node.srcObject = stream
    return {
      update(s: MediaStream | null) {
        if (s && node.srcObject !== s) node.srcObject = s
        else if (!s) node.srcObject = null
      },
      destroy() { node.srcObject = null },
    }
  }

  $effect(() => {
    if (localVideoEl && callService.localStream && !isCameraOff) {
      localVideoEl.srcObject = callService.localStream
    }
  })

  function toggleMute() {
    isMuted = !isMuted
    callService.toggleAudio(!isMuted)
  }

  async function toggleCamera() {
    if (isTogglingCamera) return
    isTogglingCamera = true
    try {
      if (isCameraOff) {
        // Mau nyalain
        if (!callService.hasLiveVideoTrack()) {
          const ok = await callService.ensureLocalVideo()
          if (!ok) {
            toast.error('Gagal mengakses kamera')
            return
          }
        } else {
          callService.toggleVideo(true)
        }
        isCameraOff = false
      } else {
        // Matiin
        callService.toggleVideo(false)
        isCameraOff = true
      }
    } finally {
      isTogglingCamera = false
    }
  }

  function handleEnd() {
    callService.endCall()
  }

  function minimizeUI() {
    callState.update(s => (s.status === 'calling' || s.status === 'ongoing' ? { ...s, isMinimized: true } : s))
  }

  // PiP drag (video mode only)
  function onPipPointerDown(e: PointerEvent) {
    isDragging = true
    dragOffsetX = e.clientX - pipX
    dragOffsetY = e.clientY - pipY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  function onPipPointerMove(e: PointerEvent) {
    if (!isDragging) return
    pipX = Math.max(MARGIN, Math.min(e.clientX - dragOffsetX, window.innerWidth - PIP_W - MARGIN))
    pipY = Math.max(MARGIN, Math.min(e.clientY - dragOffsetY, window.innerHeight - PIP_H - MARGIN))
  }
  function onPipPointerUp() {
    if (!isDragging) return
    isDragging = false
    const cx = pipX + PIP_W / 2
    pipX = cx < window.innerWidth / 2 ? MARGIN : window.innerWidth - PIP_W - MARGIN
  }

  let mainSubjectName = $derived(primaryRemote?.name || roomName || 'Memanggil')
  let statusText = $derived(
    status === 'calling' ? 'Memanggil...'
    : !isConnected ? 'Menunggu peserta...'
    : `${formatDuration(callDuration)} • ${currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  )
</script>

<div class="fixed inset-0 z-[300] flex flex-col select-none overflow-hidden text-white"
     class:bg-voice={!isVideoMode}
     class:bg-video={isVideoMode}
     transition:fade={{ duration: 200 }}>

  <!-- Top bar (Minimize button) -->
  <div class="absolute top-0 left-0 right-0 z-40 px-5 pt-[calc(env(safe-area-inset-top)+14px)] flex items-center">
    <button onclick={minimizeUI} class="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-black/30 transition-colors cursor-pointer">
      <ChevronDown size={24} />
    </button>
  </div>

  <!-- ── Stage utama ───────────────────────────────────────────────────── -->
  <div class="absolute inset-0">
    {#if !primaryRemote}
      <!-- Belum tersambung: tampilin avatar partner + status -->
      <div class="h-full flex flex-col items-center justify-center text-center px-8 gap-6">
        <p class="text-[10px] font-black uppercase tracking-widest text-white/60">
          {initialVoiceOnly ? 'Panggilan Suara' : 'Video Call'}
        </p>
        <div class="relative">
          {#if partnerAvatarUrl}
            <img src={partnerAvatarUrl} alt={mainSubjectName}
                 class="w-36 h-36 rounded-full object-cover border-4 border-white/20 shadow-2xl" />
          {:else}
            <div class="w-36 h-36 rounded-full bg-white/15 border-4 border-white/20 flex items-center justify-center shadow-2xl">
              <span class="text-5xl font-black text-white">{initials(mainSubjectName)}</span>
            </div>
          {/if}
          {#if status === 'calling'}
            <div class="absolute inset-0 rounded-full border-2 border-white/40 ring-pulse"></div>
          {/if}
        </div>
        <div>
          <h2 class="text-2xl font-black tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{mainSubjectName}</h2>
          <p class="mt-1.5 text-sm font-bold text-white/70 {status === 'calling' ? 'animate-pulse' : ''}">{statusText}</p>
        </div>
      </div>

    {:else if remoteHasVideo}
      <!-- Remote punya video → tampilin fullscreen -->
      <video autoplay playsinline use:attachStream={primaryRemote.stream}
             class="w-full h-full object-cover bg-black"></video>

      <!-- Top info bar -->
      <div class="absolute top-0 left-0 right-0 z-10 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-4 bg-gradient-to-b from-black/60 to-transparent">
        <h2 class="text-base font-black tracking-tight">{primaryRemote.name}</h2>
        <p class="text-xs font-bold text-white/70 mt-0.5 {status === 'calling' ? 'animate-pulse' : ''}">{statusText}</p>
        {#if remoteTiles.length > 1}
          <p class="text-[10px] font-bold text-white/50 mt-0.5">+{remoteTiles.length - 1} peserta lain</p>
        {/if}
      </div>

    {:else}
      <!-- Tersambung tapi remote belum nyalain video → avatar remote + status -->
      <div class="h-full flex flex-col items-center justify-center text-center px-8 gap-5">
        <p class="text-[10px] font-black uppercase tracking-widest text-white/60">
          {isCameraOff ? 'Panggilan Suara' : 'Menunggu kamera lawan bicara'}
        </p>
        <div class="relative">
          <div class="w-36 h-36 rounded-full bg-white/15 border-4 border-white/20 flex items-center justify-center shadow-2xl">
            <span class="text-5xl font-black text-white">{initials(primaryRemote.name)}</span>
          </div>
        </div>
        <div>
          <h2 class="text-2xl font-black tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{primaryRemote.name}</h2>
          <p class="mt-1.5 text-sm font-bold text-white/70 font-mono">{formatDuration(callDuration)}</p>
        </div>
        {#if remoteTiles.length > 1}
          <div class="flex -space-x-2 mt-1">
            {#each remoteTiles.slice(1, 5) as t}
              <div class="w-9 h-9 rounded-full bg-white/15 border-2 border-emerald-600 flex items-center justify-center">
                <span class="text-[10px] font-black">{initials(t.name)}</span>
              </div>
            {/each}
            {#if remoteTiles.length > 5}
              <div class="w-9 h-9 rounded-full bg-white/20 border-2 border-emerald-600 flex items-center justify-center">
                <span class="text-[10px] font-black">+{remoteTiles.length - 5}</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- ── PiP Lokal (saat kamera aktif) ─────────────────────────────────── -->
  {#if !isCameraOff}
    <div role="img" aria-label="Video kamu"
         style="left: {pipX}px; top: {pipY}px; width: {PIP_W}px; height: {PIP_H}px;"
         class="pip absolute rounded-2xl overflow-hidden bg-slate-700 border-2 z-20
                {isDragging ? 'border-white/60 scale-105 cursor-grabbing' : 'border-white/30 cursor-grab'}"
         onpointerdown={onPipPointerDown}
         onpointermove={onPipPointerMove}
         onpointerup={onPipPointerUp}
         onpointercancel={onPipPointerUp}>
      <video bind:this={localVideoEl} autoplay playsinline muted
             class="w-full h-full object-cover scale-x-[-1] bg-slate-900"></video>
    </div>
  {/if}

  <!-- ── Bottom Controls ──────────────────────────────────────────────── -->
  <div class="absolute bottom-0 left-0 right-0 z-30 px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 bg-gradient-to-t from-black/70 to-transparent">
    <div class="flex items-center justify-center gap-5">
      <button onclick={toggleMute}
              title={isMuted ? 'Nyalakan mic' : 'Matikan mic'}
              class="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer
                     {isMuted ? 'bg-white text-slate-900' : 'bg-white/15 backdrop-blur-md text-white border-2 border-white/20 hover:bg-white/25'}">
        {#if isMuted}<MicOff size={22} />{:else}<Mic size={22} />{/if}
      </button>

      <button onclick={toggleCamera}
              disabled={isTogglingCamera}
              title={isCameraOff ? 'Nyalakan kamera' : 'Matikan kamera'}
              class="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-60
                     {isCameraOff ? 'bg-white/15 backdrop-blur-md text-white border-2 border-white/20 hover:bg-white/25' : 'bg-white text-slate-900'}">
        {#if isTogglingCamera}
          <div class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        {:else if isCameraOff}
          <VideoOff size={22} />
        {:else}
          <Video size={22} />
        {/if}
      </button>
<button onclick={handleEnd}
        title="Akhiri panggilan"
        class="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/40 hover:bg-red-600 active:scale-90 transition-all cursor-pointer">
  <PhoneOff size={26} />
</button>
</div>
</div>
</div>

<style>
  .bg-voice {
    background: linear-gradient(160deg, #047857 0%, #064e3b 60%, #022c22 100%);
    transition: background 0.4s ease;
  }
  .bg-video {
    background: #0f172a;
    transition: background 0.4s ease;
  }
  .pip {
    touch-action: none;
    transition: transform 0.15s ease, border-color 0.15s ease, left 0.1s ease-out, top 0.1s ease-out;
    will-change: left, top;
  }
  .ring-pulse {
    animation: ringPulse 1.6s ease-out infinite;
  }
  @keyframes ringPulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.4); opacity: 0; }
  }
</style>
