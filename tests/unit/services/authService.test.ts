import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpload } = vi.hoisted(() => ({
  mockUpload: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/avatar.jpg' } }),
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 't@t.com' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

// Proper thenable chain — resolves to `result` when awaited or via .single()/.maybeSingle()
function makeChain(result: any) {
  const chain: any = {
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(result).catch(onRejected),
    finally: (fn: any) => Promise.resolve(result).finally(fn),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
    'gte', 'lte', 'gt', 'lt', 'in', 'or', 'not', 'is', 'order', 'limit', 'range',
    'offset', 'contains', 'filter']
  for (const m of chainMethods) chain[m] = vi.fn().mockReturnValue(chain)
  return chain
}

import { authService } from '$lib/services/authService'

describe('authService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── getSession ──────────────────────────────────────────────────────────────
  describe('getSession', () => {
    it('returns session when logged in', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: { user: { id: 'u1' } } }, error: null,
      })
      const r = await authService.getSession()
      expect(r.data.session).toBeDefined()
    })

    it('returns null session when not logged in', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: null }, error: null })
      const r = await authService.getSession()
      expect(r.data.session).toBeNull()
    })
  })

  // ── getUser ─────────────────────────────────────────────────────────────────
  describe('getUser', () => {
    it('returns user object when authenticated', async () => {
      const { supabase } = await import('$lib/supabase')
      const user = { id: 'u1', email: 't@t.com' }
      ;(supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user }, error: null })
      expect(await authService.getUser()).toEqual(user)
    })

    it('returns null when not authenticated', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null }, error: null })
      expect(await authService.getUser()).toBeNull()
    })
  })

  // ── getProfile ──────────────────────────────────────────────────────────────
  describe('getProfile', () => {
    it('returns profile data', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(
        makeChain({ data: { id: 'u1', full_name: 'Test User', role: 'user' }, error: null })
      )
      const { data } = await authService.getProfile('u1')
      expect(data?.full_name).toBe('Test User')
      expect(data?.role).toBe('user')
    })

    it('returns null when profile not found', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(makeChain({ data: null, error: null }))
      const { data } = await authService.getProfile('nonexistent')
      expect(data).toBeNull()
    })

    it('returns error on DB failure', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(
        makeChain({ data: null, error: { message: 'DB error', code: '500' } })
      )
      const { error } = await authService.getProfile('u1')
      expect(error).toBeDefined()
    })

    it('queries profiles table', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(makeChain({ data: null, error: null }))
      await authService.getProfile('u1')
      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })
  })

  // ── signOut ─────────────────────────────────────────────────────────────────
  describe('signOut', () => {
    it('signs out successfully', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.signOut as any).mockResolvedValueOnce({ error: null })
      const { error } = await authService.signOut()
      expect(error).toBeNull()
    })

    it('returns error when signOut fails', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.signOut as any).mockResolvedValueOnce({ error: { message: 'Session gone' } })
      const { error } = await authService.signOut()
      expect(error).toBeDefined()
    })
  })

  // ── updateProfile ────────────────────────────────────────────────────────────
  describe('updateProfile', () => {
    it('updates profile data and returns no error', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(makeChain({ data: null, error: null }))
      const r = await authService.updateProfile('u1', { full_name: 'New Name' })
      expect(r.error).toBeNull()
    })

    it('returns error when update fails', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(
        makeChain({ data: null, error: { message: 'Permission denied' } })
      )
      const r = await authService.updateProfile('u1', { full_name: 'Test' })
      expect(r.error).toBeDefined()
    })
  })

  // ── uploadAvatar ─────────────────────────────────────────────────────────────
  describe('uploadAvatar', () => {
    it('uploads successfully and returns public URL', async () => {
      const blob = new Blob(['img'], { type: 'image/jpeg' })
      const url = await authService.uploadAvatar('u1', blob)
      expect(mockUpload).toHaveBeenCalled()
      expect(url).toBe('https://cdn.test/avatar.jpg')
    })

    it('throws when upload fails', async () => {
      mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'File too large' } })
      await expect(authService.uploadAvatar('u1', new Blob(['x']))).rejects.toThrow('File too large')
    })

    it('uses path format userId/timestamp.jpg', async () => {
      await authService.uploadAvatar('user-abc', new Blob(['x']))
      expect(mockUpload.mock.calls[0][0]).toMatch(/^user-abc\/\d+\.jpg$/)
    })

    it('uploads to avatars bucket', async () => {
      const { supabase } = await import('$lib/supabase')
      await authService.uploadAvatar('u1', new Blob(['x']))
      expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
    })

    it('passes upsert=true in upload options', async () => {
      await authService.uploadAvatar('u1', new Blob(['x']))
      expect(mockUpload.mock.calls[0][2]).toMatchObject({ upsert: true })
    })
  })

  // ── verifyPassword ───────────────────────────────────────────────────────────
  describe('verifyPassword', () => {
    it('returns no error for correct credentials', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { user: { id: 'u1' } }, error: null,
      })
      const r = await authService.verifyPassword('t@t.com', 'correct')
      expect(r.error).toBeNull()
    })

    it('returns error for wrong password', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { user: null }, error: { message: 'Invalid credentials' },
      })
      const r = await authService.verifyPassword('t@t.com', 'wrong')
      expect(r.error).toBeDefined()
    })

    it('calls signInWithPassword with email and password', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.signInWithPassword as any).mockResolvedValueOnce({ data: { user: null }, error: null })
      await authService.verifyPassword('hello@test.com', 'pass123')
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'hello@test.com', password: 'pass123',
      })
    })
  })

  // ── changeEmail ──────────────────────────────────────────────────────────────
  describe('changeEmail', () => {
    it('updates email successfully', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.updateUser as any).mockResolvedValueOnce({
        data: { user: { email: 'new@t.com' } }, error: null,
      })
      const r = await authService.changeEmail('new@t.com')
      expect(r.error).toBeNull()
    })

    it('calls updateUser with email field', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.updateUser as any).mockResolvedValueOnce({ data: { user: null }, error: null })
      await authService.changeEmail('changed@t.com')
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: 'changed@t.com' })
    })
  })

  // ── changePassword ───────────────────────────────────────────────────────────
  describe('changePassword', () => {
    it('updates password successfully', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.updateUser as any).mockResolvedValueOnce({
        data: { user: { id: 'u1' } }, error: null,
      })
      const r = await authService.changePassword('newSecurePass')
      expect(r.error).toBeNull()
    })

    it('calls updateUser with password field', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.updateUser as any).mockResolvedValueOnce({ data: { user: null }, error: null })
      await authService.changePassword('myNewPass')
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'myNewPass' })
    })
  })

  // ── resetPasswordForEmail ────────────────────────────────────────────────────
  describe('resetPasswordForEmail', () => {
    it('sends reset email and returns no error', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({ data: {}, error: null })
      const r = await authService.resetPasswordForEmail('t@t.com')
      expect(r.error).toBeNull()
    })

    it('redirectTo URL contains /auth/reset', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({ data: {}, error: null })
      await authService.resetPasswordForEmail('t@t.com')
      const [, opts] = (supabase.auth.resetPasswordForEmail as any).mock.calls[0]
      expect(opts.redirectTo).toContain('/auth/reset')
    })

    it('returns error when email not found', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
        data: {}, error: { message: 'User not found' },
      })
      const r = await authService.resetPasswordForEmail('unknown@t.com')
      expect(r.error).toBeDefined()
    })
  })

  // ── getAllUsers ──────────────────────────────────────────────────────────────
  describe('getAllUsers', () => {
    it('returns list of users', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(
        makeChain({
          data: [{ id: 'u1', full_name: 'Alice' }, { id: 'u2', full_name: 'Bob' }],
          error: null,
        })
      )
      const r = await authService.getAllUsers()
      expect(r.data).toHaveLength(2)
      expect(r.data?.[0].full_name).toBe('Alice')
    })

    it('queries profiles table', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(makeChain({ data: [], error: null }))
      await authService.getAllUsers()
      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('returns empty array when no users', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(makeChain({ data: [], error: null }))
      const r = await authService.getAllUsers()
      expect(r.data).toHaveLength(0)
    })
  })

  // ── updateLastSeen ───────────────────────────────────────────────────────────
  describe('updateLastSeen', () => {
    it('updates last_seen timestamp without error', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.from as any).mockReturnValueOnce(makeChain({ data: null, error: null }))
      const r = await authService.updateLastSeen('u1')
      expect(r.error).toBeNull()
    })
  })
})
