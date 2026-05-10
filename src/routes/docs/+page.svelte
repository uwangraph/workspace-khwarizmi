<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    ArrowLeft, BookOpen, MessageSquare, ChevronRight, Menu, X, List
  } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // Import Section Components
  import IntroSection from '$lib/components/docs/IntroSection.svelte';
  import InstallSection from '$lib/components/docs/InstallSection.svelte';
  import DashboardSection from '$lib/components/docs/DashboardSection.svelte';
  import PresensiSection from '$lib/components/docs/PresensiSection.svelte';
  import TasksSection from '$lib/components/docs/TasksSection.svelte';
  import ChatSection from '$lib/components/docs/ChatSection.svelte';
  import ProfileSection from '$lib/components/docs/ProfileSection.svelte';
  import FaqSection from '$lib/components/docs/FaqSection.svelte';

  // Sections definition
  import { 
    LogIn, LayoutDashboard, CalendarCheck, CheckSquare, Shield, Sparkles 
  } from 'lucide-svelte';

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
      <div class="p-10 h-full flex flex-col">
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
        <nav class="space-y-1.5 flex-1">
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

        <div class="mt-auto pt-8 border-t border-slate-200/60">
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
        <IntroSection />
        <hr class="border-slate-100 mb-32" />
        <InstallSection />
        <DashboardSection />
        <PresensiSection />
        <TasksSection />
        <ChatSection />
        <ProfileSection />
        <FaqSection />

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
