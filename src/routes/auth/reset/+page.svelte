<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-svelte'
  import toast from 'svelte-french-toast'

  let newPassword = $state('')
  let confirmPassword = $state('')
  let showPassword = $state(false)
  let isLoading = $state(false)
  let errorMsg = $state('')
  let isSuccess = $state(false)

  onMount(async () => {
    // Cek apakah ada session (biasanya otomatis dari link Supabase)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Jika tidak ada session, mungkin link kadaluarsa atau tidak valid
      // Kita biarkan user mencoba, tapi Supabase akan error nantinya jika tidak sah
    }
  })

  async function handleResetPassword() {
    errorMsg = ''
    if (newPassword.length < 6) {
      errorMsg = 'Password minimal 6 karakter'
      return
    }
    if (newPassword !== confirmPassword) {
      errorMsg = 'Konfirmasi password tidak cocok'
      return
    }

    isLoading = true
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      isSuccess = true
      toast.success('Password berhasil diperbarui')
      
      // Tunggu sebentar lalu ke login
      setTimeout(() => {
        goto('/auth')
      }, 3000)
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Terjadi kesalahan saat mereset password'
    } finally {
      isLoading = false
    }
  }
</script>

<svelte:head>
  <title>Reset Password — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900"
     style="font-family:'Inter',sans-serif;">
  
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
  </div>

  <div class="w-full max-w-md relative z-10">
    <div class="backdrop-blur-2xl bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/50">
      
      <div class="flex flex-col items-center text-center mb-8">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20">
          <ShieldCheck size={32} class="text-white" />
        </div>
        
        <h1 class="text-3xl font-black text-slate-900 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:-0.5px;">
          Password Baru
        </h1>
        <p class="text-sm font-medium text-slate-500">
          Silakan masukkan password baru Anda untuk mengamankan akun.
        </p>
      </div>

      {#if isSuccess}
        <div class="flex flex-col items-center text-center py-8 animate-in fade-in zoom-in duration-500">
          <div class="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-100">
            <CheckCircle2 size={40} class="text-green-500" />
          </div>
          <h3 class="text-xl font-bold text-slate-800 mb-2">Berhasil Diperbarui!</h3>
          <p class="text-sm text-slate-500 mb-8 leading-relaxed">
            Password Anda telah berhasil diubah. Anda akan dialihkan ke halaman login dalam beberapa detik.
          </p>
          <a href="/auth" class="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Klik di sini jika tidak otomatis beralih <ArrowRight size={14} />
          </a>
        </div>
      {:else}
        <div class="space-y-6">
          <div class="group">
            <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Password Baru</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} class="text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                bind:value={newPassword}
                placeholder="Minimal 6 karakter"
                onkeydown={(e) => e.key === 'Enter' && handleResetPassword()}
                class="w-full pl-11 pr-12 py-4 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
              <button 
                type="button" 
                onclick={() => showPassword = !showPassword}
                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
              </button>
            </div>
          </div>

          <div class="group">
            <label class="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Konfirmasi Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} class="text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                bind:value={confirmPassword}
                placeholder="Ulangi password baru"
                onkeydown={(e) => e.key === 'Enter' && handleResetPassword()}
                class="w-full pl-11 pr-12 py-4 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {#if errorMsg}
            <div class="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 animate-shake">
              <AlertCircle size={18} class="flex-shrink-0 mt-0.5" />
              <p class="text-xs font-bold leading-relaxed">{errorMsg}</p>
            </div>
          {/if}

          <button 
            onclick={handleResetPassword}
            disabled={isLoading}
            class="w-full py-4 rounded-2xl text-sm font-black text-white shadow-xl shadow-purple-500/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            style="background: linear-gradient(135deg, #10B981, #059669);"
          >
            {#if isLoading}
              <svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Memproses...</span>
            {:else}
              <span>Simpan Password Baru</span>
              <ArrowRight size={18} />
            {/if}
          </button>
        </div>
      {/if}

    </div>
    
    <p class="text-center mt-8">
      <a href="/auth" class="text-sm font-bold text-white/60 hover:text-white transition-colors flex items-center justify-center gap-1">
        Batal dan kembali ke Login
      </a>
    </p>
  </div>
</div>

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
</style>
