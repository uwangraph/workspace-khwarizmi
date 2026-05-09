<script lang="ts">
  import { X } from 'lucide-svelte'
  import { STATUS_LABEL, STATUS_STYLE, PRIORITY_DOT, PRIORITY_LABEL, getInitials, formatDate, getUserPerformanceStats } from '$lib/components/admin/_utils'
  import type { Task, Profile, TaskAssignment, AttendanceRecord, Holiday } from '$lib/components/admin/_types'
  import { getMonthlyAttendanceStat } from '$lib/components/admin/_utils'
  import { Activity, AlertTriangle, CheckCircle2, Clock, PieChart, UserCheck } from 'lucide-svelte'

  interface Props {
    user: Profile
    tasks: Task[]
    assignments: TaskAssignment[]
    attendance: AttendanceRecord[]
    holidays: Holiday[]
    attendanceMonth: string
    onClose: () => void
  }
  let { user, tasks, assignments, attendance, holidays, attendanceMonth, onClose } = $props<Props>()
  let activeFilter = $state<'none' | 'done' | 'overdue'>('none')

  let perf = $derived(getUserPerformanceStats(user.id, tasks, assignments))
  let att  = $derived(getMonthlyAttendanceStat(user.id, attendanceMonth, attendance, holidays))

  let userTasks = $derived(
    assignments
      .filter(a => a.user_id === user.id && a.status !== 'rejected')
      .map(a => tasks.find(t => t.id === a.task_id))
      .filter(Boolean) as Task[]
  )

  let filteredTasks = $derived(
    activeFilter === 'done' ? userTasks.filter(t => t.status === 'done') :
    activeFilter === 'overdue' ? userTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done') :
    []
  )

  let taskDistribution = $derived({
    high: userTasks.filter(t => t.status === 'done' && t.priority === 'high').length,
    medium: userTasks.filter(t => t.status === 'done' && t.priority === 'medium').length,
    low: userTasks.filter(t => t.status === 'done' && t.priority === 'low').length,
  })
  let totalDone = $derived(taskDistribution.high + taskDistribution.medium + taskDistribution.low)

  // Badge Logic
  let badges = $derived([
    { 
      id: 'master', label: 'Master of Projects', active: taskDistribution.high >= 2, 
      desc: 'Selesaikan 2+ project berat', icon: '🏆', bg: 'bg-amber-500' 
    },
    { 
      id: 'diligent', label: 'Karyawan Terajin', active: att.presentRate >= 90 && att.totalWorkingDays > 0, 
      desc: 'Kehadiran konsisten (90%+)', icon: '⭐', bg: 'bg-blue-500' 
    },
    { 
      id: 'ontime', label: 'Tepat Waktu', active: perf.overdue <= 1 && perf.done > 0, 
      desc: 'Maks. 1 tugas terlambat', icon: '⏱️', bg: 'bg-green-500' 
    },
    { 
      id: 'productive', label: 'Sangat Produktif', active: perf.done >= 5, 
      desc: 'Selesaikan 5+ tugas', icon: '🔥', bg: 'bg-orange-500' 
    }
  ].filter(b => b.active))
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl pb-6"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <Activity size={16} class="text-blue-500" />
        <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Performa Pengguna</span>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer">
        <X size={16} />
      </button>
    </div>

    <div class="px-6 py-5 flex flex-col gap-5">
      <!-- User header -->
      <div class="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base overflow-hidden flex-shrink-0"
             style="background:linear-gradient(135deg,#3B82F6,#2563EB)">
          {#if user.avatar_url}<img src={user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(user.full_name)}{/if}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-slate-800">{user.full_name}</p>
          <p class="text-xs text-slate-500">{user.position || 'Karyawan'} · <span class="uppercase tracking-wide text-blue-600 font-semibold text-[10px]">{user.role}</span></p>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-sm shadow-orange-200">
            {perf.performanceScore} PTS
          </div>
          <p class="text-[8px] text-orange-400 font-bold uppercase mt-0.5">PERFORMANCE</p>
        </div>
      </div>

      <!-- Task Stats -->
      <div>
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Statistik Tugas</h4>
        <div class="grid grid-cols-2 gap-3">
          <button onclick={() => activeFilter = activeFilter === 'done' ? 'none' : 'done'}
                  class="bg-white border rounded-xl p-4 shadow-sm text-left transition-all active:scale-95 {activeFilter === 'done' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-100'}">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] text-slate-400 font-semibold uppercase">Penyelesaian</p>
              <PieChart size={14} class="text-blue-500" />
            </div>
            <p class="text-2xl font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{perf.completionRate}%</p>
            <div class="mt-2 h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
              <div class="h-full rounded-full bg-gradient-to-r from-blue-300 to-blue-500 transition-all" style="width:{perf.completionRate}%"></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-1">{perf.done} dari {perf.total} tugas</p>
          </button>
          <button onclick={() => activeFilter = activeFilter === 'overdue' ? 'none' : 'overdue'}
                  class="bg-white border rounded-xl p-4 shadow-sm text-left transition-all active:scale-95 {activeFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-100'}">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] text-slate-400 font-semibold uppercase">Tugas Overdue</p>
              <AlertTriangle size={14} class={perf.overdue > 0 ? 'text-red-500' : 'text-slate-300'} />
            </div>
            <p class="text-2xl font-black {perf.overdue > 0 ? 'text-red-500' : 'text-slate-800'}" style="font-family:'Plus Jakarta Sans',sans-serif;">{perf.overdue}</p>
            <p class="text-[10px] text-slate-400 mt-1">dari {perf.total} tugas total</p>
          </button>
        </div>

        <!-- Priority Breakdown -->
        {#if totalDone > 0}
          <div class="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-[10px] text-slate-500 font-bold uppercase">Distribusi Prioritas Selesai</p>
              <p class="text-[10px] text-slate-400 font-bold">{totalDone} Total</p>
            </div>
            <div class="flex h-4 rounded-full overflow-hidden bg-slate-100 shadow-inner">
              <div class="h-full bg-red-500 transition-all" style="width:{(taskDistribution.high/totalDone)*100}%" title="High Priority"></div>
              <div class="h-full bg-amber-500 transition-all" style="width:{(taskDistribution.medium/totalDone)*100}%" title="Medium Priority"></div>
              <div class="h-full bg-slate-400 transition-all" style="width:{(taskDistribution.low/totalDone)*100}%" title="Low Priority"></div>
            </div>
            <div class="flex items-center gap-4 mt-3">
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <span class="text-[10px] font-bold text-slate-600">{taskDistribution.high} <span class="font-normal text-slate-400">High</span></span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span class="text-[10px] font-bold text-slate-600">{taskDistribution.medium} <span class="font-normal text-slate-400">Med</span></span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                <span class="text-[10px] font-bold text-slate-600">{taskDistribution.low} <span class="font-normal text-slate-400">Low</span></span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Filtered Task List -->
        {#if activeFilter !== 'none'}
          <div class="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3" style="animation:slideDown .3s ease-out">
            <div class="flex items-center justify-between mb-1">
              <p class="text-xs font-bold text-slate-600">Daftar Tugas {activeFilter === 'done' ? 'Selesai' : 'Overdue'}</p>
              <button onclick={() => activeFilter = 'none'} class="text-[10px] font-bold text-slate-400 hover:text-slate-600">Tutup</button>
            </div>
            {#each filteredTasks as t}
              {@const ss = STATUS_STYLE[t.status]}
              <div class="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <div class="w-1 h-6 rounded-full flex-shrink-0" style="background:{PRIORITY_DOT[t.priority]}"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-700 truncate">{t.title}</p>
                  <p class="text-[9px] text-slate-400">Deadline: {formatDate(t.due_date)}</p>
                </div>
                <span class="text-[8px] font-bold px-2 py-0.5 rounded-md {ss.bg} {ss.text}">{STATUS_LABEL[t.status]}</span>
              </div>
            {:else}
              <p class="text-[10px] text-slate-400 italic text-center py-2">Tidak ada tugas dalam kategori ini</p>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Attendance Stats -->
      <div>
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Kehadiran — {new Date(attendanceMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </h4>
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center">
              <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-1">
                <UserCheck size={14} class="text-green-600" />
              </div>
              <p class="text-lg font-black text-slate-800">{att.totalPresentDays}</p>
              <p class="text-[9px] text-slate-400 font-medium">Hari Hadir</p>
            </div>
            <div class="text-center">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-1">
                <Clock size={14} class="text-amber-600" />
              </div>
              <p class="text-lg font-black text-slate-800">{att.totalLate}</p>
              <p class="text-[9px] text-slate-400 font-medium">Kali Telat</p>
            </div>
            <div class="text-center">
              <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 size={14} class="text-blue-600" />
              </div>
              <p class="text-lg font-black text-slate-800">{att.totalWorkingDays}</p>
              <p class="text-[9px] text-slate-400 font-medium">Hari Kerja</p>
            </div>
          </div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-bold text-slate-500">Tingkat Kehadiran</span>
            <span class="text-sm font-bold {att.presentRate >= 80 ? 'text-green-500' : att.presentRate >= 50 ? 'text-amber-500' : 'text-red-500'}">{att.presentRate}%</span>
          </div>
          <div class="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div class="h-full rounded-full transition-all bg-gradient-to-r"
                 style="width:{Math.min(att.presentRate,100)}%; {att.presentRate>=80?'background-image:linear-gradient(to right,#86EFAC,#4ADE80)':att.presentRate>=50?'background-image:linear-gradient(to right,#FDE68A,#FBBF24)':'background-image:linear-gradient(to right,#FECACA,#F87171)'}"></div>
          </div>
        </div>
      </div>

      <!-- Achievements / Badges -->
      {#if badges.length > 0}
        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Pencapaian</h4>
          <div class="flex flex-wrap gap-2">
            {#each badges as badge}
              <div class="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full {badge.bg} text-white shadow-sm transition-transform hover:scale-105">
                <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {badge.icon}
                </div>
                <div class="flex flex-col leading-none">
                  <span class="text-[9px] font-black uppercase tracking-tight">{badge.label}</span>
                  <span class="text-[7px] opacity-80 font-bold">{badge.desc}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
<style>
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
