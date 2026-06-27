<script lang="ts">
  interface Props {
    done: number; inProgress: number; review: number; todo: number; total: number; rate: number
  }
  let { done, inProgress, review, todo, total, rate }: Props = $props()
  let breakdown = $derived([
    { label: 'Selesai',     val: done,       dot: '#10B981' },
    { label: 'Dikerjakan',  val: inProgress,  dot: '#3B82F6' },
    { label: 'Review',      val: review,      dot: '#A855F7' },
    { label: 'Belum Mulai', val: todo,        dot: '#94A3B8' },
  ])
</script>

<div class="bg-white rounded-[24px] p-6 shadow-sm border-2 border-b-[6px] border-slate-200 transition-all hover:border-slate-300">
  <div class="flex items-center justify-between mb-4">
    <p class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Progress Tugas</p>
    <span class="text-base font-black text-orange-500">{rate}%</span>
  </div>
  <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden mb-5 shadow-inner">
    <div class="h-full rounded-full transition-all duration-700"
         style="width:{rate}%; background: linear-gradient(90deg, #F97316, #FBBF24);"></div>
  </div>
  <div class="grid grid-cols-2 gap-3">
    {#each breakdown as item}
      <div class="flex items-center justify-between bg-slate-50 border-2 border-b-[4px] border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div class="flex items-center gap-2.5">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-inner" style="background:{item.dot};"></div>
          <span class="text-xs font-bold text-slate-600">{item.label}</span>
        </div>
        <span class="text-sm font-black text-slate-800">{item.val}</span>
      </div>
    {/each}
  </div>
</div>
