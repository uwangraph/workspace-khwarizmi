<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'
  import { chatService } from '$lib/services/chatService'
  import type { Profile } from '$lib/type'
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte'
  import { MessageSquare, Search, Plus, Hash } from 'lucide-svelte'
  import toast from 'svelte-french-toast'

  let user: any = $state(null)
  let profile = $state<Profile | null>(null)
  let rooms = $state<any[]>([])
  let isLoading = $state(true)
  let showNewChatModal = $state(false)
  let searchQuery = $state('')

  let filteredRooms = $derived(
    rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  onMount(async () => {
    const authUser = await authService.getUser()
    if (!authUser) { goto('/auth'); return }
    user = authUser
    const profileResult = await authService.getProfile(authUser.id)
    profile = profileResult.data

    try {
      rooms = await chatService.getRooms(authUser.id)
    } catch (err: any) {
      console.error('[Chat] Load error:', err)
      toast.error('Gagal memuat obrolan')
    } finally {
      isLoading = false
    }
  })

  async function handleNewChat(selectedUsers: Profile[], groupName?: string) {
    showNewChatModal = false
    isLoading = true
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
        newRoom.partner_avatar = selectedUser.avatar_url
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
</script>

<svelte:head>
  <title>Obrolan — Workspace Khwarizmi</title>
</svelte:head>

<div class="flex flex-col bg-white min-h-screen pb-24">
  <!-- Header -->
  <div class="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
    <h1 class="text-xl font-bold text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan</h1>
    <button onclick={() => showNewChatModal = true}
            class="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
      <Plus size={18} />
    </button>
  </div>

  <!-- Search -->
  <div class="px-4 py-3">
    <div class="relative">
      <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input type="text" bind:value={searchQuery} placeholder="Cari pesan atau kontak..."
             class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400" />
    </div>
  </div>

  <!-- Room List -->
  {#if isLoading}
    <div class="flex-1 flex flex-col items-center justify-center py-24 gap-3">
      <div class="w-7 h-7 border-[3px] border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
      <p class="text-xs font-bold text-slate-400">Memuat obrolan...</p>
    </div>
  {:else if filteredRooms.length === 0}
    <div class="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
      <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
        <MessageSquare size={26} />
      </div>
      <p class="text-sm font-bold text-slate-600 mb-1">
        {searchQuery ? 'Tidak ditemukan' : 'Belum ada obrolan'}
      </p>
      <p class="text-xs text-slate-400 leading-relaxed">
        {searchQuery ? 'Coba kata kunci lain' : 'Mulai chat dengan rekan tim atau buat grup proyek baru.'}
      </p>
      {#if !searchQuery}
        <button onclick={() => showNewChatModal = true}
                class="mt-5 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">
          + Mulai Obrolan
        </button>
      {/if}
    </div>
  {:else}
    <div class="flex-1 divide-y divide-slate-50">
      {#each filteredRooms as room}
        <button onclick={() => goto(`/chat/${room.id}`)}
                class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
          
          {#if room.type === 'group'}
            {#if room.avatar_url}
              <img src={room.avatar_url} alt={room.name} class="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm bg-slate-100" />
            {:else}
              <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                <Hash size={20} strokeWidth={2.5} />
              </div>
            {/if}
          {:else}
            <img src={room.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name || 'U')}&background=random&color=fff&size=80`}
                 alt={room.name} class="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm bg-slate-100" />
          {/if}

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center mb-0.5">
              <h3 class="text-sm font-bold text-slate-800 truncate">{room.name || 'Obrolan'}</h3>
              <span class="text-[10px] font-semibold text-slate-400 shrink-0 ml-2">{formatTime(room.updated_at || room.created_at)}</span>
            </div>
            <p class="text-[11px] text-slate-500 truncate leading-tight">
              {#if room.last_message}
                {#if room.last_message.type === 'text'}
                  {room.last_message.content}
                {:else if room.last_message.type === 'image'}
                  <span class="flex items-center gap-1">📷 Foto</span>
                {:else if room.last_message.type === 'audio'}
                  <span class="flex items-center gap-1">🎤 Pesan suara</span>
                {:else if room.last_message.type === 'file'}
                  <span class="flex items-center gap-1">📎 Berkas</span>
                {:else if room.last_message.type === 'poll'}
                  <span class="flex items-center gap-1">📊 Polling: {room.last_message.content}</span>
                {/if}
              {:else}
                <span class="italic text-slate-400">Belum ada pesan</span>
              {/if}
            </p>
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
