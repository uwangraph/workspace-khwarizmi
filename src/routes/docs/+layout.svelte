<script lang="ts">
  import { page } from '$app/state';
  import { 
    ArrowLeft, BookOpen, MessageSquare, ChevronRight, Menu, X, List,
    LogIn, LayoutDashboard, CalendarCheck, CheckSquare, Shield, Sparkles
  } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  let isSidebarOpen = $state(false);
  let scrollY = $state(0);
  let isScrollingUp = $state(true);
  let lastScrollY = 0;

  const sections = [
    { id: 'intro', label: 'Pendahuluan', href: '/docs/intro', icon: BookOpen },
    { id: 'install', label: 'Instalasi & Akses', href: '/docs/install', icon: LogIn },
    { id: 'dashboard', label: 'Beranda (Dashboard)', href: '/docs/dashboard', icon: LayoutDashboard },
    { id: 'presensi', label: 'Sistem Presensi', href: '/docs/presensi', icon: CalendarCheck },
    { id: 'tasks', label: 'Manajemen Tugas', href: '/docs/tasks', icon: CheckSquare },
    { id: 'chat', label: 'Obrolan (Chat)', href: '/docs/chat', icon: MessageSquare },
    { id: 'profile', label: 'Profil & Keamanan', href: '/docs/profile', icon: Shield },
    { id: 'faq', label: 'FAQ & Tips', href: '/docs/faq', icon: Sparkles }
  ];

  let mainElement: HTMLElement;

  function handleScroll() {
    if (!mainElement) return;
    const currentScrollY = mainElement.scrollTop;
    isScrollingUp = currentScrollY < lastScrollY || currentScrollY < 100;
    lastScrollY = currentScrollY;
    scrollY = currentScrollY;
  }

  onMount(() => {
    // Scroll handling is now managed by the main element's scroll event
    return () => {};
  });

  // Highlight active link based on current path
  let activeHref = $derived(page.url.pathname);
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="h-screen overflow-hidden bg-white font-sans selection:bg-orange-100 selection:text-orange-900 flex flex-col relative">
  
  <!-- Abstract Background Glows (Decorative) -->
  <div class="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0 opacity-40">
    <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-orange-200/40 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-blue-100/50 rounded-full blur-[100px]"></div>
    <div class="absolute bottom-[-10%] right-[10%] w-[35%] h-[35%] bg-emerald-50/60 rounded-full blur-[130px]"></div>
  </div>

  <!-- Mobile Header (Glassmorphism) -->
  <header 
    class="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100 py-3"
  >
    <div class="px-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30">
          <BookOpen size={18} class="text-white" />
        </div>
        <span class="font-extrabold text-slate-900 tracking-tight text-lg">Docs</span>
      </div>
      <button 
        onclick={() => isSidebarOpen = true}
        class="p-2.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-all active:scale-90"
      >
        <Menu size={20} />
      </button>
    </div>
  </header>

  <div class="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full relative z-10">
    <!-- Desktop Sidebar -->
    <aside class="hidden lg:flex flex-col h-full w-80 border-r border-slate-100 bg-white/40 backdrop-blur-sm overflow-y-auto custom-scrollbar flex-shrink-0">
      <div class="p-10 flex-1 flex flex-col">
        <!-- Logo Area -->
        <a href="/" class="flex items-center gap-4 mb-14 px-2 hover:opacity-80 transition-all group">
          <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-600/30 group-hover:rotate-6 transition-transform">
            <BookOpen size={24} class="text-white" />
          </div>
          <div>
            <h1 class="font-black text-slate-900 leading-none text-2xl tracking-tighter">Khwarizmi</h1>
            <p class="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mt-1.5">User Manual</p>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="space-y-2 flex-1">
          {#each sections as section}
            <a
              href={section.href}
              class="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative border-l-4
                     {activeHref === section.href 
                       ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50 border-orange-600' 
                       : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 border-transparent'}"
            >
              <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                          {activeHref === section.href 
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                            : 'bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600'}">
                <section.icon size={18} />
              </div>
              <span class="text-sm font-bold tracking-tight">{section.label}</span>
              {#if activeHref !== section.href}
                <ChevronRight size={14} class="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              {/if}
            </a>
          {/each}
        </nav>

        <div class="mt-8 pt-10 border-t border-slate-100">
          <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden group">
            <div class="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <MessageSquare size={80} />
            </div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Butuh Bantuan?</p>
            <h4 class="font-bold text-sm mb-4 leading-relaxed">Admin kami siap membantu Anda 24/7.</h4>
            <a href="https://wa.me/xxx" class="flex items-center justify-center gap-2 w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-orange-600/20">
              <MessageSquare size={14} /> Chat WhatsApp
            </a>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Drawer Sidebar (Full Width for zero overlap) -->
    {#if isSidebarOpen}
      <aside 
        class="fixed inset-0 z-[100] bg-white lg:hidden flex flex-col"
        transition:fly={{ y: 50, duration: 400, easing: cubicOut }}
      >
        <!-- Drawer Header -->
        <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <BookOpen size={18} class="text-white" />
            </div>
            <span class="font-black text-slate-900 uppercase tracking-widest text-xs">Navigasi Panduan</span>
          </div>
          <button onclick={() => isSidebarOpen = false} class="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
            <X size={20} />
          </button>
        </div>
        
        <!-- Drawer Links -->
        <div class="flex-1 overflow-y-auto p-6 space-y-2">
          {#each sections as section}
            <a
              href={section.href}
              onclick={() => isSidebarOpen = false}
              class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all border-l-4
                     {activeHref === section.href 
                       ? 'bg-slate-50 text-slate-900 border-orange-600' 
                       : 'bg-transparent text-slate-500 border-transparent active:bg-slate-50'}"
            >
              <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all
                          {activeHref === section.href 
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                            : 'bg-slate-100 text-slate-400'}">
                <section.icon size={18} />
              </div>
              <span class="font-bold text-sm tracking-tight">{section.label}</span>
              {#if activeHref === section.href}
                <ChevronRight size={16} class="ml-auto text-orange-600" />
              {/if}
            </a>
          {/each}
        </div>

        <!-- Drawer Footer -->
        <div class="p-8 bg-slate-50 border-t border-slate-100">
          <a href="/" class="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
            <ArrowLeft size={18} /> Kembali ke Aplikasi
          </a>
        </div>
      </aside>
    {/if}

    <!-- Content Area (with pt for fixed header) -->
    <main 
      bind:this={mainElement}
      onscroll={handleScroll}
      class="flex-1 min-w-0 bg-transparent overflow-y-auto custom-scrollbar relative"
    >
      <div class="max-w-4xl mx-auto px-6 pt-32 pb-24 lg:pt-32 lg:pb-32 lg:px-20 relative z-10">
        <slot />

        <!-- Footer -->
        <footer class="mt-40 text-center pb-20">
          <div class="p-12 md:p-16 bg-white/40 backdrop-blur-xl rounded-[4rem] border border-white/60 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-orange-100/30 rounded-full blur-3xl"></div>
            <h4 class="font-black text-slate-900 text-3xl mb-4 tracking-tight">Masih ada pertanyaan?</h4>
            <p class="text-slate-500 mb-10 max-w-sm mx-auto font-medium">Tim support kami siap membantu Anda kapan saja melalui WhatsApp resmi.</p>
            <a href="https://wa.me/xxx" class="inline-flex items-center gap-3 px-10 py-5 bg-emerald-500 text-white rounded-[2rem] font-bold text-sm shadow-2xl shadow-emerald-500/30 hover:scale-105 transition-all active:scale-95">
              <MessageSquare size={20} /> Chat Support Sekarang
            </a>
          </div>
          <div class="mt-24 space-y-4">
            <div class="w-12 h-1 bg-orange-100 mx-auto rounded-full"></div>
            <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Workspace Khwarizmi &bull; 2024</p>
          </div>
        </footer>
      </div>
    </main>
  </div>

  <!-- Mobile Floating Nav Button -->
  <button 
    onclick={() => isSidebarOpen = true}
    class="lg:hidden fixed bottom-8 right-6 z-50 w-16 h-16 bg-slate-900 text-white rounded-3xl shadow-2xl flex items-center justify-center active:scale-90 transition-transform 
           {scrollY > 300 ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}"
  >
    <List size={26} />
  </button>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }

  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  @media (min-width: 1024px) {
    aside {
      scrollbar-width: none;
    }
  }

  :global(.shadow-3xl) {
    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.35);
  }
</style>
