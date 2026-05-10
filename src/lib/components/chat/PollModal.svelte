<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { X, Plus, ListTodo } from 'lucide-svelte'

  let { onClose, onSubmit } = $props<{
    onClose: () => void,
    onSubmit: (question: string, options: string[]) => void
  }>()

  let question = $state('')
  let options = $state(['', ''])

  function addOption() {
    if (options.length < 5) options = [...options, '']
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      options = options.filter((_, i) => i !== index)
    }
  }

  function handleSubmit() {
    const validOptions = options.map(o => o.trim()).filter(o => o !== '')
    if (!question.trim() || validOptions.length < 2) return
    onSubmit(question.trim(), validOptions)
  }
</script>

<div class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-0 sm:p-4" transition:fade={{ duration: 200 }}>
  <div class="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" transition:slide={{ duration: 300, axis: 'y' }}>
    
    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <ListTodo size={18} />
        </div>
        <h2 class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Buat Polling</h2>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center">
        <X size={16} />
      </button>
    </div>

    <div class="p-5 space-y-4 overflow-y-auto">
      <div class="space-y-1.5">
        <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Pertanyaan</label>
        <textarea bind:value={question} placeholder="Apa yang ingin kamu tanyakan?" 
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[80px] resize-none"></textarea>
      </div>

      <div class="space-y-3">
        <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Opsi Jawaban</label>
        {#each options as option, i}
          <div class="flex items-center gap-2" transition:slide={{ duration: 150 }}>
            <div class="flex-1 relative">
              <input type="text" bind:value={options[i]} placeholder="Opsi {i + 1}" 
                     class="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              {#if options.length > 2}
                <button onclick={() => removeOption(i)} class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              {/if}
            </div>
          </div>
        {/each}

        {#if options.length < 5}
          <button onclick={addOption} class="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 px-1 py-1 transition-colors">
            <Plus size={14} /> Tambah Opsi
          </button>
        {/if}
      </div>
    </div>

    <div class="p-5 border-t border-slate-50 bg-slate-50/50">
      <button onclick={handleSubmit} disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              class="w-full py-3.5 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all">
        Bagikan Polling
      </button>
    </div>
  </div>
</div>
