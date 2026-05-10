<script lang="ts">
  import { page } from '$app/state';
  import { 
    ArrowLeft, ArrowRight, BookOpen, MessageSquare, ChevronRight, Menu, X, List,
    LogIn, LayoutDashboard, CalendarCheck, CheckSquare, Shield, Sparkles
  } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  let isSidebarOpen = $state(false);
  let mainElement: HTMLElement;
  let searchQuery = $state('');
  let scrollProgress = $state(0);
  let activeSection = $state('overview');

  function handleScroll() {
    if (!mainElement) return;
    const currentScrollY = mainElement.scrollTop;
    const totalHeight = mainElement.scrollHeight - mainElement.clientHeight;
    scrollProgress = (currentScrollY / totalHeight) * 100;
    
    isScrollingUp = currentScrollY < lastScrollY || currentScrollY < 100;
    lastScrollY = currentScrollY;
    scrollY = currentScrollY;

    // Detect active section for TOC
    const sections = ['intro', 'features', 'steps', 'faq'];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < 200) activeSection = id;
      }
    }
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

  const allItems = navigation.flatMap(g => g.items);
  let currentIndex = $derived(allItems.findIndex(item => item.href === activeHref));
  let prevItem = $derived(currentIndex > 0 ? allItems[currentIndex - 1] : null);
  let nextItem = $derived(currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null);

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
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
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

  let activeHref = $derived(page.url.pathname);
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="h-screen overflow-hidden bg-white font-sans selection:bg-orange-100 selection:text-orange-900 flex flex-col relative">
  
  <!-- Mobile Header -->
  <header class="lg:hidden sticky top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 py-4 px-6 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
        <BookOpen size={16} class="text-white" />
      </div>
      <span class="font-bold text-slate-900 tracking-tight">Khwarizmi Docs</span>
    </div>
    <button onclick={() => toggleSidebar(true)} class="p-2 text-slate-500">
      <Menu size={24} />
    </button>
  </header>

  <div class="flex-1 flex overflow-hidden w-full max-w-[1440px] mx-auto">
    <!-- Desktop Left Sidebar (Navigation) -->
    <aside class="hidden lg:flex flex-col h-full w-72 border-r border-slate-100 bg-white flex-shrink-0 sticky top-0">
      <div class="px-8 py-10 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <!-- Logo -->
        <a href="/" class="flex items-center gap-3 mb-12">
          <div class="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <BookOpen size={18} class="text-white" />
          </div>
          <span class="font-black text-slate-900 text-xl tracking-tight">Khwarizmi</span>
        </a>

        <!-- Search Bar -->
        <div class="relative mb-10 group">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <List size={14} />
          </div>
          <input 
            id="doc-search"
            type="text" 
            bind:value={searchQuery}
            placeholder="Search docs... (⌘K)"
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
          />
        </div>

        <!-- Nav -->
        <nav class="space-y-10 flex-1">
          {#each filteredNavigation as group}
            <div>
              <h5 class="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-4 px-1">{group.group}</h5>
              <ul class="space-y-1 border-l border-slate-100">
                {#each group.items as item}
                  <li>
                    <a
                      href={item.href}
                      class="block px-4 py-2 text-[13px] transition-all border-l -ml-[1px]
                             {activeHref === item.href 
                               ? 'border-orange-500 text-orange-600 font-bold' 
                               : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}"
                    >
                      {item.label}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </nav>
      </div>
    </aside>

    <!-- Main Content -->
    <main 
      bind:this={mainElement}
      onscroll={handleScroll}
      class="flex-1 min-w-0 overflow-y-auto custom-scrollbar"
    >
      <div class="flex gap-16 px-8 lg:px-16 py-12 lg:py-20 max-w-[1100px] mx-auto">
        <!-- Center Content -->
        <article class="flex-1 min-w-0">
          <!-- Breadcrumbs -->
          <div class="flex items-center gap-2 text-[11px] font-medium text-slate-400 mb-8 uppercase tracking-widest">
            <span>Docs</span>
            <ChevronRight size={10} />
            <span class="text-slate-900">Current Page</span>
          </div>

          <slot />

          <!-- Page Navigation (Prev/Next) -->
          <div class="mt-24 pt-10 border-t border-slate-100 flex items-center justify-between">
            {#if prevItem}
              <a href={prevItem.href} class="flex flex-col gap-2 group">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-orange-500 transition-colors">Previous</span>
                <span class="text-sm font-bold text-slate-900 group-hover:text-orange-600 flex items-center gap-2 transition-colors">
                  <ArrowLeft size={16} /> {prevItem.label}
                </span>
              </a>
            {:else}
              <div></div>
            {/if}

            {#if nextItem}
              <a href={nextItem.href} class="flex flex-col gap-2 group text-right">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-orange-500 transition-colors">Next</span>
                <span class="text-sm font-bold text-slate-900 group-hover:text-orange-600 flex items-center gap-2 transition-colors">
                  {nextItem.label} <ChevronRight size={16} />
                </span>
              </a>
            {/if}
          </div>
        </article>

        <!-- Right Sidebar (On This Page) -->
        <aside class="hidden xl:block w-56 flex-shrink-0 sticky top-0 h-fit">
          <p class="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-6">On this page</p>
          <nav class="space-y-4 border-l border-slate-100">
            {#each [
              { id: 'intro', label: 'Overview' },
              { id: 'features', label: 'Key Features' },
              { id: 'steps', label: 'Getting Started' },
              { id: 'faq', label: 'FAQ' }
            ] as section}
              <a 
                href="#{section.id}" 
                class="block pl-4 text-xs font-medium transition-all border-l -ml-[1px]
                       {activeSection === section.id 
                         ? 'border-orange-500 text-orange-600 font-bold' 
                         : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}"
              >
                {section.label}
              </a>
            {/each}
          </nav>

          <div class="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Need help?</p>
            <a href="https://wa.me/xxx" class="text-xs font-bold text-slate-900 hover:text-orange-600 transition-colors flex items-center gap-2">
              Contact support <ArrowRight size={12} />
            </a>
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
      <div class="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <BookOpen size={16} class="text-white" />
          </div>
          <span class="font-bold text-slate-900">Khwarizmi Docs</span>
        </div>
        <button onclick={() => toggleSidebar(false)} class="p-2 text-slate-500">
          <ArrowLeft size={24} />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-8 space-y-10">
        {#each navigation as group}
          <div>
            <h5 class="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-4">{group.group}</h5>
            <ul class="space-y-4">
              {#each group.items as item}
                <li>
                  <a
                    href={item.href}
                    onclick={() => toggleSidebar(false)}
                    class="text-base font-medium transition-all
                           {activeHref === item.href ? 'text-orange-600 font-bold' : 'text-slate-500'}"
                  >
                    {item.label}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
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
    color: #0f172a;
    background: white;
  }

  :global(article h1) {
    font-size: 2.75rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 2rem;
    color: #0f172a;
    letter-spacing: -0.03em;
  }

  :global(article h2) {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 4rem;
    margin-bottom: 1.5rem;
    color: #0f172a;
    letter-spacing: -0.02em;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 0.5rem;
  }

  :global(article p) {
    font-size: 1.125rem;
    line-height: 1.75;
    color: #475569;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 768px) {
    :global(article h1) {
      font-size: 2rem;
    }
    :global(article h2) {
      font-size: 1.5rem;
    }
  }
</style>
