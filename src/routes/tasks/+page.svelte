<script lang="ts">
  import { onMount } from 'svelte'
  import type { User } from '@supabase/supabase-js'
  import { page } from '$app/stores'
  import confetti from 'canvas-confetti'
  import { flip } from 'svelte/animate'
  import { fade, fly } from 'svelte/transition'
  import toast from 'svelte-french-toast'
  import { ClipboardList, X, Clock } from 'lucide-svelte'
  
  import { authService } from '$lib/services/authService'
  import { taskService } from '$lib/services/taskService'
  import { notificationService } from '$lib/services/notificationService'
  import type { Profile, Task, TaskAssignment } from '$lib/type'
  
  import AppHeader from '$lib/components/shared/AppHeader.svelte'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  import EmptyState from '$lib/components/shared/EmptyState.svelte'
  import PaginationBar from '$lib/components/shared/PaginationBar.svelte'
  
  import TaskStatsBar from '$lib/components/tasks/TaskStatsBar.svelte'
  import TaskFilterTabs from '$lib/components/tasks/TaskFilterTabs.svelte'
  import TaskCard from '$lib/components/tasks/TaskCard.svelte'
  import TaskDetailModal from '$lib/components/tasks/TaskDetailModal.svelte'
  import TaskFormModal from '$lib/components/tasks/TaskFormModal.svelte'
  import TaskProgressModal from '$lib/components/tasks/TaskProgressModal.svelte'
  import TaskDeleteModal from '$lib/components/tasks/TaskDeleteModal.svelte'
  import ConfirmActionModal from '$lib/components/tasks/ConfirmActionModal.svelte'
  import TaskCalendarView from '$lib/components/tasks/TaskCalendarView.svelte'
  import ReminderModal from '$lib/components/admin/modals/ReminderModal.svelte'

  interface UserProfile { id: string; full_name: string; avatar_url?: string | null }

  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let tasks = $state<Task[]>([])
  let assignments = $state<TaskAssignment[]>([])
  let allAssignments = $state<TaskAssignment[]>([])
  let users = $state<UserProfile[]>([])
  let isLoading = $state(true)

  let showTaskModal = $state(false)
  let showDetailModal = $state(false)
  let showConfirmActionModal = $state(false)
  let showReminderModal = $state(false)
  let showProgressModal = $state(false)
  let showDeleteModal = $state(false)

  let progressTaskId = $state<string | null>(null)
  let progressTaskTitle = $state('')
  let progressValue = $state(0)
  let initialProgressValue = $state(0)
  let isUpdatingProgress = $state(false)
  
  let deletingTaskId = $state<string | null>(null)
  let deletingTaskTitle = $state('')
  let isDeleting = $state(false)

  let confirmAction = $state<'accept' | 'reject' | null>(null)
  let confirmActionTaskTitle = $state('')
  let confirmActionAssignmentId = $state<string | null>(null)
  let isConfirmingAction = $state(false)

  let formTitle = $state('')
  let formDescription = $state('')
  let formStatus = $state<Task['status']>('not_started')
  let formPriority = $state<Task['priority']>('medium')
  let formProgress = $state(0)
  let formStartDate = $state('')
  let formDueDate = $state('')
  let formAssignedUsers = $state<string[]>([])

  let detailTask = $state<Task | null>(null)
  let reminderTarget = $state<{ id: string, full_name: string, status?: string } | null>(null)

  let isEditing = $state(false)
  let editingTaskId = $state<string | null>(null)
  let isSubmitting = $state(false)
  let formError = $state('')
  let formFieldErrors = $state<Record<string, string>>({})

  let activeFilter = $state<'all' | 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'>('all')
  let activePriority = $state<'all' | 'low' | 'medium' | 'high'>('all')
  let sortBy = $state<'newest' | 'oldest' | 'due_date' | 'progress'>('newest')
  let taskSearch = $state('')
  const itemsPerPage = 10
  let currentPage = $state(1)

  let pinnedTaskIds = $state<string[]>([])
  let selectedTaskIds = $state<string[]>([])
  let isSelectionMode = $state(false)
  let isBulkActing = $state(false)
  let viewMode = $state<'list' | 'calendar'>('list')

  onMount(() => {
    loadData()
    const stored = localStorage.getItem('pinned_tasks')
    if (stored) pinnedTaskIds = JSON.parse(stored)

    const taskIdFromUrl = $page.url.searchParams.get('taskId')
    if (taskIdFromUrl) {
      setTimeout(() => {
        const taskToOpen = tasks.find(t => t.id === taskIdFromUrl)
        if (taskToOpen) {
          openDetail(taskToOpen)
          // Clean up URL without reloading
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('taskId')
          window.history.replaceState({}, '', newUrl)
        }
      }, 500) // slight delay to allow data to load
    }
  })

  function togglePin(taskId: string) {
    if (pinnedTaskIds.includes(taskId)) pinnedTaskIds = pinnedTaskIds.filter(id => id !== taskId)
    else pinnedTaskIds = [taskId, ...pinnedTaskIds]
    localStorage.setItem('pinned_tasks', JSON.stringify(pinnedTaskIds))
    toast.success(pinnedTaskIds.includes(taskId) ? '📌 Tugas disematkan' : 'Tugas dilepas')
  }

  let filteredTasks = $derived.by(() => {
    let list = tasks.filter(t => {
      const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase()) || (t.description?.toLowerCase().includes(taskSearch.toLowerCase()))
      const matchFilter = activeFilter === 'all' || t.status === activeFilter
      const matchPriority = activePriority === 'all' || t.priority === activePriority
      return matchSearch && matchFilter && matchPriority
    })
    
    // Initial sort
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      if (sortBy === 'progress') return b.progress - a.progress
      return 0
    })

    // Sort pinned to top
    return list.sort((a, b) => {
      const aPinned = pinnedTaskIds.includes(a.id)
      const bPinned = pinnedTaskIds.includes(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0
    })
  })
  let paginatedTasks = $derived(filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage))
  let totalPages = $derived(Math.ceil(filteredTasks.length / itemsPerPage))
  $effect(() => { taskSearch; activeFilter; activePriority; sortBy; currentPage = 1 })

  function toggleSelection(taskId: string) {
    if (selectedTaskIds.includes(taskId)) selectedTaskIds = selectedTaskIds.filter(id => id !== taskId)
    else selectedTaskIds = [...selectedTaskIds, taskId]
  }

  async function bulkMarkDone() {
    if (selectedTaskIds.length === 0) return
    isBulkActing = true
    try {
      await taskService.bulkUpdateStatus(selectedTaskIds, 'done', 100)
      toast.success(`${selectedTaskIds.length} tugas diselesaikan`)
      selectedTaskIds = []
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } })
      await refreshAll()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyelesaikan tugas')
    } finally {
      isBulkActing = false
    }
  }

  function bulkDelete() {
    if (selectedTaskIds.length === 0) return
    deletingTaskId = 'bulk'
    deletingTaskTitle = `${selectedTaskIds.length} tugas terpilih`
    showDeleteModal = true
  }



  function formatDateShort(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null }
  function formatDueDate(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso); d.setHours(0, 0, 0, 0)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: `Terlambat ${Math.abs(diff)}h`, color: 'text-red-600', urgent: true }
    if (diff === 0) return { label: 'Hari ini', color: 'text-red-600', urgent: true }
    if (diff <= 3) return { label: `${diff} hari lagi`, color: 'text-orange-600', urgent: false }
    return { label: `${diff} hari lagi`, color: 'text-slate-500', urgent: false }
  }
  function getStatusByProgress(progress: number): Task['status'] { return progress === 0 ? 'not_started' : progress === 100 ? 'done' : progress >= 80 ? 'review' : 'in_progress' }
  function getInitials(name: string) { return name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?' }
  function getUser(id: string) { return users.find(u => u.id === id) || null }
  function getUserName(id: string) { return getUser(id)?.full_name || 'Pengguna' }
  function getUserAvatar(id: string) { return getUser(id)?.avatar_url || null }
  function getUserAssignment(taskId: string) { return assignments.find(a => a.task_id === taskId) || null }
  function getTaskContributors(taskId: string) { return allAssignments.filter(a => a.task_id === taskId && a.status !== 'rejected').map(a => ({ id: a.user_id, name: getUserName(a.user_id), avatar: getUserAvatar(a.user_id), status: a.status })) }
  function canEditTask(task: Task) { return profile?.role === 'admin' || task.created_by === user?.id || assignments.find(a => a.task_id === task.id)?.status === 'accepted' }
  function canDeleteTask(task: Task) { return profile?.role === 'admin' || task.created_by === user?.id }
  function getAvatarGradient(status?: string) { return status === 'pending' ? 'linear-gradient(135deg, #60A5FA, #3B82F6)' : status === 'completed' ? 'linear-gradient(135deg, #A855F7, #7C3AED)' : 'linear-gradient(135deg, #F97316, #EA580C)' }

  async function insertNotification(uid: string, type: string, title: string, message: string, data: Record<string, unknown> = {}) {
    return await notificationService.send(uid, type, title, message, data)
  }

  async function insertNotificationMany(uids: string[], type: string, title: string, message: string, data: Record<string, unknown> = {}) {
    await notificationService.sendBulk(uids, type, title, message, data)
  }

  async function checkAndNotifyDeadlines() {
    if (!user) return
    const todayISO = new Date().toISOString().split('T')[0], storageKey = `deadline_notified_${user.id}_${todayISO}`
    const alreadyNotified: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const myAcceptedTaskIds = new Set(assignments.filter(a => a.status === 'accepted').map(a => a.task_id))
    const dueTasks = tasks.filter(t => t.due_date && t.status !== 'done' && t.due_date.split('T')[0] === todayISO && !alreadyNotified.includes(t.id) && (myAcceptedTaskIds.has(t.id) || t.created_by === user!.id))
    if (!dueTasks.length) return
    for (const t of dueTasks) await insertNotification(user.id, 'task_deadline_today', 'Deadline Hari Ini', `Tugas "${t.title}" harus diselesaikan hari ini.`, { task_id: t.id, task_title: t.title })
    localStorage.setItem(storageKey, JSON.stringify([...alreadyNotified, ...dueTasks.map(t => t.id)]))
    toast(`${dueTasks.length === 1 ? 'Deadline hari ini: "'+dueTasks[0].title+'"' : dueTasks.length+' tugas deadline hari ini'}`, { 
      icon: 'Clock' // French toast accepts component name or string, but better to use a string or simple icon
    })
  }

  function handleRemindMember(c: any) {
    reminderTarget = { id: c.id, full_name: c.name, status: c.status }
    showReminderModal = true
  }

  function handleRemindAll() {
    reminderTarget = null
    showReminderModal = true
  }

  async function submitReminder(message: string) {
    if (!reminderTarget && !detailTask) return
    
    let targetIds: string[] = []
    let isBulk = !reminderTarget

    if (reminderTarget) {
      targetIds = [reminderTarget.id]
    } else if (detailTask) {
      const ids = new Set<string>()
      if (detailTask.created_by) ids.add(detailTask.created_by)
      allAssignments
        .filter(a => a.task_id === detailTask?.id && a.status !== 'rejected')
        .forEach(a => ids.add(a.user_id))
      
      // Kecuali diri sendiri
      if (user?.id) ids.delete(user.id)
      targetIds = Array.from(ids)
    }

    if (targetIds.length === 0) {
      toast.error('Tidak ada orang yang bisa diingatkan')
      return
    }

    let successCount = 0
    for (const tid of targetIds) {
      const targetUser = tid === reminderTarget?.id ? reminderTarget : { status: 'accepted' } // default status for bulk
      const title = targetUser.status === 'pending' ? 'Konfirmasi Undangan' : `Pengingat: ${detailTask?.title || 'Tugas'}`
      
      const ok = await notificationService.send(
        tid,
        'task_revision',
        title,
        message,
        { 
          is_admin_reminder: true,
          sender_id: user?.id,
          sender_name: profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User'),
          task_id: detailTask?.id,
          task_title: detailTask?.title,
          status_at_reminder: targetUser.status
        }
      )
      if (ok) successCount++
    }

    if (successCount > 0) {
      toast.success(isBulk ? `Pengingat dikirim ke ${successCount} orang` : 'Pengingat berhasil dikirim')
      showReminderModal = false
      reminderTarget = null
    } else {
      toast.error('Gagal mengirim pengingat')
    }
  }

  import { getContext } from 'svelte'
  import type { Writable } from 'svelte/store'

  async function loadData() {
    isLoading = true
    const u = await authService.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u
    const { data: p } = await authService.getProfile(u.id)
    if (p) profile = p as Profile
    const { data: usrs } = await authService.getAllUsers()
    if (usrs) users = usrs as UserProfile[]
    await loadTasks()
    await Promise.all([loadAssignments(), loadAllAssignments()])
    await checkAndNotifyDeadlines()
    isLoading = false
  }

  const deletionStore = getContext<Writable<boolean>>('deletionStore')
  let isDataHidden = $state(false)
  
  $effect(() => {
    const unsubscribe = deletionStore.subscribe(value => {
      isDataHidden = value
      if (value) {
        tasks = []
        assignments = []
        allAssignments = []
      } else if (!isLoading && user) {
        // Reload data if deletion is cancelled
        loadTasks().then(() => Promise.all([loadAssignments(), loadAllAssignments()]))
      }
    })
    return unsubscribe
  })

  async function loadTasks() {
    if (!user || !profile || isDataHidden) return
    tasks = await taskService.getTasks(user.id, profile.role)
  }

  async function loadAssignments() {
    if (!user || isDataHidden) return
    assignments = await taskService.getAssignments(user.id)
  }

  async function loadAllAssignments() {
    if (tasks.length === 0 || isDataHidden) { allAssignments = []; return }
    allAssignments = await taskService.getAllAssignments(tasks.map(t => t.id))
  }

  async function refreshAll() { await loadTasks(); await Promise.all([loadAssignments(), loadAllAssignments()]) }

  function validateForm() {
    formFieldErrors = {}; let valid = true
    if (!formTitle.trim()) { formFieldErrors.title = 'Judul wajib diisi'; valid = false }
    if (!formDescription.trim()) { formFieldErrors.description = 'Deskripsi wajib diisi'; valid = false }
    if (!formStartDate) { formFieldErrors.startDate = 'Tanggal mulai wajib diisi'; valid = false }
    if (!formDueDate) { formFieldErrors.dueDate = 'Deadline wajib diisi'; valid = false }
    if (formStartDate && formDueDate && new Date(formDueDate) < new Date(formStartDate)) { formFieldErrors.dueDate = 'Deadline harus setelah tanggal mulai'; valid = false }
    if (!valid) formError = 'Mohon lengkapi semua field yang ditandai'
    return valid
  }

  function openCreateModal() { isEditing = false; editingTaskId = null; formTitle = ''; formDescription = ''; formStatus = 'not_started'; formPriority = 'medium'; formProgress = 0; formStartDate = ''; formDueDate = ''; formAssignedUsers = []; formError = ''; formFieldErrors = {}; showTaskModal = true }
  
  function openEditModal(task: Task) {
    if (!canEditTask(task)) { toast.error('Anda tidak memiliki akses untuk mengedit tugas ini'); return }
    isEditing = true; editingTaskId = task.id; formTitle = task.title; formDescription = task.description || ''; formStatus = task.status; formPriority = task.priority; formProgress = task.progress; formStartDate = task.start_date ? task.start_date.split('T')[0] : ''; formDueDate = task.due_date ? task.due_date.split('T')[0] : ''; formError = ''; formFieldErrors = {}
    // Load current assignees using allAssignments already in memory (faster, no extra query)
    formAssignedUsers = allAssignments
      .filter(a => a.task_id === task.id && a.status !== 'rejected' && a.user_id !== user?.id)
      .map(a => a.user_id)
    showDetailModal = false; showTaskModal = true
  }

  async function saveTask() {
    if (!validateForm()) return
    isSubmitting = true; formError = ''
    try {
      const taskData = { title: formTitle.trim(), description: formDescription.trim(), status: formStatus, priority: formPriority, progress: formProgress, start_date: formStartDate, due_date: formDueDate }
      const creatorName = getUserName(user!.id)
      
      const { taskId, newCollabs } = await taskService.saveTask(taskData, formAssignedUsers, user!.id, isEditing, editingTaskId)
      
      if (newCollabs.length > 0) {
        await notificationService.sendBulk(newCollabs, 'task_collaboration_invite', 'Undangan Kolaborasi', `${creatorName} mengundang Anda untuk berkolaborasi di tugas "${formTitle.trim()}".`, { task_id: taskId, task_title: formTitle.trim() })
      }
      
      toast.success(isEditing ? 'Tugas diperbarui' : 'Tugas berhasil dibuat')
      showTaskModal = false; await refreshAll()
    } catch (e: any) { formError = e.message || 'Terjadi kesalahan' } finally { isSubmitting = false }
  }

  function openConfirmActionModal(action: 'accept' | 'reject', assignment: TaskAssignment, taskTitle: string) { confirmAction = action; confirmActionTaskTitle = taskTitle; confirmActionAssignmentId = assignment.id; showConfirmActionModal = true }
  
  async function confirmActionTask() {
    if (!confirmAction || !confirmActionAssignmentId) return
    isConfirmingAction = true
    try {
      const newStatus = confirmAction === 'accept' ? 'accepted' : 'rejected'
      const acceptedAt = newStatus === 'accepted' ? new Date().toISOString() : null
      
      const assignment = assignments.find(a => a.id === confirmActionAssignmentId)
      const task = assignment ? tasks.find(t => t.id === assignment.task_id) : null
      
      await taskService.updateAssignmentStatus(confirmActionAssignmentId, newStatus, acceptedAt)
      
      if (task && task.created_by !== user!.id) {
        const responderName = getUserName(user!.id)
        await notificationService.send(
          task.created_by, 
          newStatus === 'accepted' ? 'collaboration_accepted' : 'collaboration_rejected', 
          newStatus === 'accepted' ? 'Kolaborator Bergabung' : 'Undangan Ditolak', 
          `${responderName} ${newStatus === 'accepted' ? 'menerima' : 'menolak'} undangan untuk tugas "${confirmActionTaskTitle}".`, 
          { task_id: task.id, task_title: confirmActionTaskTitle }
        )
      }
      toast.success(newStatus === 'accepted' ? 'Anda bergabung dalam tugas ini' : 'Undangan ditolak')
      showConfirmActionModal = false; showDetailModal = false; await refreshAll()
    } catch { toast.error('Gagal memproses') } finally { isConfirmingAction = false; confirmAction = null; confirmActionAssignmentId = null }
  }

  function openProgressModal(task: Task) { 
    progressTaskId = task.id; 
    progressTaskTitle = task.title; 
    progressValue = task.progress; 
    initialProgressValue = task.progress; 
    showProgressModal = true 
  }
  
  async function updateProgress() {
    if (!progressTaskId) { showProgressModal = false; return }
    // Only check progress value change
    const isNoChange = progressValue === initialProgressValue
    if (isNoChange) { showProgressModal = false; return }
    
    isUpdatingProgress = true
    try {
      const newStatus = getStatusByProgress(progressValue)
      await taskService.updateProgress(progressTaskId, progressValue, newStatus)
      
      const task = tasks.find(t => t.id === progressTaskId)
      const updaterName = getUserName(user!.id)
      
      if (progressValue === 100 && task) {
        const myA = assignments.find(a => a.task_id === progressTaskId)
        if (myA && myA.status === 'accepted') {
          await taskService.updateAssignmentStatus(myA.id, 'completed', new Date().toISOString())
        }
        
        if (task.created_by !== user!.id) {
          await notificationService.send(task.created_by, 'task_completed', 'Tugas Selesai', `${updaterName} menyelesaikan tugas "${task.title}".`, { task_id: task.id, task_title: task.title })
        }
        
        const otherIds = allAssignments.filter(a => a.task_id === progressTaskId && a.user_id !== user!.id && a.user_id !== task.created_by && a.status === 'accepted').map(a => a.user_id)
        if (otherIds.length > 0) {
          await notificationService.sendBulk(otherIds, 'task_completed', 'Tugas Diselesaikan', `${updaterName} menyelesaikan tugas "${task.title}".`, { task_id: task.id, task_title: task.title })
        }
        
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
      } else if (newStatus === 'review' && task && task.created_by !== user!.id) {
        await notificationService.send(task.created_by, 'task_ready_review', 'Siap Direview', `${updaterName} menandai tugas "${task.title}" siap direview (${progressValue}%).`, { task_id: task.id, task_title: task.title })
      }
      
      toast.success(`Progress diperbarui: ${progressValue}%`); 
      showProgressModal = false; 
      await refreshAll();
      if (detailTask && detailTask.id === progressTaskId) {
        detailTask = tasks.find(t => t.id === progressTaskId) || null;
      }
    } catch { toast.error('Gagal memperbarui progress') } finally { isUpdatingProgress = false }
  }

  async function updateSubtasks(taskId: string, subtasks: any[]) {
    try {
      const { error } = await taskService.updateTaskFields(taskId, { subtasks })
      if (error) throw error
      await refreshAll()
      if (detailTask && detailTask.id === taskId) {
        detailTask = tasks.find(t => t.id === taskId) || null;
      }
    } catch (e: any) {
      toast.error('Gagal menyimpan sub-tugas: ' + e.message)
    }
  }

  function confirmDelete(task: Task) { if (!canDeleteTask(task)) { toast.error('Hanya pembuat tugas yang bisa menghapus'); return }; deletingTaskId = task.id; deletingTaskTitle = task.title; showDetailModal = false; showDeleteModal = true }
  
  async function deleteTask() {
    if (!deletingTaskId) return
    isDeleting = true
    try {
      if (deletingTaskId === 'bulk') {
        await taskService.bulkDeleteTasks(selectedTaskIds)
        toast.success(`${selectedTaskIds.length} tugas dihapus`)
        selectedTaskIds = []
        isSelectionMode = false
        showDeleteModal = false
        await refreshAll()
      } else {
        const taskTitle = deletingTaskTitle, deleterName = getUserName(user!.id)
        const collaborators = allAssignments.filter(a => a.task_id === deletingTaskId && a.user_id !== user!.id).map(a => a.user_id)
        
        const { error } = await taskService.deleteTask(deletingTaskId)
        if (error) throw error
        
        if (collaborators.length > 0) {
          await notificationService.sendBulk(collaborators, 'task_deleted', 'Tugas Dihapus', `${deleterName} menghapus tugas "${taskTitle}".`, { task_title: taskTitle })
        }
        
        toast.success('Tugas berhasil dihapus'); showDeleteModal = false; await refreshAll()
      }
    } catch (e: any) { toast.error(e.message || 'Gagal menghapus') } finally { isDeleting = false; deletingTaskId = null }
  }

  function openDetail(task: Task) { detailTask = task; showDetailModal = true }

  let taskStats = $derived.by(() => {
    const notStarted = tasks.filter(t => t.status === 'not_started').length, inProgress = tasks.filter(t => t.status === 'in_progress').length, review = tasks.filter(t => t.status === 'review').length, revision = tasks.filter(t => t.status === 'revision').length, done = tasks.filter(t => t.status === 'done').length, total = tasks.length
    return { notStarted, inProgress, review, revision, done, total, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 }
  })
</script>

<svelte:head>
  <title>Tugas — Workspace Khwarizmi</title>
</svelte:head>

<div class="min-h-screen pb-24 bg-[#FFF9F0]">
  <AppHeader title="Daftar Tugas" subtitle="Kelola proyek & kolaborasi" />

  <main class="{viewMode === 'calendar' ? 'max-w-4xl' : 'max-w-lg'} mx-auto p-4 flex flex-col gap-5 transition-all duration-500">
    {#if isLoading}
      <LoadingSpinner message="Memuat tugas..." />
    {:else}
      <TaskStatsBar stats={taskStats} />
      
      <!-- Integrated View Tabs -->
      <div class="flex items-center border-b border-slate-200/60 mb-2 mt-1">
        <button onclick={() => viewMode = 'list'} 
                class="flex-1 py-3.5 text-xs font-black transition-all relative uppercase tracking-widest
                       {viewMode === 'list' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-500'}">
          <div class="flex items-center justify-center gap-2.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span>Daftar</span>
            <span class="px-1.5 py-0.5 rounded-md text-[9px] {viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'} transition-colors">
              {tasks.length}
            </span>
          </div>
          {#if viewMode === 'list'}
            <div class="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500 rounded-t-full" transition:fade={{ duration: 150 }}></div>
          {/if}
        </button>
        <button onclick={() => viewMode = 'calendar'} 
                class="flex-1 py-3.5 text-xs font-black transition-all relative uppercase tracking-widest
                       {viewMode === 'calendar' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-500'}">
          <div class="flex items-center justify-center gap-2.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>Kalender</span>
            <span class="px-1.5 py-0.5 rounded-md text-[9px] {viewMode === 'calendar' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'} transition-colors">
              {tasks.filter(t => t.due_date).length}
            </span>
          </div>
          {#if viewMode === 'calendar'}
            <div class="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500 rounded-t-full" transition:fade={{ duration: 150 }}></div>
          {/if}
        </button>
      </div>

      <div class="flex flex-col gap-5">
        {#if viewMode === 'list'}
          <div transition:fly={{ y: 10, duration: 300 }}>
            <div class="flex items-center gap-2 mb-4">
              <!-- Search Bar -->
              <div class="relative flex-1">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input value={taskSearch} oninput={(e) => taskSearch = (e.target as HTMLInputElement).value}
                       placeholder="Cari tugas..."
                       class="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-orange-100 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/20 shadow-sm" />
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick={() => { isSelectionMode = !isSelectionMode; if (!isSelectionMode) selectedTaskIds = [] }}
                        class="flex items-center justify-center p-2.5 rounded-2xl {isSelectionMode ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'} transition-all shadow-sm active:scale-95"
                        title={isSelectionMode ? 'Batal Pilih' : 'Pilih Tugas'}>
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </button>
                <button onclick={openCreateModal}
                        class="flex items-center justify-center p-2.5 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95"
                        title="Tambah Tugas">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between mb-4">
              <div class="flex-1 min-w-0">
                <TaskFilterTabs {activeFilter} {activePriority} {sortBy} search={taskSearch} 
                              onFilterChange={(f) => activeFilter = f} 
                              onPriorityChange={(p) => activePriority = p}
                              onSortChange={(s) => sortBy = s}
                              onSearchChange={(s) => taskSearch = s} />
              </div>
            </div>
            
            {#if filteredTasks.length === 0}
              <EmptyState title="Tidak Ada Tugas" subtitle="Belum ada tugas yang sesuai.">
                <ClipboardList size={40} class="text-slate-200" />
              </EmptyState>
            {:else}
              <div class="flex flex-col gap-3.5">
                {#each paginatedTasks as t (t.id)}
                  {@const myA = getUserAssignment(t.id)}
                  <div animate:flip={{ duration: 300 }} transition:fade={{ duration: 200 }}>
                    <TaskCard task={t} isPending={myA?.status === 'pending'} due={formatDueDate(t.due_date)}
                              isPinned={pinnedTaskIds.includes(t.id)}
                              selectionMode={isSelectionMode}
                              isSelected={selectedTaskIds.includes(t.id)}
                              contributors={getTaskContributors(t.id)} onClick={() => {
                                if (isSelectionMode) toggleSelection(t.id)
                                else openDetail(t)
                              }}
                              onSelect={() => toggleSelection(t.id)}
                              {getInitials} {getAvatarGradient} />
                  </div>
                {/each}
              </div>
              <PaginationBar {currentPage} {totalPages} onPrev={() => currentPage--} onNext={() => currentPage++} />
            {/if}
          </div>
        {:else}
          <div transition:fly={{ y: 10, duration: 300 }}>
            <TaskCalendarView 
              tasks={tasks.map(t => ({...t, isPending: getUserAssignment(t.id)?.status === 'pending'}))} 
              onTaskClick={openDetail} 
            />
          </div>
        {/if}
      </div>
    {/if}
  </main>

  {#if isSelectionMode}
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between z-40" transition:fly={{ y: 50, duration: 250 }}>
      <div class="flex items-center gap-3">
        <button onclick={() => { isSelectionMode = false; selectedTaskIds = [] }} class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
          <X size={16} />
        </button>
        <div class="flex flex-col">
          <span class="text-sm font-bold leading-tight">{selectedTaskIds.length} tugas dipilih</span>
          {#if selectedTaskIds.length !== filteredTasks.length}
            <button onclick={() => selectedTaskIds = filteredTasks.map(t => t.id)} class="text-[10px] text-slate-400 hover:text-white text-left">Pilih Semua</button>
          {:else}
            <button onclick={() => selectedTaskIds = []} class="text-[10px] text-slate-400 hover:text-white text-left">Kosongkan</button>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2">
        {#if selectedTaskIds.length > 0}
          <button onclick={bulkDelete} disabled={isBulkActing} class="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50" title="Hapus">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button onclick={bulkMarkDone} disabled={isBulkActing} class="px-3 py-2 rounded-xl bg-green-500 text-white font-bold text-xs hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            Selesai
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if showDetailModal && detailTask}
  <TaskDetailModal task={detailTask} userId={user?.id || ''} contributors={getTaskContributors(detailTask.id)}
                   myAssignment={getUserAssignment(detailTask.id)} canEdit={canEditTask(detailTask)} canDelete={canDeleteTask(detailTask)}
                   isPinned={pinnedTaskIds.includes(detailTask.id)}
                   onTogglePin={() => togglePin(detailTask!.id)}
                   onUpdateSubtasks={(subtasks) => updateSubtasks(detailTask!.id, subtasks)}
                   due={formatDueDate(detailTask.due_date)} {formatDateShort} {getUserName} {getInitials} {getAvatarGradient}
                   onClose={() => showDetailModal = false} onProgress={() => openProgressModal(detailTask!)}
                   onEdit={() => openEditModal(detailTask!)} onDelete={() => confirmDelete(detailTask!)}
                   onAccept={() => openConfirmActionModal('accept', getUserAssignment(detailTask!.id)!, detailTask!.title)}
                   onReject={() => openConfirmActionModal('reject', getUserAssignment(detailTask!.id)!, detailTask!.title)}
                   onRemindMember={handleRemindMember}
                   onRemindAll={handleRemindAll} />
{/if}

{#if showTaskModal}
  <TaskFormModal {isEditing} currentUserId={user?.id || ''} {users} {formTitle} {formDescription} {formStatus} {formPriority}
                 {formProgress} {formStartDate} {formDueDate} {formAssignedUsers} {formError} {formFieldErrors} {isSubmitting}
                 onClose={() => showTaskModal = false} onSave={saveTask}
                 onTitleChange={(v) => formTitle = v} onDescChange={(v) => formDescription = v}
                 onStatusChange={(v) => formStatus = v as any} onPriorityChange={(v) => formPriority = v as any}
                 onProgressChange={(v) => formProgress = v} onStartDateChange={(v) => formStartDate = v}
                 onDueDateChange={(v) => formDueDate = v}
                 onAssignChange={(id, checked) => { if (checked) formAssignedUsers = [...formAssignedUsers, id]; else formAssignedUsers = formAssignedUsers.filter(uid => uid !== id) }}
                 {getInitials} />
{/if}

{#if showProgressModal}
  <TaskProgressModal
    taskTitle={progressTaskTitle}
    progressValue={progressValue}
    initialProgress={initialProgressValue}
    isUpdating={isUpdatingProgress}
    onUpdate={updateProgress}
    onClose={() => showProgressModal = false}
    onSetValue={(v) => progressValue = v}
  />
{/if}

{#if showDeleteModal}
  <TaskDeleteModal taskTitle={deletingTaskTitle} {isDeleting} onConfirm={deleteTask} onClose={() => showDeleteModal = false} />
{/if}

{#if showConfirmActionModal}
  <ConfirmActionModal action={confirmAction!} taskTitle={confirmActionTaskTitle} {isConfirmingAction} onConfirm={confirmActionTask} onClose={() => showConfirmActionModal = false} />
{/if}

{#if showReminderModal && (reminderTarget || detailTask)}
  <ReminderModal user={reminderTarget ? { id: reminderTarget.id, full_name: reminderTarget.full_name, role: 'user' } : null}
                 onClose={() => showReminderModal = false}
                 onSubmit={submitReminder} />
{/if}