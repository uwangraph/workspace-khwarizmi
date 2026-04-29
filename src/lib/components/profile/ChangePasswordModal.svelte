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
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
       onclick={(e) => e.stopPropagation()}>
    <div class="sm:hidden flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Ganti Password</span>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
        <X size={16} />
      </button>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      {#each [['Password Lama', currentPassword, (v: string) => currentPassword = v, showCurrentPw, () => showCurrentPw = !showCurrentPw],
              ['Password Baru', newPassword,     (v: string) => newPassword = v,      showNewPw,     () => showNewPw = !showNewPw]] as [label, value, setter, show, toggle]}
        <div class="relative">
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
          <input type={show ? 'text' : 'password'} value={value} oninput={(e) => setter((e.target as HTMLInputElement).value)}
                 class="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onclick={toggle} type="button" class="absolute right-3 top-[2.1rem] text-slate-400 hover:text-slate-600 cursor-pointer">
            {#if show}<Eye size={16} />{:else}<EyeOff size={16} />{/if}
          </button>
        </div>
      {/each}

      {#if newPassword}
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-500">Kekuatan password</span>
            <span class="text-xs font-semibold" style="color:{pwStrength.color};">{pwStrength.label}</span>
          </div>
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" style="width:{pwStrength.score * 20}%; background:{pwStrength.color};"></div>
          </div>
        </div>
      {/if}

      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Konfirmasi Password Baru</label>
        <div class="relative">
          <input type="password" bind:value={confirmPassword}
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {#if confirmPassword}
            <span class="absolute right-3 top-1/2 -translate-y-1/2">
              {#if confirmPassword === newPassword}<CheckCircle2 size={16} class="text-green-500" />{:else}<AlertCircle size={16} class="text-red-400" />{/if}
            </span>
          {/if}
        </div>
      </div>

      {#if passwordError}
        <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <AlertCircle size={14} class="text-red-500 flex-shrink-0" />
          <p class="text-xs text-red-600 font-medium">{passwordError}</p>
        </div>
      {/if}

      <div class="flex gap-3 pb-2">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 cursor-pointer">Batal</button>
        <button onclick={changePassword} disabled={isLoading}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          {isLoading ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
