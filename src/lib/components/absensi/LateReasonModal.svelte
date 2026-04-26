<script lang="ts">
  import { Clock } from 'lucide-svelte'
  interface Props {
    lateMinutes: number
    toleranceMin: number
    onConfirm: (reason: string) => void
    onCancel: () => void
  }
  let { lateMinutes, toleranceMin, onConfirm, onCancel }: Props = $props()
  let reason = $state('')
</script>

<div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style="animation: zoomIn 0.2s ease-out;">
    <div class="px-6 py-5 border-b border-amber-100 bg-amber-50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock size={18} class="text-amber-600" />
        </div>
        <div>
          <p class="text-base font-bold text-amber-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Terlambat {lateMinutes} Menit
          </p>
          <p class="text-xs text-amber-600 mt-0.5">Melebihi toleransi {toleranceMin} menit</p>
        </div>
      </div>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Alasan Keterlambatan</label>
        <textarea bind:value={reason} rows="3" placeholder="Opsional — jelaskan alasan keterlambatan..."
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"></textarea>
      </div>
      <div class="flex gap-3">
        <button onclick={onCancel} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
          Batal
        </button>
        <button onclick={() => onConfirm(reason)}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98]"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          Lanjutkan Absen
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
