<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import {
    Users, ClipboardList, Clock, BarChart3,
    ChevronRight, Search, Shield, UserCog,
    Trash2, CheckCircle2, AlertCircle, X,
    Eye, EyeOff, Plus, Pencil, RotateCcw,
    LogOut, Bell, TrendingUp, CalendarDays,
    AlertTriangle, UserCheck, UserX,
    Activity, PieChart, Target, Calendar
  } from 'lucide-svelte'

  // ── Types ────────────────────────────────────────────
  interface Profile {
    id: string
    full_name: string
    role: 'admin' | 'user'
    avatar_url?: string | null
    phone?: string | null
    position?: string | null
    joined_at?: string | null
  }

  interface Task {
    id: string
    title: string
    status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
    priority: 'low' | 'medium' | 'high'
    due_date: string | null
    progress: number
    created_by: string
    created_at: string
  }

  interface AttendanceRecord {
    id: string
    user_id: string
    session_id: number
    date: string
    check_in: string | null
    check_out: string | null
    late: boolean
    forgot_checkout: boolean
  }

  interface TaskAssignment {
    task_id: string
    user_id: string
    status: string
  }

  // ── State ────────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let isLoading = $state(true)
  let activeTab = $state<'overview' | 'users' | 'tasks' | 'attendance'>('overview')

  // Data
  let allUsers = $state<Profile[]>([])
  let allTasks = $state<Task[]>([])
  let allAttendance = $state<AttendanceRecord[]>([])
  let allAssignments = $state<TaskAssignment[]>([])

  // Search & filter
  let userSearch = $state('')
  let taskSearch = $state('')
  let taskFilter = $state<'all' | Task['status']>('all')
  let attendanceDate = $state(new Date().toISOString().split('T')[0])
  let attendanceMode = $state<'daily' | 'monthly'>('daily')
  let attendanceMonth = $state(new Date().toISOString().slice(0, 7))

  // Modals
  let showUserModal = $state(false)
  let showDeleteUserModal = $state(false)
  let showDeleteTaskModal = $state(false)
  let showRoleModal = $state(false)
  let showPerformanceModal = $state(false)

  let selectedUser = $state<Profile | null>(null)
  let selectedTask = $state<Task | null>(null)
  let performanceUser = $state<Profile | null>(null)

  // Edit user form
  let editFullName = $state('')
  let editPhone = $state('')
  let editPosition = $state('')
  let editRole = $state<'admin' | 'user'>('user')
  let editJoinedAt = $state('')
  let isSubmittingUser = $state(false)

  // New user form
  let showNewUserModal = $state(false)
  let newName = $state('')
  let newEmail = $state('')
  let newPassword = $state('')
  let newRole = $state<'admin' | 'user'>('user')
  let newPosition = $state('')
  let showNewPw = $state(false)
  let isCreatingUser = $state(false)

  let isDeletingUser = $state(false)
  let isDeletingTask = $state(false)

  // Toast
  let toastMsg = $state('')
  let toastType = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer = 0

  // ── Constants ─────────────────────────────────────────
  const STATUS_LABEL: Record<string, string> = {
    not_started: 'Belum Mulai',
    in_progress: 'Dikerjakan',
    review: 'Review',
    revision: 'Revisi',
    done: 'Selesai',
  }
  const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    not_started: { bg: 'bg-slate-100', text: 'text-slate-600' },
    in_progress:  { bg: 'bg-blue-50',   text: 'text-blue-700'  },
    review:       { bg: 'bg-purple-50', text: 'text-purple-700'},
    revision:     { bg: 'bg-amber-50',  text: 'text-amber-700' },
    done:         { bg: 'bg-green-50',  text: 'text-green-700' },
  }
  const PRIORITY_DOT: Record<string, string> = {
    low: '#94A3B8', medium: '#F59E0B', high: '#EF4444'
  }
  const SESSIONS = [
    { id: 1, label: 'Pagi' },
    { id: 2, label: 'Siang' },
    { id: 3, label: 'Sore' },
  ]

  // ── Helpers ───────────────────────────────────────────
  function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success', dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastType = type
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  // ── Derived: Overview Stats ────────────────────────────
  let totalUsers = $derived(allUsers.length)
  let totalAdmins = $derived(allUsers.filter(u => u.role === 'admin').length)
  let totalTasks = $derived(allTasks.length)
  let doneTasks = $derived(allTasks.filter(t => t.status === 'done').length)
  let overdueTasks = $derived(allTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    return new Date(t.due_date) < new Date()
  }).length)

  let todayAttendance = $derived(allAttendance.filter(a => a.date === new Date().toISOString().split('T')[0]))
  let todayPresentUsers = $derived(new Set(todayAttendance.map(a => a.user_id)).size)

  let completionRate = $derived(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0)

  // ── Derived: Filtered lists ────────────────────────────
  let filteredUsers = $derived(
    allUsers.filter(u =>
      !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.position?.toLowerCase().includes(userSearch.toLowerCase())
    )
  )

  let filteredTasks = $derived(
    allTasks.filter(t => {
      const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase())
      const matchFilter = taskFilter === 'all' || t.status === taskFilter
      return matchSearch && matchFilter
    })
  )

  let attendanceByDate = $derived(
    allAttendance.filter(a => a.date === attendanceDate)
  )

  function getUserAttendanceForDate(userId: string) {
    return attendanceByDate.filter(a => a.user_id === userId)
  }

  function getTaskCreatorName(userId: string) {
    return allUsers.find(u => u.id === userId)?.full_name || 'Unknown'
  }

  function getTaskAssignees(taskId: string) {
    return allAssignments
      .filter(a => a.task_id === taskId && a.status !== 'rejected')
      .map(a => allUsers.find(u => u.id === a.user_id)?.full_name || 'Unknown')
  }

  // ── Derived: Attendance & Performance ──────────────────
  function getMonthlyAttendance(userId: string) {
    const records = allAttendance.filter(a => a.user_id === userId && a.date.startsWith(attendanceMonth))
    const dates = new Set(records.map(r => r.date))
    let totalPresentDays = 0
    let totalLate = 0

    dates.forEach(date => {
      const dayRecords = records.filter(r => r.date === date)
      if (dayRecords.some(r => r.check_in)) totalPresentDays++
      if (dayRecords.some(r => r.late)) totalLate++
    })

    const totalWorkingDays = 22 // Asumsi 22 hari kerja
    const presentRate = Math.round((totalPresentDays / totalWorkingDays) * 100)
    
    return { totalPresentDays, totalLate, presentRate }
  }

  function getUserPerformanceStats(userId: string) {
    const assignedTaskIds = allAssignments.filter(a => a.user_id === userId && a.status !== 'rejected').map(a => a.task_id)
    const userTasks = allTasks.filter(t => assignedTaskIds.includes(t.id))
    
    const total = userTasks.length
    const done = userTasks.filter(t => t.status === 'done').length
    const overdue = userTasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

    return { total, done, overdue, completionRate }
  }

  // ── Load Data ─────────────────────────────────────────
  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u

    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || p.role !== 'admin') { location.assign('/'); return }
    profile = p

    const [usersRes, tasksRes, attendRes, assignRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('attendance').select('*').order('date', { ascending: false }),
      supabase.from('task_assignments').select('*'),
    ])

    if (usersRes.data) allUsers = usersRes.data as Profile[]
    if (tasksRes.data) allTasks = tasksRes.data as Task[]
    if (attendRes.data) allAttendance = attendRes.data as AttendanceRecord[]
    if (assignRes.data) allAssignments = assignRes.data as TaskAssignment[]

    isLoading = false
  }

  // ── User Actions ──────────────────────────────────────
  function openEditUser(u: Profile) {
    selectedUser = u
    editFullName = u.full_name
    editPhone = u.phone || ''
    editPosition = u.position || ''
    editRole = u.role
    editJoinedAt = u.joined_at || ''
    showUserModal = true
  }

  async function saveUser() {
    if (!selectedUser || !editFullName.trim()) return
    isSubmittingUser = true
    const { error } = await supabase.from('profiles')
      .update({
        full_name: editFullName.trim(),
        phone: editPhone.trim() || null,
        position: editPosition.trim() || null,
        role: editRole,
        joined_at: editJoinedAt || null,
      })
      .eq('id', selectedUser.id)
    isSubmittingUser = false

    if (error) { showToast('Gagal menyimpan perubahan', 'error'); return }

    allUsers = allUsers.map(u =>
      u.id === selectedUser!.id
        ? { ...u, full_name: editFullName.trim(), phone: editPhone.trim() || null,
            position: editPosition.trim() || null, role: editRole, joined_at: editJoinedAt || null }
        : u
    )
    showUserModal = false
    showToast('Data pengguna diperbarui', 'success')
  }

  async function deleteUser() {
    if (!selectedUser) return
    isDeletingUser = true
    // Delete from profiles (cascade should handle auth if set up, otherwise just profile)
    const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id)
    isDeletingUser = false

    if (error) { showToast('Gagal menghapus pengguna', 'error'); return }
    allUsers = allUsers.filter(u => u.id !== selectedUser!.id)
    showDeleteUserModal = false
    selectedUser = null
    showToast('Pengguna berhasil dihapus', 'success')
  }

  // ── Task Actions ──────────────────────────────────────
  async function deleteTask() {
    if (!selectedTask) return
    isDeletingTask = true
    const { error } = await supabase.from('tasks').delete().eq('id', selectedTask.id)
    isDeletingTask = false

    if (error) { showToast('Gagal menghapus tugas', 'error'); return }
    allTasks = allTasks.filter(t => t.id !== selectedTask!.id)
    showDeleteTaskModal = false
    selectedTask = null
    showToast('Tugas berhasil dihapus', 'success')
  }

  async function updateTaskStatus(task: Task, newStatus: Task['status']) {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    if (error) { showToast('Gagal update status', 'error'); return }
    allTasks = allTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    showToast('Status tugas diperbarui', 'success')
  }

  // ── Create User ───────────────────────────────────────
  async function createUser() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      showToast('Nama, email, dan password wajib diisi', 'error'); return
    }
    if (newPassword.length < 8) {
      showToast('Password minimal 8 karakter', 'error'); return
    }

    isCreatingUser = true
    // Create auth user via Supabase admin (this uses service role in real app)
    // In client-side we can use signUp and then update profile
    const { data, error } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword.trim(),
      options: {
        data: { full_name: newName.trim() }
      }
    })
    isCreatingUser = false

    if (error || !data.user) {
      showToast(error?.message || 'Gagal membuat akun', 'error'); return
    }

    // Update profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: newName.trim(),
      role: newRole,
      position: newPosition.trim() || null,
    })

    showNewUserModal = false
    newName = ''; newEmail = ''; newPassword = ''; newPosition = ''; newRole = 'user'
    showToast('Pengguna baru berhasil dibuat', 'success')
    await loadData()
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Admin Panel — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-3 rounded-xl text-sm font-medium text-white shadow-2xl flex items-center gap-2 max-w-[90vw]"
       style="background:{toastType==='success'?'#16A34A':toastType==='error'?'#DC2626':'#3B82F6'}; animation:slideInUp .3s ease-out">
    {#if toastType==='success'}<CheckCircle2 size={16}/>{:else}<AlertCircle size={16}/>{/if}
    {toastMsg}
  </div>
{/if}

<div class="min-h-screen bg-slate-50 pb-24" style="font-family:'Inter',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#F97316,#EA580C)">
        <Shield size={16} class="text-white" />
      </div>
      <div>
        <p class="font-bold text-slate-900 text-sm leading-none" style="font-family:'Plus Jakarta Sans',sans-serif;">Admin Panel</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Workspace Khwarizmi</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <a href="/" class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer" title="Ke Dashboard">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </a>
    </div>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-40 gap-3">
      <div class="w-8 h-8 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin"></div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memuat data admin...</p>
    </div>
  {:else}

    <div class="sticky top-[57px] z-20 bg-white border-b border-slate-200 px-4">
      <div class="flex gap-0 max-w-6xl mx-auto w-full overflow-x-auto no-scrollbar">
        {#each [
          { id: 'overview', label: 'Ringkasan', Icon: BarChart3 },
          { id: 'users', label: 'Pengguna', Icon: Users },
          { id: 'tasks', label: 'Tugas', Icon: ClipboardList },
          { id: 'attendance', label: 'Kehadiran', Icon: Clock },
        ] as tab}
          <button
            onclick={() => activeTab = tab.id as any}
            class="flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer flex-shrink-0"
            class:border-orange-500={activeTab === tab.id}
            class:text-orange-600={activeTab === tab.id}
            class:border-transparent={activeTab !== tab.id}
            class:text-slate-400={activeTab !== tab.id}
          >
            <svelte:component this={tab.Icon} size={13} />
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <main class="max-w-6xl mx-auto w-full px-4 py-5 flex flex-col gap-4">

      <!-- ══════════════════ OVERVIEW TAB ══════════════════ -->
      {#if activeTab === 'overview'}

        <!-- Hero Stats -->
        <div class="rounded-2xl p-5 text-white shadow-lg" style="background:linear-gradient(135deg,#F97316,#EA580C)">
          <div class="flex items-center gap-2 mb-4">
            <TrendingUp size={16} class="text-orange-200" />
            <span class="text-xs font-bold text-orange-100 uppercase tracking-wider">Statistik Hari Ini</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white/15 rounded-xl p-3">
              <p class="text-2xl font-black" style="font-family:'Plus Jakarta Sans',sans-serif;">{todayPresentUsers}</p>
              <p class="text-[10px] text-orange-100 mt-0.5">Hadir Hari Ini</p>
            </div>
            <div class="bg-white/15 rounded-xl p-3">
              <p class="text-2xl font-black" style="font-family:'Plus Jakarta Sans',sans-serif;">{totalUsers - todayPresentUsers}</p>
              <p class="text-[10px] text-orange-100 mt-0.5">Tidak Hadir</p>
            </div>
          </div>
        </div>

        <!-- Stat Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          {#each [
            { label: 'Total Pengguna', val: totalUsers, sub: `${totalAdmins} admin`, color: '#F97316', Icon: Users },
            { label: 'Total Tugas', val: totalTasks, sub: `${completionRate}% selesai`, color: '#16A34A', Icon: ClipboardList },
            { label: 'Tugas Overdue', val: overdueTasks, sub: 'melewati deadline', color: '#EF4444', Icon: AlertTriangle },
            { label: 'Tugas Selesai', val: doneTasks, sub: `dari ${totalTasks} tugas`, color: '#2563EB', Icon: CheckCircle2 },
          ] as card}
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div class="flex items-start justify-between mb-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:{card.color}15">
                  <svelte:component this={card.Icon} size={15} style="color:{card.color}" />
                </div>
              </div>
              <p class="text-2xl font-black" style="color:{card.color}; font-family:'Plus Jakarta Sans',sans-serif;">{card.val}</p>
              <p class="text-xs font-semibold text-slate-700 mt-0.5">{card.label}</p>
              <p class="text-[10px] text-slate-400">{card.sub}</p>
            </div>
          {/each}
        </div>

        <!-- Progress Bar & Team Performance -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-center gap-2 mb-4">
            <Target size={16} class="text-orange-500" />
            <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Performa Tim Keseluruhan</p>
          </div>
          
          <div class="flex justify-between items-end mb-2">
            <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tingkat Penyelesaian</p>
            <span class="text-lg font-black text-orange-500">{completionRate}%</span>
          </div>
          <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div class="h-full rounded-full transition-all duration-700"
                 style="width:{completionRate}%; background:linear-gradient(90deg,#F97316,#FBBF24)"></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            {#each [
              { label: 'Selesai', val: doneTasks, dot: '#22C55E' },
              { label: 'Dikerjakan', val: allTasks.filter(t=>t.status==='in_progress').length, dot: '#3B82F6' },
              { label: 'Review', val: allTasks.filter(t=>t.status==='review'||t.status==='revision').length, dot: '#A855F7' },
              { label: 'Belum Mulai', val: allTasks.filter(t=>t.status==='not_started').length, dot: '#CBD5E1' },
            ] as item}
              <div class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" style="background:{item.dot}"></div>
                  <span class="text-xs text-slate-500">{item.label}</span>
                </div>
                <span class="text-sm font-bold text-slate-700">{item.val}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Kehadiran Hari Ini - Mini -->
        <div>
          <div class="flex items-center justify-between px-1 mb-2">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kehadiran Hari Ini</p>
            <button onclick={() => activeTab = 'attendance'} class="text-[10px] font-bold text-orange-600 flex items-center gap-1 cursor-pointer">
              Lihat Semua <ChevronRight size={11} />
            </button>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {#each allUsers.slice(0, 5) as u}
              {@const userAtt = getUserAttendanceForDate(u.id)}
              {@const hasAtt = userAtt.length > 0}
              <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                     style="background:linear-gradient(135deg,#F97316,#EA580C)">
                  {#if u.avatar_url}
                    <img src={u.avatar_url} alt="" class="w-full h-full object-cover rounded-xl" />
                  {:else}
                    {getInitials(u.full_name)}
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-700 truncate">{u.full_name}</p>
                  <p class="text-[10px] text-slate-400">{u.position || 'Karyawan'}</p>
                </div>
                <div class="flex gap-1">
                  {#each SESSIONS as s}
                    {@const att = userAtt.find(a => a.session_id === s.id)}
                    <div class="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold"
                         class:bg-green-100={att?.check_out}
                         class:text-green-600={att?.check_out}
                         class:bg-orange-100={att?.check_in && !att?.check_out}
                         class:text-orange-600={att?.check_in && !att?.check_out}
                         class:bg-slate-100={!att?.check_in}
                         class:text-slate-400={!att?.check_in}
                         title={s.label}>
                      {s.label[0]}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
            {#if allUsers.length > 5}
              <div class="px-4 py-2.5 text-center">
                <button onclick={() => activeTab = 'attendance'} class="text-xs font-semibold text-orange-600 cursor-pointer">
                  +{allUsers.length - 5} pengguna lainnya
                </button>
              </div>
            {/if}
          </div>
        </div>

      <!-- ══════════════════ USERS TAB ══════════════════ -->
      {:else if activeTab === 'users'}

        <div class="flex gap-2 items-center">
          <div class="flex-1 relative">
            <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input bind:value={userSearch} placeholder="Cari nama atau posisi..."
                   class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <button onclick={() => showNewUserModal = true}
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer flex-shrink-0"
                  style="background:linear-gradient(135deg,#F97316,#EA580C)">
            <Plus size={16} />
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500">{filteredUsers.length} pengguna</span>
            <span class="text-[10px] text-slate-400">{totalAdmins} admin · {totalUsers - totalAdmins} karyawan</span>
          </div>
          {#if filteredUsers.length === 0}
            <div class="py-12 text-center">
              <Users size={28} class="text-slate-200 mx-auto mb-2" />
              <p class="text-xs text-slate-400">Tidak ada pengguna ditemukan</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {#each filteredUsers as u}
              <div class="flex items-center gap-3 px-4 py-3.5 border-b md:border-r md:border-b-0 border-slate-50 hover:bg-slate-50 transition-colors">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white overflow-hidden"
                     style="background:linear-gradient(135deg,#F97316,#EA580C)">
                  {#if u.avatar_url}
                    <img src={u.avatar_url} alt="" class="w-full h-full object-cover" />
                  {:else}
                    {getInitials(u.full_name)}
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                    {#if u.role === 'admin'}
                      <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 flex-shrink-0">ADMIN</span>
                    {/if}
                  </div>
                  <p class="text-[11px] text-slate-400 truncate">{u.position || 'Belum diisi'} {u.phone ? '· ' + u.phone : ''}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button onclick={() => { performanceUser = u; showPerformanceModal = true }}
                          class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-50 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors cursor-pointer" title="Lihat Performa">
                    <Activity size={13} />
                  </button>
                  <button onclick={() => openEditUser(u)}
                          class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-orange-50 flex items-center justify-center text-slate-500 hover:text-orange-600 transition-colors cursor-pointer">
                    <Pencil size={13} />
                  </button>
                  <button onclick={() => { selectedUser = u; showDeleteUserModal = true }}
                          class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            {/each}
            </div>
          {/if}
        </div>

      <!-- ══════════════════ TASKS TAB ══════════════════ -->
      {:else if activeTab === 'tasks'}

        <div class="relative">
          <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input bind:value={taskSearch} placeholder="Cari judul tugas..."
                 class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <!-- Status filter chips -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {#each [
            { val: 'all', label: 'Semua' },
            { val: 'not_started', label: 'Belum' },
            { val: 'in_progress', label: 'Dikerjakan' },
            { val: 'review', label: 'Review' },
            { val: 'revision', label: 'Revisi' },
            { val: 'done', label: 'Selesai' },
          ] as f}
            <button
              onclick={() => taskFilter = f.val as any}
              class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
              class:text-white={taskFilter === f.val}
              class:bg-slate-100={taskFilter !== f.val}
              class:text-slate-500={taskFilter !== f.val}
              style={taskFilter === f.val ? 'background:linear-gradient(135deg,#F97316,#EA580C);' : ''}>
              {f.label}
            </button>
          {/each}
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-500">{filteredTasks.length} tugas</span>
          </div>
          {#if filteredTasks.length === 0}
            <div class="py-12 text-center">
              <ClipboardList size={28} class="text-slate-200 mx-auto mb-2" />
              <p class="text-xs text-slate-400">Tidak ada tugas ditemukan</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {#each filteredTasks as task}
              {@const ss = STATUS_STYLE[task.status]}
              {@const assignees = getTaskAssignees(task.id)}
              <div class="px-4 py-3.5 border-b md:border-r md:border-b-0 border-slate-50 hover:bg-slate-50 transition-colors">
                <div class="flex items-start gap-2.5">
                  <div class="w-1.5 h-5 rounded-full mt-0.5 flex-shrink-0" style="background:{PRIORITY_DOT[task.priority]}"></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-sm font-semibold text-slate-800 leading-snug">{task.title}</p>
                      <span class="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 {ss.bg} {ss.text}">
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="text-[10px] text-slate-400">Oleh: {getTaskCreatorName(task.created_by)}</span>
                      {#if task.due_date}
                        <span class="text-[10px] text-slate-400">· {formatDate(task.due_date)}</span>
                      {/if}
                    </div>
                    {#if assignees.length > 0}
                      <p class="text-[10px] text-slate-400 mt-0.5">Dikerjakan: {assignees.slice(0,2).join(', ')}{assignees.length > 2 ? ` +${assignees.length-2}` : ''}</p>
                    {/if}
                    <!-- Progress bar -->
                    {#if task.progress > 0}
                      <div class="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" style="width:{task.progress}%; background:linear-gradient(90deg,#F97316,#FBBF24)"></div>
                      </div>
                    {/if}
                  </div>
                  <button onclick={() => { selectedTask = task; showDeleteTaskModal = true }}
                          class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            {/each}
            </div>
          {/if}
        </div>

      <!-- ══════════════════ ATTENDANCE TAB ══════════════════ -->
      {:else if activeTab === 'attendance'}

        <div class="flex gap-2 overflow-x-auto no-scrollbar mb-1">
          {#each [{ val: 'daily', label: 'Harian' }, { val: 'monthly', label: 'Rekap Bulanan' }] as m}
            <button
              onclick={() => attendanceMode = m.val as any}
              class="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-1"
              class:text-white={attendanceMode === m.val}
              class:bg-slate-100={attendanceMode !== m.val}
              class:text-slate-500={attendanceMode !== m.val}
              style={attendanceMode === m.val ? 'background:linear-gradient(135deg,#F97316,#EA580C);' : ''}>
              {m.label}
            </button>
          {/each}
        </div>

        {#if attendanceMode === 'daily'}
          <div class="flex items-center gap-3">
            <div class="flex-1 relative">
              <CalendarDays size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" bind:value={attendanceDate}
                     class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-lg font-black text-orange-500" style="font-family:'Plus Jakarta Sans',sans-serif;">{new Set(attendanceByDate.map(a=>a.user_id)).size}</p>
              <p class="text-[9px] text-slate-400 font-semibold">hadir</p>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex gap-3 px-1">
            {#each [
              { color: 'bg-green-400', label: 'Check-in & out' },
              { color: 'bg-orange-400', label: 'Hanya check-in' },
              { color: 'bg-slate-300', label: 'Tidak hadir' },
            ] as l}
              <div class="flex items-center gap-1.5">
                <div class="w-2 h-2 rounded-full {l.color}"></div>
                <span class="text-[10px] text-slate-400">{l.label}</span>
              </div>
            {/each}
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <!-- Header -->
            <div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengguna</span>
              {#each SESSIONS as s}
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-14">{s.label}</span>
              {/each}
            </div>
            {#if allUsers.length === 0}
              <div class="py-12 text-center">
                <Clock size={28} class="text-slate-200 mx-auto mb-2" />
                <p class="text-xs text-slate-400">Belum ada data</p>
              </div>
            {:else}
              {#each allUsers as u}
                {@const userAtt = getUserAttendanceForDate(u.id)}
                <div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-3 border-b border-slate-50 last:border-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white overflow-hidden"
                         style="background:linear-gradient(135deg,#F97316,#EA580C)">
                      {#if u.avatar_url}
                        <img src={u.avatar_url} alt="" class="w-full h-full object-cover" />
                      {:else}
                        {getInitials(u.full_name)}
                      {/if}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-slate-700 truncate leading-none">{u.full_name}</p>
                      <p class="text-[9px] text-slate-400 mt-0.5">{u.position || 'Karyawan'}</p>
                    </div>
                  </div>
                  {#each SESSIONS as s}
                    {@const att = userAtt.find(a => a.session_id === s.id)}
                    <div class="w-14 text-center">
                      {#if att?.check_out}
                        <div class="flex flex-col items-center gap-0.5">
                          <div class="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 size={11} class="text-green-600" />
                          </div>
                          <span class="text-[8px] text-green-600 font-medium">{formatTime(att.check_in)}</span>
                        </div>
                      {:else if att?.check_in}
                        <div class="flex flex-col items-center gap-0.5">
                          <div class="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                            <Clock size={11} class="text-orange-500" />
                          </div>
                          <span class="text-[8px] text-orange-500 font-medium">{formatTime(att.check_in)}</span>
                        </div>
                      {:else}
                        <div class="flex justify-center">
                          <div class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                            <X size={9} class="text-slate-400" />
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/each}
            {/if}
          </div>
        {:else}
          <!-- Monthly Recap View -->
          <div class="flex items-center gap-3">
            <div class="flex-1 relative">
              <Calendar size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="month" bind:value={attendanceMonth}
                     class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-1">
            <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pengguna</span>
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hadir | Terlambat</span>
            </div>
            
            {#if allUsers.length === 0}
              <div class="py-12 text-center">
                <Clock size={28} class="text-slate-200 mx-auto mb-2" />
                <p class="text-xs text-slate-400">Belum ada data pengguna</p>
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {#each allUsers as u}
                {@const stat = getMonthlyAttendance(u.id)}
                <div class="px-4 py-3 border-b md:border-r md:border-b-0 border-slate-50 hover:bg-slate-50 transition-colors">
                  <div class="flex items-center justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white overflow-hidden"
                           style="background:linear-gradient(135deg,#F97316,#EA580C)">
                        {#if u.avatar_url}
                          <img src={u.avatar_url} alt="" class="w-full h-full object-cover" />
                        {:else}
                          {getInitials(u.full_name)}
                        {/if}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-800 truncate leading-tight">{u.full_name}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">{u.position || 'Karyawan'}</p>
                      </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p class="text-sm font-black text-slate-700">{stat.totalPresentDays} <span class="text-[10px] text-slate-400 font-medium">hr</span></p>
                      {#if stat.totalLate > 0}
                        <p class="text-[10px] font-bold text-red-500">{stat.totalLate} telat</p>
                      {/if}
                    </div>
                  </div>
                  <!-- Mini Progress -->
                  <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" 
                         style="width: {Math.min(stat.presentRate, 100)}%; background: linear-gradient(90deg, {stat.presentRate < 50 ? '#EF4444' : stat.presentRate < 80 ? '#F59E0B' : '#10B981'}, {stat.presentRate < 50 ? '#F87171' : stat.presentRate < 80 ? '#FBBF24' : '#34D399'});"></div>
                  </div>
                </div>
              {/each}
              </div>
            {/if}
          </div>
        {/if}

      {/if}

    </main>
  {/if}
</div>

<!-- ════════════════ Edit User Modal ════════════════ -->
{#if showUserModal && selectedUser}
  <div class="fixed inset-0 z-50 flex items-end justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showUserModal = false}>
    <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
         style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
         onclick={e => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>
      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <UserCog size={16} class="text-orange-500" />
          <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Edit Pengguna</span>
        </div>
        <button onclick={() => showUserModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-4">
        <!-- Avatar preview -->
        <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base overflow-hidden flex-shrink-0"
               style="background:linear-gradient(135deg,#F97316,#EA580C)">
            {#if selectedUser.avatar_url}
              <img src={selectedUser.avatar_url} alt="" class="w-full h-full object-cover" />
            {:else}
              {getInitials(selectedUser.full_name)}
            {/if}
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-700">{selectedUser.full_name}</p>
            <p class="text-xs text-slate-400">{selectedUser.id.slice(0, 12)}...</p>
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Nama Lengkap <span class="text-red-500">*</span></label>
          <input bind:value={editFullName} placeholder="Nama lengkap"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Posisi</label>
          <input bind:value={editPosition} placeholder="Contoh: Frontend Developer"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">WhatsApp</label>
          <input bind:value={editPhone} placeholder="08xx-xxxx-xxxx" type="tel"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Tanggal Bergabung</label>
          <input type="date" bind:value={editJoinedAt}
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Role</label>
          <div class="grid grid-cols-2 gap-2">
            {#each [{ val: 'user', label: 'Karyawan' }, { val: 'admin', label: 'Administrator' }] as r}
              <button
                onclick={() => editRole = r.val as any}
                class="py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer"
                class:text-white={editRole === r.val}
                class:border-transparent={editRole === r.val}
                class:border-slate-200={editRole !== r.val}
                class:text-slate-600={editRole !== r.val}
                class:bg-slate-50={editRole !== r.val}
                style={editRole === r.val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
                {r.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex gap-3 pt-2 pb-6">
          <button onclick={() => showUserModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
          <button onclick={saveUser} disabled={isSubmittingUser}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                  style="background:linear-gradient(135deg,#F97316,#EA580C)">
            {isSubmittingUser ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════ New User Modal ════════════════ -->
{#if showNewUserModal}
  <div class="fixed inset-0 z-50 flex items-end justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showNewUserModal = false}>
    <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
         style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
         onclick={e => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>
      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <Plus size={16} class="text-orange-500" />
          <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Tambah Pengguna</span>
        </div>
        <button onclick={() => showNewUserModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Nama Lengkap <span class="text-red-500">*</span></label>
          <input bind:value={newName} placeholder="Nama lengkap"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Email <span class="text-red-500">*</span></label>
          <input type="email" bind:value={newEmail} placeholder="email@example.com"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Password <span class="text-red-500">*</span></label>
          <div class="relative">
            <input type={showNewPw ? 'text' : 'password'} bind:value={newPassword} placeholder="Min. 8 karakter"
                   class="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <button type="button" onclick={() => showNewPw = !showNewPw}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              {#if showNewPw}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Posisi</label>
          <input bind:value={newPosition} placeholder="Contoh: Desainer UI"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Role</label>
          <div class="grid grid-cols-2 gap-2">
            {#each [{ val: 'user', label: 'Karyawan' }, { val: 'admin', label: 'Administrator' }] as r}
              <button onclick={() => newRole = r.val as any}
                      class="py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer"
                      class:text-white={newRole === r.val}
                      class:border-transparent={newRole === r.val}
                      class:border-slate-200={newRole !== r.val}
                      class:text-slate-600={newRole !== r.val}
                      class:bg-slate-50={newRole !== r.val}
                      style={newRole === r.val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
                {r.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <p class="text-[11px] text-amber-700 font-medium">⚠️ Pengguna baru perlu konfirmasi email sebelum bisa login, tergantung konfigurasi Supabase.</p>
        </div>

        <div class="flex gap-3 pt-1 pb-6">
          <button onclick={() => showNewUserModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
          <button onclick={createUser} disabled={isCreatingUser}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                  style="background:linear-gradient(135deg,#F97316,#EA580C)">
            {isCreatingUser ? 'Membuat...' : 'Buat Pengguna'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════ Delete User Confirm ════════════════ -->
{#if showDeleteUserModal && selectedUser}
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showDeleteUserModal = false}>
    <div class="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
         style="animation:slideUp .3s cubic-bezier(.16,1,.3,1)"
         onclick={e => e.stopPropagation()}>
      <div class="flex justify-center pt-3 pb-1 sm:hidden">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>
      <div class="px-6 pt-6 pb-3 flex flex-col items-center text-center gap-3">
        <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trash2 size={22} class="text-red-500" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Pengguna?</h3>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            <strong>{selectedUser.full_name}</strong> akan dihapus dari sistem.<br />Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </div>
      <div class="flex gap-3 px-6 py-5">
        <button onclick={() => showDeleteUserModal = false}
                class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={deleteUser} disabled={isDeletingUser}
                class="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 cursor-pointer">
          {isDeletingUser ? 'Menghapus...' : 'Ya, Hapus'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════ Delete Task Confirm ════════════════ -->
{#if showDeleteTaskModal && selectedTask}
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showDeleteTaskModal = false}>
    <div class="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
         style="animation:slideUp .3s cubic-bezier(.16,1,.3,1)"
         onclick={e => e.stopPropagation()}>
      <div class="flex justify-center pt-3 pb-1 sm:hidden">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>
      <div class="px-6 pt-6 pb-3 flex flex-col items-center text-center gap-3">
        <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trash2 size={22} class="text-red-500" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Tugas?</h3>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Tugas <strong>"{selectedTask.title}"</strong> akan dihapus permanen.<br/>Semua assignment terkait juga akan terhapus.
          </p>
        </div>
      </div>
      <div class="flex gap-3 px-6 py-5">
        <button onclick={() => showDeleteTaskModal = false}
                class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={deleteTask} disabled={isDeletingTask}
                class="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 cursor-pointer">
          {isDeletingTask ? 'Menghapus...' : 'Ya, Hapus'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════ User Performance Modal ════════════════ -->
{#if showPerformanceModal && performanceUser}
  {@const perf = getUserPerformanceStats(performanceUser.id)}
  {@const att = getMonthlyAttendance(performanceUser.id)}
  
  <div class="fixed inset-0 z-50 flex items-end justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showPerformanceModal = false}>
    <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl pb-6"
         style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
         onclick={e => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>
      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <Activity size={16} class="text-blue-500" />
          <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Performa Pengguna</span>
        </div>
        <button onclick={() => showPerformanceModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-5">
        <!-- User Header -->
        <div class="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base overflow-hidden flex-shrink-0"
               style="background:linear-gradient(135deg,#3B82F6,#2563EB)">
            {#if performanceUser.avatar_url}
              <img src={performanceUser.avatar_url} alt="" class="w-full h-full object-cover" />
            {:else}
              {getInitials(performanceUser.full_name)}
            {/if}
          </div>
          <div>
            <p class="text-base font-bold text-slate-800">{performanceUser.full_name}</p>
            <p class="text-xs text-slate-500">{performanceUser.position || 'Karyawan'} • <span class="uppercase tracking-wide text-blue-600 font-semibold text-[10px]">{performanceUser.role}</span></p>
          </div>
        </div>

        <!-- Task Stats -->
        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Statistik Tugas</h4>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] text-slate-400 font-semibold uppercase">Penyelesaian</p>
                <PieChart size={14} class="text-blue-500" />
              </div>
              <p class="text-2xl font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{perf.completionRate}%</p>
              <div class="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-blue-500 transition-all" style="width: {perf.completionRate}%"></div>
              </div>
            </div>
            
            <div class="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] text-slate-400 font-semibold uppercase">Tugas Overdue</p>
                <AlertTriangle size={14} class={perf.overdue > 0 ? "text-red-500" : "text-slate-300"} />
              </div>
              <p class="text-2xl font-black {perf.overdue > 0 ? 'text-red-500' : 'text-slate-800'}" style="font-family:'Plus Jakarta Sans',sans-serif;">{perf.overdue}</p>
              <p class="text-[10px] text-slate-400 mt-1">dari {perf.total} tugas total</p>
            </div>
          </div>
        </div>

        <!-- Attendance Stats -->
        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Kehadiran Bulan Ini</h4>
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <UserCheck size={14} />
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-700">Hadir</p>
                  <p class="text-[10px] text-slate-400">{att.totalPresentDays} hari</p>
                </div>
              </div>
              <div class="w-px h-8 bg-slate-200"></div>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Clock size={14} />
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-700">Terlambat</p>
                  <p class="text-[10px] text-slate-400">{att.totalLate} kali</p>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-between mt-2">
              <span class="text-[10px] font-bold text-slate-500">Tingkat Kehadiran:</span>
              <span class="text-sm font-bold {att.presentRate >= 80 ? 'text-green-500' : att.presentRate >= 50 ? 'text-amber-500' : 'text-red-500'}">{att.presentRate}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes slideInUp {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to   { transform: translate(-50%, 0);    opacity: 1; }
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>