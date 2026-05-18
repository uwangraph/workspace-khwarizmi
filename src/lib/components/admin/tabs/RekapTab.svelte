<script lang="ts">
  import type { Profile, Task, TaskAssignment, AttendanceRecord, Holiday } from '$lib/components/admin/_types'
  import { STATUS_LABEL, STATUS_STYLE, PRIORITY_DOT, PRIORITY_LABEL, getInitials, formatDate, getMonthlyAttendanceStat, getUserPerformanceStats } from '$lib/components/admin/_utils'
  import type { RekapSubTab } from '$lib/components/admin/_types'
  import { AlertTriangle, CheckCircle2, Target, Users, ClipboardList, Calendar, Download, Trophy, Clock, FileText, Moon } from 'lucide-svelte'
  import { jsPDF } from 'jspdf'
  import autoTable from 'jspdf-autotable'

  interface Props {
    allUsers: Profile[]
    allTasks: Task[]
    allAssignments: TaskAssignment[]
    allAttendance: AttendanceRecord[]
    holidays: Holiday[]
    selectedMonth: string
    rekapMode: 'monthly' | 'yearly'
    onMonthChange: (m: string) => void
    onModeChange: (mode: 'monthly' | 'yearly') => void
  }
  let { allUsers, allTasks, allAssignments, allAttendance, holidays, selectedMonth, rekapMode, onMonthChange, onModeChange } = $props<Props>()

  let sub = $state<RekapSubTab>('tasks')

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

  // Top performers by performance score
  let topPerformers = $derived(
    allUsers
      .map(u => ({ user: u, ...getUserPerformanceStats(u.id, allTasks, allAssignments) }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5)
  )

  // ── Rekap Kehadiran ───────────────────────────────────────────────────────
  let attendStats = $derived(
    allUsers.map(u => ({
      user: u,
      ...getMonthlyAttendanceStat(u.id, selectedMonth, allAttendance, holidays)
    })).sort((a, b) => b.presentRate - a.presentRate || b.totalPresentDays - a.totalPresentDays)
  )

  let topAttendants = $derived(
    attendStats.filter(s => s.totalPresentDays > 0).slice(0, 3)
  )

  // ── Rekap Pengguna ────────────────────────────────────────────────────────
  let userStats = $derived(
    allUsers.map(u => {
      const task = getUserPerformanceStats(u.id, allTasks, allAssignments);
      const att = getMonthlyAttendanceStat(u.id, selectedMonth, allAttendance, holidays);
      // Combined Score: Task Performance + (Attendance Rate * 2)
      const totalScore = task.performanceScore + (att.presentRate * 2);
      
      return {
        user: u,
        task,
        att,
        totalScore
      }
    }).sort((a, b) => b.totalScore - a.totalScore)
  )

  function exportPdf() {
    const doc = new jsPDF()
    const title = `Rekap Laporan Khwarizmi - ${rekapMode === 'monthly' ? selectedMonth : 'Tahun ' + selectedMonth}`
    
    // Add header
    doc.setFontSize(18)
    doc.setTextColor(234, 88, 12) // Orange-600
    doc.text('KHWARIZMI WORKSPACE', 14, 22)
    
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text(title, 14, 30)
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 37)
    
    // Line separator
    doc.setDrawColor(241, 245, 249) // Slate-100
    doc.line(14, 45, 196, 45)

    const headers = [
      ['NAMA', 'POSISI', 'TASKS', 'DONE', 'RATE %', 'HADIR', 'TELAT', 'LEMBUR', 'SKOR']
    ]
    
    const rows = userStats.map(s => [
      s.user.full_name,
      s.user.position || '-',
      s.task.total,
      s.task.done,
      s.task.completionRate + '%',
      s.att.totalPresentDays,
      s.att.totalLate,
      s.att.totalOvertimeHours + ' jam',
      s.totalScore
    ])

    autoTable(doc, {
      startY: 55,
      head: headers,
      body: rows,
      theme: 'striped',
      headStyles: { 
        fillColor: [249, 115, 22], // Orange-500
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85] // Slate-700
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate-50
      },
      margin: { top: 55 }
    })

    doc.save(`Rekap_Khwarizmi_${selectedMonth}.pdf`)
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center border-2 border-orange-300 flex-shrink-0 shadow-xs">
        <Target size={22} class="text-orange-500" />
      </div>
      <div>
        <h2 class="text-lg font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Analitik & Performa</h2>
        <p class="text-xs font-bold text-slate-400">Rangkuman data operasional dan kontribusi tim</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <!-- Mode Toggle -->
      <div class="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200">
        <button onclick={() => onModeChange('monthly')}
                class="px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer {rekapMode === 'monthly' ? 'bg-white text-orange-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}">
          BULANAN
        </button>
        <button onclick={() => onModeChange('yearly')}
                class="px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer {rekapMode === 'yearly' ? 'bg-white text-orange-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}">
          TAHUNAN
        </button>
      </div>

      <div class="relative">
        {#if rekapMode === 'monthly'}
          <input type="month" 
                 value={selectedMonth} 
                 onchange={e => onMonthChange(e.currentTarget.value)}
                 class="bg-white border-2 border-b-[4px] border-slate-200 text-slate-700 text-xs font-black pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-500 transition-all cursor-pointer shadow-xs" />
        {:else}
          <select value={selectedMonth} 
                  onchange={e => onMonthChange(e.currentTarget.value)}
                  class="bg-white border-2 border-b-[4px] border-slate-200 text-slate-700 text-xs font-black pl-9 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-orange-500 transition-all cursor-pointer shadow-xs appearance-none">
            {#each [2024, 2025, 2026, 2027] as year}
              <option value={year.toString()}>{year}</option>
            {/each}
          </select>
        {/if}
        <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <Calendar size={14} />
        </div>
      </div>
      <button onclick={exportPdf} class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-100 text-orange-600 text-xs font-black border-2 border-b-[4px] border-orange-200 hover:bg-orange-200 active:translate-y-0.5 active:border-b-[2px] transition-all shadow-xs cursor-pointer">
        <FileText size={16} /> Export PDF
      </button>
    </div>
  </div>
  
  <!-- Sub-tab pills -->
  <div class="flex flex-col md:flex-row gap-2 bg-slate-100/80 p-1.5 rounded-[24px] border-2 border-slate-200/60 shadow-inner">
    {#each [
      { id: 'tasks', label: 'Tugas', Icon: CheckCircle2 },
      { id: 'attendance', label: 'Absen', Icon: Clock },
      { id: 'leaderboard', label: 'Top Ranking', Icon: Trophy },
      { id: 'users', label: 'Semua Anggota', Icon: Users },
    ] as s}
      <button onclick={() => sub = s.id as RekapSubTab}
              class="flex-1 py-3 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border-2 active:translate-y-0.5 {sub === s.id ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-md' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60 hover:border-slate-200'}"
              style="font-family:'Plus Jakarta Sans',sans-serif;">
        <s.Icon size={16} />
        {s.label}
      </button>
    {/each}
  </div>

  <!-- ── REKAP TUGAS ── -->
  {#if sub === 'tasks'}
    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each [
        { label: 'Total Tugas',    val: totalTasks,    color: '#F97316', bg: 'bg-orange-50/50', border: 'border-orange-200' },
        { label: 'Selesai',        val: doneTasks,     color: '#22C55E', bg: 'bg-green-50/50', border: 'border-green-200' },
        { label: 'Overdue',        val: overdueTasks.length, color: '#EF4444', bg: 'bg-red-50/50', border: 'border-red-200' },
      ] as c}
        <div class="bg-white rounded-[24px] p-6 shadow-xs border-2 border-b-[6px] border-slate-200 text-center flex flex-col justify-center items-center">
          <p class="text-4xl font-black leading-tight" style="color:{c.color}; font-family:'Plus Jakarta Sans',sans-serif;">{c.val}</p>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{c.label}</p>
        </div>
      {/each}
    </div>

    <!-- Status breakdown CSS bar chart -->
    <div class="bg-white rounded-[24px] p-6 shadow-xs border-2 border-b-[6px] border-slate-200 flex flex-col gap-5">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center border border-orange-200 flex-shrink-0">
          <Target size={18} class="text-orange-500" />
        </div>
        <p class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Breakdown Status Tugas</p>
      </div>
      <div class="flex flex-col gap-4">
        {#each byStatus as s}
          <div>
            <div class="flex items-center justify-between mb-1.5 font-bold">
              <span class="text-xs text-slate-700 uppercase tracking-wider">{s.label}</span>
              <span class="text-xs font-black text-slate-600 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">{s.count} ({s.pct}%)</span>
            </div>
            <div class="h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
              <div class="h-full rounded-full transition-all duration-700 shadow-xs {s.bar}" style="width:{s.pct}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Top Performers -->
    {#if topPerformers.length > 0}
      <div class="bg-white rounded-[24px] p-6 shadow-xs border-2 border-b-[6px] border-slate-200 flex flex-col gap-4">
        <div class="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
          <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-200 flex-shrink-0">
            <Trophy size={18} class="text-amber-500" />
          </div>
          <p class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Top Performer Tugas</p>
        </div>
        <div class="flex flex-col gap-3">
          {#each topPerformers as p, i}
            <div class="flex items-center gap-4 p-3 bg-slate-50/80 rounded-2xl border-2 border-slate-200/80 shadow-inner">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 shadow-xs border-2 border-white"
                   style="background:{i===0?'linear-gradient(135deg,#FBBF24,#F59E0B)':i===1?'linear-gradient(135deg,#94A3B8,#64748B)':'linear-gradient(135deg,#FB923C,#EA580C)'}; color:white">
                {i+1}
              </div>
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white overflow-hidden flex-shrink-0 shadow-xs border border-orange-300"
                   style="background:linear-gradient(135deg,#F97316,#EA580C)">
                {#if p.user.avatar_url}<img src={p.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(p.user.full_name)}{/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{p.user.full_name}</p>
                <p class="text-xs font-bold text-slate-400">{p.done}/{p.total} tugas selesai</p>
              </div>
              <div class="flex flex-col items-end flex-shrink-0 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                <span class="text-sm font-black text-orange-500 leading-none">{p.performanceScore} pts</span>
                <span class="text-[10px] text-slate-400 font-black mt-1">{p.completionRate}% Selesai</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Overdue list -->
    {#if overdueTasks.length > 0}
      <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
        <div class="p-4 border-b-2 border-red-200 bg-red-50 flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center border border-red-200 flex-shrink-0">
            <AlertTriangle size={18} class="text-red-600" />
          </div>
          <p class="text-sm font-black text-red-700 uppercase tracking-wider">{overdueTasks.length} Tugas Melewati Deadline</p>
        </div>
        <div class="divide-y divide-slate-100">
        {#each overdueTasks.slice(0, 8) as task}
          {@const ss = STATUS_STYLE[task.status]}
          <div class="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors">
            <div class="w-2.5 h-10 rounded-full flex-shrink-0 shadow-inner" style="background:{PRIORITY_DOT[task.priority]}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{task.title}</p>
              <p class="text-xs font-bold text-red-500 mt-0.5">Deadline: {formatDate(task.due_date)}</p>
            </div>
            <span class="text-xs font-black px-3 py-1.5 rounded-xl border-2 uppercase tracking-wider shadow-xs {ss.bg} {ss.text}">{STATUS_LABEL[task.status]}</span>
          </div>
        {/each}
        </div>
      </div>
    {/if}

  <!-- ── REKAP KEHADIRAN ── -->
  {:else if sub === 'attendance'}
    <div class="bg-white rounded-[24px] p-6 shadow-xs border-2 border-b-[6px] border-slate-200 flex items-center justify-between">
      <div>
        <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Rentang Waktu</p>
        <p class="text-xl font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {#if rekapMode === 'monthly'}
            {new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          {:else}
            Tahun {selectedMonth}
          {/if}
        </p>
      </div>
      <button onclick={exportPdf} class="px-5 py-3 rounded-2xl text-xs font-black text-orange-600 bg-orange-100 border-2 border-b-[4px] border-orange-200 hover:bg-orange-200 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center gap-2 shadow-xs cursor-pointer">
        <FileText size={16} /> Export PDF
      </button>
    </div>

    <!-- Top Attendance Cards -->
    {#if topAttendants.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each topAttendants as s, i}
          <div class="bg-white rounded-[24px] p-6 shadow-xs border-2 border-b-[6px] border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
            <!-- Rank Badge -->
            <div class="absolute top-0 right-0 px-4 py-2 flex items-center justify-center rounded-bl-2xl text-xs font-black text-white shadow-xs border-l-2 border-b-2 border-white/20"
                 style="background:{i===0?'linear-gradient(135deg,#FBBF24,#F59E0B)':i===1?'linear-gradient(135deg,#94A3B8,#64748B)':'linear-gradient(135deg,#FB923C,#EA580C)'}">
              #{i+1}
            </div>
            
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white overflow-hidden mb-3 border-2 shadow-md {i===0?'border-amber-400':i===1?'border-slate-300':'border-orange-300'}"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if s.user.avatar_url}<img src={s.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(s.user.full_name)}{/if}
            </div>
            <p class="text-sm font-black text-slate-800 truncate w-full" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.user.full_name}</p>
            <p class="text-3xl font-black text-orange-500 mt-2 mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.presentRate}%</p>
            <p class="text-xs font-bold px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 uppercase tracking-wider">{s.totalPresentDays} Hari Hadir</p>
          </div>
        {/each}
      </div>
    {/if}

    <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
      <div class="grid grid-cols-[1fr_auto_auto_auto_auto] p-4 bg-slate-50 border-b-2 border-slate-100 font-black">
        <span class="text-xs text-slate-500 uppercase tracking-wider">Pengguna</span>
        <span class="text-xs text-slate-500 uppercase tracking-wider text-center w-16">Hadir</span>
        <span class="text-xs text-slate-500 uppercase tracking-wider text-center w-16">Telat</span>
        <span class="text-xs text-slate-500 uppercase tracking-wider text-center w-20">Lembur</span>
        <span class="text-xs text-slate-500 uppercase tracking-wider text-center w-20">Rate</span>
      </div>
      <div class="divide-y divide-slate-100">
      {#each attendStats as s}
        <div class="grid grid-cols-[1fr_auto_auto_auto_auto] items-center p-4 hover:bg-slate-50/80 transition-colors">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white overflow-hidden shadow-xs border border-orange-300"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if s.user.avatar_url}<img src={s.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(s.user.full_name)}{/if}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.user.full_name}</p>
              <p class="text-[10px] font-bold text-slate-400">{s.user.position || 'Anggota'}</p>
            </div>
          </div>
          <span class="text-base font-black text-slate-800 text-center w-16">{s.totalPresentDays}<span class="text-xs font-bold text-slate-400">/{s.totalWorkingDays}</span></span>
          <span class="text-base font-black text-center w-16 {s.totalLate > 0 ? 'text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg' : 'text-slate-300'}">{s.totalLate}</span>
          <span class="text-base font-black text-center w-20 {s.totalOvertimeHours > 0 ? 'text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg' : 'text-slate-300'}">{s.totalOvertimeHours}<span class="text-xs font-bold opacity-60 ml-0.5">jam</span></span>
          <div class="w-20 flex flex-col items-center bg-slate-50 border border-slate-200 p-2 rounded-xl">
            <span class="text-sm font-black {s.presentRate>=80?'text-green-500':s.presentRate>=50?'text-amber-500':'text-red-500'}">{s.presentRate}%</span>
            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 shadow-inner">
              <div class="h-full rounded-full" style="width:{Math.min(s.presentRate,100)}%; background:{s.presentRate>=80?'#22C55E':s.presentRate>=50?'#F59E0B':'#EF4444'}"></div>
            </div>
          </div>
        </div>
      {/each}
      </div>
    </div>

  <!-- ── LEADERBOARD (TOP RANKING) ── -->
  {:else if sub === 'leaderboard'}
    <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
      <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-6 flex items-center justify-between border-b-4 border-orange-700">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-inner">
            <Trophy size={26} class="text-white" />
          </div>
          <div>
            <h3 class="text-white font-black text-xl" style="font-family:'Plus Jakarta Sans',sans-serif;">Papan Peringkat Khwarizmi</h3>
            <p class="text-orange-100 font-bold text-xs mt-0.5">Peringkat kontribusi total berdasarkan tugas selesai dan kehadiran</p>
          </div>
        </div>
      </div>
      
      <div class="divide-y divide-slate-100">
        {#each userStats as s, i}
          <div class="flex items-center gap-5 p-5 hover:bg-slate-50/80 transition-colors">
            <!-- Rank -->
            <div class="w-12 flex-shrink-0 text-center flex items-center justify-center">
              {#if i === 0}
                <div class="w-10 h-10 bg-amber-100 border-2 border-amber-400 rounded-2xl flex items-center justify-center text-2xl shadow-xs animate-bounce">🥇</div>
              {:else if i === 1}
                <div class="w-10 h-10 bg-slate-100 border-2 border-slate-300 rounded-2xl flex items-center justify-center text-2xl shadow-xs">🥈</div>
              {:else if i === 2}
                <div class="w-10 h-10 bg-orange-100 border-2 border-orange-300 rounded-2xl flex items-center justify-center text-2xl shadow-xs">🥉</div>
              {:else}
                <div class="w-10 h-10 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center text-sm font-black text-slate-400">#{i + 1}</div>
              {/if}
            </div>

            <!-- Avatar -->
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white overflow-hidden flex-shrink-0 shadow-xs border border-orange-300"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if s.user.avatar_url}<img src={s.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(s.user.full_name)}{/if}
            </div>

            <!-- User Info -->
            <div class="flex-1 min-w-0">
              <p class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.user.full_name}</p>
              <div class="flex flex-wrap items-center gap-2 mt-1.5">
                <span class="text-xs font-black text-orange-600 bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-xl shadow-xs">{s.task.done} Tasks</span>
                <span class="text-xs font-black text-blue-600 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl shadow-xs">{s.att.presentRate}% Attendance</span>
              </div>
            </div>

            <!-- Total Score -->
            <div class="text-right bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl shadow-inner flex-shrink-0">
              <p class="text-2xl font-black text-slate-800 leading-none" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.totalScore}</p>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">Total Points</p>
            </div>
          </div>
        {/each}
      </div>
    </div>

  <!-- ── REKAP PENGGUNA ── -->
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each userStats as s}
        <div class="bg-white rounded-[24px] p-6 shadow-xs border-2 border-b-[6px] border-slate-200 flex flex-col gap-4">
          <!-- Header -->
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white overflow-hidden flex-shrink-0 shadow-xs border border-orange-300"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if s.user.avatar_url}<img src={s.user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(s.user.full_name)}{/if}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-0.5">
                <p class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.user.full_name}</p>
                {#if s.user.role === 'admin'}
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 flex-shrink-0 shadow-xs">ADMIN</span>
                {/if}
              </div>
              <p class="text-xs font-bold text-slate-400">{s.user.position || 'Anggota'}</p>
            </div>
            <div class="text-right bg-orange-50 border-2 border-orange-200 px-3 py-1.5 rounded-xl shadow-xs">
              <p class="text-lg font-black text-orange-600 leading-none">{s.totalScore}</p>
              <p class="text-[9px] font-black text-orange-400 uppercase tracking-wider mt-0.5">Total</p>
            </div>
          </div>
          <!-- Stats row -->
          <div class="grid grid-cols-4 gap-2.5">
            <div class="text-center bg-slate-50 border-2 border-slate-200/80 rounded-2xl py-3 shadow-inner">
              <p class="text-xl font-black text-orange-500" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.task.performanceScore}</p>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Poin Tugas</p>
            </div>
            <div class="text-center bg-slate-50 border-2 border-slate-200/80 rounded-2xl py-3 shadow-inner">
              <p class="text-xl font-black {s.att.presentRate>=80?'text-green-500':s.att.presentRate>=50?'text-amber-500':'text-red-500'}" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.att.presentRate}%</p>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Hadir</p>
            </div>
            <div class="text-center bg-slate-50 border-2 border-slate-200/80 rounded-2xl py-3 shadow-inner">
              <p class="text-xl font-black {s.att.totalOvertimeHours > 0 ? 'text-indigo-600' : 'text-slate-300'}" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.att.totalOvertimeHours}</p>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Lembur</p>
            </div>
            <div class="text-center bg-slate-50 border-2 border-slate-200/80 rounded-2xl py-3 shadow-inner">
              <p class="text-xl font-black {s.task.overdue>0?'text-red-500':'text-slate-300'}" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.task.overdue}</p>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Overdue</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  input[type="month"]::-webkit-calendar-picker-indicator {
    background: transparent;
    bottom: 0;
    color: transparent;
    cursor: pointer;
    height: auto;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: auto;
  }
</style>
