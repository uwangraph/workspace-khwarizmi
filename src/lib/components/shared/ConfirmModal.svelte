<script lang="ts">
  import { fade, scale } from 'svelte/transition'
  import { AlertTriangle, X } from 'lucide-svelte'

  let { 
    show = $bindable(false), 
    title = 'Konfirmasi', 
    message = 'Apakah Anda yakin ingin melanjutkan?', 
    confirmText = 'Ya, Hapus',
    cancelText = 'Batal',
    type = 'danger', // 'danger' | 'info' | 'warning'
    showCheckbox = false,
    checkboxLabel = '',
    checkboxValue = $bindable(false),
    onConfirm,
    onCancel
  } = $props<{
    show: boolean,
    title?: string,
    message?: string,
    confirmText?: string,
    cancelText?: string,
    type?: 'danger' | 'info' | 'warning',
    showCheckbox?: boolean,
    checkboxLabel?: string,
    checkboxValue?: boolean,
    onConfirm: () => void,
    onCancel?: () => void
  }>()

  function handleCancel() {
    show = false
    if (onCancel) onCancel()
  }

  function handleConfirm() {
    show = false
    onConfirm()
  }
</script>

{#if show}
  <div class="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" transition:fade={{ duration: 200 }}>
    <div class="w-full max-w-[340px] bg-white rounded-3xl shadow-2xl overflow-hidden" transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}>
      
      <div class="p-6 flex flex-col items-center text-center">
        <!-- Icon Container -->
        <div class="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center
                    {type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}">
          {#if type === 'danger'}
            <AlertTriangle size={32} />
          {:else}
            <X size={32} />
          {/if}
        </div>

        <h3 class="text-lg font-bold text-slate-800 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif;">{title}</h3>
        <p class="text-sm text-slate-500 leading-relaxed font-medium">
          {message}
        </p>

        {#if showCheckbox}
          <label class="mt-6 flex items-center gap-3 cursor-pointer group">
            <div class="relative flex items-center justify-center">
              <input type="checkbox" bind:checked={checkboxValue} class="peer sr-only" />
              <div class="w-6 h-6 border-2 border-slate-200 rounded-lg bg-white peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all group-hover:border-orange-200"></div>
              <svg class="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span class="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">{checkboxLabel}</span>
          </label>
        {/if}
      </div>

      <div class="p-4 bg-slate-50 flex gap-3">
        <button onclick={handleCancel}
                class="flex-1 py-3 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
          {cancelText}
        </button>
        <button onclick={handleConfirm}
                class="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-white shadow-lg transition-all
                       {type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}">
          {confirmText}
        </button>
      </div>

    </div>
  </div>
{/if}
