<script lang="ts">
  import { X } from 'lucide-svelte'
  import { AlertCircle, CheckCircle2 } from 'lucide-svelte'
  import toast from 'svelte-french-toast'
  import { authService } from '$lib/services/authService'

  interface Props { userId: string; userEmail: string; onClose: () => void }
  let { userId, userEmail, onClose }: Props = $props()

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
    const res = await fetch('/api/user/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newEmail: newEmail.trim() })
    });
    
    isLoading = false
    if (!res.ok) {
       const errData = await res.json();
       emailError = errData.error || 'Terjadi kesalahan saat mengganti email';
       return;
    }
    
    emailSuccess = true
    toast.success('Email berhasil diperbarui', { duration: 4000 })
    
    // Auto refresh to reflect new email in the app
    setTimeout(() => {
        window.location.reload();
    }, 1500);
  }
</script>

<div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); max-height:92vh;"
       onclick={(e) => e.stopPropagation()}>
    
    <div class="sm:hidden flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    
    <!-- Header -->
    <div class="flex items-center justify-between px-8 py-6">
      <div class="flex flex-col">
        <h3 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Ganti Email</h3>
        <p class="text-[11px] text-slate-400">Pastikan email baru Anda aktif</p>
      </div>
      <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-90">
        <X size={18} />
      </button>
    </div>

    <div class="px-8 pb-8 overflow-y-auto scrollbar-hide flex flex-col gap-6">
      {#if emailSuccess}
        <div class="flex flex-col items-center text-center py-4 space-y-4 animate-slideDown">
          <div class="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h4 class="text-base font-bold text-slate-800">Email Berhasil Diperbarui</h4>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed px-4">Email Anda telah berhasil diganti ke {newEmail}. Halaman akan dimuat ulang.</p>
          </div>
          <button onclick={onClose} class="w-full py-3.5 mt-4 rounded-xl text-sm font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors">Selesai</button>
        </div>
      {:else}
        <div class="space-y-1.5">
          <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Email Saat Ini</label>
          <div class="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-400 font-medium">{userEmail}</div>
        </div>

        <div class="space-y-1.5">
          <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Email Baru *</label>
          <input type="email" bind:value={newEmail} placeholder="contoh@email.com"
                 class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-200" />
        </div>

        <div class="space-y-1.5">
          <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Konfirmasi Password *</label>
          <input type="password" bind:value={emailPassword} placeholder="Masukkan password saat ini"
                 class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-200" />
        </div>

        {#if emailError}
          <div class="bg-red-50/50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-3 animate-slideDown">
            <AlertCircle size={16} class="text-red-500 flex-shrink-0" />
            <p class="text-[11px] text-red-600 font-bold leading-tight">{emailError}</p>
          </div>
        {/if}

        <div class="flex gap-3 pt-2">
          <button onclick={onClose} class="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors">Batal</button>
          <button onclick={changeEmail} disabled={isLoading}
                  class="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  style="background: linear-gradient(to right, #F97316, #EA580C);">
            {isLoading ? 'Memproses...' : 'Ubah Email'}
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
