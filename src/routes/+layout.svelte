<script lang="ts">
  import './layout.css'
  import { page } from '$app/stores'
  import { Toaster } from 'svelte-french-toast'
  import BottomNav from '$lib/components/BottomNav.svelte'

  let { children } = $props()

  // Routes yang tidak perlu BottomNav
  const hiddenNavRoutes = ['/auth', '/login', '/register', '/admin']
  const showNav = $derived(!hiddenNavRoutes.some(route => $page.url.pathname.startsWith(route)))
  
  // Routes yang perlu tampil penuh di desktop tanpa batas max-w-xl
  const fullWidthRoutes = ['/admin', '/auth', '/login', '/register']
  const isFullWidthLayout = $derived(fullWidthRoutes.some(route => $page.url.pathname.startsWith(route)))
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/logo-khwarizmi.png" />
</svelte:head>

<div class={isFullWidthLayout ? "min-h-screen bg-slate-50 relative" : "max-w-xl mx-auto min-h-screen bg-white relative shadow-2xl overflow-hidden sm:border-x sm:border-slate-200"}>
  <Toaster position="bottom-center" toastOptions={{ style: "font-family:'Inter',sans-serif; font-size:13px; font-weight:500; border-radius:14px; padding:12px 16px;" }} />
  {@render children()}
  {#if showNav}
    <BottomNav />
  {/if}
</div>