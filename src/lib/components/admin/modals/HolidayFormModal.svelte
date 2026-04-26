<script lang="ts">
  interface Props {
    isSubmitting?: boolean
    onSave: (data: { date: string; name: string }) => Promise<void>
    onClose: () => void
  }
  let { isSubmitting = false, onSave, onClose } = $props<Props>()

  let holidayDate = $state('')
  let holidayName = $state('')

  const today = new Date().toISOString().split('T')[0]

  async function handleSave() {
    if (!holidayDate || !holidayName.trim()) return
    await onSave({ date: holidayDate, name: holidayName.trim() })
  }
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Tambah Hari Libur</p>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      <div>
        <label class="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">Tanggal <span class="text-red-500">*</span></label>
        <input type="date" bind:value={holidayDate} min={today}
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">Nama Hari Libur <span class="text-red-500">*</span></label>
        <input bind:value={holidayName} placeholder="Contoh: Libur Idul Fitri, Libur Mendadak..."
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <p class="text-[10px] text-slate-400 mt-1.5">Hari ini tidak akan dihitung sebagai hari kerja pada rekap kehadiran.</p>
      </div>
      <div class="flex gap-3 pt-1 pb-2">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={handleSave} disabled={isSubmitting || !holidayDate || !holidayName.trim()}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Hari Libur'}
        </button>
      </div>
    </div>
  </div>
</div>
<style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
