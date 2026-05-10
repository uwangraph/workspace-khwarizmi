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

  // Categorized sections
  const navigation = [
    {
      group: 'Persiapan',
      items: [
        { id: 'intro', label: 'Pendahuluan', href: '/docs/intro', icon: BookOpen },
        { id: 'install', label: 'Instalasi & Akses', href: '/docs/install', icon: LogIn },
      ]
    },
    {
      group: 'Fitur Utama',
      items: [
        { id: 'dashboard', label: 'Beranda (Dashboard)', href: '/docs/dashboard', icon: LayoutDashboard },
        { id: 'presensi', label: 'Sistem Presensi', href: '/docs/presensi', icon: CalendarCheck },
        { id: 'tasks', label: 'Manajemen Tugas', href: '/docs/tasks', icon: CheckSquare },
        { id: 'chat', label: 'Obrolan (Chat)', href: '/docs/chat', icon: MessageSquare },
      ]
    },
    {
      group: 'Lainnya',
      items: [
        { id: 'profile', label: 'Profil & Keamanan', href: '/docs/profile', icon: Shield },
        { id: 'faq', label: 'FAQ & Tips', href: '/docs/faq', icon: Sparkles }
      ]
    }
  ];

  // Flattened items for pagination
  const allItems = navigation.flatMap(g => g.items);
  
  let currentIndex = $derived(allItems.findIndex(item => item.href === activeHref));
  let prevItem = $derived(currentIndex > 0 ? allItems[currentIndex - 1] : null);
  let nextItem = $derived(currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null);

  // Filtered navigation based on search
  let filteredNavigation = $derived(
    navigation.map(group => ({
      ...group,
      items: group.items.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(group => group.items.length > 0)
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
      <span class="font-extrabold text-slate-900 tracking-tight text-lg italic">Khwarizmi</span>
    </div>
    <button onclick={() => toggleSidebar(true)} class="p-2.5 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition-all">
      <Menu size={20} />
    </button>
  </header>

  <div class="flex-1 flex overflow-hidden w-full relative z-10">
    <!-- Desktop Sidebar (Left) -->
    <aside class="hidden lg:flex flex-col h-full w-[310px] border-r border-slate-200/60 bg-white/80 backdrop-blur-xl overflow-hidden flex-shrink-0">
      <div class="p-8 flex flex-col h-full">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-3.5 mb-10 px-2 group">
          <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-3 transition-transform">
            <BookOpen size={20} class="text-white" />
          </div>
          <div>
            <h1 class="font-black text-slate-900 leading-none text-xl tracking-tight">Khwarizmi</h1>
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">v2.4 Manual</p>
          </div>
        </a>

        <!-- Search Bar -->
        <div class="relative mb-10 group">
          <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors">
            <List size={14} />
          </div>
          <input 
            id="doc-search"
            type="text" 
            bind:value={searchQuery}
            placeholder="Cari dokumentasi..."
            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all font-semibold placeholder:text-slate-400"
          />
        </div>

        <!-- Nav Links (Categorized) -->
        <nav class="space-y-9 flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
          {#each filteredNavigation as group}
            <div>
              <p class="px-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{group.group}</p>
              <div class="space-y-1.5">
                {#each group.items as item}
                  <a
                    href={item.href}
                    class="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group relative
                           {activeHref === item.href 
                             ? 'bg-orange-50/50 text-orange-600 font-bold' 
                             : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'}"
                  >
                    <item.icon size={18} class={activeHref === item.href ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'} />
                    <span class="text-sm tracking-tight">{item.label}</span>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </nav>

        <!-- Help Center -->
        <div class="mt-8 pt-8 border-t border-slate-100">
          <a href="https://wa.me/xxx" class="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-orange-200 transition-all group">
            <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div class="flex-1">
              <p class="text-[10px] font-bold text-slate-900 leading-none mb-1 group-hover:text-orange-600 transition-colors">Bantuan Cepat</p>
              <p class="text-[9px] text-slate-400 font-medium">WhatsApp Support</p>
            </div>
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
      <div class="max-w-[1200px] mx-auto px-6 py-12 lg:px-16 lg:py-24 relative z-10">
        <!-- Article Header Metadata -->
        <div class="flex items-center gap-4 mb-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div class="flex items-center gap-2">
            <CalendarCheck size={12} /> Terakhir diperbarui: 10 Mei 2024
          </div>
          <div class="w-1 h-1 bg-slate-200 rounded-full"></div>
          <div class="flex items-center gap-2 text-orange-500">
            <Sparkles size={12} /> 4 Menit Baca
          </div>
        </div>

        <!-- Content -->
        <article class="w-full">
          <slot />

          <!-- Page Navigation (Prev/Next) -->
          <div class="mt-24 pt-10 border-t border-slate-100 grid grid-cols-2 gap-6">
            {#if prevItem}
              <a href={prevItem.href} class="p-6 bg-white border border-slate-100 rounded-3xl hover:border-orange-500 hover:bg-orange-50/30 transition-all group">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sebelumnya</p>
                <div class="flex items-center gap-3 text-slate-900 font-bold group-hover:text-orange-600">
                  <ArrowLeft size={16} /> {prevItem.label}
                </div>
              </a>
            {:else}
              <div></div>
            {/if}

            {#if nextItem}
              <a href={nextItem.href} class="p-6 bg-white border border-slate-100 rounded-3xl hover:border-orange-500 hover:bg-orange-50/30 transition-all group text-right">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Berikutnya</p>
                <div class="flex items-center justify-end gap-3 text-slate-900 font-bold group-hover:text-orange-600">
                  {nextItem.label} <ChevronRight size={16} />
                </div>
              </a>
            {/if}
          </div>

          <!-- Feedback -->
          <div class="mt-20 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h4 class="font-black text-slate-900 text-lg mb-1">Informasi ini akurat?</h4>
              <p class="text-xs text-slate-500 font-medium tracking-tight">Kritik & saran Anda sangat berarti bagi kami.</p>
            </div>
            <div class="flex gap-4">
              <button class="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm active:scale-95">Ya</button>
              <button class="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm active:scale-95">Tidak</button>
            </div>
          </div>
        </article>

        <!-- Global Footer Info -->
        <footer class="mt-40 text-center pb-20 opacity-50">
          <div class="w-10 h-1 bg-slate-200 mx-auto rounded-full mb-8"></div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Workspace Khwarizmi &copy; 2024</p>
        </footer>
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
          <div class="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
            <BookOpen size={18} class="text-white" />
          </div>
          <span class="font-black text-slate-900 uppercase tracking-widest text-xs">Pusat Panduan</span>
        </div>
        <button onclick={() => toggleSidebar(false)} class="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:text-orange-600 transition-all">
          <ArrowLeft size={20} />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6 space-y-8">
        {#each filteredNavigation as group}
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{group.group}</p>
            <div class="space-y-2">
              {#each group.items as item}
                <a
                  href={item.href}
                  onclick={() => toggleSidebar(false)}
                  class="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all
                         {activeHref === item.href 
                           ? 'bg-orange-50 text-orange-600 font-bold' 
                           : 'bg-transparent text-slate-500'}"
                >
                  <item.icon size={18} />
                  <span class="font-bold text-sm tracking-tight">{item.label}</span>
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="p-8 border-t border-slate-100">
        <a href="/" class="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-xs">
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

  :global(article h1) {
    font-size: 4rem;
    font-weight: 900;
    line-height: 0.95;
    margin-bottom: 2.5rem;
    color: #0f172a;
    letter-spacing: -0.05em;
  }

  :global(article h2) {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-top: 5rem;
    margin-bottom: 2rem;
    color: #0f172a;
    letter-spacing: -0.03em;
  }

  :global(article p) {
    font-size: 1.25rem;
    line-height: 1.8;
    color: #475569;
    margin-bottom: 2rem;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    :global(article h1) {
      font-size: 2.75rem;
    }
    :global(article h2) {
      font-size: 1.875rem;
    }
    :global(article p) {
      font-size: 1.125rem;
    }
  }
</style>
