<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade, fly, slide } from 'svelte/transition'
  import { cubicOut, quintOut } from 'svelte/easing'
  import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Users,
    Hand, Smile, LayoutGrid, Maximize2, X, Pin, Copy, Check, Send, UserPlus,
    MonitorUp, MonitorOff, PictureInPicture, Trash2, ChevronDown, Search,
  } from 'lucide-svelte'
  import { callService } from '$lib/services/callService'
  import { callState, floatingReactions, raisedHands, sharingPeers, activeSpeaker } from '$lib/stores/callStore'
  import toast from 'svelte-french-toast'
  import type { Profile } from '$lib/type'
  import { supabase } from '$lib/supabase'

  let { roomName = '' }: { roomName?: string } = $props()

  type Tile = { id: string; name: string; stream: MediaStream | null; isLocal: boolean }

  let localVideoEl = $state<HTMLVideoElement | null>(null)
  let remoteStreams = $state<Map<string, { stream: MediaStream; name: string }>>(new Map())

  let isMuted = $state(false)
  let isCameraOff = $state(false)
  let handRaised = $state(false)
  let callDuration = $state(0)
  let durationInterval: ReturnType<typeof setInterval> | null = null
  let clockInterval: ReturnType<typeof setInterval> | null = null

  let layoutMode = $state<'grid' | 'spotlight'>('grid')
  let spotlightId = $state<string | null>(null)

  let showParticipantsPanel = $state(false)
  let showReactionPicker = $state(false)
  let isLinkCopied = $state(false)
  let isReinviting = $state(false)
  let currentTime = $state(new Date())
  
  // Kontak search state
  let allProfiles = $state<Profile[]>([])
  let inviteSearch = $state('')
  let selectedToInvite = $state<Set<string>>(new Set())
  let isLoadingContacts = $state(true)
  let contactsError = $state<string | null>(null)

  let isSharingScreen = $state(false)
  let isToggleSharing = $state(false)
  let isScreenShareSupported = $state(true)

  let status = $derived($callState.status)
  let localId = $derived(callService.currentUserId)
  let localName = $derived(callService.currentUserName || 'Kamu')
  let currentSpeakerId = $derived($activeSpeaker)
  let isHost = $derived(callService.isHost)

  // Auto-spotlight active speaker (Suggestion 2)
  $effect(() => {
    if (currentSpeakerId && currentSpeakerId !== spotlightId) {
      // Prioritaskan yang lagi share screen jika ada
      const isSomeoneSharing = $sharingPeers.size > 0
      if (!isSomeoneSharing || $sharingPeers.has(currentSpeakerId)) {
        spotlightId = currentSpeakerId
        layoutMode = 'spotlight'
      }
    }
  })

  let tiles = $derived.by<Tile[]>(() => {
    const localTile: Tile = {
      id: localId,
      name: `${localName} (Kamu)`,
      stream: callService.localStream,
      isLocal: true,
    }
    const remoteTiles: Tile[] = []
    for (const [peerId, { stream, name }] of remoteStreams) {
      remoteTiles.push({ id: peerId, name, stream, isLocal: false })
    }
    return [localTile, ...remoteTiles]
  })

  let spotlightTile = $derived(
    layoutMode === 'spotlight'
      ? (tiles.find((t) => t.id === spotlightId) ?? tiles.find((t) => !t.isLocal) ?? tiles[0])
      : null
  )
  let otherTiles = $derived(
    layoutMode === 'spotlight' && spotlightTile
      ? tiles.filter((t) => t.id !== spotlightTile!.id)
      : []
  )

  let gridCols = $derived.by(() => {
    const n = tiles.length
    if (n <= 1) return 1
    if (n <= 4) return 2
    if (n <= 9) return 3
    return 4
  })

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🎉', '🔥', '🙏']

  function formatDuration(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function togglePiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (localVideoEl) {
        await localVideoEl.requestPictureInPicture()
      }
    } catch (e) {
      console.warn('[PiP] Not supported or failed:', e)
    }
  }

  onMount(() => {
    isScreenShareSupported = callService.isScreenShareSupported()

    // Fetch all profiles for invitation
    supabase.from('profiles').select('*').then(({ data, error }: { data: Profile[] | null; error: any }) => {
      if (error) {
        console.error('[VideoCallOverlay] Failed to fetch profiles:', error)
        contactsError = 'Gagal memuat kontak'
      } else if (data) {
        allProfiles = data
      }
      isLoadingContacts = false
    })

    callService.onRemoteStream = (peerId, peerName, stream) => {
      remoteStreams = new Map(remoteStreams).set(peerId, { stream, name: peerName })
    }

    callService.onPeerLeft = (peerId) => {
      const next = new Map(remoteStreams)
      next.delete(peerId)
      remoteStreams = next
      if (spotlightId === peerId) spotlightId = null
    }

    callService.onCallEnded = () => {
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {})
      }
      cleanup()
    }

    callService.onLocalStreamChanged = () => {
      // Force re-render of local video binding (stream reference berubah saat share/unshare)
      if (localVideoEl && callService.localStream) {
        localVideoEl.srcObject = null
        localVideoEl.srcObject = callService.localStream
      }
    }

    durationInterval = setInterval(() => callDuration++, 1000)

    // Update clock
    clockInterval = setInterval(() => currentTime = new Date(), 60000)

    return () => {
    }
  })

  onDestroy(() => cleanup())

  function cleanup() {
    if (durationInterval) clearInterval(durationInterval)
    if (clockInterval) clearInterval(clockInterval)
  }

  function attachVideo(el: HTMLVideoElement | null, stream: MediaStream | null) {
    if (el && stream && el.srcObject !== stream) el.srcObject = stream
  }

  $effect(() => {
    if (localVideoEl) attachVideo(localVideoEl, callService.localStream)
  })

  $effect(() => {
    for (const [peerId, { stream }] of remoteStreams) {
      const el = document.getElementById(`rv-${peerId}`) as HTMLVideoElement | null
      attachVideo(el, stream)
    }
  })

  // ── Controls ─────────────────────────────────────────────────────────────
  function toggleMute() {
    isMuted = !isMuted
    callService.toggleAudio(!isMuted)
  }

  function toggleCamera() {
    isCameraOff = !isCameraOff
    callService.toggleVideo(!isCameraOff)
  }

  function toggleHand() {
    handRaised = !handRaised
    callService.raiseHand(handRaised)
  }

  function sendReaction(emoji: string) {
    callService.sendReaction(emoji)
    showReactionPicker = false
  }

  function toggleLayout() {
    layoutMode = layoutMode === 'grid' ? 'spotlight' : 'grid'
  }

  let filteredContacts = $derived(
    inviteSearch.trim() === ''
      ? allProfiles.filter(p => !tiles.find(t => t.id === p.id))
      : allProfiles.filter(p => 
          !tiles.find(t => t.id === p.id) && 
          p.full_name.toLowerCase().includes(inviteSearch.toLowerCase())
        )
  )

  function toggleInvite(uid: string) {
    if (selectedToInvite.has(uid)) selectedToInvite.delete(uid)
    else selectedToInvite.add(uid)
  }

  async function handleReinviteSelected() {
    if (selectedToInvite.size === 0 || isReinviting) return
    isReinviting = true
    try {
      const uids = Array.from(selectedToInvite)
      const count = await callService.reinvite(uids)
      if (count > 0) {
        toast.success(`Undangan dikirim ke ${uids.length} orang`)
        selectedToInvite.clear()
        inviteSearch = ''
      } else {
        toast.error('Meeting tidak aktif')
      }
    } catch (e: any) {
      console.error('[VideoCallOverlay] Reinvite failed:', e)
      toast.error('Gagal mengirim undangan: ' + (e?.message || 'Unknown error'))
    } finally {
      isReinviting = false
    }
  }

  function pinTile(id: string) {
    spotlightId = id
    layoutMode = 'spotlight'
  }

  function minimizeUI() {
    callState.update(s => (s.status === 'calling' || s.status === 'ongoing' ? { ...s, isMinimized: true } : s))
  }

  function handleEndCall() {
    callService.endCall()
  }

  async function toggleScreenShare() {
    if (!isScreenShareSupported) {
      toast.error('Browser ini tidak mendukung berbagi layar')
      return
    }
    if (isToggleSharing) return
    isToggleSharing = true
    try {
      if (isSharingScreen) {
        await callService.stopScreenShare()
        isSharingScreen = false
        toast.success('Berhenti berbagi layar')
      } else {
        await callService.startScreenShare()
        isSharingScreen = true
        toast.success('Mulai berbagi layar')
      }
    } catch (e: any) {
      // User klik cancel di dialog browser — diamkan
      if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') {
        toast.error(e?.message || 'Gagal berbagi layar')
      }
    } finally {
      isToggleSharing = false
    }
  }

  async function copyMeetingLink() {
    const link = callService.getRoomLink()
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      isLinkCopied = true
      toast.success('Tautan rapat disalin')
      setTimeout(() => { isLinkCopied = false }, 2000)
    } catch {
      toast.error('Gagal menyalin tautan')
    }
  }

  async function handleReinvite() {
    if (isReinviting) return
    isReinviting = true
    try {
      const count = await callService.reinvite()
      if (count > 0) toast.success(`Undangan dikirim ulang ke ${count - 1} peserta`)
      else toast('Tidak ada peserta yang bisa diundang ulang')
    } catch {
      toast.error('Gagal mengirim undangan')
    } finally {
      setTimeout(() => { isReinviting = false }, 1200)
    }
  }

  function initials(name: string) {
    return (name || 'U').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
  }

  let raisedSet = $derived($raisedHands)
  let sharingSet = $derived($sharingPeers)
  let reactions = $derived($floatingReactions)
  let totalParticipants = $derived(tiles.length)

  // Auto-spotlight ke peer yang baru mulai share screen
  let lastAutoSpotlightPeer = $state<string | null>(null)
  $effect(() => {
    const activeSharer = Array.from(sharingSet).find((id) => id !== localId)
    if (activeSharer && activeSharer !== lastAutoSpotlightPeer) {
      lastAutoSpotlightPeer = activeSharer
      spotlightId = activeSharer
      layoutMode = 'spotlight'
    }
    if (!activeSharer) lastAutoSpotlightPeer = null
  })

  // Sinkronkan flag lokal dengan store (handle 'Stop sharing' dari browser overlay)
  $effect(() => {
    isSharingScreen = sharingSet.has(localId)
  })

  function attachStream(node: HTMLVideoElement, stream: MediaStream | null) {
    if (stream && node.srcObject !== stream) node.srcObject = stream
    return {
      update(newStream: MediaStream | null) {
        if (newStream && node.srcObject !== newStream) node.srcObject = newStream
        else if (!newStream) node.srcObject = null
      },
      destroy() { node.srcObject = null },
    }
  }
</script>

<div class="fixed inset-0 z-[300] bg-slate-50 flex flex-col select-none overflow-hidden" transition:fade={{ duration: 200 }}>
  <!-- Top bar -->
  <div class="relative z-20 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
    <div class="flex items-center gap-3 min-w-0">
      <button onclick={minimizeUI} class="w-9 h-9 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors cursor-pointer" title="Minimalkan UI">
        <ChevronDown size={20} />
      </button>
      <div class="min-w-0">
        <h2 class="text-sm font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{roomName || 'Rapat'}</h2>
        <div class="flex items-center gap-2 text-[10px] font-bold">
          {#if status === 'calling' && tiles.length === 1}
            <span class="text-orange-500 animate-pulse">● Memanggil...</span>
          {:else}
            <span class="text-emerald-600 font-mono">● {formatDuration(callDuration)}</span>
          {/if}
          <span class="text-slate-300">·</span>
          <span class="text-slate-500">{totalParticipants} peserta</span>
          <span class="text-slate-300">·</span>
          <span class="text-slate-500">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1.5">
      <button onclick={toggleLayout}
              title={layoutMode === 'grid' ? 'Ke Spotlight' : 'Ke Grid'}
              class="p-2 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
        {#if layoutMode === 'grid'}
          <Maximize2 size={18} />
        {:else}
          <LayoutGrid size={18} />
        {/if}
      </button>
      <button onclick={() => showParticipantsPanel = !showParticipantsPanel}
              title="Peserta"
              class="relative p-2 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
        <Users size={18} />
        <span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">{totalParticipants}</span>
      </button>
    </div>
  </div>

  <!-- Stage -->
  <div class="flex-1 relative overflow-hidden">
    <div class="absolute inset-0 p-4 pb-32 sm:pb-36 flex">
      {#if layoutMode === 'grid'}
        <div class="w-full h-full grid gap-3 auto-rows-fr" style="grid-template-columns: repeat({gridCols}, minmax(0, 1fr));">
          {#each tiles as tile (tile.id)}
            <div class="relative rounded-3xl overflow-hidden bg-slate-200 border-2 {sharingSet.has(tile.id) ? 'border-emerald-400 shadow-lg shadow-emerald-400/30' : raisedSet.has(tile.id) ? 'border-amber-400 shadow-lg shadow-amber-400/30' : 'border-white'} shadow-md group">
              {#if tile.isLocal}
                {#if isCameraOff && !isSharingScreen}
                  <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                    <div class="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
                      <span class="text-lg font-black text-emerald-600">{initials(localName)}</span>
                    </div>
                  </div>
                {:else}
                  <video bind:this={localVideoEl} autoplay playsinline muted
                         class="w-full h-full bg-slate-900 {isSharingScreen ? 'object-contain' : 'object-cover scale-x-[-1]'}"></video>
                {/if}
              {:else if tile.stream}
                <video id="rv-{tile.id}" autoplay playsinline
                       class="w-full h-full bg-slate-900 {sharingSet.has(tile.id) ? 'object-contain' : 'object-cover'}"></video>
              {:else}
                <div class="absolute inset-0 flex items-center justify-center bg-slate-300">
                  <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <span class="text-base font-black text-slate-600">{initials(tile.name)}</span>
                  </div>
                </div>
              {/if}

              <!-- Presenting badge -->
              {#if sharingSet.has(tile.id)}
                <div class="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center gap-1.5 shadow-md">
                  <MonitorUp size={10} />
                  Mempresentasikan
                </div>
              {/if}

              <!-- Name + indicators overlay -->
              <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                <div class="px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm flex items-center gap-1.5 max-w-[80%]">
                  {#if tile.isLocal && isMuted}
                    <MicOff size={10} class="text-red-300 shrink-0" />
                  {/if}
                  <span class="text-white text-[10px] font-bold truncate">{tile.name}</span>
                </div>
                {#if raisedSet.has(tile.id)}
                  <div class="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-md animate-bounce">
                    <Hand size={14} class="text-white" />
                  </div>
                {/if}
              </div>

              <!-- Pin button (hover) -->
              {#if !tile.isLocal}
                <button onclick={() => pinTile(tile.id)}
                        title="Sematkan"
                        class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Pin size={12} />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <!-- Spotlight: main tile + thumbnail strip -->
        <div class="w-full h-full flex flex-col gap-3">
          {#if spotlightTile}
            <div class="flex-1 relative rounded-3xl overflow-hidden bg-slate-200 border-2 {sharingSet.has(spotlightTile.id) ? 'border-emerald-400 shadow-emerald-400/30' : raisedSet.has(spotlightTile.id) ? 'border-amber-400' : 'border-white'} shadow-lg">
              {#if spotlightTile.isLocal}
                {#if isCameraOff && !isSharingScreen}
                  <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                    <div class="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center">
                      <span class="text-2xl font-black text-emerald-600">{initials(localName)}</span>
                    </div>
                  </div>
                {:else}
                  <video bind:this={localVideoEl} autoplay playsinline muted
                         class="w-full h-full bg-slate-900 {isSharingScreen ? 'object-contain' : 'object-cover scale-x-[-1]'}"></video>
                {/if}
              {:else if spotlightTile.stream}
                <video id="rv-{spotlightTile.id}" autoplay playsinline
                       class="w-full h-full bg-slate-900 {sharingSet.has(spotlightTile.id) ? 'object-contain' : 'object-cover'}"></video>
              {:else}
                <div class="absolute inset-0 flex items-center justify-center bg-slate-300">
                  <div class="w-20 h-20 rounded-full bg-white flex items-center justify-center">
                    <span class="text-xl font-black text-slate-600">{initials(spotlightTile.name)}</span>
                  </div>
                </div>
              {/if}

              {#if sharingSet.has(spotlightTile.id)}
                <div class="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1.5 shadow-lg">
                  <MonitorUp size={12} />
                  {spotlightTile.isLocal ? 'Kamu sedang mempresentasikan' : 'Mempresentasikan layar'}
                </div>
              {/if}

              <div class="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md flex items-center gap-2">
                <span class="text-white text-xs font-bold">{spotlightTile.name}</span>
                {#if raisedSet.has(spotlightTile.id)}
                  <Hand size={12} class="text-amber-300" />
                {/if}
              </div>
            </div>
          {/if}

          {#if otherTiles.length > 0}
            <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
              {#each otherTiles as tile (tile.id)}
                <button onclick={() => pinTile(tile.id)}
                        class="relative w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden bg-slate-200 border-2 {raisedSet.has(tile.id) ? 'border-amber-400' : 'border-white'} shadow-sm shrink-0 cursor-pointer hover:scale-[1.03] transition-transform">
                  {#if tile.isLocal}
                    {#if isCameraOff}
                      <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                        <span class="text-sm font-black text-emerald-600">{initials(localName)}</span>
                      </div>
                    {:else}
                      <video autoplay playsinline muted class="w-full h-full object-cover scale-x-[-1] bg-slate-900"
                             use:attachStream={callService.localStream}></video>
                    {/if}
                  {:else if tile.stream}
                    <video autoplay playsinline class="w-full h-full object-cover bg-slate-900"
                           use:attachStream={tile.stream}></video>
                  {:else}
                    <div class="absolute inset-0 flex items-center justify-center bg-slate-300">
                      <span class="text-sm font-black text-slate-600">{initials(tile.name)}</span>
                    </div>
                  {/if}
                  <div class="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                    <p class="text-white text-[9px] font-bold truncate">{tile.isLocal ? 'Kamu' : tile.name}</p>
                  </div>
                  {#if raisedSet.has(tile.id)}
                    <div class="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                      <Hand size={10} class="text-white" />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Floating reactions -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden z-30">
      {#each reactions as r (r.id)}
        <div class="reaction-bubble" in:fly={{ y: 60, duration: 400, easing: cubicOut }} out:fade={{ duration: 300 }}>
          <span class="text-3xl">{r.emoji}</span>
          <span class="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full -mt-1">{r.peerName.split(' ')[0]}</span>
        </div>
      {/each}
    </div>

    <!-- Floating Meeting Link Chip (ala Google Meet) -->
    <button onclick={copyMeetingLink}
            title="Salin tautan rapat"
            style="bottom: calc(env(safe-area-inset-bottom) + 100px);"
            class="absolute left-4 z-30 group flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-slate-100 shadow-lg hover:shadow-xl hover:border-emerald-300 active:scale-95 transition-all cursor-pointer max-w-[58%] sm:max-w-xs">
      {#if isLinkCopied}
        <div class="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Check size={14} class="text-emerald-600" strokeWidth={3} />
        </div>
        <div class="text-left min-w-0">
          <p class="text-[9px] font-black uppercase tracking-widest text-emerald-500">Tersalin</p>
          <p class="text-[11px] font-black text-slate-700 truncate">Bagikan ke peserta</p>
        </div>
      {:else}
        <div class="w-7 h-7 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center shrink-0 transition-colors">
          <Copy size={14} class="text-emerald-600 group-hover:text-white transition-colors" />
        </div>
        <div class="text-left min-w-0">
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Tautan Rapat</p>
          <p class="text-[11px] font-black text-slate-700 truncate">{roomName || 'Salin & bagikan'}</p>
        </div>
      {/if}
    </button>
  </div>

  <!-- Bottom control bar -->
  <div class="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
    {#if showReactionPicker}
      <div class="mx-auto mb-3 max-w-md flex items-center justify-center gap-2 p-3 rounded-3xl bg-white border-2 border-slate-100 shadow-xl"
           transition:slide={{ duration: 200, easing: quintOut }}>
        {#each REACTION_EMOJIS as emoji}
          <button onclick={() => sendReaction(emoji)}
                  class="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-xl cursor-pointer">
            {emoji}
          </button>
        {/each}
      </div>
    {/if}

    <div class="mx-auto max-w-md flex items-center justify-center gap-2.5">
      <button onclick={toggleMute}
              title={isMuted ? 'Nyalakan mic' : 'Matikan mic'}
              class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2
                     {isMuted ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
        {#if isMuted}<MicOff size={20} />{:else}<Mic size={20} />{/if}
      </button>

      <button onclick={toggleCamera}
              title={isCameraOff ? 'Nyalakan kamera' : 'Matikan kamera'}
              class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2
                     {isCameraOff ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
        {#if isCameraOff}<VideoOff size={20} />{:else}<Video size={20} />{/if}
      </button>

      {#if isScreenShareSupported}
        <button onclick={toggleScreenShare} disabled={isToggleSharing}
                title={isSharingScreen ? 'Hentikan berbagi layar' : 'Bagikan layar'}
                class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2 disabled:opacity-60 disabled:cursor-not-allowed
                       {isSharingScreen ? 'bg-emerald-500 border-emerald-700 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
          {#if isSharingScreen}<MonitorOff size={20} />{:else}<MonitorUp size={20} />{/if}
        </button>
      {/if}

      <button onclick={toggleHand}
              title="Angkat tangan"
              class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2
                     {handRaised ? 'bg-amber-400 border-amber-500 text-white shadow-lg shadow-amber-400/30 animate-pulse' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
        <Hand size={20} />
      </button>

      <button onclick={togglePiP}
              title="Picture-in-Picture"
              class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
        <PictureInPicture size={20} />
      </button>

      <button onclick={() => showReactionPicker = !showReactionPicker}
              title="Reaksi"
              class="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer border-2
                     {showReactionPicker ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
        <Smile size={20} />
      </button>

      <button onclick={handleEndCall}
              title="Akhiri panggilan"
              class="w-14 h-12 sm:w-16 sm:h-13 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-500/40 hover:bg-red-600 active:scale-90 transition-all cursor-pointer border-2 border-red-600">
        <PhoneOff size={22} />
      </button>
    </div>
  </div>

  <!-- Participants Side Panel -->
  {#if showParticipantsPanel}
    <!-- Backdrop - click to close -->
    <div class="fixed inset-0 z-[310] bg-slate-900/30 backdrop-blur-sm" onclick={() => showParticipantsPanel = false} transition:fade={{ duration: 150 }}></div>

    <!-- Panel - higher z-index than backdrop -->
    <aside class="fixed top-0 bottom-0 right-0 z-[320] w-[320px] max-w-[88%] bg-white shadow-2xl flex flex-col"
           transition:fly={{ x: 320, duration: 220, easing: quintOut }}>
      <div class="px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-emerald-500">Peserta</p>
          <h3 class="text-base font-black text-slate-800">{totalParticipants} di rapat</h3>
        </div>
        <button onclick={() => showParticipantsPanel = false} class="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </div>
      <!-- Tambahkan orang section -->
      <div class="px-4 pt-3 pb-2">
        <div class="rounded-3xl border-2 border-slate-100 bg-slate-50/60 p-3 space-y-3">
          <div class="flex items-center gap-2 px-1">
            <UserPlus size={14} class="text-emerald-600" />
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Undang Peserta</p>
          </div>

          <div class="relative">
            <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" bind:value={inviteSearch} placeholder="Cari kontak..."
                   class="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400" />
          </div>

          {#if isLoadingContacts}
            <div class="flex items-center justify-center py-4">
              <div class="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          {:else if contactsError}
            <div class="text-center py-3">
              <p class="text-xs text-red-500 font-bold">{contactsError}</p>
              <button onclick={() => { isLoadingContacts = true; contactsError = null; supabase.from('profiles').select('*').then(({ data, error }) => { if (error) { contactsError = 'Gagal memuat kontak'; } else if (data) { allProfiles = data; } isLoadingContacts = false; }) }}
                      class="mt-1 text-[10px] text-emerald-600 font-bold underline">Coba lagi</button>
            </div>
          {:else if filteredContacts.length === 0}
            <div class="text-center py-3">
              <p class="text-xs text-slate-400 font-bold">{inviteSearch ? 'Kontak tidak ditemukan' : 'Semua kontak sudah di rapat'}</p>
            </div>
          {:else}
            <div class="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
              {#each filteredContacts as p (p.id)}
                <button onclick={() => toggleInvite(p.id)}
                        class="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white transition-all {selectedToInvite.has(p.id) ? 'bg-emerald-50' : ''}">
                  <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=64`}
                       alt={p.full_name} class="w-7 h-7 rounded-lg object-cover" />
                  <span class="text-xs font-bold text-slate-700 flex-1 text-left">{p.full_name}</span>
                  {#if selectedToInvite.has(p.id)}
                    <Check size={14} class="text-emerald-600" />
                  {/if}
                </button>
              {/each}
            </div>
          {/if}

          <button onclick={handleReinviteSelected} disabled={isReinviting || selectedToInvite.size === 0 || isLoadingContacts || !!contactsError}
                  class="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 disabled:opacity-50 transition-all">
            {isReinviting ? 'Mengirim...' : `Undang (${selectedToInvite.size})`}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar px-3 pt-1 pb-3 space-y-1">
        <p class="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Di Rapat</p>
        {#each tiles as tile (tile.id)}
          <div class="group flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0">
              <span class="text-xs font-black text-emerald-700">{initials(tile.name)}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-black text-slate-800 truncate">{tile.name}</p>
              <div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                {#if tile.isLocal && isMuted}
                  <span class="flex items-center gap-1 text-red-500"><MicOff size={10} />Mic mati</span>
                {:else}
                  <span class="flex items-center gap-1 text-emerald-500"><Mic size={10} />Mic aktif</span>
                {/if}
                {#if tile.isLocal && isCameraOff}
                  <span class="flex items-center gap-1 text-red-500"><VideoOff size={10} />Cam mati</span>
                {/if}
              </div>
            </div>
            {#if raisedSet.has(tile.id)}
              <div class="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <Hand size={14} class="text-white" />
              </div>
            {/if}
            {#if !tile.isLocal}
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick={() => { pinTile(tile.id); showParticipantsPanel = false }} title="Sematkan"
                        class="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors cursor-pointer">
                  <Pin size={14} />
                </button>
                {#if isHost}
                  <button onclick={() => { if(confirm(`Matikan mic ${tile.name}?`)) callService.muteRemote(tile.id) }} title="Mute Peserta"
                          class="p-1.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer">
                    <MicOff size={14} />
                  </button>
                  <button onclick={() => { if(confirm(`Keluarkan ${tile.name}?`)) callService.kickRemote(tile.id) }} title="Keluarkan Peserta"
                          class="p-1.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer">
                    <X size={14} />
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </aside>
  {/if}
</div>

<style>
  .reaction-bubble {
    position: absolute;
    bottom: 140px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    animation: floatUp 3s ease-out forwards;
  }
  @keyframes floatUp {
    0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
    15% { transform: translate(-50%, -20px) scale(1.1); opacity: 1; }
    100% { transform: translate(-50%, -260px) scale(0.9); opacity: 0; }
  }
  :global(.custom-scrollbar::-webkit-scrollbar) { width: 5px; height: 5px; }
  :global(.custom-scrollbar::-webkit-scrollbar-track) { background: transparent; }
  :global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: #e2e8f0; border-radius: 10px; }
</style>
