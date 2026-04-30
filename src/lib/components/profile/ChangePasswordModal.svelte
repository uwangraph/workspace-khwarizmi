<script lang="ts">
  import { X } from 'lucide-svelte'
  import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from 'lucide-svelte'
  import toast from 'svelte-french-toast'
  import { authService } from '$lib/services/authService'

  interface Props { userEmail: string; onClose: () => void }
  let { userEmail, onClose }: Props = $props()

  let currentPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let showCurrentPw = $state(false)
  let showNewPw = $state(false)
  let passwordError = $state('')
  let isLoading = $state(false)

  function passwordStrength(pw: string) {
    let score = 0
    if (pw.length >= 8) score++; if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++; if (/[0-9]/.test(pw)) score++; if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 2) return { score, label: 'Lemah', color: '#EF4444' }
    if (score <= 3) return { score, label: 'Cukup', color: '#F59E0B' }
    if (score <= 4) return { score, label: 'Baik', color: '#3B82F6' }
    return { score, label: 'Kuat', color: '#22C55E' }
  }
  let pwStrength = $derived(passwordStrength(newPassword))

  async function changePassword() {
    passwordError = ''
    if (!currentPassword || !newPassword || !confirmPassword) { passwordError = 'Semua field wajib diisi'; return }
    if (newPassword.length < 8) { passwordError = 'Password minimal 8 karakter'; return }
    if (newPassword !== confirmPassword) { passwordError = 'Konfirmasi password tidak cocok'; return }
    if (currentPassword === newPassword) { passwordError = 'Password baru harus berbeda'; return }
    isLoading = true
    const { error: authError } = await authService.verifyPassword(userEmail, currentPassword)
    if (authError) { passwordError = 'Password lama tidak benar'; isLoading = false; return }
    const { error } = await authService.changePassword(newPassword)
    isLoading = false
    if (error) { passwordError = error.message; return }
    toast.success('Password berhasil diubah')
    onClose()
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
        <h3 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Ganti Password</h3>
        <p class="text-[11px] text-slate-400">Pastikan password baru Anda kuat & aman</p>
      </div>
      <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-90">
        <X size={18} />
      </button>
    </div>

    <div class="px-8 pb-8 overflow-y-auto scrollbar-hide flex flex-col gap-6">
      {#each [['Password Lama', currentPassword, (v: string) => currentPassword = v, showCurrentPw, () => showCurrentPw = !showCurrentPw],
              ['Password Baru', newPassword,     (v: string) => newPassword = v,      showNewPw,     () => showNewPw = !showNewPw]] as [label, value, setter, show, toggle]}
        <div class="space-y-1.5 relative">
          <label class="ml-0.5 text-[11px] font-semibold text-slate-500">{label}</label>
          <div class="relative">
            <input type={show ? 'text' : 'password'} value={value} oninput={(e) => setter((e.target as HTMLInputElement).value)}
                   placeholder="••••••••"
                   class="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-200" />
            <button onclick={toggle} type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
              {#if show}<Eye size={16} />{:else}<EyeOff size={16} />{/if}
            </button>
          </div>
        </div>
      {/each}

      {#if newPassword}
        <div class="animate-slideDown">
          <div class="flex items-center justify-between mb-2 px-0.5">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Keamanan</span>
            <span class="text-[10px] font-bold" style="color:{pwStrength.color};">{pwStrength.label.toUpperCase()}</span>
          </div>
          <div class="h-1.5 bg-slate-50 rounded-full overflow-hidden flex gap-1">
            {#each Array(4) as _, i}
              <div class="h-full flex-1 rounded-full transition-all duration-500" 
                   style="background:{i < pwStrength.score ? pwStrength.color : '#f1f5f9'}; opacity:{i < pwStrength.score ? 1 : 0.5};"></div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="space-y-1.5">
        <label class="ml-0.5 text-[11px] font-semibold text-slate-500">Konfirmasi Password Baru</label>
        <div class="relative">
          <input type="password" bind:value={confirmPassword}
                 placeholder="••••••••"
                 class="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-200" />
          {#if confirmPassword}
            <div class="absolute right-3 top-1/2 -translate-y-1/2 animate-in zoom-in-50 duration-200">
              {#if confirmPassword === newPassword}
                <CheckCircle2 size={16} class="text-emerald-500" />
              {:else}
                <AlertCircle size={16} class="text-red-400" />
              {/if}
            </div>
          {/if}
        </div>
      </div>

      {#if passwordError}
        <div class="bg-red-50/50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-3 animate-slideDown">
          <AlertCircle size={16} class="text-red-500 flex-shrink-0" />
          <p class="text-[11px] text-red-600 font-bold leading-tight">{passwordError}</p>
        </div>
      {/if}

      <div class="flex gap-3 pt-2">
        <button onclick={onClose} class="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors">Batal</button>
        <button onclick={changePassword} disabled={isLoading}
                class="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                style="background: linear-gradient(to right, #F97316, #EA580C);">
          {isLoading ? 'Memperbarui...' : 'Simpan Password'}
        </button>
      </div>
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
