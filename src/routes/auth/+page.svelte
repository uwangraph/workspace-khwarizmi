<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import {
    Mail, Lock, User, Eye, EyeOff,
    ArrowRight, AlertCircle, CheckCircle2,
    KeyRound, ArrowLeft
  } from 'lucide-svelte'

  import { onMount } from 'svelte'
  import { MessageSquare, PhoneCall } from 'lucide-svelte'
  import type { AppSetting } from '$lib/components/admin/_types'

  type Tab = 'login' | 'register' | 'confirm' | 'forgot' | 'forgot_sent'

  let activeTab = $state<Tab>('login')
  let isLoading = $state(false)
  let errorMsg = $state('')

  // Login state
  let loginEmail = $state('')
  let loginPassword = $state('')
  let showLoginPw = $state(false)

  // Forgot password state
  let appSettings = $state<AppSetting | null>(null)

  onMount(async () => {
    const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single()
    if (settings) appSettings = settings
  })

  function formatWA(phone: string) {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
    return cleaned
  }

  // Forgot password state
  let forgotEmail = $state('')

  async function handleLogin() {
    errorMsg = ''
    if (!loginEmail.trim() || !loginPassword) {
      errorMsg = 'Email dan password wajib diisi'
      return
    }
    isLoading = true
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      })
      if (error) throw error
      goto('/')
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes('Invalid login credentials')) {
          errorMsg = 'Email atau password salah'
        } else if (e.message.includes('Email not confirmed')) {
          errorMsg = 'Email belum dikonfirmasi. Cek inbox Anda.'
        } else {
          errorMsg = e.message
        }
      } else {
        errorMsg = 'Terjadi kesalahan'
      }
    } finally {
      isLoading = false
    }
  }


  async function handleForgotPassword() {
    errorMsg = ''
    if (!forgotEmail.trim()) {
      errorMsg = 'Masukkan email Anda'
      return
    }
    isLoading = true
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) throw error
      activeTab = 'forgot_sent'
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Terjadi kesalahan'
    } finally {
      isLoading = false
    }
  }

  function switchTab(tab: Tab) {
    activeTab = tab
    errorMsg = ''
  }
</script>

<svelte:head>
  <title>Workspace Khwarizmi — Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700"
     style="font-family:'Inter',sans-serif;">

  <!-- Background blobs -->
  <div class="absolute inset-0 overflow-hidden">
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>

  <!-- ── LEFT PANEL ── -->
  <div class="hidden lg:flex flex-col justify-center flex-1 px-16 py-12 relative z-10">
    <div class="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
      <div class="flex items-center gap-3 mb-12">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg bg-white/20 backdrop-blur-sm border border-white/30">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div>
          <p class="font-extrabold text-white text-2xl leading-none tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Workspace Khwarizmi
          </p>
          <p class="text-xs font-semibold tracking-widest uppercase mt-1 text-orange-200">
            Platform Manajemen Kerja
          </p>
        </div>
      </div>

      <h1 class="text-5xl leading-tight mb-4 text-white font-bold" style="font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.5px;">
        Absensi &amp;<br />Task Tracker
      </h1>
      <p class="text-base leading-relaxed mb-10 max-w-xs text-orange-100">
        Pantau kehadiran dan progres pekerjaan tim dalam satu platform terintegrasi.
      </p>

      <div class="flex flex-col gap-4">
        {#each [
          { label: 'Verifikasi selfie real-time', icon: 'camera' },
          { label: '3 sesi absensi per hari', icon: 'calendar' },
          { label: 'Task tracker terintegrasi', icon: 'checklist' },
        ] as feat}
          <div class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all">
              {#if feat.icon === 'camera'}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
              {:else if feat.icon === 'calendar'}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              {:else}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              {/if}
            </div>
            <span class="text-sm font-medium text-white/90">{feat.label}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- ── RIGHT PANEL ── -->
  <div class="flex flex-col justify-center w-full lg:w-[480px] flex-shrink-0 px-6 py-12 relative z-10">
    <div class="backdrop-blur-2xl bg-white/95 rounded-3xl p-8 shadow-2xl border border-white/50">

      <!-- Mobile brand -->
      <div class="flex items-center gap-3 mb-8 lg:hidden">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-orange-500 to-orange-600">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div>
          <span class="font-extrabold text-slate-800 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Workspace Khwarizmi
          </span>
          <p class="text-[10px] font-semibold text-orange-500 tracking-wider mt-0.5">Platform Manajemen Kerja</p>
        </div>
      </div>

      <!-- ── Tabs (login/register only) ── -->
      {#if activeTab === 'login' || activeTab === 'register'}
        <div class="flex gap-1 bg-slate-100/80 rounded-xl p-1 mb-8">
          {#each [['login', 'Masuk'], ['register', 'Daftar']] as [tab, label]}
            <button onclick={() => switchTab(tab as Tab)}
                    class="flex-1 py-2.5 text-xs font-bold tracking-wide uppercase rounded-lg transition-all duration-200
                           {activeTab === tab ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}">
              {label}
            </button>
          {/each}
        </div>
      {/if}

      <!-- ── LOGIN ── -->
      {#if activeTab === 'login'}
        <div>
          <h2 class="text-3xl font-bold text-slate-800 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.3px;">
            Selamat datang
          </h2>
          <p class="text-sm font-medium text-slate-500 mb-8">
            Masuk untuk melanjutkan ke workspace Anda
          </p>

          <div class="flex flex-col gap-5">
            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">Email</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} class="text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input type="email" bind:value={loginEmail} placeholder="example@gmail.com"
                       onkeydown={(e) => e.key === 'Enter' && handleLogin()}
                       class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
              </div>
            </div>

            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} class="text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input type={showLoginPw ? 'text' : 'password'} bind:value={loginPassword} placeholder="Masukkan password"
                       onkeydown={(e) => e.key === 'Enter' && handleLogin()}
                       class="w-full pl-10 pr-11 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
                <button type="button" onclick={() => showLoginPw = !showLoginPw}
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {#if showLoginPw}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
                </button>
              </div>
            </div>

            <!-- Forgot password link -->
            <div class="flex justify-end -mt-2">
              <button onclick={() => switchTab('forgot')}
                      class="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                Lupa password?
              </button>
            </div>

            <button onclick={handleLogin} disabled={isLoading}
                    class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white transition-all disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] bg-gradient-to-r from-orange-500 to-orange-600 shadow-md flex items-center justify-center gap-2">
              {#if isLoading}
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Memproses...
              {:else}
                Masuk ke Workspace
                <ArrowRight size={16} />
              {/if}
            </button>
          </div>

          <div class="flex items-center gap-3 my-8">
            <div class="flex-1 h-px bg-slate-200"></div>
            <span class="text-xs text-slate-400 font-semibold">Belum punya akun?</span>
            <div class="flex-1 h-px bg-slate-200"></div>
          </div>

          <p class="text-center">
            <button onclick={() => switchTab('register')}
                    class="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 mx-auto">
              Daftar sekarang <ArrowRight size={14} />
            </button>
          </p>
        </div>
      {/if}

      {#if activeTab === 'register'}
        <div class="flex flex-col items-center text-center py-4">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-orange-100 border border-orange-200">
            <User size={28} class="text-orange-600" />
          </div>

          <h2 class="text-2xl font-bold text-slate-800 mb-3" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Pendaftaran Internal
          </h2>
          <p class="text-sm text-slate-500 leading-relaxed mb-8">
            Workspace ini bersifat internal perusahaan. Pendaftaran akun hanya dapat dilakukan melalui Administrator.
          </p>

          <div class="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-8">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ingin bergabung?</p>
            <p class="text-sm text-slate-600 mb-5">Silakan hubungi Admin untuk dibuatkan akun baru.</p>
            
            {#if appSettings?.admin_contact}
              <a href="https://wa.me/{formatWA(appSettings.admin_contact)}?text=Halo%20Admin%2C%20saya%20ingin%20mendaftar%20akun%20di%20Workspace%20Khwarizmi.%20Mohon%20bantuannya." target="_blank"
                 class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white transition-all hover:shadow-lg active:scale-[0.98] bg-green-500 shadow-md flex items-center justify-center gap-2">
                <MessageSquare size={18} />
                Hubungi Admin via WA
              </a>
            {:else}
              <div class="py-3 px-4 rounded-xl bg-slate-100 text-slate-400 text-xs italic">
                Nomor kontak admin belum diatur.
              </div>
            {/if}
          </div>

          <button onclick={() => switchTab('login')}
                  class="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
            Kembali ke Login
          </button>
        </div>
      {/if}

      <!-- ── CONFIRM EMAIL ── -->
      {#if activeTab === 'confirm'}
        <div class="flex flex-col items-center text-center py-4">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-green-50 border border-green-200">
            <Mail size={28} class="text-green-600" />
          </div>

          <h2 class="text-2xl font-bold text-slate-800 mb-3" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Cek email Anda
          </h2>
          <p class="text-sm text-slate-500 leading-relaxed mb-1">
            Kami sudah mengirimkan link konfirmasi ke
          </p>
          <p class="text-sm font-bold text-slate-700 mb-5">{regEmail}</p>
          <p class="text-xs text-slate-400 leading-relaxed mb-8">
            Klik link di email tersebut untuk mengaktifkan akun, lalu kembali ke sini untuk masuk.
          </p>

          <button onclick={() => switchTab('login')}
                  class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white transition-all hover:shadow-lg active:scale-[0.98] bg-gradient-to-r from-orange-500 to-orange-600 shadow-md flex items-center justify-center gap-2">
            Masuk Sekarang
            <ArrowRight size={16} />
          </button>

          <p class="text-xs text-slate-400 mt-6">
            Email tidak masuk? Cek folder <span class="font-semibold text-slate-500">Spam</span> atau
            <button onclick={() => switchTab('register')}
                    class="text-orange-500 font-semibold hover:text-orange-600 transition-colors ml-1">
              daftar ulang
            </button>
          </p>
        </div>
      {/if}

      <!-- ── FORGOT PASSWORD ── -->
      {#if activeTab === 'forgot'}
        <div>
          <button onclick={() => switchTab('login')}
                  class="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-6">
            <ArrowLeft size={14} />
            Kembali ke Login
          </button>

          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50 border border-emerald-100">
            <KeyRound size={24} class="text-emerald-600" />
          </div>

          <h2 class="text-2xl font-bold text-slate-800 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Lupa Password
          </h2>
          <p class="text-sm text-slate-500 mb-8 leading-relaxed">
            Masukkan email akun Anda. Kami akan mengirimkan link untuk mengatur ulang password.
          </p>

          <div class="flex flex-col gap-5">
            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">Email</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} class="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input type="email" bind:value={forgotEmail} placeholder="example@gmail.com"
                       onkeydown={(e) => e.key === 'Enter' && handleForgotPassword()}
                       class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20" />
              </div>
            </div>

            <button onclick={handleForgotPassword} disabled={isLoading}
                    class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white transition-all disabled:opacity-60 hover:shadow-lg active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
                    style="background: linear-gradient(135deg, #10B981, #059669);">
              {#if isLoading}
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Mengirim...
              {:else}
                Kirim Link Reset
                <ArrowRight size={16} />
              {/if}
            </button>
          </div>
        </div>
      {/if}

      <!-- ── FORGOT SENT ── -->
      {#if activeTab === 'forgot_sent'}
        <div class="flex flex-col items-center text-center py-4">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-green-50 border border-green-200">
            <CheckCircle2 size={28} class="text-green-600" />
          </div>

          <h2 class="text-2xl font-bold text-slate-800 mb-3" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Link terkirim
          </h2>
          <p class="text-sm text-slate-500 leading-relaxed mb-1">
            Kami mengirimkan link reset password ke
          </p>
          <p class="text-sm font-bold text-slate-700 mb-5">{forgotEmail}</p>
          <p class="text-xs text-slate-400 leading-relaxed mb-8">
            Buka inbox email Anda dan klik link tersebut untuk mengatur password baru. Link berlaku selama 1 jam.
          </p>

          <button onclick={() => switchTab('login')}
                  class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white transition-all hover:shadow-lg active:scale-[0.98] bg-gradient-to-r from-orange-500 to-orange-600 shadow-md flex items-center justify-center gap-2">
            Kembali ke Login
            <ArrowRight size={16} />
          </button>

          <p class="text-xs text-slate-400 mt-6">
            Tidak menerima email?
            <button onclick={() => switchTab('forgot')}
                    class="text-purple-500 font-semibold hover:text-purple-600 transition-colors ml-1">
              Kirim ulang
            </button>
          </p>
        </div>
      {/if}

      <!-- Error Message -->
      {#if errorMsg}
        <div class="mt-6 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-50 text-red-600 border border-red-200">
          <AlertCircle size={14} class="flex-shrink-0" />
          {errorMsg}
        </div>
      {/if}

    </div>
  </div>
</div>

<style>
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob { animation: blob 7s infinite; }
  .animation-delay-2000 { animation-delay: 2s; }
  .animation-delay-4000 { animation-delay: 4s; }
</style>