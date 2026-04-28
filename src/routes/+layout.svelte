<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
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

  // Audio for notification
  const NOTIF_SOUND = "data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEAAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjYwLjMuMTAwAAAAAAAAAAAAAAD/80MUAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAMAAAbWAAfHx8fHx8fPz8/Pz8/Pz9PT09PT09PT19fX19fX19fX39/f39/f39/f////////////////wAAAABMYXZmAAAAAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAbWAAAAAAAAAAAAP/zQxQkAAAAtYABZDAAAAlIADzSDAAAAAYAAAAIAAAAMAAAAAAAAA/8EAcB/8EAcB//zQxREAAAAtYABZDAAAAlIADzSDAAAAAAYAAAAIAAAAMAAAAAAAAA/8EAcB/8EAcB//zQxRkAAAAtYABZDAAAAlIADzSDAAAAAAYAAAAIAAAAMAAAAAAAAA/8EAcB/8EAcB"

  onMount(() => {
    let audio: HTMLAudioElement;
    
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, () => {
          if (!audio) audio = new Audio(NOTIF_SOUND);
          audio.currentTime = 0;
          audio.play().catch(() => {});
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtime()
  })
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