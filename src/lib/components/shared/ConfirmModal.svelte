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
    onConfirm,
    onCancel
  } = $props<{
    show: boolean,
    title?: string,
    message?: string,
    confirmText?: string,
    cancelText?: string,
    type?: 'danger' | 'info' | 'warning',
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
