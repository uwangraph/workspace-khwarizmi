<script lang="ts">
  import { X, Settings, Calendar, Clock, Home, Check } from 'lucide-svelte'
  import type { ThursdayRule } from '$lib/components/admin/_types'
  import { getUpcomingThursdays } from '$lib/components/admin/_utils'

  interface Props {
    thursdayRules: ThursdayRule[]
    isSubmitting?: boolean
    onSave: (data: { date: string; type: ThursdayRule['type']; start_time: string | null; note: string | null }) => Promise<void>
    onClose: () => void
  }
  let { thursdayRules, isSubmitting = false, onSave, onClose } = $props<Props>()

  const upcomingThursdays = getUpcomingThursdays(10)

  // Pre-fill jika tanggal sudah punya rule
  let selectedDate = $state(upcomingThursdays[0] ?? '')
  let ruleType     = $state<ThursdayRule['type']>('normal')
  let startTime    = $state('09:00')
  let note         = $state('')

  // Saat ganti tanggal, pre-fill dari existing rule jika ada
  $effect(() => {
    const existing = thursdayRules.find(r => r.date === selectedDate)
    if (existing) {
      ruleType  = existing.type
      startTime = existing.start_time ?? '09:00'
      note      = existing.note ?? ''
    } else {
      ruleType  = 'normal'
      startTime = '09:00'
      note      = ''
    }
  })

  function formatThursdayLabel(dateStr: string) {
    const d = new Date(dateStr)
    const today = new Date().toISOString().split('T')[0]
    const suffix = dateStr === today ? ' (Hari Ini)' : ''
    const existing = thursdayRules.find(r => r.date === dateStr)
    const tag = existing ? ` (${existing.type === 'wfa' ? 'WFA' : existing.type === 'custom_time' ? 'Custom' : 'Normal'})` : ''
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) + suffix + tag
  }

  const TYPE_OPTIONS = [
    {
      val: 'normal',
      label: 'Normal',
      desc: 'Masuk seperti biasa — hanya sesi Pagi (08:00), siang & sore libur',
      Icon: Calendar,
    },
    {
      val: 'custom_time',
      label: 'Custom Waktu',
      desc: 'Masuk lebih siang — tentukan jam masuk khusus hari Kamis ini',
      Icon: Clock,
    },
    {
      val: 'wfa',
      label: 'WFA',
      desc: 'Work From Anywhere — tidak perlu hadir di kantor, GPS diabaikan',
      Icon: Home,
    },
  ] as const

  async function handleSave() {
    await onSave({
      date:       selectedDate,
      type:       ruleType,
      start_time: ruleType === 'custom_time' ? startTime : null,
      note:       note.trim() || null,
    })
  }
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:92vh; overflow-y:auto;"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1 sm:hidden"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background:linear-gradient(135deg,#F97316,#EA580C)">
          <Settings size={16} />
        </div>
        <div>
          <p class="font-bold text-slate-800 text-sm" style="font-family:'Plus Jakarta Sans',sans-serif;">Aturan Kamis</p>
          <p class="text-[10px] text-slate-400">Atur jadwal masuk Kamis ini</p>
        </div>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer">
        <X size={16} />
      </button>
    </div>

    <div class="px-6 py-5 flex flex-col gap-5">
      <!-- Pilih tanggal Kamis -->
      <div>
        <label class="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wider">Pilih Hari Kamis</label>
        <select bind:value={selectedDate}
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
          {#each upcomingThursdays as d}
            <option value={d}>{formatThursdayLabel(d)}</option>
          {/each}
        </select>
      </div>

      <!-- Tipe aturan -->
      <div>
        <label class="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wider">Tipe Aturan</label>
        <div class="flex flex-col gap-2">
          {#each TYPE_OPTIONS as opt}
            <button onclick={() => ruleType = opt.val}
                    class="flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left"
                    class:border-orange-400={ruleType === opt.val}
                    class:bg-orange-50={ruleType === opt.val}
                    class:border-slate-200={ruleType !== opt.val}
                    class:bg-white={ruleType !== opt.val}>
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   class:bg-orange-500={ruleType === opt.val} class:text-white={ruleType === opt.val}
                   class:bg-slate-100={ruleType !== opt.val} class:text-slate-400={ruleType !== opt.val}>
                <opt.Icon size={20} />
              </div>
              <div class="flex-1">
                <p class="text-sm font-bold text-slate-700">{opt.label}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
              </div>
              <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                   class:border-orange-500={ruleType === opt.val}
                   class:border-slate-300={ruleType !== opt.val}>
                {#if ruleType === opt.val}
                  <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Custom time input -->
      {#if ruleType === 'custom_time'}
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <label class="text-xs font-bold text-amber-700 flex items-center gap-2 mb-2 uppercase tracking-wider">
          <Clock size={12} /> Jam Masuk Kamis Ini
        </label>
          <input type="time" bind:value={startTime}
                 class="w-full px-4 py-3 rounded-xl border border-amber-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <p class="text-[10px] text-amber-600 mt-2">Jam masuk normal sesi Pagi adalah 08:00. Atur jam yang berbeda untuk Kamis ini.</p>
        </div>
      {/if}

      <!-- WFA info -->
      {#if ruleType === 'wfa'}
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-1">
          <Home size={14} class="text-blue-700" />
          <p class="text-xs font-semibold text-blue-700">Mode WFA Aktif</p>
        </div>
          <p class="text-[11px] text-blue-600 mt-1">Karyawan tidak perlu hadir di kantor. Validasi GPS akan dinonaktifkan untuk hari Kamis ini. Jam masuk tetap mengacu pada sesi Pagi normal (08:00).</p>
        </div>
      {/if}

      <!-- Catatan opsional -->
      <div>
        <label class="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wider">Catatan (Opsional)</label>
        <textarea bind:value={note} placeholder="Contoh: Ada kegiatan halaqoh dulu, masuk jam 10.00..."
                  rows="2"
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pb-4">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={handleSave} disabled={isSubmitting}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Aturan Kamis'}
        </button>
      </div>
    </div>
  </div>
</div>
<style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
