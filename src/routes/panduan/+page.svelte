<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    ArrowLeft, BookOpen, LogIn, LayoutDashboard, CalendarCheck, 
    CheckSquare, Bell, Shield, MapPin, Clock, Camera, 
    UserRound, MessageSquare, ChevronRight, Menu, X,
    Search, ExternalLink, Sparkles
  } from 'lucide-svelte';
  import { fade, slide, fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  let activeSection = $state('intro');
  let isSidebarOpen = $state(false);
  let scrollY = $state(0);

  const sections = [
    { id: 'intro', label: 'Pendahuluan', icon: BookOpen },
    { id: 'install', label: 'Instalasi & Akses', icon: LogIn },
    { id: 'dashboard', label: 'Beranda (Dashboard)', icon: LayoutDashboard },
    { id: 'presensi', label: 'Sistem Presensi', icon: CalendarCheck },
    { id: 'tasks', label: 'Manajemen Tugas', icon: CheckSquare },
    { id: 'chat', label: 'Obrolan (Chat)', icon: MessageSquare },
    { id: 'profile', label: 'Profil & Keamanan', icon: Shield },
    { id: 'faq', label: 'FAQ & Tips', icon: Sparkles }
  ];

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    isSidebarOpen = false;
    activeSection = id;
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            activeSection = entry.target.id;
          }
        });
      },
      { threshold: [0, 0.5, 1], rootMargin: '-80px 0px -20% 0px' }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>Dokumentasi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-slate-50 font-sans selection:bg-orange-100 selection:text-orange-900">
  <!-- Top Navigation (Mobile) -->
  <nav class="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button onclick={() => isSidebarOpen = true} class="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
        <Menu size={20} />
      </button>
      <span class="font-bold text-slate-900 tracking-tight">Dokumentasi</span>
    </div>
    <a href="/" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
      <X size={20} />
    </a>
  </nav>

  <div class="max-w-[1440px] mx-auto flex">
    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen {isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
    >
      <div class="h-full flex flex-col p-6">
        <!-- Logo Area -->
        <div class="flex items-center gap-3 mb-10 px-2">
          <div class="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <BookOpen size={20} class="text-white" />
          </div>
          <div>
            <h1 class="font-extrabold text-slate-900 leading-none">Khwarizmi</h1>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Documentation</p>
          </div>
        </div>

        <!-- Search Placeholder -->
        <div class="relative mb-8">
          <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari panduan..." 
            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none"
          />
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
          {#each sections as section}
            <button
              onclick={() => scrollTo(section.id)}
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                     {activeSection === section.id 
                       ? 'bg-orange-50 text-orange-600' 
                       : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}"
            >
              <section.icon size={18} class={activeSection === section.id ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span class="text-sm font-semibold tracking-tight">{section.label}</span>
              {#if activeSection === section.id}
                <div class="ml-auto w-1.5 h-1.5 rounded-full bg-orange-600" in:fade></div>
              {/if}
            </button>
          {/each}
        </nav>

        <!-- Footer Sidebar -->
        <div class="mt-auto pt-6 border-t border-slate-100">
          <a href="/" class="flex items-center justify-between group p-3 rounded-2xl bg-slate-900 text-white transition-all hover:bg-slate-800">
            <span class="text-xs font-bold">Kembali ke Aplikasi</span>
            <ArrowLeft size={14} class="rotate-180 text-slate-400 group-hover:text-white transition-colors" />
          </a>
        </div>
      </div>
    </aside>

    <!-- Overlay Mobile -->
    {#if isSidebarOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        onclick={() => isSidebarOpen = false}
        transition:fade
      ></div>
    {/if}

    <!-- Content Area -->
    <main class="flex-1 min-w-0 bg-white">
      <div class="max-w-4xl mx-auto px-6 py-12 lg:px-16 lg:py-20">
        
        <!-- Introduction -->
        <section id="intro" class="scroll-mt-24 mb-24">
          <div class="flex items-center gap-2 mb-6">
            <span class="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-full">Overview</span>
          </div>
          <h2 class="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1]" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Selamat Datang di <span class="text-orange-600">Workspace Khwarizmi</span>
          </h2>
          <p class="text-lg text-slate-600 leading-relaxed mb-10 max-w-2xl">
            Sistem manajemen kerja cerdas yang dirancang untuk meningkatkan produktivitas tim melalui pelacakan tugas real-time dan sistem presensi yang akurat.
          </p>
          
          <div class="grid sm:grid-cols-2 gap-6">
            <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all group">
              <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
                <Sparkles class="text-orange-600" size={24} />
              </div>
              <h4 class="font-bold text-slate-900 mb-2">Modern & Cepat</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Dibangun dengan teknologi terbaru untuk pengalaman pengguna yang mulus tanpa hambatan.</p>
            </div>
            <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all group">
              <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
                <Shield class="text-orange-600" size={24} />
              </div>
              <h4 class="font-bold text-slate-900 mb-2">Aman & Terpercaya</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Data kehadiran dan tugas Anda tersimpan aman dengan enkripsi tingkat tinggi.</p>
            </div>
          </div>
        </section>

        <hr class="border-slate-100 mb-24" />

        <!-- Installation -->
        <section id="install" class="scroll-mt-24 mb-24">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-6" style="font-family:'Plus Jakarta Sans',sans-serif;">Instalasi & Akses</h3>
          <p class="text-slate-600 mb-10 leading-relaxed">
            Workspace Khwarizmi adalah <span class="font-bold text-slate-900">Progressive Web App (PWA)</span>. Artinya, Anda bisa "menginstalnya" ke HP tanpa perlu melalui App Store atau Play Store.
          </p>

          <div class="space-y-6">
            <div class="flex gap-6 p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform">
                <LogIn size={120} />
              </div>
              <div class="hidden sm:flex w-16 h-16 bg-white rounded-3xl items-center justify-center shrink-0 shadow-sm border border-blue-100">
                <span class="text-2xl">🤖</span>
              </div>
              <div>
                <h4 class="font-bold text-slate-900 text-lg mb-2">Android (Chrome/Edge)</h4>
                <p class="text-slate-600 text-sm leading-relaxed mb-4">Saat membuka aplikasi, klik banner <span class="px-2 py-0.5 bg-white border border-blue-100 rounded-lg font-bold text-blue-600">Instal App</span> yang muncul di bagian bawah layar.</p>
                <div class="flex items-center gap-2 text-xs font-bold text-blue-600">
                  <div class="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  Proses otomatis, icon akan muncul di menu HP.
                </div>
              </div>
            </div>

            <div class="flex gap-6 p-8 bg-orange-50/50 rounded-[2.5rem] border border-orange-100/50 relative overflow-hidden group">
              <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform">
                <LogIn size={120} />
              </div>
              <div class="hidden sm:flex w-16 h-16 bg-white rounded-3xl items-center justify-center shrink-0 shadow-sm border border-orange-100">
                <span class="text-2xl">🍎</span>
              </div>
              <div>
                <h4 class="font-bold text-slate-900 text-lg mb-2">iOS (Safari)</h4>
                <p class="text-slate-600 text-sm leading-relaxed mb-4">Ketuk ikon <span class="font-bold text-orange-600">Share</span> (kotak dengan panah ke atas) di bawah Safari, lalu pilih <span class="font-bold text-orange-600">Add to Home Screen</span>.</p>
                <div class="flex items-center gap-2 text-xs font-bold text-orange-600">
                  <div class="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                  Khusus iOS, harus menggunakan browser Safari.
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Dashboard -->
        <section id="dashboard" class="scroll-mt-24 mb-24">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-6" style="font-family:'Plus Jakarta Sans',sans-serif;">Beranda (Dashboard)</h3>
          <p class="text-slate-600 mb-10 leading-relaxed">Beranda adalah pusat informasi harian Anda. Di sini Anda bisa memantau segalanya dalam satu lirikan.</p>

          <div class="grid gap-4">
            {#each [
              { title: 'Statistik Tugas', desc: 'Melihat persentase tugas selesai, sedang dikerjakan, dan yang belum dimulai.', color: 'orange' },
              { title: 'Ringkasan Presensi', desc: 'Status kehadiran Anda untuk hari ini (Check-in/Check-out).', color: 'emerald' },
              { title: 'Tugas Prioritas', desc: 'Daftar tugas yang paling mendesak untuk segera diselesaikan.', color: 'blue' }
            ] as item}
              <div class="flex items-center gap-5 p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                <div class="w-2 h-10 rounded-full bg-{item.color}-500"></div>
                <div>
                  <h4 class="font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            {/each}
          </div>
        </section>

        <!-- Presensi -->
        <section id="presensi" class="scroll-mt-24 mb-24">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-8" style="font-family:'Plus Jakarta Sans',sans-serif;">Sistem Presensi</h3>
          
          <div class="prose prose-slate max-w-none mb-10">
            <p class="text-slate-600 leading-relaxed">Sistem presensi kami menggunakan teknologi <strong>Geofencing</strong> dan <strong>Foto Verifikasi</strong> untuk memastikan akurasi kehadiran tim.</p>
          </div>

          <div class="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div class="absolute -right-20 -top-20 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl"></div>
            <div class="relative z-10 grid gap-8">
              <div class="flex gap-5">
                <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <MapPin size={22} class="text-orange-500" />
                </div>
                <div>
                  <h4 class="font-bold text-lg mb-2">Radius Lokasi (Geofencing)</h4>
                  <p class="text-slate-400 text-sm leading-relaxed">Anda harus berada dalam jarak maksimal 50-100 meter (tergantung pengaturan admin) dari titik lokasi kantor untuk dapat melakukan Check-in.</p>
                </div>
              </div>
              <div class="flex gap-5">
                <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Camera size={22} class="text-blue-500" />
                </div>
                <div>
                  <h4 class="font-bold text-lg mb-2">Wajib Foto Selfie</h4>
                  <p class="text-slate-400 text-sm leading-relaxed">Setiap aksi presensi mewajibkan pengambilan foto selfie langsung untuk mencegah kecurangan absensi.</p>
                </div>
              </div>
              <div class="flex gap-5">
                <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Clock size={22} class="text-yellow-500" />
                </div>
                <div>
                  <h4 class="font-bold text-lg mb-2">Ketentuan Terlambat</h4>
                  <p class="text-slate-400 text-sm leading-relaxed">Toleransi keterlambatan adalah 10 menit. Jika lebih, Anda wajib mengisi alasan keterlambatan yang akan divalidasi oleh Admin.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Management Tugas -->
        <section id="tasks" class="scroll-mt-24 mb-24">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-6" style="font-family:'Plus Jakarta Sans',sans-serif;">Manajemen Tugas</h3>
          <p class="text-slate-600 mb-10 leading-relaxed">Kelola semua pekerjaan Anda dengan fitur manajemen tugas yang lengkap.</p>

          <div class="grid sm:grid-cols-2 gap-6">
            <div class="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all">
              <div class="text-3xl mb-4 group-hover:scale-125 transition-transform origin-left">📋</div>
              <h4 class="font-bold text-slate-900 mb-2">Checklist & Sub-tugas</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Pecah tugas besar menjadi langkah-langkah kecil yang lebih mudah dikerjakan.</p>
            </div>
            <div class="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all">
              <div class="text-3xl mb-4 group-hover:scale-125 transition-transform origin-left">👥</div>
              <h4 class="font-bold text-slate-900 mb-2">Kolaborasi Tim</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Undang rekan kerja ke dalam tugas Anda untuk bekerja bersama-sama.</p>
            </div>
            <div class="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all">
              <div class="text-3xl mb-4 group-hover:scale-125 transition-transform origin-left">🗓️</div>
              <h4 class="font-bold text-slate-900 mb-2">Deadline & Kalender</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Atur batas waktu dan pantau sebaran tugas Anda melalui tampilan kalender.</p>
            </div>
            <div class="group bg-white p-6 rounded-3xl border border-slate-100 hover:border-orange-200 transition-all">
              <div class="text-3xl mb-4 group-hover:scale-125 transition-transform origin-left">📌</div>
              <h4 class="font-bold text-slate-900 mb-2">Pin Tugas Utama</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Sematkan tugas paling penting agar selalu muncul di bagian paling atas.</p>
            </div>
          </div>
        </section>

        <!-- Chat -->
        <section id="chat" class="scroll-mt-24 mb-24">
          <div class="flex items-center gap-3 mb-6">
            <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan (Chat)</h3>
            <span class="px-2 py-0.5 bg-orange-600 text-white text-[9px] font-black uppercase rounded-lg">New</span>
          </div>
          <p class="text-slate-600 mb-10 leading-relaxed">Komunikasi real-time dengan rekan tim langsung di dalam aplikasi tanpa perlu pindah ke WhatsApp atau aplikasi lain.</p>

          <div class="grid gap-6">
            <div class="p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100 border-dashed">
              <div class="flex flex-col md:flex-row gap-8 items-start">
                <div class="w-full md:w-1/2 space-y-4">
                  <div class="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                    <div class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <p class="text-xs font-bold text-slate-700 truncate">Badge Notifikasi Real-time</p>
                  </div>
                  <div class="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                    <MessageSquare size={16} class="text-orange-500" />
                    <p class="text-xs font-bold text-slate-700 truncate">Balasan Instan Tanpa Delay</p>
                  </div>
                  <div class="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                    <Sparkles size={16} class="text-orange-500" />
                    <p class="text-xs font-bold text-slate-700 truncate">Grup Proyek & Chat Pribadi</p>
                  </div>
                </div>
                <div class="w-full md:w-1/2">
                  <h4 class="font-bold text-slate-900 mb-3">Apa yang baru?</h4>
                  <ul class="text-sm text-slate-600 space-y-3 leading-relaxed">
                    <li><span class="text-orange-600 font-bold">•</span> Sinkronisasi "Sudah Dibaca" yang sangat presisi di semua perangkat.</li>
                    <li><span class="text-orange-600 font-bold">•</span> Badge angka baru di menu navigasi bawah agar Anda tidak ketinggalan pesan.</li>
                    <li><span class="text-orange-600 font-bold">•</span> Tampilan pesan yang belum terbaca ditandai dengan teks tebal (bold).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Profile & Security -->
        <section id="profile" class="scroll-mt-24 mb-24">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-8" style="font-family:'Plus Jakarta Sans',sans-serif;">Profil & Keamanan</h3>
          
          <div class="grid gap-4">
            <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-5">
              <div class="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
                <UserRound size={24} />
              </div>
              <div>
                <h4 class="font-bold text-slate-900 mb-1">Update Data Diri</h4>
                <p class="text-sm text-slate-500 leading-relaxed">Ubah foto profil, WhatsApp, dan informasi jabatan Anda untuk mempermudah identifikasi tim.</p>
              </div>
            </div>
            <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-5">
              <div class="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
                <Shield size={24} />
              </div>
              <div>
                <h4 class="font-bold text-slate-900 mb-1">Ganti Password</h4>
                <p class="text-sm text-slate-500 leading-relaxed">Ganti password secara berkala di menu profil untuk menjaga keamanan akun Anda dari akses yang tidak sah.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- FAQ -->
        <section id="faq" class="scroll-mt-24">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-8" style="font-family:'Plus Jakarta Sans',sans-serif;">FAQ & Tips</h3>
          
          <div class="divide-y divide-slate-100 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            {#each [
              { q: 'Mengapa saya tidak bisa Check-in di rumah?', a: 'Presensi dibatasi oleh Geofencing kantor. Anda harus berada di lokasi fisik kantor yang telah didaftarkan Admin agar tombol Check-in aktif.' },
              { q: 'Lupa Check-out, apa yang harus dilakukan?', a: 'Segera hubungi Admin Anda untuk melakukan penyesuaian data presensi manual melalui Panel Admin.' },
              { q: 'Bagaimana cara mengajukan izin/sakit?', a: 'Buka menu Presensi, klik tombol "Izin / Sakit" di bagian bawah, pilih jenis izin, dan tuliskan alasan Anda.' }
            ] as faq}
              <div class="p-6 bg-white hover:bg-slate-50/50 transition-colors">
                <h4 class="font-bold text-slate-900 mb-3 flex items-start gap-3">
                  <span class="text-orange-500">Q:</span>
                  {faq.q}
                </h4>
                <p class="text-sm text-slate-500 leading-relaxed pl-7">
                  <span class="text-slate-400 font-bold mr-2">A:</span>
                  {faq.a}
                </p>
              </div>
            {/each}
          </div>
        </section>

        <!-- Footer Contact -->
        <footer class="mt-32 pt-16 border-t border-slate-100 text-center">
          <p class="text-sm text-slate-400 font-medium mb-6">Butuh bantuan lebih lanjut?</p>
          <div class="flex flex-wrap justify-center gap-4">
            <a href="https://wa.me/xxx" class="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2">
              <MessageSquare size={16} /> Hubungi Support (WhatsApp)
            </a>
          </div>
          <p class="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Workspace Khwarizmi v2.0 &bull; 2024</p>
        </footer>

      </div>
    </main>
  </div>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  /* Custom typography fix for Plus Jakarta Sans */
  @supports (font-variation-settings: normal) {
    :global(body) {
      font-family: 'Inter', sans-serif;
    }
  }
</style>
