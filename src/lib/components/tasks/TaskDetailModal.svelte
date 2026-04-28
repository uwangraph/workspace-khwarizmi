<script lang="ts">
  import toast from 'svelte-french-toast'
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

  let { task: t, userId, contributors, myAssignment: myA, canEdit, canDelete, isPinned, onTogglePin, onUpdateSubtasks, due, formatDateShort, getUserName, getInitials, getAvatarGradient, onClose, onProgress, onEdit, onDelete, onAccept, onReject }: Props = $props()
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
     style="background:rgba(15, 23, 42, 0.6); backdrop-filter:blur(12px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl max-h-[94vh] flex flex-col relative"
       style="animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);" onclick={(e) => e.stopPropagation()}>
    
    <div class="sm:hidden flex justify-center pt-4 pb-2"><div class="h-1.5 w-12 rounded-full bg-slate-200/80"></div></div>
    
    <!-- Header -->
    <div class="px-8 pt-4 pb-6 border-b border-slate-100 flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-2.5 h-2.5 rounded-full" style="background:{PRIORITY_DOT[t.priority]};"></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Prioritas {PRIORITY_LABEL[t.priority]}</span>
        </div>
        <h2 class="text-2xl font-black text-slate-900 leading-tight mb-3" style="font-family:'Plus Jakarta Sans',sans-serif;">{t.title}</h2>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-black px-3 py-1.5 rounded-xl {statusStyle.bg} {statusStyle.text} flex items-center gap-2 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background:{statusStyle.dot};"></span>
            {STATUS_LABEL[t.status]}
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button onclick={onTogglePin} class="w-10 h-10 rounded-2xl {isPinned ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-300'} flex items-center justify-center transition-all active:scale-90 shadow-sm">
          <svg class="w-5 h-5" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>
        </button>
        <button onclick={onClose} class="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-90 shadow-sm">✕</button>
      </div>
    </div>

    <!-- Body -->
    <div class="px-8 py-8 overflow-y-auto flex-1 space-y-8 scrollbar-hide">
      
      {#if t.description}
        <div>
          <p class="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Deskripsi & Catatan</p>
          <div class="bg-slate-50/50 border-2 border-slate-100/50 rounded-2xl p-5 shadow-inner">
            <p class="text-sm text-slate-700 leading-relaxed italic font-medium">"{t.description}"</p>
          </div>
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-100 rounded-[1.5rem] p-4 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tanggal Mulai</p>
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <p class="text-xs font-black text-slate-800">{formatDateShort(t.start_date) || '—'}</p>
          </div>
        </div>
        <div class="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-100 rounded-[1.5rem] p-4 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Batas Waktu</p>
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-xs font-black {due?.color || 'text-slate-800'}">{formatDateShort(t.due_date) || '—'}</p>
          </div>
        </div>
      </div>

      <!-- Checklist -->
      <div>
        <div class="flex items-center justify-between mb-4 px-1">
          <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Daftar Sub-Tugas</p>
          {#if canEdit || myA?.status === 'accepted'}
            <button onclick={() => isAddingSubtask = !isAddingSubtask} class="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-all shadow-sm">
              {isAddingSubtask ? 'Batal' : '+ Tambah'}
            </button>
          {/if}
        </div>
        
        <div class="space-y-3">
          {#each t.subtasks || [] as st, i}
            <div class="flex items-center gap-4 bg-white border-2 border-slate-50 hover:border-slate-100 p-4 rounded-2xl transition-all shadow-sm group {st.completed ? 'opacity-60' : ''}">
              <button onclick={() => toggleSubtask(i)} class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all {st.completed ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 bg-slate-50 hover:border-orange-400'}">
                {#if st.completed}<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>{/if}
              </button>
              <span class="text-sm font-bold flex-1 {st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}">{st.title}</span>
              {#if canEdit || myA?.status === 'accepted'}
                <button onclick={() => deleteSubtask(i)} class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all hover:bg-red-100">✕</button>
              {/if}
            </div>
          {/each}
          {#if isAddingSubtask}
            <form onsubmit={addSubtask} class="flex items-center gap-3 mt-3 animate-slideDown">
              <input type="text" bind:value={newSubtaskTitle} placeholder="Tuliskan sub-tugas baru..." class="flex-1 bg-slate-50 border-2 border-orange-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white shadow-inner" autofocus />
              <button type="submit" class="bg-orange-500 text-white px-6 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Simpan</button>
            </form>
          {/if}
        </div>
      </div>

      <!-- Members -->
      <div>
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Tim Kolaborator</p>
        <div class="flex flex-wrap gap-3">
          {#each contributors as c}
            <div class="flex items-center gap-3 bg-white border-2 border-slate-100 p-2 pr-4 rounded-3xl transition-all hover:border-orange-100 shadow-sm">
              <div class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-black text-white shadow-md border-2 border-white"
                   style="background:{c.avatar ? 'white' : getAvatarGradient(c.status)};">
                {#if c.avatar}<img src={c.avatar} alt="" class="w-full h-full object-cover" />{:else}{getInitials(c.name)}{/if}
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-black text-slate-800 leading-none mb-1">{c.name}</span>
                <span class="text-[9px] font-bold {c.status==='accepted'?'text-green-600':c.status==='pending'?'text-blue-500':'text-slate-400'} uppercase tracking-tighter">
                  {c.status==='accepted'?'Aktif':c.status==='pending'?'Menunggu':'Selesai'}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-8 py-6 bg-slate-50/50 border-t border-slate-100 sm:rounded-b-[2.5rem] space-y-4">
      {#if myA?.status === 'pending' && t.created_by !== userId}
        <div class="flex gap-4">
          <button onclick={onAccept} class="flex-1 py-4 rounded-2xl text-sm font-black text-white shadow-xl shadow-green-500/20 active:scale-[0.96] transition-all cursor-pointer flex items-center justify-center gap-2" style="background:linear-gradient(135deg,#16A34A,#15803D);">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            Gabung Proyek
          </button>
          <button onclick={onReject} class="flex-1 py-4 rounded-2xl text-sm font-black bg-white text-red-600 border-2 border-red-100 hover:bg-red-50 transition-all cursor-pointer">Tolak</button>
        </div>
      {:else if (myA?.status === 'accepted' || t.created_by === userId) && t.status !== 'done'}
        <button onclick={onProgress} class="w-full py-4 rounded-2xl text-sm font-black text-white shadow-xl shadow-orange-500/20 active:scale-[0.96] transition-all flex items-center justify-center gap-2 cursor-pointer" style="background:linear-gradient(135deg,#F97316,#EA580C);">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Perbarui Progress
        </button>
      {/if}
      
      {#if canEdit || canDelete}
        <div class="flex gap-4">
          {#if canEdit}
            <button onclick={onEdit} class="flex-1 py-3 rounded-2xl bg-white border-2 border-slate-100 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
              <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              Ubah
            </button>
          {/if}
          {#if canDelete}
            <button onclick={onDelete} class="flex-1 py-3 rounded-2xl bg-red-50 border-2 border-red-100 text-xs font-black text-red-500 hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Hapus
            </button>
          {/if}
          <button onclick={handleShare} class="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all shadow-sm">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(60px); opacity: 0; filter: blur(10px); } to { transform: translateY(0); opacity: 1; filter: blur(0); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideDown { animation: slideDown 0.3s ease-out; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
