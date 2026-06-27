<script lang="ts">
  import { fade } from 'svelte/transition'
  import { Phone, PhoneOff, Video, Mic } from 'lucide-svelte'
  import { callState } from '$lib/stores/callStore'
  import { callService } from '$lib/services/callService'

  let { onAccept }: {
    onAccept: (roomId: string, roomName: string, voiceOnly: boolean) => void
  } = $props()

  let incoming = $derived(
    $callState.status === 'incoming' && $callState.kind === 'call' ? $callState : null
  )
  let voiceOnly = $derived(incoming?.voiceOnly ?? false)

  function initials(name: string) {
    return (name || '?').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
  }

  function accept() {
    if (incoming) onAccept(incoming.roomId, incoming.roomName, voiceOnly)
  }

  function decline() {
    callService.declineCall()
  }
</script>

{#if incoming}
  <div class="fixed inset-0 z-[280] flex flex-col select-none text-white overflow-hidden"
       transition:fade={{ duration: 200 }}>
    <!-- Background gradient -->
    <div class="absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900"></div>

    <!-- Decorative pulse rings -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="w-72 h-72 rounded-full border border-white/10 ring-pulse"></div>
      <div class="absolute w-96 h-96 rounded-full border border-white/5 ring-pulse-slow"></div>
    </div>

    <!-- Header label -->
    <div class="relative z-10 pt-[calc(env(safe-area-inset-top)+28px)] text-center">
      <p class="text-[11px] font-black uppercase tracking-widest text-emerald-200/80">
        {voiceOnly ? 'Panggilan Suara Masuk' : 'Video Call Masuk'}
      </p>
    </div>

    <!-- Caller info -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
      <div class="relative">
        {#if incoming.callerAvatar}
          <img src={incoming.callerAvatar} alt={incoming.callerName}
               class="w-36 h-36 rounded-full object-cover border-4 border-white/20 shadow-2xl" />
        {:else}
          <div class="w-36 h-36 rounded-full bg-white/15 border-4 border-white/20 flex items-center justify-center shadow-2xl">
            <span class="text-5xl font-black">{initials(incoming.callerName)}</span>
          </div>
        {/if}
        <div class="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-lg border-4 border-emerald-700">
          {#if voiceOnly}
            <Mic size={20} />
          {:else}
            <Video size={20} />
          {/if}
        </div>
      </div>

      <div>
        <h1 class="text-3xl font-black tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{incoming.callerName}</h1>
        <p class="mt-1.5 text-sm font-bold text-white/70 animate-pulse">Sedang memanggil...</p>
        {#if incoming.roomName && incoming.roomName !== incoming.callerName}
          <p class="mt-1 text-xs font-medium text-white/50">{incoming.roomName}</p>
        {/if}
      </div>
    </div>

    <!-- Action buttons -->
    <div class="relative z-10 pb-[calc(env(safe-area-inset-bottom)+32px)] px-10">
      <div class="flex items-center justify-between gap-6">
        <!-- Decline -->
        <div class="flex flex-col items-center gap-2 flex-1">
          <button onclick={decline}
                  class="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/40 hover:bg-red-600 active:scale-90 transition-all cursor-pointer">
            <PhoneOff size={26} />
          </button>
          <p class="text-[11px] font-black text-white/70">Tolak</p>
        </div>

        <!-- Accept -->
        <div class="flex flex-col items-center gap-2 flex-1">
          <button onclick={accept}
                  class="w-16 h-16 rounded-full bg-emerald-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-400/50 hover:bg-emerald-500 active:scale-90 transition-all cursor-pointer ring-bounce">
            <Phone size={26} />
          </button>
          <p class="text-[11px] font-black text-white/90">Terima</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .ring-pulse {
    animation: ringPulse 2s ease-out infinite;
  }
  .ring-pulse-slow {
    animation: ringPulse 2s ease-out infinite 0.6s;
  }
  @keyframes ringPulse {
    0% { transform: scale(0.95); opacity: 0.5; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  .ring-bounce {
    animation: ringBounce 1.4s ease-in-out infinite;
  }
  @keyframes ringBounce {
    0%, 100% { transform: translateY(0) rotate(0); }
    50% { transform: translateY(-4px) rotate(-8deg); }
  }
</style>
