import { writable, get } from 'svelte/store';
import { chatService } from '$lib/services/chatService';
import { supabase } from '$lib/supabase';
import { readRoomIds } from './chatReadStore';

declare global {
  var _chatChannels: any[];
}

export const globalRooms = writable<any[]>([]);
export const globalUnreadChatCount = writable<number>(0);
export const isChatLoaded = writable<boolean>(false);
export const latestIncomingChat = writable<any | null>(null);
export const isRealtimeConnected = writable<boolean>(false);

let chatChannel: any = null;
let currentUserId: string | null = null;
let subscribedRoomIds: string[] = [];

export async function initGlobalChat(userId: string) {
  currentUserId = userId;

  const rooms = await chatService.getRooms(userId);
  updateRooms(rooms);
  isChatLoaded.set(true);

  const roomIds = rooms.map((r: any) => r.id);
  await setupSubscription(userId, roomIds);
}

async function setupSubscription(userId: string, roomIds: string[]) {
  // Teardown channel lama
  if (chatChannel) {
    await supabase.removeChannel(chatChannel);
    chatChannel = null;
  }
  
  if (globalThis._chatChannels) {
    for (const c of globalThis._chatChannels) {
      await supabase.removeChannel(c);
    }
    globalThis._chatChannels = [];
  }

  subscribedRoomIds = roomIds;

  const channel = supabase.channel('global-chat-' + userId);

  // Gunakan channel terpisah untuk tiap room agar filter 'eq' tidak saling menimpa
  if (roomIds.length > 0) {
    roomIds.forEach(roomId => {
      const roomChannel = supabase.channel(`global-chat-${userId}-${roomId}`);
      roomChannel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload: any) => { await handleNewMessage(payload.new, userId); }
      );
      roomChannel.subscribe();
      
      // Simpan referensi jika perlu dibersihkan nanti (atau biarkan supabase kelola via removeAllChannels jika perlu)
      if (!globalThis._chatChannels) globalThis._chatChannels = [];
      globalThis._chatChannels.push(roomChannel);
    });
  }

  // Deteksi user ditambahkan ke room baru
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${userId}` },
    async () => {
      const freshRooms = await chatService.getRooms(userId);
      updateRooms(freshRooms);
      // Resubscribe dengan room IDs baru supaya langsung menerima pesan dari room baru
      await setupSubscription(userId, freshRooms.map((r: any) => r.id));
    }
  );

  // Reset unread count saat user membaca room
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${userId}` },
    (payload: any) => {
      const update = payload.new;
      let currentRooms = get(globalRooms);
      const roomIdx = currentRooms.findIndex(r => r.id === update.room_id);
      if (roomIdx >= 0) {
        const updatedRoom = { ...currentRooms[roomIdx], unread_count: 0 };
        currentRooms = [
          ...currentRooms.slice(0, roomIdx),
          updatedRoom,
          ...currentRooms.slice(roomIdx + 1)
        ];
        updateRooms(currentRooms);
      }
    }
  );

  chatChannel = channel.subscribe((status: string) => {
    isRealtimeConnected.set(status === 'SUBSCRIBED');
  });
}

async function handleNewMessage(newMessage: any, userId: string) {
  let currentRooms = get(globalRooms);
  const roomIdx = currentRooms.findIndex(r => r.id === newMessage.room_id);

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', newMessage.sender_id)
    .maybeSingle();

  if (roomIdx >= 0) {
    const updatedRoom = { ...currentRooms[roomIdx] };
    updatedRoom.last_message = { ...newMessage, sender: senderProfile || undefined };
    updatedRoom.updated_at = newMessage.created_at;

    if (newMessage.sender_id !== userId) {
      readRoomIds.update(set => { set.delete(newMessage.room_id); return new Set(set); });
      updatedRoom.unread_count = (updatedRoom.unread_count || 0) + 1;
      latestIncomingChat.set({
        room: updatedRoom,
        message: { ...newMessage, sender: senderProfile || undefined }
      });
    }

    currentRooms = [updatedRoom, ...currentRooms.filter(r => r.id !== newMessage.room_id)];
    updateRooms(currentRooms);
  } else {
    // Room belum ada di list — reload semua & resubscribe
    const freshRooms = await chatService.getRooms(userId);
    updateRooms(freshRooms);
    const newRoom = freshRooms.find((r: any) => r.id === newMessage.room_id);
    if (newRoom && newMessage.sender_id !== userId) {
      latestIncomingChat.set({ room: newRoom, message: { ...newMessage, sender: senderProfile || undefined } });
    }
    
    // Cegah infinite loop dengan mengecek apakah benar-benar ada room baru
    const oldRoomIds = currentRooms.map(r => r.id).sort().join(',');
    const newRoomIds = freshRooms.map((r: any) => r.id).sort().join(',');
    if (oldRoomIds !== newRoomIds) {
      await setupSubscription(userId, freshRooms.map((r: any) => r.id));
    }
  }
}

export function dismissIncomingChat() {
  latestIncomingChat.set(null);
}

export async function refreshGlobalChat(userId: string) {
  const rooms = await chatService.getRooms(userId);
  updateRooms(rooms);
  isChatLoaded.set(true);

  // Jika room IDs berubah (ada room baru/keluar), resubscribe
  const newRoomIds = rooms.map((r: any) => r.id);
  const changed = newRoomIds.length !== subscribedRoomIds.length ||
    newRoomIds.some((id: string) => !subscribedRoomIds.includes(id));
  if (changed) await setupSubscription(userId, newRoomIds);
}

function updateRooms(rooms: any[]) {
  const readIds = get(readRoomIds);
  const adjustedRooms = rooms.map(r => readIds.has(r.id) ? { ...r, unread_count: 0 } : r);
  globalRooms.set(adjustedRooms);
  const totalUnread = adjustedRooms.reduce((sum: number, r: any) => sum + (r.unread_count || 0), 0);
  globalUnreadChatCount.set(totalUnread);
}

readRoomIds.subscribe(readIds => {
  if (get(isChatLoaded)) {
    const currentRooms = get(globalRooms);
    const adjustedRooms = currentRooms.map(r => readIds.has(r.id) ? { ...r, unread_count: 0 } : r);
    globalRooms.set(adjustedRooms);
    const totalUnread = adjustedRooms.reduce((sum: number, r: any) => sum + (r.unread_count || 0), 0);
    globalUnreadChatCount.set(totalUnread);
  }
});
