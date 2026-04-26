<script lang="ts">
  interface Props {
    totalTasks: number
    doneTasks: number
    attendanceDays: number
  }
  let { totalTasks, doneTasks, attendanceDays }: Props = $props()
  let stats = $derived([
    { label: 'Total Tugas',   val: totalTasks,     color: '#F97316' },
    { label: 'Diselesaikan',  val: doneTasks,       color: '#16A34A' },
    { label: 'Hari Hadir',    val: attendanceDays,  color: '#2563EB' },
  ])
</script>

<div class="grid grid-cols-3 gap-3">
  {#each stats as s}
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 text-center">
      <p class="text-2xl font-black" style="color:{s.color}; font-family:'Plus Jakarta Sans',sans-serif;">{s.val}</p>
      <p class="text-[10px] font-semibold text-slate-400 mt-1">{s.label}</p>
    </div>
  {/each}
</div>
