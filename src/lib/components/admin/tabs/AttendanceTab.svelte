<script lang="ts">
  import type { Profile, AttendanceRecord, Holiday, ThursdayRule } from '$lib/components/admin/_types'
  import { getInitials, formatTime, getMonthlyAttendanceStat, getHolidayName, isHoliday, isThursday, isFriday, getThursdayRule, SESSIONS } from '$lib/components/admin/_utils'
  import { Search, CalendarDays, Calendar, CheckCircle2, Clock, X } from 'lucide-svelte'

  interface Props {
    allUsers: Profile[]
    allAttendance: AttendanceRecord[]
    holidays: Holiday[]
    thursdayRules: ThursdayRule[]
  }
  let { allUsers, allAttendance, holidays, thursdayRules } = $props<Props>()

  const ITEMS_PER_PAGE = 10
  let mode           = $state<'daily' | 'monthly'>('daily')
  let attendanceDate = $state(new Date().toISOString().split('T')[0])
  let attendanceMonth= $state(new Date().toISOString().slice(0, 7))
  let userSearch     = $state('')
  let page           = $state(1)

  let filtered   = $derived(allUsers.filter(u =>
    !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.position?.toLowerCase().includes(userSearch.toLowerCase())
  ))
  let paginated  = $derived(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE))
  let totalPages = $derived(Math.ceil(filtered.length / ITEMS_PER_PAGE))

  let attendByDate    = $derived(allAttendance.filter(a => a.date === attendanceDate))
  let presentCount    = $derived(new Set(attendByDate.map(a => a.user_id)).size)
  let dateIsHoliday   = $derived(isHoliday(attendanceDate, holidays))
  let holidayName     = $derived(getHolidayName(attendanceDate, holidays))
  let dateIsThursday  = $derived(isThursday(attendanceDate))
  let dateIsFriday    = $derived(isFriday(attendanceDate))
  let thursdayRule    = $derived(getThursdayRule(attendanceDate, thursdayRules))
  // Sesi yang tampil: Kamis hanya sesi 1 (Pagi), hari lain semua sesi
  let activeSessions  = $derived(dateIsThursday ? SESSIONS.slice(0, 1) : SESSIONS)

  $effect(() => { userSearch; attendanceDate; attendanceMonth; mode; page = 1 })

  function getUserAtt(userId: string) { return attendByDate.filter(a => a.user_id === userId) }
</script>

<div class="flex flex-col gap-3">
  <!-- Mode Toggle -->
  <div class="flex gap-2">
    {#each [{ val: 'daily', label: '📅 Harian' }, { val: 'monthly', label: '📊 Rekap Bulanan' }] as m}
      <button onclick={() => mode = m.val as any}
              class="flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              class:text-white={mode === m.val} class:bg-slate-100={mode !== m.val} class:text-slate-500={mode !== m.val}
              style={mode === m.val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
        {m.label}
      </button>
    {/each}
  </div>

  <!-- Search -->
  <div class="relative">
    <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input bind:value={userSearch} placeholder="Cari nama pengguna..."
           class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
  </div>

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

    <!-- Thursday banner -->
    {#if dateIsThursday}
      <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
           class:bg-amber-50={thursdayRule?.type === 'custom_time'}
           class:border-amber-200={thursdayRule?.type === 'custom_time'}
           class:bg-blue-50={thursdayRule?.type === 'wfa'}
           class:border-blue-200={thursdayRule?.type === 'wfa'}
           class:bg-orange-50={!thursdayRule || thursdayRule.type === 'normal'}
           class:border-orange-200={!thursdayRule || thursdayRule.type === 'normal'}>
        <span class="text-sm">{thursdayRule?.type === 'wfa' ? '🏠' : thursdayRule?.type === 'custom_time' ? '⏰' : '📅'}</span>
        <div>
          <p class="text-xs font-semibold text-slate-700">
            Hari Kamis — Hanya Sesi Pagi
            {#if thursdayRule?.type === 'wfa'} · Mode WFA{/if}
            {#if thursdayRule?.type === 'custom_time' && thursdayRule.start_time} · Masuk {thursdayRule.start_time}{/if}
          </p>
          {#if thursdayRule?.note}<p class="text-[10px] text-slate-400 mt-0.5">{thursdayRule.note}</p>{/if}
        </div>
      </div>
    {/if}

    <!-- Legend -->
    <div class="flex gap-3 px-1">
      {#each [
        { color: 'bg-green-400', label: 'Check-in & out' },
        { color: 'bg-orange-400', label: 'Hanya check-in' },
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
          <div class="grid items-center px-4 py-3 border-b border-slate-50 last:border-0"
               style="grid-template-columns: 1fr {activeSessions.map(() => 'auto').join(' ')}; gap: 8px;">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white overflow-hidden"
                   style="background:linear-gradient(135deg,#F97316,#EA580C)">
                {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-700 truncate">{u.full_name}</p>
                <p class="text-[9px] text-slate-400">{u.position || 'Karyawan'}</p>
              </div>
            </div>
            {#each activeSessions as s}
              {@const att = userAtt.find(a => a.session_id === s.id)}
              <div class="w-14 text-center">
                {#if att?.check_out}
                  <div class="flex flex-col items-center gap-0.5">
                    <div class="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 size={11} class="text-green-600" /></div>
                    <span class="text-[8px] text-green-600 font-medium">{formatTime(att.check_in)}</span>
                  </div>
                {:else if att?.check_in}
                  <div class="flex flex-col items-center gap-0.5">
                    <div class="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center"><Clock size={11} class="text-orange-500" /></div>
                    <span class="text-[8px] text-orange-500 font-medium">{formatTime(att.check_in)}</span>
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


  {:else}
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
            {@const stat = getMonthlyAttendanceStat(u.id, attendanceMonth, allAttendance, holidays)}
            <div class="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <div class="flex items-center justify-between gap-3 mb-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white overflow-hidden"
                       style="background:linear-gradient(135deg,#F97316,#EA580C)">
                    {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                    <p class="text-[10px] text-slate-400">{u.position || 'Karyawan'}</p>
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
  {/if}

  {#if totalPages > 1}
    <div class="px-4 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Prev</button>
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hal {page} / {totalPages}</span>
      <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Next</button>
    </div>
  {/if}
</div>
