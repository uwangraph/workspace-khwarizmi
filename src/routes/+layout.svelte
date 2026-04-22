<script lang="ts">
  import './layout.css'
  import { page } from '$app/stores'
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
  {@render children()}
  {#if showNav}
    <BottomNav />
  {/if}
</div>