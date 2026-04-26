<script lang="ts">
  import type { Profile, Task, AttendanceRecord, TaskAssignment, Holiday } from '$lib/components/admin/_types'
  import { getInitials, formatDate, SESSIONS } from '$lib/components/admin/_utils'
  import { TrendingUp, Users, ClipboardList, AlertTriangle, CheckCircle2, Target, ChevronRight } from 'lucide-svelte'

  interface Props {
    allUsers: Profile[]
    allTasks: Task[]
    allAttendance: AttendanceRecord[]
    allAssignments: TaskAssignment[]
    holidays: Holiday[]
    onSwitchTab: (tab: string) => void
  }
  let { allUsers, allTasks, allAttendance, allAssignments, holidays, onSwitchTab } = $props<Props>()

  const todayISO = new Date().toISOString().split('T')[0]

  let todayAttendance   = $derived(allAttendance.filter(a => a.date === todayISO))
  let todayPresentUsers = $derived(new Set(todayAttendance.map(a => a.user_id)).size)
  let totalUsers        = $derived(allUsers.length)
  let totalAdmins       = $derived(allUsers.filter(u => u.role === 'admin').length)
  let totalTasks        = $derived(allTasks.length)
  let doneTasks         = $derived(allTasks.filter(t => t.status === 'done').length)
  let overdueTasks      = $derived(allTasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).length)
  let completionRate    = $derived(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0)
  let todayIsHoliday    = $derived(holidays.find(h => h.date === todayISO))

  function getUserAttendanceForDate(userId: string) {
    return todayAttendance.filter(a => a.user_id === userId)
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Holiday banner if today is holiday -->
  {#if todayIsHoliday}
    <div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
      <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <span class="text-base">🎉</span>
      </div>
      <div>
        <p class="text-sm font-bold text-amber-800">Hari Libur: {todayIsHoliday.name}</p>
        <p class="text-[10px] text-amber-600">Kehadiran hari ini tidak dihitung sebagai hari kerja</p>
      </div>
    </div>
  {/if}

  <!-- Hero Stats -->
  <div class="rounded-2xl p-5 text-white shadow-lg" style="background:linear-gradient(135deg,#F97316,#EA580C)">
    <div class="flex items-center gap-2 mb-4">
      <TrendingUp size={16} class="text-orange-200" />
      <span class="text-xs font-bold text-orange-100 uppercase tracking-wider">Statistik Hari Ini</span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white/15 rounded-xl p-3">
        <p class="text-2xl font-black" style="font-family:'Plus Jakarta Sans',sans-serif;">{todayPresentUsers}</p>
        <p class="text-[10px] text-orange-100 mt-0.5">Hadir Hari Ini</p>
      </div>
      <div class="bg-white/15 rounded-xl p-3">
        <p class="text-2xl font-black" style="font-family:'Plus Jakarta Sans',sans-serif;">{totalUsers - todayPresentUsers}</p>
        <p class="text-[10px] text-orange-100 mt-0.5">Tidak Hadir</p>
      </div>
    </div>
  </div>

  <!-- Stat Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    {#each [
      { label: 'Total Pengguna', val: totalUsers,   sub: `${totalAdmins} admin`,       color: '#F97316', Icon: Users          },
      { label: 'Total Tugas',    val: totalTasks,   sub: `${completionRate}% selesai`, color: '#16A34A', Icon: ClipboardList   },
      { label: 'Tugas Overdue',  val: overdueTasks, sub: 'melewati deadline',          color: '#EF4444', Icon: AlertTriangle   },
      { label: 'Tugas Selesai',  val: doneTasks,    sub: `dari ${totalTasks} tugas`,   color: '#2563EB', Icon: CheckCircle2    },
    ] as card}
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style="background:{card.color}15">
          <svelte:component this={card.Icon} size={15} style="color:{card.color}" />
        </div>
        <p class="text-2xl font-black" style="color:{card.color}; font-family:'Plus Jakarta Sans',sans-serif;">{card.val}</p>
        <p class="text-xs font-semibold text-slate-700 mt-0.5">{card.label}</p>
        <p class="text-[10px] text-slate-400">{card.sub}</p>
      </div>
    {/each}
  </div>

  <!-- Team Performance -->
  <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
    <div class="flex items-center gap-2 mb-4">
      <Target size={16} class="text-orange-500" />
      <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Performa Tim</p>
    </div>
    <div class="flex justify-between items-end mb-2">
      <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tingkat Penyelesaian</p>
      <span class="text-lg font-black text-orange-500">{completionRate}%</span>
    </div>
    <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
      <div class="h-full rounded-full transition-all duration-700"
           style="width:{completionRate}%; background:linear-gradient(90deg,#F97316,#FBBF24)"></div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      {#each [
        { label: 'Selesai',      val: doneTasks,                                                              dot: '#22C55E' },
        { label: 'Dikerjakan',   val: allTasks.filter(t => t.status === 'in_progress').length,               dot: '#3B82F6' },
        { label: 'Review/Revisi',val: allTasks.filter(t => t.status === 'review' || t.status === 'revision').length, dot: '#A855F7' },
        { label: 'Belum Mulai',  val: allTasks.filter(t => t.status === 'not_started').length,               dot: '#CBD5E1' },
      ] as item}
        <div class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" style="background:{item.dot}"></div>
            <span class="text-xs text-slate-500">{item.label}</span>
          </div>
          <span class="text-sm font-bold text-slate-700">{item.val}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Today's Attendance Mini -->
  <div>
    <div class="flex items-center justify-between px-1 mb-2">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kehadiran Hari Ini</p>
      <button onclick={() => onSwitchTab('attendance')}
              class="text-[10px] font-bold text-orange-600 flex items-center gap-1 cursor-pointer">
        Lihat Semua <ChevronRight size={11} />
      </button>
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {#each allUsers.slice(0, 5) as u}
        {@const userAtt = getUserAttendanceForDate(u.id)}
        <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white overflow-hidden"
               style="background:linear-gradient(135deg,#F97316,#EA580C)">
            {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover rounded-xl" />{:else}{getInitials(u.full_name)}{/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-700 truncate">{u.full_name}</p>
            <p class="text-[10px] text-slate-400">{u.position || 'Karyawan'}</p>
          </div>
          <div class="flex gap-1">
            {#each SESSIONS.slice(0, 3) as s}
              {@const att = userAtt.find(a => a.session_id === s.id)}
              <div class="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold"
                   class:bg-green-100={att?.check_out} class:text-green-600={att?.check_out}
                   class:bg-orange-100={att?.check_in && !att?.check_out} class:text-orange-600={att?.check_in && !att?.check_out}
                   class:bg-slate-100={!att?.check_in} class:text-slate-400={!att?.check_in}
                   title={s.label}>
                {s.label[0]}
              </div>
            {/each}
          </div>
        </div>
      {/each}
      {#if allUsers.length > 5}
        <div class="px-4 py-2.5 text-center">
          <button onclick={() => onSwitchTab('attendance')} class="text-xs font-semibold text-orange-600 cursor-pointer">
            +{allUsers.length - 5} pengguna lainnya
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
