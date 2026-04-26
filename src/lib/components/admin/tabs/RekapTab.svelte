<script lang="ts">
  import type { Profile, Task, TaskAssignment, AttendanceRecord, Holiday } from '$lib/components/admin/_types'
  import { STATUS_LABEL, STATUS_STYLE, PRIORITY_DOT, PRIORITY_LABEL, getInitials, formatDate, getMonthlyAttendanceStat, getUserPerformanceStats } from '$lib/components/admin/_utils'
  import type { RekapSubTab } from '$lib/components/admin/_types'
  import { AlertTriangle, CheckCircle2, Target, Users, ClipboardList, Calendar } from 'lucide-svelte'

  interface Props {
    allUsers: Profile[]
    allTasks: Task[]
    allAssignments: TaskAssignment[]
    allAttendance: AttendanceRecord[]
    holidays: Holiday[]
  }
  let { allUsers, allTasks, allAssignments, allAttendance, holidays } = $props<Props>()

  let sub = $state<RekapSubTab>('tasks')
  const currentMonth = new Date().toISOString().slice(0, 7)

  // ── Rekap Tugas ──────────────────────────────────────────────────────────
  let totalTasks  = $derived(allTasks.length)
  let byStatus    = $derived(
    Object.keys(STATUS_LABEL).map(s => ({
      key: s, label: STATUS_LABEL[s],
      count: allTasks.filter(t => t.status === s).length,
      pct: totalTasks > 0 ? Math.round((allTasks.filter(t => t.status === s).length / totalTasks) * 100) : 0,
      ...STATUS_STYLE[s]
    }))
  )
  let overdueTasks = $derived(allTasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()))
  let doneTasks    = $derived(allTasks.filter(t => t.status === 'done').length)
  let completionRate = $derived(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0)

  // Top performers by task completion
  let topPerformers = $derived(
    allUsers
      .map(u => ({ user: u, ...getUserPerformanceStats(u.id, allTasks, allAssignments) }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
  )

  // ── Rekap Kehadiran ───────────────────────────────────────────────────────
  let attendStats = $derived(
    allUsers.map(u => ({
      user: u,
      ...getMonthlyAttendanceStat(u.id, currentMonth, allAttendance, holidays)
    })).sort((a, b) => b.presentRate - a.presentRate)
  )

  // ── Rekap Pengguna ────────────────────────────────────────────────────────
  let userStats = $derived(
    allUsers.map(u => ({
      user: u,
      task: getUserPerformanceStats(u.id, allTasks, allAssignments),
      att: getMonthlyAttendanceStat(u.id, currentMonth, allAttendance, holidays),
    }))
  )
</script>

<div class="flex flex-col gap-4">
  <!-- Sub-tab pills -->
  <div class="flex gap-2 bg-slate-100 rounded-xl p-1">
    {#each [
      { id: 'tasks', label: '✅ Rekap Tugas' },
      { id: 'attendance', label: '🕐 Rekap Kehadiran' },
      { id: 'users', label: '👥 Rekap Pengguna' },
    ] as s}
      <button onclick={() => sub = s.id as RekapSubTab}
              class="flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              class:text-white={sub === s.id} class:bg-slate-100={sub !== s.id} class:text-slate-500={sub !== s.id}
              style={sub === s.id ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent'}>
        {s.label}
      </button>
    {/each}
  </div>

  <!-- ── REKAP TUGAS ── -->
  {#if sub === 'tasks'}
    <!-- Summary cards -->
    <div class="grid grid-cols-3 gap-3">
      {#each [
        { label: 'Total Tugas',    val: totalTasks,    color: '#F97316' },
        { label: 'Selesai',        val: doneTasks,     color: '#22C55E' },
        { label: 'Overdue',        val: overdueTasks.length, color: '#EF4444' },
      ] as c}
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <p class="text-2xl font-black" style="color:{c.color}; font-family:'Plus Jakarta Sans',sans-serif;">{c.val}</p>
          <p class="text-[10px] text-slate-400 mt-0.5 font-semibold">{c.label}</p>
        </div>
      {/each}
    </div>

    <!-- Status breakdown CSS bar chart -->
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div class="flex items-center gap-2 mb-4">
        <Target size={15} class="text-orange-500" />
        <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Breakdown Status</p>
      </div>
      <div class="flex flex-col gap-3">
        {#each byStatus as s}
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-slate-600">{s.label}</span>
              <span class="text-xs font-bold text-slate-500">{s.count} ({s.pct}%)</span>
            </div>
            <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700 {s.bg}" style="width:{s.pct}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Top Performers -->
    {#if topPerformers.length > 0}
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">🏆 Top Performer</p>
        <div class="flex flex-col gap-2">
          {#each topPerformers as p, i}
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                   style="background:{i===0?'linear-gradient(135deg,#FBBF24,#F59E0B)':i===1?'linear-gradient(135deg,#94A3B8,#64748B)':'linear-gradient(135deg,#FB923C,#EA580C)'}; color:white">
                {i+1}
              </div>
              <div class="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white overflow-hidden flex-shrink-0"
                   style="background:linear-gradient(135deg,#F97316,#EA580C)">
                {#if p.user.avatar_url}<img src={p.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(p.user.full_name)}{/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-700 truncate">{p.user.full_name}</p>
                <p class="text-[10px] text-slate-400">{p.done}/{p.total} tugas selesai</p>
              </div>
              <span class="text-sm font-black text-orange-500">{p.completionRate}%</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Overdue list -->
    {#if overdueTasks.length > 0}
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-red-50 bg-red-50 flex items-center gap-2">
          <AlertTriangle size={13} class="text-red-500" />
          <p class="text-xs font-bold text-red-600">{overdueTasks.length} Tugas Melewati Deadline</p>
        </div>
        {#each overdueTasks.slice(0, 8) as task}
          {@const ss = STATUS_STYLE[task.status]}
          <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
            <div class="w-1.5 h-5 rounded-full flex-shrink-0" style="background:{PRIORITY_DOT[task.priority]}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-700 truncate">{task.title}</p>
              <p class="text-[10px] text-red-500 font-medium">Deadline: {formatDate(task.due_date)}</p>
            </div>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full {ss.bg} {ss.text}">{STATUS_LABEL[task.status]}</span>
          </div>
        {/each}
      </div>
    {/if}

  <!-- ── REKAP KEHADIRAN ── -->
  {:else if sub === 'attendance'}
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bulan</p>
      <p class="text-sm font-bold text-slate-700">
        {new Date(currentMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
      </p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="grid grid-cols-[1fr_auto_auto_auto] px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengguna</span>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-16">Hadir</span>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-16">Telat</span>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-16">Rate</span>
      </div>
      {#each attendStats as s}
        <div class="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white overflow-hidden"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if s.user.avatar_url}<img src={s.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(s.user.full_name)}{/if}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-700 truncate">{s.user.full_name}</p>
              <p class="text-[9px] text-slate-400">{s.user.position || 'Karyawan'}</p>
            </div>
          </div>
          <span class="text-sm font-bold text-slate-700 text-center w-16">{s.totalPresentDays}<span class="text-[9px] text-slate-400">/{s.totalWorkingDays}</span></span>
          <span class="text-sm font-bold text-center w-16 {s.totalLate > 0 ? 'text-red-500' : 'text-slate-300'}">{s.totalLate}</span>
          <div class="w-16 flex flex-col items-center">
            <span class="text-xs font-black {s.presentRate>=80?'text-green-500':s.presentRate>=50?'text-amber-500':'text-red-500'}">{s.presentRate}%</span>
            <div class="w-10 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
              <div class="h-full rounded-full" style="width:{Math.min(s.presentRate,100)}%; background:{s.presentRate>=80?'#22C55E':s.presentRate>=50?'#F59E0B':'#EF4444'}"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>

  <!-- ── REKAP PENGGUNA ── -->
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      {#each userStats as s}
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <!-- Header -->
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if s.user.avatar_url}<img src={s.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(s.user.full_name)}{/if}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-bold text-slate-800 truncate">{s.user.full_name}</p>
                {#if s.user.role === 'admin'}
                  <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 flex-shrink-0">ADMIN</span>
                {/if}
              </div>
              <p class="text-[10px] text-slate-400">{s.user.position || 'Karyawan'}</p>
            </div>
          </div>
          <!-- Stats row -->
          <div class="grid grid-cols-3 gap-2">
            <div class="text-center bg-slate-50 rounded-xl py-2">
              <p class="text-lg font-black text-orange-500">{s.task.completionRate}%</p>
              <p class="text-[9px] text-slate-400 font-medium">Task Done</p>
            </div>
            <div class="text-center bg-slate-50 rounded-xl py-2">
              <p class="text-lg font-black {s.att.presentRate>=80?'text-green-500':s.att.presentRate>=50?'text-amber-500':'text-red-500'}">{s.att.presentRate}%</p>
              <p class="text-[9px] text-slate-400 font-medium">Hadir</p>
            </div>
            <div class="text-center bg-slate-50 rounded-xl py-2">
              <p class="text-lg font-black {s.task.overdue>0?'text-red-500':'text-slate-300'}">{s.task.overdue}</p>
              <p class="text-[9px] text-slate-400 font-medium">Overdue</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
