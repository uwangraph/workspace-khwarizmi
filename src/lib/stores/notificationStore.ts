import { writable } from 'svelte/store';
import { notificationService } from '$lib/services/notificationService';

export const unreadCount = writable(0);

export async function fetchUnreadCount(userId: string) {
  const { count, error } = await notificationService.getUnreadCount(userId);
  
  if (!error && count !== null) {
    unreadCount.set(count);
  }
}

export function incrementUnread() {
  unreadCount.update(n => n + 1);
}

export function decrementUnread() {
  unreadCount.update(n => Math.max(0, n - 1));
}
