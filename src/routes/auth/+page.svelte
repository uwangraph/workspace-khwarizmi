<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'

  type Tab = 'login' | 'register' | 'confirm'

  let activeTab = $state<Tab>('login')
  let isLoading = $state(false)
  let errorMsg = $state('')

  // Login state
  let loginEmail = $state('')
  let loginPassword = $state('')

  // Register state
  let regName = $state('')
  let regEmail = $state('')
  let regPassword = $state('')

  async function handleLogin() {
    errorMsg = ''
    isLoading = true
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error
      goto('/')
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Terjadi kesalahan'
    } finally {
      isLoading = false
    }
  }

  async function handleRegister() {
    errorMsg = ''
    isLoading = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: { full_name: regName, role: 'user' },
        },
      })
      if (error) throw error

      if (!data.user) throw new Error('Gagal membuat akun')

      activeTab = 'confirm'
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Terjadi kesalahan'
    } finally {
      isLoading = false
    }
  }
</script>

<svelte:head>
  <title>Workspace Khwarizmi — Login</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700">
  
  <!-- Background animated blobs -->
  <div class="absolute inset-0 overflow-hidden">
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>

  <!-- ── LEFT PANEL with Glassmorphism ── -->
  <div class="hidden lg:flex flex-col justify-center flex-1 px-16 py-12 relative z-10">
    
    <!-- Glass card untuk left panel -->
    <div class="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
      <!-- Brand -->
      <div class="flex items-center gap-3 mb-12">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg bg-white/20 backdrop-blur-sm border border-white/30">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            />
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

      <!-- Headline -->
      <h1 class="text-5xl leading-tight mb-4 text-white font-bold" style="font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.5px;">
        Absensi &amp;<br />Task Tracker
      </h1>
      <p class="text-base leading-relaxed mb-10 max-w-xs text-orange-100">
        Pantau kehadiran dan progres pekerjaan tim dalam satu platform terintegrasi.
      </p>

      <!-- Features -->
      <div class="flex flex-col gap-4">
        {#each [
          { label: 'Verifikasi selfie real-time', icon: 'camera' },
          { label: '3 sesi absensi per hari', icon: 'calendar' },
          { label: 'Task tracker terintegrasi', icon: 'checklist' },
        ] as feat}
          <div class="flex items-center gap-3 group cursor-pointer">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all duration-300">
              {#if feat.icon === 'camera'}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              {:else if feat.icon === 'calendar'}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              {:else}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              {/if}
            </div>
            <span class="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{feat.label}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- ── RIGHT PANEL with Glassmorphism ── -->
  <div class="flex flex-col justify-center w-full lg:w-[480px] flex-shrink-0 px-6 py-12 relative z-10">
    
    <!-- Glass card untuk form -->
    <div class="backdrop-blur-2xl bg-white/95 rounded-3xl p-8 shadow-2xl border border-white/50">
      
      <!-- Mobile brand -->
      <div class="flex items-center gap-3 mb-8 lg:hidden">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-orange-500 to-orange-600">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            />
          </svg>
        </div>
        <div>
          <span class="font-extrabold text-slate-800 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Workspace Khwarizmi
          </span>
          <p class="text-[10px] font-semibold text-orange-500 tracking-wider mt-0.5">Platform Manajemen Kerja</p>
        </div>
      </div>

      <!-- Tabs -->
      {#if activeTab !== 'confirm'}
      <div class="flex gap-1 bg-slate-100/80 backdrop-blur-sm rounded-xl p-1 mb-8">
        {#each [['login', 'Masuk'], ['register', 'Daftar']] as [tab, label]}
          <button
            onclick={() => { activeTab = tab as Tab; errorMsg = '' }}
            class="flex-1 py-2.5 text-xs font-bold tracking-wide uppercase rounded-lg transition-all duration-200
                   {activeTab === tab
                     ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                     : 'text-slate-500 hover:text-slate-700'}"
            style="font-family:'Inter',sans-serif;"
          >
            {label}
          </button>
        {/each}
      </div>
      {/if}

      <!-- ── LOGIN FORM ── -->
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
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
                Alamat Email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  bind:value={loginEmail}
                  placeholder="nama@perusahaan.com"
                  class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl
                         outline-none transition-all placeholder:text-slate-400
                         focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                  style="font-family:'Inter',sans-serif;"
                />
              </div>
            </div>

            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
                Kata Sandi
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  bind:value={loginPassword}
                  placeholder="••••••••"
                  onkeydown={(e) => e.key === 'Enter' && handleLogin()}
                  class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl
                         outline-none transition-all placeholder:text-slate-400
                         focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                  style="font-family:'Inter',sans-serif;"
                />
              </div>
            </div>

            <button
              onclick={handleLogin}
              disabled={isLoading}
              class="w-full mt-2 py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white
                     transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                     hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]
                     bg-gradient-to-r from-orange-500 to-orange-600 shadow-md"
              style="font-family:'Inter',sans-serif;"
            >
              {#if isLoading}
                <span class="inline-flex items-center gap-2">
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Memproses...
                </span>
              {:else}
                Masuk ke Workspace
              {/if}
            </button>
          </div>

          <div class="flex items-center gap-3 my-8">
            <div class="flex-1 h-px bg-slate-200"></div>
            <span class="text-xs text-slate-400 font-semibold">Belum punya akun?</span>
            <div class="flex-1 h-px bg-slate-200"></div>
          </div>

          <p class="text-center">
            <button
              onclick={() => { activeTab = 'register'; errorMsg = '' }}
              class="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              Daftar sekarang →
            </button>
          </p>
        </div>
      {/if}

      <!-- ── REGISTER FORM ── -->
      {#if activeTab === 'register'}
        <div>
          <h2 class="text-3xl font-bold text-slate-800 mb-2" style="font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-0.3px;">
            Bergabung sekarang
          </h2>
          <p class="text-sm font-medium text-slate-500 mb-8">
            Isi data diri Anda untuk bergabung
          </p>

          <div class="flex flex-col gap-5">
            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
                Nama Lengkap
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  bind:value={regName}
                  placeholder="Muhammad Rizki"
                  class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl
                         outline-none transition-all placeholder:text-slate-400
                         focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                  style="font-family:'Inter',sans-serif;"
                />
              </div>
            </div>

            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
                Alamat Email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  bind:value={regEmail}
                  placeholder="nama@perusahaan.com"
                  class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl
                         outline-none transition-all placeholder:text-slate-400
                         focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                  style="font-family:'Inter',sans-serif;"
                />
              </div>
            </div>

            <div class="group">
              <label class="block text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
                Kata Sandi
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  bind:value={regPassword}
                  placeholder="Minimal 8 karakter"
                  class="w-full pl-10 pr-4 py-3.5 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl
                         outline-none transition-all placeholder:text-slate-400
                         focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20"
                  style="font-family:'Inter',sans-serif;"
                />
              </div>
            </div>

            <button
              onclick={handleRegister}
              disabled={isLoading}
              class="w-full mt-2 py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white
                     transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                     hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]
                     bg-gradient-to-r from-orange-500 to-orange-600 shadow-md"
              style="font-family:'Inter',sans-serif;"
            >
              {#if isLoading}
                <span class="inline-flex items-center gap-2">
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Memproses...
                </span>
              {:else}
                Buat Akun
              {/if}
            </button>
          </div>

          <p class="text-center mt-6 text-sm text-slate-500">
            Sudah punya akun?
            <button
              onclick={() => { activeTab = 'login'; errorMsg = '' }}
              class="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              Masuk di sini
            </button>
          </p>
        </div>
      {/if}

      <!-- ── CONFIRM EMAIL SCREEN ── -->
      {#if activeTab === 'confirm'}
        <div class="flex flex-col items-center text-center py-4">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200">
            <svg class="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 13l2 2 4-4" />
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-slate-800 mb-3" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Cek email Anda!
          </h2>
          <p class="text-sm text-slate-500 leading-relaxed mb-2">
            Kami sudah mengirimkan link konfirmasi ke
          </p>
          <p class="text-sm font-bold text-slate-700 mb-6">{regEmail}</p>
          <p class="text-xs text-slate-400 leading-relaxed mb-8">
            Klik link di email tersebut untuk mengaktifkan akun, lalu kembali ke sini untuk masuk.
          </p>

          <button
            onclick={() => { activeTab = 'login'; errorMsg = '' }}
            class="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase text-white
                   transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]
                   bg-gradient-to-r from-orange-500 to-orange-600 shadow-md"
          >
            Masuk Sekarang
          </button>

          <p class="text-xs text-slate-400 mt-6">
            Email tidak masuk? Cek folder <span class="font-semibold text-slate-500">Spam</span> atau
            <button
              onclick={() => { activeTab = 'register'; errorMsg = '' }}
              class="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
            >
              daftar ulang
            </button>
          </p>
        </div>
      {/if}

      <!-- Error / Success Message -->
      {#if errorMsg}
        <div class="mt-6 px-4 py-3 rounded-xl text-xs font-semibold text-center transition-all
                    {errorMsg.startsWith('✓')
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-red-50 text-red-500 border border-red-200'}">
          {errorMsg}
        </div>
      {/if}

    </div>
  </div>
</div>

<style>
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
</style>