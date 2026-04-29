  import { CalendarDays, Plus, Trash2, Settings, X, CalendarCheck, CalendarOff, Calendar, Home, Clock, FileText, ClipboardList, PartyPopper } from 'lucide-svelte'

  interface Props {
    holidays: Holiday[]
    thursdayRules: ThursdayRule[]
    onAddHoliday: () => void
    onDeleteHoliday: (h: Holiday) => void
    onManageThursday: () => void
    onDeleteThursdayRule: (r: ThursdayRule) => void
  }
  let { holidays, thursdayRules, onAddHoliday, onDeleteHoliday, onManageThursday, onDeleteThursdayRule } = $props<Props>()

  const todayISO = new Date().toISOString().split('T')[0]

  let sorted = $derived([...holidays].sort((a, b) => a.date.localeCompare(b.date)))
  let sortedRules = $derived([...thursdayRules].sort((a, b) => a.date.localeCompare(b.date)))

  function isUpcoming(date: string) {
    const diff = (new Date(date).getTime() - new Date(todayISO).getTime()) / 86400000
    return diff >= 0 && diff <= 14
  }

  const TYPE_STYLE: Record<ThursdayRule['type'], { label: string; bg: string; text: string; Icon: any }> = {
    normal:      { label: 'Normal',      bg: 'bg-slate-100',  text: 'text-slate-600', Icon: Calendar },
    custom_time: { label: 'Custom Jam',  bg: 'bg-amber-100',  text: 'text-amber-700', Icon: Clock },
    wfa:         { label: 'WFA',         bg: 'bg-blue-100',   text: 'text-blue-700',  Icon: Home },
  }

  // Section active state
  let activeSection = $state<'holidays' | 'thursday'>('holidays')
</script>

<div class="flex flex-col gap-4">
  <!-- Sub-tab selector -->
  <div class="flex gap-2 bg-slate-100 rounded-xl p-1">
    <button onclick={() => activeSection = 'holidays'}
            class="flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            class:text-white={activeSection === 'holidays'}
            style={activeSection === 'holidays' ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent; color:#64748B'}>
      <Calendar size={13} /> Hari Libur ({sorted.length})
    </button>
    <button onclick={() => activeSection = 'thursday'}
            class="flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            class:text-white={activeSection === 'thursday'}
            style={activeSection === 'thursday' ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:transparent; color:#64748B'}>
      <Settings size={13} /> Aturan Kamis ({thursdayRules.length})
    </button>
  </div>

  <!-- ══ HARI LIBUR ══ -->
  {#if activeSection === 'holidays'}
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Hari Libur Terdaftar</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Jumat otomatis libur. Di sini untuk libur tambahan/mendadak.</p>
      </div>
      <button onclick={onAddHoliday}
              class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer shadow-sm"
              style="background:linear-gradient(135deg,#F97316,#EA580C)">
        <Plus size={14} /> Tambah
      </button>
    </div>

    <!-- Info box -->
    <div class="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
      <CalendarCheck size={16} class="text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p class="text-xs font-semibold text-blue-700">Cara Kerja</p>
        <p class="text-[11px] text-blue-600 mt-0.5 leading-relaxed">
          <strong>Jumat</strong> otomatis libur setiap minggu. Tambahkan hari libur di sini untuk libur mendadak, hari besar, atau cuti bersama.
          Hari libur tidak dihitung sebagai hari kerja pada rekap kehadiran.
        </p>
      </div>
    </div>

    {#if sorted.length === 0}
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 py-16 text-center">
        <CalendarOff size={32} class="text-slate-200 mx-auto mb-3" />
        <p class="text-sm font-semibold text-slate-400">Belum ada hari libur tambahan</p>
        <p class="text-xs text-slate-300 mt-1">Libur Jumat sudah otomatis tercatat</p>
        <button onclick={onAddHoliday}
                class="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          + Tambah Sekarang
        </button>
      </div>
    {:else}
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500">{sorted.length} hari libur terdaftar</span>
          <span class="text-[10px] text-slate-400">{sorted.filter(h => h.date >= todayISO).length} mendatang</span>
        </div>
        {#each sorted as h}
          {@const isPast   = h.date < todayISO}
          {@const isToday  = h.date === todayISO}
          {@const upcoming = isUpcoming(h.date)}
          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0
                      {isToday ? 'bg-amber-50' : isPast ? 'opacity-60' : ''} hover:bg-slate-50 transition-colors">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                 style="{isToday ? 'background:linear-gradient(135deg,#F59E0B,#D97706)' : isPast ? 'background:#F1F5F9; color:#94A3B8' : 'background:linear-gradient(135deg,#F97316,#EA580C)'}">
              {#if isToday}
                <PartyPopper size={20} />
              {:else}
                <CalendarDays size={20} />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                {#if isToday}
                  <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">HARI INI</span>
                {:else if upcoming && !isPast}
                  <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 flex-shrink-0">SOON</span>
                {/if}
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                {new Date(h.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button onclick={() => onDeleteHoliday(h)}
                    class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        {/each}
      </div>
    {/if}

  <!-- ══ ATURAN KAMIS ══ -->
  {:else}
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Aturan Jadwal Kamis</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Kamis hanya sesi Pagi. Atur waktu atau mode WFA per-minggu.</p>
      </div>
      <button onclick={onManageThursday}
              class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer shadow-sm"
              style="background:linear-gradient(135deg,#F97316,#EA580C)">
        <Settings size={14} /> Atur Kamis
      </button>
    </div>

    <!-- Info box -->
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
      <div class="flex items-center gap-2 mb-1">
        <ClipboardList size={14} class="text-slate-500" />
        <p class="text-xs font-bold text-slate-600">Aturan Kamis Default</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <p class="text-[11px] text-slate-500">Sesi Pagi (mulai 08:00) — <strong>aktif</strong></p>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          <p class="text-[11px] text-slate-500">Sesi Siang, Sore, Lembur — <strong>libur otomatis</strong></p>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
          <p class="text-[11px] text-slate-500">Validasi GPS <strong>tetap aktif</strong> kecuali jika diset WFA</p>
        </div>
      </div>
    </div>

    {#if sortedRules.length === 0}
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 py-16 text-center">
        <Settings size={32} class="text-slate-200 mx-auto mb-3" />
        <p class="text-sm font-semibold text-slate-400">Belum ada aturan khusus Kamis</p>
        <p class="text-xs text-slate-300 mt-1">Semua Kamis mengikuti jadwal default</p>
        <button onclick={onManageThursday}
                class="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          + Atur Kamis Ini
        </button>
      </div>
    {:else}
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500">{sortedRules.length} aturan dikonfigurasi</span>
          <span class="text-[10px] text-slate-400">{sortedRules.filter(r => r.date >= todayISO).length} mendatang</span>
        </div>
        {#each sortedRules as rule}
          {@const ts = TYPE_STYLE[rule.type]}
          {@const isPast  = rule.date < todayISO}
          {@const isToday = rule.date === todayISO}
          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0
                      {isToday ? 'bg-orange-50' : isPast ? 'opacity-60' : ''} hover:bg-slate-50 transition-colors">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                 class:!text-slate-400={isPast && !isToday}
                 class:bg-slate-100={isPast && !isToday}
                 style={!isPast || isToday ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
              <ts.Icon size={20} />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-slate-800">
                  {new Date(rule.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full {ts.bg} {ts.text}">{ts.label}</span>
                {#if isToday}<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">HARI INI</span>{/if}
              </div>
              {#if rule.type === 'custom_time' && rule.start_time}
                <p class="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                  <Clock size={10} /> Masuk jam {rule.start_time}
                </p>
              {/if}
              {#if rule.note}
                <p class="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                  <FileText size={10} /> {rule.note}
                </p>
              {/if}
            </div>
            <button onclick={() => onDeleteThursdayRule(rule)}
                    class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
