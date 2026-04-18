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
    low: 'Rendah', 
    medium: 'Sedang', 
    high: 'Tinggi' 
  }
  
  const PRIORITY_COLOR: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-600 border-red-200',
  }
  
  const STATUS_LABEL: Record<string, string> = { 
    not_started: 'Belum Dikerjakan', 
    in_progress: 'Sedang Dikerjakan', 
    review: 'Review',
    revision: 'Revisi',
    done: 'Selesai' 
  }
  
  const STATUS_COLOR: Record<string, string> = {
    not_started: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-50 text-blue-700',
    review: 'bg-purple-50 text-purple-700',
    revision: 'bg-amber-50 text-amber-700',
    done: 'bg-green-50 text-green-700',
  }

  const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
    pending: 'Menunggu Konfirmasi',
    accepted: 'Menerima',
    rejected: 'Menolak',
    completed: 'Selesai'
  }

  const ASSIGNMENT_STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200'
  }

  // ── State ──────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let tasks = $state<Task[]>([])
  let assignments = $state<TaskAssignment[]>([])
  let users = $state<UserProfile[]>([])
  let isLoading = $state(true)
  
  // Modal states
  let showTaskModal = $state(false)
  let isEditing = $state(false)
  let editingTaskId = $state<string | null>(null)
  let isSubmitting = $state(false)
  let formError = $state('')
  
  // Filter states
  let activeFilter = $state<'all' | 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'>('all')
  
  // Form data
  let formTitle = $state('')
  let formDescription = $state('')
  let formStatus = $state<'not_started' | 'in_progress' | 'review' | 'revision' | 'done'>('not_started')
  let formPriority = $state<'low' | 'medium' | 'high'>('medium')
  let formProgress = $state(0)
  let formStartDate = $state('')
  let formDueDate = $state('')
  let formAssignedUsers = $state<string[]>([]) // Array untuk multiple users
  
  // Progress update modal
  let showProgressModal = $state(false)
  let progressTaskId = $state<string | null>(null)
  let progressTaskTitle = $state('')
  let progressValue = $state(0)
  let isUpdatingProgress = $state(false)
  
  // Delete confirmation
  let showDeleteModal = $state(false)
  let deletingTaskId = $state<string | null>(null)
  let deletingTaskTitle = $state('')
  let isDeleting = $state(false)

  // Toast
  let toastMsg = $state('')
  let toastVisible = $state(false)
  let toastTimer = 0

  // ── Helpers ────────────────────────────────────────
  function formatDateIndonesian(date: Date) {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatDateShort(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDueDate(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    
    if (diff < 0) return { label: 'Terlambat', color: 'text-red-600' }
    if (diff === 0) return { label: 'Hari ini', color: 'text-orange-600' }
    if (diff === 1) return { label: 'Besok', color: 'text-green-600' }
    if (diff <= 3) return { label: `${diff} hari lagi`, color: 'text-orange-600' }
    return { label: `${diff} hari lagi`, color: 'text-slate-500' }
  }

  function getStatusByProgress(progress: number): Task['status'] {
    if (progress === 0) return 'not_started'
    if (progress === 100) return 'done'
    if (progress >= 80) return 'review'
    return 'in_progress'
  }

  function showToast(msg: string, dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  // ── Data ───────────────────────────────────────────
  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')
    
    if (data) {
      users = data as UserProfile[]
    }
  }

  async function loadTasks() {
    if (!user) return
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      tasks = data as Task[]
    }
  }

  async function loadAssignments() {
    if (!user) return
    
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('user_id', user.id)
    
    if (!error && data) {
      assignments = data as TaskAssignment[]
    }
  }

  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { 
      location.assign('/auth')
      return 
    }
    user = u

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single()
    
    if (profileData) profile = profileData as Profile
    
    await Promise.all([
      loadTasks(),
      loadAssignments(),
      loadUsers()
    ])
    
    isLoading = false
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
    isEditing = true
    editingTaskId = task.id
    formTitle = task.title
    formDescription = task.description || ''
    formStatus = task.status
    formPriority = task.priority
    formProgress = task.progress
    formStartDate = task.start_date ? task.start_date.split('T')[0] : ''
    formDueDate = task.due_date ? task.due_date.split('T')[0] : ''
    
    // Load assigned users for this task
    loadTaskAssignments(task.id)
    formError = ''
    showTaskModal = true
  }

  async function loadTaskAssignments(taskId: string) {
    const { data } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', taskId)
    
    if (data) {
      formAssignedUsers = data.map(a => a.user_id)
    }
  }

  async function saveTask() {
    if (!formTitle.trim()) {
      formError = 'Judul tugas wajib diisi'
      return
    }
    
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
      
      if (isEditing && editingTaskId) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTaskId)
        
        if (error) throw error
        taskId = editingTaskId
        showToast('Tugas berhasil diperbarui!')
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...taskData,
            created_by: user!.id,
          })
          .select()
          .single()
        
        if (error) throw error
        taskId = data.id
        showToast('Tugas berhasil ditambahkan!')
      }
      
        // Update assignments
        // Hapus assignment lama
        await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)

        // Siapkan list user yang akan di-assign (termasuk pembuat tugas otomatis)
        const allAssignedUsers = [...new Set([...formAssignedUsers, user!.id])]

        // Tambah assignment baru
        if (allAssignedUsers.length > 0) {
        const assignmentsToInsert = allAssignedUsers.map(userId => ({
            task_id: taskId,
            user_id: userId,
            status: userId === user!.id ? 'accepted' : 'pending' // Pembuat tugas otomatis accepted
        }))
        
        const { error } = await supabase
            .from('task_assignments')
            .insert(assignmentsToInsert)
        
        if (error) throw error
        }

      showTaskModal = false
      await loadTasks()
    } catch (e: unknown) {
      formError = e instanceof Error ? e.message : 'Terjadi kesalahan'
    } finally {
      isSubmitting = false
    }
  }

  async function updateAssignmentStatus(assignmentId: string, status: 'accepted' | 'rejected') {
    try {
      const updateData: any = { status }
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('task_assignments')
        .update(updateData)
        .eq('id', assignmentId)
      
      if (error) throw error
      
      showToast(status === 'accepted' ? 'Tugas diterima!' : 'Tugas ditolak')
      await loadAssignments()
    } catch (e: unknown) {
      showToast('Gagal mengupdate status')
    }
  }

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
        .update({
          progress: progressValue,
          status: newStatus
        })
        .eq('id', progressTaskId)
      
      if (error) throw error
      
      // Update assignment status to completed if progress 100%
      if (progressValue === 100) {
        const userAssignment = assignments.find(a => a.task_id === progressTaskId)
        if (userAssignment && userAssignment.status === 'accepted') {
          await supabase
            .from('task_assignments')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', userAssignment.id)
        }
      }
      
      showToast(`Progress diperbarui menjadi ${progressValue}%`)
      showProgressModal = false
      await Promise.all([loadTasks(), loadAssignments()])
    } catch (e: unknown) {
      showToast('Gagal memperbarui progress')
    } finally {
      isUpdatingProgress = false
    }
  }

  function confirmDelete(task: Task) {
    deletingTaskId = task.id
    deletingTaskTitle = task.title
    showDeleteModal = true
  }

  async function deleteTask() {
    if (!deletingTaskId) return
    
    isDeleting = true
    
    try {
      // Delete assignments first
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', deletingTaskId)
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', deletingTaskId)
      
      if (error) throw error
      
      showToast('Tugas berhasil dihapus!')
      showDeleteModal = false
      await loadTasks()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus tugas')
    } finally {
      isDeleting = false
      deletingTaskId = null
    }
  }

  // ── Computed ───────────────────────────────────────
  let filteredTasks = $derived(() => {
    if (activeFilter === 'all') return tasks
    return tasks.filter(t => t.status === activeFilter)
  })

  let taskStats = $derived(() => {
    const notStarted = tasks.filter(t => t.status === 'not_started').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const review = tasks.filter(t => t.status === 'review').length
    const revision = tasks.filter(t => t.status === 'revision').length
    const done = tasks.filter(t => t.status === 'done').length
    const total = tasks.length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
    
    return { notStarted, inProgress, review, revision, done, total, completionRate }
  })

  let pendingAssignments = $derived(() => {
    return assignments.filter(a => a.status === 'pending')
  })

  function getUserName(userId: string) {
    const found = users.find(u => u.id === userId)
    return found ? found.full_name : 'Pengguna'
  }

  function getTaskTitle(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    return task ? task.title : 'Tugas'
  }

  function getUserAssignmentStatus(taskId: string) {
    const assignment = assignments.find(a => a.task_id === taskId)
    return assignment?.status || null
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Tugas — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast Notification -->
{#if toastVisible}
  <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
       style="background: linear-gradient(135deg, #F97316, #EA580C); font-family:'Inter',sans-serif; backdrop-filter:blur(10px);">
    {toastMsg}
  </div>
{/if}

<!-- Pending Assignments Banner -->
{#if pendingAssignments().length > 0}
  <div class="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
    <div class="max-w-lg mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="text-xs font-semibold text-amber-700">
          {pendingAssignments().length} tugas menunggu konfirmasi
        </span>
      </div>
      <a href="/notifications" class="text-xs font-medium text-amber-700 hover:text-amber-800 underline">
        Lihat
      </a>
    </div>
  </div>
{/if}

<!-- Task Modal -->
{#if showTaskModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(12px);"
       onclick={() => showTaskModal = false}>
    <div class="w-full max-w-md rounded-2xl overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
         onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
        <span class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {isEditing ? 'Edit Tugas' : 'Tugas Baru'}
        </span>
        <button onclick={() => showTaskModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all">
          ✕
        </button>
      </div>
      
      <div class="px-6 py-6 flex flex-col gap-4">
        <!-- Judul -->
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
            Judul <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            bind:value={formTitle}
            placeholder="Masukkan judul tugas"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                   placeholder:text-slate-400"
          />
        </div>
        
        <!-- Deskripsi -->
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
            Deskripsi <span class="font-normal text-slate-400">(Opsional)</span>
          </label>
          <textarea
            bind:value={formDescription}
            rows="3"
            placeholder="Jelaskan detail tugas..."
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none
                   placeholder:text-slate-400"
          ></textarea>
        </div>
        
        <!-- Assign ke (Multiple Users) -->
        <div>
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
            Assign ke <span class="font-normal text-slate-400">(Bisa pilih beberapa)</span>
        </label>
        <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-2">
            {#each users.filter(u => u.id !== user?.id) as u}
            <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
                <input
                type="checkbox"
                value={u.id}
                checked={formAssignedUsers.includes(u.id)}
                onchange={(e) => {
                    const target = e.target as HTMLInputElement
                    if (target.checked) {
                    formAssignedUsers = [...formAssignedUsers, u.id]
                    } else {
                    formAssignedUsers = formAssignedUsers.filter(id => id !== u.id)
                    }
                }}
                class="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <span class="text-sm text-slate-700">{u.full_name}</span>
            </label>
            {:else}
            <p class="text-sm text-slate-400 text-center py-4">Tidak ada user lain</p>
            {/each}
        </div>
        <p class="text-[10px] text-slate-400 mt-1.5">
            * Anda (pembuat tugas) otomatis terassign
        </p>
        </div>
        
        <!-- Status & Prioritas -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
              Status
            </label>
            <select
              bind:value={formStatus}
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                     bg-white"
            >
              <option value="not_started">Belum Dikerjakan</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="review">Review</option>
              <option value="revision">Revisi</option>
              <option value="done">Selesai</option>
            </select>
          </div>
          
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
              Prioritas
            </label>
            <select
              bind:value={formPriority}
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                     bg-white"
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </div>
        </div>
        
        <!-- Progress -->
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
            Progress <span class="font-normal text-slate-400">({formProgress}%)</span>
          </label>
          <input
            type="range"
            bind:value={formProgress}
            min="0"
            max="100"
            step="5"
            class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div class="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        
        <!-- Tanggal Mulai & Deadline -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              bind:value={formStartDate}
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
              Deadline
            </label>
            <input
              type="date"
              bind:value={formDueDate}
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
        </div>
        
        {#if formError}
          <p class="text-sm text-red-500 font-medium">{formError}</p>
        {/if}
        
        <div class="flex gap-3 mt-2">
          <button onclick={() => showTaskModal = false}
                  class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            Batal
          </button>
          <button onclick={saveTask}
                  disabled={isSubmitting}
                  class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
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

<!-- Progress Update Modal -->
{#if showProgressModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(12px);">
    <div class="w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 duration-200">
      <div class="px-6 py-5 border-b border-slate-100">
        <span class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
          Update Progress
        </span>
        <p class="text-xs text-slate-500 mt-1">{progressTaskTitle}</p>
      </div>
      <div class="px-6 py-5">
        <div class="mb-4">
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
            Progress <span class="font-normal text-slate-400">({progressValue}%)</span>
          </label>
          <input
            type="range"
            bind:value={progressValue}
            min="0"
            max="100"
            step="5"
            class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div class="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>Belum</span>
            <span>Progress</span>
            <span>Review</span>
            <span>Selesai</span>
          </div>
        </div>
        
        <div class="flex gap-3 mt-5">
          <button onclick={() => showProgressModal = false}
                  class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            Batal
          </button>
          <button onclick={updateProgress}
                  disabled={isUpdatingProgress}
                  class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isUpdatingProgress}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menyimpan...
              </span>
            {:else}
              Simpan Progress
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(12px);">
    <div class="w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 duration-200">
      <div class="px-6 py-5 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="text-base font-bold text-slate-800">Hapus Tugas?</span>
        </div>
      </div>
      <div class="px-6 py-5">
        <p class="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus tugas "<span class="font-semibold">{deletingTaskTitle}</span>"?
          Tindakan ini tidak dapat dibatalkan.
        </p>
        <div class="flex gap-3 mt-5">
          <button onclick={() => showDeleteModal = false}
                  class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            Batal
          </button>
          <button onclick={deleteTask}
                  disabled={isDeleting}
                  class="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style="background: #DC2626;">
            {#if isDeleting}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menghapus...
              </span>
            {:else}
              Hapus
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Main App -->
<div class="min-h-screen" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%); font-family:'Inter',sans-serif;">
  
  <!-- Animated Background Blobs -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
  </div>

  <!-- Header Navigation -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img 
        src="/logo-khwarizmi.png" 
        alt="Logo Khwarizmi" 
        class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200"
      />
      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
          Task Tracker
        </span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">Kelola tugas harian Anda</p>
      </div>
    </div>
    <button onclick={openCreateModal}
            class="flex items-center gap-2 text-xs font-semibold text-white rounded-xl px-4 py-2.5 transition-all duration-200 shadow-md"
            style="background: linear-gradient(135deg, #F97316, #EA580C);">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span>Tugas Baru</span>
    </button>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-40">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-medium text-slate-500">Memuat daftar tugas...</p>
      </div>
    </div>
  {:else}
  <main class="max-w-lg mx-auto px-4 py-6 pb-24 flex flex-col gap-5 relative z-10">
    
    <!-- Statistik Tugas -->
    <div class="grid grid-cols-5 gap-2">
      <div class="rounded-xl px-2 py-3 backdrop-blur-sm bg-white/80 shadow-sm border border-white/50 text-center">
        <p class="text-lg font-bold text-slate-800">{taskStats().total}</p>
        <p class="text-[8px] font-medium text-slate-500">Total</p>
      </div>
      <div class="rounded-xl px-2 py-3 backdrop-blur-sm bg-white/80 shadow-sm border border-white/50 text-center">
        <p class="text-lg font-bold text-slate-500">{taskStats().notStarted}</p>
        <p class="text-[8px] font-medium text-slate-500">Belum</p>
      </div>
      <div class="rounded-xl px-2 py-3 backdrop-blur-sm bg-white/80 shadow-sm border border-white/50 text-center">
        <p class="text-lg font-bold text-blue-600">{taskStats().inProgress}</p>
        <p class="text-[8px] font-medium text-slate-500">Progress</p>
      </div>
      <div class="rounded-xl px-2 py-3 backdrop-blur-sm bg-white/80 shadow-sm border border-white/50 text-center">
        <p class="text-lg font-bold text-purple-600">{taskStats().review + taskStats().revision}</p>
        <p class="text-[8px] font-medium text-slate-500">Review</p>
      </div>
      <div class="rounded-xl px-2 py-3 backdrop-blur-sm bg-white/80 shadow-sm border border-white/50 text-center">
        <p class="text-lg font-bold text-green-600">{taskStats().done}</p>
        <p class="text-[8px] font-medium text-slate-500">Selesai</p>
      </div>
    </div>
    
    <!-- Progress Bar -->
    <div class="rounded-xl p-4 backdrop-blur-sm bg-white/80 shadow-sm border border-white/50">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-slate-600">Progres Penyelesaian</span>
        <span class="text-xs font-bold text-orange-600">{taskStats().completionRate}%</span>
      </div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500" 
             style="width: {taskStats().completionRate}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
      </div>
    </div>
    
    <!-- Filter Tabs -->
    <div class="flex gap-1 bg-slate-100/80 backdrop-blur-sm rounded-xl p-1 flex-wrap">
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
          class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200
                 {activeFilter === filter.value
                   ? 'bg-white text-orange-600 shadow-sm'
                   : 'text-slate-500 hover:text-slate-700'}"
        >
          {filter.label}
        </button>
      {/each}
    </div>
    
    <!-- Daftar Tugas -->
    {#if filteredTasks().length === 0}
      <div class="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center border border-white/50">
        <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="text-slate-400 text-sm font-medium">
          {#if activeFilter !== 'all'}
            Belum ada tugas dengan status ini
          {:else}
            Belum ada tugas. Buat tugas baru!
          {/if}
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
      <div class="flex flex-col gap-3">
        {#each filteredTasks() as task}
          {@const due = formatDueDate(task.due_date)}
          {@const assignmentStatus = getUserAssignmentStatus(task.id)}
          
          <div class="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50 transition-all hover:shadow-md">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
                    {task.title}
                  </p>
                  <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border {PRIORITY_COLOR[task.priority]}">
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                </div>
                
                {#if task.description}
                  <p class="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                {/if}
                
                <!-- Dates -->
                <div class="flex items-center gap-3 mt-2">
                  {#if task.start_date}
                    <div class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span class="text-[10px] text-slate-500">{formatDateShort(task.start_date)}</span>
                    </div>
                  {/if}
                  {#if task.due_date}
                    <div class="flex items-center gap-1">
                      <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span class="text-[10px] {due?.color || 'text-slate-500'}">{due?.label}</span>
                    </div>
                  {/if}
                </div>
                
                <!-- Progress Bar -->
                <div class="mt-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[9px] font-medium text-slate-500">Progress</span>
                    <span class="text-[9px] font-semibold text-orange-600">{task.progress}%</span>
                  </div>
                  <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                       onclick={() => openProgressModal(task)}>
                    <div class="h-full rounded-full transition-all duration-500" 
                         style="width: {task.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
                  </div>
                </div>
                
                <!-- Status & Assignment Status -->
                <div class="flex items-center gap-2 mt-3 flex-wrap">
                  <span class="text-[9px] font-bold px-2 py-1 rounded-full {STATUS_COLOR[task.status]}">
                    {STATUS_LABEL[task.status]}
                  </span>
                  
                  {#if assignmentStatus && assignmentStatus !== 'completed'}
                    <span class="text-[9px] font-bold px-2 py-1 rounded-full border {ASSIGNMENT_STATUS_COLOR[assignmentStatus]}">
                      {ASSIGNMENT_STATUS_LABEL[assignmentStatus]}
                    </span>
                  {/if}
                </div>
                
                <!-- Action Buttons for Pending Assignment -->
                {#if assignmentStatus === 'pending'}
                  <div class="flex gap-2 mt-3">
                    <button
                      onclick={() => {
                        const assignment = assignments.find(a => a.task_id === task.id)
                        if (assignment) updateAssignmentStatus(assignment.id, 'accepted')
                      }}
                      class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all"
                    >
                      Terima Tugas
                    </button>
                    <button
                      onclick={() => {
                        const assignment = assignments.find(a => a.task_id === task.id)
                        if (assignment) updateAssignmentStatus(assignment.id, 'rejected')
                      }}
                      class="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
                    >
                      Tolak
                    </button>
                  </div>
                {/if}
                
                {#if assignmentStatus === 'accepted' && task.status !== 'done'}
                  <button onclick={() => openProgressModal(task)}
                          class="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-all">
                    Update Progress
                  </button>
                {/if}
              </div>
              
              {#if profile?.role === 'admin' || task.created_by === user?.id}
                <div class="flex items-center gap-1 ml-3">
                  <button onclick={() => openEditModal(task)}
                          class="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onclick={() => confirmDelete(task)}
                          class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
    
  </main>
  {/if}
</div>

<style>
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-in {
    animation: fade-in 0.3s ease-out;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>