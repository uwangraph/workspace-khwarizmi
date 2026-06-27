<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import { Video, Loader2, AlertTriangle } from 'lucide-svelte'
  import { authService } from '$lib/services/authService'
  import { callService } from '$lib/services/callService'
  import { callState } from '$lib/stores/callStore'

  let meetingId = $derived($page.params.id ?? '')
  let meetingName = $derived($page.url.searchParams.get('name') || 'Rapat')

  let isInitializing = $state(true)
  let errorMessage = $state<string | null>(null)
  let hasTriggeredPrejoin = $state(false)

  onMount(async () => {
    try {
      const user = await authService.getUser()
      if (!user) {
        // Simpan tujuan dan redirect ke auth
        sessionStorage.setItem('redirect_after_login', `/meeting/${meetingId}?name=${encodeURIComponent(meetingName)}`)
        goto('/auth')
        return
      }

      // Trigger pre-join overlay (rendered di +layout.svelte)
      if (!hasTriggeredPrejoin) {
        callService.prepareCall(meetingId, meetingName, 'join')
        hasTriggeredPrejoin = true
      }
    } catch (e: any) {
      errorMessage = e?.message || 'Gagal memuat rapat'
    } finally {
      isInitializing = false
    }
  })

  // Saat call berakhir (status balik ke 'idle'), tampilkan layar selesai
  let isCallActive = $derived($callState.status !== 'idle')
  let showEndedScreen = $derived(hasTriggeredPrejoin && !isCallActive && !isInitializing)
</script>

<svelte:head>
  <title>{meetingName} · Khwarizmi Meet</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col">
  {#if isInitializing}
    <div class="flex-1 flex flex-col items-center justify-center gap-4 px-6" transition:fade={{ duration: 150 }}>
      <div class="w-14 h-14 rounded-3xl bg-emerald-100 flex items-center justify-center">
        <Loader2 size={26} class="text-emerald-600 animate-spin" />
      </div>
      <div class="text-center">
        <p class="text-sm font-black text-slate-800">Menyiapkan rapat...</p>
        <p class="text-xs font-medium text-slate-500 mt-1">{meetingName}</p>
      </div>
    </div>
  {:else if errorMessage}
    <div class="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center" transition:fade>
      <div class="w-14 h-14 rounded-3xl bg-red-100 flex items-center justify-center">
        <AlertTriangle size={26} class="text-red-500" />
      </div>
      <div>
        <p class="text-sm font-black text-slate-800">Gagal memuat rapat</p>
        <p class="text-xs font-medium text-slate-500 mt-1">{errorMessage}</p>
      </div>
      <button onclick={() => goto('/chat')}
              class="mt-4 px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-black border-2 border-b-[5px] border-emerald-700 hover:bg-emerald-600 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
        Kembali ke Chat
      </button>
    </div>
  {:else if showEndedScreen}
    <div class="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center" transition:fade>
      <div class="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center">
        <Video size={28} class="text-emerald-600" />
      </div>
      <div>
        <p class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Rapat selesai</p>
        <p class="text-xs font-medium text-slate-500 mt-1 max-w-[260px]">Terima kasih sudah ikut serta dalam {meetingName}.</p>
      </div>
      <div class="flex flex-col gap-2 w-full max-w-xs">
        <button onclick={() => { callService.prepareCall(meetingId, meetingName, 'join'); hasTriggeredPrejoin = true }}
                class="w-full py-3 rounded-2xl bg-emerald-500 text-white text-xs font-black border-2 border-b-[5px] border-emerald-700 hover:bg-emerald-600 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer">
          Gabung Ulang
        </button>
        <button onclick={() => goto('/chat')}
                class="w-full py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">
          Kembali ke Chat
        </button>
      </div>
    </div>
  {:else}
    <!-- Pre-join atau call overlay sedang aktif di +layout.svelte; halaman ini cuma jadi anchor -->
    <div class="flex-1 flex items-center justify-center px-6" transition:fade>
      <div class="text-center">
        <div class="w-12 h-12 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Video size={22} class="text-emerald-600" />
        </div>
        <p class="text-sm font-black text-slate-800">{meetingName}</p>
        <p class="text-[11px] font-medium text-slate-400 mt-1">Menghubungkan ke rapat...</p>
      </div>
    </div>
  {/if}
</div>
