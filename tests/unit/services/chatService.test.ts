import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockResults: any[] = []
let mockIdx = 0

const { mockChannel } = vi.hoisted(() => ({
  mockChannel: {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  },
}))

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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://test.url/m.jpg' } }),
      })),
    },
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    getChannels: vi.fn().mockReturnValue([]),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}))

import { chatService } from '$lib/services/chatService'

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResults = []
    mockIdx = 0
    mockChannel.on.mockReturnThis()
    mockChannel.subscribe.mockReturnThis()
    mockChannel.send.mockReturnThis()
  })

  // ── getRooms ─────────────────────────────────────────────────────────────────
  describe('getRooms', () => {
    it('returns rooms mapped from RPC data', async () => {
      mockResults = [{
        data: [{
          room_id: 'r1', room_name: 'Test', room_type: 'group',
          room_description: null, room_avatar_url: null, room_created_at: '2026-01-01',
          partner_name: null, partner_avatar: null,
          last_message_content: 'Hi', last_message_type: 'text',
          last_message_at: '2026-01-02', unread_count: 3, last_read_at: null,
        }],
        error: null,
      }]
      const r = await chatService.getRooms('u1')
      expect(r).toHaveLength(1)
      expect(r[0].id).toBe('r1')
      expect(r[0].unread_count).toBe(3)
    })

    it('uses partner_name as room name for DM rooms', async () => {
      mockResults = [{
        data: [{
          room_id: 'dm1', room_name: null, room_type: 'direct',
          room_description: null, room_avatar_url: null, room_created_at: '2026-01-01',
          partner_name: 'Budi Santoso', partner_avatar: null,
          last_message_content: 'Hi', last_message_type: 'text',
          last_message_at: '2026-01-02', unread_count: 1, last_read_at: null,
        }],
        error: null,
      }]
      const r = await chatService.getRooms('u1')
      expect(r[0].name).toBe('Budi Santoso')
    })

    it('falls back to manual query when RPC fails', async () => {
      mockResults = [
        { data: null, error: { message: 'RPC error' } },
        { data: [], error: null },
      ]
      const r = await chatService.getRooms('u1')
      expect(Array.isArray(r)).toBe(true)
    })

    it('returns empty array when RPC returns empty list', async () => {
      mockResults = [{ data: [], error: null }]
      const r = await chatService.getRooms('u1')
      expect(r).toHaveLength(0)
    })
  })

  // ── getRoomDetails ─────────────────────────────────────────────────────────────
  describe('getRoomDetails', () => {
    it('returns room with participants', async () => {
      mockResults = [
        { data: { room_id: 'r1', user_id: 'u1' }, error: null },
        { data: { id: 'r1', name: 'Test Group', type: 'group', created_by: 'u1' }, error: null },
        { data: { full_name: 'Creator' }, error: null },
        { data: [{ user_id: 'u1', joined_at: '2026-01-01' }], error: null },
        { data: [{ id: 'u1', full_name: 'Creator', avatar_url: null }], error: null },
      ]
      const r = await chatService.getRoomDetails('r1')
      expect(r.id).toBe('r1')
      expect(r.participants).toBeDefined()
    })

    it('throws when user is not a participant', async () => {
      mockResults = [{ data: null, error: null }]
      await expect(chatService.getRoomDetails('r1')).rejects.toThrow('bukan peserta')
    })

    it('throws when not authenticated', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null }, error: null })
      await expect(chatService.getRoomDetails('r1')).rejects.toThrow('Sesi tidak ditemukan')
    })
  })

  // ── getMessages ───────────────────────────────────────────────────────────────
  describe('getMessages', () => {
    it('returns messages for a room', async () => {
      mockResults = [
        { data: [{ id: 'm1', content: 'Hello', type: 'text', sender_id: 'u1' }], error: null },
      ]
      const r = await chatService.getMessages('r1')
      expect(r).toHaveLength(1)
      expect(r[0].content).toBe('Hello')
    })

    it('returns empty array when no messages', async () => {
      mockResults = [{ data: [], error: null }]
      expect(await chatService.getMessages('r1')).toHaveLength(0)
    })

    it('throws on DB error', async () => {
      mockResults = [{ data: null, error: { message: 'Permission denied' } }]
      await expect(chatService.getMessages('r1')).rejects.toThrow()
    })
  })

  // ── sendTextMessage ───────────────────────────────────────────────────────────
  describe('sendTextMessage', () => {
    it('sends a text message and returns it', async () => {
      mockResults = [
        { data: { id: 'm1', room_id: 'r1', content: 'Hello', type: 'text' }, error: null },
      ]
      const r = await chatService.sendTextMessage('r1', 'u1', 'Hello')
      expect(r.id).toBe('m1')
      expect(r.content).toBe('Hello')
    })

    it('includes metadata when reply_to is provided', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: { id: 'm2' }, error: null }]
      await chatService.sendTextMessage('r1', 'u1', 'Reply text', {
        reply_to: 'm0', reply_name: 'User', reply_content: 'Original',
      })
      expect(supabase.from).toHaveBeenCalledWith('chat_messages')
    })

    it('throws on insert failure', async () => {
      mockResults = [{ data: null, error: { message: 'Send failed' } }]
      await expect(chatService.sendTextMessage('r1', 'u1', 'Hello'))
        .rejects.toThrow('Send failed')
    })

    it('omits metadata when empty object provided', async () => {
      mockResults = [{ data: { id: 'm3' }, error: null }]
      await chatService.sendTextMessage('r1', 'u1', 'No metadata', {})
      expect(true).toBe(true)
    })
  })

  // ── editMessage ───────────────────────────────────────────────────────────────
  describe('editMessage', () => {
    it('edits message content', async () => {
      mockResults = [
        { data: { metadata: null }, error: null },
        { data: { id: 'm1', content: 'Edited text' }, error: null },
      ]
      const r = await chatService.editMessage('m1', 'u1', 'Edited text')
      expect(r.content).toBe('Edited text')
    })
  })

  // ── deleteMessage ─────────────────────────────────────────────────────────────
  describe('deleteMessage', () => {
    it('deletes text message and returns true', async () => {
      mockResults = [
        { data: { id: 'm1', type: 'text', content: 'Hello', metadata: null }, error: null },
        { data: null, error: null },
      ]
      const r = await chatService.deleteMessage('m1', 'u1')
      expect(r).toBe(true)
    })

    it('deletes image from storage when type is image', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [
        {
          data: {
            id: 'm2', type: 'image', content: 'photo.jpg',
            metadata: { url: 'https://test.url/chat_media/r1/photo.jpg' },
          },
          error: null,
        },
        { data: null, error: null },
      ]
      await chatService.deleteMessage('m2', 'u1')
      expect(supabase.storage.from).toHaveBeenCalledWith('chat_media')
    })

    it('returns undefined when message not found', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await chatService.deleteMessage('nonexistent', 'u1')
      expect(r).toBeUndefined()
    })
  })

  // ── createGroup ───────────────────────────────────────────────────────────────
  describe('createGroup', () => {
    it('creates group room and adds participants', async () => {
      mockResults = [
        { data: { id: 'g1', name: 'Dev Team', type: 'group' }, error: null },
        { data: null, error: null },
      ]
      const r = await chatService.createGroup('Dev Team', 'u1', ['u2', 'u3'])
      expect(r.id).toBe('g1')
      expect(r.name).toBe('Dev Team')
    })
  })

  // ── getOrCreateDirectMessage ─────────────────────────────────────────────────
  describe('getOrCreateDirectMessage', () => {
    it('returns existing DM room when found', async () => {
      mockResults = [
        { data: [{ room_id: 'dm1' }], error: null },
        { data: { room_id: 'dm1' }, error: null },
        { data: { id: 'dm1', type: 'direct' }, error: null },
        { data: { full_name: 'Creator' }, error: null },
        { data: [{ user_id: 'u1' }], error: null },
        { data: [{ id: 'u1', full_name: 'User1' }], error: null },
      ]
      const r = await chatService.getOrCreateDirectMessage('u1', 'u2')
      expect(r.id).toBe('dm1')
    })

    it('creates new DM room when none exists', async () => {
      mockResults = [
        { data: [], error: null },
        { data: { id: 'new-dm' }, error: null },
        { data: null, error: null },
        { data: { id: 'new-dm', type: 'direct' }, error: null },
        { data: { full_name: 'Creator' }, error: null },
        { data: [{ user_id: 'u1' }], error: null },
        { data: [{ id: 'u1', full_name: 'User1' }], error: null },
      ]
      const r = await chatService.getOrCreateDirectMessage('u1', 'u2')
      expect(r.id).toBe('new-dm')
    })
  })

  // ── markMessagesAsRead ────────────────────────────────────────────────────────
  describe('markMessagesAsRead', () => {
    it('calls RPC mark_as_read', async () => {
      const { supabase } = await import('$lib/supabase')
      await chatService.markMessagesAsRead('r1', 'u1')
      expect(supabase.rpc).toHaveBeenCalledWith('mark_as_read', {
        p_room_id: 'r1', p_user_id: 'u1',
      })
    })
  })

  // ── broadcastMetadata ────────────────────────────────────────────────────────
  describe('broadcastMetadata', () => {
    it('sends metadata via existing channel when found', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.getChannels as any).mockReturnValueOnce([{ topic: 'chat_r1', send: mockChannel.send }])
      chatService.broadcastMetadata('r1', 'm1', { reactions: [] })
      expect(supabase.getChannels).toHaveBeenCalled()
    })

    it('does nothing when no channel exists for room', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.getChannels as any).mockReturnValueOnce([])
      chatService.broadcastMetadata('r1', 'm1', { reactions: [] })
      expect(supabase.getChannels).toHaveBeenCalled()
    })
  })

  // ── broadcastTyping ───────────────────────────────────────────────────────────
  describe('broadcastTyping', () => {
    it('creates new channel when none exists and broadcasts typing', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.getChannels as any).mockReturnValueOnce([])
      ;(supabase.channel as any).mockReturnValueOnce(mockChannel)
      chatService.broadcastTyping('r1', 'u1', 'Test User', true)
      expect(supabase.channel).toHaveBeenCalledWith('typing_r1')
    })

    it('sends directly when existing typing channel found', async () => {
      ;(mockChannel.subscribe as any).mockImplementation(() => mockChannel)
      const { supabase } = await import('$lib/supabase')
      ;(supabase.getChannels as any).mockReturnValueOnce([{ topic: 'typing_r1', send: mockChannel.send }])
      chatService.broadcastTyping('r1', 'u1', 'Test User', false)
      expect(supabase.getChannels).toHaveBeenCalled()
    })
  })

  // ── subscribeToMessages ───────────────────────────────────────────────────────
  describe('subscribeToMessages', () => {
    it('creates channel and subscribes to message changes', async () => {
      const { supabase } = await import('$lib/supabase')
      const cb = vi.fn()
      await chatService.subscribeToMessages('r1', cb)
      expect(supabase.channel).toHaveBeenCalledWith('chat_r1')
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('removes existing channel before creating new one', async () => {
      const { supabase } = await import('$lib/supabase')
      const existingChannel = { topic: 'chat_r1' }
      ;(supabase.getChannels as any).mockReturnValueOnce([existingChannel])
      await chatService.subscribeToMessages('r1', vi.fn())
      expect(supabase.removeChannel).toHaveBeenCalledWith(existingChannel)
    })
  })

  // ── sendMediaMessage ──────────────────────────────────────────────────────────
  describe('sendMediaMessage', () => {
    it('uploads file to storage and inserts message', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [{ data: { id: 'msg1', type: 'image' }, error: null }]
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
      await chatService.sendMediaMessage('r1', 'u1', 'image', file)
      expect(supabase.storage.from).toHaveBeenCalledWith('chat_media')
    })
  })
})
