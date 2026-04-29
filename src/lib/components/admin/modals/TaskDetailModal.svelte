<script lang="ts">
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

<div class="fixed inset-0 z-50 flex items-end justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl pb-8"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <ClipboardList size={16} class="text-orange-500" />
        <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Detail Tugas</span>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
    </div>

    <div class="px-6 py-5 flex flex-col gap-6">
      <!-- Title & Status -->
      <div>
        <div class="flex items-start justify-between gap-4 mb-2">
          <h3 class="text-lg font-bold text-slate-800 leading-tight">{task.title}</h3>
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 {ss.bg} {ss.text}">{STATUS_LABEL[task.status]}</span>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={12} />
            <span>Deadline: {formatDate(task.due_date)}</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-slate-500">
            <div class="w-2 h-2 rounded-full" style="background:{PRIORITY_DOT[task.priority]}"></div>
            <span>Prioritas {PRIORITY_LABEL[task.priority]}</span>
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div>
        <div class="flex justify-between items-end mb-2">
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progress Kerja</p>
          <span class="text-sm font-bold text-orange-600">{task.progress}%</span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               style="width:{task.progress}%; background:linear-gradient(90deg,#F97316,#FBBF24)"></div>
        </div>
      </div>

      <!-- Description -->
      {#if task.description}
        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Deskripsi</p>
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      {/if}

      <!-- People -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Dibuat Oleh</p>
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 overflow-hidden">
              {#if creator?.avatar_url}<img src={creator.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(creator?.full_name || 'Unknown')}{/if}
            </div>
            <span class="text-xs font-semibold text-slate-700">{creator?.full_name || 'Unknown'}</span>
          </div>
        </div>
        <div>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Kolaborator ({assignees.length})</p>
          <div class="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
            {#each assignees as p}
              <div class="flex items-center justify-between bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 overflow-hidden">
                    {#if p.avatar_url}<img src={p.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(p.full_name)}{/if}
                  </div>
                  <span class="text-[10px] font-semibold text-slate-700 truncate max-w-[80px]" title={p.full_name}>{p.full_name}</span>
                </div>
                {#if onRemindMember}
                  <button onclick={() => onRemindMember(p)} class="w-5 h-5 rounded-md bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 flex items-center justify-center transition-colors shadow-sm" title="Kirim Pengingat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  </button>
                {/if}
              </div>
            {:else}
              <span class="text-xs text-slate-400 italic">Tidak ada</span>
            {/each}
          </div>
        </div>
      </div>

      <!-- Admin Status Override -->
      <div class="pt-2 border-t border-slate-100">
        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Update Status (Admin)</p>
        <div class="grid grid-cols-3 gap-2">
          {#each Object.entries(STATUS_LABEL) as [val, label]}
            <button onclick={() => onUpdateStatus(task, val as Task['status'])}
                    class="py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer"
                    class:bg-white={task.status !== val} class:text-slate-500={task.status !== val}
                    class:border-slate-200={task.status !== val} class:text-white={task.status === val}
                    class:border-transparent={task.status === val}
                    style={task.status === val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
              {label}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex gap-3 mt-2">
        <button onclick={() => onDelete(task)}
                class="flex-1 py-3 rounded-xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2">
          <Trash2 size={16} /> Hapus Tugas
        </button>
        <button onclick={onClose}
                class="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
          Tutup
        </button>
      </div>
    </div>
  </div>
</div>
<style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
