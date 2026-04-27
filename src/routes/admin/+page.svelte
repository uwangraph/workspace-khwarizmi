<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import { Shield } from 'lucide-svelte'
  import toast from 'svelte-french-toast'

  import type { Profile, Task, AttendanceRecord, TaskAssignment, Holiday, AdminTab, ThursdayRule, AppSetting, AttendanceLeave } from '$lib/components/admin/_types'

  // ── Tab Components ─────────────────────────────────────────────────────────
  import AdminTabBar      from '$lib/components/admin/AdminTabBar.svelte'
  import OverviewTab      from '$lib/components/admin/tabs/OverviewTab.svelte'
  import UsersTab         from '$lib/components/admin/tabs/UsersTab.svelte'
  import TasksTab         from '$lib/components/admin/tabs/TasksTab.svelte'
  import AttendanceTab    from '$lib/components/admin/tabs/AttendanceTab.svelte'
  import RekapTab         from '$lib/components/admin/tabs/RekapTab.svelte'
  import HolidaysTab      from '$lib/components/admin/tabs/HolidaysTab.svelte'
  import SettingsTab      from '$lib/components/admin/tabs/SettingsTab.svelte'

  // ── Modal Components ───────────────────────────────────────────────────────
  import EditUserModal      from '$lib/components/admin/modals/EditUserModal.svelte'
  import NewUserModal       from '$lib/components/admin/modals/NewUserModal.svelte'
  import DeleteConfirmModal from '$lib/components/admin/modals/DeleteConfirmModal.svelte'
  import TaskDetailModal    from '$lib/components/admin/modals/TaskDetailModal.svelte'
  import PerformanceModal   from '$lib/components/admin/modals/PerformanceModal.svelte'
  import HolidayFormModal   from '$lib/components/admin/modals/HolidayFormModal.svelte'
  import ThursdayRuleModal  from '$lib/components/admin/modals/ThursdayRuleModal.svelte'

  // ── State ──────────────────────────────────────────────────────────────────
  let user    = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let isLoading = $state(true)
  let activeTab = $state<AdminTab>('overview')

  // Data
  let allUsers       = $state<Profile[]>([])
  let allTasks       = $state<Task[]>([])
  let allAttendance  = $state<AttendanceRecord[]>([])
  let allAssignments = $state<TaskAssignment[]>([])
  let holidays       = $state<Holiday[]>([])
  let thursdayRules  = $state<ThursdayRule[]>([])
  let allLeaves      = $state<AttendanceLeave[]>([])
  let appSettings    = $state<AppSetting | null>(null)

  // Modal visibility
  let showEditUserModal     = $state(false)
  let showNewUserModal      = $state(false)
  let showDeleteUserModal   = $state(false)
  let showDeleteTaskModal   = $state(false)
  let showTaskDetailModal   = $state(false)
  let showPerformanceModal  = $state(false)
  let showHolidayFormModal      = $state(false)
  let showDeleteHolidayModal    = $state(false)
  let showThursdayRuleModal     = $state(false)
  let showDeleteThursdayModal   = $state(false)

  // Modal targets
  let selectedUser     = $state<Profile | null>(null)
  let selectedTask     = $state<Task | null>(null)
  let detailTask       = $state<Task | null>(null)
  let performanceUser  = $state<Profile | null>(null)
  let selectedHoliday    = $state<Holiday | null>(null)
  let selectedThursday   = $state<ThursdayRule | null>(null)

  // Submitting states
  let isSubmittingUser  = $state(false)
  let isCreatingUser    = $state(false)
  let isDeletingUser    = $state(false)
  let isDeletingTask    = $state(false)
  let isSavingHoliday      = $state(false)
  let isDeletingHoliday    = $state(false)
  let isSavingThursday     = $state(false)
  let isDeletingThursday   = $state(false)
  let isSavingSettings     = $state(false)

  // Toast
  let toastMsg     = $state('')
  let toastType    = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer   = 0

  const attendanceMonth = $derived(new Date().toISOString().slice(0, 7))

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    if (type === 'error') toast.error(msg)
    else if (type === 'success') toast.success(msg)
    else toast(msg, { icon: 'ℹ️' })
  }

  // ── Load Data ──────────────────────────────────────────────────────────────
  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u

    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || p.role !== 'admin') { location.assign('/'); return }
    profile = p

    const [usersRes, tasksRes, attendRes, assignRes, holidaysRes, settingsRes, leavesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('attendance').select('*').order('date', { ascending: false }),
      supabase.from('task_assignments').select('*'),
      supabase.from('holidays').select('*').order('date'),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('attendance_leaves').select('*').order('date', { ascending: false })
    ])

    if (usersRes.data)    allUsers       = usersRes.data as Profile[]
    if (tasksRes.data)    allTasks       = tasksRes.data as Task[]
    if (attendRes.data)   allAttendance  = attendRes.data as AttendanceRecord[]
    if (assignRes.data)   allAssignments = assignRes.data as TaskAssignment[]
    if (holidaysRes.data) holidays       = holidaysRes.data as Holiday[]
    if (settingsRes.data) appSettings    = settingsRes.data as AppSetting
    if (leavesRes.data)   allLeaves      = leavesRes.data as AttendanceLeave[]

    const { data: thursdayRes } = await supabase.from('thursday_rules').select('*').order('date')
    if (thursdayRes) thursdayRules = thursdayRes as ThursdayRule[]

    isLoading = false
  }

  // ── User Actions ───────────────────────────────────────────────────────────
  function handleEditUser(u: Profile) { selectedUser = u; showEditUserModal = true }
  function handleDeleteUser(u: Profile) { selectedUser = u; showDeleteUserModal = true }
  function handleViewPerformance(u: Profile) { performanceUser = u; showPerformanceModal = true }

  async function saveUser(data: { full_name: string; phone: string | null; position: string | null; role: 'admin' | 'user'; joined_at: string | null }) {
    if (!selectedUser) return
    isSubmittingUser = true
    const { error } = await supabase.from('profiles').update(data).eq('id', selectedUser.id)
    isSubmittingUser = false
    if (error) { showToast('Gagal menyimpan perubahan', 'error'); return }
    allUsers = allUsers.map(u => u.id === selectedUser!.id ? { ...u, ...data } : u)
    showEditUserModal = false
    showToast('Data pengguna diperbarui', 'success')
  }

  async function deleteUser() {
    if (!selectedUser) return
    isDeletingUser = true
    const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id)
    isDeletingUser = false
    if (error) { showToast('Gagal menghapus pengguna', 'error'); return }
    allUsers = allUsers.filter(u => u.id !== selectedUser!.id)
    showDeleteUserModal = false; selectedUser = null
    showToast('Pengguna berhasil dihapus', 'success')
  }

  async function createUser(data: { name: string; email: string; password: string; position: string; role: 'admin' | 'user' }) {
    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      showToast('Nama, email, dan password wajib diisi', 'error'); return
    }
    if (data.password.length < 8) { showToast('Password minimal 8 karakter', 'error'); return }
    isCreatingUser = true
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error || 'Gagal membuat akun')
      
      showNewUserModal = false
      showToast('Pengguna baru berhasil dibuat', 'success')
      await loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      isCreatingUser = false
    }
  }

  // ── Task Actions ───────────────────────────────────────────────────────────
  function handleViewTask(t: Task) { detailTask = t; showTaskDetailModal = true }
  function handleDeleteTaskPrompt(t: Task) { selectedTask = t; showDeleteTaskModal = true; showTaskDetailModal = false }

  async function deleteTask() {
    if (!selectedTask) return
    isDeletingTask = true
    const { error } = await supabase.from('tasks').delete().eq('id', selectedTask.id)
    isDeletingTask = false
    if (error) { showToast('Gagal menghapus tugas', 'error'); return }
    allTasks = allTasks.filter(t => t.id !== selectedTask!.id)
    showDeleteTaskModal = false; selectedTask = null
    showToast('Tugas berhasil dihapus', 'success')
  }

  async function updateTaskStatus(task: Task, newStatus: Task['status']) {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    if (error) { showToast('Gagal update status', 'error'); return }
    allTasks = allTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    if (detailTask?.id === task.id) detailTask = { ...detailTask, status: newStatus }
    showToast('Status tugas diperbarui', 'success')
  }

  // ── Holiday Actions ────────────────────────────────────────────────────────
  async function addHoliday(data: { date: string; name: string }) {
    isSavingHoliday = true
    const { data: h, error } = await supabase.from('holidays').insert({
      date: data.date, name: data.name, created_by: profile?.id
    }).select().single()
    isSavingHoliday = false
    if (error) { showToast(error.message.includes('unique') ? 'Tanggal ini sudah ditandai libur' : 'Gagal menyimpan hari libur', 'error'); return }
    holidays = [...holidays, h as Holiday].sort((a, b) => a.date.localeCompare(b.date))
    showHolidayFormModal = false
    showToast('Hari libur berhasil ditambahkan', 'success')
  }

  function handleDeleteHoliday(h: Holiday) { selectedHoliday = h; showDeleteHolidayModal = true }

  async function deleteHoliday() {
    if (!selectedHoliday) return
    isDeletingHoliday = true
    const { error } = await supabase.from('holidays').delete().eq('id', selectedHoliday.id)
    isDeletingHoliday = false
    if (error) { showToast('Gagal menghapus hari libur', 'error'); return }
    holidays = holidays.filter(h => h.id !== selectedHoliday!.id)
    showDeleteHolidayModal = false; selectedHoliday = null
    showToast('Hari libur dihapus', 'success')
  }

  // ── Thursday Rule Actions ──────────────────────────────────────────────────
  async function saveThursdayRule(data: { date: string; type: ThursdayRule['type']; start_time: string | null; note: string | null }) {
    isSavingThursday = true
    // Upsert: update jika sudah ada, insert jika belum
    const { data: r, error } = await supabase.from('thursday_rules')
      .upsert({ date: data.date, type: data.type, start_time: data.start_time, note: data.note, created_by: profile?.id }, { onConflict: 'date' })
      .select().single()
    isSavingThursday = false
    if (error) { showToast('Gagal menyimpan aturan Kamis', 'error'); return }
    // Update local state
    const existing = thursdayRules.findIndex(x => x.date === data.date)
    if (existing >= 0) thursdayRules = thursdayRules.map((x, i) => i === existing ? r as ThursdayRule : x)
    else thursdayRules = [...thursdayRules, r as ThursdayRule].sort((a, b) => a.date.localeCompare(b.date))
    showThursdayRuleModal = false
    showToast('Aturan Kamis berhasil disimpan', 'success')
  }

  function handleDeleteThursdayRule(r: ThursdayRule) { selectedThursday = r; showDeleteThursdayModal = true }

  async function deleteThursdayRule() {
    if (!selectedThursday) return
    isDeletingThursday = true
    const { error } = await supabase.from('thursday_rules').delete().eq('id', selectedThursday.id)
    isDeletingThursday = false
    if (error) { showToast('Gagal menghapus aturan Kamis', 'error'); return }
    thursdayRules = thursdayRules.filter(r => r.id !== selectedThursday!.id)
    showDeleteThursdayModal = false; selectedThursday = null
    showToast('Aturan Kamis dihapus', 'success')
  }

  // ── Settings Actions ───────────────────────────────────────────────────────
  async function saveSettings(data: { office_lat: number; office_lng: number; office_radius: number }) {
    isSavingSettings = true
    const { data: updated, error } = await supabase.from('app_settings')
      .update(data)
      .eq('id', 1)
      .select().single()
    
    isSavingSettings = false
    if (error) { showToast('Gagal menyimpan pengaturan', 'error'); return }
    appSettings = updated as AppSetting
    showToast('Pengaturan sistem berhasil disimpan', 'success')
  }

  // ── Leave Actions ──────────────────────────────────────────────────────────
  async function updateLeaveStatus(leave: AttendanceLeave, status: 'approved' | 'rejected') {
    if (!profile) return
    const { error } = await supabase.from('attendance_leaves')
      .update({ status, approved_by: profile.id })
      .eq('id', leave.id)
    if (error) { showToast('Gagal mengupdate status izin', 'error'); return }
    allLeaves = allLeaves.map(l => l.id === leave.id ? { ...l, status, approved_by: profile!.id } : l)
    showToast(`Izin berhasil di-${status === 'approved' ? 'setujui' : 'tolak'}`, 'success')
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Admin Panel — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-slate-50 pb-24" style="font-family:'Inter',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#F97316,#EA580C)">
        <Shield size={16} class="text-white" />
      </div>
      <div>
        <p class="font-bold text-slate-900 text-sm leading-none" style="font-family:'Plus Jakarta Sans',sans-serif;">Admin Panel</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Workspace Khwarizmi</p>
      </div>
    </div>
    <a href="/" class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors" title="Dashboard">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </a>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-40 gap-3">
      <div class="w-8 h-8 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin"></div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memuat data admin...</p>
    </div>
  {:else}

    <!-- Tab Bar -->
    <AdminTabBar {activeTab} onTabChange={t => activeTab = t} />

    <!-- Tab Content -->
    <main class="max-w-6xl mx-auto w-full px-4 py-5">
      {#if activeTab === 'overview'}
        <OverviewTab {allUsers} {allTasks} {allAttendance} {allAssignments} {holidays}
                     onSwitchTab={t => activeTab = t as AdminTab} />

      {:else if activeTab === 'users'}
        <UsersTab {allUsers} {allTasks} {allAssignments}
                  onEditUser={handleEditUser}
                  onDeleteUser={handleDeleteUser}
                  onViewPerformance={handleViewPerformance}
                  onAddUser={() => showNewUserModal = true} />

      {:else if activeTab === 'tasks'}
        <TasksTab {allTasks} {allUsers} {allAssignments}
                  onDeleteTask={handleDeleteTaskPrompt}
                  onViewTask={handleViewTask} />

      {:else if activeTab === 'attendance'}
        <AttendanceTab {allUsers} {allAttendance} {holidays} {thursdayRules} {allLeaves}
                       onUpdateLeave={updateLeaveStatus} />

      {:else if activeTab === 'rekap'}
        <RekapTab {allUsers} {allTasks} {allAssignments} {allAttendance} {holidays} />

      {:else if activeTab === 'holidays'}
        <HolidaysTab {holidays} {thursdayRules}
                     onAddHoliday={() => showHolidayFormModal = true}
                     onDeleteHoliday={handleDeleteHoliday}
                     onManageThursday={() => showThursdayRuleModal = true}
                     onDeleteThursdayRule={handleDeleteThursdayRule} />

      {:else if activeTab === 'settings'}
        <SettingsTab settings={appSettings}
                     onSave={saveSettings}
                     isSaving={isSavingSettings} />
      {/if}
    </main>

  {/if}
</div>

<!-- ── Modals ──────────────────────────────────────────────────────────────── -->

{#if showEditUserModal && selectedUser}
  <EditUserModal user={selectedUser} isSubmitting={isSubmittingUser}
                 onSave={saveUser} onClose={() => showEditUserModal = false} />
{/if}

{#if showNewUserModal}
  <NewUserModal isCreating={isCreatingUser}
                onCreate={createUser} onClose={() => showNewUserModal = false} />
{/if}

{#if showDeleteUserModal && selectedUser}
  <DeleteConfirmModal
    title="Hapus Pengguna?"
    message="<strong>{selectedUser.full_name}</strong> akan dihapus dari sistem.<br/>Tindakan ini tidak dapat dibatalkan."
    isDeleting={isDeletingUser}
    onConfirm={deleteUser}
    onClose={() => showDeleteUserModal = false} />
{/if}

{#if showDeleteTaskModal && selectedTask}
  <DeleteConfirmModal
    title="Hapus Tugas?"
    message='Tugas <strong>"{selectedTask.title}"</strong> akan dihapus permanen.<br/>Semua assignment terkait juga akan terhapus.'
    isDeleting={isDeletingTask}
    onConfirm={deleteTask}
    onClose={() => showDeleteTaskModal = false} />
{/if}

{#if showTaskDetailModal && detailTask}
  <TaskDetailModal task={detailTask} {allUsers} {allAssignments}
                   onUpdateStatus={updateTaskStatus}
                   onDelete={handleDeleteTaskPrompt}
                   onClose={() => showTaskDetailModal = false} />
{/if}

{#if showPerformanceModal && performanceUser}
  <PerformanceModal user={performanceUser} tasks={allTasks} assignments={allAssignments}
                    attendance={allAttendance} {holidays} {attendanceMonth}
                    onClose={() => showPerformanceModal = false} />
{/if}

{#if showHolidayFormModal}
  <HolidayFormModal isSubmitting={isSavingHoliday}
                    onSave={addHoliday} onClose={() => showHolidayFormModal = false} />
{/if}

{#if showDeleteHolidayModal && selectedHoliday}
  <DeleteConfirmModal
    title="Hapus Hari Libur?"
    message="<strong>{selectedHoliday.name}</strong> ({selectedHoliday.date}) akan dihapus."
    isDeleting={isDeletingHoliday}
    onConfirm={deleteHoliday}
    onClose={() => showDeleteHolidayModal = false} />
{/if}

{#if showThursdayRuleModal}
  <ThursdayRuleModal {thursdayRules} isSubmitting={isSavingThursday}
                     onSave={saveThursdayRule} onClose={() => showThursdayRuleModal = false} />
{/if}

{#if showDeleteThursdayModal && selectedThursday}
  <DeleteConfirmModal
    title="Hapus Aturan Kamis?"
    message="Aturan untuk <strong>{new Date(selectedThursday.date).toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long'})}</strong> akan dihapus. Kamis tersebut akan kembali ke jadwal default."
    isDeleting={isDeletingThursday}
    onConfirm={deleteThursdayRule}
    onClose={() => showDeleteThursdayModal = false} />
{/if}