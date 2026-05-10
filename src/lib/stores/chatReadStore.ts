import { writable } from 'svelte/store'

/**
 * Store untuk melacak room yang sudah dibuka/dibaca oleh user.
 * Ini mencegah unread count muncul kembali saat navigasi back
 * karena race condition antara markMessagesAsRead dan getRooms.
 */
export const readRoomIds = writable<Set<string>>(new Set())

export function markRoomAsRead(roomId: string) {
  readRoomIds.update(set => {
    set.add(roomId)
    return new Set(set)
  })
}

export function clearReadRooms() {
  readRoomIds.set(new Set())
}
