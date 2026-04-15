<script lang="ts">
  import './layout.css'
  import { onMount } from 'svelte'
  import BottomNav from '$lib/components/BottomNav.svelte'

  let { children } = $props()
  let ready = $state(false)

  onMount(() => { ready = true })
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/logo-khwarizmi.png" />
</svelte:head>

{#if ready}
  {@render children()}
  <BottomNav />
{/if}