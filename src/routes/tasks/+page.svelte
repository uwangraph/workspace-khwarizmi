<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

  // ── Types ──────────────────────────────────────────
  interface Profile {
    id: string
    full_name: string
    role: 'admin' | 'user'
    avatar_url?: string | null
  }

  interface Task {
    id: string
    title: string
    description: string | null
    status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
    priority: 'low' | 'medium' | 'high'
    progress: number
    start_date: string | null
    due_date: string | null
    created_by: string
    created_at: string
  }

  interface TaskAssignment {
    id: string
    task_id: string
    user_id: string
    status: 'pending' | 'accepted' | 'rejected' | 'completed'
    accepted_at: string | null
    completed_at: string | null
  }

  interface UserProfile {
    id: string
    full_name: string
    avatar_url?: string | null
  }

  // ── Constants ──────────────────────────────────────
  const PRIORITY_LABEL: Record<string, string> = {
    low: 'Rendah', medium: 'Sedang', high: 'Tinggi'
  }
  const PRIORITY_DOT: Record<string, string> = {
    low: '#94A3B8', medium: '#F59E0B', high: '#EF4444'
  }
  const STATUS_LABEL: Record<string, string> = {
    not_started: 'Belum Dikerjakan',
    in_progress: 'Sedang Dikerjakan',
    review: 'Review',
    revision: 'Revisi',
    done: 'Selesai'
  }
  const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
    not_started: { bg: 'bg-slate-100', text: 'text-slate-600', dot: '#94A3B8' },
    in_progress: { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: '#3B82F6' },
    review:      { bg: 'bg-purple-50', text: 'text-purple-700', dot: '#A855F7' },
    revision:    { bg: 'bg-amber-50',  text: 'text-amber-700', dot: '#F59E0B' },
    done:        { bg: 'bg-green-50',  text: 'text-green-700', dot: '#22C55E' },
  }

  // Label section kolaborator — pakai istilah yang lebih natural
  const CONTRIBUTORS_LABEL = 'Dikerjakan Oleh'

  // ── State ──────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let tasks = $state<Task[]>([])
  let assignments = $state<TaskAssignment[]>([])
  let allAssignments = $state<TaskAssignment[]>([])
  let users = $state<UserProfile[]>([])
  let isLoading = $state(true)

  // Modals
  let showTaskModal = $state(false)
  let showDetailModal = $state(false)
  let showProgressModal = $state(false)
  let showDeleteModal = $state(false)
  let showConfirmActionModal = $state(false)

  let detailTask = $state<Task | null>(null)

  let isEditing = $state(false)
  let editingTaskId = $state<string | null>(null)
  let isSubmitting = $state(false)
  let formError = $state('')
  let formFieldErrors = $state<Record<string, string>>({})

  let activeFilter = $state<'all' | 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'>('all')

  // Form
  let formTitle = $state('')
  let formDescription = $state('')
  let formStatus = $state<Task['status']>('not_started')
  let formPriority = $state<Task['priority']>('medium')
  let formProgress = $state(0)
  let formStartDate = $state('')
  let formDueDate = $state('')
  let formAssignedUsers = $state<string[]>([])

  // Progress
  let progressTaskId = $state<string | null>(null)
  let progressTaskTitle = $state('')
  let progressValue = $state(0)
  let initialProgressValue = $state(0)
  let isUpdatingProgress = $state(false)

  // Delete
  let deletingTaskId = $state<string | null>(null)
  let deletingTaskTitle = $state('')
  let isDeleting = $state(false)

  // Confirm action (accept/reject)
  let confirmAction = $state<'accept' | 'reject' | null>(null)
  let confirmActionTaskTitle = $state('')
  let confirmActionAssignmentId = $state<string | null>(null)
  let isConfirmingAction = $state(false)

  // Toast
  let toastMsg = $state('')
  let toastType = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer = 0

  // ── Helpers ────────────────────────────────────────
  function formatDateShort(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDueDate(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: `Terlambat ${Math.abs(diff)}h`, color: 'text-red-600', urgent: true }
    if (diff === 0) return { label: 'Hari ini', color: 'text-red-600', urgent: true }
    if (diff === 1) return { label: 'Besok', color: 'text-orange-600', urgent: false }
    if (diff <= 3) return { label: `${diff} hari lagi`, color: 'text-orange-600', urgent: false }
    return { label: `${diff} hari lagi`, color: 'text-slate-500', urgent: false }
  }

  function getStatusByProgress(progress: number): Task['status'] {
    if (progress === 0) return 'not_started'
    if (progress === 100) return 'done'
    if (progress >= 80) return 'review'
    return 'in_progress'
  }

  function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success', dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastType = type
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  function getUser(userId: string): UserProfile | null {
    return users.find(u => u.id === userId) || null
  }

  function getUserName(userId: string) {
    return getUser(userId)?.full_name || 'Pengguna'
  }

  function getUserAvatar(userId: string): string | null {
    return getUser(userId)?.avatar_url || null
  }

  function getUserAssignment(taskId: string) {
    return assignments.find(a => a.task_id === taskId) || null
  }

  function getTaskContributors(taskId: string) {
    return allAssignments
      .filter(a => a.task_id === taskId && a.status !== 'rejected')
      .map(a => ({
        id: a.user_id,
        name: getUserName(a.user_id),
        avatar: getUserAvatar(a.user_id),
        status: a.status,
      }))
  }

  function canEditTask(task: Task): boolean {
    if (profile?.role === 'admin') return true
    if (task.created_by === user?.id) return true
    const myA = assignments.find(a => a.task_id === task.id)
    return myA?.status === 'accepted'
  }

  function canDeleteTask(task: Task): boolean {
    if (profile?.role === 'admin') return true
    return task.created_by === user?.id
  }

  // Avatar component helper (returns gradient for fallback)
  function getAvatarGradient(status?: string) {
    if (status === 'pending') return 'linear-gradient(135deg, #60A5FA, #3B82F6)'
    if (status === 'completed') return 'linear-gradient(135deg, #A855F7, #7C3AED)'
    return 'linear-gradient(135deg, #F97316, #EA580C)'
  }

  // ── Notifications ──────────────────────────────────
  // Track apakah user pernah lihat warning notif biar ga spam
  let notifWarningShown = false

  /**
   * Insert notifikasi. Mencoba dua strategi secara berurutan:
   * 1. RPC `send_notification` (SECURITY DEFINER di Postgres — bypass RLS dengan aman)
   * 2. Fallback: insert langsung ke table
   *
   * Return true kalau setidaknya satu berhasil.
   */
  async function insertNotification(
    uid: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown> = {}
  ): Promise<boolean> {
    // Strategy 1: RPC
    try {
      const { error: rpcError } = await supabase.rpc('send_notification', {
        p_user_id: uid,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data,
      })
      if (!rpcError) return true
      // Kalau RPC function belum dibuat di DB, code-nya 42883 (undefined_function)
      // atau PGRST202 (function not found in schema cache). Lanjut ke fallback.
      if (rpcError.code !== '42883' && rpcError.code !== 'PGRST202') {
        console.warn('[insertNotification] RPC error:', rpcError)
      }
    } catch (e) {
      console.warn('[insertNotification] RPC exception:', e)
    }

    // Strategy 2: Direct insert
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: uid,
        type,
        title,
        message,
        data,
        is_read: false,
      })
      if (error) {
        console.error('[insertNotification] direct insert failed:', error, { uid, type, title })
        // Kasih signal ke user kalau ini masalah RLS
        if (!notifWarningShown && (error.code === '42501' || error.message?.includes('row-level security'))) {
          notifWarningShown = true
          showToast('Notifikasi tidak terkirim. Cek RLS policy Supabase.', 'error', 5000)
        }
        return false
      }
      return true
    } catch (e) {
      console.error('[insertNotification] direct insert exception:', e)
      return false
    }
  }

  async function insertNotificationMany(
    uids: string[],
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown> = {}
  ): Promise<{ success: number; failed: number }> {
    if (uids.length === 0) return { success: 0, failed: 0 }
    let success = 0
    let failed = 0
    // Sequential, supaya kita bisa track hasil per-user dan trigger warning cuma sekali
    for (const uid of uids) {
      const ok = await insertNotification(uid, type, title, message, data)
      if (ok) success++
      else failed++
    }
    if (failed > 0) {
      console.warn(`[insertNotificationMany] ${success}/${uids.length} berhasil. ${failed} gagal.`)
    }
    return { success, failed }
  }

  async function checkAndNotifyDeadlines() {
    if (!user) return
    const todayISO = new Date().toISOString().split('T')[0]
    const storageKey = `deadline_notified_${user.id}_${todayISO}`
    const alreadyNotified: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]')

    const myAcceptedTaskIds = new Set(
      assignments.filter(a => a.status === 'accepted').map(a => a.task_id)
    )

    const dueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      if (t.due_date.split('T')[0] !== todayISO) return false
      if (alreadyNotified.includes(t.id)) return false
      return myAcceptedTaskIds.has(t.id) || t.created_by === user!.id
    })

    if (dueTasks.length === 0) return

    for (const t of dueTasks) {
      await insertNotification(
        user.id,
        'task_deadline_today',
        'Deadline Hari Ini',
        `Tugas "${t.title}" harus diselesaikan hari ini.`,
        { task_id: t.id, task_title: t.title }
      )
    }

    localStorage.setItem(storageKey, JSON.stringify([...alreadyNotified, ...dueTasks.map(t => t.id)]))

    if (dueTasks.length === 1) showToast(`⏰ Deadline hari ini: "${dueTasks[0].title}"`, 'info', 4000)
    else showToast(`⏰ ${dueTasks.length} tugas deadline hari ini`, 'info', 4000)
  }

  // ── Loaders ────────────────────────────────────────
  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name')
    if (data) users = data as UserProfile[]
  }

  async function loadTasks() {
    if (!user) return

    if (profile?.role === 'admin') {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      if (data) tasks = data as Task[]
      return
    }

    const { data: myA } = await supabase
      .from('task_assignments')
      .select('task_id, status')
      .eq('user_id', user.id)
      .in('status', ['accepted', 'pending'])

    const visibleTaskIds = (myA || []).map(a => a.task_id)

    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

    if (visibleTaskIds.length > 0) {
      // Supabase .in() format: id.in.(uuid1,uuid2) — NO quotes around UUIDs
      const inList = visibleTaskIds.join(',')
      query = query.or(`created_by.eq.${user.id},id.in.(${inList})`)
    } else {
      query = query.eq('created_by', user.id)
    }

    const { data, error } = await query
    if (error) console.error('[loadTasks]', error)
    if (data) tasks = data as Task[]
  }

  async function loadAssignments() {
    if (!user) return
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('user_id', user.id)
    if (error) console.error('[loadAssignments]', error)
    if (data) assignments = data as TaskAssignment[]
  }

  async function loadAllAssignments() {
    if (tasks.length === 0) { allAssignments = []; return }
    const taskIds = tasks.map(t => t.id)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .in('task_id', taskIds)
    if (error) console.error('[loadAllAssignments]', error)
    if (data) allAssignments = data as TaskAssignment[]
  }

  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u

    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (p) profile = p as Profile

    await loadUsers()
    await loadTasks()
    await Promise.all([loadAssignments(), loadAllAssignments()])
    await checkAndNotifyDeadlines()
    isLoading = false
  }

  async function refreshAll() {
    await loadTasks()
    await Promise.all([loadAssignments(), loadAllAssignments()])
  }

  // ── Form Validation ────────────────────────────────
  function validateForm(): boolean {
    formFieldErrors = {}
    let valid = true

    if (!formTitle.trim()) {
      formFieldErrors.title = 'Judul wajib diisi'
      valid = false
    }
    if (!formDescription.trim()) {
      formFieldErrors.description = 'Deskripsi wajib diisi'
      valid = false
    }
    if (!formStartDate) {
      formFieldErrors.startDate = 'Tanggal mulai wajib diisi'
      valid = false
    }
    if (!formDueDate) {
      formFieldErrors.dueDate = 'Deadline wajib diisi'
      valid = false
    }
    if (formStartDate && formDueDate && new Date(formDueDate) < new Date(formStartDate)) {
      formFieldErrors.dueDate = 'Deadline harus setelah tanggal mulai'
      valid = false
    }

    if (!valid) formError = 'Mohon lengkapi semua field yang ditandai'
    return valid
  }

  // ── Task CRUD ──────────────────────────────────────
  function openCreateModal() {
    isEditing = false
    editingTaskId = null
    formTitle = ''
    formDescription = ''
    formStatus = 'not_started'
    formPriority = 'medium'
    formProgress = 0
    formStartDate = ''
    formDueDate = ''
    formAssignedUsers = []
    formError = ''
    formFieldErrors = {}
    showTaskModal = true
  }

  function openEditModal(task: Task) {
    if (!canEditTask(task)) {
      showToast('Anda tidak memiliki akses untuk mengedit tugas ini', 'error')
      return
    }
    isEditing = true
    editingTaskId = task.id
    formTitle = task.title
    formDescription = task.description || ''
    formStatus = task.status
    formPriority = task.priority
    formProgress = task.progress
    formStartDate = task.start_date ? task.start_date.split('T')[0] : ''
    formDueDate = task.due_date ? task.due_date.split('T')[0] : ''
    formError = ''
    formFieldErrors = {}
    loadTaskAssignments(task.id)
    showDetailModal = false
    showTaskModal = true
  }

  async function loadTaskAssignments(taskId: string) {
    const { data } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', taskId)
      .neq('status', 'rejected')
    if (data) formAssignedUsers = data.map(a => a.user_id).filter(uid => uid !== user?.id)
  }

  async function saveTask() {
    if (!validateForm()) return
    isSubmitting = true
    formError = ''

    try {
      const taskData = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        status: formStatus,
        priority: formPriority,
        progress: formProgress,
        start_date: formStartDate,
        due_date: formDueDate,
      }

      let taskId: string
      const creatorName = getUserName(user!.id)

      if (isEditing && editingTaskId) {
        const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTaskId)
        if (error) throw error
        taskId = editingTaskId

        const { data: oldA } = await supabase
          .from('task_assignments')
          .select('user_id, status')
          .eq('task_id', taskId)
        const oldUserIds = (oldA || []).filter(a => a.status !== 'rejected').map(a => a.user_id)

        const { error: delErr } = await supabase.from('task_assignments').delete().eq('task_id', taskId)
        if (delErr) console.error('[saveTask edit] delete assignments:', delErr)

        const allUsers = [...new Set([...formAssignedUsers, user!.id])]
        const { error: insErr } = await supabase.from('task_assignments').insert(
          allUsers.map(uid => ({
            task_id: taskId,
            user_id: uid,
            status: uid === user!.id ? 'accepted' : 'pending',
          }))
        )
        if (insErr) {
          console.error('[saveTask edit] insert assignments:', insErr)
          throw new Error('Gagal menyimpan kolaborator: ' + insErr.message)
        }

        const newCollabs = formAssignedUsers.filter(uid => uid !== user!.id && !oldUserIds.includes(uid))
        if (newCollabs.length > 0) {
          await insertNotificationMany(
            newCollabs,
            'task_collaboration_invite',
            'Undangan Kolaborasi',
            `${creatorName} mengundang Anda untuk berkolaborasi di tugas "${formTitle.trim()}".`,
            { task_id: taskId, task_title: formTitle.trim() }
          )
        }

        showToast('Tugas berhasil diperbarui')
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...taskData, created_by: user!.id })
          .select()
          .single()
        if (error) throw error
        taskId = data.id

        const allUsers = [...new Set([...formAssignedUsers, user!.id])]
        const { error: insErr } = await supabase.from('task_assignments').insert(
          allUsers.map(uid => ({
            task_id: taskId,
            user_id: uid,
            status: uid === user!.id ? 'accepted' : 'pending',
          }))
        )
        if (insErr) {
          console.error('[saveTask create] insert assignments:', insErr)
          // rollback task supaya tidak jadi orphan
          await supabase.from('tasks').delete().eq('id', taskId)
          throw new Error('Gagal menyimpan kolaborator: ' + insErr.message)
        }

        const others = formAssignedUsers.filter(uid => uid !== user!.id)
        if (others.length > 0) {
          await insertNotificationMany(
            others,
            'task_collaboration_invite',
            'Undangan Kolaborasi',
            `${creatorName} mengundang Anda untuk berkolaborasi di tugas "${formTitle.trim()}".`,
            { task_id: taskId, task_title: formTitle.trim() }
          )
        }

        showToast('Tugas berhasil dibuat')
      }

      showTaskModal = false
      await refreshAll()
    } catch (e) {
      formError = e instanceof Error ? e.message : 'Terjadi kesalahan'
    } finally {
      isSubmitting = false
    }
  }

  // ── Accept/Reject ──────────────────────────────────
  function openConfirmActionModal(action: 'accept' | 'reject', assignment: TaskAssignment, taskTitle: string) {
    confirmAction = action
    confirmActionTaskTitle = taskTitle
    confirmActionAssignmentId = assignment.id
    showConfirmActionModal = true
  }

  async function confirmActionTask() {
    if (!confirmAction || !confirmActionAssignmentId) return
    isConfirmingAction = true

    try {
      const newStatus = confirmAction === 'accept' ? 'accepted' : 'rejected'
      const updateData: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'accepted') updateData.accepted_at = new Date().toISOString()

      const assignment = assignments.find(a => a.id === confirmActionAssignmentId)
      const task = assignment ? tasks.find(t => t.id === assignment.task_id) : null

      const { error } = await supabase
        .from('task_assignments')
        .update(updateData)
        .eq('id', confirmActionAssignmentId)
      if (error) throw error

      if (task && task.created_by !== user!.id) {
        const responderName = getUserName(user!.id)
        await insertNotification(
          task.created_by,
          newStatus === 'accepted' ? 'collaboration_accepted' : 'collaboration_rejected',
          newStatus === 'accepted' ? 'Kolaborator Bergabung' : 'Undangan Ditolak',
          `${responderName} ${newStatus === 'accepted' ? 'menerima' : 'menolak'} undangan untuk tugas "${confirmActionTaskTitle}".`,
          { task_id: task.id, task_title: confirmActionTaskTitle }
        )
      }

      showToast(newStatus === 'accepted' ? 'Anda bergabung dalam tugas ini' : 'Undangan ditolak')
      showConfirmActionModal = false
      showDetailModal = false
      await refreshAll()
    } catch (e) {
      showToast('Gagal memproses', 'error')
    } finally {
      isConfirmingAction = false
      confirmAction = null
      confirmActionAssignmentId = null
    }
  }

  // ── Progress ───────────────────────────────────────
  function openProgressModal(task: Task) {
    progressTaskId = task.id
    progressTaskTitle = task.title
    progressValue = task.progress
    initialProgressValue = task.progress
    showProgressModal = true
  }

  function setProgressPreset(val: number) {
    progressValue = val
  }

  async function updateProgress() {
    if (!progressTaskId) return
    if (progressValue === initialProgressValue) {
      showProgressModal = false
      return
    }

    isUpdatingProgress = true

    try {
      const newStatus = getStatusByProgress(progressValue)
      const { error } = await supabase
        .from('tasks')
        .update({ progress: progressValue, status: newStatus })
        .eq('id', progressTaskId)
      if (error) throw error

      const task = tasks.find(t => t.id === progressTaskId)
      const updaterName = getUserName(user!.id)

      if (progressValue === 100 && task) {
        const myA = assignments.find(a => a.task_id === progressTaskId)
        if (myA && myA.status === 'accepted') {
          await supabase
            .from('task_assignments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', myA.id)
        }

        if (task.created_by !== user!.id) {
          await insertNotification(
            task.created_by,
            'task_completed',
            'Tugas Selesai',
            `${updaterName} menyelesaikan tugas "${task.title}".`,
            { task_id: task.id, task_title: task.title }
          )
        }

        const otherIds = allAssignments
          .filter(a => a.task_id === progressTaskId && a.user_id !== user!.id && a.user_id !== task.created_by && a.status === 'accepted')
          .map(a => a.user_id)
        if (otherIds.length > 0) {
          await insertNotificationMany(
            otherIds,
            'task_completed',
            'Tugas Diselesaikan',
            `${updaterName} menyelesaikan tugas "${task.title}".`,
            { task_id: task.id, task_title: task.title }
          )
        }
      } else if (newStatus === 'review' && task && task.created_by !== user!.id) {
        await insertNotification(
          task.created_by,
          'task_ready_review',
          'Siap Direview',
          `${updaterName} menandai tugas "${task.title}" siap direview (${progressValue}%).`,
          { task_id: task.id, task_title: task.title }
        )
      }

      showToast(`Progress diperbarui: ${progressValue}%`)
      showProgressModal = false
      await refreshAll()
    } catch (e) {
      showToast('Gagal memperbarui progress', 'error')
    } finally {
      isUpdatingProgress = false
    }
  }

  // ── Delete ─────────────────────────────────────────
  function confirmDelete(task: Task) {
    if (!canDeleteTask(task)) {
      showToast('Hanya pembuat tugas yang bisa menghapus', 'error')
      return
    }
    deletingTaskId = task.id
    deletingTaskTitle = task.title
    showDetailModal = false
    showDeleteModal = true
  }

  async function deleteTask() {
    if (!deletingTaskId) return
    isDeleting = true
    try {
      const { data: tA } = await supabase.from('task_assignments').select('user_id').eq('task_id', deletingTaskId)
      const taskTitle = deletingTaskTitle
      const deleterName = getUserName(user!.id)
      const collaborators = (tA || []).map(a => a.user_id).filter(uid => uid !== user!.id)

      await supabase.from('task_assignments').delete().eq('task_id', deletingTaskId)
      const { error } = await supabase.from('tasks').delete().eq('id', deletingTaskId)
      if (error) throw error

      if (collaborators.length > 0) {
        await insertNotificationMany(
          collaborators,
          'task_deleted',
          'Tugas Dihapus',
          `${deleterName} menghapus tugas "${taskTitle}".`,
          { task_title: taskTitle }
        )
      }

      showToast('Tugas berhasil dihapus')
      showDeleteModal = false
      await refreshAll()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus', 'error')
    } finally {
      isDeleting = false
      deletingTaskId = null
    }
  }

  // ── Detail Modal ───────────────────────────────────
  function openDetail(task: Task) {
    detailTask = task
    showDetailModal = true
  }

  // ── Computed ───────────────────────────────────────
  let filteredTasks = $derived.by(() => {
    if (activeFilter === 'all') return tasks
    return tasks.filter(t => t.status === activeFilter)
  })

  let taskStats = $derived.by(() => {
    const notStarted = tasks.filter(t => t.status === 'not_started').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const review = tasks.filter(t => t.status === 'review').length
    const revision = tasks.filter(t => t.status === 'revision').length
    const done = tasks.filter(t => t.status === 'done').length
    const total = tasks.length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
    return { notStarted, inProgress, review, revision, done, total, completionRate }
  })

  let pendingInvites = $derived(assignments.filter(a => a.status === 'pending'))

  // Derived label for progress state
  let progressStateLabel = $derived.by(() => {
    if (progressValue === 0) return { label: 'Belum dimulai', color: '#94A3B8' }
    if (progressValue === 100) return { label: 'Selesai', color: '#22C55E' }
    if (progressValue >= 80) return { label: 'Siap direview', color: '#A855F7' }
    return { label: 'Sedang dikerjakan', color: '#3B82F6' }
  })

  onMount(loadData)
</script>

<svelte:head>
  <title>Tugas — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl max-w-[90vw] cursor-pointer"
       style="background: {toastType === 'success' ? 'linear-gradient(135deg, #16A34A, #15803D)' : toastType === 'error' ? '#DC2626' : 'linear-gradient(135deg, #3B82F6, #2563EB)'}; font-family:'Inter',sans-serif; animation: slideInUp 0.3s ease-out;">
    {toastMsg}
  </div>
{/if}

<!-- Pending Invites Banner -->
{#if pendingInvites.length > 0}
  <div class="fixed top-[68px] left-0 right-0 z-40 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2.5 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors">
    <div class="max-w-lg mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <span class="text-xs font-semibold text-blue-700">
          {pendingInvites.length} undangan baru menunggu
        </span>
      </div>
      <span class="text-[10px] text-blue-600">Scroll untuk lihat</span>
    </div>
  </div>
{/if}

<!-- Main App -->
<div class="min-h-screen" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%); font-family:'Inter',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/logo-khwarizmi.png" alt="Logo" class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200 cursor-pointer" />
      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Task Tracker</span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">Kolaborasi tim yang produktif</p>
      </div>
    </div>
    <button onclick={openCreateModal}
            class="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-3.5 py-2.5 shadow-md active:scale-95 transition-transform cursor-pointer hover:shadow-lg"
            style="background: linear-gradient(135deg, #F97316, #EA580C);">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
      </svg>
      Baru
    </button>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-40">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-medium text-slate-500">Memuat...</p>
      </div>
    </div>
  {:else}
    <main class="max-w-lg mx-auto px-4 py-5 pb-24 flex flex-col gap-4 relative z-10" style:padding-top={pendingInvites.length > 0 ? '3.5rem' : '1.25rem'}>

      <!-- Stats Row -->
      <div class="grid grid-cols-5 gap-2">
        {#each [
          { val: taskStats.total, label: 'Total', color: 'text-slate-800' },
          { val: taskStats.notStarted, label: 'Belum', color: 'text-slate-500' },
          { val: taskStats.inProgress, label: 'Progress', color: 'text-blue-600' },
          { val: taskStats.review + taskStats.revision, label: 'Review', color: 'text-purple-600' },
          { val: taskStats.done, label: 'Selesai', color: 'text-green-600' },
        ] as s}
          <div class="rounded-xl px-2 py-3 bg-white/90 shadow-sm border border-white/50 text-center cursor-pointer hover:shadow-md transition-shadow">
            <p class="text-lg font-bold {s.color}" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.val}</p>
            <p class="text-[9px] font-medium text-slate-500 mt-0.5">{s.label}</p>
          </div>
        {/each}
      </div>

      <!-- Completion Bar -->
      <div class="rounded-xl p-4 bg-white/90 shadow-sm border border-white/50 cursor-pointer hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-slate-600">Progres Penyelesaian</span>
          <span class="text-xs font-bold text-orange-600">{taskStats.completionRate}%</span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700"
               style="width: {taskStats.completionRate}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-1 bg-slate-100/80 rounded-xl p-1 overflow-x-auto">
        {#each [
          { value: 'all', label: 'Semua' },
          { value: 'not_started', label: 'Belum' },
          { value: 'in_progress', label: 'Progress' },
          { value: 'review', label: 'Review' },
          { value: 'revision', label: 'Revisi' },
          { value: 'done', label: 'Selesai' }
        ] as filter}
          <button
            onclick={() => activeFilter = filter.value as typeof activeFilter}
            class="flex-1 min-w-fit py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer
                   {activeFilter === filter.value ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
            {filter.label}
          </button>
        {/each}
      </div>

      <!-- Task List -->
      {#if filteredTasks.length === 0}
        <div class="bg-white/90 rounded-xl p-12 text-center border border-white/50 cursor-pointer hover:shadow-md transition-shadow">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center">
            <svg class="w-8 h-8 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <p class="text-slate-500 text-sm font-medium">
            {activeFilter !== 'all' ? 'Tidak ada tugas dengan status ini' : 'Belum ada tugas'}
          </p>
          {#if activeFilter === 'all'}
            <button onclick={openCreateModal}
                    class="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer hover:shadow-md transition-shadow"
                    style="background: linear-gradient(135deg, #F97316, #EA580C);">
              + Buat Tugas Baru
            </button>
          {/if}
        </div>
      {:else}
        <div class="flex flex-col gap-2.5">
          {#each filteredTasks as task}
            {@const due = formatDueDate(task.due_date)}
            {@const myA = getUserAssignment(task.id)}
            {@const contributors = getTaskContributors(task.id)}
            {@const isPending = myA?.status === 'pending'}
            {@const statusStyle = STATUS_STYLE[task.status]}

            <!-- ── Task Card ── -->
            <button type="button"
                    onclick={() => openDetail(task)}
                    class="text-left bg-white/90 rounded-xl p-3.5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer
                           {isPending ? 'border-blue-200 ring-2 ring-blue-100' : 'border-white/50'}">

              <div class="flex items-start gap-2.5">
                <div class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                     style="background:{PRIORITY_DOT[task.priority]};"
                     title="Prioritas {PRIORITY_LABEL[task.priority]}"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-bold text-slate-800 text-sm leading-snug line-clamp-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
                      {task.title}
                    </p>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full {statusStyle.bg} {statusStyle.text} flex-shrink-0 flex items-center gap-1 cursor-pointer">
                      <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </div>

                  <!-- Meta row -->
                  <div class="flex items-center justify-between gap-2 mt-2">
                    <div class="flex items-center gap-3 text-[11px]">
                      {#if due}
                        <div class="flex items-center gap-1 {due.color} {due.urgent ? 'font-semibold' : ''} cursor-pointer">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {due.label}
                        </div>
                      {/if}
                      <div class="text-slate-500 flex items-center gap-1 cursor-pointer">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        {contributors.length}
                      </div>
                    </div>

                    <!-- Avatar stack with real photos -->
                    {#if contributors.length > 0}
                      <div class="flex -space-x-1.5 cursor-pointer">
                        {#each contributors.slice(0, 3) as c}
                          <div class="w-6 h-6 rounded-full overflow-hidden border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                               style="background: {c.avatar ? 'white' : getAvatarGradient(c.status)};"
                               title="{c.name} ({c.status})">
                            {#if c.avatar}
                              <img src={c.avatar} alt={c.name} class="w-full h-full object-cover" />
                            {:else}
                              {getInitials(c.name)}
                            {/if}
                          </div>
                        {/each}
                        {#if contributors.length > 3}
                          <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 border-2 border-white cursor-pointer">
                            +{contributors.length - 3}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Progress bar -->
                  {#if !isPending && task.progress > 0}
                    <div class="mt-2.5 h-1 bg-slate-100 rounded-full overflow-hidden cursor-pointer">
                      <div class="h-full rounded-full transition-all duration-500"
                           style="width: {task.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
                    </div>
                  {/if}

                  <!-- Pending invite banner -->
                  {#if isPending}
                    <div class="mt-2.5 flex items-center gap-2 text-[10px] font-semibold text-blue-700 cursor-pointer">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Ketuk untuk merespon undangan
                    </div>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

    </main>
  {/if}
</div>

<!-- ═══════════════════════════════════════════════════════ -->
<!--  Detail Modal                                           -->
<!-- ═══════════════════════════════════════════════════════ -->
{#if showDetailModal && detailTask}
  {@const t = detailTask}
  {@const due = formatDueDate(t.due_date)}
  {@const myA = getUserAssignment(t.id)}
  {@const contributors = getTaskContributors(t.id)}
  {@const statusStyle = STATUS_STYLE[t.status]}

  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
       onclick={() => showDetailModal = false}>
    <div class="w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
         onclick={(e) => e.stopPropagation()}>

      <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200 cursor-pointer"></div>
      </div>

      <!-- Header -->
      <div class="px-6 pt-4 pb-5 border-b border-slate-100 sticky top-0 sm:top-0 bg-white z-10" style:top="0.5rem">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full cursor-pointer" style="background:{PRIORITY_DOT[t.priority]};"></div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer">
                Prioritas {PRIORITY_LABEL[t.priority]}
              </span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 leading-tight cursor-pointer" style="font-family:'Plus Jakarta Sans',sans-serif;">
              {t.title}
            </h2>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-[10px] font-bold px-2 py-1 rounded-full {statusStyle.bg} {statusStyle.text} flex items-center gap-1 cursor-pointer">
                <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
                {STATUS_LABEL[t.status]}
              </span>
              <span class="text-[10px] text-slate-500 cursor-pointer">• Dibuat oleh {t.created_by === user?.id ? 'Anda' : getUserName(t.created_by)}</span>
            </div>
          </div>
          <button onclick={() => showDetailModal = false}
                  class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all flex-shrink-0 cursor-pointer">
            ✕
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-5 flex flex-col gap-5">

        {#if t.description}
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 cursor-pointer">Deskripsi</p>
            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line cursor-pointer">{t.description}</p>
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-colors">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mulai</p>
            <p class="text-xs font-semibold text-slate-700">{formatDateShort(t.start_date) || '—'}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-colors">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Deadline</p>
            <p class="text-xs font-semibold {due?.color || 'text-slate-700'}">
              {formatDateShort(t.due_date) || '—'}
              {#if due}<span class="text-[10px] font-normal block mt-0.5">{due.label}</span>{/if}
            </p>
          </div>
        </div>

        <div class="cursor-pointer">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</p>
            <span class="text-sm font-bold text-orange-600">{t.progress}%</span>
          </div>
          <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer">
            <div class="h-full rounded-full transition-all duration-700"
                 style="width: {t.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
          </div>
        </div>

        <!-- ═══ Contributors section (renamed) ═══ -->
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 cursor-pointer">
            {CONTRIBUTORS_LABEL} ({contributors.length})
          </p>
          <div class="flex flex-col gap-1.5">
            {#each contributors as c}
              <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                <!-- Avatar with photo -->
                <div class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
                     style="background: {c.avatar ? 'white' : getAvatarGradient(c.status)};">
                  {#if c.avatar}
                    <img src={c.avatar} alt={c.name} class="w-full h-full object-cover" />
                  {:else}
                    {getInitials(c.name)}
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate cursor-pointer">
                    {c.id === user?.id ? 'Anda' : c.name}
                    {#if c.id === t.created_by}
                      <span class="text-[10px] font-medium text-orange-600 cursor-pointer">• Pembuat</span>
                    {/if}
                  </p>
                  <p class="text-[10px] text-slate-500 cursor-pointer">
                    {c.status === 'accepted' ? 'Telah bergabung' :
                     c.status === 'pending' ? 'Menunggu konfirmasi' :
                     c.status === 'completed' ? 'Telah menyelesaikan' : c.status}
                  </p>
                </div>
                <div class="w-2 h-2 rounded-full flex-shrink-0 cursor-pointer"
                     style="background:{c.status === 'accepted' ? '#22C55E' : c.status === 'pending' ? '#3B82F6' : c.status === 'completed' ? '#A855F7' : '#94A3B8'};"></div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 pt-2">
          {#if myA?.status === 'pending'}
            <div class="flex gap-2">
              <button onclick={() => openConfirmActionModal('accept', myA, t.title)}
                      class="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all cursor-pointer hover:shadow-lg"
                      style="background: linear-gradient(135deg, #16A34A, #15803D);">
                ✓ Bergabung
              </button>
              <button onclick={() => openConfirmActionModal('reject', myA, t.title)}
                      class="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer">
                Tolak
              </button>
            </div>
          {:else if myA?.status === 'accepted' && t.status !== 'done'}
            <button onclick={() => openProgressModal(t)}
                    class="w-full py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                    style="background: linear-gradient(135deg, #F97316, #EA580C);">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Update Progress
            </button>
          {/if}

          {#if canEditTask(t) || canDeleteTask(t)}
            <div class="flex gap-2">
              {#if canEditTask(t)}
                <button onclick={() => openEditModal(t)}
                        class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer">
                  Edit
                </button>
              {/if}
              {#if canDeleteTask(t)}
                <button onclick={() => confirmDelete(t)}
                        class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer">
                  Hapus
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════ -->
<!--  Task Form Modal (Create/Edit)                          -->
<!-- ═══════════════════════════════════════════════════════ -->
{#if showTaskModal}
  <div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
       onclick={() => showTaskModal = false}>
    <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
         onclick={(e) => e.stopPropagation()}>

      <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200 cursor-pointer"></div>
      </div>

      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 sm:top-0 bg-white z-10" style:top="0.5rem">
        <span class="text-base font-bold text-slate-800 cursor-pointer" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {isEditing ? 'Edit Tugas' : 'Tugas Baru'}
        </span>
        <button onclick={() => showTaskModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer">
          ✕
        </button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-4">
        <!-- Judul -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">
            Judul <span class="text-red-500">*</span>
          </label>
          <input type="text" bind:value={formTitle} placeholder="Masukkan judul tugas"
                 class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer
                        {formFieldErrors.title ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}" />
          {#if formFieldErrors.title}
            <p class="text-[10px] text-red-500 font-medium mt-1 cursor-pointer">{formFieldErrors.title}</p>
          {/if}
        </div>

        <!-- Deskripsi (now required) -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">
            Deskripsi <span class="text-red-500">*</span>
          </label>
          <textarea bind:value={formDescription} rows="3" placeholder="Detail tugas..."
                    class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none cursor-pointer
                           {formFieldErrors.description ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}"></textarea>
          {#if formFieldErrors.description}
            <p class="text-[10px] text-red-500 font-medium mt-1 cursor-pointer">{formFieldErrors.description}</p>
          {/if}
        </div>

        <!-- Kolaborator (with avatars) -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">
            Ajak Kolaborator
            <span class="text-[10px] font-normal text-slate-400">(opsional)</span>
          </label>
          <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
            {#each users.filter(u => u.id !== user?.id) as u}
              <label class="flex items-center gap-2.5 cursor-pointer hover:bg-white p-2 rounded-lg">
                <input type="checkbox" value={u.id} checked={formAssignedUsers.includes(u.id)}
                       onchange={(e) => {
                         const t = e.target as HTMLInputElement
                         formAssignedUsers = t.checked
                           ? [...formAssignedUsers, u.id]
                           : formAssignedUsers.filter(id => id !== u.id)
                       }}
                       class="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer" />
                <div class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                     style="background: {u.avatar_url ? 'white' : 'linear-gradient(135deg, #F97316, #EA580C)'};">
                  {#if u.avatar_url}
                    <img src={u.avatar_url} alt={u.full_name} class="w-full h-full object-cover" />
                  {:else}
                    {getInitials(u.full_name)}
                  {/if}
                </div>
                <span class="text-sm text-slate-700 cursor-pointer">{u.full_name}</span>
              </label>
            {:else}
              <p class="text-xs text-slate-400 text-center py-3 cursor-pointer">Tidak ada user lain</p>
            {/each}
          </div>
        </div>

        <!-- Status & Prioritas -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">Status</label>
            <select bind:value={formStatus}
                    class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer">
              <option value="not_started">Belum Dikerjakan</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="review">Review</option>
              <option value="revision">Revisi</option>
              <option value="done">Selesai</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">Prioritas</label>
            <select bind:value={formPriority}
                    class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer">
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </div>
        </div>

        <!-- Progress -->
        <div class="cursor-pointer">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-500 cursor-pointer">Progress</label>
            <span class="text-xs font-bold text-orange-600 cursor-pointer">{formProgress}%</span>
          </div>
          <input type="range" bind:value={formProgress} min="0" max="100" step="5"
                 class="range-orange w-full cursor-pointer"
                 style="--fill: {formProgress}%;" />
        </div>

        <!-- Tanggal (now required) -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">
              Mulai <span class="text-red-500">*</span>
            </label>
            <input type="date" bind:value={formStartDate}
                   class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer
                          {formFieldErrors.startDate ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}" />
            {#if formFieldErrors.startDate}
              <p class="text-[10px] text-red-500 font-medium mt-1 cursor-pointer">{formFieldErrors.startDate}</p>
            {/if}
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5 cursor-pointer">
              Deadline <span class="text-red-500">*</span>
            </label>
            <input type="date" bind:value={formDueDate}
                   class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer
                          {formFieldErrors.dueDate ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}" />
            {#if formFieldErrors.dueDate}
              <p class="text-[10px] text-red-500 font-medium mt-1 cursor-pointer">{formFieldErrors.dueDate}</p>
            {/if}
          </div>
        </div>

        {#if formError}
          <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2 cursor-pointer">
            <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p class="text-xs text-red-600 font-medium cursor-pointer">{formError}</p>
          </div>
        {/if}

        <div class="flex gap-3 pt-2 pb-4">
          <button onclick={() => showTaskModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-all">
            Batal
          </button>
          <button onclick={saveTask} disabled={isSubmitting}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60 cursor-pointer transition-all"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isSubmitting}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menyimpan...
              </span>
            {:else}
              {isEditing ? 'Simpan Perubahan' : 'Buat Tugas'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════ -->
<!--  Progress Modal — REDESIGNED                            -->
<!-- ═══════════════════════════════════════════════════════ -->
{#if showProgressModal}
  <div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
       onclick={() => showProgressModal = false}>
    <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
         onclick={(e) => e.stopPropagation()}>

      <div class="sm:hidden flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-slate-200 cursor-pointer"></div>
      </div>

      <!-- Header -->
      <div class="px-6 pt-4 pb-4 border-b border-slate-100">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center cursor-pointer">
                <svg class="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <p class="text-base font-bold text-slate-800 cursor-pointer" style="font-family:'Plus Jakarta Sans',sans-serif;">Update Progress</p>
            </div>
            <p class="text-xs text-slate-500 line-clamp-1 pl-10 cursor-pointer">{progressTaskTitle}</p>
          </div>
          <button onclick={() => showProgressModal = false}
                  class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0 cursor-pointer">
            ✕
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-6">

        <!-- Circular progress display -->
        <div class="relative w-40 h-40 mx-auto mb-6 cursor-pointer">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <!-- Background circle -->
            <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" stroke-width="8" />
            <!-- Progress circle -->
            <circle cx="50" cy="50" r="42" fill="none"
                    stroke="url(#progressGradient)"
                    stroke-width="8"
                    stroke-linecap="round"
                    stroke-dasharray="263.89"
                    stroke-dashoffset={263.89 - (263.89 * progressValue / 100)}
                    style="transition: stroke-dashoffset 0.4s cubic-bezier(0.16,1,0.3,1);" />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#F97316" />
                <stop offset="100%" stop-color="#EA580C" />
              </linearGradient>
            </defs>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
            <p class="text-4xl font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
              {progressValue}<span class="text-xl text-slate-400">%</span>
            </p>
            <div class="flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full cursor-pointer"
                 style="background: {progressStateLabel.color}20;">
              <div class="w-1.5 h-1.5 rounded-full cursor-pointer" style="background:{progressStateLabel.color};"></div>
              <p class="text-[10px] font-bold uppercase tracking-wider cursor-pointer" style="color:{progressStateLabel.color};">
                {progressStateLabel.label}
              </p>
            </div>
          </div>
        </div>

        <!-- Slider -->
        <div class="mb-5 cursor-pointer">
          <input type="range" bind:value={progressValue} min="0" max="100" step="5"
                 class="range-orange w-full cursor-pointer"
                 style="--fill: {progressValue}%;" />
          <div class="flex justify-between text-[10px] font-medium text-slate-400 mt-2 px-0.5">
            <span class="cursor-pointer">0%</span>
            <span class="cursor-pointer">25%</span>
            <span class="cursor-pointer">50%</span>
            <span class="cursor-pointer">75%</span>
            <span class="cursor-pointer">100%</span>
          </div>
        </div>

        <!-- Quick preset buttons -->
        <div class="mb-5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 cursor-pointer">Cepat Pilih</p>
          <div class="grid grid-cols-5 gap-2">
            {#each [0, 25, 50, 75, 100] as preset}
              <button type="button"
                      onclick={() => setProgressPreset(preset)}
                      class="py-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer
                             {progressValue === preset
                               ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                               : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}">
                {preset}%
              </button>
            {/each}
          </div>
        </div>

        <!-- Info hint based on value -->
        {#if progressValue !== initialProgressValue}
          <div class="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 mb-5 flex items-start gap-2 cursor-pointer">
            <svg class="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1 cursor-pointer">
              <p class="text-[11px] text-orange-700 font-medium leading-snug">
                {#if progressValue === 100}
                  Tugas akan ditandai <strong>selesai</strong>. Pembuat tugas akan mendapat notifikasi.
                {:else if progressValue >= 80}
                  Tugas akan berstatus <strong>siap direview</strong>.
                {:else if progressValue === 0}
                  Tugas akan kembali ke status <strong>belum dikerjakan</strong>.
                {:else}
                  Status akan berubah menjadi <strong>sedang dikerjakan</strong>.
                {/if}
              </p>
            </div>
          </div>
        {/if}

        <!-- Action buttons -->
        <div class="flex gap-3">
          <button onclick={() => showProgressModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer">
            Batal
          </button>
          <button onclick={updateProgress} disabled={isUpdatingProgress || progressValue === initialProgressValue}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isUpdatingProgress}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menyimpan...
              </span>
            {:else if progressValue === initialProgressValue}
              Tidak Ada Perubahan
            {:else}
              Simpan Progress
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════ -->
<!--  Delete Confirm Modal                                   -->
<!-- ═══════════════════════════════════════════════════════ -->
{#if showDeleteModal}
  <div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl cursor-pointer" style="animation: zoomIn 0.2s ease-out;">
      <div class="px-6 py-5">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3 cursor-pointer">
          <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p class="text-center font-bold text-slate-800 text-base mb-1 cursor-pointer" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Tugas?</p>
        <p class="text-center text-sm text-slate-600 cursor-pointer">
          "<span class="font-semibold">{deletingTaskTitle}</span>" akan dihapus permanen untuk semua yang terlibat.
        </p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showDeleteModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
            Batal
          </button>
          <button onclick={deleteTask} disabled={isDeleting}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  style="background: #DC2626;">
            {isDeleting ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════════════════════════════════════════════════ -->
<!--  Confirm Accept/Reject Modal                            -->
<!-- ═══════════════════════════════════════════════════════ -->
{#if showConfirmActionModal}
  <div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl cursor-pointer" style="animation: zoomIn 0.2s ease-out;">
      <div class="px-6 py-5">
        <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer
                    {confirmAction === 'accept' ? 'bg-green-100' : 'bg-red-100'}">
          {#if confirmAction === 'accept'}
            <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          {:else}
            <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          {/if}
        </div>
        <p class="text-center font-bold text-slate-800 text-base mb-1 cursor-pointer" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {confirmAction === 'accept' ? 'Bergabung di Tugas?' : 'Tolak Undangan?'}
        </p>
        <p class="text-center text-sm text-slate-600 cursor-pointer">
          {#if confirmAction === 'accept'}
            Anda akan bergabung dalam tugas "<span class="font-semibold">{confirmActionTaskTitle}</span>".
          {:else}
            Anda akan menolak undangan untuk tugas "<span class="font-semibold">{confirmActionTaskTitle}</span>". Tugas ini akan hilang dari daftar Anda.
          {/if}
        </p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showConfirmActionModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
            Batal
          </button>
          <button onclick={confirmActionTask} disabled={isConfirmingAction}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  style="background: {confirmAction === 'accept' ? 'linear-gradient(135deg, #16A34A, #15803D)' : '#DC2626'};">
            {#if isConfirmingAction}
              Memproses...
            {:else}
              {confirmAction === 'accept' ? 'Ya, Bergabung' : 'Ya, Tolak'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideInUp {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes zoomIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* Custom range slider with filled track */
  .range-orange {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    border-radius: 999px;
    outline: none;
    cursor: pointer;
    /* fallback background kalau --fill belum diset */
    background: #E2E8F0;
    background-image: linear-gradient(to right, #F97316, #EA580C);
    background-size: var(--fill, 0%) 100%;
    background-repeat: no-repeat;
    transition: background-size 0.15s ease;
  }
  .range-orange::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 999px;
    background: transparent;
  }
  .range-orange::-moz-range-track {
    height: 8px;
    border-radius: 999px;
    background: #E2E8F0;
  }
  .range-orange::-moz-range-progress {
    height: 8px;
    border-radius: 999px;
    background: linear-gradient(to right, #F97316, #EA580C);
  }
  .range-orange::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #F97316;
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.5);
    margin-top: -7px;
    transition: transform 0.15s ease;
  }
  .range-orange::-webkit-slider-thumb:active {
    transform: scale(1.15);
  }
  .range-orange::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #F97316;
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.5);
  }
</style>