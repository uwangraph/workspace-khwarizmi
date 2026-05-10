import { writable, get } from 'svelte/store';
import { chatService } from '$lib/services/chatService';
import { supabase } from '$lib/supabase';
import { readRoomIds } from './chatReadStore';

export const globalRooms = writable<any[]>([]);
export const globalUnreadChatCount = writable<number>(0);
export const isChatLoaded = writable<boolean>(false);

let chatChannel: any = null;

export async function initGlobalChat(userId: string) {
  if (get(isChatLoaded)) return;

  // Initial load
  const rooms = await chatService.getRooms(userId);
  updateRooms(rooms);
  isChatLoaded.set(true);

  // Subscribe globally
  if (!chatChannel) {
    chatChannel = supabase.channel('global-chat-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const newMessage = payload.new;
        let currentRooms = get(globalRooms);
        const roomIdx = currentRooms.findIndex(r => r.id === newMessage.room_id);

        if (roomIdx >= 0) {
          const updatedRoom = { ...currentRooms[roomIdx] };
          updatedRoom.last_message = newMessage;
          updatedRoom.updated_at = newMessage.created_at;

          if (newMessage.sender_id !== userId) {
            readRoomIds.update(set => {
              set.delete(newMessage.room_id);
              return new Set(set);
            });
            updatedRoom.unread_count = (updatedRoom.unread_count || 0) + 1;
          }

          currentRooms = [updatedRoom, ...currentRooms.filter(r => r.id !== newMessage.room_id)];
          updateRooms(currentRooms);
        } else {
          // New room, reload all
          const freshRooms = await chatService.getRooms(userId);
          updateRooms(freshRooms);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${userId}` }, (payload) => {
        const update = payload.new;
        let currentRooms = get(globalRooms);
        const roomIdx = currentRooms.findIndex(r => r.id === update.room_id);
        
        if (roomIdx >= 0) {
          const updatedRoom = { ...currentRooms[roomIdx] };
          updatedRoom.unread_count = 0;
          currentRooms = [
            ...currentRooms.slice(0, roomIdx),
            updatedRoom,
            ...currentRooms.slice(roomIdx + 1)
          ];
          updateRooms(currentRooms);
        }
      })
      .subscribe();
  }
}

function updateRooms(rooms: any[]) {
  const readIds = get(readRoomIds);
  const adjustedRooms = rooms.map(r => readIds.has(r.id) ? { ...r, unread_count: 0 } : r);
  globalRooms.set(adjustedRooms);
  
  // Calculate total unread count
  const totalUnread = adjustedRooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
  globalUnreadChatCount.set(totalUnread);
}

// Subscribe to readRoomIds to recalculate total unread count when a room is read
readRoomIds.subscribe(readIds => {
  if (get(isChatLoaded)) {
    const currentRooms = get(globalRooms);
    const adjustedRooms = currentRooms.map(r => readIds.has(r.id) ? { ...r, unread_count: 0 } : r);
    globalRooms.set(adjustedRooms);
    const totalUnread = adjustedRooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
    globalUnreadChatCount.set(totalUnread);
  }
});
