<script lang="ts">
  import { fade } from 'svelte/transition'

  interface Task { 
    id: string; 
    title: string; 
    status: string; 
    priority: string; 
    due_date: string | null 
  }

  interface Props {
    tasks: Task[]
    onTaskClick: (task: Task) => void
  }

  let { tasks, onTaskClick }: Props = $props()

  let currentDate = $state(new Date())
  let currentMonth = $derived(currentDate.getMonth())
  let currentYear = $derived(currentDate.getFullYear())

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  function getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(month: number, year: number) {
    return new Date(year, month, 1).getDay()
  }

  let calendarDays = $derived.by(() => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Padding from previous month
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear)
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: currentMonth - 1,
        year: currentYear,
        isCurrentMonth: false,
        dateStr: new Date(currentYear, currentMonth - 1, prevMonthDays - i).toISOString().split('T')[0]
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateStr: new Date(currentYear, currentMonth, i).toISOString().split('T')[0]
      })
    }

    // Padding from next month
    const remaining = 42 - days.length // 6 rows
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: currentMonth + 1,
        year: currentYear,
        isCurrentMonth: false,
        dateStr: new Date(currentYear, currentMonth + 1, i).toISOString().split('T')[0]
      })
    }

    return days
  })

  function changeMonth(delta: number) {
    const next = new Date(currentYear, currentMonth + delta, 1)
    currentDate = next
  }

  function getTasksForDate(dateStr: string) {
    return tasks.filter(t => t.due_date?.startsWith(dateStr))
  }

  function isToday(dateStr: string) {
    return new Date().toISOString().split('T')[0] === dateStr
  }

  const PRIORITY_COLOR: Record<string, string> = {
    low: 'bg-slate-400',
    medium: 'bg-amber-500',
    high: 'bg-red-500'
  }

  let selectedDate = $state<string | null>(null)
  let selectedTasks = $derived(selectedDate ? getTasksForDate(selectedDate) : [])

  function openDayFocus(dateStr: string) {
    const dayTasks = getTasksForDate(dateStr)
    if (dayTasks.length > 0) {
      selectedDate = dateStr
    }
  }

  function closeDayFocus() {
    selectedDate = null
  }

  function formatDateLong(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  }
</script>

<div class="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden" transition:fade>
  <!-- Calendar Header -->
  <div class="px-5 py-4 flex items-center justify-between border-b border-orange-50 bg-orange-50/30">
    <div class="flex flex-col">
      <h3 class="font-bold text-slate-800 text-lg leading-none" style="font-family:'Plus Jakarta Sans',sans-serif;">
        {MONTH_NAMES[currentMonth]}
      </h3>
      <span class="text-xs text-slate-500 font-medium mt-1">{currentYear}</span>
    </div>
    <div class="flex items-center gap-1">
      <button onclick={() => changeMonth(-1)} class="p-2 hover:bg-white rounded-lg transition-colors text-slate-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button onclick={() => currentDate = new Date()} class="px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-white rounded-lg transition-colors">
        Hari Ini
      </button>
      <button onclick={() => changeMonth(1)} class="p-2 hover:bg-white rounded-lg transition-colors text-slate-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  </div>

  <!-- Day Labels -->
  <div class="grid grid-cols-7 border-b border-orange-50">
    {#each DAY_NAMES as day}
      <div class="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {day}
      </div>
    {/each}
  </div>

  <!-- Calendar Grid -->
  <div class="grid grid-cols-7 grid-rows-6">
    {#each calendarDays as { day, dateStr, isCurrentMonth }}
      {@const dayTasks = getTasksForDate(dateStr)}
      {@const today = isToday(dateStr)}
      <button onclick={() => openDayFocus(dateStr)}
              class="min-h-[80px] sm:min-h-[110px] border-r border-b border-orange-50 p-1.5 transition-all text-left outline-none
                     {!isCurrentMonth ? 'bg-slate-50/50' : 'bg-white hover:bg-orange-50/20'} 
                     {today ? 'ring-inset ring-2 ring-orange-500/20' : ''}
                     {dayTasks.length > 0 ? 'cursor-pointer' : 'cursor-default'}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold {today ? 'w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center' : (isCurrentMonth ? 'text-slate-700' : 'text-slate-300')}">
            {day}
          </span>
          {#if dayTasks.length > 0}
            <span class="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
              {dayTasks.length}
            </span>
          {/if}
        </div>
        
        <div class="flex flex-col gap-1 overflow-hidden">
          {#each dayTasks.slice(0, 2) as task}
            <div class="px-1.5 py-0.5 rounded-md text-[9px] font-medium truncate 
                           {task.status === 'done' ? 'bg-green-50 text-green-700 opacity-60' : 'bg-slate-100 text-slate-700'}">
              <div class="flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 {PRIORITY_COLOR[task.priority]}"></div>
                <span class="truncate">{task.title}</span>
              </div>
            </div>
          {/each}
          {#if dayTasks.length > 2}
            <div class="text-[9px] font-bold text-slate-400 pl-1 mt-0.5">
              + {dayTasks.length - 2} lainnya
            </div>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>

<!-- Day Focus Modal -->
{#if selectedDate}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" 
       transition:fade={{ duration: 200 }}
       onclick={closeDayFocus}>
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" 
         onclick={(e) => e.stopPropagation()}>
      <div class="px-6 py-5 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between">
        <div>
          <h4 class="font-bold text-slate-800 text-lg leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Tugas Hari Ini
          </h4>
          <p class="text-xs text-slate-500 font-medium mt-0.5">{formatDateLong(selectedDate)}</p>
        </div>
        <button onclick={closeDayFocus} class="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
          ✕
        </button>
      </div>
      
      <div class="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {#each selectedTasks as task}
          <button onclick={() => { onTaskClick(task); closeDayFocus(); }}
                  class="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left group">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 {PRIORITY_COLOR[task.priority]}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-slate-800 truncate group-hover:text-orange-700">{task.title}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 uppercase font-bold tracking-tight">
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <svg class="w-4 h-4 text-slate-300 group-hover:text-orange-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
