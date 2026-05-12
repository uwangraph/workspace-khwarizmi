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

<div class="flex flex-col gap-3">
  <!-- Mode Toggle -->
  <div class="flex gap-2 bg-slate-100 rounded-xl p-1">
    <button onclick={() => mode = 'daily'}
            class="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            class:text-white={mode === 'daily'} class:bg-slate-100={mode !== 'daily'} class:text-slate-500={mode !== 'daily'}
            style={mode === 'daily' ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent'}>
      <CalendarDays size={14} /> Harian
    </button>
    <button onclick={() => mode = 'monthly'}
            class="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            class:text-white={mode === 'monthly'} class:bg-slate-100={mode !== 'monthly'} class:text-slate-500={mode !== 'monthly'}
            style={mode === 'monthly' ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent'}>
      <BarChart3 size={14} /> Bulanan
    </button>
    <button onclick={() => mode = 'leaves'}
            class="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative"
            class:text-white={mode === 'leaves'} class:bg-slate-100={mode !== 'leaves'} class:text-slate-500={mode !== 'leaves'}
            style={mode === 'leaves' ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent'}>
      <FileText size={14} /> Persetujuan Izin
      {#if pendingLeavesCount > 0}
        <span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm shadow-red-500/30 border-2 border-white min-w-[20px] flex items-center justify-center">
          {pendingLeavesCount}
        </span>
      {/if}
    </button>
  </div>

  {#if mode !== 'leaves'}
    <!-- Search -->
  <div class="relative">
    <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input bind:value={userSearch} placeholder="Cari nama pengguna..."
           class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </div>
  {/if}

  {#if mode === 'daily'}
    <!-- Date picker + count -->
    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <CalendarDays size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="date" bind:value={attendanceDate}
               class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-lg font-black text-orange-500" style="font-family:'Plus Jakarta Sans',sans-serif;">{presentCount}</p>
        <p class="text-[9px] text-slate-400 font-semibold">hadir</p>
      </div>
    </div>

    <!-- Friday banner -->
    {#if dateIsFriday}
      <div class="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
        <span class="text-sm">🕌</span>
        <p class="text-xs font-semibold text-violet-700">Hari Jumat — Libur Mingguan</p>
      </div>
    {/if}

    <!-- Holiday badge -->
    {#if dateIsHoliday}
      <div class="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
        <span class="text-sm">🎉</span>
        <p class="text-xs font-semibold text-amber-700">Hari Libur: {holidayName}</p>
      </div>
    {/if}

    <!-- Special Rule banner -->
    {#if specialRule}
      <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
           class:bg-amber-50={specialRule.type === 'custom_time'}
           class:border-amber-200={specialRule.type === 'custom_time'}
           class:bg-blue-50={specialRule.type === 'wfa'}
           class:border-blue-200={specialRule.type === 'wfa'}
           class:bg-orange-50={specialRule.type === 'normal'}
           class:border-orange-200={specialRule.type === 'normal'}>
        <span class="text-sm">{specialRule.type === 'wfa' ? '🏠' : specialRule.type === 'custom_time' ? '⏰' : '📅'}</span>
        <div>
          <p class="text-xs font-semibold text-slate-700">
            Jadwal Khusus
            {#if specialRule.type === 'wfa'} · Mode WFA{/if}
            {#if specialRule.type === 'custom_time' && specialRule.start_time} · Masuk {specialRule.start_time}{/if}
          </p>
          {#if specialRule.note}<p class="text-[10px] text-slate-400 mt-0.5">{specialRule.note}</p>{/if}
        </div>
      </div>
    {/if}

    <!-- Legend -->
    <div class="flex gap-3 px-1">
      {#each [
        { color: 'bg-green-400', label: 'Clock In & Out' },
        { color: 'bg-orange-400', label: 'Hanya Clock In' },
        { color: 'bg-slate-300', label: 'Tidak hadir' },
      ] as l}
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full {l.color}"></div>
          <span class="text-[10px] text-slate-400">{l.label}</span>
        </div>
      {/each}
    </div>

    <!-- Grid -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="grid bg-slate-50 border-b border-slate-100 px-4 py-2.5"
           style="grid-template-columns: 1fr {activeSessions.map(() => 'auto').join(' ')}">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengguna</span>
        {#each activeSessions as s}
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-14">{s.label}</span>
        {/each}
      </div>
      {#if filtered.length === 0}
        <div class="py-10 text-center"><p class="text-xs text-slate-400">Tidak ada pengguna</p></div>
      {:else}
        {#each paginated as u}
          {@const userAtt = getUserAtt(u.id)}
          {@const userLeaves = allLeaves.filter(l => l.user_id === u.id && l.date === attendanceDate && l.status !== 'rejected')}
          <div role="button" tabindex="0" onclick={() => selectedDetailUser = u} onkeydown={(e) => e.key === 'Enter' && (selectedDetailUser = u)}
               class="grid items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer text-left"
               style="grid-template-columns: 1fr {activeSessions.map(() => 'auto').join(' ')}; gap: 8px;">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white overflow-hidden"
                   style="background:linear-gradient(135deg,#F97316,#EA580C)">
                {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-700 truncate">{u.full_name}</p>
                <p class="text-[9px] text-slate-400">{u.position || 'Anggota'}</p>
              </div>
            </div>
            {#each activeSessions as s}
              {@const att = userAtt.find(a => a.session_id === s.id)}
              {@const leave = userLeaves.find(l => l.session_id === null || l.session_id === s.id)}
              <div class="w-14 text-center">
                {#if att?.clock_out}
                  <div class="flex flex-col items-center gap-0.5">
                    <div class="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 size={11} class="text-green-600" /></div>
                    <span class="text-[8px] text-green-600 font-medium">{formatTime(att.clock_in)}</span>
                  </div>
                {:else if att?.clock_in}
                  <div class="flex flex-col items-center gap-0.5">
                    <div class="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center"><Clock size={11} class="text-orange-500" /></div>
                    <span class="text-[8px] text-orange-500 font-medium">{formatTime(att.clock_in)}</span>
                  </div>
                {:else if leave}
                  <div class="flex justify-center">
                    <div class="w-5 h-5 rounded-full {leave.type === 'sakit' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} flex items-center justify-center" title="{leave.type} ({leave.status})">
                      <FileText size={10} />
                    </div>
                  </div>
                {:else}
                  <div class="flex justify-center">
                    <div class="w-5 h-5 rounded-full {dateIsHoliday || dateIsFriday ? 'bg-amber-50' : 'bg-slate-100'} flex items-center justify-center">
                      {#if dateIsHoliday || dateIsFriday}<span class="text-[8px]">🎉</span>{:else}<X size={9} class="text-slate-400" />{/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </div>


  {:else if mode === 'monthly'}
    <!-- Monthly Recap -->
    <div class="relative">
      <Calendar size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="month" bind:value={attendanceMonth}
             class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </div>

    <!-- Holidays in this month -->
    {@const monthHolidays = holidays.filter(h => h.date.startsWith(attendanceMonth))}
    {#if monthHolidays.length > 0}
      <div class="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
        <p class="text-[10px] font-bold text-amber-700 mb-1.5 uppercase tracking-wider">Hari Libur Bulan Ini</p>
        <div class="flex flex-wrap gap-1.5">
          {#each monthHolidays as h}
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {h.name}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengguna</span>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hadir / Kerja / Telat</span>
      </div>
      {#if filtered.length === 0}
        <div class="py-10 text-center"><p class="text-xs text-slate-400">Tidak ada pengguna</p></div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {#each paginated as u}
            {@const stat = getMonthlyAttendanceStat(u.id, attendanceMonth, monthlyAttendance, holidays)}
            <div class="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <div class="flex items-center justify-between gap-3 mb-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white overflow-hidden"
                       style="background:linear-gradient(135deg,#F97316,#EA580C)">
                    {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                    <p class="text-[10px] text-slate-400">{u.position || 'Anggota'}</p>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-sm font-black text-slate-700">{stat.totalPresentDays}<span class="text-[10px] text-slate-400 font-medium">/{stat.totalWorkingDays}hr</span></p>
                  {#if stat.totalLate > 0}
                    <p class="text-[10px] font-bold text-red-500">{stat.totalLate}× telat</p>
                  {/if}
                </div>
              </div>
              <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                     style="width:{Math.min(stat.presentRate,100)}%; background:{stat.presentRate>=80?'linear-gradient(90deg,#22C55E,#34D399)':stat.presentRate>=50?'linear-gradient(90deg,#F59E0B,#FBBF24)':'linear-gradient(90deg,#EF4444,#F87171)'}"></div>
              </div>
              <div class="flex justify-between mt-1">
                <span class="text-[9px] text-slate-400">Kehadiran</span>
                <span class="text-[9px] font-bold {stat.presentRate>=80?'text-green-500':stat.presentRate>=50?'text-amber-500':'text-red-500'}">{stat.presentRate}%</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if mode === 'leaves'}
    <!-- Leave Approvals -->

    <!-- Status filter tabs -->
    <div class="flex gap-1.5 bg-slate-100 rounded-xl p-1">
      {#each (['pending', 'approved', 'rejected', 'all'] as const) as f}
        {@const count = f === 'all' ? allLeaves.length : allLeaves.filter(l => l.status === f).length}
        <button onclick={() => leavesFilter = f}
                class="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                class:text-white={leavesFilter === f} class:text-slate-500={leavesFilter !== f}
                style={leavesFilter === f ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent'}>
          {LEAVE_FILTER_LABELS[f]}
          {#if count > 0}
            <span class="rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none"
                  class:bg-white={leavesFilter === f} class:text-orange-500={leavesFilter === f}
                  class:bg-slate-200={leavesFilter !== f} class:text-slate-500={leavesFilter !== f}>
              {count}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {#if filteredLeaves.length === 0}
        <div class="py-10 text-center">
          <p class="text-xs text-slate-400">
            {leavesFilter === 'pending' ? 'Tidak ada pengajuan yang menunggu' : 'Tidak ada data untuk filter ini'}
          </p>
        </div>
      {:else}
        <div class="flex flex-col">
          {#each paginatedLeaves as leave}
            {@const leaveUser = allUsers.find(u => u.id === leave.user_id)}
            {#if leaveUser}
              <div class="px-4 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-start gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl {leave.type === 'sakit' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={16} />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p class="text-sm font-bold text-slate-800">{leaveUser.full_name}</p>
                      <span class="text-[9px] font-bold px-2 py-0.5 rounded-md text-white uppercase {leave.status === 'approved' ? 'bg-green-500' : leave.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}">
                        {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-slate-500 mb-1 flex-wrap">
                      <span class="capitalize font-semibold text-slate-600">{leave.type}</span>
                      <span>·</span>
                      <span>{new Date(leave.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {#if leave.session_id !== null}
                        <span>·</span>
                        <span class="font-semibold">Sesi {SESSIONS.find(s => s.id === leave.session_id)?.label}</span>
                      {/if}
                    </div>
                    <p class="text-xs text-slate-600 bg-white border border-slate-100 p-2 rounded-lg italic w-full">"{leave.reason}"</p>
                    {#if leave.status === 'rejected' && leave.rejection_note}
                      <div class="mt-1.5 bg-red-50 border border-red-100 rounded-lg p-2">
                        <p class="text-[10px] font-bold text-red-600 mb-0.5">Alasan Penolakan:</p>
                        <p class="text-xs text-red-500 italic">"{leave.rejection_note}"</p>
                      </div>
                    {/if}
                  </div>
                </div>

                {#if leave.status === 'pending'}
                  <div class="flex items-center gap-2 md:self-center ml-12 md:ml-0 flex-shrink-0">
                    <button onclick={() => onUpdateLeave(leave, 'rejected')}
                            class="px-3 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5 border border-red-100 cursor-pointer">
                      <XCircle size={13} /> Tolak
                    </button>
                    <button onclick={() => onUpdateLeave(leave, 'approved')}
                            class="px-3 py-2 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
                      <Check size={13} /> Setujui
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        <!-- Leaves pagination -->
        {#if leavesTotalPages > 1}
          <div class="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <button onclick={() => leavesPage = Math.max(1, leavesPage - 1)} disabled={leavesPage === 1}
                    class="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronLeft size={14} />
            </button>
            <div class="flex items-center gap-1">
              {#each Array.from({ length: leavesTotalPages }, (_, i) => i + 1) as p}
                {#if leavesTotalPages <= 7 || p === 1 || p === leavesTotalPages || Math.abs(p - leavesPage) <= 1}
                  <button onclick={() => leavesPage = p}
                          class="w-7 h-7 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          class:text-white={leavesPage === p}
                          style={leavesPage === p ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:#F1F5F9; color:#64748B'}>
                    {p}
                  </button>
                {:else if Math.abs(p - leavesPage) === 2}
                  <span class="text-slate-300 text-xs">…</span>
                {/if}
              {/each}
            </div>
            <button onclick={() => leavesPage = Math.min(leavesTotalPages, leavesPage + 1)} disabled={leavesPage === leavesTotalPages}
                    class="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronRight size={14} />
            </button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- User list pagination (daily & monthly) -->
  {#if totalPages > 1 && mode !== 'leaves'}
    <div class="px-4 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Prev</button>
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hal {page} / {totalPages}</span>
      <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Next</button>
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
