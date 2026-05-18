<script lang="ts">
  interface Props {
    totalTasks: number
    doneTasks: number
    attendanceDays: number
  }
  let { totalTasks, doneTasks, attendanceDays }: Props = $props()
  let stats = $derived([
    { label: 'Total Tugas',   val: totalTasks,     color: '#F97316' },
    { label: 'Diselesaikan',  val: doneTasks,       color: '#10B981' },
    { label: 'Hari Hadir',    val: attendanceDays,  color: '#3B82F6' },
  ])
</script>

<div class="grid grid-cols-3 gap-3">
  {#each stats as s}
    <div class="bg-white rounded-[24px] p-5 shadow-sm border-2 border-b-[6px] border-slate-200 text-center transition-all hover:border-slate-300">
      <p class="text-3xl font-black" style="color:{s.color}; font-family:'Plus Jakarta Sans',sans-serif;">{s.val}</p>
      <p class="text-[11px] font-extrabold text-slate-400 mt-1">{s.label}</p>
    </div>
  {/each}
</div>
