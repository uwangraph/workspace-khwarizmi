<script lang="ts">
  import { X } from 'lucide-svelte'
  interface Props {
    taskTitle: string
    progressValue: number
    initialProgress: number
    isUpdating: boolean
    onUpdate: () => void
    onClose: () => void
    onSetValue: (v: number) => void
  }
  let { taskTitle, progressValue, initialProgress, isUpdating, onUpdate, onClose, onSetValue }: Props = $props()

  let stateLabel = $derived.by(() => {
    if (progressValue === 0) return { label: 'Belum dimulai', color: '#94A3B8' }
    if (progressValue === 100) return { label: 'Selesai', color: '#22C55E' }
    if (progressValue >= 80) return { label: 'Siap direview', color: '#A855F7' }
    return { label: 'Sedang dikerjakan', color: '#3B82F6' }
  })
  let circumference = 263.89
  let dashoffset = $derived(circumference - (circumference * progressValue / 100))
</script>

<div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);"
     onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
       onclick={(e) => e.stopPropagation()}>

    <div class="sm:hidden flex justify-center pt-3 pb-1">
      <div class="w-10 h-1 rounded-full bg-slate-200"></div>
    </div>

    <div class="px-8 pt-6 pb-4 border-b border-slate-50 flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <h2 class="text-lg font-bold text-slate-800 leading-tight mb-0.5" style="font-family:'Plus Jakarta Sans',sans-serif;">Update Progress</h2>
        <p class="text-[11px] text-slate-400 font-medium line-clamp-1">{taskTitle}</p>
      </div>
      <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-90 cursor-pointer flex-shrink-0">
        <X size={18} />
      </button>
    </div>

    <div class="px-8 py-6">
      <div class="relative w-40 h-40 mx-auto mb-6">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#F8FAFC" stroke-width="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#F97316" stroke-width="8" stroke-linecap="round"
                  stroke-dasharray="{circumference}" stroke-dashoffset={dashoffset}
                  style="transition: stroke-dashoffset 0.4s cubic-bezier(0.16,1,0.3,1);" />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <p class="text-4xl font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {progressValue}<span class="text-xl text-slate-300">%</span>
          </p>
          <div class="flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-lg" style="background:{stateLabel.color}15;">
            <div class="w-1.5 h-1.5 rounded-full" style="background:{stateLabel.color};"></div>
            <p class="text-[9px] font-bold" style="color:{stateLabel.color};">{stateLabel.label.toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <input type="range" value={progressValue} oninput={(e) => onSetValue(Number((e.target as HTMLInputElement).value))}
               min="0" max="100" step="5" class="range-orange w-full cursor-pointer" style="--fill: {progressValue}%;" />
        <div class="flex justify-between text-[10px] font-semibold text-slate-400 mt-2 px-1">
          {#each ['0%','25%','50%','75%','100%'] as l}<span>{l}</span>{/each}
        </div>
      </div>

      <div class="mb-6">
        <p class="text-[11px] font-semibold text-slate-500 mb-2 ml-0.5">Pilih Cepat</p>
        <div class="grid grid-cols-5 gap-2">
          {#each [0, 25, 50, 75, 100] as preset}
            <button onclick={() => onSetValue(preset)}
                    class="py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer
                           {progressValue === preset ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm' : 'bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100'}">
              {preset}%
            </button>
          {/each}
        </div>
      </div>

      {#if progressValue !== initialProgress}
        <div class="bg-orange-50/50 border border-orange-100/50 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 animate-slideDown">
          <svg class="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-[11px] text-orange-700 font-medium leading-relaxed">
            {#if progressValue === 100}Tugas akan ditandai <strong>selesai</strong>.
            {:else if progressValue >= 80}Tugas akan berstatus <strong>siap direview</strong>.
            {:else if progressValue === 0}Tugas kembali ke status <strong>belum dikerjakan</strong>.
            {:else}Status akan berubah menjadi <strong>sedang dikerjakan</strong>.{/if}
          </p>
        </div>
      {/if}

      <div class="flex gap-3">
        <button onclick={onClose} class="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors">
          Batal
        </button>
        <button onclick={onUpdate} disabled={isUpdating || progressValue === initialProgress}
                class="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style="background: linear-gradient(to right, #F97316, #EA580C);">
          {#if isUpdating}
            <span class="inline-flex items-center justify-center gap-2">
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>Menyimpan...
            </span>
          {:else if progressValue === initialProgress}Tidak Berubah
          {:else}Simpan Progress{/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  .range-orange { accent-color: #F97316; }
</style>
