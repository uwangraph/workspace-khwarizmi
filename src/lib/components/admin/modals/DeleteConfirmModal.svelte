<script lang="ts">
  import { Trash2 } from 'lucide-svelte'
  interface Props {
    title: string
    message: string
    isDeleting?: boolean
    onConfirm: () => void
    onClose: () => void
  }
  let { title, message, isDeleting = false, onConfirm, onClose }: Props = $props()
</script>

<div class="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 sm:p-0"
     style="background:rgba(15,23,42,0.6); backdrop-filter:blur(8px);"
     onclick={onClose}>
  <div class="w-full max-w-sm bg-white rounded-[32px] border-2 border-b-[8px] border-slate-200 shadow-2xl overflow-hidden"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1)"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1 sm:hidden">
      <div class="w-12 h-1.5 rounded-full bg-slate-200"></div>
    </div>
    <div class="px-6 pt-8 pb-4 flex flex-col items-center text-center gap-4">
      <div class="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center border-2 border-red-300 text-red-600 shadow-md animate-bounce">
        <Trash2 size={32} />
      </div>
      <div>
        <h3 class="font-black text-slate-800 text-xl" style="font-family:'Plus Jakarta Sans',sans-serif;">{title}</h3>
        <p class="text-xs font-bold text-slate-500 mt-2 leading-relaxed">{@html message}</p>
      </div>
    </div>
    <div class="flex gap-3 px-6 py-6 bg-slate-50 border-t-2 border-slate-100">
      <button onclick={onClose} class="flex-1 py-3.5 rounded-2xl text-xs font-black bg-slate-100 text-slate-600 border-2 border-b-[4px] border-slate-300 hover:bg-slate-200 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
        BATAL
      </button>
      <button onclick={onConfirm} disabled={isDeleting}
              class="flex-1 py-3.5 rounded-2xl text-xs font-black text-white bg-red-600 border-2 border-b-[4px] border-red-800 hover:bg-red-700 active:translate-y-0.5 active:border-b-[2px] transition-all disabled:opacity-60 cursor-pointer shadow-md">
        {isDeleting ? 'MENGHAPUS...' : 'YA, HAPUS'}
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
</style>
