<script lang="ts">
  import { ArrowRight, CheckCircle2, Clock } from 'lucide-svelte'
  interface Task {
    id: string; title: string; status: string; priority: string; progress: number; due_date: string | null
  }
  interface Props {
    recentTasks: Task[]
    formatDue: (iso: string | null) => { label: string; color: string; urgent: boolean } | null
    statusLabel: Record<string, string>
    priorityDot: Record<string, string>
  }
  let { recentTasks, formatDue, statusLabel, priorityDot }: Props = $props()
</script>
<section class="flex flex-col gap-2">
  <div class="flex justify-between items-center px-1">
    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tugas Utama</p>
    <a href="/tasks" class="text-[10px] font-bold text-green-600 flex items-center gap-1 cursor-pointer hover:text-green-700 transition-colors">
      Manajemen Task <ArrowRight size={12} />
    </a>
  </div>
  {#if recentTasks.length === 0}
    <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
      <CheckCircle2 size={32} class="text-green-200 mx-auto mb-2" />
      <p class="text-xs font-semibold text-slate-400">Tidak ada tugas mendesak</p>
    </div>
  {:else}
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
      {#each recentTasks as task}
        {@const due = formatDue(task.due_date)}
        <a href="/tasks" class="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
          <div class="w-1.5 h-6 rounded-full" style="background: {priorityDot[task.priority]}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-[9px] font-medium text-slate-400">{statusLabel[task.status]}</span>
              {#if due}
                <span class="text-[9px] font-bold flex items-center gap-1" style="color: {due.color}">
                  <Clock size={10} /> {due.label}
                </span>
              {/if}
            </div>
          </div>
          {#if task.progress > 0}
            <span class="text-[10px] font-bold text-orange-500">{task.progress}%</span>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</section>
