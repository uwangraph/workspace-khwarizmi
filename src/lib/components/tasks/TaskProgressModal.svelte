<script lang="ts">
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
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
     onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
       onclick={(e) => e.stopPropagation()}>

    <div class="sm:hidden flex justify-center pt-3 pb-1">
      <div class="w-10 h-1 rounded-full bg-slate-200"></div>
    </div>

    <div class="px-6 pt-4 pb-4 border-b border-slate-100">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
          <svg class="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <p class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Update Progress</p>
        <button onclick={onClose} class="ml-auto w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
      </div>
      <p class="text-xs text-slate-500 pl-10 line-clamp-1">{taskTitle}</p>
    </div>

    <div class="px-6 py-6">
      <div class="relative w-40 h-40 mx-auto mb-6">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" stroke-width="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="url(#pg)" stroke-width="8" stroke-linecap="round"
                  stroke-dasharray="{circumference}" stroke-dashoffset={dashoffset}
                  style="transition: stroke-dashoffset 0.4s cubic-bezier(0.16,1,0.3,1);" />
          <defs>
            <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#F97316" />
              <stop offset="100%" stop-color="#EA580C" />
            </linearGradient>
          </defs>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <p class="text-4xl font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {progressValue}<span class="text-xl text-slate-400">%</span>
          </p>
          <div class="flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full" style="background:{stateLabel.color}20;">
            <div class="w-1.5 h-1.5 rounded-full" style="background:{stateLabel.color};"></div>
            <p class="text-[10px] font-bold uppercase tracking-wider" style="color:{stateLabel.color};">{stateLabel.label}</p>
          </div>
        </div>
      </div>

      <div class="mb-5">
        <input type="range" value={progressValue} oninput={(e) => onSetValue(Number((e.target as HTMLInputElement).value))}
               min="0" max="100" step="5" class="range-orange w-full cursor-pointer" style="--fill: {progressValue}%;" />
        <div class="flex justify-between text-[10px] font-medium text-slate-400 mt-2 px-0.5">
          {#each ['0%','25%','50%','75%','100%'] as l}<span>{l}</span>{/each}
        </div>
      </div>

      <div class="mb-5">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Cepat Pilih</p>
        <div class="grid grid-cols-5 gap-2">
          {#each [0, 25, 50, 75, 100] as preset}
            <button onclick={() => onSetValue(preset)}
                    class="py-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer
                           {progressValue === preset ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}">
              {preset}%
            </button>
          {/each}
        </div>
      </div>

      {#if progressValue !== initialProgress}
        <div class="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 mb-5 flex items-start gap-2">
          <svg class="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-[11px] text-orange-700 font-medium leading-snug">
            {#if progressValue === 100}Tugas akan ditandai <strong>selesai</strong>.
            {:else if progressValue >= 80}Tugas akan berstatus <strong>siap direview</strong>.
            {:else if progressValue === 0}Tugas kembali ke status <strong>belum dikerjakan</strong>.
            {:else}Status akan berubah menjadi <strong>sedang dikerjakan</strong>.{/if}
          </p>
        </div>
      {/if}

      <div class="flex gap-3">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
          Batal
        </button>
        <button onclick={onUpdate} disabled={isUpdating || progressValue === initialProgress}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          {#if isUpdating}
            <span class="inline-flex items-center justify-center gap-2">
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>Menyimpan...
            </span>
          {:else if progressValue === initialProgress}Tidak Ada Perubahan
          {:else}Simpan Progress{/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .range-orange { accent-color: #F97316; }
</style>
