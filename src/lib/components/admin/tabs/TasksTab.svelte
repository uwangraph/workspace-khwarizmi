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

<div class="flex flex-col gap-4">

  <!-- Search + User filter dalam 1 baris -->
  <div class="flex gap-2 items-center">
    <div class="relative flex-1">
      <Search size={13} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={taskSearch} placeholder="Cari tugas..."
             class="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200 transition-all" />
    </div>
    <!-- Custom Searchable Dropdown -->
    <div class="relative flex-shrink-0 custom-user-dropdown">
      <button onclick={() => isUserDropdownOpen = !isUserDropdownOpen}
              class="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-orange-300 transition-all min-w-[130px] justify-between">
        <span class="truncate">{taskUserFilter === 'all' ? 'Semua User' : getUserName(taskUserFilter).split(' ')[0]}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {#if isUserDropdownOpen}
        <div class="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden flex flex-col">
          <div class="p-2 border-b border-slate-50">
            <div class="relative">
              <Search size={12} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input bind:value={userDropdownSearch} placeholder="Cari nama..."
                     class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border-none text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-200 transition-all" />
            </div>
          </div>
          <div class="max-h-48 overflow-y-auto no-scrollbar p-1">
            <button onclick={() => { taskUserFilter = 'all'; isUserDropdownOpen = false; userDropdownSearch = '' }}
                    class="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-between"
                    class:bg-orange-50={taskUserFilter === 'all'} class:text-orange-600={taskUserFilter === 'all'}>
              <span>Semua User</span>
              {#if taskUserFilter === 'all'}<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>{/if}
            </button>
            {#each filteredUsersForDropdown as u}
              <button onclick={() => { taskUserFilter = u.id; isUserDropdownOpen = false; userDropdownSearch = '' }}
                      class="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-between"
                      class:bg-orange-50={taskUserFilter === u.id} class:text-orange-600={taskUserFilter === u.id} class:text-slate-600={taskUserFilter !== u.id}>
                <span class="truncate">{u.full_name}</span>
                {#if taskUserFilter === u.id}<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>{/if}
              </button>
            {/each}
            {#if filteredUsersForDropdown.length === 0}
               <div class="px-3 py-4 text-center text-xs text-slate-400">Nama tidak ditemukan</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Status filter: pill tabs -->
  <div class="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 pb-0">
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
              class="text-[11px] px-3 py-2 font-medium whitespace-nowrap transition-all cursor-pointer flex-shrink-0 border-b-2 -mb-px"
              class:border-orange-500={taskFilter === f.val}
              class:text-orange-600={taskFilter === f.val}
              class:border-transparent={taskFilter !== f.val}
              class:text-slate-400={taskFilter !== f.val}>
        {f.label}
      </button>
    {/each}
  </div>

  <!-- Count -->
  <p class="text-[11px] text-slate-400">{filtered.length} tugas ditemukan</p>

  <!-- Task List -->
  {#if filtered.length === 0}
    <div class="py-16 text-center bg-white rounded-xl border border-slate-100">
      <ClipboardList size={24} class="text-slate-200 mx-auto mb-2" />
      <p class="text-xs text-slate-400">Tidak ada tugas ditemukan</p>
    </div>
  {:else}
      <div class="bg-white rounded-xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {#each paginated as task}
        {@const ss = STATUS_STYLE[task.status]}
        {@const assignees = getAssignees(task.id)}
        {@const overdue = isOverdue(task)}
        <div class="task-row group flex items-center gap-3 px-4 py-3 border-b border-r-0 md:odd:border-r border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer"
             onclick={() => onViewTask(task)}>

          <!-- Priority dot -->
          <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px" style="background:{PRIORITY_DOT[task.priority]}"></div>

          <!-- Main content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-slate-800 truncate">{task.title}</p>
              {#if overdue}
                <span class="text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">Overdue</span>
              {/if}
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5">
              {getUserName(task.created_by)}
              {#if task.due_date} · {formatDate(task.due_date)}{/if}
              {#if assignees.length > 0} · {assignees.slice(0,2).map(a => a.full_name.split(' ')[0]).join(', ')}{assignees.length > 2 ? ` +${assignees.length-2}` : ''}{/if}
            </p>
            {#if task.progress > 0}
              <div class="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden w-24">
                <div class="h-full rounded-full bg-orange-400 transition-all" style="width:{task.progress}%"></div>
              </div>
            {/if}
          </div>

          <!-- Status badge -->
          <span class="text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 {ss.bg} {ss.text}">
            {STATUS_LABEL[task.status]}
          </span>

          <!-- Action buttons -->
          <div class="flex gap-1 flex-shrink-0">
            <button onclick={e => { e.stopPropagation(); onViewTask(task) }}
                    class="w-7 h-7 rounded-lg hover:bg-orange-50 flex items-center justify-center text-slate-400 hover:text-orange-500 cursor-pointer transition-colors" title="Detail">
              <Eye size={13} />
            </button>
            <button onclick={e => { e.stopPropagation(); onRemindTask(task) }}
                    class="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-slate-400 hover:text-amber-500 cursor-pointer transition-colors" title="Kirim Pengingat">
              <Bell size={13} />
            </button>
            <button onclick={e => { e.stopPropagation(); onDeleteTask(task) }}
                    class="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex items-center justify-between">
      <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
              class="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 cursor-pointer transition-colors">
        ← Sebelumnya
      </button>
      <span class="text-[11px] text-slate-400">{page} / {totalPages}</span>
      <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
              class="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 cursor-pointer transition-colors">
        Berikutnya →
      </button>
    </div>
  {/if}

</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
