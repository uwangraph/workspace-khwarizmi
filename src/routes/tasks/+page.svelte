<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import toast from 'svelte-french-toast'
  
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

  interface Profile { id: string; full_name: string; role: 'admin' | 'user'; avatar_url?: string | null }
  interface Task { id: string; title: string; description: string | null; status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'; priority: 'low' | 'medium' | 'high'; progress: number; start_date: string | null; due_date: string | null; created_by: string; created_at: string }
  interface TaskAssignment { id: string; task_id: string; user_id: string; status: 'pending' | 'accepted' | 'rejected' | 'completed'; accepted_at: string | null; completed_at: string | null }
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
  let taskSearch = $state('')
  const itemsPerPage = 10
  let currentPage = $state(1)

  let filteredTasks = $derived(tasks.filter(t => {
    const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase()) || (t.description?.toLowerCase().includes(taskSearch.toLowerCase()))
    const matchFilter = activeFilter === 'all' || t.status === activeFilter
    return matchSearch && matchFilter
  }))
  let paginatedTasks = $derived(filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage))
  let totalPages = $derived(Math.ceil(filteredTasks.length / itemsPerPage))
  $effect(() => { taskSearch; activeFilter; currentPage = 1 })

  let formTitle = $state(''), formDescription = $state(''), formStatus = $state<Task['status']>('not_started'), formPriority = $state<Task['priority']>('medium')
  let formProgress = $state(0), formStartDate = $state(''), formDueDate = $state(''), formAssignedUsers = $state<string[]>([])
  let progressTaskId = $state<string | null>(null), progressTaskTitle = $state(''), progressValue = $state(0), initialProgressValue = $state(0), isUpdatingProgress = $state(false)
  let deletingTaskId = $state<string | null>(null), deletingTaskTitle = $state(''), isDeleting = $state(false)
  let confirmAction = $state<'accept' | 'reject' | null>(null), confirmActionTaskTitle = $state(''), confirmActionAssignmentId = $state<string | null>(null), isConfirmingAction = $state(false)

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
    try {
      const { error: rpcError } = await supabase.rpc('send_notification', { p_user_id: uid, p_type: type, p_title: title, p_message: message, p_data: data })
      if (!rpcError) return true
    } catch {}
    try {
      const { error } = await supabase.from('notifications').insert({ user_id: uid, type, title, message, data, is_read: false })
      if (!error) return true
    } catch {}
    return false
  }

  async function insertNotificationMany(uids: string[], type: string, title: string, message: string, data: Record<string, unknown> = {}) {
    for (const uid of uids) await insertNotification(uid, type, title, message, data)
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
    toast.info(`⏰ ${dueTasks.length === 1 ? 'Deadline hari ini: "'+dueTasks[0].title+'"' : dueTasks.length+' tugas deadline hari ini'}`)
  }

  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (p) profile = p as Profile
    const { data: usrs } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name')
    if (usrs) users = usrs as UserProfile[]
    await loadTasks()
    await Promise.all([loadAssignments(), loadAllAssignments()])
    await checkAndNotifyDeadlines()
    isLoading = false
  }

  async function loadTasks() {
    if (!user) return
    if (profile?.role === 'admin') {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      if (data) tasks = data as Task[]
      return
    }
    const { data: myA } = await supabase.from('task_assignments').select('task_id, status').eq('user_id', user.id).in('status', ['accepted', 'pending'])
    const visibleTaskIds = (myA || []).map(a => a.task_id)
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (visibleTaskIds.length > 0) query = query.or(`created_by.eq.${user.id},id.in.(${visibleTaskIds.join(',')})`)
    else query = query.eq('created_by', user.id)
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
    const { data } = await supabase.from('task_assignments').select('*').in('task_id', tasks.map(t => t.id))
    if (data) allAssignments = data as TaskAssignment[]
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
    supabase.from('task_assignments').select('user_id').eq('task_id', task.id).neq('status', 'rejected').then(({data}) => { if (data) formAssignedUsers = data.map(a => a.user_id).filter(uid => uid !== user?.id) })
    showDetailModal = false; showTaskModal = true
  }

  async function saveTask() {
    if (!validateForm()) return
    isSubmitting = true; formError = ''
    try {
      const taskData = { title: formTitle.trim(), description: formDescription.trim(), status: formStatus, priority: formPriority, progress: formProgress, start_date: formStartDate, due_date: formDueDate }
      let taskId: string; const creatorName = getUserName(user!.id)
      if (isEditing && editingTaskId) {
        await supabase.from('tasks').update(taskData).eq('id', editingTaskId)
        taskId = editingTaskId
        const { data: oldA } = await supabase.from('task_assignments').select('user_id, status').eq('task_id', taskId)
        const oldUserIds = (oldA || []).filter(a => a.status !== 'rejected').map(a => a.user_id)
        await supabase.from('task_assignments').delete().eq('task_id', taskId)
        const allUsers = [...new Set([...formAssignedUsers, user!.id])]
        await supabase.from('task_assignments').insert(allUsers.map(uid => ({ task_id: taskId, user_id: uid, status: uid === user!.id ? 'accepted' : 'pending' })))
        const newCollabs = formAssignedUsers.filter(uid => uid !== user!.id && !oldUserIds.includes(uid))
        if (newCollabs.length > 0) await insertNotificationMany(newCollabs, 'task_collaboration_invite', 'Undangan Kolaborasi', `${creatorName} mengundang Anda untuk berkolaborasi di tugas "${formTitle.trim()}".`, { task_id: taskId, task_title: formTitle.trim() })
        toast.success('Tugas berhasil diperbarui')
      } else {
        const { data } = await supabase.from('tasks').insert({ ...taskData, created_by: user!.id }).select().single()
        taskId = data!.id
        const allUsers = [...new Set([...formAssignedUsers, user!.id])]
        await supabase.from('task_assignments').insert(allUsers.map(uid => ({ task_id: taskId, user_id: uid, status: uid === user!.id ? 'accepted' : 'pending' })))
        const others = formAssignedUsers.filter(uid => uid !== user!.id)
        if (others.length > 0) await insertNotificationMany(others, 'task_collaboration_invite', 'Undangan Kolaborasi', `${creatorName} mengundang Anda untuk berkolaborasi di tugas "${formTitle.trim()}".`, { task_id: taskId, task_title: formTitle.trim() })
        toast.success('Tugas berhasil dibuat')
      }
      showTaskModal = false; await refreshAll()
    } catch (e: any) { formError = e.message || 'Terjadi kesalahan' } finally { isSubmitting = false }
  }

  function openConfirmActionModal(action: 'accept' | 'reject', assignment: TaskAssignment, taskTitle: string) { confirmAction = action; confirmActionTaskTitle = taskTitle; confirmActionAssignmentId = assignment.id; showConfirmActionModal = true }
  
  async function confirmActionTask() {
    if (!confirmAction || !confirmActionAssignmentId) return
    isConfirmingAction = true
    try {
      const newStatus = confirmAction === 'accept' ? 'accepted' : 'rejected'
      const updateData: any = { status: newStatus }; if (newStatus === 'accepted') updateData.accepted_at = new Date().toISOString()
      const assignment = assignments.find(a => a.id === confirmActionAssignmentId)
      const task = assignment ? tasks.find(t => t.id === assignment.task_id) : null
      await supabase.from('task_assignments').update(updateData).eq('id', confirmActionAssignmentId)
      if (task && task.created_by !== user!.id) {
        const responderName = getUserName(user!.id)
        await insertNotification(task.created_by, newStatus === 'accepted' ? 'collaboration_accepted' : 'collaboration_rejected', newStatus === 'accepted' ? 'Kolaborator Bergabung' : 'Undangan Ditolak', `${responderName} ${newStatus === 'accepted' ? 'menerima' : 'menolak'} undangan untuk tugas "${confirmActionTaskTitle}".`, { task_id: task.id, task_title: confirmActionTaskTitle })
      }
      toast.success(newStatus === 'accepted' ? 'Anda bergabung dalam tugas ini' : 'Undangan ditolak')
      showConfirmActionModal = false; showDetailModal = false; await refreshAll()
    } catch { toast.error('Gagal memproses') } finally { isConfirmingAction = false; confirmAction = null; confirmActionAssignmentId = null }
  }

  function openProgressModal(task: Task) { progressTaskId = task.id; progressTaskTitle = task.title; progressValue = task.progress; initialProgressValue = task.progress; showProgressModal = true }
  
  async function updateProgress() {
    if (!progressTaskId || progressValue === initialProgressValue) { showProgressModal = false; return }
    isUpdatingProgress = true
    try {
      const newStatus = getStatusByProgress(progressValue)
      await supabase.from('tasks').update({ progress: progressValue, status: newStatus }).eq('id', progressTaskId)
      const task = tasks.find(t => t.id === progressTaskId)
      const updaterName = getUserName(user!.id)
      if (progressValue === 100 && task) {
        const myA = assignments.find(a => a.task_id === progressTaskId)
        if (myA && myA.status === 'accepted') await supabase.from('task_assignments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', myA.id)
        if (task.created_by !== user!.id) await insertNotification(task.created_by, 'task_completed', 'Tugas Selesai', `${updaterName} menyelesaikan tugas "${task.title}".`, { task_id: task.id, task_title: task.title })
        const otherIds = allAssignments.filter(a => a.task_id === progressTaskId && a.user_id !== user!.id && a.user_id !== task.created_by && a.status === 'accepted').map(a => a.user_id)
        if (otherIds.length > 0) await insertNotificationMany(otherIds, 'task_completed', 'Tugas Diselesaikan', `${updaterName} menyelesaikan tugas "${task.title}".`, { task_id: task.id, task_title: task.title })
      } else if (newStatus === 'review' && task && task.created_by !== user!.id) {
        await insertNotification(task.created_by, 'task_ready_review', 'Siap Direview', `${updaterName} menandai tugas "${task.title}" siap direview (${progressValue}%).`, { task_id: task.id, task_title: task.title })
      }
      toast.success(`Progress diperbarui: ${progressValue}%`); showProgressModal = false; await refreshAll()
    } catch { toast.error('Gagal memperbarui progress') } finally { isUpdatingProgress = false }
  }

  function confirmDelete(task: Task) { if (!canDeleteTask(task)) { toast.error('Hanya pembuat tugas yang bisa menghapus'); return }; deletingTaskId = task.id; deletingTaskTitle = task.title; showDetailModal = false; showDeleteModal = true }
  
  async function deleteTask() {
    if (!deletingTaskId) return
    isDeleting = true
    try {
      const { data: tA } = await supabase.from('task_assignments').select('user_id').eq('task_id', deletingTaskId)
      const taskTitle = deletingTaskTitle, deleterName = getUserName(user!.id)
      const collaborators = (tA || []).map(a => a.user_id).filter(uid => uid !== user!.id)
      await supabase.from('task_assignments').delete().eq('task_id', deletingTaskId)
      await supabase.from('tasks').delete().eq('id', deletingTaskId)
      if (collaborators.length > 0) await insertNotificationMany(collaborators, 'task_deleted', 'Tugas Dihapus', `${deleterName} menghapus tugas "${taskTitle}".`, { task_title: taskTitle })
      toast.success('Tugas berhasil dihapus'); showDeleteModal = false; await refreshAll()
    } catch (e: any) { toast.error(e.message || 'Gagal menghapus') } finally { isDeleting = false; deletingTaskId = null }
  }

  function openDetail(task: Task) { detailTask = task; showDetailModal = true }

  let taskStats = $derived.by(() => {
    const notStarted = tasks.filter(t => t.status === 'not_started').length, inProgress = tasks.filter(t => t.status === 'in_progress').length, review = tasks.filter(t => t.status === 'review').length, revision = tasks.filter(t => t.status === 'revision').length, done = tasks.filter(t => t.status === 'done').length, total = tasks.length
    return { notStarted, inProgress, review, revision, done, total, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  onMount(loadData)
</script>

<svelte:head>
  <title>Tugas — Workspace Khwarizmi</title>
</svelte:head>

<div class="min-h-screen pb-24 bg-[#FFF9F0]">
  <AppHeader title="Daftar Tugas" subtitle="Kelola proyek & kolaborasi">
    <button onclick={openCreateModal} class="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer shadow-sm">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </AppHeader>

  <main class="max-w-lg mx-auto p-4 flex flex-col gap-5">
    {#if isLoading}
      <LoadingSpinner message="Memuat tugas..." />
    {:else}
      <TaskStatsBar stats={taskStats} />
      <TaskFilterTabs {activeFilter} search={taskSearch} onFilterChange={(f) => activeFilter = f} onSearchChange={(s) => taskSearch = s} />
      
      {#if filteredTasks.length === 0}
        <EmptyState title="Tidak Ada Tugas" subtitle="Belum ada tugas yang sesuai." emoji="📋" />
      {:else}
        <div class="flex flex-col gap-3">
          {#each paginatedTasks as t (t.id)}
            {@const myA = getUserAssignment(t.id)}
            <TaskCard task={t} isPending={myA?.status === 'pending'} due={formatDueDate(t.due_date)}
                      contributors={getTaskContributors(t.id)} onClick={() => openDetail(t)}
                      {getInitials} {getAvatarGradient} />
          {/each}
        </div>
        <PaginationBar {currentPage} {totalPages} onPrev={() => currentPage--} onNext={() => currentPage++} />
      {/if}
    {/if}
  </main>
</div>

{#if showDetailModal && detailTask}
  <TaskDetailModal task={detailTask} userId={user?.id || ''} contributors={getTaskContributors(detailTask.id)}
                   myAssignment={getUserAssignment(detailTask.id)} canEdit={canEditTask(detailTask)} canDelete={canDeleteTask(detailTask)}
                   due={formatDueDate(detailTask.due_date)} {formatDateShort} {getUserName} {getInitials} {getAvatarGradient}
                   onClose={() => showDetailModal = false} onProgress={() => openProgressModal(detailTask)}
                   onEdit={() => openEditModal(detailTask)} onDelete={() => confirmDelete(detailTask)}
                   onAccept={() => openConfirmActionModal('accept', getUserAssignment(detailTask.id)!, detailTask!.title)}
                   onReject={() => openConfirmActionModal('reject', getUserAssignment(detailTask.id)!, detailTask!.title)} />
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
  <TaskProgressModal taskTitle={progressTaskTitle} {progressValue} initialProgress={initialProgressValue} {isUpdatingProgress}
                     onUpdate={updateProgress} onClose={() => showProgressModal = false} onSetValue={(v) => progressValue = v} />
{/if}

{#if showDeleteModal}
  <TaskDeleteModal taskTitle={deletingTaskTitle} {isDeleting} onConfirm={deleteTask} onClose={() => showDeleteModal = false} />
{/if}

{#if showConfirmActionModal}
  <ConfirmActionModal action={confirmAction!} taskTitle={confirmActionTaskTitle} {isConfirmingAction} onConfirm={confirmActionTask} onClose={() => showConfirmActionModal = false} />
{/if}