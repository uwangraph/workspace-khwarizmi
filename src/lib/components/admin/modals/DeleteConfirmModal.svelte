<script lang="ts">
  interface Props {
    title: string
    message: string
    isDeleting?: boolean
    onConfirm: () => void
    onClose: () => void
  }
  let { title, message, isDeleting = false, onConfirm, onClose } = $props<Props>()
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
     onclick={onClose}>
  <div class="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1)"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1 sm:hidden">
      <div class="w-10 h-1 rounded-full bg-slate-200"></div>
    </div>
    <div class="px-6 pt-6 pb-3 flex flex-col items-center text-center gap-3">
      <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </div>
      <div>
        <h3 class="font-bold text-slate-800 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">{title}</h3>
        <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">{@html message}</p>
      </div>
    </div>
    <div class="flex gap-3 px-6 py-5">
      <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
        Batal
      </button>
      <button onclick={onConfirm} disabled={isDeleting}
              class="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 cursor-pointer">
        {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
</style>
