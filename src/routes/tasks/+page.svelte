<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

  // ── Types ──────────────────────────────────────────
  interface Profile {
    id: string
    full_name: string
    role: 'admin' | 'user'
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

  // ── State ──────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let tasks = $state<Task[]>([])
  let assignments = $state<TaskAssignment[]>([])      // assignment milik user ini
  let allAssignments = $state<TaskAssignment[]>([])   // semua assignment untuk semua visible tasks
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

  function showToast(msg: string, dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  function getUserName(userId: string) {
    return users.find(u => u.id === userId)?.full_name || 'Pengguna'
  }

  function getUserAssignment(taskId: string) {
    return assignments.find(a => a.task_id === taskId) || null
  }

  function getTaskCollaborators(taskId: string) {
    return allAssignments
      .filter(a => a.task_id === taskId && a.status !== 'rejected')
      .map(a => ({
        id: a.user_id,
        name: getUserName(a.user_id),
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

  // ── Notifications ──────────────────────────────────
  async function insertNotification(uid: string, type: string, title: string, message: string, data: Record<string, unknown> = {}) {
    try {
      await supabase.from('notifications').insert({ user_id: uid, type, title, message, data, is_read: false })
    } catch (e) { console.warn(e) }
  }

  async function insertNotificationMany(uids: string[], type: string, title: string, message: string, data: Record<string, unknown> = {}) {
    if (uids.length === 0) return
    try {
      await supabase.from('notifications').insert(
        uids.map(uid => ({ user_id: uid, type, title, message, data, is_read: false }))
      )
    } catch (e) { console.warn(e) }
  }

  /**
   * Deadline notif dengan deduplikasi via localStorage.
   * Hanya kirim sekali per user per task per hari.
   */
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
      // hanya untuk task yang jadi tanggung jawab user
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

    if (dueTasks.length === 1) showToast(`⏰ Deadline hari ini: "${dueTasks[0].title}"`, 4000)
    else showToast(`⏰ ${dueTasks.length} tugas deadline hari ini`, 4000)
  }

  // ── Loaders ────────────────────────────────────────
  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name')
    if (data) users = data as UserProfile[]
  }

  async function loadTasks() {
    if (!user) return

    if (profile?.role === 'admin') {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      if (data) tasks = data as Task[]
      return
    }

    // User biasa: task yang dibuat sendiri ATAU assignment accepted/pending
    // (rejected tidak muncul. pending tetap muncul agar user bisa terima/tolak)
    const { data: myA } = await supabase
      .from('task_assignments')
      .select('task_id, status')
      .eq('user_id', user.id)
      .in('status', ['accepted', 'pending'])

    const visibleTaskIds = (myA || []).map(a => a.task_id)

    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

    if (visibleTaskIds.length > 0) {
      const inList = visibleTaskIds.map(id => `"${id}"`).join(',')
      query = query.or(`created_by.eq.${user.id},id.in.(${inList})`)
    } else {
      query = query.eq('created_by', user.id)
    }

    const { data } = await query
    if (data) tasks = data as Task[]
  }

  async function loadAssignments() {
    if (!user) return
    const { data } = await supabase.from('task_assignments').select('*').eq('user_id', user.id)
    if (data) assignments = data as TaskAssignment[]
  }

  async function loadAllAssignments() {
    if (tasks.length === 0) { allAssignments = []; return }
    const taskIds = tasks.map(t => t.id)
    const { data } = await supabase
      .from('task_assignments')
      .select('*')
      .in('task_id', taskIds)
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
    showTaskModal = true
  }

  function openEditModal(task: Task) {
    if (!canEditTask(task)) {
      showToast('Anda tidak memiliki akses untuk mengedit tugas ini')
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
    if (!formTitle.trim()) { formError = 'Judul tugas wajib diisi'; return }
    isSubmitting = true
    formError = ''

    try {
      const taskData = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        status: formStatus,
        priority: formPriority,
        progress: formProgress,
        start_date: formStartDate || null,
        due_date: formDueDate || null,
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

        await supabase.from('task_assignments').delete().eq('task_id', taskId)

        const allUsers = [...new Set([...formAssignedUsers, user!.id])]
        await supabase.from('task_assignments').insert(
          allUsers.map(uid => ({
            task_id: taskId,
            user_id: uid,
            status: uid === user!.id ? 'accepted' : 'pending',
          }))
        )

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
        await supabase.from('task_assignments').insert(
          allUsers.map(uid => ({
            task_id: taskId,
            user_id: uid,
            status: uid === user!.id ? 'accepted' : 'pending',
          }))
        )

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
      // FIX: map action ke status DB yang benar
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

      showToast(newStatus === 'accepted' ? 'Anda bergabung dalam kolaborasi' : 'Undangan ditolak')
      showConfirmActionModal = false
      showDetailModal = false
      await refreshAll()
    } catch (e) {
      showToast('Gagal memproses')
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
    showProgressModal = true
  }

  async function updateProgress() {
    if (!progressTaskId) return
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
      showToast('Gagal memperbarui progress')
    } finally {
      isUpdatingProgress = false
    }
  }

  // ── Delete ─────────────────────────────────────────
  function confirmDelete(task: Task) {
    if (!canDeleteTask(task)) {
      showToast('Hanya pembuat tugas yang bisa menghapus')
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
      showToast(e instanceof Error ? e.message : 'Gagal menghapus')
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

  onMount(loadData)
</script>

<svelte:head>
  <title>Tugas — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl"
       style="background: linear-gradient(135deg, #F97316, #EA580C); font-family:'Inter',sans-serif; animation: slideInUp 0.3s ease-out;">
    {toastMsg}
  </div>
{/if}

<!-- Pending Invites Banner -->
{#if pendingInvites.length > 0}
  <div class="fixed top-[68px] left-0 right-0 z-40 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2.5">
    <div class="max-w-lg mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <span class="text-xs font-semibold text-blue-700">
          {pendingInvites.length} undangan kolaborasi baru
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
      <img src="/logo-khwarizmi.png" alt="Logo" class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200" />
      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Task Tracker</span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">Kolaborasi tim yang produktif</p>
      </div>
    </div>
    <button onclick={openCreateModal}
            class="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-3.5 py-2.5 shadow-md active:scale-95 transition-transform"
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
          <div class="rounded-xl px-2 py-3 bg-white/90 shadow-sm border border-white/50 text-center">
            <p class="text-lg font-bold {s.color}" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.val}</p>
            <p class="text-[9px] font-medium text-slate-500 mt-0.5">{s.label}</p>
          </div>
        {/each}
      </div>

      <!-- Completion Bar -->
      <div class="rounded-xl p-4 bg-white/90 shadow-sm border border-white/50">
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
            class="flex-1 min-w-fit py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                   {activeFilter === filter.value ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}">
            {filter.label}
          </button>
        {/each}
      </div>

      <!-- Task List -->
      {#if filteredTasks.length === 0}
        <div class="bg-white/90 rounded-xl p-12 text-center border border-white/50">
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
                    class="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
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
            {@const collaborators = getTaskCollaborators(task.id)}
            {@const isPending = myA?.status === 'pending'}
            {@const statusStyle = STATUS_STYLE[task.status]}

            <!-- ── Simple Task Card ── -->
            <button type="button"
                    onclick={() => openDetail(task)}
                    class="text-left bg-white/90 rounded-xl p-3.5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]
                           {isPending ? 'border-blue-200 ring-2 ring-blue-100' : 'border-white/50'}">

              <!-- Header: priority dot + title + status -->
              <div class="flex items-start gap-2.5">
                <div class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                     style="background:{PRIORITY_DOT[task.priority]};"
                     title="Prioritas {PRIORITY_LABEL[task.priority]}"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-bold text-slate-800 text-sm leading-snug line-clamp-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
                      {task.title}
                    </p>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full {statusStyle.bg} {statusStyle.text} flex-shrink-0 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </div>

                  <!-- Meta row: deadline + collaborators -->
                  <div class="flex items-center justify-between gap-2 mt-2">
                    <div class="flex items-center gap-3 text-[11px]">
                      {#if due}
                        <div class="flex items-center gap-1 {due.color} {due.urgent ? 'font-semibold' : ''}">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {due.label}
                        </div>
                      {/if}
                      <div class="text-slate-500 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        {collaborators.length}
                      </div>
                    </div>

                    <!-- Avatar stack -->
                    {#if collaborators.length > 0}
                      <div class="flex -space-x-1.5">
                        {#each collaborators.slice(0, 3) as c}
                          <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white"
                               style="background: linear-gradient(135deg, {c.status === 'pending' ? '#60A5FA, #3B82F6' : '#F97316, #EA580C'});"
                               title="{c.name} ({c.status})">
                            {getInitials(c.name)}
                          </div>
                        {/each}
                        {#if collaborators.length > 3}
                          <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 border-2 border-white">
                            +{collaborators.length - 3}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Progress bar (subtle) -->
                  {#if !isPending && task.progress > 0}
                    <div class="mt-2.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500"
                           style="width: {task.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
                    </div>
                  {/if}

                  <!-- Pending invite banner inline -->
                  {#if isPending}
                    <div class="mt-2.5 flex items-center gap-2 text-[10px] font-semibold text-blue-700">
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
  {@const collaborators = getTaskCollaborators(t.id)}
  {@const statusStyle = STATUS_STYLE[t.status]}

  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
       onclick={() => showDetailModal = false}>
    <div class="w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
         onclick={(e) => e.stopPropagation()}>

      <!-- Drag handle (mobile) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <!-- Header -->
      <div class="px-6 pt-4 pb-5 border-b border-slate-100 sticky top-0 sm:top-0 bg-white z-10" style:top="0.5rem">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full" style="background:{PRIORITY_DOT[t.priority]};"></div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Prioritas {PRIORITY_LABEL[t.priority]}
              </span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
              {t.title}
            </h2>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-[10px] font-bold px-2 py-1 rounded-full {statusStyle.bg} {statusStyle.text} flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
                {STATUS_LABEL[t.status]}
              </span>
              <span class="text-[10px] text-slate-500">• Dibuat oleh {t.created_by === user?.id ? 'Anda' : getUserName(t.created_by)}</span>
            </div>
          </div>
          <button onclick={() => showDetailModal = false}
                  class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all flex-shrink-0">
            ✕
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-5 flex flex-col gap-5">

        <!-- Description -->
        {#if t.description}
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Deskripsi</p>
            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{t.description}</p>
          </div>
        {/if}

        <!-- Dates grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 rounded-xl p-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mulai</p>
            <p class="text-xs font-semibold text-slate-700">{formatDateShort(t.start_date) || '—'}</p>
          </div>
          <div class="bg-slate-50 rounded-xl p-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Deadline</p>
            <p class="text-xs font-semibold {due?.color || 'text-slate-700'}">
              {formatDateShort(t.due_date) || '—'}
              {#if due}<span class="text-[10px] font-normal block mt-0.5">{due.label}</span>{/if}
            </p>
          </div>
        </div>

        <!-- Progress -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</p>
            <span class="text-sm font-bold text-orange-600">{t.progress}%</span>
          </div>
          <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
                 style="width: {t.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
          </div>
        </div>

        <!-- Collaborators -->
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Kolaborator ({collaborators.length})
          </p>
          <div class="flex flex-col gap-1.5">
            {#each collaborators as c}
              <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                     style="background: linear-gradient(135deg, {c.status === 'pending' ? '#60A5FA, #3B82F6' : '#F97316, #EA580C'});">
                  {getInitials(c.name)}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">
                    {c.id === user?.id ? 'Anda' : c.name}
                    {#if c.id === t.created_by}
                      <span class="text-[10px] font-medium text-orange-600">(Pembuat)</span>
                    {/if}
                  </p>
                  <p class="text-[10px] text-slate-500">
                    {c.status === 'accepted' ? 'Telah bergabung' :
                     c.status === 'pending' ? 'Menunggu konfirmasi' :
                     c.status === 'completed' ? 'Telah menyelesaikan' : c.status}
                  </p>
                </div>
                <div class="w-2 h-2 rounded-full flex-shrink-0"
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
                      class="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all"
                      style="background: linear-gradient(135deg, #16A34A, #15803D);">
                ✓ Bergabung
              </button>
              <button onclick={() => openConfirmActionModal('reject', myA, t.title)}
                      class="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">
                Tolak
              </button>
            </div>
          {:else if myA?.status === 'accepted' && t.status !== 'done'}
            <button onclick={() => openProgressModal(t)}
                    class="w-full py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all"
                    style="background: linear-gradient(135deg, #F97316, #EA580C);">
              Update Progress
            </button>
          {/if}

          {#if canEditTask(t) || canDeleteTask(t)}
            <div class="flex gap-2">
              {#if canEditTask(t)}
                <button onclick={() => openEditModal(t)}
                        class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
                  Edit
                </button>
              {/if}
              {#if canDeleteTask(t)}
                <button onclick={() => confirmDelete(t)}
                        class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">
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
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 sm:top-0 bg-white z-10" style:top="0.5rem">
        <span class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {isEditing ? 'Edit Tugas' : 'Tugas Baru'}
        </span>
        <button onclick={() => showTaskModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
          ✕
        </button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Judul <span class="text-red-500">*</span></label>
          <input type="text" bind:value={formTitle} placeholder="Masukkan judul tugas"
                 class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Deskripsi</label>
          <textarea bind:value={formDescription} rows="3" placeholder="Detail tugas..."
                    class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Ajak Kolaborator</label>
          <div class="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
            {#each users.filter(u => u.id !== user?.id) as u}
              <label class="flex items-center gap-2.5 cursor-pointer hover:bg-white p-2 rounded-lg">
                <input type="checkbox" value={u.id} checked={formAssignedUsers.includes(u.id)}
                       onchange={(e) => {
                         const t = e.target as HTMLInputElement
                         formAssignedUsers = t.checked
                           ? [...formAssignedUsers, u.id]
                           : formAssignedUsers.filter(id => id !== u.id)
                       }}
                       class="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                     style="background: linear-gradient(135deg, #F97316, #EA580C);">
                  {getInitials(u.full_name)}
                </div>
                <span class="text-sm text-slate-700">{u.full_name}</span>
              </label>
            {:else}
              <p class="text-xs text-slate-400 text-center py-3">Tidak ada user lain</p>
            {/each}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Status</label>
            <select bind:value={formStatus}
                    class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="not_started">Belum Dikerjakan</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="review">Review</option>
              <option value="revision">Revisi</option>
              <option value="done">Selesai</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Prioritas</label>
            <select bind:value={formPriority}
                    class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-500">Progress</label>
            <span class="text-xs font-bold text-orange-600">{formProgress}%</span>
          </div>
          <input type="range" bind:value={formProgress} min="0" max="100" step="5"
                 class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Mulai</label>
            <input type="date" bind:value={formStartDate}
                   class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Deadline</label>
            <input type="date" bind:value={formDueDate}
                   class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        {#if formError}<p class="text-sm text-red-500 font-medium">{formError}</p>{/if}

        <div class="flex gap-3 pt-2 pb-4">
          <button onclick={() => showTaskModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
            Batal
          </button>
          <button onclick={saveTask} disabled={isSubmitting}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
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
<!--  Progress Modal                                         -->
<!-- ═══════════════════════════════════════════════════════ -->
{#if showProgressModal}
  <div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation: zoomIn 0.2s ease-out;">
      <div class="px-6 py-5 border-b border-slate-100">
        <p class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Update Progress</p>
        <p class="text-xs text-slate-500 mt-1 line-clamp-1">{progressTaskTitle}</p>
      </div>
      <div class="px-6 py-5">
        <div class="text-center mb-4">
          <p class="text-4xl font-black text-orange-500" style="font-family:'Plus Jakarta Sans',sans-serif;">{progressValue}%</p>
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {#if progressValue === 0}Belum dimulai
            {:else if progressValue === 100}Selesai
            {:else if progressValue >= 80}Siap direview
            {:else}Sedang dikerjakan{/if}
          </p>
        </div>
        <input type="range" bind:value={progressValue} min="0" max="100" step="5"
               class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
        <div class="flex justify-between text-[10px] text-slate-400 mt-2">
          <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
        </div>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showProgressModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
            Batal
          </button>
          <button onclick={updateProgress} disabled={isUpdatingProgress}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {isUpdatingProgress ? 'Menyimpan...' : 'Simpan'}
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
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation: zoomIn 0.2s ease-out;">
      <div class="px-6 py-5">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p class="text-center font-bold text-slate-800 text-base mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Tugas?</p>
        <p class="text-center text-sm text-slate-600">
          "<span class="font-semibold">{deletingTaskTitle}</span>" akan dihapus permanen untuk semua kolaborator.
        </p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showDeleteModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
            Batal
          </button>
          <button onclick={deleteTask} disabled={isDeleting}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60"
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
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation: zoomIn 0.2s ease-out;">
      <div class="px-6 py-5">
        <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3
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
        <p class="text-center font-bold text-slate-800 text-base mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {confirmAction === 'accept' ? 'Bergabung Kolaborasi?' : 'Tolak Undangan?'}
        </p>
        <p class="text-center text-sm text-slate-600">
          {#if confirmAction === 'accept'}
            Anda akan bergabung dalam tugas "<span class="font-semibold">{confirmActionTaskTitle}</span>".
          {:else}
            Anda akan menolak undangan untuk tugas "<span class="font-semibold">{confirmActionTaskTitle}</span>". Tugas ini akan hilang dari daftar Anda.
          {/if}
        </p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showConfirmActionModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
            Batal
          </button>
          <button onclick={confirmActionTask} disabled={isConfirmingAction}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60"
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
</style>