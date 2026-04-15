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

      // Profile auto-dibuat oleh trigger di database (role default: 'user')
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
  <title>Khwarizmi Hub — Login</title>
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="min-h-screen flex" style="font-family: 'DM Sans', sans-serif;">

  <!-- ── LEFT PANEL ── -->
  <div
    class="hidden lg:flex flex-col justify-center flex-1 px-16 py-12 relative overflow-hidden"
    style="background: #0a0f1a;"
  >
    <!-- Glow effects -->
    <div
      class="absolute pointer-events-none"
      style="top:-80px;left:-80px;width:320px;height:320px;border-radius:50%;
             background:radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%);"
    ></div>
    <div
      class="absolute pointer-events-none"
      style="bottom:-60px;right:-60px;width:260px;height:260px;border-radius:50%;
             background:radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%);"
    ></div>

    <!-- Brand -->
    <div class="flex items-center gap-3 mb-14">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style="background: linear-gradient(135deg,#3b82f6,#6366f1);"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          />
        </svg>
      </div>
      <div>
        <p class="font-bold text-white text-lg leading-none" style="font-family:'Syne',sans-serif;">
          Khwarizmi Hub
        </p>
        <p class="text-xs font-semibold tracking-widest uppercase mt-0.5" style="color:#475569;">
          Workspace v2.1
        </p>
      </div>
    </div>

    <!-- Headline -->
    <h1
      class="text-4xl leading-tight mb-4 text-white"
      style="font-family:'Syne',sans-serif;letter-spacing:-0.5px;"
    >
      Absensi &amp;<br />Task Tracker
    </h1>
    <p class="text-sm leading-relaxed mb-12 max-w-xs" style="color:#64748b;">
      Pantau kehadiran dan progres pekerjaan tim dalam satu platform terintegrasi.
    </p>

    <!-- Features -->
    <div class="flex flex-col gap-4">
      {#each [
        {
          label: 'Verifikasi selfie real-time',
          icon: `<circle cx="12" cy="12" r="9" stroke="#3b82f6" stroke-width="2"/>
                 <path d="M9 12l2 2 4-4" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>`,
        },
        {
          label: '3 sesi absensi per hari',
          icon: `<rect x="3" y="4" width="18" height="16" rx="2" stroke="#3b82f6" stroke-width="2"/>
                 <path d="M8 2v4M16 2v4M3 10h18" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>`,
        },
        {
          label: 'Task tracker terintegrasi',
          icon: `<path d="M9 11l3 3L22 4" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                 <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                       stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>`,
        },
      ] as feat}
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.2);"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
              {@html feat.icon}
            </svg>
          </div>
          <span class="text-sm font-medium" style="color:#94a3b8;">{feat.label}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- ── RIGHT PANEL ── -->
  <div
    class="flex flex-col justify-center w-full lg:w-[420px] flex-shrink-0 px-8 py-12 bg-white"
  >

    <!-- Mobile brand -->
    <div class="flex items-center gap-3 mb-10 lg:hidden">
      <div
        class="w-9 h-9 rounded-xl flex items-center justify-center"
        style="background:linear-gradient(135deg,#3b82f6,#6366f1);"
      >
        <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          />
        </svg>
      </div>
      <span class="font-bold text-slate-900 text-base" style="font-family:'Syne',sans-serif;">
        Khwarizmi Hub
      </span>
    </div>

    <!-- Tabs — disembunyikan saat layar konfirmasi -->
    {#if activeTab !== 'confirm'}
    <div class="flex gap-0 bg-slate-100 rounded-xl p-1 mb-8">
      {#each [['login', 'Masuk'], ['register', 'Daftar']] as [tab, label]}
        <button
          onclick={() => { activeTab = tab as Tab; errorMsg = '' }}
          class="flex-1 py-2.5 text-xs font-bold tracking-wide uppercase rounded-[10px] transition-all duration-200
                 {activeTab === tab
                   ? 'bg-white text-slate-900 shadow-sm'
                   : 'text-slate-400 hover:text-slate-600'}"
          style="font-family:'DM Sans',sans-serif;"
        >
          {label}
        </button>
      {/each}
    </div>
    {/if}

    <!-- ── LOGIN FORM ── -->
    {#if activeTab === 'login'}
      <h2
        class="text-2xl text-slate-900 mb-1"
        style="font-family:'Syne',sans-serif;letter-spacing:-0.3px;"
      >
        Selamat datang
      </h2>
      <p class="text-xs font-medium text-slate-400 mb-7">
        Masuk untuk melanjutkan ke workspace kamu
      </p>

      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
            Email
          </label>
          <input
            type="email"
            bind:value={loginEmail}
            placeholder="nama@khwarizmi.com"
            class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900
                   bg-slate-50 outline-none transition-all placeholder:text-slate-300
                   focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            style="font-family:'DM Sans',sans-serif;"
          />
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
            Password
          </label>
          <input
            type="password"
            bind:value={loginPassword}
            placeholder="••••••••"
            onkeydown={(e) => e.key === 'Enter' && handleLogin()}
            class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900
                   bg-slate-50 outline-none transition-all placeholder:text-slate-300
                   focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            style="font-family:'DM Sans',sans-serif;"
          />
        </div>

        <button
          onclick={handleLogin}
          disabled={isLoading}
          class="w-full mt-1 py-4 rounded-xl text-xs font-bold tracking-widest uppercase text-white
                 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                 hover:-translate-y-0.5 active:scale-[0.98]"
          style="background:#0f172a;font-family:'DM Sans',sans-serif;"
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

      <div class="flex items-center gap-3 my-6">
        <div class="flex-1 h-px bg-slate-100"></div>
        <span class="text-xs text-slate-300 font-semibold">atau</span>
        <div class="flex-1 h-px bg-slate-100"></div>
      </div>

      <p class="text-xs text-slate-400 text-center">
        Belum punya akun?
        <button
          onclick={() => { activeTab = 'register'; errorMsg = '' }}
          class="text-blue-500 font-semibold hover:text-blue-600 transition-colors"
        >
          Daftar sekarang
        </button>
      </p>
    {/if}

    <!-- ── REGISTER FORM ── -->
    {#if activeTab === 'register'}
      <h2
        class="text-2xl text-slate-900 mb-1"
        style="font-family:'Syne',sans-serif;letter-spacing:-0.3px;"
      >
        Buat akun baru
      </h2>
      <p class="text-xs font-medium text-slate-400 mb-7">
        Isi data diri kamu untuk bergabung
      </p>

      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
            Nama Lengkap
          </label>
          <input
            type="text"
            bind:value={regName}
            placeholder="Muhammad Rizki"
            class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900
                   bg-slate-50 outline-none transition-all placeholder:text-slate-300
                   focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            style="font-family:'DM Sans',sans-serif;"
          />
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
            Email
          </label>
          <input
            type="email"
            bind:value={regEmail}
            placeholder="nama@khwarizmi.com"
            class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900
                   bg-slate-50 outline-none transition-all placeholder:text-slate-300
                   focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            style="font-family:'DM Sans',sans-serif;"
          />
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">
            Password
          </label>
          <input
            type="password"
            bind:value={regPassword}
            placeholder="Min. 8 karakter"
            class="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900
                   bg-slate-50 outline-none transition-all placeholder:text-slate-300
                   focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            style="font-family:'DM Sans',sans-serif;"
          />
        </div>

        <button
          onclick={handleRegister}
          disabled={isLoading}
          class="w-full mt-1 py-4 rounded-xl text-xs font-bold tracking-widest uppercase text-white
                 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                 hover:-translate-y-0.5 active:scale-[0.98]"
          style="background:#0f172a;font-family:'DM Sans',sans-serif;"
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

      <p class="text-xs text-slate-400 text-center mt-6">
        Sudah punya akun?
        <button
          onclick={() => { activeTab = 'login'; errorMsg = '' }}
          class="text-blue-500 font-semibold hover:text-blue-600 transition-colors"
        >
          Masuk di sini
        </button>
      </p>
    {/if}

    <!-- ── CONFIRM EMAIL SCREEN ── -->
    {#if activeTab === 'confirm'}
      <div class="flex flex-col items-center text-center py-4">
        <div
          class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style="background:#eff6ff;border:1px solid #bfdbfe;"
        >
          <svg width="30" height="30" fill="none" viewBox="0 0 24 24">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <h2
          class="text-2xl text-slate-900 mb-2"
          style="font-family:'Syne',sans-serif;letter-spacing:-0.3px;"
        >
          Cek email kamu!
        </h2>
        <p class="text-sm text-slate-400 leading-relaxed mb-2 max-w-xs">
          Kami sudah kirim link konfirmasi ke
        </p>
        <p class="text-sm font-bold text-slate-700 mb-6">{regEmail}</p>
        <p class="text-xs text-slate-400 leading-relaxed mb-8 max-w-xs">
          Klik link di email tersebut untuk mengaktifkan akun, lalu kembali ke sini untuk masuk.
        </p>

        <button
          onclick={() => { activeTab = 'login'; errorMsg = '' }}
          class="w-full py-4 rounded-xl text-xs font-bold tracking-widest uppercase text-white
                 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
          style="background:#0f172a;font-family:'DM Sans',sans-serif;"
        >
          Masuk Sekarang
        </button>

        <p class="text-xs text-slate-300 mt-5">
          Email tidak masuk? Cek folder <span class="font-semibold text-slate-400">Spam</span> atau
          <button
            onclick={() => { activeTab = 'register'; errorMsg = '' }}
            class="text-blue-500 font-semibold hover:text-blue-600 transition-colors"
          >
            daftar ulang
          </button>
        </p>
      </div>
    {/if}

    <!-- Error / Success Message -->
    {#if errorMsg}
      <div
        class="mt-5 px-4 py-3 rounded-xl text-xs font-semibold text-center transition-all
               {errorMsg.startsWith('✓')
                 ? 'bg-green-50 text-green-600 border border-green-200'
                 : 'bg-red-50 text-red-500 border border-red-200'}"
      >
        {errorMsg}
      </div>
    {/if}

  </div>
</div>