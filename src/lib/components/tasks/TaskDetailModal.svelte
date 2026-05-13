<script lang="ts">
  import toast from 'svelte-french-toast'
  import { X, Calendar, Clock, CheckCircle2, Trash2, Edit, Pin, Send, Zap, Bell, Paperclip, FileText, Image as ImageIcon, Download, Loader2, FileUp, Link2 } from 'lucide-svelte'
  import { taskService } from '$lib/services/taskService'
  import type { TaskAttachment } from '$lib/type'
  import TaskComments from './TaskComments.svelte'

  interface Subtask { id: string; title: string; completed: boolean }
  interface Task { id: string; title: string; description: string|null; status: string; priority: string; progress: number; due_date: string|null; start_date: string|null; created_by: string; subtasks?: Subtask[]; attachments?: TaskAttachment[] }
  interface Contributor { id: string; name: string; avatar: string|null; status: string }
  interface Assignment { id: string; task_id: string; user_id: string; status: string }
  interface Props {
    task: Task; userId: string; userFullName?: string; contributors: Contributor[]; myAssignment: Assignment|null
    canEdit: boolean; canDelete: boolean; isAdmin?: boolean
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
    onRemindAll?: () => void
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

  let { task: t, userId, userFullName = '', contributors, myAssignment: myA, canEdit, canDelete, isAdmin = false, isPinned, onTogglePin, onUpdateSubtasks, due, formatDateShort, getUserName, getInitials, getAvatarGradient, onClose, onProgress, onEdit, onDelete, onAccept, onReject, onRemindMember, onRemindAll }: Props = $props()

  let participantIds = $derived([...new Set(contributors.map(c => c.id).concat(t.created_by))])
  let statusStyle = $derived(STATUS_STYLE[t.status])

  let newSubtaskTitle = $state('')
  let isAddingSubtask = $state(false)
  let attachments = $state<TaskAttachment[]>(t.attachments || [])
  let isUploading = $state(false)
  let fileInput: HTMLInputElement

  // Link State
  let isAddingLink = $state(false)
  let newLinkTitle = $state('')
  let newLinkUrl = $state('')

  // Custom Alert State
  let showDeleteConfirm = $state(false)
  let attToDelete = $state<TaskAttachment | null>(null)
  let isDeleting = $state(false)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  $effect(() => {
    fetchAttachments()
  })

  async function fetchAttachments() {
    try {
      const data = await taskService.getAttachments(t.id)
      attachments = data
    } catch (err) {
      console.error('Gagal mengambil lampiran:', err)
    }
  }

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    
    // Size check
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File terlalu besar! Maksimal 10MB.')
      input.value = ''
      return
    }

    isUploading = true
    try {
      const newAttachment = await taskService.uploadAttachment(t.id, userId, file)
      attachments = [...attachments, newAttachment]
      toast.success('File berhasil diunggah')
    } catch (err: any) {
      toast.error('Gagal mengunggah file: ' + err.message)
    } finally {
      isUploading = false
      input.value = ''
    }
  }

  async function handleAddLink(e: Event) {
    e.preventDefault()
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return

    try {
      const newAttachment = await taskService.addExternalLink(t.id, userId, newLinkTitle.trim(), newLinkUrl.trim())
      attachments = [...attachments, newAttachment]
      toast.success('Link berhasil ditambahkan')
      newLinkTitle = ''
      newLinkUrl = ''
      isAddingLink = false
    } catch (err: any) {
      toast.error('Gagal menambahkan link: ' + err.message)
    }
  }

  function confirmDelete(att: TaskAttachment) {
    attToDelete = att
    showDeleteConfirm = true
  }

  async function handleDeleteAttachment() {
    if (!attToDelete) return
    
    isDeleting = true
    try {
      if (attToDelete.file_type === 'link/external') {
        await taskService.deleteAttachment(attToDelete.id, '') // No storage path for links
      } else {
        // Extract path from URL
        const url = new URL(attToDelete.file_url)
        const pathParts = url.pathname.split('/tasks/')
        if (pathParts.length < 2) throw new Error('Path file tidak valid')
        const filePath = decodeURIComponent(pathParts[1])
        await taskService.deleteAttachment(attToDelete.id, filePath)
      }
      
      attachments = attachments.filter(a => a.id !== attToDelete.id)
      toast.success('Lampiran dihapus')
      showDeleteConfirm = false
      attToDelete = null
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message)
    } finally {
      isDeleting = false
    }
  }

  async function handleDownload(att: TaskAttachment) {
    if (att.file_type === 'link/external') {
      window.open(att.file_url, '_blank')
      return
    }

    const tId = toast.loading('Menyiapkan unduhan...')
    try {
      const response = await fetch(att.file_url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = att.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
      toast.success('File diunduh', { id: tId })
    } catch (err) {
      window.open(att.file_url, '_blank')
      toast.dismiss(tId)
    }
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return ImageIcon
    if (type === 'link/external') return Link2
    return FileText
  }

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
            <Calendar size={13} class="text-slate-400" />
            <p class="text-[11px] font-bold text-slate-700 leading-none">{formatDateShort(t.start_date) || '—'}</p>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-2">Batas Waktu</p>
          <div class="flex items-center gap-2">
            <Clock size={13} class="text-orange-500" />
            <p class="text-[11px] font-bold {due?.color || 'text-slate-700'} leading-none">{formatDateShort(t.due_date) || '—'}</p>
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

      <!-- Attachments -->
      <div>
        <div class="flex items-center justify-between mb-3 px-0.5">
          <p class="text-[11px] font-semibold text-slate-500">Lampiran & File</p>
          <div class="flex gap-2">
            {#if canEdit || myA?.status === 'accepted'}
              <button 
                onclick={() => isAddingLink = !isAddingLink}
                class="text-[10px] font-bold {isAddingLink ? 'text-red-500 bg-red-50' : 'text-slate-500 bg-slate-50'} px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
              >
                {isAddingLink ? 'Batal' : '+ Link'}
              </button>
              <input type="file" bind:this={fileInput} class="hidden" onchange={handleFileUpload} />
              <button 
                onclick={() => fileInput.click()} 
                disabled={isUploading}
                class="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {#if isUploading}
                  <Loader2 size={12} class="animate-spin" /> Mengunggah...
                {:else}
                  <Paperclip size={12} /> Tambah File
                {/if}
              </button>
            {/if}
          </div>
        </div>

        {#if isAddingLink}
          <form onsubmit={handleAddLink} class="bg-white border-2 border-orange-100 rounded-2xl p-4 mb-3 space-y-3 animate-slideDown shadow-lg shadow-orange-500/5">
            <div class="space-y-1">
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Judul Link (Contoh: Google Drive)</p>
              <input type="text" bind:value={newLinkTitle} placeholder="Ketik nama link..." class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-orange-500 transition-all" required />
            </div>
            <div class="space-y-1">
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">URL / Tautan</p>
              <input type="url" bind:value={newLinkUrl} placeholder="https://drive.google.com/..." class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-orange-500 transition-all" required />
            </div>
            <button type="submit" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 active:scale-95">
              Simpan Link
            </button>
          </form>
        {/if}

        <div class="grid grid-cols-1 gap-2">
          {#each attachments as att}
            {@const Icon = getFileIcon(att.file_type)}
            <div class="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl group hover:border-orange-200 transition-all">
              <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-all">
                <Icon size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-700 truncate">{att.filename}</p>
                <p class="text-[9px] text-slate-400 uppercase font-semibold">
                  {#if att.file_type === 'link/external'}
                    EXTERNAL LINK
                  {:else}
                    {att.file_type.split('/')[1] || 'FILE'}
                  {/if}
                  • {new Date(att.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button onclick={() => handleDownload(att)} class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all" title={att.file_type === 'link/external' ? "Buka Link" : "Unduh File"}>
                  {#if att.file_type === 'link/external'}<Send size={14} />{:else}<Download size={14} />{/if}
                </button>
                {#if canEdit || att.user_id === userId}
                  <button onclick={() => confirmDelete(att)} class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all" title="Hapus">
                    <Trash2 size={14} />
                  </button>
                {/if}
              </div>
            </div>
          {:else}
            <div class="py-6 text-center border-2 border-dashed border-slate-100 rounded-3xl">
              <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-300">
                <FileUp size={20} />
              </div>
              <p class="text-[10px] font-medium text-slate-400">Belum ada lampiran file</p>
            </div>
          {/each}
        </div>
      </div>

      <!-- People Info -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-0.5">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tim Terlibat</p>
          {#if onRemindAll}
            <button onclick={onRemindAll} class="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm border border-orange-100">
              <Bell size={10} /> Ingatkan Semua
            </button>
          {/if}
        </div>
        
        <div class="grid grid-cols-2 gap-6">
          <div class="space-y-3">
            <p class="text-[11px] font-semibold text-slate-500 ml-0.5">Dibuat Oleh</p>
            <div class="flex items-center gap-2.5 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
              <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shadow-sm border-2 border-white"
                   style="background: {t.created_by ? getAvatarGradient('owner') : '#94A3B8'};">
                {getInitials(getUserName(t.created_by))}
              </div>
              <div class="min-w-0 flex-1">
                <span class="block text-xs font-bold text-slate-700 truncate">{getUserName(t.created_by)}</span>
                <span class="block text-[9px] text-slate-400">Pemilik Tugas</span>
              </div>
              {#if onRemindMember && t.created_by !== userId}
                <button 
                  onclick={(e) => { e.stopPropagation(); onRemindMember({ id: t.created_by, name: getUserName(t.created_by), avatar: null, status: 'owner' }); }} 
                  class="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200" 
                  title="Kirim pengingat ke pembuat"
                >
                  <Bell size={10} />
                </button>
              {/if}
            </div>
          </div>
          
          <div class="space-y-3">
            <p class="text-[11px] font-semibold text-slate-500 ml-0.5">Kolaborator ({contributors.filter(c => c.id !== t.created_by).length})</p>
            <div class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {#each contributors.filter(c => c.id !== t.created_by) as c}
                <div class="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                         style="background:{c.avatar ? 'white' : getAvatarGradient(c.status)};">
                      {#if c.avatar}<img src={c.avatar} alt="" class="w-full h-full object-cover" />{:else}{getInitials(c.name)}{/if}
                    </div>
                    <div class="min-w-0">
                      <p class="text-[10px] font-bold text-slate-700 truncate leading-tight">{c.name}</p>
                      <p class="text-[8px] font-semibold {c.status==='accepted'?'text-emerald-500':c.status==='pending'?'text-blue-500':'text-slate-400'}">
                        {c.status==='accepted'?'Aktif':c.status==='pending'?'Menunggu':'Selesai'}
                      </p>
                    </div>
                  </div>
                  {#if onRemindMember && c.id !== userId}
                    <button 
                      onclick={(e) => { e.stopPropagation(); onRemindMember(c); }} 
                      class="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all duration-200" 
                      title="Kirim pengingat"
                    >
                      <Bell size={10} />
                    </button>
                  {/if}
                </div>
              {:else}
                <div class="p-3 text-center border border-dashed border-slate-200 rounded-2xl">
                  <span class="text-[10px] font-medium text-slate-400 italic">Belum ada tim</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- Comments -->
      <TaskComments
        taskId={t.id}
        taskTitle={t.title}
        {userId}
        {userFullName}
        {participantIds}
        {isAdmin}
      />
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

{#if showDeleteConfirm && attToDelete}
  <div 
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn cursor-pointer"
    onclick={() => { showDeleteConfirm = false; attToDelete = null; }}
  >
    <div 
      class="w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden animate-popIn cursor-default"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="p-8 text-center relative">
        <!-- Close Button top right -->
        <button 
          onclick={() => { showDeleteConfirm = false; attToDelete = null; }}
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div class="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500">
          <Trash2 size={32} />
        </div>
        <h3 class="text-lg font-bold text-slate-900 mb-2">Hapus Lampiran?</h3>
        <p class="text-sm text-slate-500 leading-relaxed mb-6">File <b>{attToDelete.filename}</b> akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.</p>
        
        <div class="flex flex-col gap-2">
          <button 
            onclick={handleDeleteAttachment} 
            disabled={isDeleting}
            class="w-full py-3.5 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {#if isDeleting}
              <Loader2 size={16} class="animate-spin" /> Menghapus...
            {:else}
              Hapus Permanen
            {/if}
          </button>
          <button 
            onclick={() => { showDeleteConfirm = false; attToDelete = null; }}
            disabled={isDeleting}
            class="w-full py-3.5 rounded-xl bg-white text-slate-500 text-sm font-bold hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .animate-slideDown { animation: slideDown 0.2s ease-out; }
  .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  .animate-popIn { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
