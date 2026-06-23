<script lang="ts">
  import type { Holiday, SpecialRule } from '../_types'
  import { CalendarDays, Plus, Trash2, Settings, X, CalendarCheck, CalendarOff, Calendar, Home, Clock, FileText, ClipboardList, PartyPopper, ArrowRight, Edit3 } from 'lucide-svelte'

  interface Props {
    holidays: Holiday[]
    specialRules: SpecialRule[]
    onAddHoliday: () => void
    onEditHoliday: (h: Holiday) => void
    onDeleteHoliday: (h: Holiday) => void
    onManageSpecial: (rule?: SpecialRule) => void
    onDeleteSpecialRule: (r: SpecialRule) => void
  }
  let { holidays, specialRules, onAddHoliday, onEditHoliday, onDeleteHoliday, onManageSpecial, onDeleteSpecialRule }: Props = $props()

  const todayISO = new Date().toISOString().split('T')[0]

  let sortedRules = $derived([...specialRules].sort((a, b) => a.date.localeCompare(b.date)))

  // Group consecutive holidays with the same name
  let groupedHolidays = $derived.by(() => {
    if (holidays.length === 0) return []
    const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date))
    const groups: { name: string; dates: string[]; originalHolidays: Holiday[] }[] = []
    
    sorted.forEach(h => {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.name === h.name) {
        const lastDate = new Date(lastGroup.dates[lastGroup.dates.length - 1])
        const currentDate = new Date(h.date)
        const diff = Math.round((currentDate.getTime() - lastDate.getTime()) / 86400000)
        if (diff === 1) {
          lastGroup.dates.push(h.date)
          lastGroup.originalHolidays.push(h)
          return
        }
      }
      groups.push({ name: h.name, dates: [h.date], originalHolidays: [h] })
    })
    return groups
  })

  function isUpcoming(date: string) {
    const diff = (new Date(date).getTime() - new Date(todayISO).getTime()) / 86400000
    return diff >= 0 && diff <= 14
  }

  function formatDisplayDate(dates: string[]) {
    if (dates.length === 1) {
      return new Date(dates[0]).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    const start = new Date(dates[0])
    const end = new Date(dates[dates.length - 1])
    
    const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${startStr} - ${endStr} (${dates.length} hari)`
  }

  const TYPE_STYLE: Record<SpecialRule['type'], { label: string; bg: string; text: string; border: string; Icon: any }> = {
    normal:      { label: 'Normal',      bg: 'bg-slate-100',  text: 'text-slate-700', border: 'border-slate-300', Icon: Calendar },
    custom_time: { label: 'Custom Jam',  bg: 'bg-amber-100',  text: 'text-amber-800', border: 'border-amber-300', Icon: Clock },
    wfa:         { label: 'WFA',         bg: 'bg-blue-100',   text: 'text-blue-800',  border: 'border-blue-300',  Icon: Home },
  }

  let activeSection = $state<'holidays' | 'thursday'>('holidays')
</script>

<div class="flex flex-col gap-6">
  <!-- Sub-tab selector -->
  <div class="flex flex-col md:flex-row gap-2 bg-slate-100/80 p-1.5 rounded-[24px] border-2 border-slate-200/60 shadow-inner">
    <button onclick={() => activeSection = 'holidays'}
            class="flex-1 py-3.5 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border-2 active:translate-y-0.5 {activeSection === 'holidays' ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-md' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60 hover:border-slate-200'}"
            style="font-family:'Plus Jakarta Sans',sans-serif;">
      <Calendar size={16} /> Hari Libur ({holidays.length})
    </button>
    <button onclick={() => activeSection = 'thursday'}
            class="flex-1 py-3.5 px-4 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 border-2 active:translate-y-0.5 {activeSection === 'thursday' ? 'bg-orange-500 text-white border-b-[4px] border-orange-700 shadow-md' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60 hover:border-slate-200'}"
            style="font-family:'Plus Jakarta Sans',sans-serif;">
      <Settings size={16} /> Jadwal Khusus ({specialRules.length})
    </button>
  </div>

  <!-- ══ HARI LIBUR ══ -->
  {#if activeSection === 'holidays'}
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
      <div>
        <p class="text-lg font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Hari Libur Terdaftar</p>
        <p class="text-xs font-bold text-slate-400 mt-0.5">Jumat otomatis libur. Di sini untuk libur tambahan/mendadak.</p>
      </div>
      <button onclick={onAddHoliday}
              class="px-5 py-3.5 rounded-2xl text-xs font-black text-white bg-orange-500 border-2 border-b-[4px] border-orange-700 hover:bg-orange-600 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs flex-shrink-0">
        <Plus size={16} /> Tambah Libur
      </button>
    </div>

    <!-- Info box -->
    <div class="flex items-start gap-4 bg-blue-50 border-2 border-b-[6px] border-blue-200 rounded-2xl p-5 shadow-xs">
      <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center border-2 border-blue-300 text-blue-600 flex-shrink-0">
        <CalendarCheck size={20} />
      </div>
      <div>
        <p class="text-sm font-black text-blue-900">Cara Kerja Hari Libur</p>
        <p class="text-xs font-medium text-blue-800 mt-1 leading-relaxed">
          <strong>Jumat</strong> otomatis libur setiap minggu. Tambahkan hari libur di sini untuk libur mendadak, hari besar, atau cuti bersama.
          Hari libur tidak dihitung sebagai hari kerja pada rekap kehadiran.
        </p>
      </div>
    </div>

    {#if groupedHolidays.length === 0}
      <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 p-16 text-center flex flex-col items-center justify-center">
        <div class="w-16 h-16 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center mb-4">
          <CalendarOff size={32} class="text-slate-400" />
        </div>
        <p class="text-base font-black text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Belum ada hari libur tambahan</p>
        <p class="text-xs font-bold text-slate-400 mt-1 mb-6">Libur rutin Jumat sudah otomatis tercatat di sistem</p>
        <button onclick={onAddHoliday}
                class="px-6 py-3.5 rounded-2xl text-xs font-black text-white bg-orange-500 border-2 border-b-[4px] border-orange-700 hover:bg-orange-600 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center gap-2 cursor-pointer shadow-xs">
          <Plus size={16} /> Tambah Libur Sekarang
        </button>
      </div>
    {:else}
      <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
        <div class="p-4 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between font-bold">
          <span class="text-xs font-black text-slate-500 uppercase tracking-wider">{holidays.length} Hari Libur Terdaftar</span>
          <span class="text-xs font-black text-orange-600 bg-white px-3 py-1 rounded-xl border border-slate-200">{holidays.filter(h => h.date >= todayISO).length} Mendatang</span>
        </div>
        <div class="divide-y divide-slate-100">
        {#each groupedHolidays as group}
          {@const isRange = group.dates.length > 1}
          {@const isPast  = group.dates[group.dates.length - 1] < todayISO}
          {@const isToday = group.dates.includes(todayISO)}
          {@const upcoming = group.dates.some(d => isUpcoming(d))}
          
          <div class="flex items-center gap-4 p-5 {isToday ? 'bg-amber-50/80' : isPast ? 'opacity-60 bg-slate-50/50' : ''} hover:bg-slate-50/80 transition-colors border-b border-slate-100">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-xs border"
                 style="{isToday ? 'background:linear-gradient(135deg,#F59E0B,#D97706); border-color:#B45309' : isPast ? 'background:#E2E8F0; color:#64748B; border-color:#CBD5E1' : 'background:linear-gradient(135deg,#F97316,#EA580C); border-color:#C2410C'}">
              {#if isToday}
                <PartyPopper size={24} class="animate-bounce" />
              {:else}
                <CalendarDays size={24} />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap mb-1">
                <p class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{group.name}</p>
                {#if isToday}
                  <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs flex-shrink-0 tracking-wider uppercase">HARI INI</span>
                {:else if upcoming && !isPast}
                  <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-700 shadow-xs flex-shrink-0 tracking-wider uppercase">SEGERA</span>
                {/if}
                {#if isRange}
                  <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-blue-800 shadow-xs flex-shrink-0 tracking-wider uppercase">RENTANG</span>
                {/if}
              </div>
              <p class="text-xs text-slate-500 font-bold flex items-center gap-2">
                {formatDisplayDate(group.dates)}
              </p>
            </div>
            
            <div class="flex items-center gap-2 flex-shrink-0">
              {#if !isRange}
                <button onclick={() => onEditHoliday(group.originalHolidays[0])}
                        class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border-2 border-b-[4px] border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center cursor-pointer shadow-xs">
                  <Edit3 size={16} />
                </button>
              {/if}
              
              {#if isRange}
                <button onclick={() => {
                  if (confirm(`Hapus seluruh rentang libur "${group.name}"?`)) {
                    group.originalHolidays.forEach(h => onDeleteHoliday(h))
                  }
                }}
                        class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border-2 border-b-[4px] border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center cursor-pointer shadow-xs">
                  <Trash2 size={16} />
                </button>
              {:else}
                <button onclick={() => onDeleteHoliday(group.originalHolidays[0])}
                        class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border-2 border-b-[4px] border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center cursor-pointer shadow-xs flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              {/if}
            </div>
          </div>
        {/each}
        </div>
      </div>
    {/if}

  <!-- ══ ATURAN KAMIS / JADWAL KHUSUS ══ -->
  {:else}
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
      <div>
        <p class="text-lg font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Aturan Jadwal Khusus</p>
        <p class="text-xs font-bold text-slate-400 mt-0.5">Atur WFA atau Jam Masuk khusus untuk tanggal tertentu (rapat, dsb).</p>
      </div>
      <button onclick={() => onManageSpecial()}
              class="px-5 py-3.5 rounded-2xl text-xs font-black text-white bg-orange-500 border-2 border-b-[4px] border-orange-700 hover:bg-orange-600 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs flex-shrink-0">
        <Plus size={16} /> Tambah Aturan
      </button>
    </div>

    <!-- Info box -->
    <div class="bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
      <div class="flex items-center gap-2.5 mb-1 border-b-2 border-slate-200/60 pb-3">
        <div class="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center border border-slate-300">
          <ClipboardList size={16} class="text-slate-700" />
        </div>
        <p class="text-sm font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Aturan Kamis Default</p>
      </div>
      <div class="flex flex-col gap-2.5 font-medium text-xs">
        <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
          <div class="w-3 h-3 rounded-full bg-green-500 flex-shrink-0 shadow-xs"></div>
          <p class="text-slate-700">Sesi Pagi (mulai 08:00) — <strong class="font-black text-green-600">aktif</strong></p>
        </div>
        <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
          <div class="w-3 h-3 rounded-full bg-slate-300 flex-shrink-0 shadow-xs"></div>
          <p class="text-slate-700">Sesi Siang, Sore, Lembur — <strong class="font-black text-slate-500">libur otomatis</strong></p>
        </div>
        <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
          <div class="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0 shadow-xs"></div>
          <p class="text-slate-700">Validasi GPS <strong class="font-black">tetap aktif</strong> kecuali jika diset WFA</p>
        </div>
      </div>
    </div>

    {#if sortedRules.length === 0}
      <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 p-16 text-center flex flex-col items-center justify-center">
        <div class="w-16 h-16 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center mb-4">
          <Home size={32} class="text-slate-400" />
        </div>
        <p class="text-base font-black text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Belum ada aturan jadwal khusus</p>
        <p class="text-xs font-bold text-slate-400 mt-1 mb-6">Semua hari kerja mengikuti jadwal operasional normal</p>
        <button onclick={() => onManageSpecial()}
                class="px-6 py-3.5 rounded-2xl text-xs font-black text-white bg-orange-500 border-2 border-b-[4px] border-orange-700 hover:bg-orange-600 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center gap-2 cursor-pointer shadow-xs">
          <Plus size={16} /> Buat Aturan Baru
        </button>
      </div>
    {:else}
      <div class="bg-white rounded-[24px] shadow-xs border-2 border-b-[6px] border-slate-200 overflow-hidden">
        <div class="p-4 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between font-bold">
          <span class="text-xs font-black text-slate-500 uppercase tracking-wider">{sortedRules.length} Aturan Dikonfigurasi</span>
          <span class="text-xs font-black text-orange-600 bg-white px-3 py-1 rounded-xl border border-slate-200">{sortedRules.filter(r => r.date >= todayISO).length} Mendatang</span>
        </div>
        <div class="divide-y divide-slate-100">
        {#each sortedRules as rule}
          {@const ts = TYPE_STYLE[rule.type]}
          {@const isPast  = rule.date < todayISO}
          {@const isToday = rule.date === todayISO}
          <div class="flex items-center gap-4 p-5 {isToday ? 'bg-orange-50/80' : isPast ? 'opacity-60 bg-slate-50/50' : ''} hover:bg-slate-50/80 transition-colors border-b border-slate-100">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-xs border"
                 class:!text-slate-500={isPast && !isToday}
                 class:bg-slate-200={isPast && !isToday}
                 class:border-slate-300={isPast && !isToday}
                 style={!isPast || isToday ? 'background:linear-gradient(135deg,#F97316,#EA580C); border-color:#C2410C' : ''}>
              <ts.Icon size={24} />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap mb-1.5">
                <p class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
                  {new Date(rule.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <span class="text-xs font-black px-3 py-1 rounded-xl border {ts.bg} {ts.text} {ts.border} shadow-xs uppercase tracking-wider leading-none">{ts.label}</span>
                {#if isToday}<span class="text-xs font-black px-3 py-1 rounded-xl bg-orange-500 text-white shadow-xs uppercase tracking-wider leading-none">HARI INI</span>{/if}
              </div>
              {#if rule.type === 'custom_time' && rule.start_time}
                <p class="text-xs bg-amber-50 border border-amber-200 text-amber-800 font-black p-2 rounded-xl mt-1.5 inline-flex items-center gap-2 shadow-xs">
                  <Clock size={14} class="text-amber-600" /> Masuk jam {rule.start_time}
                </p>
              {/if}
              {#if rule.note}
                <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xl mt-2 shadow-inner">
                  <p class="text-xs font-bold text-slate-600 truncate flex items-center gap-2">
                    <FileText size={14} class="text-slate-400 flex-shrink-0" /> {rule.note}
                  </p>
                </div>
              {/if}
            </div>
            
            <div class="flex items-center gap-2 flex-shrink-0">
              <button onclick={() => onManageSpecial(rule)}
                      class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border-2 border-b-[4px] border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center cursor-pointer shadow-xs">
                <Edit3 size={16} />
              </button>
              <button onclick={() => onDeleteSpecialRule(rule)}
                      class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border-2 border-b-[4px] border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center cursor-pointer shadow-xs flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
