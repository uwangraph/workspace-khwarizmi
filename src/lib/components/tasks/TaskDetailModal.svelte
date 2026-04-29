<script lang="ts">
  import toast from 'svelte-french-toast'
  import { X, Calendar, Clock, MapPin, CheckCircle2, ChevronRight, Plus, Trash2, Edit, Pin, PinOff, Send, MessageCircle, Zap, Bell } from 'lucide-svelte'
  interface Subtask { id: string; title: string; completed: boolean }
  interface Task { id: string; title: string; description: string|null; status: string; priority: string; progress: number; due_date: string|null; start_date: string|null; created_by: string; subtasks?: Subtask[] }
  interface Contributor { id: string; name: string; avatar: string|null; status: string }
  interface Assignment { id: string; task_id: string; user_id: string; status: string }
  interface Props {
    task: Task; userId: string; contributors: Contributor[]; myAssignment: Assignment|null
    canEdit: boolean; canDelete: boolean
    due: { label: string; color: string } | null
    formatDateShort: (s: string|null) => string|null
    getUserName: (id: string) => string
    getInitials: (n: string) => string
    getAvatarGradient: (s?: string) => string
    isPinned: boolean
    onTogglePin: () => void
    onUpdateSubtasks?: (subtasks: Subtask[]) => void
    onClose: () => void; onProgress: () => void; onEdit: () => void; onDelete: () => void
    onAccept: () => void; onReject: () => void
    onRemindMember?: (c: Contributor) => void
  }
  const STATUS_STYLE: Record<string,{bg:string;text:string;dot:string}> = {
    not_started:{bg:'bg-slate-100',text:'text-slate-600',dot:'#94A3B8'},
    in_progress:{bg:'bg-blue-50',text:'text-blue-700',dot:'#3B82F6'},
    review:{bg:'bg-purple-50',text:'text-purple-700',dot:'#A855F7'},
    revision:{bg:'bg-amber-50',text:'text-amber-700',dot:'#F59E0B'},
    done:{bg:'bg-green-50',text:'text-green-700',dot:'#22C55E'},
  }
  const STATUS_LABEL: Record<string,string> = { not_started:'Belum Dimulai', in_progress:'Proses', review:'Review', revision:'Revisi', done:'Selesai' }
  const PRIORITY_LABEL: Record<string,string> = { low:'Rendah', medium:'Sedang', high:'Tinggi' }
  const PRIORITY_DOT: Record<string,string> = { low:'#94A3B8', medium:'#F59E0B', high:'#EF4444' }

  let { task: t, userId, contributors, myAssignment: myA, canEdit, canDelete, isPinned, onTogglePin, onUpdateSubtasks, due, formatDateShort, getUserName, getInitials, getAvatarGradient, onClose, onProgress, onEdit, onDelete, onAccept, onReject, onRemindMember }: Props = $props()
  let statusStyle = $derived(STATUS_STYLE[t.status])

  let newSubtaskTitle = $state('')
  let isAddingSubtask = $state(false)

  function toggleSubtask(index: number) {
    if (!onUpdateSubtasks || (!canEdit && myA?.status !== 'accepted')) return
    const currentSubtasks = Array.isArray(t.subtasks) ? [...t.subtasks] : []
    currentSubtasks[index].completed = !currentSubtasks[index].completed
    onUpdateSubtasks(currentSubtasks)
  }

  function addSubtask(e: Event) {
    e.preventDefault()
    if (!newSubtaskTitle.trim() || !onUpdateSubtasks) return
    const currentSubtasks = Array.isArray(t.subtasks) ? [...t.subtasks] : []
    currentSubtasks.push({ id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false })
    onUpdateSubtasks(currentSubtasks)
    newSubtaskTitle = ''
    isAddingSubtask = false
  }

  function deleteSubtask(index: number) {
    if (!onUpdateSubtasks) return
    const currentSubtasks = Array.isArray(t.subtasks) ? [...t.subtasks] : []
    currentSubtasks.splice(index, 1)
    onUpdateSubtasks(currentSubtasks)
  }

  async function handleShare() {
    const url = new URL(window.location.href); url.searchParams.set('taskId', t.id)
    if (navigator.share) {
      try { await navigator.share({ title: t.title, url: url.toString() }) } catch (err) {}
    } else {
      try { await navigator.clipboard.writeText(url.toString()); toast.success('Link disalin') } catch (err) {}
    }
  }
</script>

<div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[94vh] flex flex-col relative"
       style="animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);" onclick={(e) => e.stopPropagation()}>
    
    <div class="sm:hidden flex justify-center pt-3 pb-1"><div class="h-1 w-10 rounded-full bg-slate-200"></div></div>
    
    <!-- Header -->
    <div class="px-8 pt-4 pb-5 border-b border-slate-50 flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-2 h-2 rounded-full" style="background:{PRIORITY_DOT[t.priority]};"></div>
          <span class="text-[10px] font-medium text-slate-400">Prioritas {PRIORITY_LABEL[t.priority]}</span>
        </div>
        <h2 class="text-xl font-bold text-slate-800 leading-tight mb-3" style="font-family:'Plus Jakarta Sans',sans-serif;">{t.title}</h2>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-semibold px-2.5 py-1 rounded-lg {statusStyle.bg} {statusStyle.text} flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
            {STATUS_LABEL[t.status]}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick={handleShare} class="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-90" title="Bagikan Tugas">
          <Send size={15} />
        </button>
        <button onclick={onTogglePin} class="w-9 h-9 rounded-xl {isPinned ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400'} flex items-center justify-center hover:bg-slate-100 transition-all active:scale-90" title={isPinned ? "Lepaskan Sematan" : "Sematkan"}>
          <Pin size={15} class={isPinned ? 'fill-current' : ''} />
        </button>
        <button onclick={onClose} class="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-90 cursor-pointer" title="Tutup">
          <X size={18} />
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="px-8 py-6 overflow-y-auto flex-1 space-y-7 scrollbar-hide">
      
      {#if t.description}
        <div class="space-y-1.5">
          <p class="text-[11px] font-semibold text-slate-500 ml-0.5">Deskripsi & Catatan</p>
          <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p class="text-sm text-slate-600 leading-relaxed font-medium">"{t.description}"</p>
          </div>
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-2">Tanggal Mulai</p>
          <div class="flex items-center gap-2">
            <Calendar size={14} class="text-slate-400" />
            <p class="text-xs font-bold text-slate-700">{formatDateShort(t.start_date) || '—'}</p>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-2">Batas Waktu</p>
          <div class="flex items-center gap-2">
            <Clock size={14} class="text-orange-500" />
            <p class="text-xs font-bold {due?.color || 'text-slate-700'}">{formatDateShort(t.due_date) || '—'}</p>
          </div>
        </div>
      </div>

      <!-- Checklist -->
      <div>
        <div class="flex items-center justify-between mb-3 px-0.5">
          <p class="text-[11px] font-semibold text-slate-500">Daftar Sub-Tugas</p>
          {#if canEdit || myA?.status === 'accepted'}
            <button onclick={() => isAddingSubtask = !isAddingSubtask} class="text-[10px] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
              {isAddingSubtask ? 'Batal' : '+ Tambah'}
            </button>
          {/if}
        </div>
        
        <div class="space-y-2.5">
          {#each t.subtasks || [] as st, i}
            <div class="flex items-center gap-3 bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-xl transition-all group {st.completed ? 'opacity-60 bg-slate-50/50' : ''}">
              <button onclick={() => toggleSubtask(i)} class="w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 {st.completed ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-slate-50 hover:border-orange-400'}">
                {#if st.completed}<CheckCircle2 size={12} strokeWidth={4} />{/if}
              </button>
              <span class="text-sm font-medium flex-1 {st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}">{st.title}</span>
              {#if canEdit || myA?.status === 'accepted'}
                <button onclick={() => deleteSubtask(i)} class="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center transition-all hover:bg-red-100 cursor-pointer flex-shrink-0">
                  <X size={14} />
                </button>
              {/if}
            </div>
          {/each}
          {#if isAddingSubtask}
            <form onsubmit={addSubtask} class="flex items-center gap-2 mt-2 animate-slideDown">
              <input type="text" bind:value={newSubtaskTitle} placeholder="Tuliskan sub-tugas baru..." class="flex-1 bg-white border border-orange-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-orange-500" autofocus />
              <button type="submit" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors">Simpan</button>
            </form>
          {/if}
        </div>
      </div>

      <!-- Members -->
      <div>
        <p class="text-[11px] font-semibold text-slate-500 mb-3 px-0.5">Tim Kolaborator</p>
        <div class="flex flex-wrap gap-2.5">
          {#each contributors as c}
            <div class="flex items-center gap-2.5 bg-white border border-slate-200 p-2 pr-4 rounded-full transition-all hover:border-orange-200">
              <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shadow-sm border-2 border-white"
                   style="background:{c.avatar ? 'white' : getAvatarGradient(c.status)};">
                {#if c.avatar}<img src={c.avatar} alt="" class="w-full h-full object-cover" />{:else}{getInitials(c.name)}{/if}
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-bold text-slate-700 leading-none mb-0.5">{c.name}</span>
                <span class="text-[9px] font-semibold {c.status==='accepted'?'text-emerald-500':c.status==='pending'?'text-blue-500':'text-slate-400'}">
                  {c.status==='accepted'?'Aktif':c.status==='pending'?'Menunggu':'Selesai'}
                </span>
              </div>
              {#if canEdit && c.id !== userId && c.status !== 'completed' && onRemindMember}
                <button 
                  onclick={(e) => { e.stopPropagation(); onRemindMember(c); }} 
                  class="ml-1 w-7 h-7 rounded-full bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 group/bell" 
                  title={c.status === 'pending' ? 'Ingatkan untuk bergabung' : 'Ingatkan progress tugas'}
                >
                  <Bell size={12} class="transition-transform group-hover/bell:rotate-12" />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-8 py-5 bg-white border-t border-slate-100 sm:rounded-b-3xl space-y-3">
      {#if myA?.status === 'pending' && t.created_by !== userId}
        <div class="flex gap-3">
          <button onclick={onAccept} class="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2" style="background:linear-gradient(to right,#10B981,#059669);">
            <CheckCircle2 size={16} /> Gabung Proyek
          </button>
          <button onclick={onReject} class="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-white text-red-500 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer">Tolak</button>
        </div>
      {:else if (myA?.status === 'accepted' || t.created_by === userId) && t.status !== 'done'}
        <button onclick={onProgress} class="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer" style="background:linear-gradient(to right,#F97316,#EA580C);">
          <Zap size={16} /> Perbarui Progress
        </button>
      {/if}
      
      {#if canEdit || canDelete}
        <div class="flex gap-3">
          {#if canEdit}
            <button onclick={onEdit} class="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <Edit size={14} class="text-slate-400" /> Ubah
            </button>
          {/if}
          {#if canDelete}
            <button onclick={onDelete} class="flex-1 py-3.5 rounded-xl bg-red-50/50 border border-red-100 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
              <Trash2 size={14} /> Hapus
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
