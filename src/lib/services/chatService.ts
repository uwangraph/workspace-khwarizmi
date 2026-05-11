import { supabase } from '$lib/supabase'
import type { ChatRoom, ChatParticipant, ChatMessage, ChatPollVote } from '$lib/type'

export const chatService = {
  // Ambil daftar grup & DM user tersebut (optimized: 1 query via RPC)
  async getRooms(userId: string) {
    // Coba via RPC dulu (1 query, super cepat)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_rooms_with_unread', {
      p_user_id: userId
    })

    if (!rpcErr && rpcData) {
      return rpcData.map((r: any) => ({
        id: r.room_id,
        name: r.room_type === 'direct' ? (r.partner_name || r.room_name) : r.room_name,
        type: r.room_type,
        description: r.room_description,
        avatar_url: r.room_avatar_url,
        created_at: r.room_created_at,
        partner_avatar: r.partner_avatar,
        last_message: r.last_message_content ? {
          content: r.last_message_content,
          type: r.last_message_type,
          created_at: r.last_message_at,
        } : null,
        updated_at: r.last_message_at || r.room_created_at,
        unread_count: Number(r.unread_count) || 0,
        last_read_at: r.last_read_at,
      }))
    }

    console.warn('[Chat] RPC get_rooms_with_unread gagal, fallback ke query manual:', rpcErr?.message)

    // === FALLBACK: query manual (lambat, N+1) ===
    const { data, error } = await supabase
      .from('chat_participants')
      .select(`room_id, chat_rooms (id, name, type, description, avatar_url, created_at)`)
      .eq('user_id', userId)
    
    if (error) throw error
    const rooms = data.map((d: any) => d.chat_rooms).filter(Boolean) as any[]

    const dmRooms = rooms.filter((r: any) => r.type === 'direct')
    if (dmRooms.length > 0) {
      const dmRoomIds = dmRooms.map((r: any) => r.id)
      const { data: partners } = await supabase
        .from('chat_participants')
        .select('room_id, user_id')
        .in('room_id', dmRoomIds)
        .neq('user_id', userId)

      if (partners && partners.length > 0) {
        const partnerIds = [...new Set(partners.map((p: any) => p.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', partnerIds)

        partners.forEach((partner: any) => {
          const profile = profiles?.find((p: any) => p.id === partner.user_id)
          const room = rooms.find((r: any) => r.id === partner.room_id)
          if (room && profile) {
            room.name = profile.full_name
            room.partner_avatar = profile.avatar_url
          }
        })
      }
    }

    const roomIds = rooms.map((r: any) => r.id)
    if (roomIds.length > 0) {
      await Promise.all(rooms.map(async (room) => {
        const { data: latest } = await supabase
          .from('chat_messages')
          .select('content, type, created_at')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (latest) {
          room.last_message = latest
          room.updated_at = latest.created_at
        } else {
          room.updated_at = room.created_at
        }

        const { data: participant } = await supabase
          .from('chat_participants')
          .select('last_read_at')
          .eq('room_id', room.id)
          .eq('user_id', userId)
          .single()
        
        if (participant?.last_read_at) {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_id', userId)
            .gt('created_at', participant.last_read_at)
          room.unread_count = count || 0
        } else {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_id', userId)
          room.unread_count = count || 0
        }
        room.last_read_at = participant?.last_read_at || null
      }))
      
      rooms.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }

    return rooms
  },

  // Ambil detail lengkap sebuah room (termasuk partisipan)
  async getRoomDetails(roomId: string) {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Sesi tidak ditemukan')
    }

    const { data: membership, error: membershipError } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) throw membershipError
    if (!membership) throw new Error('Anda bukan peserta room ini')

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    
    if (roomError) throw roomError

    // Ambil info pembuat secara terpisah karena relasi tidak langsung
    if (room.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', room.created_by)
        .single()
      if (creator) room.profiles = creator
    }

    const { data: participants, error: partError } = await supabase
      .from('chat_participants')
      .select('user_id, joined_at')
      .eq('room_id', roomId)
    
    if (partError) throw partError

    // Ambil profil partisipan secara massal
    if (participants && participants.length > 0) {
      const userIds = participants.map(p => p.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
      
      room.participants = participants.map(p => {
        const prof = profiles?.find(pr => pr.id === p.user_id)
        return { ...prof, joined_at: p.joined_at }
      })

      if (room.type === 'direct') {
        const partner = room.participants.find((p: any) => p?.id && p.id !== user.id)
        if (partner) {
          room.name = partner.full_name
          room.partner_avatar = partner.avatar_url || null
        }
      }
    } else {
      room.participants = []
    }

    return room
  },

  // Update informasi room (nama, deskripsi, avatar)
  async updateRoom(roomId: string, updates: { name?: string, description?: string, avatar_url?: string }) {
    // Coba update dan ambil datanya kembali
    const { data, error } = await supabase
      .from('chat_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
    
    // Jika gagal dengan select (misal RLS atau 406), coba update saja tanpa select
    if (error) {
      const { error: retryError } = await supabase
        .from('chat_rooms')
        .update(updates)
        .eq('id', roomId)
      
      if (retryError) throw retryError
      return { id: roomId, ...updates }
    }

    return data[0]
  },

  // Tambah peserta ke room
  async addParticipants(roomId: string, userIds: string[]) {
    const insertData = userIds.map(uid => ({ room_id: roomId, user_id: uid }))
    const { error } = await supabase
      .from('chat_participants')
      .insert(insertData)
    
    if (error) throw error
    return true
  },

  // Hapus peserta dari room
  async removeParticipant(roomId: string, userId: string) {
    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)
    
    if (error) throw error
    return true
  },

  // Ambil riwayat pesan untuk sebuah room
  async getMessages(roomId: string, limit = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    const messages = data.reverse() as ChatMessage[]
    const senderIds = [...new Set(messages.map((message) => message.sender_id).filter(Boolean))]
    if (senderIds.length === 0) return messages

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', senderIds)

    return messages.map((message) => ({
      ...message,
      sender: profiles?.find((profile) => profile.id === message.sender_id)
    })) as ChatMessage[]
  },

  // Kirim pesan teks
  async sendTextMessage(roomId: string, senderId: string, content: string, metadata: any = {}) {
    const insertData: any = {
      room_id: roomId,
      sender_id: senderId,
      type: 'text',
      content
    }
    // Hanya simpan metadata jika ada isinya (misal reply_to)
    if (Object.keys(metadata).length > 0 && Object.values(metadata).some(v => v != null)) {
      insertData.metadata = metadata
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select()
      .single()
    
    if (error) throw error
    return data as ChatMessage
  },

  // Edit pesan
  async editMessage(messageId: string, userId: string, newContent: string) {
    const { data: existingMessage, error: existingError } = await supabase
      .from('chat_messages')
      .select('metadata')
      .eq('id', messageId)
      .eq('sender_id', userId)
      .single()

    if (existingError) throw existingError

    const { data, error } = await supabase
      .from('chat_messages')
      .update({
        content: newContent,
        metadata: { ...(existingMessage?.metadata || {}), edited: true }
      })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data as ChatMessage
  },

  // Perbarui metadata pesan (untuk reaksi, bintang, dll)
  async updateMessageMetadata(messageId: string, metadata: any) {
    try {
      // Gunakan server route untuk bypass RLS (agar bisa react/pin pesan orang lain)
      const res = await fetch('/api/chat/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, metadata })
      })
      if (!res.ok) throw new Error('API route failed')
    } catch (err) {
      console.warn('[Chat] API route failed, falling back to direct update', err)
      const { error } = await supabase
        .from('chat_messages')
        .update({ metadata })
        .eq('id', messageId)
      
      if (error) throw error
    }
  },

  // Teruskan pesan ke room lain
  async forwardMessage(roomId: string, senderId: string, originalMsg: ChatMessage) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        type: originalMsg.type,
        content: originalMsg.content,
        metadata: { 
          ...originalMsg.metadata, 
          forwarded: true,
          original_sender: originalMsg.sender_id 
        }
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Kirim VN/File/Image
  async sendMediaMessage(roomId: string, senderId: string, type: 'audio' | 'image' | 'file', file: File, metadata: any = {}) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${roomId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file)
    
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('chat_media')
      .getPublicUrl(filePath)

    // Simpan pesan ke DB dengan metadata
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        type,
        // Gunakan caption jika ada, jika tidak gunakan nama file
        content: metadata.caption || file.name,
        metadata: {
          ...metadata,
          originalName: file.name,
          url: publicUrlData.publicUrl,
          size: file.size
        }
      })
      .select()
      .single()
    
    if (error) throw error
    return data as ChatMessage
  },

  // Hapus Pesan & Media
  async deleteMessage(messageId: string, userId: string) {
    // 1. Ambil info pesan dulu untuk cek apakah ada media
    const { data: msg } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (!msg) return

    // 2. Jika ada media, hapus dari storage
    if (['image', 'audio', 'file'].includes(msg.type) && msg.metadata?.url) {
      try {
        // Ekstrak path dari URL atau simpan path di metadata (lebih aman ambil dari URL publik)
        // Format path di bucket biasanya: {roomId}/{fileName}
        // Tapi kita bisa ambil dari URL: .../storage/v1/object/public/chat_media/{path}
        const urlParts = msg.metadata.url.split('/chat_media/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage.from('chat_media').remove([filePath])
        }
      } catch (err) {
        console.error('[Storage Delete Error]', err)
        // Lanjutkan hapus pesan DB meskipun storage gagal (opsional)
      }
    }

    // 3. Hapus dari DB
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', userId)
    
    if (error) throw error
    return true
  },

  // Buat Grup Baru
  async createGroup(name: string, creatorId: string, participantIds: string[]) {
    // 1. Create Room
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ name, type: 'group', created_by: creatorId })
      .select()
      .single()
    
    if (roomError) throw roomError

    // 2. Add Participants (Creator + Members)
    const participants = [creatorId, ...participantIds].map(id => ({ room_id: room.id, user_id: id }))
    const { error: partError } = await supabase.from('chat_participants').insert(participants)
    
    if (partError) {
      await supabase.from('chat_rooms').delete().eq('id', room.id)
      throw partError
    }
    return room as ChatRoom
  },

  // Buat / Ambil DM Baru
  async getOrCreateDirectMessage(user1Id: string, user2Id: string) {
    // Cari DM room yg sudah ada antara kedua user ini
    // Memerlukan query yg agak kompleks atau RPC, untuk MVP kita gunakan pendekatan 2 langkah:
    
    // a. Cari rooms dimana user1 ada, dengan tipe 'direct'
    const { data: user1Rooms } = await supabase
      .from('chat_participants')
      .select('room_id, chat_rooms!inner(type)')
      .eq('user_id', user1Id)
      .eq('chat_rooms.type', 'direct')
      
    const roomIds = user1Rooms?.map(r => r.room_id) || []
    
    // b. Cek apakah user2 ada di salah satu room tersebut
    if (roomIds.length > 0) {
      const { data: sharedRoom } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user2Id)
        .in('room_id', roomIds)
        .limit(1)
        .maybeSingle()
        
      if (sharedRoom) {
        // Ambil data detail roomnya
        const { data: existingRoom } = await supabase.from('chat_rooms').select('*').eq('id', sharedRoom.room_id).maybeSingle()
        return existingRoom as ChatRoom
      }
    }

    // Jika belum ada, buat room baru
    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ type: 'direct', created_by: user1Id })
      .select()
      .single()
      
    if (roomError) throw roomError
    
    await supabase.from('chat_participants').insert([
      { room_id: newRoom.id, user_id: user1Id },
      { room_id: newRoom.id, user_id: user2Id }
    ])
    
    return newRoom as ChatRoom
  },

  // Kirim Polling
  async sendPollMessage(roomId: string, senderId: string, question: string, options: string[]) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        type: 'poll',
        content: question,
        metadata: { options: options.map((opt, i) => ({ id: `opt_${i}`, text: opt })) }
      })
      .select()
      .single()
    
    if (error) throw error
    return data as ChatMessage
  },

  // Ambil Vote Polling
  async getPollVotes(messageId: string) {
    const { data, error } = await supabase
      .from('chat_poll_votes')
      .select('*')
      .eq('message_id', messageId)
    
    if (error) throw error
    return data as ChatPollVote[]
  },

  // Vote Polling
  async votePoll(messageId: string, userId: string, optionId: string) {
    const { data, error } = await supabase
      .from('chat_poll_votes')
      .upsert({
        message_id: messageId,
        user_id: userId,
        option_id: optionId
      }, { onConflict: 'message_id,user_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Tandai pesan sebagai dibaca
  async markMessagesAsRead(roomId: string, userId: string) {
    // Coba via RPC (bypass RLS, gunakan waktu server)
    const { error: rpcErr } = await supabase.rpc('mark_as_read', {
      p_room_id: roomId,
      p_user_id: userId
    })
    
    if (rpcErr) {
      console.warn('[Chat] RPC mark_as_read gagal (mungkin belum dibuat):', rpcErr.message)
      // Fallback: update manual
      const { error: manualErr } = await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId)
      
      if (manualErr) {
        console.error('[Chat] Fallback manual juga gagal (kemungkinan RLS blocking):', manualErr)
        return false
      }
    }
    
    // Verifikasi: baca kembali nilai last_read_at dari DB
    const { data: verify } = await supabase
      .from('chat_participants')
      .select('last_read_at')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle()
    
    console.log('[Chat] Verifikasi last_read_at setelah update:', verify?.last_read_at)
    return true
  },

  // Subscribe ke pesan baru & vote polling
  subscribeToMessages(roomId: string, onMessage: (payload: any) => void, onVote?: (payload: any) => void, onMetadata?: (payload: any) => void) {
    const channelName = `chat_${roomId}`
    // Pastikan channel lama dihapus agar tidak error "after subscribe"
    const existing = supabase.getChannels().find((c: any) => c.topic === channelName)
    if (existing) supabase.removeChannel(existing)
    
    const channel = supabase.channel(channelName)
    
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      onMessage
    )

    if (onVote) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_poll_votes' },
        onVote
      )
    }

    // Subscribe ke penghapusan pesan
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onMessage({ ...payload, eventType: 'DELETE' })
    )

    // Subscribe ke update pesan (untuk edit)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onMessage({ ...payload, eventType: 'UPDATE' })
    )

    // Custom Broadcast untuk update Metadata (Reactions, Pins) agar langsung sinkron tanpa menunggu/bergantung pada Postgres
    channel.on(
      'broadcast',
      { event: 'metadata_update' },
      (payload) => {
        if (onMetadata) onMetadata(payload.payload)
      }
    )

    return channel.subscribe()
  },

  // Broadcast update metadata secara realtime
  broadcastMetadata(roomId: string, messageId: string, metadata: any) {
    const channelName = `chat_${roomId}`
    const channel = supabase.getChannels().find((c: any) => c.topic === channelName)
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'metadata_update',
        payload: { messageId, metadata }
      })
    }
  },

  // Broadcast sedang mengetik
  broadcastTyping(roomId: string, userId: string, userName: string, isTyping: boolean) {
    const channelName = `typing_${roomId}`
    const existing = supabase.getChannels().find((c: any) => c.topic === channelName)
    if (existing) supabase.removeChannel(existing)
    
    const channel = supabase.channel(channelName)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId, userName, isTyping }
        })
      }
    })
  },

  // Subscribe status mengetik
  subscribeToTyping(roomId: string, onTyping: (payload: any) => void) {
    const channelName = `typing_listen_${roomId}`
    const existing = supabase.getChannels().find((c: any) => c.topic === channelName)
    if (existing) supabase.removeChannel(existing)
    
    const channel = supabase.channel(channelName)
    return channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => onTyping(payload))
      .subscribe()
  }
}
