<script lang="ts">
  import type { Profile, Task, TaskAssignment } from '$lib/components/admin/_types'
  import { STATUS_LABEL, STATUS_STYLE, PRIORITY_DOT, getInitials, formatDate } from '$lib/components/admin/_utils'
  import { Search, Eye, Trash2, ClipboardList, Bell } from 'lucide-svelte'

  interface Props {
    allTasks: Task[]
    allUsers: Profile[]
    allAssignments: TaskAssignment[]
    onDeleteTask: (t: Task) => void
    onViewTask: (t: Task) => void
    onRemindTask: (t: Task) => void
  }
  let { allTasks, allUsers, allAssignments, onDeleteTask, onViewTask, onRemindTask } = $props<Props>()

  const ITEMS_PER_PAGE = 15
  let taskSearch     = $state('')
  let taskFilter     = $state<'all' | 'overdue' | 'high_priority' | Task['status']>('all')
  let taskUserFilter = $state('all')
  let page           = $state(1)

  let filtered = $derived(allTasks.filter(t => {
    const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase())
    let matchFilter = false
    if (taskFilter === 'all')               matchFilter = true
    else if (taskFilter === 'overdue')      matchFilter = !!t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
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
  function isOverdue(t: Task) { return !!t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' }

  // Custom Dropdown State
  let isUserDropdownOpen = $state(false)
  let userDropdownSearch = $state('')

  let filteredUsersForDropdown = $derived(allUsers.filter(u => 
    !userDropdownSearch || u.full_name.toLowerCase().includes(userDropdownSearch.toLowerCase())
  ))

  function handleBodyClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.custom-user-dropdown')) {
      isUserDropdownOpen = false;
    }
  }
</script>

<svelte:window onclick={handleBodyClick} />

<div class="flex flex-col gap-6">

  <!-- Search + User filter dalam 1 baris -->
  <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
    <div class="relative flex-1">
      <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={taskSearch} placeholder="Cari tugas..."
             class="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 text-sm font-bold bg-white text-slate-700 focus:outline-none focus:border-orange-500 transition-all shadow-xs" />
    </div>
    <!-- Custom Searchable Dropdown -->
    <div class="relative flex-shrink-0 custom-user-dropdown md:w-56">
      <button onclick={() => isUserDropdownOpen = !isUserDropdownOpen}
              class="w-full flex items-center justify-between gap-2 text-sm px-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 focus:outline-none focus:border-orange-500 transition-all shadow-xs active:translate-y-0.5 active:border-b-[2px] cursor-pointer">
        <span class="truncate">{taskUserFilter === 'all' ? 'Semua User' : getUserName(taskUserFilter).split(' ')[0]}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {#if isUserDropdownOpen}
        <div class="absolute right-0 top-full mt-2 w-full md:w-64 bg-white rounded-2xl border-2 border-b-[6px] border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col font-bold">
          <div class="p-3 border-b border-slate-100 bg-slate-50">
            <div class="relative">
              <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input bind:value={userDropdownSearch} placeholder="Cari nama..."
                     class="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 font-bold focus:outline-none focus:border-orange-400 transition-all" />
            </div>
          </div>
          <div class="max-h-56 overflow-y-auto no-scrollbar p-1.5">
            <button onclick={() => { taskUserFilter = 'all'; isUserDropdownOpen = false; userDropdownSearch = '' }}
                    class="w-full text-left px-4 py-3 text-xs rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-between font-bold cursor-pointer"
                    class:bg-orange-50={taskUserFilter === 'all'} class:text-orange-600={taskUserFilter === 'all'} class:text-slate-700={taskUserFilter !== 'all'}>
              <span>Semua User</span>
              {#if taskUserFilter === 'all'}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><path d="M20 6 9 17l-5-5"/></svg>{/if}
            </button>
            {#each filteredUsersForDropdown as u}
              <button onclick={() => { taskUserFilter = u.id; isUserDropdownOpen = false; userDropdownSearch = '' }}
                      class="w-full text-left px-4 py-3 text-xs rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-between font-bold cursor-pointer"
                      class:bg-orange-50={taskUserFilter === u.id} class:text-orange-600={taskUserFilter === u.id} class:text-slate-600={taskUserFilter !== u.id}>
                <span class="truncate">{u.full_name}</span>
                {#if taskUserFilter === u.id}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><path d="M20 6 9 17l-5-5"/></svg>{/if}
              </button>
            {/each}
            {#if filteredUsersForDropdown.length === 0}
               <div class="px-3 py-6 text-center text-xs text-slate-400 font-bold">Nama tidak ditemukan</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Status filter: pill tabs -->
  <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 px-1">
    {#each [
      { val: 'all',           label: 'Semua'    },
      { val: 'overdue',       label: 'Overdue'  },
      { val: 'high_priority', label: 'Prioritas' },
      { val: 'not_started',   label: 'Belum'    },
      { val: 'in_progress',   label: 'Dikerjakan'},
      { val: 'review',        label: 'Review'   },
      { val: 'revision',      label: 'Revisi'   },
      { val: 'done',          label: 'Selesai'  },
    ] as f}
      <button onclick={() => taskFilter = f.val as any}
              class="px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex-shrink-0 cursor-pointer active:translate-y-0.5 border-2 {taskFilter === f.val ? 'bg-orange-100 text-orange-600 border-b-[4px] border-orange-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}"
              style="font-family:'Plus Jakarta Sans',sans-serif;">
        {f.label}
      </button>
    {/each}
  </div>

  <!-- Count -->
  <p class="text-xs font-black text-slate-400 px-1">{filtered.length} tugas ditemukan</p>

  <!-- Task List -->
  {#if filtered.length === 0}
    <div class="py-20 text-center bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-8 shadow-xs">
      <ClipboardList size={36} class="text-slate-300 mx-auto mb-3" />
      <p class="text-sm font-black text-slate-500">Tidak ada tugas ditemukan</p>
    </div>
  {:else}
      <div class="bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 shadow-xs">
        {#each paginated as task}
        {@const ss = STATUS_STYLE[task.status]}
        {@const assignees = getAssignees(task.id)}
        {@const overdue = isOverdue(task)}
        <div class="task-row group flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
             onclick={() => onViewTask(task)}>

          <!-- Priority vertical pill -->
          <div class="w-3 h-12 rounded-full flex-shrink-0 shadow-inner" style="background:{PRIORITY_DOT[task.priority]}"></div>

          <!-- Main content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5">
              <p class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{task.title}</p>
              {#if overdue}
                <span class="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full flex-shrink-0 border border-red-600 shadow-xs uppercase tracking-wider">Overdue</span>
              {/if}
            </div>
            <p class="text-xs font-bold text-slate-400 mt-1 truncate">
              <span class="text-slate-600">{getUserName(task.created_by)}</span>
              {#if task.due_date} <span class="mx-1 text-slate-300">·</span> <span class="text-orange-500">{formatDate(task.due_date)}</span>{/if}
              {#if assignees.length > 0} <span class="mx-1 text-slate-300">·</span> {assignees.slice(0,2).map(a => a.full_name.split(' ')[0]).join(', ')}{assignees.length > 2 ? ` +${assignees.length-2}` : ''}{/if}
            </p>
            {#if task.progress > 0}
              <div class="mt-2.5 h-2 bg-slate-100 rounded-full overflow-hidden w-28 p-0.5 border border-slate-200/50 shadow-inner">
                <div class="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all" style="width:{task.progress}%"></div>
              </div>
            {/if}
          </div>

          <!-- Status badge -->
          <span class="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 {ss.bg} {ss.text} border border-slate-200/50 uppercase tracking-wider">
            {STATUS_LABEL[task.status]}
          </span>

          <!-- Action buttons -->
          <div class="flex gap-1.5 flex-shrink-0">
            <button onclick={e => { e.stopPropagation(); onViewTask(task) }}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] border-slate-200 bg-white hover:border-orange-500 flex items-center justify-center text-slate-500 hover:text-orange-600 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer" title="Detail">
              <Eye size={16} />
            </button>
            <button onclick={e => { e.stopPropagation(); onRemindTask(task) }}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] border-slate-200 bg-white hover:border-amber-500 flex items-center justify-center text-slate-500 hover:text-amber-600 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer" title="Kirim Pengingat">
              <Bell size={16} />
            </button>
            <button onclick={e => { e.stopPropagation(); onDeleteTask(task) }}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] border-slate-200 bg-white hover:border-red-500 flex items-center justify-center text-slate-500 hover:text-red-500 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex items-center justify-between pt-2 px-1">
      <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
              class="text-xs font-black px-4 py-2.5 rounded-2xl bg-white border-2 border-b-[4px] border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
        ← Sebelumnya
      </button>
      <span class="text-xs font-black text-slate-500 px-4 py-2 bg-white rounded-2xl border-2 border-slate-200">{page} / {totalPages}</span>
      <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
              class="text-xs font-black px-4 py-2.5 rounded-2xl bg-white border-2 border-b-[4px] border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
        Berikutnya →
      </button>
    </div>
  {/if}

</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
