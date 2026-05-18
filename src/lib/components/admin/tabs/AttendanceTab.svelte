<script lang="ts">
  import { onMount } from 'svelte'
  import type { Profile, AttendanceRecord, Holiday, SpecialRule, AttendanceLeave } from '$lib/components/admin/_types'
  import { getInitials, formatTime, getMonthlyAttendanceStat, getHolidayName, isHoliday, isThursday, isFriday, getSpecialRule, SESSIONS } from '$lib/components/admin/_utils'
  import { Search, CalendarDays, Calendar, CheckCircle2, Clock, X, FileText, Check, XCircle, BarChart3, ChevronLeft, ChevronRight } from 'lucide-svelte'
  import AttendanceDetailModal from '$lib/components/admin/modals/AttendanceDetailModal.svelte'

  interface Props {
    allUsers: Profile[]
    allAttendance: AttendanceRecord[]
    monthlyAttendance: AttendanceRecord[]
    holidays: Holiday[]
    specialRules: SpecialRule[]
    allLeaves: AttendanceLeave[]
    onUpdateLeave: (leave: AttendanceLeave, status: 'approved' | 'rejected') => void
    onMonthChange?: (month: string) => void
  }
  let { allUsers, allAttendance, monthlyAttendance, holidays, specialRules, allLeaves, onUpdateLeave, onMonthChange } = $props<Props>()

  const ITEMS_PER_PAGE = 10
  const LEAVES_PER_PAGE = 8
  let mode           = $state<'daily' | 'monthly' | 'leaves'>('daily')
  let attendanceDate = $state(new Date().toISOString().split('T')[0])
  let attendanceMonth= $state(new Date().toISOString().slice(0, 7))
  let userSearch     = $state('')
  let page           = $state(1)
  let leavesFilter   = $state<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  let leavesPage     = $state(1)
  let selectedDetailUser = $state<Profile | null>(null)

  let _mounted = false
  onMount(() => { _mounted = true })

  $effect(() => {
    const month = attendanceMonth
    if (_mounted) onMonthChange?.(month)
  })

  let filtered   = $derived(
    allUsers.filter(u =>
      !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.position?.toLowerCase().includes(userSearch.toLowerCase())
    )
  )
  let paginated  = $derived(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE))
  let totalPages = $derived(Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1)

  let filteredLeaves = $derived(
    leavesFilter === 'all' ? allLeaves : allLeaves.filter(l => l.status === leavesFilter)
  )
  let paginatedLeaves  = $derived(filteredLeaves.slice((leavesPage - 1) * LEAVES_PER_PAGE, leavesPage * LEAVES_PER_PAGE))
  let leavesTotalPages = $derived(Math.ceil(filteredLeaves.length / LEAVES_PER_PAGE) || 1)

  let attendByDate    = $derived(allAttendance.filter(a => a.date === attendanceDate))
  let presentCount    = $derived(new Set(attendByDate.map(a => a.user_id)).size)
  let dateIsHoliday   = $derived(isHoliday(attendanceDate, holidays))
  let holidayName     = $derived(getHolidayName(attendanceDate, holidays))
  let dateIsThursday  = $derived(isThursday(attendanceDate))
  let dateIsFriday    = $derived(isFriday(attendanceDate))
  let specialRule    = $derived(getSpecialRule(attendanceDate, specialRules))
  let activeSessions  = $derived.by(() => {
    let result: typeof SESSIONS
    if (specialRule?.active_sessions) {
      result = SESSIONS.filter(s => specialRule.active_sessions?.includes(s.id))
    } else if (dateIsHoliday || dateIsFriday) {
      result = [] // hari libur/Jumat: sesi reguler off, hanya Lembur
    } else if (dateIsThursday) {
      result = SESSIONS.slice(0, 1) // Kamis: hanya Pagi
    } else {
      result = [...SESSIONS]
    }

    // Lembur selalu tampil di grid admin (bisa absen Lembur kapan saja)
    if (!result.find(s => s.id === 4)) {
      const lembur = SESSIONS.find(s => s.id === 4)
      if (lembur) result = [...result, lembur]
    }
    return result.sort((a, b) => a.id - b.id)
  })

  $effect(() => { userSearch; attendanceDate; mode; page = 1 })
  $effect(() => { leavesFilter; mode; leavesPage = 1 })

  function getUserAtt(userId: string) { return attendByDate.filter(a => a.user_id === userId) }

  let pendingLeavesCount = $derived(allLeaves.filter(l => l.status === 'pending').length)

  const LEAVE_FILTER_LABELS: Record<string, string> = {
    pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', all: 'Semua'
  }
</script>

<div class="flex flex-col gap-6">
  <!-- Mode Toggle -->
  <div class="flex flex-col md:flex-row gap-2 bg-slate-100/80 p-1.5 rounded-[24px] border-2 border-slate-200/60 shadow-inner">
    <button onclick={() => mode = 'daily'}
            class="flex-1 py-3.5 px-4 flex items-center justify-center gap-2 rounded-2xl text-xs font-black transition-all cursor-pointer border-2 active:translate-y-0.5 {mode === 'daily' ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-md' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60 hover:border-slate-200'}"
            style="font-family:'Plus Jakarta Sans',sans-serif;">
      <CalendarDays size={16} /> Harian
    </button>
    <button onclick={() => mode = 'monthly'}
            class="flex-1 py-3.5 px-4 flex items-center justify-center gap-2 rounded-2xl text-xs font-black transition-all cursor-pointer border-2 active:translate-y-0.5 {mode === 'monthly' ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-md' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60 hover:border-slate-200'}"
            style="font-family:'Plus Jakarta Sans',sans-serif;">
      <BarChart3 size={16} /> Bulanan
    </button>
    <button onclick={() => mode = 'leaves'}
            class="flex-1 py-3.5 px-4 flex items-center justify-center gap-2 rounded-2xl text-xs font-black transition-all cursor-pointer border-2 relative active:translate-y-0.5 {mode === 'leaves' ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-md' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60 hover:border-slate-200'}"
            style="font-family:'Plus Jakarta Sans',sans-serif;">
      <FileText size={16} /> Persetujuan Izin
      {#if pendingLeavesCount > 0}
        <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-md border-2 border-white min-w-[24px] flex items-center justify-center animate-bounce leading-none">
          {pendingLeavesCount}
        </span>
      {/if}
    </button>
  </div>

  {#if mode !== 'leaves'}
    <!-- Search -->
  <div class="relative">
    <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
    <input bind:value={userSearch} placeholder="Cari nama pengguna..."
           class="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 text-sm font-bold bg-white text-slate-700 focus:outline-none focus:border-orange-500 transition-all shadow-xs" />
  </div>
  {/if}

  {#if mode === 'daily'}
    <!-- Date picker + count -->
    <div class="flex flex-col md:flex-row md:items-center gap-4">
      <div class="flex-1 relative">
        <CalendarDays size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="date" bind:value={attendanceDate}
               class="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 text-sm font-bold bg-white text-slate-700 focus:outline-none focus:border-orange-500 transition-all shadow-xs cursor-pointer" />
      </div>
      <div class="flex items-center justify-between md:justify-end gap-3 px-4 py-3 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex-shrink-0">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Hadir Hari Ini</span>
        <div class="flex items-baseline gap-1">
          <p class="text-2xl font-black text-orange-500 leading-none" style="font-family:'Plus Jakarta Sans',sans-serif;">{presentCount}</p>
          <p class="text-xs text-slate-400 font-bold">anggota</p>
        </div>
      </div>
    </div>

    <!-- Friday banner -->
    {#if dateIsFriday}
      <div class="flex items-center gap-3.5 p-4 bg-violet-50 border-2 border-b-[6px] border-violet-200 rounded-2xl shadow-xs">
        <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center border-2 border-violet-300 text-lg flex-shrink-0">🕌</div>
        <div>
          <p class="text-sm font-black text-violet-900">Hari Jumat — Libur Mingguan</p>
          <p class="text-xs font-bold text-violet-600 mt-0.5">Sesi reguler ditiadakan</p>
        </div>
      </div>
    {/if}

    <!-- Holiday badge -->
    {#if dateIsHoliday}
      <div class="flex items-center gap-3.5 p-4 bg-amber-50 border-2 border-b-[6px] border-amber-200 rounded-2xl shadow-xs">
        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center border-2 border-amber-300 text-lg flex-shrink-0">🎉</div>
        <div>
          <p class="text-sm font-black text-amber-900">Hari Libur: {holidayName}</p>
          <p class="text-xs font-bold text-amber-600 mt-0.5">Kehadiran tidak diwajibkan</p>
        </div>
      </div>
    {/if}

    <!-- Special Rule banner -->
    {#if specialRule}
      <div class="flex items-center gap-3.5 p-4 rounded-2xl border-2 border-b-[6px] shadow-xs"
           class:bg-amber-50={specialRule.type === 'custom_time'}
           class:border-amber-200={specialRule.type === 'custom_time'}
           class:bg-blue-50={specialRule.type === 'wfa'}
           class:border-blue-200={specialRule.type === 'wfa'}
           class:bg-orange-50={specialRule.type === 'normal'}
           class:border-orange-200={specialRule.type === 'normal'}>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center border-2 text-lg flex-shrink-0"
             class:bg-amber-100={specialRule.type === 'custom_time'} class:border-amber-300={specialRule.type === 'custom_time'}
             class:bg-blue-100={specialRule.type === 'wfa'} class:border-blue-300={specialRule.type === 'wfa'}
             class:bg-orange-100={specialRule.type === 'normal'} class:border-orange-300={specialRule.type === 'normal'}>
          {specialRule.type === 'wfa' ? '🏠' : specialRule.type === 'custom_time' ? '⏰' : '📅'}
        </div>
        <div>
          <p class="text-sm font-black text-slate-800">
            Jadwal Khusus
            {#if specialRule.type === 'wfa'} · Mode WFA{/if}
            {#if specialRule.type === 'custom_time' && specialRule.start_time} · Masuk {specialRule.start_time}{/if}
          </p>
          {#if specialRule.note}<p class="text-xs font-bold text-slate-500 mt-0.5">{specialRule.note}</p>{/if}
        </div>
      </div>
    {/if}

    <!-- Legend -->
    <div class="flex flex-wrap gap-4 px-2 font-bold">
      {#each [
        { color: 'bg-green-400 border-green-600', label: 'Clock In & Out' },
        { color: 'bg-orange-400 border-orange-600', label: 'Hanya Clock In' },
        { color: 'bg-slate-200 border-slate-300', label: 'Tidak hadir' },
      ] as l}
        <div class="flex items-center gap-2">
          <div class="w-3.5 h-3.5 rounded-lg border-2 {l.color} shadow-xs"></div>
          <span class="text-xs font-bold text-slate-500">{l.label}</span>
        </div>
      {/each}
    </div>

    <!-- Grid -->
    <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
      <div class="grid bg-slate-50 border-b-2 border-slate-100 p-4"
           style="grid-template-columns: 1fr {activeSessions.map(() => 'auto').join(' ')}">
        <span class="text-xs font-black text-slate-500 uppercase tracking-wider">Pengguna</span>
        {#each activeSessions as s}
          <span class="text-xs font-black text-slate-500 uppercase tracking-wider text-center w-16">{s.label}</span>
        {/each}
      </div>
      {#if filtered.length === 0}
        <div class="py-16 text-center"><p class="text-sm font-black text-slate-400">Tidak ada pengguna</p></div>
      {:else}
        <div class="divide-y divide-slate-100">
        {#each paginated as u}
          {@const userAtt = getUserAtt(u.id)}
          {@const userLeaves = allLeaves.filter(l => l.user_id === u.id && l.date === attendanceDate && l.status !== 'rejected')}
          <div role="button" tabindex="0" onclick={() => selectedDetailUser = u} onkeydown={(e) => e.key === 'Enter' && (selectedDetailUser = u)}
               class="grid items-center p-4 hover:bg-slate-50/80 transition-colors cursor-pointer text-left"
               style="grid-template-columns: 1fr {activeSessions.map(() => 'auto').join(' ')}; gap: 12px;">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white overflow-hidden shadow-sm border border-orange-300"
                   style="background:linear-gradient(135deg,#F97316,#EA580C)">
                {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{u.full_name}</p>
                <p class="text-[10px] font-bold text-slate-400">{u.position || 'Anggota'}</p>
              </div>
            </div>
            {#each activeSessions as s}
              {@const att = userAtt.find(a => a.session_id === s.id)}
              {@const leave = userLeaves.find(l => l.session_id === null || l.session_id === s.id)}
              <div class="w-16 text-center flex items-center justify-center">
                {#if att?.clock_out}
                  <div class="flex flex-col items-center gap-1 bg-green-50 border-2 border-green-200 p-1.5 rounded-xl w-full">
                    <div class="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center shadow-xs"><CheckCircle2 size={14} class="text-white" /></div>
                    <span class="text-[10px] text-green-700 font-black leading-none">{formatTime(att.clock_in)}</span>
                  </div>
                {:else if att?.clock_in}
                  <div class="flex flex-col items-center gap-1 bg-orange-50 border-2 border-orange-200 p-1.5 rounded-xl w-full">
                    <div class="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center shadow-xs"><Clock size={14} class="text-white" /></div>
                    <span class="text-[10px] text-orange-700 font-black leading-none">{formatTime(att.clock_in)}</span>
                  </div>
                {:else if leave}
                  <div class="w-10 h-10 rounded-xl border-2 {leave.type === 'sakit' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-orange-50 text-orange-500 border-orange-200'} flex items-center justify-center shadow-xs" title="{leave.type} ({leave.status})">
                    <FileText size={16} />
                  </div>
                {:else}
                  <div class="w-10 h-10 rounded-xl border-2 {dateIsHoliday || dateIsFriday ? 'bg-amber-50 border-amber-200 text-base' : 'bg-slate-50 border-slate-200'} flex items-center justify-center shadow-xs">
                    {#if dateIsHoliday || dateIsFriday}<span>🎉</span>{:else}<X size={14} class="text-slate-300" />{/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
        </div>
      {/if}
    </div>


  {:else if mode === 'monthly'}
    <!-- Monthly Recap -->
    <div class="relative">
      <Calendar size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="month" bind:value={attendanceMonth}
             class="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 text-sm font-bold bg-white text-slate-700 focus:outline-none focus:border-orange-500 transition-all shadow-xs cursor-pointer" />
    </div>

    <!-- Holidays in this month -->
    {@const monthHolidays = holidays.filter(h => h.date.startsWith(attendanceMonth))}
    {#if monthHolidays.length > 0}
      <div class="bg-amber-50 border-2 border-b-[6px] border-amber-200 rounded-2xl p-4 shadow-xs">
        <p class="text-xs font-black text-amber-800 mb-2.5 uppercase tracking-wider">Hari Libur Bulan Ini</p>
        <div class="flex flex-wrap gap-2">
          {#each monthHolidays as h}
            <span class="text-xs font-black px-3.5 py-1.5 rounded-xl bg-white border-2 border-b-[4px] border-amber-200 text-amber-800 shadow-xs leading-none">
              {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {h.name}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
      <div class="p-4 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
        <span class="text-xs font-black text-slate-500 uppercase tracking-wider">Pengguna</span>
        <span class="text-xs font-black text-slate-500 uppercase tracking-wider">Hadir / Kerja / Telat</span>
      </div>
      {#if filtered.length === 0}
        <div class="py-16 text-center"><p class="text-sm font-black text-slate-400">Tidak ada pengguna</p></div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {#each paginated as u}
            {@const stat = getMonthlyAttendanceStat(u.id, attendanceMonth, monthlyAttendance, holidays)}
            <div class="p-5 hover:bg-slate-50/80 transition-colors border-b border-slate-100 flex flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white overflow-hidden shadow-sm border border-orange-300"
                       style="background:linear-gradient(135deg,#F97316,#EA580C)">
                    {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{u.full_name}</p>
                    <p class="text-[10px] font-bold text-slate-400">{u.position || 'Anggota'}</p>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-base font-black text-slate-800">{stat.totalPresentDays}<span class="text-xs font-bold text-slate-400">/{stat.totalWorkingDays}hr</span></p>
                  {#if stat.totalLate > 0}
                    <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-600 inline-block mt-0.5">{stat.totalLate}× telat</span>
                  {/if}
                </div>
              </div>
              <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
                <div class="h-full rounded-full transition-all"
                     style="width:{Math.min(stat.presentRate,100)}%; background:{stat.presentRate>=80?'linear-gradient(90deg,#22C55E,#34D399)':stat.presentRate>=50?'linear-gradient(90deg,#F59E0B,#FBBF24)':'linear-gradient(90deg,#EF4444,#F87171)'}"></div>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-slate-400">Tingkat Kehadiran</span>
                <span class="text-xs font-black px-2 py-0.5 rounded-lg border {stat.presentRate>=80?'bg-green-50 text-green-600 border-green-200':stat.presentRate>=50?'bg-amber-50 text-amber-600 border-amber-200':'bg-red-50 text-red-600 border-red-200'}">{stat.presentRate}%</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if mode === 'leaves'}
    <!-- Leave Approvals -->

    <!-- Status filter tabs -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {#each (['pending', 'approved', 'rejected', 'all'] as const) as f}
        {@const count = f === 'all' ? allLeaves.length : allLeaves.filter(l => l.status === f).length}
        <button onclick={() => leavesFilter = f}
                class="px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 flex-shrink-0 active:translate-y-0.5 border-2 {leavesFilter === f ? 'bg-orange-100 text-orange-600 border-b-[4px] border-orange-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}"
                style="font-family:'Plus Jakarta Sans',sans-serif;">
          <span>{LEAVE_FILTER_LABELS[f]}</span>
          {#if count > 0}
            <span class="rounded-full px-2 py-0.5 text-[10px] font-black leading-none border {leavesFilter === f ? 'bg-orange-500 text-white border-orange-700 shadow-xs' : 'bg-slate-100 text-slate-500 border-slate-300'}">
              {count}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
      {#if filteredLeaves.length === 0}
        <div class="py-20 text-center">
          <p class="text-sm font-black text-slate-400">
            {leavesFilter === 'pending' ? 'Tidak ada pengajuan yang menunggu' : 'Tidak ada data untuk filter ini'}
          </p>
        </div>
      {:else}
        <div class="divide-y divide-slate-100">
          {#each paginatedLeaves as leave}
            {@const leaveUser = allUsers.find(u => u.id === leave.user_id)}
            {#if leaveUser}
              <div class="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100">
                <div class="flex items-start gap-4 min-w-0 flex-1">
                  <div class="w-12 h-12 rounded-2xl border-2 {leave.type === 'sakit' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-orange-50 text-orange-500 border-orange-200'} flex items-center justify-center flex-shrink-0 shadow-xs">
                    <FileText size={22} />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <p class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{leaveUser.full_name}</p>
                      <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full border text-white uppercase tracking-wider shadow-xs {leave.status === 'approved' ? 'bg-green-500 border-green-700' : leave.status === 'rejected' ? 'bg-red-500 border-red-700' : 'bg-amber-500 border-amber-700'}">
                        {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2.5 flex-wrap">
                      <span class="capitalize px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-black">{leave.type}</span>
                      <span class="text-slate-300">·</span>
                      <span>{new Date(leave.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {#if leave.session_id !== null}
                        <span class="text-slate-300">·</span>
                        <span class="font-black text-slate-700">Sesi {SESSIONS.find(s => s.id === leave.session_id)?.label}</span>
                      {/if}
                    </div>
                    <div class="bg-slate-50 border-2 border-slate-200/80 p-3.5 rounded-2xl shadow-inner">
                      <p class="text-sm font-medium text-slate-700 italic">"{leave.reason}"</p>
                    </div>
                    {#if leave.status === 'rejected' && leave.rejection_note}
                      <div class="mt-3 bg-red-50 border-2 border-red-200 rounded-2xl p-3.5 shadow-inner">
                        <p class="text-xs font-black text-red-600 mb-1 uppercase tracking-wider">Alasan Penolakan:</p>
                        <p class="text-sm font-medium text-red-700 italic">"{leave.rejection_note}"</p>
                      </div>
                    {/if}
                  </div>
                </div>

                {#if leave.status === 'pending'}
                  <div class="flex items-center gap-3 md:self-center w-full md:w-auto justify-end flex-shrink-0 pt-2 md:pt-0">
                    <button onclick={() => onUpdateLeave(leave, 'rejected')}
                            class="flex-1 md:flex-initial px-5 py-3 rounded-2xl text-xs font-black text-red-600 bg-white border-2 border-b-[4px] border-red-200 hover:bg-red-50 hover:border-red-300 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                      <XCircle size={16} /> Tolak
                    </button>
                    <button onclick={() => onUpdateLeave(leave, 'approved')}
                            class="flex-1 md:flex-initial px-5 py-3 rounded-2xl text-xs font-black text-white bg-green-500 border-2 border-b-[4px] border-green-700 hover:bg-green-600 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                      <Check size={16} /> Setujui
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        <!-- Leaves pagination -->
        {#if leavesTotalPages > 1}
          <div class="p-4 border-t-2 border-slate-100 flex items-center justify-between bg-slate-50/50 font-bold">
            <button onclick={() => leavesPage = Math.max(1, leavesPage - 1)} disabled={leavesPage === 1}
                    class="w-10 h-10 rounded-xl flex items-center justify-center bg-white border-2 border-b-[4px] border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <div class="flex items-center gap-1.5 font-black">
              {#each Array.from({ length: leavesTotalPages }, (_, i) => i + 1) as p}
                {#if leavesTotalPages <= 7 || p === 1 || p === leavesTotalPages || Math.abs(p - leavesPage) <= 1}
                  <button onclick={() => leavesPage = p}
                          class="w-10 h-10 rounded-xl text-xs font-black transition-all cursor-pointer border-2 {leavesPage === p ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
                    {p}
                  </button>
                {:else if Math.abs(p - leavesPage) === 2}
                  <span class="text-slate-400 text-sm font-black px-1">…</span>
                {/if}
              {/each}
            </div>
            <button onclick={() => leavesPage = Math.min(leavesTotalPages, leavesPage + 1)} disabled={leavesPage === leavesTotalPages}
                    class="w-10 h-10 rounded-xl flex items-center justify-center bg-white border-2 border-b-[4px] border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- User list pagination (daily & monthly) -->
  {#if totalPages > 1 && mode !== 'leaves'}
    <div class="p-4 bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 flex items-center justify-between font-bold">
      <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
              class="px-5 py-2.5 rounded-xl text-xs font-black bg-white border-2 border-b-[4px] border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">← Sebelumnya</button>
      <span class="text-xs font-black text-slate-500 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 uppercase tracking-wider">Hal {page} / {totalPages}</span>
      <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
              class="px-5 py-2.5 rounded-xl text-xs font-black bg-white border-2 border-b-[4px] border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">Berikutnya →</button>
    </div>
  {/if}
</div>

{#if selectedDetailUser}
  <AttendanceDetailModal
    user={selectedDetailUser}
    attendance={getUserAtt(selectedDetailUser.id)}
    leaves={allLeaves.filter(l => l.user_id === selectedDetailUser!.id && l.date === attendanceDate)}
    date={attendanceDate}
    onClose={() => selectedDetailUser = null}
  />
{/if}
