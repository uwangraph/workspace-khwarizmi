<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import { authService } from '$lib/services/authService'
  import { chatService } from '$lib/services/chatService'
  import type { Profile, ChatRoom, ChatMessage } from '$lib/type'
  import AppHeader from '$lib/components/shared/AppHeader.svelte'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte'
  import { MessageSquare, Search, Plus, Send, Paperclip, Mic, Image as ImageIcon, Users, Hash } from 'lucide-svelte'
  import toast from 'svelte-french-toast'

  let user: any = $state(null)
  let profile = $state<Profile | null>(null)
  let isLoading = $state(true)

  // Data Chat
  let rooms = $state<ChatRoom[]>([])
  let activeRoom = $state<ChatRoom | null>(null)
  let messages = $state<ChatMessage[]>([])
  
  // Input
  let newMessage = $state('')
  let isSending = $state(false)
  let subscription: any

  // Modals
  let showNewChatModal = $state(false)

  async function loadInitialData() {
    isLoading = true
    try {
      const authUser = await authService.getUser()
      if (!authUser) {
        window.location.href = '/auth'
        return
      }
      user = authUser
      const profileResult = await authService.getProfile(authUser.id)
      profile = profileResult.data

      // Load Rooms
      rooms = await chatService.getRooms(user.id)
      
      // Auto-select first room if exists
      if (rooms.length > 0) {
        await selectRoom(rooms[0])
      }
    } catch (err: any) {
      console.error('[Chat] Load error:', err)
      toast.error('Gagal memuat obrolan')
    } finally {
      isLoading = false
    }
  }

  async function selectRoom(room: ChatRoom) {
    activeRoom = room
    messages = []
    
    // Unsubscribe previous room if any
    if (subscription) {
      subscription.unsubscribe()
    }

    try {
      messages = await chatService.getMessages(room.id)
      
      // Subscribe to new messages
      subscription = chatService.subscribeToMessages(room.id, (payload) => {
        const newMsg = payload.new as ChatMessage
        // We only add it if it's not from us (to avoid duplicate from optimistic UI)
        if (newMsg.sender_id !== user.id) {
          // Ideally fetch profile for sender here, or trust the UI design
          messages = [...messages, newMsg]
          scrollToBottom()
        }
      })
      scrollToBottom()
    } catch (err: any) {
      toast.error('Gagal memuat pesan')
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !activeRoom || !user) return
    
    const content = newMessage.trim()
    newMessage = '' // Clear input immediately for snappy feel
    isSending = true

    try {
      const msg = await chatService.sendTextMessage(activeRoom.id, user.id, content)
      msg.sender = profile! // Optimistic append
      messages = [...messages, msg]
      scrollToBottom()
    } catch (err: any) {
      toast.error('Gagal mengirim pesan')
      newMessage = content // Restore input
    } finally {
      isSending = false
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('messages-container')
      if (container) container.scrollTop = container.scrollHeight
    }, 100)
  }

  async function handleNewChat(selectedUsers: Profile[], groupName?: string) {
    showNewChatModal = false
    isLoading = true
    try {
      if (groupName) {
        // Group Mode
        const participantIds = selectedUsers.map(u => u.id)
        const newRoom = await chatService.createGroup(groupName, user.id, participantIds)
        rooms = [newRoom, ...rooms]
        await selectRoom(newRoom)
        toast.success(`Grup ${groupName} berhasil dibuat!`)
      } else {
        // DM Mode
        const selectedUser = selectedUsers[0]
        const newRoom = await chatService.getOrCreateDirectMessage(user.id, selectedUser.id)
        
        // Cek apakah room ini sudah ada di state `rooms`
        const exists = rooms.find(r => r.id === newRoom.id)
        if (!exists) {
          // Namanya sementara di-override dengan nama teman chatnya
          newRoom.name = selectedUser.full_name
          rooms = [newRoom, ...rooms]
        } else {
          // Override name untuk display UI saja (karena di DB null)
          exists.name = selectedUser.full_name
        }
        
        await selectRoom(exists || newRoom)
      }
    } catch (err: any) {
      toast.error('Gagal membuat obrolan')
    } finally {
      isLoading = false
    }
  }

  onMount(loadInitialData)
  onDestroy(() => {
    if (subscription) subscription.unsubscribe()
  })

  // Format Date
  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
</script>

<svelte:head>
  <title>Obrolan — Workspace Khwarizmi</title>
</svelte:head>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden pb-[72px]">
  
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <LoadingSpinner message="Menghubungkan ke server chat..." />
    </div>
  {:else}
    <!-- SIDEBAR (ROOMS LIST) -->
    {#if !activeRoom}
      <div class="w-full bg-white flex flex-col h-full">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between">
        <h1 class="text-xl font-bold text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan</h1>
        <button onclick={() => showNewChatModal = true} class="w-8 h-8 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors">
          <Plus size={18} />
        </button>
      </div>

      <div class="p-3">
        <div class="relative">
          <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari pesan atau kontak..." 
                 class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400" />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        {#each rooms as room}
          <button onclick={() => selectRoom(room)} 
                  class="w-full flex items-center gap-3 p-3 rounded-xl transition-all {activeRoom?.id === room.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'} text-left">
            
            {#if room.type === 'group'}
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-orange-100 text-orange-500">
                <Hash size={18} strokeWidth={2.5} />
              </div>
            {:else}
              <img 
                src={room.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name || 'U')}&background=random&color=fff&size=80`}
                alt={room.name}
                class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm bg-slate-100"
              />
            {/if}

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-0.5">
                <h3 class="text-sm font-bold text-slate-800 truncate">{room.name || 'Obrolan'}</h3>
                <span class="text-[9px] font-bold text-slate-400">{formatTime(room.created_at)}</span>
              </div>
              <p class="text-xs text-slate-500 truncate font-medium">
                {room.type === 'group' ? 'Grup Proyek' : 'Pesan Langsung'}
              </p>
            </div>
          </button>
        {/each}
        {#if rooms.length === 0}
          <div class="text-center p-6 mt-10">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <MessageSquare size={24} />
            </div>
            <p class="text-sm font-bold text-slate-600 mb-1">Belum ada obrolan</p>
            <p class="text-xs text-slate-400">Mulai chat dengan rekan tim atau buat grup proyek baru.</p>
          </div>
        {/if}
      </div>
      
      <!-- Back to Dashboard -->
      <div class="p-4 border-t border-slate-100 mb-safe">
        <a href="/" class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors">
          Kembali ke Beranda
        </a>
      </div>
    </div>
    {/if}

    <!-- MAIN CHAT AREA -->
    {#if activeRoom}
      <div class="flex-1 flex flex-col bg-[#F8FAFC] relative h-full">
        <!-- Chat Header -->
        <div class="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-4 justify-between z-10 shrink-0">
          <div class="flex items-center gap-3">
            <button onclick={() => activeRoom = null} class="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>

            {#if activeRoom.type === 'group'}
              <div class="w-9 h-9 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                <Hash size={16} strokeWidth={3} />
              </div>
            {:else}
              <img 
                src={activeRoom.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRoom.name || 'U')}&background=random&color=fff&size=80`}
                alt={activeRoom.name}
                class="w-9 h-9 rounded-full object-cover shadow-sm bg-slate-100"
              />
            {/if}

            <div>
              <h2 class="text-sm font-bold text-slate-800">{activeRoom.name || 'Obrolan'}</h2>
              <p class="text-[10px] font-medium text-emerald-500">{activeRoom.type === 'group' ? 'Grup Proyek' : 'Pesan Langsung'}</p>
            </div>
          </div>
        </div>

        <!-- Messages Area -->
        <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="text-center my-6">
            <span class="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400">Awal Obrolan</span>
          </div>

          {#each messages as msg}
            {@const isMe = msg.sender_id === user.id}
            <div class="flex {isMe ? 'justify-end' : 'justify-start'} w-full" transition:fade={{ duration: 150 }}>
              <div class="flex max-w-[85%] md:max-w-[70%] gap-2 {isMe ? 'flex-row-reverse' : 'flex-row'} items-end">
                
                {#if !isMe}
                  <img src={msg.sender?.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender?.full_name || 'User'}&background=random`} 
                       alt="Avatar" class="w-7 h-7 rounded-full object-cover shrink-0 mb-1 shadow-sm" />
                {/if}

                <div class="flex flex-col {isMe ? 'items-end' : 'items-start'}">
                  {#if !isMe && activeRoom.type === 'group'}
                    <span class="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.sender?.full_name || 'Unknown User'}</span>
                  {/if}

                  <div class="px-4 py-2.5 rounded-2xl shadow-sm text-[13px] leading-relaxed
                              {isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm'}">
                    
                    {#if msg.type === 'text'}
                      {msg.content}
                    {:else if msg.type === 'image'}
                      <div class="rounded-xl overflow-hidden mb-1">
                        <img src={msg.metadata?.url} alt="Shared Image" class="max-w-full rounded-lg" />
                      </div>
                      {#if msg.content}<p class="mt-1">{msg.content}</p>{/if}
                    {:else if msg.type === 'audio'}
                      <div class="flex items-center gap-2 bg-black/10 rounded-full px-3 py-1.5">
                        <button class="w-6 h-6 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0">
                          <svg class="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <div class="w-24 h-1 bg-white/30 rounded-full relative"><div class="absolute left-0 top-0 bottom-0 w-1/3 bg-white rounded-full"></div></div>
                        <span class="text-[10px] font-bold">{msg.metadata?.duration || '0:00'}</span>
                      </div>
                    {:else if msg.type === 'file'}
                      <a href={msg.metadata?.url} target="_blank" class="flex items-center gap-3 p-2 rounded-xl bg-black/5 hover:bg-black/10 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600"><Paperclip size={14} /></div>
                        <div>
                          <p class="font-bold text-xs line-clamp-1">{msg.content}</p>
                          <p class="text-[9px] opacity-70">{(msg.metadata?.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </a>
                    {/if}

                  </div>
                  <span class="text-[9px] font-medium text-slate-400 mt-1 {isMe ? 'mr-1' : 'ml-1'}">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Chat Input Area -->
        <div class="p-3 bg-white border-t border-slate-200">
          <form onsubmit={(e) => { e.preventDefault(); handleSendMessage() }} class="flex items-end gap-2">
            
            <div class="flex gap-1 pb-1 shrink-0">
              <button type="button" class="w-9 h-9 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors">
                <Paperclip size={18} />
              </button>
              <button type="button" class="w-9 h-9 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors">
                <ImageIcon size={18} />
              </button>
            </div>

            <div class="flex-1 bg-slate-50 border border-slate-200 rounded-3xl flex items-center px-1 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input type="text" bind:value={newMessage} placeholder="Ketik pesan..." 
                     class="flex-1 bg-transparent px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
              <button type="button" class="w-8 h-8 rounded-full text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 flex items-center justify-center transition-colors mr-1">
                <Mic size={18} />
              </button>
            </div>

            <button type="submit" disabled={!newMessage.trim() || isSending}
                    class="w-12 h-12 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-md shadow-indigo-200">
              <Send size={18} class="ml-1" />
            </button>
          </form>
        </div>
      </div>
    {/if}
  {/if}

  {#if showNewChatModal}
    <NewChatModal 
      onClose={() => showNewChatModal = false} 
      onSubmit={handleNewChat} 
    />
  {/if}
</div>
