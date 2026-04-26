<script lang="ts">
  interface Props {
    action: 'accept' | 'reject'
    taskTitle: string
    isConfirming: boolean
    onConfirm: () => void
    onClose: () => void
  }
  let { action, taskTitle, isConfirming, onConfirm, onClose }: Props = $props()
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
  <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation: zoomIn 0.2s ease-out;">
    <div class="px-6 py-5">
      <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3
                  {action === 'accept' ? 'bg-green-100' : 'bg-red-100'}">
        <svg class="w-6 h-6 {action === 'accept' ? 'text-green-600' : 'text-red-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          {#if action === 'accept'}
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          {/if}
        </svg>
      </div>
      <p class="text-center font-bold text-slate-800 text-base mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
        {action === 'accept' ? 'Bergabung dalam tugas?' : 'Tolak undangan?'}
      </p>
      <p class="text-center text-sm text-slate-600">
        {action === 'accept' ? 'Anda akan bergabung dalam' : 'Anda akan menolak undangan untuk'}
        <span class="font-semibold"> "{taskTitle}"</span>
      </p>
      <div class="flex gap-3 mt-5">
        <button onclick={onClose} disabled={isConfirming}
                class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 disabled:opacity-60 cursor-pointer">
          Batal
        </button>
        <button onclick={onConfirm} disabled={isConfirming}
                class="flex-[2] py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                style="background:{action === 'accept' ? 'linear-gradient(135deg,#16A34A,#15803D)' : '#DC2626'};">
          {#if isConfirming}
            Memproses...
          {:else if action === 'accept'}
            ✓ Bergabung
          {:else}
            Tolak
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
