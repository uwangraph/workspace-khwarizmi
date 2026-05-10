<script lang="ts">
  import { X, Settings, Calendar, Clock, Home, Check, CheckCircle2 } from 'lucide-svelte'
  import type { SpecialRule } from '$lib/components/admin/_types'
  import { SESSIONS } from '$lib/components/admin/_utils'

  interface Props {
    specialRules: SpecialRule[]
    initialRule?: SpecialRule | null
    isSubmitting?: boolean
    onSave: (data: { date: string; type: SpecialRule['type']; start_time: string | null; active_sessions: number[] | null; note: string | null }) => Promise<void>
    onClose: () => void
  }
  let { specialRules, initialRule = null, isSubmitting = false, onSave, onClose } = $props<Props>()

  // Pre-fill jika tanggal sudah punya rule
  let selectedDate = $state(initialRule?.date || new Date().toISOString().split('T')[0])
  let ruleType     = $state<SpecialRule['type']>('normal')
  let startTime    = $state('09:00')
  let activeSessionIds = $state<number[]>([1, 2, 3])
  let note         = $state('')

  // Saat ganti tanggal, pre-fill dari existing rule jika ada
  $effect(() => {
    const existing = specialRules.find(r => r.date === selectedDate)
    if (existing) {
      ruleType  = existing.type
      startTime = existing.start_time ?? '09:00'
      activeSessionIds = existing.active_sessions ?? [1, 2, 3]
      note      = existing.note ?? ''
    } else {
      ruleType  = 'normal'
      startTime = '09:00'
      // Default Thursday logic is handled elsewhere, but here we show UI
      // If it's a Thursday, default to just Pagi (1)
      const isThursday = new Date(selectedDate).getDay() === 4
      activeSessionIds = isThursday ? [1] : [1, 2, 3]
      note      = ''
    }
  })

  function toggleSession(id: number) {
    if (activeSessionIds.includes(id)) {
      activeSessionIds = activeSessionIds.filter(x => x !== id)
    } else {
      activeSessionIds = [...activeSessionIds, id].sort()
    }
  }

  function formatSpecialDateLabel(dateStr: string) {
    if (!dateStr) return 'Pilih Tanggal'
    const d = new Date(dateStr)
    const today = new Date().toISOString().split('T')[0]
    const suffix = dateStr === today ? ' (Hari Ini)' : ''
    const existing = specialRules.find(r => r.date === dateStr)
    const tag = existing ? ` (${existing.type === 'wfa' ? 'WFA' : existing.type === 'custom_time' ? 'Custom' : 'Normal'})` : ''
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) + suffix + tag
  }

  const TYPE_OPTIONS = [
    {
      val: 'normal',
      label: 'Normal',
      desc: 'Jadwal reguler kantor',
      Icon: Calendar,
    },
    {
      val: 'custom_time',
      label: 'Custom Waktu',
      desc: 'Tentukan jam masuk khusus',
      Icon: Clock,
    },
    {
      val: 'wfa',
      label: 'WFA',
      desc: 'Mode Remote / Kerja dari mana saja',
      Icon: Home,
    },
  ] as const

  async function handleSave() {
    await onSave({
      date:       selectedDate,
      type:       ruleType,
      start_time: ruleType === 'custom_time' ? startTime : null,
      active_sessions: activeSessionIds.length > 0 ? activeSessionIds : null,
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
    <div class="flex items-center justify-between px-8 py-6 border-b border-slate-50">
      <div class="flex flex-col">
        <h3 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Aturan Jadwal Khusus</h3>
        <p class="text-[11px] text-slate-400">Pilih sesi aktif atau konfigurasi WFA</p>
      </div>
      <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-90">
        <X size={18} />
      </button>
    </div>

    <div class="px-8 py-6 overflow-y-auto scrollbar-hide flex flex-col gap-6">
      <!-- Pilih tanggal -->
      <div class="space-y-1.5">
        <label class="ml-0.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Tanggal</label>
        <div class="relative">
          <input type="date" bind:value={selectedDate}
                 class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all" />
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Calendar size={14} />
          </div>
        </div>
        {#if selectedDate}
          <p class="text-[10px] text-slate-400 ml-0.5">{formatSpecialDateLabel(selectedDate)}</p>
        {/if}
      </div>

      <!-- Sesi yang Aktif -->
      <div class="space-y-3">
        <label class="ml-0.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi yang Dibuka</label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {#each SESSIONS.filter(s => s.id !== 4) as s}
            <button onclick={() => toggleSession(s.id)}
                    class="flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left group"
                    class:border-orange-500={activeSessionIds.includes(s.id)}
                    class:bg-orange-50={activeSessionIds.includes(s.id)}
                    class:border-slate-100={!activeSessionIds.includes(s.id)}>
              <div class="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                   class:bg-orange-500={activeSessionIds.includes(s.id)}
                   class:text-white={activeSessionIds.includes(s.id)}
                   class:bg-slate-50={!activeSessionIds.includes(s.id)}
                   class:text-slate-300={!activeSessionIds.includes(s.id)}>
                <CheckCircle2 size={14} />
              </div>
              <span class="text-xs font-bold {activeSessionIds.includes(s.id) ? 'text-slate-800' : 'text-slate-400'}">{s.label}</span>
            </button>
          {/each}
        </div>
        <p class="text-[10px] text-slate-400 ml-0.5 italic">Hanya sesi yang dicentang yang akan muncul bagi anggota.</p>
      </div>

      <!-- Tipe aturan -->
      <div class="space-y-3">
        <label class="ml-0.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opsi Tambahan</label>
        <div class="grid grid-cols-3 gap-2">
          {#each TYPE_OPTIONS as opt}
            <button onclick={() => ruleType = opt.val}
                    class="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer text-center"
                    class:border-orange-500={ruleType === opt.val}
                    class:bg-orange-50={ruleType === opt.val}
                    class:border-slate-100={ruleType !== opt.val}>
              <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                   class:bg-orange-500={ruleType === opt.val} class:text-white={ruleType === opt.val}
                   class:bg-slate-50={ruleType !== opt.val} class:text-slate-400={ruleType !== opt.val}>
                <opt.Icon size={16} />
              </div>
              <p class="text-[10px] font-bold {ruleType === opt.val ? 'text-slate-800' : 'text-slate-400'}">{opt.label}</p>
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
              <p class="text-[10px] text-orange-600/70">Berlaku untuk sesi pertama yang aktif.</p>
            </div>
          {/if}

          {#if ruleType === 'wfa'}
            <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Home size={16} />
              </div>
              <div>
                <p class="text-xs font-bold text-blue-700">Mode Remote (WFA)</p>
                <p class="text-[10px] text-blue-600/70 mt-0.5 leading-relaxed">GPS akan dinonaktifkan untuk sesi yang dipilih.</p>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Catatan -->
      <div class="space-y-1.5">
        <label class="ml-0.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Khusus</label>
        <textarea bind:value={note} placeholder="Contoh: Sesi 3 ditiadakan karena ada rapat internal..."
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
