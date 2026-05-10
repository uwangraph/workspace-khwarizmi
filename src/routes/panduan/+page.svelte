<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    ArrowLeft, BookOpen, LogIn, LayoutDashboard, CalendarCheck, 
    CheckSquare, Bell, Shield, MapPin, Clock, Camera, 
    UserRound, MessageSquare, ChevronRight, Menu, X,
    Search, ExternalLink, Sparkles, List
  } from 'lucide-svelte';
  import { fade, slide, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let activeSection = $state('intro');
  let isSidebarOpen = $state(false);
  let scrollY = $state(0);
  let isScrollingUp = $state(true);
  let lastScrollY = 0;

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
      const offset = 100;
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

  function handleScroll() {
    const currentScrollY = window.scrollY;
    isScrollingUp = currentScrollY < lastScrollY || currentScrollY < 100;
    lastScrollY = currentScrollY;
    scrollY = currentScrollY;
  }

  onMount(() => {
    window.addEventListener('scroll', handleScroll);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            activeSection = entry.target.id;
          }
        });
      },
      { threshold: [0, 0.3, 0.8], rootMargin: '-10% 0px -40% 0px' }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  });
</script>

<svelte:head>
  <title>Dokumentasi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-white font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
  
  <!-- Mobile Header (Glassmorphism) -->
  <header 
    class="lg:hidden fixed top-0 left-0 right-0 z-40 transition-all duration-300
           {scrollY > 20 ? 'bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3' : 'bg-transparent py-5'}
           {!isScrollingUp && scrollY > 100 ? '-translate-y-full' : 'translate-y-0'}"
  >
    <div class="px-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-600/20">
          <BookOpen size={16} class="text-white" />
        </div>
        <span class="font-bold text-slate-900 tracking-tight">Dokumentasi</span>
      </div>
      <button 
        onclick={() => isSidebarOpen = true}
        class="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-all"
      >
        <Menu size={20} />
      </button>
    </div>
  </header>

  <div class="max-w-[1600px] mx-auto flex">
    <!-- Desktop Sidebar -->
    <aside class="hidden lg:block sticky top-0 h-screen w-80 border-r border-slate-100 bg-slate-50/30 overflow-y-auto custom-scrollbar flex-shrink-0">
      <div class="p-10">
        <!-- Logo Area -->
        <a href="/" class="flex items-center gap-3 mb-12 px-2 hover:opacity-80 transition-opacity">
          <div class="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-xl shadow-orange-600/20">
            <BookOpen size={22} class="text-white" />
          </div>
          <div>
            <h1 class="font-extrabold text-slate-900 leading-none text-xl">Khwarizmi</h1>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">User Manual</p>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="space-y-1.5">
          {#each sections as section}
            <button
              onclick={() => scrollTo(section.id)}
              class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative
                     {activeSection === section.id 
                       ? 'bg-white text-orange-600 shadow-sm border border-slate-100' 
                       : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}"
            >
              {#if activeSection === section.id}
                <div class="absolute left-0 w-1 h-6 bg-orange-600 rounded-r-full" in:fade></div>
              {/if}
              <section.icon size={18} class={activeSection === section.id ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span class="text-sm font-bold tracking-tight">{section.label}</span>
            </button>
          {/each}
        </nav>

        <div class="mt-20 pt-8 border-t border-slate-200/60">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Bantuan Cepat</p>
          <div class="space-y-2">
            <a href="https://wa.me/xxx" class="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors">
              <MessageSquare size={16} /> WhatsApp Admin
            </a>
            <a href="/" class="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors">
              <ArrowLeft size={16} /> Dashboard
            </a>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Drawer Sidebar -->
    {#if isSidebarOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm lg:hidden"
        onclick={() => isSidebarOpen = false}
        transition:fade={{ duration: 300 }}
      ></div>
      
      <aside 
        class="fixed inset-y-0 right-0 z-[70] w-[85%] max-w-sm bg-white shadow-2xl lg:hidden flex flex-col"
        transition:fly={{ x: 300, duration: 400, easing: cubicOut }}
      >
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <span class="font-black text-slate-900 uppercase tracking-widest text-xs">Navigasi Panduan</span>
          <button onclick={() => isSidebarOpen = false} class="p-2 bg-slate-50 rounded-xl text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-6 space-y-2">
          {#each sections as section}
            <button
              onclick={() => scrollTo(section.id)}
              class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all
                     {activeSection === section.id 
                       ? 'bg-orange-50 text-orange-600' 
                       : 'text-slate-600 active:bg-slate-50'}"
            >
              <section.icon size={20} class={activeSection === section.id ? 'text-orange-600' : 'text-slate-400'} />
              <span class="font-bold">{section.label}</span>
              {#if activeSection === section.id}
                <ChevronRight size={16} class="ml-auto" />
              {/if}
            </button>
          {/each}
        </div>

        <div class="p-8 bg-slate-50 mt-auto">
          <a href="/" class="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20">
            <ArrowLeft size={18} /> Kembali ke Aplikasi
          </a>
        </div>
      </aside>
    {/if}

    <!-- Content Area -->
    <main class="flex-1 min-w-0 bg-white">
      <div class="max-w-4xl mx-auto px-6 py-24 lg:px-20 lg:py-32">
        
        <!-- Introduction -->
        <section id="intro" class="scroll-mt-32 mb-32">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-8">
            <Sparkles size={12} /> Panduan Resmi
          </div>
          <h2 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.05]" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Kelola Pekerjaan Lebih <span class="text-orange-600 italic">Cerdas</span> di Khwarizmi
          </h2>
          <p class="text-xl text-slate-500 leading-relaxed mb-12 max-w-2xl font-medium">
            Tingkatkan produktivitas tim Anda dengan sistem manajemen tugas real-time dan presensi berbasis lokasi yang akurat.
          </p>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="group p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <LayoutDashboard class="text-orange-600" size={28} />
              </div>
              <h4 class="font-bold text-slate-900 text-lg mb-3">Dashboard Terpadu</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Semua informasi penting mulai dari tugas harian hingga status presensi ada dalam satu layar.</p>
            </div>
            <div class="group p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <MessageSquare class="text-blue-600" size={28} />
              </div>
              <h4 class="font-bold text-slate-900 text-lg mb-3">Komunikasi Instan</h4>
              <p class="text-sm text-slate-500 leading-relaxed">Hubungi rekan kerja secara real-time langsung di dalam aplikasi tanpa hambatan.</p>
            </div>
          </div>
        </section>

        <hr class="border-slate-100 mb-32" />

        <!-- Installation -->
        <section id="install" class="scroll-mt-32 mb-32">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-8" style="font-family:'Plus Jakarta Sans',sans-serif;">Instalasi & Akses</h3>
          <p class="text-lg text-slate-500 mb-12 leading-relaxed">
            Khwarizmi adalah <strong>Progressive Web App (PWA)</strong>. Anda bisa menginstalnya langsung dari browser ke layar utama HP Anda.
          </p>

          <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-gradient-to-br from-slate-50 to-white p-8 rounded-[3rem] border border-slate-100 relative overflow-hidden">
              <span class="text-4xl mb-6 block">🤖</span>
              <h4 class="font-bold text-slate-900 text-xl mb-3">Android (Chrome)</h4>
              <p class="text-slate-500 text-sm leading-relaxed mb-6">Buka Khwarizmi di Chrome, lalu ketuk menu <span class="font-bold">titik tiga</span> di pojok kanan atas dan pilih <span class="text-orange-600 font-bold">Instal Aplikasi</span>.</p>
              <div class="w-fit px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider">Paling Direkomendasikan</div>
            </div>

            <div class="bg-gradient-to-br from-slate-50 to-white p-8 rounded-[3rem] border border-slate-100 relative overflow-hidden">
              <span class="text-4xl mb-6 block">🍎</span>
              <h4 class="font-bold text-slate-900 text-xl mb-3">iOS (Safari)</h4>
              <p class="text-slate-500 text-sm leading-relaxed mb-6">Buka di Safari, ketuk ikon <span class="font-bold">Bagikan</span> (kotak dengan panah), lalu scroll ke bawah dan pilih <span class="text-orange-600 font-bold">Add to Home Screen</span>.</p>
              <div class="w-fit px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-wider">Hanya via Safari</div>
            </div>
          </div>
        </section>

        <!-- Presensi -->
        <section id="presensi" class="scroll-mt-32 mb-32">
          <div class="flex items-center gap-4 mb-8">
            <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Sistem Presensi</h3>
          </div>
          
          <div class="bg-slate-900 rounded-[3.5rem] p-8 md:p-14 text-white shadow-3xl relative overflow-hidden">
            <div class="absolute -right-32 -bottom-32 w-80 h-80 bg-orange-600/30 rounded-full blur-[100px]"></div>
            <div class="relative z-10 space-y-12">
              <div class="flex flex-col md:flex-row gap-6 md:items-start">
                <div class="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <MapPin size={28} class="text-orange-500" />
                </div>
                <div>
                  <h4 class="font-bold text-2xl mb-3 leading-tight">Geofencing & Lokasi</h4>
                  <p class="text-slate-400 text-base leading-relaxed">Tombol presensi hanya akan aktif jika sistem mendeteksi Anda berada di radius kantor. Jika tidak muncul, pastikan <span class="text-white font-bold underline decoration-orange-500 underline-offset-4">GPS Aktif</span> dan izin lokasi diberikan.</p>
                </div>
              </div>
              <div class="flex flex-col md:flex-row gap-6 md:items-start">
                <div class="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Camera size={28} class="text-blue-500" />
                </div>
                <div>
                  <h4 class="font-bold text-2xl mb-3 leading-tight">Verifikasi Wajah (Selfie)</h4>
                  <p class="text-slate-400 text-base leading-relaxed">Setiap aksi Check-in/out mewajibkan foto selfie langsung. Gunakan pencahayaan yang baik dan pastikan wajah terlihat jelas untuk validasi admin.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Tasks -->
        <section id="tasks" class="scroll-mt-32 mb-32">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-12" style="font-family:'Plus Jakarta Sans',sans-serif;">Manajemen Tugas</h3>
          
          <div class="grid sm:grid-cols-2 gap-6">
            {#each [
              { title: 'Checklist', desc: 'Pecah tugas besar menjadi sub-tugas yang lebih kecil.', icon: '📋' },
              { title: 'Kolaborasi', desc: 'Undang rekan kerja untuk membantu menyelesaikan tugas.', icon: '👥' },
              { title: 'Deadline', desc: 'Pantau batas waktu agar tidak ada pekerjaan yang terlewat.', icon: '🗓️' },
              { title: 'Prioritas', desc: 'Gunakan fitur Pin untuk menandai tugas yang sangat penting.', icon: '📌' }
            ] as t}
              <div class="p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-orange-200 hover:shadow-xl transition-all group">
                <span class="text-4xl mb-6 block group-hover:scale-110 transition-transform origin-left">{t.icon}</span>
                <h4 class="font-bold text-slate-900 text-lg mb-2">{t.title}</h4>
                <p class="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            {/each}
          </div>
        </section>

        <!-- Chat -->
        <section id="chat" class="scroll-mt-32 mb-32">
          <div class="flex items-center gap-4 mb-8">
            <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan (Chat)</h3>
            <span class="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-orange-600/20">Real-time</span>
          </div>
          
          <div class="p-10 bg-orange-50/50 rounded-[3rem] border border-orange-100/50 relative overflow-hidden group">
            <div class="absolute right-0 bottom-0 opacity-10 -rotate-12 translate-x-10 translate-y-10 group-hover:scale-110 transition-transform">
              <MessageSquare size={240} />
            </div>
            <div class="relative z-10 max-w-xl">
              <p class="text-lg text-slate-700 leading-relaxed mb-8 font-medium">
                Sistem chat kami mendukung komunikasi tim yang sangat cepat dengan sinkronisasi status baca yang instan.
              </p>
              <div class="space-y-4">
                <div class="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
                  <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><Bell size={20} /></div>
                  <p class="text-sm font-bold text-slate-800">Badge Notifikasi Global di Navigasi</p>
                </div>
                <div class="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
                  <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><UserRound size={20} /></div>
                  <p class="text-sm font-bold text-slate-800">Indikator Pesan Baru (Teks Bold)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- FAQ -->
        <section id="faq" class="scroll-mt-32">
          <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-10" style="font-family:'Plus Jakarta Sans',sans-serif;">FAQ & Tips</h3>
          
          <div class="space-y-4">
            {#each [
              { q: 'Mengapa saya tidak bisa Check-in di rumah?', a: 'Presensi dibatasi oleh Geofencing kantor. Anda harus berada di lokasi fisik kantor yang telah didaftarkan Admin agar tombol Check-in aktif.' },
              { q: 'Bagaimana cara mendapatkan notifikasi push?', a: 'Pastikan Anda memberikan izin notifikasi di browser. Jika menggunakan iPhone, Anda harus menginstal aplikasi (Add to Home Screen) terlebih dahulu.' },
              { q: 'Foto selfie saya ditolak admin, kenapa?', a: 'Pastikan wajah terlihat jelas, tidak menggunakan masker (kecuali diizinkan), dan pencahayaan cukup terang saat mengambil foto.' }
            ] as faq}
              <div class="group bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:border-orange-100 transition-all">
                <h4 class="font-bold text-slate-900 text-lg mb-4 flex items-start gap-4">
                  <span class="text-orange-500 font-black">Q.</span> {faq.q}
                </h4>
                <p class="text-slate-500 text-sm leading-relaxed pl-10 border-l-2 border-orange-100 group-hover:border-orange-500 transition-colors">
                  {faq.a}
                </p>
              </div>
            {/each}
          </div>
        </section>

        <!-- Footer -->
        <footer class="mt-40 text-center pb-20">
          <div class="p-12 bg-slate-50 rounded-[4rem] border border-slate-100">
            <h4 class="font-extrabold text-slate-900 text-2xl mb-4">Masih ada pertanyaan?</h4>
            <p class="text-slate-500 mb-8 max-w-sm mx-auto">Tim support kami siap membantu Anda kapan saja melalui WhatsApp resmi.</p>
            <a href="https://wa.me/xxx" class="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-3xl font-bold text-sm shadow-2xl shadow-emerald-500/30 hover:scale-105 transition-all active:scale-95">
              <MessageSquare size={18} /> Chat Support Sekarang
            </a>
          </div>
          <p class="mt-20 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Workspace Khwarizmi &bull; 2024</p>
        </footer>

      </div>
    </main>
  </div>

  <!-- Mobile Floating Nav Button -->
  <button 
    onclick={() => isSidebarOpen = true}
    class="lg:hidden fixed bottom-8 right-6 z-50 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-transform 
           {scrollY > 300 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}"
  >
    <List size={24} />
  </button>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  /* Hide scrollbar but keep functionality */
  .custom-scrollbar::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }

  /* Plus Jakarta Sans fallback */
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  @media (min-width: 1024px) {
    aside {
      scrollbar-width: none;
    }
  }

  .shadow-3xl {
    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.35);
  }
</style>
