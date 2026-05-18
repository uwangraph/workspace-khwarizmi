<script lang="ts">
  import type { Profile, Task, AttendanceRecord, TaskAssignment, Holiday } from '$lib/components/admin/_types'
  import { getInitials, formatDate, SESSIONS } from '$lib/components/admin/_utils'
  import { ChevronRight, Calendar, Users, Activity, PartyPopper } from 'lucide-svelte'

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

  const todayLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
</script>

<div class="flex flex-col gap-6">

  <!-- Holiday banner -->
  {#if todayIsHoliday}
    <div class="flex items-center gap-3 px-5 py-4 rounded-2xl bg-amber-50 border-2 border-b-[6px] border-amber-200 text-amber-800 shadow-xs">
      <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center border-2 border-amber-300 flex-shrink-0">
        <PartyPopper size={22} class="text-amber-600" />
      </div>
      <div>
        <p class="text-sm font-black">Hari Libur: {todayIsHoliday.name}</p>
        <p class="text-xs font-bold text-amber-600 mt-0.5">Kehadiran hari ini tidak dihitung sebagai hari kerja</p>
      </div>
    </div>
  {/if}

  <!-- Premium Orange Hero Card -->
  <div class="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 p-8 shadow-xl shadow-orange-500/20 border-2 border-b-[8px] border-orange-600">
    <!-- Abstract Background Decor -->
    <div class="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute right-10 -bottom-10 w-40 h-40 bg-yellow-300 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
    <div class="absolute left-1/2 top-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 pointer-events-none"></div>

    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      
      <!-- Text Content -->
      <div class="flex-1">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 mb-4 shadow-sm">
          <Calendar size={14} class="text-white" />
          <p class="text-white text-xs font-black uppercase tracking-widest">{todayLabel}</p>
        </div>
        
        <h2 class="text-3xl font-black text-white tracking-tight leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
          Ringkasan Hari Ini
        </h2>
        
        <div class="flex items-center gap-2.5 mt-3 text-orange-50">
          <Users size={18} class="opacity-80" />
          <p class="text-sm font-bold">Ada <strong class="text-white text-xl font-black">{todayPresentUsers}</strong> dari <span class="opacity-90">{totalUsers}</span> anggota yang hadir.</p>
        </div>
      </div>
      
      <!-- Glassmorphism Stat Card -->
      <div class="flex items-center gap-5 bg-white/10 backdrop-blur-md rounded-3xl px-6 py-6 border-2 border-b-[6px] border-white/20 shadow-lg shrink-0">
        <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
          <Activity size={28} class="text-white" />
        </div>
        <div>
          <p class="text-xs text-orange-100 font-black uppercase tracking-widest mb-1">Tingkat Hadir</p>
          <div class="flex items-baseline gap-1">
            <p class="text-4xl font-black text-white leading-none tracking-tight">{totalUsers > 0 ? Math.round((todayPresentUsers / totalUsers) * 100) : 0}</p>
            <span class="text-2xl font-black text-orange-200">%</span>
          </div>
        </div>
      </div>
      
    </div>
  </div>


  <!-- Stat Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    {#each [
      { label: 'Pengguna',     val: totalUsers,   sub: `${totalAdmins} admin`,       color: '#ea580c' },
      { label: 'Total Tugas',  val: totalTasks,   sub: `${completionRate}% selesai`, color: '#16a34a' },
      { label: 'Overdue',      val: overdueTasks, sub: 'melewati deadline',          color: '#dc2626' },
      { label: 'Selesai',      val: doneTasks,    sub: `dari ${totalTasks} tugas`,   color: '#2563eb' },
    ] as card}
      <div class="bg-white rounded-[24px] p-5 border-2 border-b-[6px] border-slate-200 shadow-xs hover:border-orange-500 hover:border-b-[6px] hover:-translate-y-0.5 transition-all">
        <p class="text-3xl font-black leading-none" style="color:{card.color}">{card.val}</p>
        <p class="text-sm font-black text-slate-800 mt-3">{card.label}</p>
        <p class="text-xs font-bold text-slate-400 mt-1">{card.sub}</p>
      </div>
    {/each}
  </div>

  <!-- Task Breakdown -->
  <div class="bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-6 shadow-xs">
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Status Tugas</p>
      <span class="text-xs font-black px-3 py-1 bg-orange-100 text-orange-600 rounded-full border border-orange-200">{completionRate}% selesai</span>
    </div>
    <div class="h-3 bg-slate-100 rounded-full overflow-hidden mb-5 p-0.5 border border-slate-200/60 shadow-inner">
      <div class="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-orange-400 to-orange-600"
           style="width:{completionRate}%"></div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      {#each [
        { label: 'Selesai',       val: doneTasks,                                                                    dot: '#22c55e' },
        { label: 'Dikerjakan',    val: allTasks.filter(t => t.status === 'in_progress').length,                      dot: '#3b82f6' },
        { label: 'Review/Revisi', val: allTasks.filter(t => t.status === 'review' || t.status === 'revision').length, dot: '#a855f7' },
        { label: 'Belum Mulai',   val: allTasks.filter(t => t.status === 'not_started').length,                      dot: '#cbd5e1' },
      ] as item}
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-100/80 font-bold">
          <div class="flex items-center gap-2.5">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{item.dot}"></div>
            <span class="text-xs font-bold text-slate-600">{item.label}</span>
          </div>
          <span class="text-sm font-black text-slate-800">{item.val}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Today's Attendance Mini -->
  <div class="bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-6 shadow-xs flex flex-col gap-4">
    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
      <p class="text-sm font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Kehadiran Hari Ini</p>
      <button onclick={() => onSwitchTab('attendance')}
              class="text-xs font-black text-orange-500 flex items-center gap-1 cursor-pointer hover:text-orange-600 transition-colors">
        Lihat semua <ChevronRight size={14} />
      </button>
    </div>
    <div class="flex flex-col gap-2.5">
      {#each allUsers.slice(0, 5) as u}
        {@const userAtt = getUserAttendanceForDate(u.id)}
        <div class="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-orange-500 transition-all">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white overflow-hidden shadow-sm"
               style="background:#ea580c">
            {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-slate-800 truncate">{u.full_name}</p>
            <p class="text-[10px] font-bold text-slate-400">{u.position || 'Karyawan'}</p>
          </div>
          <div class="flex gap-1.5">
            {#each SESSIONS.slice(0, 3) as s}
              {@const att = userAtt.find(a => a.session_id === s.id)}
              <div class="w-7 h-7 rounded-lg border-2 flex items-center justify-center text-[10px] font-black transition-all"
                   class:bg-green-100={att?.clock_out} class:text-green-600={att?.clock_out} class:border-green-300={att?.clock_out}
                   class:bg-orange-100={att?.clock_in && !att?.clock_out} class:text-orange-500={att?.clock_in && !att?.clock_out} class:border-orange-300={att?.clock_in && !att?.clock_out}
                   class:bg-slate-100={!att?.clock_in} class:text-slate-400={!att?.clock_in} class:border-slate-200={!att?.clock_in}
                   title={s.label}>
                {s.label[0]}
              </div>
            {/each}
          </div>
        </div>
      {/each}
      {#if allUsers.length > 5}
        <div class="pt-2 text-center">
          <button onclick={() => onSwitchTab('attendance')} class="px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-xs font-black text-orange-600 cursor-pointer hover:bg-orange-100 transition-colors">
            +{allUsers.length - 5} pengguna lainnya
          </button>
        </div>
      {/if}
    </div>
  </div>

</div>
