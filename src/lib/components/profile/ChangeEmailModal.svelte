<script lang="ts">
  import { X } from 'lucide-svelte'
  import { AlertCircle, CheckCircle2 } from 'lucide-svelte'
  import toast from 'svelte-french-toast'
  import { authService } from '$lib/services/authService'

  interface Props { userEmail: string; onClose: () => void }
  let { userEmail, onClose }: Props = $props()

  let newEmail = $state('')
  let emailPassword = $state('')
  let emailError = $state('')
  let emailSuccess = $state(false)
  let isLoading = $state(false)

  async function changeEmail() {
    emailError = ''; emailSuccess = false
    if (!newEmail.trim() || !emailPassword) { emailError = 'Semua field wajib diisi'; return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { emailError = 'Format email tidak valid'; return }
    if (newEmail.trim() === userEmail) { emailError = 'Email baru sama dengan email saat ini'; return }
    isLoading = true
    const { error: authError } = await authService.verifyPassword(userEmail, emailPassword)
    if (authError) { emailError = 'Password tidak benar'; isLoading = false; return }
    const { error } = await authService.changeEmail(newEmail.trim())
    isLoading = false
    if (error) { emailError = error.message; return }
    emailSuccess = true
    toast.success('Link konfirmasi dikirim ke email baru', { duration: 4000 })
  }
</script>

<div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
       onclick={(e) => e.stopPropagation()}>
    <div class="sm:hidden flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Ganti Email</span>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
        <X size={16} />
      </button>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      {#if emailSuccess}
        <div class="bg-green-50 border border-green-100 rounded-xl px-4 py-4 flex items-start gap-3">
          <CheckCircle2 size={20} class="text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-semibold text-green-700">Link konfirmasi terkirim!</p>
            <p class="text-xs text-green-600 mt-1">Cek inbox email baru Anda untuk mengkonfirmasi perubahan.</p>
          </div>
        </div>
        <button onclick={onClose} class="w-full py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 cursor-pointer">Tutup</button>
      {:else}
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Email Saat Ini</label>
          <p class="text-sm text-slate-700 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">{userEmail}</p>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Email Baru <span class="text-red-500">*</span></label>
          <input type="email" bind:value={newEmail} placeholder="contoh@email.com"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Konfirmasi Password <span class="text-red-500">*</span></label>
          <input type="password" bind:value={emailPassword} placeholder="Masukkan password saat ini"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        {#if emailError}
          <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <AlertCircle size={14} class="text-red-500 flex-shrink-0" />
            <p class="text-xs text-red-600 font-medium">{emailError}</p>
          </div>
        {/if}
        <div class="flex gap-3 pb-2">
          <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 cursor-pointer">Batal</button>
          <button onclick={changeEmail} disabled={isLoading}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {isLoading ? 'Memproses...' : 'Kirim Konfirmasi'}
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
