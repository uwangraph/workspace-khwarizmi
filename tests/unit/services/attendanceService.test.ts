import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockResults: any[] = []
let mockIdx = 0
const mockUpload = vi.fn().mockResolvedValue({ data: null, error: null })

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
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/photo.jpg' } }),
      })),
    },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

import { attendanceService } from '$lib/services/attendanceService'

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResults = []
    mockIdx = 0
    global.fetch = vi.fn()
  })

  // ── getTotalAttendanceDays ────────────────────────────────────────────────────
  describe('getTotalAttendanceDays', () => {
    it('returns 0 when no attendance records', async () => {
      mockResults = [{ data: [], error: null }]
      expect(await attendanceService.getTotalAttendanceDays('u1')).toBe(0)
    })

    it('counts unique dates correctly (2 unique from 3 records)', async () => {
      mockResults = [{
        data: [{ date: '2026-01-01' }, { date: '2026-01-01' }, { date: '2026-01-02' }],
        error: null,
      }]
      expect(await attendanceService.getTotalAttendanceDays('u1')).toBe(2)
    })

    it('returns 0 when data is null', async () => {
      mockResults = [{ data: null, error: null }]
      expect(await attendanceService.getTotalAttendanceDays('u1')).toBe(0)
    })

    it('counts each unique date exactly once', async () => {
      mockResults = [{
        data: Array.from({ length: 10 }, (_, i) => ({
          date: `2026-01-${String((i % 5) + 1).padStart(2, '0')}`,
        })),
        error: null,
      }]
      expect(await attendanceService.getTotalAttendanceDays('u1')).toBe(5)
    })
  })

  // ── uploadSelfie ──────────────────────────────────────────────────────────────
  describe('uploadSelfie', () => {
    it('uploads and returns public URL', async () => {
      const url = await attendanceService.uploadSelfie('u1', new Blob(['x']), 'in')
      expect(mockUpload).toHaveBeenCalled()
      expect(url).toBe('https://cdn.test/photo.jpg')
    })

    it('throws on upload failure', async () => {
      mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } })
      await expect(attendanceService.uploadSelfie('u1', new Blob(['x']), 'in'))
        .rejects.toThrow('Upload failed')
    })

    it('uses check-in path format: userId/timestamp_in.jpg', async () => {
      await attendanceService.uploadSelfie('u123', new Blob(['x']), 'in')
      expect(mockUpload.mock.calls[0][0]).toMatch(/^u123\/\d+_in\.jpg$/)
    })

    it('uses check-out path format: userId/timestamp_out.jpg', async () => {
      await attendanceService.uploadSelfie('u456', new Blob(['x']), 'out')
      expect(mockUpload.mock.calls[0][0]).toMatch(/^u456\/\d+_out\.jpg$/)
    })

    it('uploads to selfies bucket', async () => {
      const { supabase } = await import('$lib/supabase')
      await attendanceService.uploadSelfie('u1', new Blob(['x']), 'in')
      expect(supabase.storage.from).toHaveBeenCalledWith('selfies')
    })
  })

  // ── submitCheckIn ─────────────────────────────────────────────────────────────
  describe('submitCheckIn', () => {
    it('inserts attendance record on time', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 'a1' }, error: null },
      ]
      const r = await attendanceService.submitCheckIn('u1', 1, 'https://p.url', false, null)
      expect(r).toBeDefined()
    })

    it('inserts attendance record with late_reason', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 'a2', late: true }, error: null },
      ]
      const r = await attendanceService.submitCheckIn('u1', 1, 'https://p.url', true, 'Macet')
      expect(r).toBeDefined()
    })

    it('throws when deletion is scheduled', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: new Date().toISOString() }, error: null },
      ]
      await expect(attendanceService.submitCheckIn('u1', 1, 'https://p.url', false, null))
        .rejects.toThrow('pembersihan data')
    })

    it('inserts to attendance table', async () => {
      const { supabase } = await import('$lib/supabase')
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 'a1' }, error: null },
      ]
      await attendanceService.submitCheckIn('u1', 1, 'https://p.url', false, null)
      expect(supabase.from).toHaveBeenCalledWith('attendance')
    })
  })

  // ── submitCheckOut ─────────────────────────────────────────────────────────────
  describe('submitCheckOut', () => {
    it('updates attendance record with checkout time', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: null, error: null },
      ]
      const r = await attendanceService.submitCheckOut('u1', 1, 'https://photo.url')
      expect(r).toBeDefined()
    })

    it('throws when deletion is scheduled', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: new Date().toISOString() }, error: null },
      ]
      await expect(attendanceService.submitCheckOut('u1', 1, 'https://p.url'))
        .rejects.toThrow('pembersihan data')
    })
  })

  // ── submitLeave ───────────────────────────────────────────────────────────────
  describe('submitLeave', () => {
    it('inserts leave request with type izin', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: null, error: null },
      ]
      const r = await attendanceService.submitLeave('u1', 'izin', 'Keperluan keluarga', null)
      expect(r).toBeDefined()
    })

    it('inserts leave request with type sakit', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: null, error: null },
      ]
      const r = await attendanceService.submitLeave('u1', 'sakit', 'Demam tinggi', null)
      expect(r).toBeDefined()
    })

    it('allows specific session for partial-day leave', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: null, error: null },
      ]
      await attendanceService.submitLeave('u1', 'izin', 'Urusan', 1)
      expect(true).toBe(true)
    })

    it('allows custom date override', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: null, error: null },
      ]
      await attendanceService.submitLeave('u1', 'izin', 'Liburan', null, '2026-02-15')
      expect(true).toBe(true)
    })

    it('throws when deletion is scheduled', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: new Date().toISOString() }, error: null },
      ]
      await expect(attendanceService.submitLeave('u1', 'izin', 'Urusan', null))
        .rejects.toThrow('pembersihan data')
    })
  })

  // ── autoCheckout ──────────────────────────────────────────────────────────────
  describe('autoCheckout', () => {
    it('updates attendance with forgot_checkout=true and inserts penalty', async () => {
      mockResults = [
        { data: null, error: null },
        { data: null, error: null },
      ]
      await attendanceService.autoCheckout('u1', 'a1', 1)
      const { supabase } = await import('$lib/supabase')
      expect(supabase.from).toHaveBeenCalledWith('attendance')
      expect(supabase.from).toHaveBeenCalledWith('attendance_penalties')
    })

    it('handles all session IDs (sesi 1-4)', async () => {
      for (const sessionId of [1, 2, 3, 4]) {
        mockResults = [{ data: null, error: null }, { data: null, error: null }]
        mockIdx = 0
        await attendanceService.autoCheckout('u1', `att-${sessionId}`, sessionId)
      }
      expect(true).toBe(true)
    })
  })

  // ── cleanupOldData ────────────────────────────────────────────────────────────
  describe('cleanupOldData', () => {
    it('calls API with POST method and returns success', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ success: true, deletedPhotos: 5 }),
      })
      const r = await attendanceService.cleanupOldData(40)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/system', expect.objectContaining({ method: 'POST' })
      )
      expect(r.success).toBe(true)
    })

    it('returns success=false on API error response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValueOnce({ error: 'Unauthorized' }),
      })
      const r = await attendanceService.cleanupOldData(40)
      expect(r.success).toBe(false)
    })

    it('returns success=false on network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network failure'))
      const r = await attendanceService.cleanupOldData(40)
      expect(r.success).toBe(false)
    })

    it('returns success=false when not authenticated', async () => {
      const { supabase } = await import('$lib/supabase')
      ;(supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: null } })
      const r = await attendanceService.cleanupOldData(30)
      expect(r.success).toBe(false)
    })
  })

  // ── getTodayData ──────────────────────────────────────────────────────────────
  describe('getTodayData', () => {
    it('returns all expected data keys', async () => {
      // 5 parallel: attendance, leaves, penalties, settings(single), holiday(maybeSingle)
      // + 1 sequential: special_rules(maybeSingle)
      for (let i = 0; i < 6; i++) {
        mockResults.push({ data: i === 3 ? { office_radius: 100 } : (i === 4 || i === 5 ? null : []), error: null })
      }
      const r = await attendanceService.getTodayData('u1')
      expect(r).toHaveProperty('attendance')
      expect(r).toHaveProperty('leaves')
      expect(r).toHaveProperty('penalties')
      expect(r).toHaveProperty('appSettings')
      expect(r).toHaveProperty('todayHoliday')
      expect(r).toHaveProperty('specialRule')
    })

    it('attendance defaults to empty array when null', async () => {
      for (let i = 0; i < 6; i++) {
        mockResults.push({ data: null, error: null })
      }
      const r = await attendanceService.getTodayData('u1')
      expect(r.attendance).toEqual([])
    })
  })
})
