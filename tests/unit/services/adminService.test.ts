import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockResults: any[] = []
let mockIdx = 0

function makeChain() {
  const c: any = {}
  ;['select','insert','update','delete','upsert','eq','neq','gte','lte','gt','lt','in','or','order','limit','range','single','maybeSingle'].forEach(m => {
    c[m] = vi.fn().mockImplementation(() => {
      if (m === 'single' || m === 'maybeSingle') {
        return Promise.resolve(mockResults[mockIdx++] || { data: null, error: null })
      }
      const res = mockResults[mockIdx++] || { data: null, error: null }
      const thenable: any = {}
      ;['select','insert','update','delete','upsert','eq','neq','gte','lte','gt','lt','in','or','order','limit','range','single','maybeSingle'].forEach(mm => {
        thenable[mm] = vi.fn().mockReturnValue(thenable)
      })
      thenable.single = vi.fn().mockResolvedValue(res)
      thenable.maybeSingle = vi.fn().mockResolvedValue(res)
      thenable.then = (cb: any) => Promise.resolve(res).then(cb)
      thenable.catch = (cb: any) => Promise.resolve(res).catch(cb)
      return thenable
    })
  })
  const firstRes = mockResults[0] || { data: null, error: null }
  c.then = (cb: any) => Promise.resolve(firstRes).then(cb)
  c.catch = (cb: any) => Promise.resolve(firstRes).catch(cb)
  return c
}

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: () => makeChain(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

import { adminService } from '$lib/services/adminService'

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResults = []
    mockIdx = 0
    global.fetch = vi.fn()
  })

  describe('fetchAllData', () => {
    it('returns all data structure', async () => {
      // 8 parallel calls: users, tasks, attendance, assignments, holidays, settings, leaves, specialRules
      for (let i = 0; i < 8; i++) {
        mockResults.push({ data: [], error: null })
      }
      mockResults[5] = { data: { office_lat: -6.2, office_lng: 106.8, office_radius: 100 }, error: null }
      const r = await adminService.fetchAllData('2026-01')
      expect(r).toHaveProperty('users')
      expect(r).toHaveProperty('tasks')
      expect(r).toHaveProperty('attendance')
      expect(r).toHaveProperty('assignments')
      expect(r).toHaveProperty('holidays')
      expect(r).toHaveProperty('settings')
      expect(r).toHaveProperty('leaves')
      expect(r).toHaveProperty('specialRules')
    })
  })

  describe('fetchAttendanceData', () => {
    it('fetches attendance for a month', async () => {
      mockResults = [
        { data: [{ id: 'a1', user_id: 'u1', date: '2026-01-15' }], error: null },
        { data: [{ id: 'l1', user_id: 'u1', date: '2026-01-20' }], error: null },
      ]
      const r = await adminService.fetchAttendanceData('2026-01')
      expect(r.attendance).toHaveLength(1)
      expect(r.leaves).toHaveLength(1)
    })
  })

  describe('updateUser', () => {
    it('updates user data', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await adminService.updateUser('u1', { full_name: 'Updated' })
      expect(r.error).toBeNull()
    })
  })

  describe('deleteUser', () => {
    it('calls API to delete user', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.deleteUser('u1')
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users?id=u1', expect.objectContaining({ method: 'DELETE' }))
    })

    it('returns error on API failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: false, json: vi.fn().mockResolvedValueOnce({ error: 'Not authorized' }) })
      const r = await adminService.deleteUser('u1')
      expect(r.error).toBe('Not authorized')
    })
  })

  describe('createUser', () => {
    it('calls API to create user', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ user: { id: 'new' } }) })
      const r = await adminService.createUser({ name: 'New', email: 'n@t.com', password: 'pass1234', position: 'Dev', role: 'user' })
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ method: 'POST' }))
    })
  })

  describe('saveHoliday', () => {
    it('saves a holiday', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ data: { id: 'h1', name: 'New Year' } }) })
      const r = await adminService.saveHoliday({ name: 'New Year', date: '2026-01-01' })
      expect(r.error).toBeNull()
    })

    it('handles duplicate error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: false, json: vi.fn().mockResolvedValueOnce({ error: 'Duplicate' }) })
      const r = await adminService.saveHoliday({ name: 'Dup', date: '2026-01-01' })
      expect(r.error).toBeDefined()
    })
  })

  describe('deleteHoliday', () => {
    it('deletes a holiday', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.deleteHoliday('h1')
      expect(r.error).toBeNull()
    })
  })

  describe('saveSpecialRule', () => {
    it('saves a special rule', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ data: { id: 'sr1', type: 'custom_time' } }) })
      const r = await adminService.saveSpecialRule({ date: '2026-01-15', type: 'custom_time' })
      expect(r.error).toBeNull()
    })
  })

  describe('deleteSpecialRule', () => {
    it('deletes a special rule', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.deleteSpecialRule('sr1')
      expect(r.error).toBeNull()
    })
  })

  describe('updateSettings', () => {
    it('updates app settings', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.updateSettings({ office_lat: -6.2, office_lng: 106.8, office_radius: 150 })
      expect(r.error).toBeNull()
    })
  })

  describe('updateLeaveStatus', () => {
    it('approves a leave', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.updateLeaveStatus('l1', 'approved', 'admin1')
      expect(r.error).toBeNull()
    })

    it('rejects a leave with note', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.updateLeaveStatus('l1', 'rejected', 'admin1', 'Alasan kurang')
      expect(r.error).toBeNull()
    })
  })

  describe('scheduleDeletion', () => {
    it('schedules data deletion', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true, deletion_scheduled_at: '2026-01-15T00:00:00Z' }) })
      const r = await adminService.scheduleDeletion()
      expect(r.data).toBeDefined()
    })
  })

  describe('cancelDeletion', () => {
    it('cancels scheduled deletion', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.cancelDeletion()
      expect(r.data).toBeDefined()
    })
  })

  describe('checkScheduledDeletion', () => {
    it('returns true when deletion is pending (within 24h)', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const r = await adminService.checkScheduledDeletion({ deletion_scheduled_at: oneHourAgo })
      expect(r).toBe(true)
    })

    it('returns false when no deletion scheduled', async () => {
      const r = await adminService.checkScheduledDeletion({ deletion_scheduled_at: null })
      expect(r).toBe(false)
    })

    it('returns false when deletion window passed (>24h)', async () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const r = await adminService.checkScheduledDeletion({ deletion_scheduled_at: twoDaysAgo })
      expect(r).toBe(false)
    })
  })

  describe('clearAllTransactionData', () => {
    it('clears all transaction data', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValueOnce({ success: true }) })
      const r = await adminService.clearAllTransactionData()
      expect(r.data).toBeDefined()
    })
  })

  describe('getPendingLeavesCount', () => {
    it('returns pending count', async () => {
      mockResults = [{ count: 3, error: null }]
      const r = await adminService.getPendingLeavesCount()
      expect(r).toBe(3)
    })

    it('returns 0 on error', async () => {
      mockResults = [{ count: null, error: { message: 'err' } }]
      const r = await adminService.getPendingLeavesCount()
      expect(r).toBe(0)
    })
  })
})
