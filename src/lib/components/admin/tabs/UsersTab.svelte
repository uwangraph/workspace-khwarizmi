<script lang="ts">
  import type { Profile, Task, TaskAssignment } from '$lib/components/admin/_types'
  import { getInitials, formatWA } from '$lib/components/admin/_utils'
  import { Search, Plus, Activity, Pencil, Trash2, Users, MessageCircle } from 'lucide-svelte'

  interface Props {
    allUsers: Profile[]
    allTasks: Task[]
    allAssignments: TaskAssignment[]
    onEditUser: (u: Profile) => void
    onDeleteUser: (u: Profile) => void
    onViewPerformance: (u: Profile) => void
    onAddUser: () => void
    onSendReminder: (u: Profile) => void
  }
  let { allUsers, allTasks, allAssignments, onEditUser, onDeleteUser, onViewPerformance, onAddUser, onSendReminder } = $props<Props>()

  const ITEMS_PER_PAGE = 10
  let userSearch = $state('')
  let page       = $state(1)

  let filtered   = $derived(allUsers.filter(u =>
    !userSearch ||
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.position?.toLowerCase().includes(userSearch.toLowerCase())
  ))
  let paginated   = $derived(filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE))
  let totalPages  = $derived(Math.ceil(filtered.length / ITEMS_PER_PAGE))
  let totalAdmins = $derived(allUsers.filter(u => u.role === 'admin').length)

  $effect(() => { userSearch; page = 1 })
</script>

<div class="flex flex-col gap-4">
  <!-- Search + Add -->
  <div class="flex gap-2 items-center">
    <div class="flex-1 relative">
      <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input bind:value={userSearch} placeholder="Cari nama atau posisi..."
             class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
    </div>
    <button onclick={onAddUser}
            class="w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer flex-shrink-0"
            style="background:linear-gradient(135deg,#F97316,#EA580C)">
      <Plus size={16} />
    </button>
  </div>

  <!-- List -->
  <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <span class="text-xs font-bold text-slate-500">{filtered.length} pengguna</span>
      <span class="text-[10px] text-slate-400">{totalAdmins} admin · {allUsers.length - totalAdmins} karyawan</span>
    </div>

    {#if filtered.length === 0}
      <div class="py-12 text-center">
        <Users size={28} class="text-slate-200 mx-auto mb-2" />
        <p class="text-xs text-slate-400">Tidak ada pengguna ditemukan</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {#each paginated as u}
          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white overflow-hidden"
                 style="background:linear-gradient(135deg,#F97316,#EA580C)">
              {#if u.avatar_url}<img src={u.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                {#if u.role === 'admin'}
                  <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 flex-shrink-0">ADMIN</span>
                {/if}
              </div>
              <p class="text-[11px] text-slate-400 truncate">{u.position || 'Belum diisi'}{u.phone ? ' · ' + u.phone : ''}</p>
            </div>
            <div class="flex items-center gap-1">
              {#if u.phone}
                <a href={`https://wa.me/${formatWA(u.phone)}`} target="_blank"
                   class="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors cursor-pointer" title="Hubungi via WhatsApp">
                  <MessageCircle size={13} />
                </a>
              {/if}
              <button onclick={() => onSendReminder(u)}
                      class="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-orange-500 hover:text-orange-600 transition-colors cursor-pointer" title="Kirim Pengingat">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </button>
              <button onclick={() => onViewPerformance(u)}
                      class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-50 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors cursor-pointer" title="Lihat Performa">
                <Activity size={13} />
              </button>
              <button onclick={() => onEditUser(u)}
                      class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-orange-50 flex items-center justify-center text-slate-500 hover:text-orange-600 transition-colors cursor-pointer">
                <Pencil size={13} />
              </button>
              <button onclick={() => onDeleteUser(u)}
                      class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors cursor-pointer">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if totalPages > 1}
      <div class="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <button onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}
                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer">Prev</button>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Halaman {page} / {totalPages}</span>
        <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page === totalPages}
                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer">Next</button>
      </div>
    {/if}
  </div>
</div>
