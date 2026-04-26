<script lang="ts">
  interface Props {
    currentPage: number
    totalPages: number
    onPrev: () => void
    onNext: () => void
  }
  let { currentPage, totalPages, onPrev, onNext }: Props = $props()
</script>

{#if totalPages > 1}
  <div class="px-4 py-3 bg-white/90 rounded-2xl shadow-sm border border-white/50 flex items-center justify-between">
    <button onclick={onPrev} disabled={currentPage === 1}
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer">
      Prev
    </button>
    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      Hal {currentPage} / {totalPages}
    </span>
    <button onclick={onNext} disabled={currentPage === totalPages}
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer">
      Next
    </button>
  </div>
{/if}
