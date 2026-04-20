<script lang="ts">
  import './layout.css'
  import { page } from '$app/stores'
  import BottomNav from '$lib/components/BottomNav.svelte'

  let { children } = $props()

  // Routes yang tidak perlu BottomNav
  const hiddenNavRoutes = ['/auth', '/login', '/register']
  const showNav = $derived(!hiddenNavRoutes.some(route => $page.url.pathname.startsWith(route)))
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/logo-khwarizmi.png" />
</svelte:head>

{@render children()}
{#if showNav}
  <BottomNav />
{/if}