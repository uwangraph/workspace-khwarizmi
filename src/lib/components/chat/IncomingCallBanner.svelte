<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { callState } from '$lib/stores/callStore'
  import { callService } from '$lib/services/callService'
  import { Phone, PhoneOff, Video } from 'lucide-svelte'

  let { onAccept }: {
    onAccept: (roomId: string, roomName: string) => void
  } = $props()

  let incoming = $derived(
    $callState.status === 'incoming' && $callState.kind === 'meeting' ? $callState : null
  )

  function accept() {
    if (incoming) onAccept(incoming.roomId, incoming.roomName)
  }

  function decline() {
    callService.declineCall()
  }
</script>

{#if incoming}
  <div
    class="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-[250] sm:left-auto sm:right-6 sm:w-[360px]"
    in:fly={{ y: -20, duration: 250, easing: cubicOut }}
    out:fade={{ duration: 180 }}
  >
    <div class="overflow-hidden rounded-[28px] border-2 border-emerald-100 bg-white/95 shadow-2xl backdrop-blur-xl">
      <div class="flex items-center gap-4 px-5 py-4">
        <div class="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 animate-pulse">
          <Video size={22} class="text-emerald-600" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-black uppercase tracking-widest text-emerald-500">Panggilan Rapat Masuk</p>
          <p class="text-sm font-black text-slate-800 truncate">{incoming.callerName}</p>
          <p class="text-xs font-bold text-slate-400 truncate">{incoming.roomName}</p>
        </div>
      </div>

      <div class="flex border-t border-slate-100">
        <button
          onclick={decline}
          class="flex-1 py-3.5 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <PhoneOff size={16} />
          Tolak
        </button>
        <div class="w-px bg-slate-100"></div>
        <button
          onclick={accept}
          class="flex-1 py-3.5 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <Phone size={16} />
          Terima
        </button>
      </div>
    </div>
  </div>
{/if}
