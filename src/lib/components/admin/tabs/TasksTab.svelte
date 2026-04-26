<script lang="ts">
  import type { Profile, Task, TaskAssignment } from '$lib/components/admin/_types'
  import { STATUS_LABEL, STATUS_STYLE, PRIORITY_DOT, getInitials, formatDate } from '$lib/components/admin/_utils'
  import { Search, Eye, Trash2, ClipboardList } from 'lucide-svelte'

  interface Props {
    allTasks: Task[]
    allUsers: Profile[]
    allAssignments: TaskAssignment[]
    onDeleteTask: (t: Task) => void
    onViewTask: (t: Task) => void
  }
  let { allTasks, allUsers, allAssignments, onDeleteTask, onViewTask } = $props<Props>()

  const ITEMS_PER_PAGE = 10
  let taskSearch     = $state('')
  let taskFilter     = $state<'all' | 'overdue' | 'high_priority' | Task['status']>('all')
  let taskUserFilter = $state('all')
  let page           = $state(1)

  let filtered = $derived(allTasks.filter(t => {
    const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase())
    let matchFilter = false
    if (taskFilter === 'all')           matchFilter = true
    else if (taskFilter === 'overdue')  matchFilter = !!t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
    else if (taskFilter === 'high_priority') matchFilter = t.priority === 'high'
    else matchFilter = t.status === taskFilter
    const matchUser = taskUserFilter === 'all' ||
      t.created_by === taskUserFilter ||
      allAssignments.some(a => a.task_id === t.id && a.user_id === taskUserFilter && a.status !== 'rejected')
    return matchSearch && matchFilter && matchUser
  }))

  let paginated  = $derived(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE))
  let totalPages = $derived(Math.ceil(filtered.length / ITEMS_PER_PAGE))

  $effect(() => { taskSearch; taskFilter; taskUserFilter; page = 1 })

  function getAssignees(taskId: string): Profile[] {
    return allAssignments
      .filter(a => a.task_id === taskId && a.status !== 'rejected')
      .map(a => allUsers.find(u => u.id === a.user_id))
      .filter(Boolean) as Profile[]
  }
  function getUserName(uid: string) { return allUsers.find(u => u.id === uid)?.full_name || 'Unknown' }
</script>

<div class="flex flex-col gap-3">
  <!-- Search -->
  <div class="relative">
    <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input bind:value={taskSearch} placeholder="Cari judul tugas..."
           class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </div>

  <!-- User filter chips -->
  <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
    {#each [{ id: 'all', label: 'Semua User' }, ...allUsers.map(u => ({ id: u.id, label: u.full_name.split(' ')[0] }))] as u}
      <button onclick={() => taskUserFilter = taskUserFilter === u.id ? 'all' : u.id}
              class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
              class:text-white={taskUserFilter === u.id}
              class:bg-slate-100={taskUserFilter !== u.id} class:text-slate-500={taskUserFilter !== u.id}
              style={taskUserFilter === u.id ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
        {u.label}
      </button>
    {/each}
  </div>

  <!-- Status filter chips -->
  <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
    {#each [
      { val: 'all', label: 'Semua' }, { val: 'overdue', label: '🔴 Overdue' },
      { val: 'high_priority', label: '🔥 Prioritas Tinggi' },
      { val: 'not_started', label: 'Belum' }, { val: 'in_progress', label: 'Dikerjakan' },
      { val: 'review', label: 'Review' }, { val: 'revision', label: 'Revisi' }, { val: 'done', label: 'Selesai' },
    ] as f}
      <button onclick={() => taskFilter = f.val as any}
              class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
              class:text-white={taskFilter === f.val}
              class:bg-slate-100={taskFilter !== f.val} class:text-slate-500={taskFilter !== f.val}
              style={taskFilter === f.val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
        {f.label}
      </button>
    {/each}
  </div>

  <!-- Task List -->
  <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-100">
      <span class="text-xs font-bold text-slate-500">{filtered.length} tugas</span>
    </div>
    {#if filtered.length === 0}
      <div class="py-12 text-center">
        <ClipboardList size={28} class="text-slate-200 mx-auto mb-2" />
        <p class="text-xs text-slate-400">Tidak ada tugas ditemukan</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {#each paginated as task}
          {@const ss = STATUS_STYLE[task.status]}
          {@const assignees = getAssignees(task.id)}
          <div class="px-4 py-3.5 border-b border-slate-50 hover:bg-orange-50/30 transition-colors cursor-pointer"
               onclick={() => onViewTask(task)}>
            <div class="flex items-start gap-2.5">
              <div class="w-1.5 h-5 rounded-full mt-0.5 flex-shrink-0" style="background:{PRIORITY_DOT[task.priority]}"></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold text-slate-800 leading-snug">{task.title}</p>
                  <span class="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 {ss.bg} {ss.text}">{STATUS_LABEL[task.status]}</span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[10px] text-slate-400">Oleh: {getUserName(task.created_by)}</span>
                  {#if task.due_date}<span class="text-[10px] text-slate-400">· {formatDate(task.due_date)}</span>{/if}
                </div>
                {#if assignees.length > 0}
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    Dikerjakan: {assignees.slice(0,2).map(a => a.full_name.split(' ')[0]).join(', ')}{assignees.length > 2 ? ` +${assignees.length-2}` : ''}
                  </p>
                {/if}
                {#if task.progress > 0}
                  <div class="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" style="width:{task.progress}%; background:linear-gradient(90deg,#F97316,#FBBF24)"></div>
                  </div>
                {/if}
              </div>
              <div class="flex flex-col gap-1">
                <button onclick={e => { e.stopPropagation(); onViewTask(task) }}
                        class="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 cursor-pointer" title="Detail">
                  <Eye size={12} />
                </button>
                <button onclick={e => { e.stopPropagation(); onDeleteTask(task) }}
                        class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 cursor-pointer">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if totalPages > 1}
      <div class="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Prev</button>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Halaman {page} / {totalPages}</span>
        <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Next</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
