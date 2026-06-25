<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'
  import { chatService } from '$lib/services/chatService'
  import { notificationService } from '$lib/services/notificationService'
  import { supabase } from '$lib/supabase'
  import type { Profile, ChatRoom, ChatMessage } from '$lib/type'
  import { callService } from '$lib/services/callService'
  import { callState } from '$lib/stores/callStore'
  import AppHeader from '$lib/components/shared/AppHeader.svelte'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte'
  import PollModal from '$lib/components/chat/PollModal.svelte'
  import ConfirmModal from '$lib/components/shared/ConfirmModal.svelte'
  import ChatBubble from '$lib/components/chat/ChatBubble.svelte'
  import ChatHeader from '$lib/components/chat/ChatHeader.svelte'
  import ChatInput from '$lib/components/chat/ChatInput.svelte'
  import RoomInfo from '$lib/components/chat/RoomInfo.svelte'
  import ForwardModal from '$lib/components/chat/ForwardModal.svelte'
  import { markRoomAsRead } from '$lib/stores/chatReadStore'
  import { X, Star, Forward, Trash2, Pin, ArrowDown } from 'lucide-svelte'
  import toast from 'svelte-french-toast'

  const roomId = $derived($page.params.room_id ?? '')

  let user: any = $state(null)
  let profile = $state<Profile | null>(null)
  let activeRoom = $state<ChatRoom | null>(null)
  let showClearChatModal = $state(false)
  let activeRoomDetails = $state<any>(null)
  let messages = $state<ChatMessage[]>([])
  let myClearedAt = $state<string | null>(null)
  let isLoading = $state(true)
  let subscription: any
  let typingSubscription: any
  let partnerStatusChannel: any
  let partnerReadChannel: any
  let initialLastReadAt = $state<string | null>(null)
  let initialUnreadCount = $state(0)
  let partnerLastReadAt = $state<string | null>(null)
  
  let firstUnreadIndex = $derived.by(() => {
    if (initialUnreadCount <= 0) return -1;
    return Math.max(0, filteredMessages.length - initialUnreadCount);
  });

  let isAtBottom = $state(true);
  let unreadBottomCount = $state(0);

  // Input
  let newMessage = $state('')
  let isSending = $state(false)

  // File / Image upload
  let fileInputRef = $state<HTMLInputElement | null>(null)
  let imageInputRef = $state<HTMLInputElement | null>(null)
  let isUploadingMedia = $state(false)
  let wallpaperInputRef = $state<HTMLInputElement | null>(null)
  let colorInputRef = $state<HTMLInputElement | null>(null)
  let customWallpaperUrl = $state<string | null>(null)
  let customBgColor = $state('#f8fafc')

  // Voice Note
  let isRecording = $state(false)
  let mediaRecorder = $state<MediaRecorder | null>(null)
  let audioChunks = $state<Blob[]>([])
  let recordingSeconds = $state(0)
  let recordingWaveform = $state<number[]>([])
  let recordingTimer: any
  
  // Polling
  let showPollModal = $state(false)
  let pollVotes = $state<Record<string, any[]>>({})

  // Media Pending (WhatsApp style)
  let pendingFiles = $state<{ file: File, previewUrl: string, type: 'image' | 'file' }[]>([])
  
  // Lightbox & Delete
  let selectedImageUrl = $state<string | null>(null)
  let isDeletingId = $state<string | null>(null)
  let showDeleteConfirm = $state(false)
  let messageIdToDelete = $state<string | null>(null)

  // Voice Note Playback
  let playingId = $state<string | null>(null)
  let audioPlayer = $state<HTMLAudioElement | null>(null)
  let audioProgress = $state(0)

  // Context Menu & Features
  let activeMenuId = $state<string | null>(null)
  let replyingTo = $state<ChatMessage | null>(null)
  let editingMessage = $state<ChatMessage | null>(null)
  let pressTimer: any
  let partnerProfile = $state<Profile | null>(null)
  let typingUsers = $state<Set<string>>(new Set())
  let isTyping = $state(false)
  let typingTimeout: any
  
  // Search
  let isSearching = $state(false)
  let searchQuery = $state('')
  let filteredMessages = $derived(
    searchQuery.trim() === '' 
      ? messages 
      : messages.filter(m => m.type === 'text' && m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Wallpaper
  let selectedWallpaper = $state('none')
  let showWallpaperMenu = $state(false)
  const wallpapers = [
    { id: 'none', name: 'Polos', class: '' },
    { id: 'emerald', name: 'Emerald Soft', class: 'wp-emerald' },
    { id: 'sunset', name: 'Warm Sunset', class: 'wp-sunset' },
    { id: 'midnight', name: 'Midnight Glow', class: 'wp-midnight' },
    { id: 'lavender', name: 'Lavender Mist', class: 'wp-lavender' },
    { id: 'color', name: 'Pilih Warna...', class: '' },
    { id: 'custom', name: 'Unggah Foto...', class: 'wp-custom' }
  ]

  // Gallery & Sidebar
  let showSidebar = $state(false)
  let pinnedMessage = $state<ChatMessage | null>(null)
  let chatImages = $derived(messages.filter(m => m.type === 'image' || m.type === 'audio'))
  let chatFiles = $derived(messages.filter(m => m.type === 'file'))

  // Multi-select & Features
  let isSelectMode = $state(false)
  let selectedMessageIds = $state<string[]>([])
  let starredMessages = $state<string[]>([])
  let showMessageInfo = $state<ChatMessage | null>(null)
  let showForwardModal = $state<ChatMessage | null>(null)
  let userRooms = $state<ChatRoom[]>([])
  let otherRooms = $derived(userRooms.filter(r => r.id !== roomId))
  
  // Forward Feature States
  let forwardSearchQuery = $state('')
  let selectedForwardIds = $state<string[]>([]) 
  let allProfiles = $state<Profile[]>([])
  let isSearchingProfiles = $state(false)
  let statusInterval: any
  let participantIds = $state<string[]>([])
  let groupMemberNames = $derived(
    activeRoom?.type === 'group' && allProfiles.length > 0 && participantIds.length > 0
      ? (() => {
          const names = allProfiles
            .filter(p => participantIds.includes(p.id) && p.id !== user?.id)
            .map(p => p.full_name.split(' ')[0])
          if (names.length === 0) return 'Grup'
          if (names.length <= 3) return names.join(', ')
          return names.slice(0, 2).join(', ') + ` +${names.length - 2} lainnya`
        })()
      : ''
  )

  async function handleVideoCall() {
    await startChatCall(false)
  }

  async function handleVoiceCall() {
    await startChatCall(true)
  }

  async function handleClearChat() {
    showClearChatModal = true
  }

  async function performClearChat() {
    try {
      // Simpan cleared_at di chat_participants — pesan lama tidak dihapus dari DB,
      // hanya disembunyikan dari tampilan user ini saja
      myClearedAt = await chatService.clearChatForUser(roomId, user.id)
      messages = []
      toast.success('Chat berhasil dibersihkan')
    } catch (e) {
      console.error('[ClearChat] Error:', e)
      toast.error('Gagal membersihkan chat: ' + (e as any).message)
    }
  }

  async function startChatCall(voiceOnly: boolean) {
    if (!user || !activeRoom || !profile) return
    const ids = activeRoom.type === 'group'
      ? participantIds
      : [user.id, ...(partnerProfile ? [partnerProfile.id] : [])]
    try {
      await callService.getLocalStream(!voiceOnly, true)
    } catch {
      toast.error(voiceOnly ? 'Izin mikrofon diperlukan' : 'Izin kamera/mikrofon diperlukan')
      return
    }
    try {
      await callService.startCall(
        roomId, activeRoom.name ?? 'Panggilan',
        user.id, profile.full_name, ids,
        { kind: 'call', voiceOnly, callerAvatar: profile.avatar_url ?? undefined }
      )
    } catch (e) {
      console.error('Failed to start call:', e)
      toast.error('Gagal memulai panggilan')
    }
  }

  onDestroy(() => {
    callState.update(s => (s.status === 'calling' || s.status === 'ongoing' ? { ...s, isMinimized: true } : s))

    if (statusInterval) clearInterval(statusInterval)
    if (partnerStatusChannel) supabase.removeChannel(partnerStatusChannel)
    if (partnerReadChannel) supabase.removeChannel(partnerReadChannel)
    typingSubscription?.unsubscribe?.()
    if (user?.id) chatService.markMessagesAsRead(roomId, user.id)
  })

  let filteredProfiles = $derived(
    forwardSearchQuery.trim() === '' 
      ? [] 
      : allProfiles.filter(p => 
          p.id !== user?.id && 
          p.full_name.toLowerCase().includes(forwardSearchQuery.toLowerCase())
        )
  )

  async function toggleStar(msg: ChatMessage) {
    const isStarred = starredMessages.includes(msg.id)
    const newMetadata = { ...msg.metadata, is_starred: !isStarred }
    if (isStarred) starredMessages = starredMessages.filter(id => id !== msg.id)
    else starredMessages = [...starredMessages, msg.id]
    try {
      await chatService.updateMessageMetadata(msg.id, newMetadata)
      msg.metadata = newMetadata
    } catch { toast.error('Gagal memproses bintang') }
  }

  async function handleSendMessage() {
    if (editingMessage) {
      await handleEditSubmit()
      return
    }
    if (pendingFiles.length > 0) {
      await uploadMedia()
      if (newMessage.trim()) await performSendText()
      return
    }
    if (!newMessage.trim() || !user) return
    await performSendText()
  }

  async function performSendText() {
    const content = newMessage.trim()
    newMessage = ''
    isSending = true
    try {
      const msg = await chatService.sendTextMessage(roomId, user.id, content, {
        reply_to: replyingTo?.id,
        reply_name: replyingTo?.sender?.full_name,
        reply_content: replyingTo?.content
      })
      msg.sender = profile!
      messages = [...messages, msg]
      replyingTo = null
      scrollToBottom()

      // Kirim push notification ke peserta lain
      const otherIds = activeRoom?.type === 'direct'
        ? (partnerProfile ? [partnerProfile.id] : [])
        : participantIds.filter(id => id !== user.id)
      if (otherIds.length > 0) {
        const senderName = profile?.full_name || 'Seseorang'
        const roomName = activeRoom?.name || 'Chat'
        notificationService.sendBulk(otherIds, 'chat_message', roomName, `${senderName}: ${content}`, {
          url: `/chat/${roomId}`,
          roomId,
          senderAvatarUrl: profile?.avatar_url ?? ''
        }).catch(() => {})
      }
    } catch { toast.error('Gagal mengirim pesan') }
    finally { isSending = false }
  }

  async function handleEditSubmit() {
    if (!editingMessage || !newMessage.trim()) return
    const msgId = editingMessage.id
    const content = newMessage.trim()
    editingMessage = null
    newMessage = ''
    isSending = true
    try {
      await chatService.editMessage(msgId, user.id, content)
      messages = messages.map(m => m.id === msgId ? { ...m, content, metadata: { ...m.metadata, edited: true } } : m)
      toast.success('Pesan diperbarui')
    } catch { toast.error('Gagal memperbarui pesan') }
    finally { isSending = false }
  }

  async function handleDelete() {
    const id = messageIdToDelete
    if (!id || !user) return
    showDeleteConfirm = false
    messageIdToDelete = null
    try {
      await chatService.deleteMessage(id, user.id)
      messages = messages.filter(m => m.id !== id)
    } catch { toast.error('Gagal menghapus pesan') }
  }

  function handleFileSelect(e: Event, type: 'image' | 'file') {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    for (const file of Array.from(files)) {
      const previewUrl = URL.createObjectURL(file)
      pendingFiles = [...pendingFiles, { file, previewUrl, type }]
    }
  }

  async function uploadMedia() {
    if (pendingFiles.length === 0 || !user) return
    isUploadingMedia = true
    const filesToUpload = [...pendingFiles]
    pendingFiles = []
    try {
      for (const item of filesToUpload) {
        const msg = await chatService.sendMediaMessage(roomId, user.id, item.type, item.file)
        msg.sender = profile!
        messages = [...messages, msg]
        scrollToBottom()

        const otherIds = activeRoom?.type === 'direct'
          ? (partnerProfile ? [partnerProfile.id] : [])
          : participantIds.filter(id => id !== user.id)
        if (otherIds.length > 0) {
          const senderName = profile?.full_name || 'Seseorang'
          const roomName = activeRoom?.name || 'Chat'
          const label = item.type === 'image' ? 'mengirim foto' : 'mengirim file'
          const type = item.type === 'image' ? 'chat_image' : 'chat_file'
          notificationService.sendBulk(otherIds, type, roomName, `${senderName}: ${label}`, {
            url: `/chat/${roomId}`,
            roomId,
            senderAvatarUrl: profile?.avatar_url ?? ''
          }).catch(() => {})
        }
      }
    } catch { toast.error('Gagal mengunggah media') }
    finally { isUploadingMedia = false }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunks = []
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      recorder.ondataavailable = (e) => audioChunks = [...audioChunks, e.data]
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        audioCtx.close()
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        const file = new File([blob], 'vn.webm', { type: 'audio/webm' })
        isUploadingMedia = true
        try {
          const msg = await chatService.sendMediaMessage(roomId, user.id, 'audio', file, { duration: recordingSeconds + 's' })
          msg.sender = profile!
          messages = [...messages, msg]
          scrollToBottom()

          const otherIds = activeRoom?.type === 'direct'
            ? (partnerProfile ? [partnerProfile.id] : [])
            : participantIds.filter(id => id !== user!.id)
          if (otherIds.length > 0) {
            const senderName = profile?.full_name || 'Seseorang'
            const roomName = activeRoom?.name || 'Chat'
            notificationService.sendBulk(otherIds, 'chat_voice_note', roomName, `${senderName}: mengirim voice note`, {
              url: `/chat/${roomId}`,
              roomId,
              senderAvatarUrl: profile?.avatar_url ?? ''
            }).catch(() => {})
          }
        } catch { toast.error('Gagal mengirim VN') }
        finally { isUploadingMedia = false }
      }
      mediaRecorder = recorder
      isRecording = true
      recordingSeconds = 0
      recordingWaveform = []
      recorder.start()
      recordingTimer = setInterval(() => {
        recordingSeconds++
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length
        recordingWaveform = [...recordingWaveform.slice(-29), Math.min(100, Math.max(10, (avg / 128) * 100))]
      }, 1000)
    } catch { toast.error('Izin mikrofon ditolak') }
  }

  function stopRecording() {
    if (mediaRecorder) {
      mediaRecorder.stop()
      isRecording = false
      clearInterval(recordingTimer)
    }
  }

  function toggleAudio(msgId: string, url: string) {
    if (playingId === msgId) { audioPlayer?.pause(); playingId = null }
    else {
      if (audioPlayer) audioPlayer.pause()
      playingId = msgId
      audioPlayer = new Audio(url)
      audioPlayer.onended = () => { playingId = null; audioProgress = 0 }
      audioPlayer.ontimeupdate = () => { if (audioPlayer) audioProgress = (audioPlayer.currentTime / audioPlayer.duration) * 100 }
      audioPlayer.play()
    }
  }

  async function handleVote(msgId: string, optId: string) {
    if (!user) return
    try {
      await chatService.votePoll(msgId, user.id, optId)
      pollVotes[msgId] = await chatService.getPollVotes(msgId)
    } catch { toast.error('Gagal voting') }
  }

  async function handleCreatePoll(q: string, opts: string[]) {
    if (!user) return
    showPollModal = false
    try {
      const msg = await chatService.sendPollMessage(roomId, user.id, q, opts)
      msg.sender = profile!
      messages = [...messages, msg]
      scrollToBottom()
    } catch { toast.error('Gagal membuat polling') }
  }

  function handleTyping() {
    if (!user || !activeRoom) return
    isTyping = true
    chatService.broadcastTyping(roomId, user.id, profile?.full_name || 'User', true)
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      isTyping = false
      chatService.broadcastTyping(roomId, user.id, profile?.full_name || 'User', false)
    }, 3000)
  }

  function toggleSelect(id: string) {
    if (selectedMessageIds.includes(id)) selectedMessageIds = selectedMessageIds.filter(i => i !== id)
    else selectedMessageIds = [...selectedMessageIds, id]
  }

  async function toggleReaction(msgId: string, emoji: string) {
    if (!user) return
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const reactions = msg.metadata?.reactions || {}
    if (reactions[user.id] === emoji) delete reactions[user.id]
    else reactions[user.id] = emoji
    try {
      const newMetadata = { ...msg.metadata, reactions }
      messages = messages.map(m => m.id === msgId ? { ...m, metadata: newMetadata } : m)
      chatService.broadcastMetadata(roomId, msgId, newMetadata)
      await chatService.updateMessageMetadata(msgId, newMetadata)
    } catch { toast.error('Gagal memberi reaksi') }
  }

  function toggleForwardSelection(id: string) {
    if (selectedForwardIds.includes(id)) selectedForwardIds = selectedForwardIds.filter(i => i !== id)
    else selectedForwardIds = [...selectedForwardIds, id]
  }

  async function handleForwardBulk() {
    if (!showForwardModal || !user || selectedForwardIds.length === 0) return
    const msg = showForwardModal
    const targets = [...selectedForwardIds]
    showForwardModal = null
    selectedForwardIds = []
    forwardSearchQuery = ''
    const t = toast.loading(`Meneruskan ke ${targets.length}...`)
    try {
      for (const id of targets) {
        const isRoom = userRooms.some(r => r.id === id)
        let tId = id
        if (!isRoom) {
          const nr = await chatService.getOrCreateDirectMessage(user.id, id)
          tId = nr.id
        }
        await chatService.forwardMessage(tId, user.id, msg)
      }
      toast.success('Berhasil meneruskan', { id: t })
    } catch { toast.error('Gagal meneruskan', { id: t }) }
  }

  async function handlePin(msg: ChatMessage) {
    activeMenuId = null
    const isPinned = pinnedMessage?.id === msg.id
    try {
      if (pinnedMessage && !isPinned) await chatService.updateMessageMetadata(pinnedMessage.id, { ...pinnedMessage.metadata, is_pinned: false })
      await chatService.updateMessageMetadata(msg.id, { ...msg.metadata, is_pinned: !isPinned })
      pinnedMessage = isPinned ? null : msg
      msg.metadata = { ...msg.metadata, is_pinned: !isPinned }
      toast.success(isPinned ? 'Pin dilepas' : 'Pin disematkan')
    } catch { toast.error('Gagal pin') }
  }

  async function openRoomInfo() {
    if (!activeRoom) return
    const t = toast.loading('Mengambil info...')
    try {
      activeRoomDetails = await chatService.getRoomDetails(roomId)
      showSidebar = true
      toast.dismiss(t)
    } catch {
      toast.error('Gagal mengambil detail grup', { id: t })
    }
  }

  onMount(() => {
    ;(async () => {
    try {
      const authUser = await authService.getUser()
      if (!authUser) { goto('/auth'); return }
      user = authUser
      
      const pr = await authService.getProfile(authUser.id)
      profile = pr.data
      
      // Ambil data room DULU sebelum ditandai sebagai dibaca
      const rooms = await chatService.getRooms(authUser.id)
      userRooms = rooms
      activeRoom = rooms.find((r: any) => r.id === roomId) || null
      
      if (activeRoom) {
        initialLastReadAt = activeRoom.last_read_at || null
        initialUnreadCount = activeRoom.unread_count || 0
        
        // Baru setelah dapet angkanya, tandai sebagai dibaca di database & store
        markRoomAsRead(roomId)
        chatService.markMessagesAsRead(roomId, authUser.id)
        
        // Hapus pembatas setelah 5 detik agar layar bersih
        if (initialUnreadCount > 0) {
          setTimeout(() => {
            initialUnreadCount = 0
          }, 5000)
        }
      }
      const savedWp = localStorage.getItem('chat_wallpaper')
      const savedColor = localStorage.getItem('chat_wallpaper_color')
      if (savedWp === 'custom') {
        const data = localStorage.getItem('chat_wallpaper_custom_data')
        if (data) { customWallpaperUrl = data; selectedWallpaper = 'custom'; }
        else { selectedWallpaper = 'none'; }
      } else if (savedWp) selectedWallpaper = savedWp
      if (savedColor) customBgColor = savedColor
      if (activeRoom?.type === 'direct') {
        const { data: part } = await supabase
          .from('chat_participants')
          .select('user_id, last_read_at')
          .eq('room_id', roomId)
          .neq('user_id', authUser.id)
          .maybeSingle()
        if (part) {
          partnerLastReadAt = part.last_read_at || null
          const { data: p } = await supabase.from('profiles').select('*').eq('id', part.user_id).maybeSingle()
          if (p) partnerProfile = p

          // Realtime subscription for partner status
          partnerStatusChannel = supabase.channel(`partner_status_${part.user_id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${part.user_id}` }, (payload) => {
              partnerProfile = payload.new as Profile
            })
            .subscribe()

          partnerReadChannel = supabase.channel(`partner_read_${roomId}_${part.user_id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_participants',
                filter: `room_id=eq.${roomId}`
              },
              (payload) => {
                const updated = payload.new as { user_id: string; last_read_at?: string | null }
                if (updated.user_id === part.user_id) {
                  partnerLastReadAt = updated.last_read_at || null
                }
              }
            )
            .subscribe()
        }
      }
      if (!activeRoom) { toast.error('Ruang chat tidak ditemukan'); goto('/chat'); return }

      // Ambil cleared_at milik user ini untuk filter pesan yang sudah dibersihkan
      const { data: myParticipant } = await supabase
        .from('chat_participants')
        .select('cleared_at')
        .eq('room_id', roomId)
        .eq('user_id', authUser.id)
        .maybeSingle()
      myClearedAt = myParticipant?.cleared_at ?? null

      const fMsgs = await chatService.getMessages(roomId, 50, undefined, myClearedAt)
      messages = fMsgs
      starredMessages = fMsgs.filter(m => m.metadata?.is_starred).map(m => m.id)
      pinnedMessage = fMsgs.find(m => m.metadata?.is_pinned) || null
      if (!pinnedMessage) {
        const { data: pm } = await supabase.from('chat_messages').select('*').eq('room_id', roomId).contains('metadata', {is_pinned: true}).maybeSingle()
        if (pm) pinnedMessage = pm as ChatMessage
      }
      const { data: profs } = await supabase.from('profiles').select('*')
      if (profs) allProfiles = (profs as Profile[]).filter(p => p.id !== authUser.id)

      if (activeRoom?.type === 'group') {
        const { data: parts } = await supabase.from('chat_participants').select('user_id').eq('room_id', roomId)
        if (parts) participantIds = parts.map((p: any) => p.user_id)
      }
      const pollMsgs = fMsgs.filter(m => m.type === 'poll')
      if (pollMsgs.length > 0) await Promise.all(pollMsgs.map(async m => { pollVotes[m.id] = await chatService.getPollVotes(m.id) }))
      
      subscription = await chatService.subscribeToMessages(roomId, (payload) => {
        if (payload.eventType === 'DELETE') messages = messages.filter(m => m.id !== payload.old.id)
        else if (payload.eventType === 'UPDATE') {
          const up = payload.new as ChatMessage
          messages = messages.map(m => m.id === up.id ? { ...m, ...up } : m)
        } else {
          const nm = payload.new as ChatMessage
          if (!messages.some(m => m.id === nm.id)) {
            const sender = nm.sender_id === authUser.id
              ? (profile ?? undefined)
              : (allProfiles.find(p => p.id === nm.sender_id) ?? undefined)
            messages = [...messages, { ...nm, sender }]
            if (nm.sender_id !== authUser.id) {
              if (isAtBottom) {
                scrollToBottom('smooth')
                chatService.markMessagesAsRead(roomId, authUser.id)
              } else {
                unreadBottomCount++
              }
            } else {
              scrollToBottom('smooth')
            }
          }
        }
      }, async (payload) => {
        const v = payload.new as any
        if (pollVotes[v.message_id]) pollVotes[v.message_id] = await chatService.getPollVotes(v.message_id)
      }, (broadcastPayload) => {
        // Fast UI sync via Custom Broadcast (reactions, pins, etc)
        const { messageId, metadata } = broadcastPayload
        messages = messages.map(m => m.id === messageId ? { ...m, metadata } : m)
        // Sync pinned message state from broadcast
        if (metadata?.is_pinned) {
          const pinnedMsg = messages.find(m => m.id === messageId)
          if (pinnedMsg) pinnedMessage = pinnedMsg
        } else if (pinnedMessage?.id === messageId && !metadata?.is_pinned) {
          pinnedMessage = null
        }
      })

      // Subscribe to pin changes via postgres_changes (UPDATE on chat_messages)
      const pinChannel = supabase.channel(`pin_${roomId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          const updated = payload.new as any
          if (updated.metadata?.is_pinned) {
            const msg = messages.find(m => m.id === updated.id)
            pinnedMessage = msg ? { ...msg, metadata: updated.metadata } : null
          } else if (pinnedMessage?.id === updated.id) {
            pinnedMessage = null
          }
        })
        .subscribe()

      typingSubscription = chatService.subscribeToTyping(roomId, ({ userId, isTyping }) => {
        if (!userId || userId === authUser.id) return
        const next = new Set(typingUsers)
        if (isTyping) next.add(userId)
        else next.delete(userId)
        typingUsers = next
      })
    } catch (e) {
      console.error('Error in chat onMount:', e)
    } finally {
      isLoading = false
      tick().then(() => scrollToBottom('auto'))
    }

    })()
    return () => {
      subscription?.unsubscribe()
      typingSubscription?.unsubscribe?.()
      if (statusInterval) clearInterval(statusInterval)
    }
  })

  function getPollResults(messageId: string, options: any[]) {
    const votes = pollVotes[messageId] || []
    const total = votes.length
    return options.map(opt => {
      const count = votes.filter(v => v.option_id === opt.id).length
      const percent = total > 0 ? (count / total) * 100 : 0
      const isSelected = votes.some(v => v.user_id === user?.id && v.option_id === opt.id)
      return { ...opt, count, percent, isSelected }
    })
  }

  function getWaveform(seed: string) {
    const bars = []
    const str = (seed || 'default').slice(-10)
    for (let i = 0; i < 30; i++) {
      const charCode = str.charCodeAt(i % str.length)
      bars.push(15 + (charCode % 25))
    }
    return bars
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    tick().then(() => {
      setTimeout(() => {
        const el = document.getElementById('msgs');
        if (el) el.scrollTo({ top: el.scrollHeight, behavior });
      }, 50);
    });
  }
  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
  function formatDateLabel(iso: string) {
    const date = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Hari Ini'
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  function scrollToMessage(id: string) { const el = document.getElementById(`msg-${id}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('highlight-msg'); setTimeout(() => el.classList.remove('highlight-msg'), 2000) } }
  function formatRecordingTime(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}` }
  function getUrlPreview(text: string) { const match = text.match(/https?:\/\/[^\s]+/); return match ? match[0] : null }
  function highlightText(text: string, q: string) { if (!q.trim()) return text; const regex = new RegExp(`(${q})`, 'gi'); return text.replace(regex, '<mark class="bg-yellow-200 text-slate-800 p-0.5 rounded">$1</mark>') }
  function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let w = img.width, h = img.height
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal membaca gambar')) }
      img.src = url
    })
  }

  function getStatusText(p: Profile | null) { 
    if (!p) return 'Offline'; 
    if (p.last_seen) { 
      const diff = Date.now() - new Date(p.last_seen).getTime(); 
      if (diff < 120000) return 'Online'; 
      return `Terakhir dilihat ${new Date(p.last_seen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` 
    } 
    return 'Offline' 
  }
  function isMessageRead(msg: ChatMessage) {
    if (msg.sender_id !== user?.id) return false
    if (!partnerLastReadAt) return false
    return new Date(partnerLastReadAt).getTime() >= new Date(msg.created_at).getTime()
  }
</script>

<div class="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans relative" 
     style="--chat-bg: {selectedWallpaper === 'color' ? customBgColor : 'transparent'};">
  
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <LoadingSpinner message="Memuat pesan..." />
    </div>
  {:else}
    <ChatHeader
      {activeRoom} {partnerProfile} {typingUsers} {wallpapers}
      memberNames={groupMemberNames}
      bind:isSearching bind:searchQuery bind:showSidebar bind:selectedWallpaper bind:customBgColor bind:showWallpaperMenu
      onWallpaperUpload={() => wallpaperInputRef?.click()}
      onColorSelect={() => colorInputRef?.click()}
      onInfo={openRoomInfo}
      onVideoCall={handleVideoCall}
      onVoiceCall={handleVoiceCall}
      onClearChat={handleClearChat}
      {getStatusText}
    />

    <ConfirmModal
      bind:show={showClearChatModal}
      title="Bersihkan Chat"
      message="Yakin ingin menghapus semua pesan di obrolan ini? Tindakan ini tidak dapat dibatalkan."
      confirmText="Ya, Bersihkan"
      type="danger"
      onConfirm={performClearChat}
    />
    <input bind:this={wallpaperInputRef} type="file" class="hidden" accept="image/*" onchange={(e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        compressImage(file, 800, 0.6).then((compressed) => {
          customWallpaperUrl = compressed
          selectedWallpaper = 'custom'
          try {
            localStorage.setItem('chat_wallpaper_custom_data', customWallpaperUrl)
            localStorage.setItem('chat_wallpaper', 'custom')
          } catch { toast.error('Gambar terlalu besar untuk disimpan') }
          showWallpaperMenu = false
        })
      }
    }} />
    <input bind:this={colorInputRef} type="color" class="hidden" bind:value={customBgColor} onchange={() => {
      selectedWallpaper = 'color'
      localStorage.setItem('chat_wallpaper_color', customBgColor)
      localStorage.setItem('chat_wallpaper', 'color')
      showWallpaperMenu = false
    }} />

    <div class="flex-1 flex overflow-hidden relative">
      <div class="flex-1 flex flex-col min-w-0 bg-white relative">
        <div class="absolute inset-0 z-0 opacity-40 pointer-events-none 
                   {selectedWallpaper === 'custom' ? '' : (wallpapers.find(w => w.id === selectedWallpaper)?.class || '')}"
             style={selectedWallpaper === 'custom' ? `background-image: url(${customWallpaperUrl}); background-size: cover; background-position: center;` : (selectedWallpaper === 'color' ? `background-color: ${customBgColor}; opacity: 1;` : '')}>
        </div>

        {#if pinnedMessage}
          <div class="absolute top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-b border-orange-100 p-3 flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <Pin size={16} class="text-orange-500 shrink-0" />
            <div class="flex-1 min-w-0 cursor-pointer" onclick={() => scrollToMessage(pinnedMessage!.id)}>
              <p class="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Pesan Disematkan</p>
              <p class="text-xs text-slate-600 truncate">{pinnedMessage.content || 'Media'}</p>
            </div>
            <button onclick={() => handlePin(pinnedMessage!)} class="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={16} /></button>
          </div>
        {/if}

        {#if !isAtBottom}
          <div class="absolute bottom-24 right-4 z-50 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {#if unreadBottomCount > 0}
              <span class="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce">{unreadBottomCount} Pesan Baru</span>
            {/if}
            <button class="p-3 bg-white text-slate-600 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] border border-slate-100 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center" 
                    onclick={() => { scrollToBottom('smooth'); unreadBottomCount = 0; }}>
              <ArrowDown size={20} strokeWidth={2.5} />
            </button>
          </div>
        {/if}

        <div id="msgs" class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar relative z-10"
             onscroll={(e) => {
               const target = e.target as HTMLElement;
               isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
               if (isAtBottom) unreadBottomCount = 0;
             }}>
          {#each filteredMessages as msg, i}
            {#if i === 0 || new Date(msg.created_at).toDateString() !== new Date(filteredMessages[i-1].created_at).toDateString()}
              <div class="flex justify-center my-8">
                <span class="px-4 py-1.5 bg-slate-100/80 backdrop-blur-sm text-[10px] font-extrabold text-slate-500 rounded-full uppercase tracking-widest border border-slate-200/50 shadow-sm">
                  {formatDateLabel(msg.created_at)}
                </span>
              </div>
            {/if}
            {#if i === firstUnreadIndex}
              <div class="flex justify-center my-6" transition:fade={{ duration: 500 }}>
                <div class="flex items-center gap-4 w-full max-w-md">
                  <div class="flex-1 h-[1px] bg-orange-100"></div>
                  <span class="px-4 py-1 bg-orange-50 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-orange-100 shadow-sm flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                    {initialUnreadCount} pesan belum terbaca
                  </span>
                  <div class="flex-1 h-[1px] bg-orange-100"></div>
                </div>
              </div>
            {/if}

            <ChatBubble 
              {msg} 
              isMe={msg.sender_id === user?.id}
              isGroup={activeRoom?.type === 'group'}
              isSelectMode={isSelectMode}
              isSelected={selectedMessageIds.includes(msg.id)}
              {searchQuery}
              {playingId}
              {audioProgress}
              {audioPlayer}
              {starredMessages}
              bind:activeMenuId
              {user}
              {partnerProfile}
              onReaction={toggleReaction}
              onReply={(m) => { replyingTo = m; newMessage = '' }}
              onStar={toggleStar}
              onPin={handlePin}
              onForward={(m) => showForwardModal = m}
              onEdit={(m) => { editingMessage = m; newMessage = m.content ?? '' }}
              onCopy={(c) => { navigator.clipboard.writeText(c); toast.success('Teks disalin') }}
              onInfo={(m) => showMessageInfo = m}
              onDelete={(id) => { messageIdToDelete = id; showDeleteConfirm = true }}
              onToggleSelect={toggleSelect}
              onToggleAudio={toggleAudio}
              onVote={handleVote}
              onImagePreview={(url) => selectedImageUrl = url}
              isRead={isMessageRead(msg)}
              {formatTime}
              {highlightText}
              {getUrlPreview}
              {getPollResults}
              {getWaveform}
            />
          {/each}
        </div>

        <ChatInput 
          bind:newMessage bind:replyingTo bind:editingMessage bind:pendingFiles
          {isRecording} {isSending} {isUploadingMedia} {activeRoom} {recordingSeconds} {recordingWaveform}
          onSendMessage={handleSendMessage}
          onFileSelect={handleFileSelect}
          onTyping={handleTyping}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onCancelEdit={() => { editingMessage = null; newMessage = '' }}
          onRemovePendingFile={(i) => pendingFiles = pendingFiles.filter((_, idx) => idx !== i)}
          triggerMediaSelect={(type) => type === 'image' ? imageInputRef?.click() : fileInputRef?.click()}
          bind:showPollModal
          {formatRecordingTime}
        />
        
        <input bind:this={fileInputRef} type="file" class="hidden" multiple accept="*/*" onchange={(e) => handleFileSelect(e, 'file')} />
        <input bind:this={imageInputRef} type="file" class="hidden" multiple accept="image/*" onchange={(e) => handleFileSelect(e, 'image')} />

      </div>

      <RoomInfo 
        bind:show={showSidebar} 
        room={activeRoomDetails || activeRoom} 
        currentUser={user}
        {allProfiles}
        messages={messages}
        {chatImages}
        {chatFiles}
        onImagePreview={(url) => selectedImageUrl = url}
        onUpdateRoom={(updated) => {
          activeRoom = { ...activeRoom, ...updated }
          activeRoomDetails = { ...activeRoomDetails, ...updated }
        }}
      />
    </div>
  {/if}

  <!-- Multi-select Bottom Bar -->
  {#if isSelectMode}
    <div class="absolute bottom-0 left-0 right-0 z-[160] bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
      <div class="flex items-center gap-4">
        <button onclick={() => { isSelectMode = false; selectedMessageIds = [] }} class="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
          <X size={20} />
        </button>
        <span class="text-sm font-bold text-slate-700">{selectedMessageIds.length} pesan terpilih</span>
      </div>
      <div class="flex items-center gap-3">
        <button onclick={async () => {
          for (const id of selectedMessageIds) {
            const m = messages.find(msg => msg.id === id);
            if (m && !starredMessages.includes(m.id)) await toggleStar(m);
          }
          selectedMessageIds = []; isSelectMode = false;
          toast.success('Pesan ditambahkan ke Berbintang');
        }} class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"><Star size={16} /> Bintangi</button>
        
        <button onclick={() => {
          toast.error('Bulk forward belum didukung. Teruskan pesan satu per satu.');
          selectedMessageIds = []; isSelectMode = false;
        }} class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all"><Forward size={16} /> Teruskan</button>
        
        <button onclick={async () => { 
          if (confirm(`Hapus ${selectedMessageIds.length} pesan?`)) { 
            for (const id of selectedMessageIds) {
              await chatService.deleteMessage(id, user.id);
            }
            messages = messages.filter(m => !selectedMessageIds.includes(m.id));
            selectedMessageIds = []; isSelectMode = false;
            toast.success('Pesan dihapus');
          } 
        }} 
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all"><Trash2 size={16} /> Hapus</button>
      </div>
    </div>
  {/if}

  <ForwardModal 
    bind:showForwardModal bind:forwardSearchQuery bind:selectedForwardIds
    {filteredProfiles} {otherRooms}
    onToggleForwardSelection={toggleForwardSelection}
    onForwardBulk={handleForwardBulk}
  />

  <ConfirmModal 
    bind:show={showDeleteConfirm}
    title="Hapus Pesan?"
    message="Pesan ini akan dihapus untuk semua orang. Tindakan ini tidak dapat dibatalkan."
    confirmText="Hapus Pesan"
    type="danger"
    onConfirm={handleDelete}
  />

  {#if showPollModal}
    <PollModal onClose={() => showPollModal = false} onSubmit={handleCreatePoll} />
  {/if}

  {#if selectedImageUrl}
    <div class="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm" transition:fade>
      <div class="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div class="text-white text-xs font-bold opacity-80">Media Gallery ({chatImages.length})</div>
        <button onclick={() => selectedImageUrl = null} class="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
      </div>
      <img src={selectedImageUrl} alt="Full view" class="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg" />
    </div>
  {/if}

  {#if showMessageInfo}
    <div class="fixed inset-0 z-[250] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm" transition:fade>
      <div class="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-6">
        <h3 class="font-bold text-slate-800 text-lg mb-4 text-center">Info Pesan</h3>
        <div class="space-y-4">
          <div class="flex justify-between">
            <span class="text-xs font-bold text-slate-400">Dikirim</span>
            <span class="text-xs font-bold text-slate-700">{new Date(showMessageInfo.created_at).toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-xs font-bold text-slate-400">Status</span>
            <span class="text-xs font-bold text-blue-500">{isMessageRead(showMessageInfo) ? 'Dibaca' : 'Terkirim'}</span>
          </div>
        </div>
        <button onclick={() => showMessageInfo = null} class="w-full mt-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Tutup</button>
      </div>
    </div>
  {/if}

</div>

<style>
  :global(.custom-scrollbar::-webkit-scrollbar) { width: 5px; }
  :global(.custom-scrollbar::-webkit-scrollbar-track) { background: transparent; }
  :global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: #e2e8f0; border-radius: 10px; }
  :global(.wp-emerald) { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
  :global(.wp-sunset) { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); }
  :global(.wp-midnight) { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); }
  :global(.wp-lavender) { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); }
  :global(.highlight-msg) { animation: highlight 2s ease-out; }
  @keyframes highlight { 0% { background-color: rgba(249, 115, 22, 0.1); } 100% { background-color: transparent; } }
</style>
