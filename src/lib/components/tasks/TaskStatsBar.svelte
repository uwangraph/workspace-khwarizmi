<script lang="ts">
  interface Stats { total: number; notStarted: number; inProgress: number; review: number; revision: number; done: number; completionRate: number }
  interface Props { stats: Stats }
  let { stats }: Props = $props()

  const ITEMS = [
    { label: 'Total', val: stats.total, color: 'bg-slate-400' },
    { label: 'Belum', val: stats.notStarted, color: 'bg-slate-300' },
    { label: 'Progress', val: stats.inProgress, color: 'bg-blue-400' },
    { label: 'Selesai', val: stats.done, color: 'bg-green-400' },
  ]
</script>

<div class="bg-white rounded-3xl p-5 border border-orange-100/50 shadow-sm relative overflow-hidden">
  <!-- Subtle Background Accent -->
  <div class="absolute -top-6 -right-6 w-20 h-20 bg-orange-50 rounded-full blur-2xl opacity-60"></div>

  <div class="relative z-10">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex flex-col">
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Statistik Tugas</span>
        <div class="flex items-center gap-2">
          <span class="text-3xl font-black text-slate-800 tracking-tighter" style="font-family:'Plus Jakarta Sans',sans-serif;">{stats.completionRate}%</span>
          <span class="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">Selesai</span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs font-bold text-slate-400">{stats.done} / {stats.total}</span>
      </div>
    </div>

    <!-- Progress Bar with subtle glow -->
    <div class="h-[6px] w-full bg-slate-50 rounded-full overflow-hidden mb-6 shadow-inner">
      <div class="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
           style="width: {stats.completionRate}%"></div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-4 gap-2">
      {#each ITEMS as item}
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full {item.color}"></div>
            <span class="text-xs font-black text-slate-800">{item.val}</span>
          </div>
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.label}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
