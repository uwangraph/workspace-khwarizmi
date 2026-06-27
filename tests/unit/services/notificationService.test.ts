import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.unmock('$lib/services/notificationService')

let mockResults: any[] = []
let mockIdx = 0

function makeChain() {
  const idx = mockIdx++
  const getResult = () => mockResults[idx] ?? { data: null, error: null }
  const chain: any = {
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(getResult()).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(getResult()).catch(onRejected),
    finally: (fn: any) => Promise.resolve(getResult()).finally(fn),
    single: vi.fn().mockImplementation(() => Promise.resolve(getResult())),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(getResult())),
  }
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
    'gte', 'lte', 'gt', 'lt', 'in', 'or', 'not', 'is', 'order', 'limit', 'range', 'offset']
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
  return chain
}

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeChain()),
    rpc: vi.fn().mockImplementation(() => {
      const r = mockResults[mockIdx++] ?? { data: null, error: null }
      return Promise.resolve(r)
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('$lib/firebase', () => ({
  messaging: Promise.resolve(null),
  analytics: Promise.resolve(null),
  default: {},
}))

import { notificationService } from '$lib/services/notificationService'

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResults = []
    mockIdx = 0
  })

  // ── send ────────────────────────────────────────────────────────────────────
  describe('send', () => {
    it('calls RPC send_notification with correct args', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: null, error: null }]
      await notificationService.send('u1', 'task_assigned', 'Title', 'Msg', { task_id: 't1' })
      expect(supabase.rpc).toHaveBeenCalledWith('send_notification', expect.objectContaining({
        p_user_id: 'u1', p_type: 'task_assigned', p_title: 'Title',
        p_message: 'Msg', p_data: { task_id: 't1' },
      }))
    })

    it('calls Edge Function send-push after RPC', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: null, error: null }]
      await notificationService.send('u1', 'task_assigned', 'Title', 'Msg')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
        body: { user_id: 'u1', title: 'Title', message: 'Msg', data: {} },
      })
    })

    it('falls back to direct insert when RPC fails', async () => {
      mockResults = [
        { data: null, error: { message: 'RPC not found' } },
        { data: null, error: null },
      ]
      const r = await notificationService.send('u1', 'task_assigned', 'Title', 'Msg')
      expect(r).toBe(true)
    })

    it('returns true even when Edge Function fails', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: null, error: null }]
      ;(supabase.functions.invoke as any).mockResolvedValueOnce({ data: null, error: { message: 'err' } })
      const r = await notificationService.send('u1', 'task_assigned', 'Title', 'Msg')
      expect(r).toBe(true)
    })

    it('uses empty object as default data', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: null, error: null }]
      await notificationService.send('u1', 'task_assigned', 'Title', 'Msg')
      expect(supabase.rpc).toHaveBeenCalledWith('send_notification',
        expect.objectContaining({ p_data: {} })
      )
    })
  })

  // ── sendBulk ────────────────────────────────────────────────────────────────
  describe('sendBulk', () => {
    it('sends notification to multiple users', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [
        { data: null, error: null },
        { data: null, error: null },
      ]
      await notificationService.sendBulk(['u1', 'u2'], 'task_assigned', 'Title', 'Msg', { task_id: 't1' })
      expect(supabase.rpc).toHaveBeenCalledTimes(2)
    })

    it('calls Edge Function once for bulk push with user_ids array', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: null, error: null }]
      await notificationService.sendBulk(['u1', 'u2'], 'task_assigned', 'Title', 'Msg')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
        body: { user_ids: ['u1', 'u2'], title: 'Title', message: 'Msg', data: {} },
      })
    })

    it('does nothing when user IDs array is empty', async () => {
      const { supabase } = await import('$lib/supabase')
      await notificationService.sendBulk([], 'task_assigned', 'Title', 'Msg')
      expect(supabase.rpc).not.toHaveBeenCalled()
    })

    it('sends one notification per user', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = Array.from({ length: 5 }, () => ({ data: null, error: null }))
      await notificationService.sendBulk(
        ['u1', 'u2', 'u3', 'u4', 'u5'], 'task_assigned', 'T', 'M'
      )
      expect(supabase.rpc).toHaveBeenCalledTimes(5)
    })
  })

  // ── getNotifications ─────────────────────────────────────────────────────────
  describe('getNotifications', () => {
    it('fetches notifications for a user', async () => {
      mockResults = [
        { data: [{ id: 'n1', title: 'Test', is_read: false }], error: null },
      ]
      const r = await notificationService.getNotifications('u1')
      expect(r.data).toHaveLength(1)
      expect(r.data![0].id).toBe('n1')
    })

    it('returns empty array when no notifications', async () => {
      mockResults = [{ data: [], error: null }]
      const r = await notificationService.getNotifications('u1')
      expect(r.data).toHaveLength(0)
    })

    it('accepts custom limit parameter', async () => {
      mockResults = [{ data: [], error: null }]
      await notificationService.getNotifications('u1', 50)
      const { supabase } = await import('$lib/supabase')
      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })
  })

  // ── markAsRead ───────────────────────────────────────────────────────────────
  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await notificationService.markAsRead('n1')
      expect(r.error).toBeNull()
    })
  })

  // ── markAsUnread ─────────────────────────────────────────────────────────────
  describe('markAsUnread', () => {
    it('marks notification as unread', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await notificationService.markAsUnread('n1')
      expect(r.error).toBeNull()
    })
  })

  // ── markAllAsRead ─────────────────────────────────────────────────────────────
  describe('markAllAsRead', () => {
    it('marks all notifications as read for a user', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await notificationService.markAllAsRead('u1')
      expect(r.error).toBeNull()
    })
  })

  // ── deleteAll ────────────────────────────────────────────────────────────────
  describe('deleteAll', () => {
    it('deletes all notifications for a user', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await notificationService.deleteAll('u1')
      expect(r.error).toBeNull()
    })
  })

  // ── deleteNotification ───────────────────────────────────────────────────────
  describe('deleteNotification', () => {
    it('deletes a single notification by ID', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await notificationService.deleteNotification('n1')
      expect(r.error).toBeNull()
    })
  })

  // ── getUnreadCount ───────────────────────────────────────────────────────────
  describe('getUnreadCount', () => {
    it('returns unread count from DB', async () => {
      mockResults = [{ count: 5, error: null }]
      const r = await notificationService.getUnreadCount('u1')
      expect(r.count).toBe(5)
    })

    it('returns 0 count when no unread notifications', async () => {
      mockResults = [{ count: 0, error: null }]
      const r = await notificationService.getUnreadCount('u1')
      expect(r.count).toBe(0)
    })
  })

  // ── subscribeRealtime ─────────────────────────────────────────────────────────
  describe('subscribeRealtime', () => {
    it('creates a channel for user notifications', async () => {
      const { supabase } = await import('$lib/supabase')
      const unsub = notificationService.subscribeRealtime('u1', vi.fn())
      expect(supabase.channel).toHaveBeenCalledWith('public:notifications:user_id=eq.u1')
      expect(typeof unsub).toBe('function')
    })

    it('returns an unsubscribe function that removes the channel', async () => {
      const { supabase } = await import('$lib/supabase')
      const unsub = notificationService.subscribeRealtime('u1', vi.fn())
      unsub()
      expect(supabase.removeChannel).toHaveBeenCalled()
    })
  })

  // ── requestPermissionAndGetToken ──────────────────────────────────────────────
  describe('requestPermissionAndGetToken', () => {
    it('returns null when Firebase messaging is unavailable (mocked as null)', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValueOnce('granted')
      const r = await notificationService.requestPermissionAndGetToken('u1')
      expect(r).toBeNull()
    })

    it('returns null when permission is denied', async () => {
      window.Notification.requestPermission = vi.fn().mockResolvedValueOnce('denied')
      const r = await notificationService.requestPermissionAndGetToken('u1')
      expect(r).toBeNull()
    })
  })

  // ── saveTokenToSupabase ───────────────────────────────────────────────────────
  describe('saveTokenToSupabase', () => {
    it('upserts FCM token in fcm_tokens table', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: null, error: null }]
      await notificationService.saveTokenToSupabase('u1', 'token123')
      expect(supabase.from).toHaveBeenCalledWith('fcm_tokens')
    })

    it('throws when RLS error occurs (code 42501)', async () => {
      mockResults = [{ data: null, error: { code: '42501', message: 'RLS denied' } }]
      await expect(notificationService.saveTokenToSupabase('u1', 'token'))
        .rejects.toThrow('Gagal menyimpan token notifikasi')
    })

    it('does nothing when userId is empty', async () => {
      const { supabase } = await import('$lib/supabase')
      await notificationService.saveTokenToSupabase('', 'token')
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('does nothing when token is empty', async () => {
      const { supabase } = await import('$lib/supabase')
      await notificationService.saveTokenToSupabase('u1', '')
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })
})
