<script lang="ts">
  interface Stats { total: number; notStarted: number; inProgress: number; review: number; revision: number; done: number; completionRate: number }
  interface Props { stats: Stats }
  let { stats }: Props = $props()
  let items = $derived([
    { val: stats.total,                        label: 'Total',    color: 'text-slate-800' },
    { val: stats.notStarted,                   label: 'Belum',    color: 'text-slate-500' },
    { val: stats.inProgress,                   label: 'Progress', color: 'text-blue-600' },
    { val: stats.review + stats.revision,      label: 'Review',   color: 'text-purple-600' },
    { val: stats.done,                         label: 'Selesai',  color: 'text-green-600' },
  ])
</script>

<div class="flex flex-col gap-3">
  <div class="grid grid-cols-5 gap-2">
    {#each items as s}
      <div class="rounded-xl px-2 py-3 bg-white/90 shadow-sm border border-white/50 text-center">
        <p class="text-lg font-bold {s.color}" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.val}</p>
        <p class="text-[9px] font-medium text-slate-500 mt-0.5">{s.label}</p>
      </div>
    {/each}
  </div>
  <div class="rounded-xl p-4 bg-white/90 shadow-sm border border-white/50">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-semibold text-slate-600">Progres Penyelesaian</span>
      <span class="text-xs font-bold text-orange-600">{stats.completionRate}%</span>
    </div>
    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div class="h-full rounded-full transition-all duration-700"
           style="width: {stats.completionRate}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
    </div>
  </div>
</div>
