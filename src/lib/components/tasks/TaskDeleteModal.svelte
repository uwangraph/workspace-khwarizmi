<script lang="ts">
  interface Props {
    taskTitle: string
    isDeleting: boolean
    onConfirm: () => void
    onClose: () => void
  }
  let { taskTitle, isDeleting, onConfirm, onClose }: Props = $props()
</script>

<div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
  <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation: zoomIn 0.2s ease-out;">
    <div class="px-6 py-5">
      <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
        <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </div>
      <p class="text-center font-bold text-slate-800 text-base mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Tugas?</p>
      <p class="text-center text-sm text-slate-600">
        <span class="font-semibold">"{taskTitle}"</span> akan dihapus permanen.
      </p>
      <div class="flex gap-3 mt-5">
        <button onclick={onClose} disabled={isDeleting}
                class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 disabled:opacity-60 cursor-pointer">
          Batal
        </button>
        <button onclick={onConfirm} disabled={isDeleting}
                class="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
                style="background:#DC2626;">
          {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
