<script lang="ts">
  interface Props {
    done: number; inProgress: number; review: number; todo: number; total: number; rate: number
  }
  let { done, inProgress, review, todo, total, rate }: Props = $props()
  let breakdown = $derived([
    { label: 'Selesai',     val: done,       dot: '#22C55E' },
    { label: 'Dikerjakan',  val: inProgress,  dot: '#3B82F6' },
    { label: 'Review',      val: review,      dot: '#A855F7' },
    { label: 'Belum Mulai', val: todo,        dot: '#CBD5E1' },
  ])
</script>

<div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
  <div class="flex items-center justify-between mb-3">
    <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Progress Tugas</p>
    <span class="text-sm font-bold text-orange-500">{rate}%</span>
  </div>
  <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
    <div class="h-full rounded-full transition-all duration-700"
         style="width:{rate}%; background: linear-gradient(90deg, #F97316, #FBBF24);"></div>
  </div>
  <div class="grid grid-cols-2 gap-2">
    {#each breakdown as item}
      <div class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:{item.dot};"></div>
          <span class="text-xs text-slate-500">{item.label}</span>
        </div>
        <span class="text-sm font-bold text-slate-700">{item.val}</span>
      </div>
    {/each}
  </div>
</div>
