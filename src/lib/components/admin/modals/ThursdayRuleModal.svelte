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

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:92vh;"
       onclick={e => e.stopPropagation()}>
    
    <div class="flex justify-center pt-3 pb-1 sm:hidden"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-8 py-6">
      <div class="flex flex-col">
        <h3 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Aturan Kamis</h3>
        <p class="text-[11px] text-slate-400">Konfigurasi khusus untuk hari Kamis tertentu</p>
      </div>
      <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-90">
        <X size={18} />
      </button>
    </div>

    <div class="px-8 pb-8 overflow-y-auto scrollbar-hide flex flex-col gap-6">
      <!-- Pilih tanggal Kamis -->
      <div class="space-y-1.5">
        <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Pilih Tanggal Kamis</label>
        <select bind:value={selectedDate}
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all">
          {#each upcomingThursdays as d}
            <option value={d}>{formatThursdayLabel(d)}</option>
          {/each}
        </select>
      </div>

      <!-- Tipe aturan -->
      <div class="space-y-3">
        <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Tipe Aturan</label>
        <div class="grid grid-cols-1 gap-2">
          {#each TYPE_OPTIONS as opt}
            <button onclick={() => ruleType = opt.val}
                    class="flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer text-left"
                    class:border-orange-500={ruleType === opt.val}
                    class:bg-orange-50={ruleType === opt.val}
                    class:border-slate-100={ruleType !== opt.val}
                    class:bg-white={ruleType !== opt.val}
                    class:shadow-sm={ruleType === opt.val}>
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   class:bg-orange-500={ruleType === opt.val} class:text-white={ruleType === opt.val}
                   class:bg-slate-50={ruleType !== opt.val} class:text-slate-400={ruleType !== opt.val}>
                <opt.Icon size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-700">{opt.label}</p>
                <p class="text-[10px] text-slate-400 truncate">{opt.desc}</p>
              </div>
              {#if ruleType === opt.val}
                <div class="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white">
                  <Check size={12} strokeWidth={4} />
                </div>
              {:else}
                <div class="w-5 h-5 rounded-full border border-slate-200"></div>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Conditional UI -->
      {#if ruleType === 'custom_time' || ruleType === 'wfa'}
        <div class="animate-slideDown">
          {#if ruleType === 'custom_time'}
            <div class="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 space-y-3">
              <div class="flex items-center gap-2">
                <Clock size={14} class="text-orange-500" />
                <label class="text-[11px] font-bold text-orange-700">Jam Masuk Khusus</label>
              </div>
              <input type="time" bind:value={startTime}
                     class="w-full px-4 py-2.5 rounded-xl border border-orange-200 text-sm text-slate-700 bg-white focus:outline-none" />
              <p class="text-[10px] text-orange-600/70">Normalnya jam 08:00. Silakan atur jam khusus untuk Kamis ini.</p>
            </div>
          {/if}

          {#if ruleType === 'wfa'}
            <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Home size={16} />
              </div>
              <div>
                <p class="text-xs font-bold text-blue-700">Mode Kerja Remote (WFA)</p>
                <p class="text-[10px] text-blue-600/70 mt-0.5 leading-relaxed">Karyawan tidak perlu ke kantor. GPS akan dinonaktifkan. Jam masuk tetap 08:00.</p>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Catatan -->
      <div class="space-y-1.5">
        <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Catatan Khusus (Opsional)</label>
        <textarea bind:value={note} placeholder="Contoh: Ada agenda rapat di luar kantor..."
                  rows="2"
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all resize-none placeholder:text-slate-300"></textarea>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button onclick={onClose} class="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors">Batal</button>
        <button onclick={handleSave} disabled={isSubmitting}
                class="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                style="background:linear-gradient(to right, #F97316, #EA580C)">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Aturan'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
