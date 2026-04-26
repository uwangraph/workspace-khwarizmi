<script lang="ts">
  import { X, FileText, Shield, AlertTriangle } from 'lucide-svelte'
  interface Session { id: number; name: string }
  interface LeaveRecord { session_id: number | null }
  interface Props {
    sessions: Session[]
    leaves: LeaveRecord[]
    onSubmit: (data: { type: 'izin' | 'sakit'; reason: string; sessionId: number | null }) => void
    onClose: () => void
    isSubmitting: boolean
    status: string
  }
  let { sessions, leaves, onSubmit, onClose, isSubmitting, status }: Props = $props()

  let leaveType = $state<'izin' | 'sakit'>('izin')
  let leaveReason = $state('')
  let leaveSessionId = $state<number | null>(null)

  function handleSubmit() {
    onSubmit({ type: leaveType, reason: leaveReason.trim(), sessionId: leaveSessionId })
  }
</script>

<div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
     onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
       onclick={(e) => e.stopPropagation()}>

    <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
      <div class="w-10 h-1 rounded-full bg-slate-200"></div>
    </div>

    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <span class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Pengajuan Izin / Sakit</span>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">
        <X size={14} />
      </button>
    </div>

    <div class="px-6 py-5 flex flex-col gap-5">
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-2">Jenis Pengajuan</label>
        <div class="flex gap-3">
          {#each [['izin', 'Izin'], ['sakit', 'Sakit']] as [val, label]}
            <button onclick={() => leaveType = val as 'izin' | 'sakit'}
                    class="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style="background:{leaveType === val ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#F1F5F9'};
                           color:{leaveType === val ? 'white' : '#64748B'};">
              {#if val === 'izin'}<FileText size={14} />{:else}<Shield size={14} />{/if}
              {label}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-2">Berlaku Untuk Sesi</label>
        <div class="flex flex-wrap gap-2">
          <button onclick={() => leaveSessionId = null}
                  class="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                  style="background:{leaveSessionId === null ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#F1F5F9'};
                         color:{leaveSessionId === null ? 'white' : '#64748B'};">
            Semua Sesi
          </button>
          {#each sessions as s}
            {@const hasLeave = leaves.some(l => l.session_id === s.id)}
            <button onclick={() => leaveSessionId = s.id} disabled={hasLeave}
                    class="rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style="background:{leaveSessionId === s.id ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#F1F5F9'};
                           color:{leaveSessionId === s.id ? 'white' : '#64748B'};">
              {s.name}{#if hasLeave}<span class="ml-1 text-[9px]">(sudah izin)</span>{/if}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Alasan <span class="text-red-500">*</span></label>
        <textarea bind:value={leaveReason} rows="3" placeholder="Jelaskan alasan izin/sakit..."
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
      </div>

      {#if status}
        <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle size={14} class="text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-xs text-red-600 font-medium">{status}</p>
        </div>
      {/if}

      <div class="flex gap-3 pb-4">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
          Batal
        </button>
        <button onclick={handleSubmit} disabled={isSubmitting}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          {isSubmitting ? 'Menyimpan...' : 'Kirim Pengajuan'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
