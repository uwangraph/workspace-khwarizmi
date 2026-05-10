<script lang="ts">
  import { X, Calendar, ArrowRight } from 'lucide-svelte'
  import type { Holiday } from '$lib/components/admin/_types'

  interface Props {
    holiday?: Holiday | null
    isSubmitting?: boolean
    onSave: (data: { id?: string; date: string; name: string } | { startDate: string; endDate: string; name: string }) => Promise<void>
    onClose: () => void
  }
  let { holiday = null, isSubmitting = false, onSave, onClose } = $props<Props>()

  let mode = $state<'single' | 'range'>('single')
  let holidayDate = $state(holiday?.date || '')
  let startDate = $state('')
  let endDate = $state('')
  let holidayName = $state(holiday?.name || '')

  const today = new Date().toISOString().split('T')[0]

  async function handleSave() {
    if (!holidayName.trim()) return
    
    if (holiday) {
      // Edit mode (always single)
      if (!holidayDate) return
      await onSave({ id: holiday.id, date: holidayDate, name: holidayName.trim() })
    } else if (mode === 'single') {
      if (!holidayDate) return
      await onSave({ date: holidayDate, name: holidayName.trim() })
    } else {
      if (!startDate || !endDate) return
      if (new Date(endDate) < new Date(startDate)) return
      await onSave({ startDate, endDate, name: holidayName.trim() })
    }
  }

  // Auto-sync endDate if it's before startDate
  $effect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      endDate = startDate
    }
  })
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1)"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1 sm:hidden"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#F97316,#EA580C)">
          <Calendar size={16} class="text-white" />
        </div>
        <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{holiday ? 'Edit Hari Libur' : 'Atur Hari Libur'}</p>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer">
        <X size={16} />
      </button>
    </div>

    <div class="px-6 py-5 flex flex-col gap-5">
      <!-- Mode Toggle (Only if not editing) -->
      {#if !holiday}
        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button onclick={() => mode = 'single'}
                  class="flex-1 py-2 text-[11px] font-bold rounded-lg transition-all {mode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
            SATU HARI
          </button>
          <button onclick={() => mode = 'range'}
                  class="flex-1 py-2 text-[11px] font-bold rounded-lg transition-all {mode === 'range' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
            RENTANG TANGGAL
          </button>
        </div>
      {/if}

      <!-- Date Inputs -->
      <div class="grid grid-cols-1 gap-4">
        {#if holiday || mode === 'single'}
          <div>
            <label class="text-[10px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Tanggal Libur <span class="text-red-500">*</span></label>
            <input type="date" bind:value={holidayDate} min={holiday ? '' : today}
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        {:else}
          <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <label class="text-[10px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Mulai <span class="text-red-500">*</span></label>
              <input type="date" bind:value={startDate} min={today}
                     class="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div class="pb-3.5 text-slate-300">
              <ArrowRight size={16} />
            </div>
            <div>
              <label class="text-[10px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Selesai <span class="text-red-500">*</span></label>
              <input type="date" bind:value={endDate} min={startDate || today}
                     class="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
        {/if}

        <div>
          <label class="text-[10px] font-black text-slate-400 block mb-1.5 uppercase tracking-widest">Nama Hari Libur <span class="text-red-500">*</span></label>
          <input bind:value={holidayName} placeholder="Contoh: Libur Lebaran, Cuti Bersama..."
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-2 pb-1">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={handleSave} disabled={isSubmitting || !holidayName.trim() || (holiday ? !holidayDate : (mode === 'single' ? !holidayDate : (!startDate || !endDate)))}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-60 cursor-pointer transition-all active:scale-95"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {isSubmitting ? 'Menyimpan...' : holiday ? 'Update Perubahan' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
