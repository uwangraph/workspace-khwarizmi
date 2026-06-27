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

<section class="flex flex-col gap-3">
  <div class="flex justify-between items-center px-1">
    <h3 class="text-lg font-black text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Tugas Utama</h3>
    <a href="/tasks" class="text-xs font-extrabold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
      Manajemen <ArrowRight size={14} strokeWidth={2.5} />
    </a>
  </div>
  {#if recentTasks.length === 0}
    <div class="bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-8 text-center">
      <CheckCircle2 size={40} strokeWidth={2.5} class="text-emerald-400 mx-auto mb-3" />
      <p class="text-sm font-extrabold text-slate-500">Tidak ada tugas mendesak</p>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      {#each recentTasks as task}
        {@const due = formatDue(task.due_date)}
        <a href="/tasks" class="block bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-5 hover:border-slate-300 active:translate-y-0.5 active:border-b-[3px] transition-all cursor-pointer">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-10 rounded-full flex-shrink-0" style="background: {priorityDot[task.priority]}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-base font-extrabold text-slate-800 truncate">{task.title}</p>
              <div class="flex items-center flex-wrap gap-2 mt-2">
                <span class="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600">{statusLabel[task.status]}</span>
                {#if due}
                  <span class="text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-xl {due.urgent ? 'bg-red-50' : 'bg-amber-50'}" style="color: {due.color}">
                    <Clock size={12} strokeWidth={2.5} /> {due.label}
                  </span>
                {/if}
              </div>
            </div>
            {#if task.progress > 0}
              <span class="inline-block text-xs font-black bg-orange-100 text-orange-600 px-3 py-1.5 rounded-xl flex-shrink-0">
                {task.progress}%
              </span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
