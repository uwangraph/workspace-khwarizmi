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
  let { allUsers, allTasks, allAssignments, onEditUser, onDeleteUser, onViewPerformance, onAddUser }: Props = $props()

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

<div class="flex flex-col gap-6">

  <!-- Toolbar: Search + Dropdown + Add -->
  <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
    <!-- Search -->
    <div class="flex-1 relative">
      <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={userSearch} placeholder="Cari nama atau posisi..."
             class="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 text-sm font-bold bg-white text-slate-700 focus:outline-none focus:border-orange-500 transition-all shadow-xs" />
    </div>

    <!-- Custom Dropdown -->
    <div class="relative custom-role-dropdown flex-shrink-0 md:w-48">
        <button onclick={() => isRoleDropdownOpen = !isRoleDropdownOpen}
                class="w-full flex items-center justify-between text-sm px-4 py-3.5 rounded-2xl border-2 border-b-[4px] border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 focus:outline-none focus:border-orange-500 transition-all shadow-xs active:translate-y-0.5 active:border-b-[2px] cursor-pointer">
          <span>{getRoleLabel(roleFilter)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {#if isRoleDropdownOpen}
          <div class="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl border-2 border-b-[6px] border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col py-1 font-bold">
            {#each [
              { val: 'all', label: `Semua (${allUsers.length})` },
              { val: 'user', label: `Anggota (${allUsers.length - totalAdmins})` },
              { val: 'admin', label: `Admin (${totalAdmins})` }
            ] as option}
              <button onclick={() => { roleFilter = option.val as any; isRoleDropdownOpen = false; }}
                      class="w-full text-left px-4 py-3 text-xs hover:bg-orange-50 transition-colors flex items-center justify-between font-bold cursor-pointer"
                      class:bg-orange-50={roleFilter === option.val} class:text-orange-600={roleFilter === option.val} class:text-slate-700={roleFilter !== option.val}>
                <span>{option.label}</span>
                {#if roleFilter === option.val}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><path d="M20 6 9 17l-5-5"/></svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
    </div>

    <!-- Add Button -->
    <button onclick={onAddUser}
            class="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-black border-2 border-b-[4px] border-orange-700 cursor-pointer shadow-xs active:translate-y-0.5 active:border-b-[2px] transition-all flex-shrink-0" title="Tambah Pengguna">
      <Plus size={18} />
      <span>Tambah Pengguna</span>
    </button>
  </div>

  <p class="text-xs font-black text-slate-400 px-1">{filtered.length} pengguna ditemukan</p>

  <!-- User List -->
  {#if filtered.length === 0}
    <div class="py-20 text-center bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-8 shadow-xs">
      <Users size={36} class="text-slate-300 mx-auto mb-3" />
      <p class="text-sm font-black text-slate-500">Tidak ada pengguna ditemukan</p>
    </div>
  {:else}
    <div class="bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 overflow-hidden shadow-xs">
      <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
      {#each filtered as u}
        {@const taskCount = getTaskCount(u.id)}
        <div class="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors border-b border-slate-100">

          <!-- Avatar -->
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white overflow-hidden bg-orange-500 border-2 border-b-[4px] border-orange-700 shadow-xs">
            {#if u.avatar_url}
              <img src={u.avatar_url} alt="" class="w-full h-full object-cover" />
            {:else}
              {getInitials(u.full_name)}
            {/if}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{u.full_name}</p>
              {#if u.role === 'admin'}
                <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 flex-shrink-0 uppercase tracking-wider">Admin</span>
              {/if}
            </div>
            <p class="text-xs font-bold text-slate-400 mt-1 truncate">
              {u.position || 'Posisi belum diisi'}
              {#if taskCount > 0}
                <span class="mx-1 text-slate-300">·</span>
                <span class="text-orange-500">{taskCount} tugas aktif</span>
              {/if}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-1.5 flex-shrink-0">
            <button onclick={() => openWA(u)}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] bg-white flex items-center justify-center transition-all cursor-pointer {u.phone ? 'border-slate-200 hover:border-green-500 text-slate-500 hover:text-green-600 active:translate-y-0.5 active:border-b-[2px]' : 'border-slate-100 text-slate-300 cursor-not-allowed'}"
                    title={u.phone ? 'WhatsApp' : 'No. telp tidak ada'}>
              <MessageCircle size={16} />
            </button>
            <button onclick={() => onViewPerformance(u)}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] border-slate-200 bg-white hover:border-blue-500 flex items-center justify-center text-slate-500 hover:text-blue-600 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer" title="Performa">
              <Activity size={16} />
            </button>
            <button onclick={() => onEditUser(u)}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] border-slate-200 bg-white hover:border-amber-500 flex items-center justify-center text-slate-500 hover:text-amber-600 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer" title="Edit">
              <Pencil size={16} />
            </button>
            <button onclick={() => onDeleteUser(u)}
                    class="w-10 h-10 rounded-xl border-2 border-b-[4px] border-slate-200 bg-white hover:border-red-500 flex items-center justify-center text-slate-500 hover:text-red-500 active:translate-y-0.5 active:border-b-[2px] transition-all cursor-pointer" title="Hapus">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      {/each}
      </div>
    </div>
  {/if}

</div>
