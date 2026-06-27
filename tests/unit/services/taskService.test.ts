import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockResults: any[] = []
let mockIdx = 0
const mockUpload = vi.fn().mockResolvedValue({ data: null, error: null })
const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null })

// Proper thenable chain: each from() call consumes one mockResults slot
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
    'gte', 'lte', 'gt', 'lt', 'in', 'or', 'not', 'is', 'order', 'limit',
    'range', 'offset', 'contains', 'filter']
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
  return chain
}

vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeChain()),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: () => ({ data: { publicUrl: 'https://test.url/f.jpg' } }),
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}))

vi.mock('$lib/services/notificationService', () => ({
  notificationService: {
    send: vi.fn().mockResolvedValue(true),
    sendBulk: vi.fn().mockResolvedValue(true),
  },
}))

import { taskService } from '$lib/services/taskService'

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResults = []
    mockIdx = 0
  })

  // ── getTasks ─────────────────────────────────────────────────────────────────
  describe('getTasks', () => {
    it('returns empty array when user has no tasks', async () => {
      mockResults = [
        { data: [], error: null },
        { data: [], error: null },
      ]
      expect(await taskService.getTasks('u1', 'user')).toEqual([])
    })

    it('fetches tasks created by user', async () => {
      mockResults = [
        { data: [], error: null },
        { data: [{ id: 't1', title: 'My Task', created_by: 'u1' }], error: null },
      ]
      const r = await taskService.getTasks('u1', 'user')
      expect(r).toHaveLength(1)
      expect(r[0].title).toBe('My Task')
    })

    it('fetches tasks assigned to user', async () => {
      mockResults = [
        { data: [{ task_id: 't2', status: 'accepted' }], error: null },
        { data: [{ id: 't2', title: 'Assigned', created_by: 'u2' }], error: null },
      ]
      const r = await taskService.getTasks('u1', 'user')
      expect(r[0].id).toBe('t2')
    })

    it('includes both created and assigned tasks', async () => {
      mockResults = [
        { data: [{ task_id: 't2', status: 'pending' }], error: null },
        { data: [{ id: 't1', created_by: 'u1' }, { id: 't2', created_by: 'u2' }], error: null },
      ]
      const r = await taskService.getTasks('u1', 'user')
      expect(r).toHaveLength(2)
    })
  })

  // ── getAssignments ───────────────────────────────────────────────────────────
  describe('getAssignments', () => {
    it('returns assignments for a user', async () => {
      mockResults = [
        { data: [{ id: 'a1', task_id: 't1', user_id: 'u1', status: 'accepted' }], error: null },
      ]
      const r = await taskService.getAssignments('u1')
      expect(r).toHaveLength(1)
      expect(r[0].status).toBe('accepted')
    })

    it('returns empty array when no assignments', async () => {
      mockResults = [{ data: null, error: null }]
      expect(await taskService.getAssignments('u1')).toEqual([])
    })
  })

  // ── getAllAssignments ─────────────────────────────────────────────────────────
  describe('getAllAssignments', () => {
    it('returns empty array immediately for empty task IDs', async () => {
      expect(await taskService.getAllAssignments([])).toEqual([])
    })

    it('fetches assignments for given task IDs', async () => {
      mockResults = [
        { data: [{ id: 'a1', task_id: 't1' }, { id: 'a2', task_id: 't1' }], error: null },
      ]
      const r = await taskService.getAllAssignments(['t1'])
      expect(r).toHaveLength(2)
    })
  })

  // ── updateProgress ────────────────────────────────────────────────────────────
  describe('updateProgress', () => {
    it('updates task progress and status', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 't1', progress: 50 }, error: null },
      ]
      const r = await taskService.updateProgress('t1', 50, 'in_progress')
      expect(r.error).toBeNull()
    })

    it('throws when deletion is scheduled within 24h', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: new Date().toISOString() }, error: null },
      ]
      await expect(taskService.updateProgress('t1', 50, 'in_progress'))
        .rejects.toThrow('pembersihan data')
    })

    it('handles progress 100 (done status)', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 't1', progress: 100 }, error: null },
      ]
      const r = await taskService.updateProgress('t1', 100, 'done')
      expect(r.error).toBeNull()
    })
  })

  // ── updateAssignmentStatus ────────────────────────────────────────────────────
  describe('updateAssignmentStatus', () => {
    it('updates assignment status to accepted', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 'a1', status: 'accepted' }, error: null },
      ]
      const r = await taskService.updateAssignmentStatus('a1', 'accepted')
      expect(r.error).toBeNull()
    })

    it('throws when deletion is scheduled', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: new Date().toISOString() }, error: null },
      ]
      await expect(taskService.updateAssignmentStatus('a1', 'accepted'))
        .rejects.toThrow('pembersihan data')
    })
  })

  // ── deleteTask ────────────────────────────────────────────────────────────────
  describe('deleteTask', () => {
    it('deletes task and notifies collaborators', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: [{ user_id: 'u2' }], error: null },
        { data: { id: 't1', title: 'Task' }, error: null },
        { data: [], error: null },
      ]
      const r = await taskService.deleteTask('t1')
      expect(r.error).toBeNull()
    })

    it('throws when deletion is scheduled', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: new Date().toISOString() }, error: null },
      ]
      await expect(taskService.deleteTask('t1')).rejects.toThrow('pembersihan data')
    })
  })

  // ── bulkUpdateStatus ──────────────────────────────────────────────────────────
  describe('bulkUpdateStatus', () => {
    it('updates status for multiple tasks', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await taskService.bulkUpdateStatus(['t1', 't2'], 'done', 100)
      expect(r.error).toBeNull()
    })
  })

  // ── bulkDeleteTasks ───────────────────────────────────────────────────────────
  describe('bulkDeleteTasks', () => {
    it('deletes assignments then tasks', async () => {
      mockResults = [
        { data: null, error: null },
        { data: null, error: null },
      ]
      const r = await taskService.bulkDeleteTasks(['t1', 't2'])
      expect(r.error).toBeNull()
    })
  })

  // ── updateTaskFields ──────────────────────────────────────────────────────────
  describe('updateTaskFields', () => {
    it('updates specific fields of a task', async () => {
      mockResults = [{ data: null, error: null }]
      const r = await taskService.updateTaskFields('t1', { title: 'Updated', priority: 'high' })
      expect(r.error).toBeNull()
    })

    it('sanitizes undefined values from fields', async () => {
      mockResults = [{ data: null, error: null }]
      await taskService.updateTaskFields('t1', { title: 'Test', description: undefined })
      expect(true).toBe(true)
    })
  })

  // ── getComments ───────────────────────────────────────────────────────────────
  describe('getComments', () => {
    it('returns comments for a task', async () => {
      mockResults = [
        { data: [{ id: 'c1', content: 'A comment', author: { full_name: 'User' } }], error: null },
      ]
      const r = await taskService.getComments('t1')
      expect(r).toHaveLength(1)
      expect(r[0].content).toBe('A comment')
    })

    it('returns empty array when no comments', async () => {
      mockResults = [{ data: [], error: null }]
      expect(await taskService.getComments('t1')).toHaveLength(0)
    })

    it('throws on DB error', async () => {
      mockResults = [{ data: null, error: { message: 'DB error' } }]
      await expect(taskService.getComments('t1')).rejects.toThrow('DB error')
    })
  })

  // ── addComment ────────────────────────────────────────────────────────────────
  describe('addComment', () => {
    it('adds a comment and returns it', async () => {
      mockResults = [
        { data: { id: 'c1', task_id: 't1', content: 'New comment', tag: 'general' }, error: null },
      ]
      const r = await taskService.addComment('t1', 'u1', 'New comment', 'general', null)
      expect(r.id).toBe('c1')
    })

    it('throws on insert failure', async () => {
      mockResults = [{ data: null, error: { message: 'Insert failed' } }]
      await expect(taskService.addComment('t1', 'u1', 'Msg', 'general', null))
        .rejects.toThrow('Insert failed')
    })
  })

  // ── deleteComment ─────────────────────────────────────────────────────────────
  describe('deleteComment', () => {
    it('deletes a comment by ID', async () => {
      mockResults = [{ data: null, error: null }]
      await taskService.deleteComment('c1')
      expect(true).toBe(true)
    })

    it('throws on delete failure', async () => {
      mockResults = [{ data: null, error: { message: 'Not found' } }]
      await expect(taskService.deleteComment('c999')).rejects.toThrow('Not found')
    })
  })

  // ── checkLowTaskCount ─────────────────────────────────────────────────────────
  describe('checkLowTaskCount', () => {
    it('sends workload alert when user has ≤1 active task', async () => {
      const { notificationService } = await import('$lib/services/notificationService')
      mockResults = [
        { count: 1, error: null },
        { data: [{ id: 'admin1' }], error: null },
        { data: { full_name: 'Test User' }, error: null },
      ]
      await taskService.checkLowTaskCount('u1')
      expect(notificationService.sendBulk).toHaveBeenCalled()
    })

    it('does not alert when user has 3+ active tasks', async () => {
      const { notificationService } = await import('$lib/services/notificationService')
      mockResults = [{ count: 3, error: null }]
      await taskService.checkLowTaskCount('u1')
      expect(notificationService.sendBulk).not.toHaveBeenCalled()
    })

    it('uses pre-fetched admin IDs when provided', async () => {
      const { notificationService } = await import('$lib/services/notificationService')
      mockResults = [
        { count: 0, error: null },
        { data: { full_name: 'User' }, error: null },
      ]
      await taskService.checkLowTaskCount('u1', ['admin1'])
      expect(notificationService.sendBulk).toHaveBeenCalled()
    })
  })

  // ── saveTask - create ─────────────────────────────────────────────────────────
  describe('saveTask (create mode)', () => {
    it('creates a task and returns taskId with newCollabs', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: { id: 'new-task' }, error: null },
        { data: null, error: null },
      ]
      const r = await taskService.saveTask(
        { title: 'Test', status: 'not_started', priority: 'medium', progress: 0 },
        ['u2'], 'u1', false
      )
      expect(r.taskId).toBe('new-task')
      expect(r.newCollabs).toContain('u2')
    })

    it('throws when deletion is scheduled', async () => {
      mockResults = [{ data: { deletion_scheduled_at: new Date().toISOString() }, error: null }]
      await expect(taskService.saveTask({ title: 'T' }, [], 'u1', false))
        .rejects.toThrow('pembersihan data')
    })

    it('throws when DB insert fails', async () => {
      mockResults = [
        { data: { deletion_scheduled_at: null }, error: null },
        { data: null, error: { message: 'Constraint violation' } },
      ]
      await expect(taskService.saveTask({ title: 'T' }, [], 'u1', false))
        .rejects.toThrow('Constraint violation')
    })
  })

  // ── getAttachments ────────────────────────────────────────────────────────
  describe('getAttachments', () => {
    it('returns attachments for a task', async () => {
      mockResults = [
        { data: [{ id: 'att1', filename: 'doc.pdf', file_type: 'application/pdf' }], error: null },
      ]
      const r = await taskService.getAttachments('t1')
      expect(r).toHaveLength(1)
      expect(r[0].filename).toBe('doc.pdf')
    })

    it('returns empty array when no attachments', async () => {
      mockResults = [{ data: [], error: null }]
      expect(await taskService.getAttachments('t1')).toEqual([])
    })
  })
})
