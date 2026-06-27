<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { Video, Phone, Mic, MicOff, PhoneOff, Maximize2 } from 'lucide-svelte'
  import { callService } from '$lib/services/callService'
  import { callState } from '$lib/stores/callStore'
  import { onMount, onDestroy } from 'svelte'

  let { roomName = '', kind = 'meeting' as 'call' | 'meeting' } = $props()
  
  let callDuration = $state(0)
  let interval: any = null
  let isMuted = $state(false)

  onMount(() => {
    interval = setInterval(() => callDuration++, 1000)
  })

  onDestroy(() => clearInterval(interval))

  function formatDuration(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function restoreUI() {
    callState.update(s => (s.status === 'calling' || s.status === 'ongoing' ? { ...s, isMinimized: false } : s))
  }

  function handleEnd() {
    callService.endCall()
  }

  function toggleMute() {
    isMuted = !isMuted
    callService.toggleAudio(!isMuted)
  }
</script>

<div class="fixed bottom-20 left-4 right-4 z-[200] sm:left-auto sm:right-6 sm:w-[320px]" transition:slide={{ axis: 'y' }}>
  <div class="bg-emerald-600 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 border border-emerald-500/50 backdrop-blur-md">
    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
      {#if kind === 'meeting'}
        <Video size={20} />
      {:else}
        <Phone size={20} />
      {/if}
    </div>

    <button onclick={restoreUI} class="flex-1 min-w-0 text-left cursor-pointer group">
      <p class="text-[10px] font-black uppercase tracking-widest text-emerald-200 leading-none mb-1">Panggilan Aktif</p>
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-black truncate">{roomName || 'Rapat'}</h4>
        <span class="text-[10px] font-bold bg-black/20 px-1.5 py-0.5 rounded-full">{formatDuration(callDuration)}</span>
      </div>
    </button>

    <div class="flex items-center gap-1">
      <button onclick={toggleMute} class="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
        {#if isMuted}<MicOff size={18} class="text-red-200" />{:else}<Mic size={18} />{/if}
      </button>
      <button onclick={handleEnd} class="p-2 rounded-xl bg-red-500 hover:bg-red-600 transition-colors cursor-pointer shadow-lg shadow-red-900/20">
        <PhoneOff size={18} />
      </button>
      <button onclick={restoreUI} class="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-1" title="Besarkan UI">
        <Maximize2 size={18} />
      </button>
    </div>
  </div>
</div>
