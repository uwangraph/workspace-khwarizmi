<script lang="ts">
  import './layout.css'
  import { onMount } from 'svelte'

  let { children } = $props()
  let ready = $state(false)

  onMount(() => { ready = true })
</script>

{#if ready}
  {@render children()}
{/if}