import { supabase } from '$lib/supabase'
import type { ChatRoom, ChatParticipant, ChatMessage, ChatPollVote } from '$lib/type'

export const chatService = {
  // Ambil daftar grup & DM user tersebut
  async getRooms(userId: string) {
    const { data, error } = await supabase
      .from('chat_participants')
      .select(`room_id, chat_rooms (id, name, type, created_at)`)
      .eq('user_id', userId)
    
    if (error) throw error
    const rooms = data.map((d: any) => d.chat_rooms).filter(Boolean) as any[]

    // Untuk DM rooms, ambil nama partner dari profiles
    const dmRooms = rooms.filter((r: any) => r.type === 'direct')
    if (dmRooms.length > 0) {
      const dmRoomIds = dmRooms.map((r: any) => r.id)

      // Ambil semua peserta DM selain diri sendiri
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

        // Pasangkan nama ke setiap DM room
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

    return rooms
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
    return data.reverse() as ChatMessage[]
  },

  // Kirim pesan teks
  async sendTextMessage(roomId: string, senderId: string, content: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        type: 'text',
        content
      })
      .select()
      .single()
    
    if (error) throw error
    return data as ChatMessage
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
        content: file.name,
        metadata: {
          ...metadata,
          url: publicUrlData.publicUrl,
          size: file.size
        }
      })
      .select()
      .single()
    
    if (error) throw error
    return data as ChatMessage
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
    
    if (partError) throw partError
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

  // Subscribe ke pesan baru
  subscribeToMessages(roomId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        callback
      )
      .subscribe()
  }
}
