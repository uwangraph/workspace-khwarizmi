<script lang="ts">
  import type { Holiday } from '$lib/components/admin/_types'
  import { formatDate } from '$lib/components/admin/_utils'
  import { Plus, Trash2, CalendarOff, CalendarCheck } from 'lucide-svelte'

  interface Props {
    holidays: Holiday[]
    onAddHoliday: () => void
    onDeleteHoliday: (h: Holiday) => void
  }
  let { holidays, onAddHoliday, onDeleteHoliday } = $props<Props>()

  const todayISO = new Date().toISOString().split('T')[0]

  let sorted = $derived([...holidays].sort((a, b) => a.date.localeCompare(b.date)))

  function isUpcoming(date: string) {
    const diff = (new Date(date).getTime() - new Date(todayISO).getTime()) / 86400000
    return diff >= 0 && diff <= 7
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Manajemen Hari Libur</p>
      <p class="text-[10px] text-slate-400 mt-0.5">Hari libur dikecualikan dari perhitungan hari kerja</p>
    </div>
    <button onclick={onAddHoliday}
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer shadow-sm active:scale-[0.98] transition-all"
            style="background:linear-gradient(135deg,#F97316,#EA580C)">
      <Plus size={14} /> Tambah
    </button>
  </div>

  <!-- Info box -->
  <div class="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
    <CalendarCheck size={16} class="text-blue-500 flex-shrink-0 mt-0.5" />
    <div>
      <p class="text-xs font-semibold text-blue-700">Cara Kerja Hari Libur</p>
      <p class="text-[11px] text-blue-600 mt-0.5 leading-relaxed">
        Tanggal yang ditandai sebagai hari libur tidak akan dihitung sebagai hari kerja pada rekap kehadiran bulanan.
        Karyawan yang tidak hadir pada hari libur <strong>tidak</strong> dianggap alfa.
      </p>
    </div>
  </div>

  <!-- List -->
  {#if sorted.length === 0}
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 py-16 text-center">
      <CalendarOff size={32} class="text-slate-200 mx-auto mb-3" />
      <p class="text-sm font-semibold text-slate-400">Belum ada hari libur</p>
      <p class="text-xs text-slate-300 mt-1">Tambahkan hari libur mendadak atau hari besar</p>
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
        {@const isPast    = h.date < todayISO}
        {@const isToday   = h.date === todayISO}
        {@const upcoming  = isUpcoming(h.date)}
        <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0
                    {isToday ? 'bg-amber-50' : isPast ? 'opacity-60' : ''} hover:bg-slate-50 transition-colors">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style="{isToday ? 'background:linear-gradient(135deg,#F59E0B,#D97706)' : isPast ? 'background:#F1F5F9' : 'background:linear-gradient(135deg,#F97316,#EA580C)'}">
            <span class="text-base">{isToday ? '🎉' : isPast ? '📅' : '🗓️'}</span>
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
</div>
