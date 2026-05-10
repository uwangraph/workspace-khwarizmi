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

  let searchQuery = $state('');
  let scrollProgress = $state(0);

  function handleScroll() {
    if (!mainElement) return;
    const currentScrollY = mainElement.scrollTop;
    const totalHeight = mainElement.scrollHeight - mainElement.clientHeight;
    scrollProgress = (currentScrollY / totalHeight) * 100;
    
    isScrollingUp = currentScrollY < lastScrollY || currentScrollY < 100;
    lastScrollY = currentScrollY;
    scrollY = currentScrollY;
  }

  // Filter sections based on search
  let filteredSections = $derived(
    sections.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function toggleSidebar(open: boolean) {
    if (open && !isSidebarOpen) {
      isSidebarOpen = true;
      history.pushState({ drawerOpen: true }, '');
    } else if (!open && isSidebarOpen) {
      history.back();
    }
  }

  function handlePopState(event: PopStateEvent) {
    isSidebarOpen = false;
  }

  onMount(() => {
    window.addEventListener('popstate', handlePopState);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) isSidebarOpen = false;
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById('doc-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  // Highlight active link based on current path
  let activeHref = $derived(page.url.pathname);
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="h-screen overflow-hidden bg-[#FBFBFC] font-sans selection:bg-orange-100 selection:text-orange-900 flex flex-col relative">
  
  <!-- Scroll Progress Bar -->
  <div class="fixed top-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400 z-[110] transition-all duration-300" style="width: {scrollProgress}%"></div>

  <!-- Abstract Background Glows -->
  <div class="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0 opacity-30">
    <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-orange-200/40 rounded-full blur-[120px]"></div>
    <div class="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-blue-100/50 rounded-full blur-[100px]"></div>
  </div>

  <!-- Mobile Header -->
  <header class="lg:hidden sticky top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3.5 px-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30">
        <BookOpen size={18} class="text-white" />
      </div>
      <span class="font-extrabold text-slate-900 tracking-tight text-lg">Manual</span>
    </div>
    <button onclick={() => toggleSidebar(true)} class="p-2.5 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all">
      <Menu size={20} />
    </button>
  </header>

  <div class="flex-1 flex overflow-hidden w-full relative z-10">
    <!-- Desktop Sidebar (Left) -->
    <aside class="hidden lg:flex flex-col h-full w-[300px] border-r border-slate-200/60 bg-white/80 backdrop-blur-xl overflow-hidden flex-shrink-0">
      <div class="p-8 flex flex-col h-full">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-3.5 mb-10 px-2 group">
          <div class="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30 group-hover:rotate-3 transition-transform">
            <BookOpen size={20} class="text-white" />
          </div>
          <div>
            <h1 class="font-black text-slate-900 leading-none text-xl tracking-tight">Khwarizmi</h1>
            <p class="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-1">Documentation</p>
          </div>
        </a>

        <!-- Search Bar -->
        <div class="relative mb-8 group">
          <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors">
            <List size={16} />
          </div>
          <input 
            id="doc-search"
            type="text" 
            bind:value={searchQuery}
            placeholder="Cari panduan... (⌘K)"
            class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all font-medium placeholder:text-slate-400"
          />
        </div>

        <!-- Nav Links -->
        <nav class="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
          {#each filteredSections as section}
            <a
              href={section.href}
              class="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group relative
                     {activeHref === section.href 
                       ? 'bg-white text-slate-900 shadow-md border border-slate-100' 
                       : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'}"
            >
              {#if activeHref === section.href}
                <div class="absolute left-0 top-2 bottom-2 w-1 bg-orange-600 rounded-r-full"></div>
              {/if}
              <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                          {activeHref === section.href 
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                            : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-orange-600 group-hover:shadow-sm'}">
                <section.icon size={16} />
              </div>
              <span class="text-[13px] font-bold tracking-tight">{section.label}</span>
            </a>
          {/each}
        </nav>

        <!-- Help Card -->
        <div class="mt-6 p-5 bg-slate-900 rounded-2xl relative overflow-hidden group">
          <div class="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <MessageSquare size={60} />
          </div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Punya Kendala?</p>
          <a href="https://wa.me/xxx" class="flex items-center justify-between text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
            Hubungi Support <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main 
      bind:this={mainElement}
      onscroll={handleScroll}
      class="flex-1 min-w-0 bg-white lg:bg-transparent overflow-y-auto custom-scrollbar relative"
    >
      <div class="max-w-[1200px] mx-auto px-6 py-12 lg:px-12 lg:py-24 flex gap-16 relative z-10">
        <!-- Content -->
        <article class="flex-1 min-w-0">
          <slot />

          <!-- Feedback -->
          <div class="mt-32 pt-16 border-t border-slate-100">
            <div class="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm">
              <div>
                <h4 class="font-black text-slate-900 text-xl mb-2">Apakah panduan ini membantu?</h4>
                <p class="text-sm text-slate-500 font-medium">Bantu kami meningkatkan dokumentasi ini.</p>
              </div>
              <div class="flex gap-4">
                <button class="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm">Ya, Sangat!</button>
                <button class="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm">Masih Bingung</button>
              </div>
            </div>
          </div>
        </article>

        <!-- Right Sidebar (On This Page) -->
        <aside class="hidden xl:block w-64 shrink-0 sticky top-0 h-fit">
          <div class="space-y-8">
            <div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Di Halaman Ini</p>
              <nav class="space-y-4 border-l border-slate-100">
                <a href="#intro" class="block pl-4 text-xs font-bold text-orange-600 border-l-2 border-orange-600 -ml-[1px]">Overview</a>
                <a href="#features" class="block pl-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Key Features</a>
                <a href="#steps" class="block pl-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Getting Started</a>
                <a href="#faq" class="block pl-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Resources</a>
              </nav>
            </div>

            <div class="p-6 bg-orange-50 rounded-[2rem] border border-orange-100">
              <Sparkles size={20} class="text-orange-600 mb-4" />
              <h5 class="font-bold text-sm text-slate-900 mb-2">Khwarizmi v2.4</h5>
              <p class="text-[11px] text-slate-500 leading-relaxed font-medium">Pembaruan terbaru mencakup sistem obrolan real-time yang lebih cepat.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>

  <!-- Mobile Drawer -->
  {#if isSidebarOpen}
    <aside 
      class="fixed inset-0 z-[100] bg-white lg:hidden flex flex-col"
      transition:fly={{ y: 50, duration: 400, easing: cubicOut }}
    >
      <div class="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <BookOpen size={18} class="text-white" />
          </div>
          <span class="font-black text-slate-900 uppercase tracking-widest text-xs">Menu Navigasi</span>
        </div>
        <button onclick={() => toggleSidebar(false)} class="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-all">
          <ArrowLeft size={20} />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6 space-y-2">
        <div class="relative mb-6">
          <List size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            bind:value={searchQuery}
            placeholder="Cari..." 
            class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none font-medium"
          />
        </div>
        {#each filteredSections as section}
          <a
            href={section.href}
            onclick={() => toggleSidebar(false)}
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all border-l-4
                   {activeHref === section.href 
                     ? 'bg-slate-50 text-slate-900 border-orange-600' 
                     : 'bg-transparent text-slate-500 border-transparent'}"
          >
            <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all
                        {activeHref === section.href 
                          ? 'bg-orange-600 text-white' 
                          : 'bg-slate-100 text-slate-400'}">
              <section.icon size={18} />
            </div>
            <span class="font-bold text-sm tracking-tight">{section.label}</span>
          </a>
        {/each}
      </div>

      <div class="p-8 border-t border-slate-100">
        <a href="/" class="flex items-center justify-center gap-3 w-full py-4.5 bg-slate-900 text-white rounded-[2rem] font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm tracking-tight">
          <ArrowLeft size={16} /> Kembali ke Aplikasi
        </a>
      </div>
    </aside>
  {/if}
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
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #FBFBFC;
  }

  @media (min-width: 1024px) {
    aside {
      scrollbar-width: none;
    }
  }

  :global(article h1, article h2, article h3) {
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
</style>
