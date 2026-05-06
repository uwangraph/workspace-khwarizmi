<script lang="ts">
  import type { Profile, Task, TaskAssignment } from '$lib/components/admin/_types'
  import { getInitials, formatWA } from '$lib/components/admin/_utils'
  import { Search, Plus, Activity, Pencil, Trash2, Users, MessageCircle } from 'lucide-svelte'
  import toast from 'svelte-french-toast'

  interface Props {
    allUsers: Profile[]
    allTasks: Task[]
    allAssignments: TaskAssignment[]
    onEditUser: (u: Profile) => void
    onDeleteUser: (u: Profile) => void
    onViewPerformance: (u: Profile) => void
    onAddUser: () => void
    onSendReminder?: (u: Profile) => void
  }
  let { allUsers, allTasks, allAssignments, onEditUser, onDeleteUser, onViewPerformance, onAddUser } = $props<Props>()

  let userSearch  = $state('')
  let roleFilter  = $state<'all' | 'admin' | 'user'>('all')

  let filtered = $derived(allUsers.filter(u => {
    const matchSearch = !userSearch ||
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.position?.toLowerCase().includes(userSearch.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  }))

  let totalAdmins = $derived(allUsers.filter(u => u.role === 'admin').length)

  function getTaskCount(uid: string) {
    return allAssignments.filter(a => a.user_id === uid && a.status !== 'rejected').length
  }

  function openWA(u: Profile) {
    if (u.phone) window.open(`https://wa.me/${formatWA(u.phone)}`, '_blank')
    else toast.error('User ini belum menambahkan nomor telepon')
  }

  // Custom Dropdown State
  let isRoleDropdownOpen = $state(false)

  function handleBodyClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.custom-role-dropdown')) {
      isRoleDropdownOpen = false;
    }
  }

  function getRoleLabel(role: string) {
    if (role === 'all') return `Semua (${allUsers.length})`
    if (role === 'user') return `Anggota (${allUsers.length - totalAdmins})`
    if (role === 'admin') return `Admin (${totalAdmins})`
    return role
  }
</script>

<svelte:window onclick={handleBodyClick} />

<div class="flex flex-col gap-4">

  <!-- Toolbar: Search + Dropdown + Add -->
  <div class="flex gap-2 items-center">
    <!-- Search -->
    <div class="flex-1 relative">
      <Search size={13} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={userSearch} placeholder="Cari nama atau posisi..."
             class="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200 transition-all" />
    </div>

    <!-- Custom Dropdown -->
    <div class="relative custom-role-dropdown flex-shrink-0">
        <button onclick={() => isRoleDropdownOpen = !isRoleDropdownOpen}
                class="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-orange-300 transition-all min-w-[130px] justify-between">
          <span>{getRoleLabel(roleFilter)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {#if isRoleDropdownOpen}
          <div class="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden flex flex-col py-1">
            {#each [
              { val: 'all', label: `Semua (${allUsers.length})` },
              { val: 'user', label: `Anggota (${allUsers.length - totalAdmins})` },
              { val: 'admin', label: `Admin (${totalAdmins})` }
            ] as option}
              <button onclick={() => { roleFilter = option.val as any; isRoleDropdownOpen = false; }}
                      class="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 transition-colors flex items-center justify-between"
                      class:bg-orange-50={roleFilter === option.val} class:text-orange-600={roleFilter === option.val} class:text-slate-700={roleFilter !== option.val}>
                <span>{option.label}</span>
                {#if roleFilter === option.val}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><path d="M20 6 9 17l-5-5"/></svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
    </div>

    <!-- Add Button -->
    <button onclick={onAddUser}
            class="flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium cursor-pointer transition-colors flex-shrink-0" title="Tambah Pengguna">
      <Plus size={14} />
      <span class="hidden md:inline">Tambah</span>
    </button>
  </div>

  <p class="text-[11px] text-slate-400">{filtered.length} pengguna ditemukan</p>

  <!-- User List -->
  {#if filtered.length === 0}
    <div class="py-16 text-center bg-white rounded-xl border border-slate-100">
      <Users size={24} class="text-slate-200 mx-auto mb-2" />
      <p class="text-xs text-slate-400">Tidak ada pengguna ditemukan</p>
    </div>
  {:else}
    <div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div class="grid grid-cols-1 md:grid-cols-2">
      {#each filtered as u}
        {@const taskCount = getTaskCount(u.id)}
        <div class="flex items-center gap-3 px-4 py-3 border-b border-r-0 md:odd:border-r border-slate-100 hover:bg-slate-50/60 transition-colors">

          <!-- Avatar -->
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white overflow-hidden bg-orange-500">
            {#if u.avatar_url}
              <img src={u.avatar_url} alt="" class="w-full h-full object-cover" />
            {:else}
              {getInitials(u.full_name)}
            {/if}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-medium text-slate-800 truncate">{u.full_name}</p>
              {#if u.role === 'admin'}
                <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 flex-shrink-0">Admin</span>
              {/if}
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5 truncate">
              {u.position || 'Posisi belum diisi'}
              {#if taskCount > 0}
                <span class="ml-1.5 text-slate-300">·</span>
                <span class="ml-1.5">{taskCount} tugas aktif</span>
              {/if}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-1">
            <button onclick={() => openWA(u)}
                    class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer {u.phone ? 'hover:bg-green-50 text-slate-400 hover:text-green-600' : 'text-slate-200 cursor-not-allowed'}"
                    title={u.phone ? 'WhatsApp' : 'No. telp tidak ada'}>
              <MessageCircle size={13} />
            </button>
            <button onclick={() => onViewPerformance(u)}
                    class="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="Performa">
              <Activity size={13} />
            </button>
            <button onclick={() => onEditUser(u)}
                    class="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors cursor-pointer" title="Edit">
              <Pencil size={13} />
            </button>
            <button onclick={() => onDeleteUser(u)}
                    class="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="Hapus">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      {/each}
      </div>
    </div>
  {/if}

</div>
