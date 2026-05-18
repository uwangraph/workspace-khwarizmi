<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'
  import { chatService } from '$lib/services/chatService'
  import { supabase } from '$lib/supabase'
  import type { Profile } from '$lib/type'
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte'
  import { MessageSquare, Search, Plus, Hash } from 'lucide-svelte'
  import toast from 'svelte-french-toast'
  import { globalRooms, isChatLoaded, initGlobalChat, refreshGlobalChat, isRealtimeConnected } from '$lib/stores/globalChatStore'

  let user: any = $state(null)
  let profile = $state<Profile | null>(null)
  let showNewChatModal = $state(false)
  let searchQuery = $state('')
  let isLoading = $derived(!$isChatLoaded)
  let pollTimer: any

  let filteredRooms = $derived(
    $globalRooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  onMount(async () => {
    const authUser = await authService.getUser()
    if (!authUser) { goto('/auth'); return }
    user = authUser
    const profileResult = await authService.getProfile(authUser.id)
    profile = profileResult.data

    try {
      if (!$isChatLoaded) {
        await initGlobalChat(authUser.id)
      } else {
        await refreshGlobalChat(authUser.id)
      }
    } catch (err: any) {
      console.error('[Chat] Load error:', err)
      toast.error('Gagal memuat obrolan')
    }

    // Polling fallback: refresh setiap 15 detik jika realtime belum connect
    pollTimer = setInterval(async () => {
      if (!$isRealtimeConnected) {
        await refreshGlobalChat(authUser.id)
      }
    }, 15000)
  })

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer)
  })

  function openRoom(room: any) {
    goto(`/chat/${room.id}`)
  }

  async function handleNewChat(selectedUsers: Profile[], groupName?: string) {
    showNewChatModal = false
    try {
      if (groupName) {
        const participantIds = selectedUsers.map(u => u.id)
        const newRoom = await chatService.createGroup(groupName, user.id, participantIds)
        toast.success(`Grup "${groupName}" berhasil dibuat!`)
        goto(`/chat/${newRoom.id}`)
      } else {
        const selectedUser = selectedUsers[0]
        const newRoom = await chatService.getOrCreateDirectMessage(user.id, selectedUser.id)
        newRoom.name = selectedUser.full_name
        ;(newRoom as any).partner_avatar = selectedUser.avatar_url
        goto(`/chat/${newRoom.id}`)
      }
    } catch (err: any) {
      toast.error('Gagal membuat obrolan')
    } finally {
      isLoading = false
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function getRoomPreview(room: any) {
    if (!room.last_message) return 'Belum ada pesan'
    const senderName =
      room.type === 'group' && room.last_message?.sender?.full_name
        ? `${room.last_message.sender.full_name}: `
        : ''

    if (room.last_message.type === 'text') {
      return `${senderName}${room.last_message.content || ''}`
    }
    if (room.last_message.type === 'image') return `${senderName}Foto`
    if (room.last_message.type === 'audio') return `${senderName}Pesan suara`
    if (room.last_message.type === 'file') return `${senderName}Berkas`
    if (room.last_message.type === 'poll') return `${senderName}Polling: ${room.last_message.content}`
    return `${senderName}Pesan baru`
  }
</script>

<svelte:head>
  <title>Obrolan — Khwarizmi Workspace</title>
</svelte:head>

<div class="flex flex-col bg-[#FFF9F0]/30 min-h-screen pb-28">
  <!-- Header -->
  <div class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
    <h1 class="text-xl font-black text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan</h1>
    <button onclick={() => showNewChatModal = true}
            class="w-11 h-11 rounded-[20px] bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 border-2 border-b-[6px] border-orange-700 shadow-sm active:translate-y-0.5 transition-all cursor-pointer">
      <Plus size={22} strokeWidth={3} />
    </button>
  </div>

  <!-- Search -->
  <div class="px-4 py-4">
    <div class="relative">
      <svg class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input type="text" bind:value={searchQuery} placeholder="Cari pesan atau kontak..."
             class="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
    </div>
  </div>

  <!-- Room List -->
  {#if isLoading}
    <div class="flex-1 flex flex-col items-center justify-center py-24 gap-3">
      <div class="w-8 h-8 border-[4px] border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
      <p class="text-xs font-black text-slate-400">Memuat obrolan...</p>
    </div>
  {:else if filteredRooms.length === 0}
    <div class="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
      <div class="w-16 h-16 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] flex items-center justify-center mb-4 text-slate-400 shadow-sm">
        <MessageSquare size={28} strokeWidth={2.5} />
      </div>
      <p class="text-base font-extrabold text-slate-800 mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
        {searchQuery ? 'Tidak ditemukan' : 'Belum ada obrolan'}
      </p>
      <p class="text-xs font-bold text-slate-400 leading-relaxed">
        {searchQuery ? 'Coba kata kunci lain' : 'Mulai chat dengan rekan tim atau buat grup proyek baru.'}
      </p>
      {#if !searchQuery}
        <button onclick={() => showNewChatModal = true}
                class="mt-6 px-6 py-3.5 bg-orange-500 text-white text-xs font-black rounded-2xl border-2 border-b-[6px] border-orange-700 shadow-md hover:bg-orange-600 active:translate-y-0.5 transition-all cursor-pointer">
          + Mulai Obrolan
        </button>
      {/if}
    </div>
  {:else}
    <div class="flex-1 flex flex-col gap-3 px-4 py-2">
      {#each filteredRooms as room}
        <button onclick={() => openRoom(room)}
                class="w-full flex items-center gap-4 bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] border-slate-200 shadow-sm transition-all hover:border-slate-300 active:translate-y-0.5 active:border-b-[3px] text-left cursor-pointer">
          
          {#if room.type === 'group'}
            {#if room.avatar_url}
              <img src={room.avatar_url} alt={room.name} class="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-sm border border-slate-100 bg-slate-50" />
            {:else}
              <div class="w-14 h-14 rounded-2xl bg-orange-100 text-orange-500 border border-orange-200 flex items-center justify-center shrink-0 shadow-inner">
                <Hash size={24} strokeWidth={3} />
              </div>
            {/if}
          {:else}
            <img src={room.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name || 'U')}&background=random&color=fff&size=80`}
                 alt={room.name} class="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-sm border border-slate-100 bg-slate-50" />
          {/if}

          <div class="flex-1 min-w-0 my-auto">
            <div class="flex justify-between items-center mb-1">
              <h3 class="text-base font-extrabold text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{room.name || 'Obrolan'}</h3>
              <span class="text-[11px] font-bold text-slate-400 shrink-0 ml-2">{formatTime(room.updated_at || room.created_at)}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs {room.unread_count > 0 ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-bold'} truncate leading-tight flex-1">
                {getRoomPreview(room)}
              </p>
              {#if room.unread_count > 0}
                <div class="min-w-[22px] h-[22px] px-1.5 bg-orange-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white shrink-0 animate-bounce">
                  {room.unread_count > 99 ? '99+' : room.unread_count}
                </div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if showNewChatModal}
  <NewChatModal
    onClose={() => showNewChatModal = false}
    onSubmit={handleNewChat}
  />
{/if}
