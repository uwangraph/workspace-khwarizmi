<script lang="ts">
  import { X } from 'lucide-svelte'
  import { STATUS_LABEL, STATUS_STYLE, PRIORITY_DOT, PRIORITY_LABEL, getInitials, formatDate } from '$lib/components/admin/_utils'
  import type { Task, Profile, TaskAssignment } from '$lib/components/admin/_types'
  import { Calendar, ClipboardList, Trash2 } from 'lucide-svelte'

  interface Props {
    task: Task
    allUsers: Profile[]
    allAssignments: TaskAssignment[]
    onUpdateStatus: (task: Task, status: Task['status']) => Promise<void>
    onDelete: (task: Task) => void
    onClose: () => void
    onRemindMember?: (p: Profile) => void
  }
  let { task, allUsers, allAssignments, onUpdateStatus, onDelete, onClose, onRemindMember } = $props<Props>()

  let ss        = $derived(STATUS_STYLE[task.status])
  let assignees = $derived(
    allAssignments
      .filter(a => a.task_id === task.id && a.status !== 'rejected')
      .map(a => allUsers.find(u => u.id === a.user_id))
      .filter(Boolean) as Profile[]
  )
  let creator = $derived(allUsers.find(u => u.id === task.created_by))
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
     style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh;"
       onclick={e => e.stopPropagation()}>
    
    <div class="flex justify-center pt-3 pb-1 sm:hidden"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    
    <div class="flex items-center justify-between px-8 py-6">
      <div class="flex flex-col">
        <h3 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Detail Tugas</h3>
        <p class="text-[11px] text-slate-400">Informasi lengkap mengenai tugas ini</p>
      </div>
      <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-90">
        <X size={18} />
      </button>
    </div>

    <div class="px-8 pb-8 overflow-y-auto scrollbar-hide flex flex-col gap-7">
      <!-- Title & Status Badge -->
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-800 leading-tight">{task.title}</h2>
          <span class="text-[10px] font-bold px-3 py-1 rounded-lg flex-shrink-0 {ss.bg} {ss.text}">{STATUS_LABEL[task.status]}</span>
        </div>
        
        <div class="flex flex-wrap gap-4 pt-1">
          <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Calendar size={14} class="text-slate-300" />
            <span>Tenggat: {formatDate(task.due_date)}</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
            <div class="w-2 h-2 rounded-full" style="background:{PRIORITY_DOT[task.priority]}"></div>
            <span>Prioritas {PRIORITY_LABEL[task.priority]}</span>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div>
        <div class="flex justify-between items-end mb-2.5 px-0.5">
          <p class="text-[11px] font-semibold text-slate-500">Progress Pengerjaan</p>
          <span class="text-[11px] font-bold text-orange-600">{task.progress}%</span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700"
               style="width:{task.progress}%; background:linear-gradient(to right, #F97316, #EA580C)"></div>
        </div>
      </div>

      <!-- Description -->
      {#if task.description}
        <div class="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
          <p class="text-[11px] font-semibold text-slate-500 mb-2">Deskripsi & Catatan</p>
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      {/if}

      <!-- People Info -->
      <div class="grid grid-cols-2 gap-6">
        <div class="space-y-3">
          <p class="text-[11px] font-semibold text-slate-500 ml-0.5">Dibuat Oleh</p>
          <div class="flex items-center gap-2.5 bg-white border border-slate-100 p-2 rounded-2xl shadow-sm">
            <div class="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[10px] font-bold text-orange-600 overflow-hidden">
              {#if creator?.avatar_url}<img src={creator.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(creator?.full_name || 'U')}{/if}
            </div>
            <div class="min-w-0">
              <span class="block text-xs font-bold text-slate-700 truncate">{creator?.full_name || 'Admin'}</span>
              <span class="block text-[9px] text-slate-400">Pemilik Tugas</span>
            </div>
          </div>
        </div>
        
        <div class="space-y-3">
          <p class="text-[11px] font-semibold text-slate-500 ml-0.5">Kolaborator ({assignees.length})</p>
          <div class="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
            {#each assignees as p}
              <div class="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-2xl shadow-sm">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[9px] font-bold text-slate-500 overflow-hidden">
                    {#if p.avatar_url}<img src={p.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(p.full_name)}{/if}
                  </div>
                  <span class="text-[10px] font-bold text-slate-700 truncate" title={p.full_name}>{p.full_name}</span>
                </div>
                {#if onRemindMember}
                  <button onclick={() => onRemindMember(p)} class="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  </button>
                {/if}
              </div>
            {:else}
              <div class="p-4 text-center border border-dashed border-slate-200 rounded-2xl">
                <span class="text-[10px] font-medium text-slate-400 italic">Belum ada tim</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Admin Actions -->
      <div class="pt-6 border-t border-slate-50 space-y-4">
        <p class="text-[11px] font-semibold text-slate-500 ml-0.5">Ubah Status Tugas</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {#each Object.entries(STATUS_LABEL) as [val, label]}
            <button onclick={() => onUpdateStatus(task, val as Task['status'])}
                    class="py-2.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center text-center {task.status === val ? 'text-white border-transparent shadow-lg shadow-orange-500/20' : 'bg-white text-slate-400 border-slate-100'}"
                    style={task.status === val ? 'background:linear-gradient(to right, #F97316, #EA580C)' : ''}>
              {label}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button onclick={() => onDelete(task)}
                class="flex-1 py-3.5 rounded-xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
          <Trash2 size={16} /> Hapus
        </button>
        <button onclick={onClose}
                class="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors">
          Kembali
        </button>
      </div>
    </div>
  </div>
</div>
<style>
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
