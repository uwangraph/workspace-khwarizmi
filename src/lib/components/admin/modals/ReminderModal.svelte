<script lang="ts">
  import { X, Send, BellRing } from 'lucide-svelte'
  import type { Profile } from '$lib/components/admin/_types'
  import { fade, fly } from 'svelte/transition'

  interface Props {
    user: Profile
    onClose: () => void
    onSubmit: (message: string) => void
  }
  let { user, onClose, onSubmit } = $props<Props>()

  let message = $state('')
  let isSubmitting = $state(false)

  function handleSubmit() {
    if (!message.trim()) return
    isSubmitting = true
    onSubmit(message.trim())
  }
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" transition:fade={{duration: 200}}>
  <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
       transition:fly={{y: 20, duration: 300, opacity: 0}}>
    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
          <BellRing size={16} />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-800">Kirim Pengingat</h3>
          <p class="text-[10px] text-slate-500">Ke: <span class="font-semibold">{user.full_name}</span></p>
        </div>
      </div>
      <button onclick={onClose} class="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
        <X size={18} />
      </button>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for="message" class="text-xs font-semibold text-slate-700">Pesan Pengingat</label>
        <textarea id="message" bind:value={message} rows="4"
                  placeholder="Tulis pesan pengingat untuk karyawan ini..."
                  class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 resize-none"></textarea>
      </div>
    </div>

    <div class="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
      <button onclick={onClose} class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
        Batal
      </button>
      <button onclick={handleSubmit} disabled={!message.trim() || isSubmitting}
              class="px-4 py-2 text-xs font-semibold text-white rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style="background:linear-gradient(135deg,#F97316,#EA580C)">
        {#if isSubmitting}
          <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Mengirim...
        {:else}
          <Send size={14} />
          Kirim Notif
        {/if}
      </button>
    </div>
  </div>
</div>
