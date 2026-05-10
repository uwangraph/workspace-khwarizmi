<script lang="ts">
  import { onMount } from 'svelte'
  import type { User } from '@supabase/supabase-js'
  import { Shield } from 'lucide-svelte'
  import toast from 'svelte-french-toast'
  
  import { authService } from '$lib/services/authService'
  import { adminService } from '$lib/services/adminService'
  import { notificationService } from '$lib/services/notificationService'
  import { taskService } from '$lib/services/taskService'
  import { attendanceService } from '$lib/services/attendanceService'

  import type { Profile, Task, AttendanceRecord, TaskAssignment, Holiday, AdminTab, SpecialRule, AppSetting, AttendanceLeave } from '$lib/components/admin/_types'

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
  import ReminderModal      from '$lib/components/admin/modals/ReminderModal.svelte'

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
  let specialRules   = $state<SpecialRule[]>([])
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
  let showSpecialRuleModal      = $state(false)
  let showDeleteSpecialModal    = $state(false)
  let showReminderModal         = $state(false)

  // Modal targets
  let selectedUser     = $state<Profile | null>(null)
  let reminderTarget   = $state<Profile | null>(null)
  let selectedTask     = $state<Task | null>(null)
  let detailTask       = $state<Task | null>(null)
  let performanceUser  = $state<Profile | null>(null)
  let selectedHoliday    = $state<Holiday | null>(null)
  let selectedSpecial    = $state<SpecialRule | null>(null)

  // Submitting states
  let isSubmittingUser  = $state(false)
  let isCreatingUser    = $state(false)
  let isDeletingUser    = $state(false)
  let isDeletingTask    = $state(false)
  let isSavingHoliday      = $state(false)
  let isDeletingHoliday    = $state(false)
  let isSavingSpecial      = $state(false)
  let isDeletingSpecial    = $state(false)
  let isSavingSettings     = $state(false)
  let isClearingData       = $state(false)
  let showClearDataModal   = $state(false)
  let showImmediateDeleteModal = $state(false)
  let showCleanupOldDataModal = $state(false)
  let isCleaningOldData    = $state(false)

  // Toast
  let toastMsg     = $state('')
  let toastType    = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer   = 0

  let selectedMonth = $state(new Date().toISOString().slice(0, 7))
  let rekapMode     = $state<'monthly' | 'yearly'>('monthly')

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    if (type === 'error') toast.error(msg)
    else if (type === 'success') toast.success(msg)
    else toast(msg, { icon: 'ℹ️' })
  }

  // ── Load Data ──────────────────────────────────────────────────────────────
  async function loadData(month?: string) {
    isLoading = true
    const u = await authService.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u

    const { data: p } = await authService.getProfile(u.id)
    if (!p || p.role !== 'admin') { location.assign('/'); return }
    profile = p

    const data = await adminService.fetchAllData(month || selectedMonth)
    allUsers = data.users as Profile[]
    holidays = data.holidays as Holiday[]
    appSettings = data.settings as AppSetting
    specialRules = data.specialRules as SpecialRule[]

    // Jika sedang dalam masa "Pembuangan Data" (24 jam), kosongkan data transaksinya dari UI
    if (appSettings?.deletion_scheduled_at) {
      allTasks = []
      allAttendance = []
      allAssignments = []
      allLeaves = []
    } else {
      allTasks = data.tasks as Task[]
      allAttendance = data.attendance as AttendanceRecord[]
      allAssignments = data.assignments as TaskAssignment[]
      allLeaves = data.leaves as AttendanceLeave[]
    }

    isLoading = false
  }

  // ── User Actions ───────────────────────────────────────────────────────────
  function handleEditUser(u: Profile) { selectedUser = u; showEditUserModal = true }
  function handleDeleteUser(u: Profile) { selectedUser = u; showDeleteUserModal = true }
  function handleViewPerformance(u: Profile) { performanceUser = u; showPerformanceModal = true }

  async function saveUser(data: { full_name: string; phone: string | null; position: string | null; role: 'admin' | 'user'; joined_at: string | null }) {
    if (!selectedUser) return
    isSubmittingUser = true
    const { error } = await adminService.updateUser(selectedUser.id, data)
    isSubmittingUser = false
    if (error) { showToast('Gagal menyimpan perubahan', 'error'); return }
    allUsers = allUsers.map(u => u.id === selectedUser!.id ? { ...u, ...data } : u)
    showEditUserModal = false
    showToast('Data pengguna diperbarui', 'success')
  }

  async function deleteUser() {
    if (!selectedUser) return
    isDeletingUser = true
    const { error } = await adminService.deleteUser(selectedUser.id)
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
    
    const { error } = await adminService.createUser(data)
    if (error) { showToast(error, 'error') }
    else {
      showNewUserModal = false
      showToast('Pengguna baru berhasil dibuat', 'success')
      await loadData()
    }
    isCreatingUser = false
  }

  // ── Reminder Action ────────────────────────────────────────────────────────
  function handleSendReminder(u: Profile) {
    reminderTarget = u
    showReminderModal = true
  }

  function handleRemindTask(t: Task) {
    detailTask = t
    reminderTarget = null // Trigger bulk send in submitReminder
    showReminderModal = true
  }

  async function submitReminder(message: string) {
    if (!reminderTarget && !detailTask) return
    
    let targetIds: string[] = []
    
    if (reminderTarget) {
      targetIds = [reminderTarget.id]
    } else if (detailTask) {
      // Kirim ke pembuat tugas + semua kolaborator (assignees)
      const ids = new Set<string>()
      if (detailTask.created_by) ids.add(detailTask.created_by)
      
      allAssignments
        .filter(a => a.task_id === detailTask?.id && a.status !== 'rejected')
        .forEach(a => ids.add(a.user_id))
      
      targetIds = Array.from(ids)
    }

    if (targetIds.length === 0) {
      showToast('Tidak ada orang yang terlibat dalam tugas ini', 'error')
      return
    }

    let successCount = 0
    for (const id of targetIds) {
      const ok = await notificationService.send(
        id,
        'task_revision',
        detailTask ? `Pengingat: ${detailTask.title}` : 'Pengingat dari Admin',
        message,
        { 
          is_admin_reminder: true,
          sender_id: user?.id,
          sender_name: profile?.full_name || (user?.email ? user.email.split('@')[0] : 'ADMIN'),
          task_id: detailTask?.id,
          task_title: detailTask?.title
        }
      )
      if (ok) successCount++
    }

    if (successCount > 0) {
      showToast(`Pengingat dikirim ke ${successCount} orang terlibat`, 'success')
      showReminderModal = false
      reminderTarget = null
    } else {
      showToast('Gagal mengirim pengingat', 'error')
    }
  }

  // ── Task Actions ───────────────────────────────────────────────────────────
  function handleViewTask(t: Task) { detailTask = t; showTaskDetailModal = true }
  function handleDeleteTaskPrompt(t: Task) { selectedTask = t; showDeleteTaskModal = true; showTaskDetailModal = false }

  async function deleteTask() {
    if (!selectedTask) return
    isDeletingTask = true
    const { error } = await taskService.deleteTask(selectedTask.id)
    isDeletingTask = false
    if (error) { showToast('Gagal menghapus tugas', 'error'); return }
    allTasks = allTasks.filter(t => t.id !== selectedTask!.id)
    showDeleteTaskModal = false; selectedTask = null
    showToast('Tugas berhasil dihapus', 'success')
  }

  async function updateTaskStatus(task: Task, newStatus: Task['status']) {
    const { error } = await taskService.updateProgress(task.id, task.progress, newStatus)
    if (error) { showToast('Gagal update status', 'error'); return }
    allTasks = allTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    if (detailTask?.id === task.id) detailTask = { ...detailTask, status: newStatus }
    showToast('Status tugas diperbarui', 'success')
  }

  // ── Holiday Actions ────────────────────────────────────────────────────────
  async function addHoliday(data: any) {
    isSavingHoliday = true
    
    if (data.id || data.date) {
      // Single date (Create or Update)
      const { data: h, error } = await adminService.saveHoliday({ id: data.id, date: data.date, name: data.name, created_by: profile?.id })
      if (error) { 
        showToast(error.message?.includes('unique') ? `Tanggal ${data.date} sudah ditandai libur` : 'Gagal menyimpan hari libur', 'error')
      } else {
        const updated = h as any as Holiday
        if (data.id) {
          holidays = holidays.map(x => x.id === updated.id ? updated : x).sort((a, b) => a.date.localeCompare(b.date))
          showToast('Hari libur diperbarui', 'success')
        } else {
          holidays = [...holidays, updated].sort((a, b) => a.date.localeCompare(b.date))
          showToast('Hari libur berhasil ditambahkan', 'success')
        }
        showHolidayFormModal = false
        selectedHoliday = null
      }
    } else if (data.startDate && data.endDate) {
      // Range
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      const newHolidays: Holiday[] = []
      let current = new Date(start)
      
      let errorOccurred = false
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        const { data: h, error } = await adminService.saveHoliday({ date: dateStr, name: data.name, created_by: profile?.id })
        if (error) {
          if (!error.message?.includes('unique')) errorOccurred = true
        } else if (h) {
          newHolidays.push(h as any as Holiday)
        }
        current.setDate(current.getDate() + 1)
      }
      
      if (newHolidays.length > 0) {
        holidays = [...holidays, ...newHolidays].sort((a, b) => a.date.localeCompare(b.date))
        showHolidayFormModal = false
        showToast(`${newHolidays.length} hari libur ditambahkan`, 'success')
      } else if (errorOccurred) {
        showToast('Beberapa tanggal gagal disimpan', 'error')
      } else {
        showToast('Semua tanggal sudah ditandai libur sebelumnya', 'info')
        showHolidayFormModal = false
      }
    }
    
    isSavingHoliday = false
  }

  function handleDeleteHoliday(h: Holiday) { selectedHoliday = h; showDeleteHolidayModal = true }
  function handleEditHoliday(h: Holiday) { selectedHoliday = h; showHolidayFormModal = true }

  async function deleteHoliday() {
    if (!selectedHoliday) return
    isDeletingHoliday = true
    const { error } = await adminService.deleteHoliday(selectedHoliday.id)
    isDeletingHoliday = false
    if (error) { showToast('Gagal menghapus hari libur', 'error'); return }
    holidays = holidays.filter(h => h.id !== selectedHoliday!.id)
    showDeleteHolidayModal = false; selectedHoliday = null
    showToast('Hari libur dihapus', 'success')
  }

  // ── Special Rule Actions ──────────────────────────────────────────────────
  async function saveSpecialRule(data: { date: string; type: SpecialRule['type']; start_time: string | null; note: string | null }) {
    isSavingSpecial = true
    const { data: r, error } = await adminService.saveSpecialRule({ 
      date: data.date, 
      type: data.type, 
      start_time: data.start_time, 
      note: data.note, 
      created_by: profile?.id 
    })
    isSavingSpecial = false
    if (error) { showToast('Gagal menyimpan aturan jadwal', 'error'); return }
    
    const rule = r as any as SpecialRule
    const existing = specialRules.findIndex(x => x.date === data.date)
    if (existing >= 0) specialRules = specialRules.map((x, i) => i === existing ? rule : x)
    else specialRules = [...specialRules, rule].sort((a, b) => a.date.localeCompare(b.date))
    
    showSpecialRuleModal = false
    showToast('Aturan jadwal khusus berhasil disimpan', 'success')
  }

  function handleDeleteSpecialRule(r: SpecialRule) { selectedSpecial = r; showDeleteSpecialModal = true }
  function handleManageSpecial(r?: SpecialRule) { selectedSpecial = r || null; showSpecialRuleModal = true }

  async function deleteSpecialRule() {
    if (!selectedSpecial) return
    isDeletingSpecial = true
    const { error } = await adminService.deleteSpecialRule(selectedSpecial.id)
    isDeletingSpecial = false
    if (error) { showToast('Gagal menghapus aturan jadwal', 'error'); return }
    specialRules = specialRules.filter(r => r.id !== selectedSpecial!.id)
    showDeleteSpecialModal = false; selectedSpecial = null
    showToast('Aturan jadwal khusus dihapus', 'success')
  }

  // ── Settings Actions ───────────────────────────────────────────────────────
  async function saveSettings(data: { office_lat: number; office_lng: number; office_radius: number; office_locations?: any[]; admin_contact: string | null }) {
    isSavingSettings = true
    const { error } = await adminService.updateSettings(data)
    isSavingSettings = false
    if (error) { showToast('Gagal menyimpan pengaturan', 'error'); return }
    appSettings = { ...appSettings, ...data } as AppSetting
    showToast('Pengaturan sistem berhasil disimpan', 'success')
  }

  async function clearAllData() {
    isClearingData = true
    try {
      await adminService.scheduleDeletion()
      showToast('Pembersihan dijadwalkan! Aplikasi dibekukan selama 24 jam.', 'success')
      showClearDataModal = false
      // Reload untuk memicu overlay global dari layout
      setTimeout(() => location.reload(), 1000);
    } catch (err: any) {
      showToast(err.message || 'Gagal menjadwalkan pembersihan', 'error')
    } finally {
      isClearingData = false
    }
  }

  async function cancelClearData() {
    isClearingData = true
    try {
      await adminService.cancelDeletion()
      showToast('Penghapusan data berhasil dibatalkan!', 'success')
      setTimeout(() => location.reload(), 1000);
    } catch (err: any) {
      showToast('Gagal membatalkan penghapusan', 'error')
    } finally {
      isClearingData = false
    }
  }
  async function executeImmediateDeletion() {
    showImmediateDeleteModal = true
  }

  async function confirmImmediateDelete() {
    showImmediateDeleteModal = false
    isClearingData = true
    try {
      await adminService.clearAllTransactionData()
      await adminService.cancelDeletion()
      showToast('Data berhasil dihapus permanen!', 'success')
      setTimeout(() => location.reload(), 1000)
    } catch (err: any) {
      showToast('Gagal menghapus data secara instan', 'error')
    } finally {
      isClearingData = false
    }
  }

  function triggerCleanupOldData() {
    showCleanupOldDataModal = true
  }

  async function handleCleanupOldData() {
    showCleanupOldDataModal = false
    isCleaningOldData = true
    try {
      const result = await attendanceService.cleanupOldData(40)
      showToast(`Berhasil menghapus ${result.deletedPhotos} file foto dan data absensi lama.`, 'success')
      await loadData()
    } catch (err: any) {
      showToast(err.message || 'Gagal membersihkan data lama', 'error')
    } finally {
      isCleaningOldData = false
    }
  }

  // ── Leave Actions ──────────────────────────────────────────────────────────
  async function updateLeaveStatus(leave: AttendanceLeave, status: 'approved' | 'rejected') {
    if (!profile) return
    const { error } = await adminService.updateLeaveStatus(leave.id, status, profile.id)
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
  <header class="sticky top-0 z-30 bg-white border-b border-slate-100 px-5 py-0 flex items-center justify-between" style="height:57px">
    <div class="flex items-center gap-2.5">
      <Shield size={15} style="color:#ea580c" />
      <div>
        <p class="font-semibold text-slate-800 text-sm leading-none">Admin Panel</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Workspace Khwarizmi</p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <a href="/chat" class="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-indigo-600 transition-colors" title="Obrolan">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Obrolan
      </a>
      <a href="/" class="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors" title="Dashboard">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Beranda
      </a>
    </div>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-40 gap-3">
      <div class="w-8 h-8 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin"></div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memuat data admin...</p>
    </div>
  {:else}

    <!-- Tab Bar -->
    <AdminTabBar 
      {activeTab} 
      onTabChange={t => activeTab = t} 
      pendingLeavesCount={allLeaves.filter(l => l.status === 'pending').length}
    />

    <!-- Tab Content -->
    <main class="max-w-6xl mx-auto w-full px-4 py-6">
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
                  onViewTask={handleViewTask}
                  onRemindTask={handleRemindTask} />

      {:else if activeTab === 'attendance'}
        <AttendanceTab {allUsers} {allAttendance} {holidays} specialRules={specialRules} {allLeaves}
                       onUpdateLeave={updateLeaveStatus} />

      {:else if activeTab === 'rekap'}
        <RekapTab {allUsers} {allTasks} {allAssignments} {allAttendance} {holidays}
                  {selectedMonth} {rekapMode}
                  onMonthChange={m => { selectedMonth = m; loadData(m) }}
                  onModeChange={mode => { 
                    rekapMode = mode; 
                    selectedMonth = mode === 'yearly' ? new Date().getFullYear().toString() : new Date().toISOString().slice(0, 7);
                    loadData(selectedMonth);
                  }} />

      {:else if activeTab === 'holidays'}
        <HolidaysTab {holidays} {specialRules}
                     onAddHoliday={() => { selectedHoliday = null; showHolidayFormModal = true }}
                     onEditHoliday={handleEditHoliday}
                     onDeleteHoliday={handleDeleteHoliday}
                     onManageSpecial={handleManageSpecial}
                     onDeleteSpecialRule={handleDeleteSpecialRule} />

      {:else if activeTab === 'settings'}
        <SettingsTab settings={appSettings}
                     onSave={saveSettings}
                     onClearData={() => showClearDataModal = true}
                     onCancelClearData={cancelClearData}
                     onExecuteImmediateDeletion={executeImmediateDeletion}
                     onCleanupOldData={triggerCleanupOldData}
                     isSaving={isSavingSettings}
                     isClearing={isClearingData}
                     isCleaningOldData={isCleaningOldData} />
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

{#if showImmediateDeleteModal}
  <DeleteConfirmModal
    title="Konfirmasi Penghapusan Instan"
    message="<div class='bg-red-50 p-3 rounded-xl border border-red-100 mb-2'><p class='text-red-600 font-bold text-xs'>PERINGATAN KERAS!</p><p class='text-[10px] text-red-500'>Tindakan ini akan menghapus seluruh data tugas, absensi, dan notifikasi <strong>SAAT INI JUGA</strong> tanpa menunggu masa 24 jam.</p></div><p class='text-xs text-slate-500'>Apakah Anda yakin ingin melanjutkan penghapusan permanen?</p>"
    isDeleting={isClearingData}
    onConfirm={confirmImmediateDelete}
    onClose={() => showImmediateDeleteModal = false} />
{/if}

{#if showTaskDetailModal && detailTask}
  <TaskDetailModal task={detailTask} {allUsers} {allAssignments}
                   onUpdateStatus={updateTaskStatus}
                   onDelete={handleDeleteTaskPrompt}
                   onClose={() => showTaskDetailModal = false}
                   onRemindMember={handleSendReminder}
                   onRemindAll={handleRemindTask}
                   currentUserId={user?.id} />
{/if}

{#if showPerformanceModal && performanceUser}
  <PerformanceModal user={performanceUser} tasks={allTasks} assignments={allAssignments}
                    attendance={allAttendance} {holidays} attendanceMonth={selectedMonth}
                    onClose={() => showPerformanceModal = false} />
{/if}

{#if showHolidayFormModal}
  <HolidayFormModal holiday={selectedHoliday} isSubmitting={isSavingHoliday}
                    onSave={addHoliday} onClose={() => { showHolidayFormModal = false; selectedHoliday = null }} />
{/if}

{#if showDeleteHolidayModal && selectedHoliday}
  <DeleteConfirmModal
    title="Hapus Hari Libur?"
    message="<strong>{selectedHoliday.name}</strong> ({selectedHoliday.date}) akan dihapus."
    isDeleting={isDeletingHoliday}
    onConfirm={deleteHoliday}
    onClose={() => showDeleteHolidayModal = false} />
{/if}

{#if showSpecialRuleModal}
  <ThursdayRuleModal {specialRules} initialRule={selectedSpecial} isSubmitting={isSavingSpecial}
                     onSave={saveSpecialRule} onClose={() => { showSpecialRuleModal = false; selectedSpecial = null }} />
{/if}

{#if showDeleteSpecialModal && selectedSpecial}
  <DeleteConfirmModal
    title="Hapus Aturan Jadwal?"
    message="Aturan untuk <strong>{new Date(selectedSpecial.date).toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long'})}</strong> akan dihapus."
    isDeleting={isDeletingSpecial}
    onConfirm={deleteSpecialRule}
    onClose={() => showDeleteSpecialModal = false} />
{/if}

{#if showReminderModal && (reminderTarget || detailTask)}
  <ReminderModal user={reminderTarget}
                 onClose={() => showReminderModal = false}
                 onSubmit={submitReminder} />
{/if}

{#if showClearDataModal}
  <DeleteConfirmModal
    title="Jadwalkan Pembersihan?"
    message="Seluruh data <strong>Tugas, Absensi, Notifikasi, dan Token</strong> akan dihapus secara permanen.<br/><br/>Aplikasi akan dibekukan selama 24 jam. Dalam masa itu, Anda masih bisa membatalkannya."
    isDeleting={isClearingData}
    onConfirm={clearAllData}
    onClose={() => showClearDataModal = false} />
{/if}

{#if showCleanupOldDataModal}
  <DeleteConfirmModal
    title="Sapu Bersih Data Lama?"
    message="Apakah Anda yakin ingin menghapus SEMUA file foto selfie dan data absensi yang berumur <strong>lebih dari 40 hari</strong> secara permanen?<br/><br/><span class='text-[10px] text-red-500'>Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah membuat rekapan.</span>"
    isDeleting={isCleaningOldData}
    onConfirm={handleCleanupOldData}
    onClose={() => showCleanupOldDataModal = false} />
{/if}