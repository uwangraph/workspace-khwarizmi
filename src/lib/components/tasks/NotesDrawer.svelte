<script lang="ts">
  import { tick } from 'svelte'
  import { supabase } from '$lib/supabase'
  import { fly, fade } from 'svelte/transition'
  import {
    Pin, PinOff, Plus, Trash2, X, ChevronLeft, Search,
    CheckSquare, Square, ListChecks, Maximize2, Minimize2,
    Share2, Copy, CheckCheck,
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Heading2,
    Undo2, Redo2
  } from 'lucide-svelte'

  interface Note {
    id: string
    title: string
    content: string
    color: string
    is_pinned: boolean
    updated_at: string
  }

  interface Props {
    userId: string
    open: boolean
    onClose: () => void
  }

  let { userId, open, onClose }: Props = $props()

  const COLORS: Record<string, { bg: string; border: string; dot: string }> = {
    yellow: { bg: 'bg-yellow-50',  border: 'border-yellow-200', dot: 'bg-yellow-400' },
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400'   },
    green:  { bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-400'  },
    pink:   { bg: 'bg-pink-50',    border: 'border-pink-200',   dot: 'bg-pink-400'   },
    purple: { bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-400' },
    slate:  { bg: 'bg-slate-50',   border: 'border-slate-200',  dot: 'bg-slate-400'  },
  }

  let notes          = $state<Note[]>([])
  let isLoading      = $state(false)
  let editingNote    = $state<Note | null>(null)
  let isSaving       = $state(false)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let searchQuery    = $state('')
  let checklistMode  = $state(false)
  let longPressId    = $state<string | null>(null)
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let newItemText    = $state('')
  let fullscreen     = $state(false)
  let deleteTargetId = $state<string | null>(null)
  let copied         = $state(false)
  let editorRef      = $state<HTMLDivElement | null>(null)

  // Format state for toolbar
  let fmt = $state({
    bold: false, italic: false, underline: false, strike: false,
    h2: false,
    left: false, center: false, right: false,
    ul: false, ol: false,
  })

  let deleteTargetNote = $derived(notes.find(n => n.id === deleteTargetId) ?? null)
  let filteredNotes    = $derived(
    searchQuery.trim()
      ? notes.filter(n =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stripHtml(n.content).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : notes
  )

  $effect(() => {
    if (open && userId) loadNotes()
  })

  // ── Helpers ──────────────────────────────────────────────────────

  function isChecklistContent(content: string) {
    if (!content.trim()) return false
    return content.split('\n').every(line => !line.trim() || line.startsWith('[ ] ') || line.startsWith('[x] '))
  }

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
  }

  function notePreview(content: string): string {
    if (!content.trim()) return ''
    if (isChecklistContent(content)) {
      return content.split('\n').filter(l => l.trim())
        .map(l => (l.startsWith('[x] ') ? '✓ ' : '○ ') + l.slice(4)).join('  ·  ')
    }
    return stripHtml(content)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'Baru saja'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  // ── Format state ─────────────────────────────────────────────────

  function refreshFmt() {
    if (typeof document === 'undefined') return
    try {
      const block = document.queryCommandValue('formatBlock').toLowerCase()
      fmt = {
        bold:   document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        h2:     block === 'h2' || block === 'h1',
        left:   document.queryCommandState('justifyLeft'),
        center: document.queryCommandState('justifyCenter'),
        right:  document.queryCommandState('justifyRight'),
        ul:     document.queryCommandState('insertUnorderedList'),
        ol:     document.queryCommandState('insertOrderedList'),
      }
    } catch {}
  }

  // Prevent toolbar buttons from stealing focus, then exec command
  function execFormat(e: MouseEvent, cmd: string, val?: string) {
    e.preventDefault()
    editorRef?.focus()
    document.execCommand(cmd, false, val ?? '')
    if (editingNote && editorRef) editingNote.content = editorRef.innerHTML
    handleInput()
    refreshFmt()
  }

  function toggleHeading(e: MouseEvent) {
    e.preventDefault()
    editorRef?.focus()
    const block = document.queryCommandValue('formatBlock').toLowerCase()
    document.execCommand('formatBlock', false, (block === 'h2' || block === 'h1') ? 'p' : 'h2')
    if (editingNote && editorRef) editingNote.content = editorRef.innerHTML
    handleInput()
    refreshFmt()
  }

  // ── Data ops ──────────────────────────────────────────────────────

  async function loadNotes() {
    isLoading = true
    const { data } = await supabase
      .from('notes').select('*').eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    notes = (data as Note[]) ?? []
    isLoading = false
  }

  async function createNote() {
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: userId, title: '', content: '', color: 'yellow' })
      .select().single()
    if (data) {
      notes = [data as Note, ...notes]
      editingNote = data as Note
      searchQuery = ''
      checklistMode = false
      await tick()
      if (editorRef) editorRef.innerHTML = ''
      editorRef?.focus()
    }
  }

  async function openNote(note: Note) {
    editingNote = { ...note }
    checklistMode = isChecklistContent(note.content)
    await tick()
    if (editorRef && !checklistMode) {
      editorRef.innerHTML = note.content
    }
    refreshFmt()
  }

  function handleEditorInput() {
    if (!editingNote || !editorRef) return
    editingNote.content = editorRef.innerHTML
    handleInput()
    refreshFmt()
  }

  function handleInput() {
    if (!editingNote) return
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveNote(), 800)
  }

  async function saveNote() {
    if (!editingNote) return
    const note = { ...editingNote }
    isSaving = true
    await supabase.from('notes')
      .update({ title: note.title, content: note.content, color: note.color })
      .eq('id', note.id)
    notes = notes.map(n => n.id === note.id ? { ...n, ...note } : n)
    isSaving = false
  }

  async function togglePin(note: Note) {
    const newVal = !note.is_pinned
    await supabase.from('notes').update({ is_pinned: newVal }).eq('id', note.id)
    notes = notes
      .map(n => n.id === note.id ? { ...n, is_pinned: newVal } : n)
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
    if (editingNote?.id === note.id) editingNote = { ...editingNote, is_pinned: newVal }
  }

  async function deleteNote(id: string) {
    if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null }
    await supabase.from('notes').delete().eq('id', id)
    notes = notes.filter(n => n.id !== id)
    if (editingNote?.id === id) editingNote = null
    deleteTargetId = null
    longPressId = null
  }

  // ── Checklist ─────────────────────────────────────────────────────

  function toggleChecklistMode() {
    if (!editingNote) return
    if (checklistMode) {
      editingNote.content = editingNote.content
        .split('\n').map(l => l.replace(/^\[[ x]\] /, '')).join('\n')
      checklistMode = false
      tick().then(() => {
        if (editorRef) editorRef.innerHTML = editingNote!.content
      })
    } else {
      // Save current editor HTML first
      if (editorRef) editingNote.content = stripHtml(editorRef.innerHTML)
      editingNote.content = editingNote.content
        .split('\n').map(l => l.trim() ? `[ ] ${l}` : l).join('\n')
      checklistMode = true
    }
    handleInput()
  }

  function toggleCheckItem(i: number) {
    if (!editingNote) return
    const lines = editingNote.content.split('\n')
    const l = lines[i]
    lines[i] = l.startsWith('[x] ') ? '[ ] ' + l.slice(4) : '[ ] ' === l.slice(0,4) ? '[x] ' + l.slice(4) : l
    editingNote.content = lines.join('\n')
    handleInput()
  }

  function addCheckItem() {
    if (!editingNote || !newItemText.trim()) return
    editingNote.content += (editingNote.content ? '\n' : '') + '[ ] ' + newItemText.trim()
    newItemText = ''
    handleInput()
  }

  function clearCompleted() {
    if (!editingNote) return
    editingNote.content = editingNote.content.split('\n').filter(l => !l.startsWith('[x] ')).join('\n')
    handleInput()
  }

  // ── Share / Duplicate ─────────────────────────────────────────────

  async function shareNote() {
    if (!editingNote) return
    const body = isChecklistContent(editingNote.content)
      ? editingNote.content.split('\n').filter(l => l.trim())
          .map(l => (l.startsWith('[x] ') ? '✓ ' : '○ ') + l.slice(4)).join('\n')
      : stripHtml(editingNote.content)
    const text = [editingNote.title, body].filter(Boolean).join('\n\n')
    if (navigator.share) {
      await navigator.share({ title: editingNote.title || 'Catatan', text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      copied = true
      setTimeout(() => copied = false, 2000)
    }
  }

  async function duplicateNote(source: Note) {
    const { data } = await supabase.from('notes')
      .insert({ user_id: userId, title: source.title ? `Salinan: ${source.title}` : '', content: source.content, color: source.color })
      .select().single()
    if (data) { notes = [data as Note, ...notes]; longPressId = null }
  }

  // ── Long press ────────────────────────────────────────────────────

  function handleLongPressStart(id: string) {
    longPressTimer = setTimeout(() => { longPressId = id }, 500)
  }

  function handleLongPressEnd() {
    if (longPressTimer) clearTimeout(longPressTimer)
    longPressTimer = null
  }

  // ── Navigation ────────────────────────────────────────────────────

  function handleBackdropClick(e: MouseEvent) {
    if (e.target !== e.currentTarget) return
    if (longPressId) { longPressId = null; return }
    if (editingNote) { saveNote(); editingNote = null }
    else { fullscreen = false; onClose() }
  }

  function handleBack() {
    if (editingNote) { saveNote(); editingNote = null }
    else { fullscreen = false; onClose() }
  }
</script>

{#if open}
<div
  class="fixed inset-0 z-[55] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/40"
  transition:fade={{ duration: 200 }}
  role="presentation"
  onclick={handleBackdropClick}
>
  <!-- Sheet -->
  <div
    class="relative flex w-full max-w-lg flex-col bg-white shadow-2xl overflow-hidden transition-all duration-300
      {fullscreen ? 'h-dvh max-h-dvh rounded-t-3xl sm:rounded-3xl' : 'max-h-[94vh] rounded-t-3xl sm:rounded-3xl'}"
    transition:fly={{ y: 300, duration: 300 }}
    role="dialog"
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Handle -->
    {#if !fullscreen}
      <div class="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
        <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
      </div>
    {/if}

    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
      {#if editingNote}
        <button onclick={handleBack} class="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
          <ChevronLeft size={20} />
        </button>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Catatan</p>
          <p class="text-[10px] {isSaving ? 'text-orange-400' : 'text-slate-300'} font-bold transition-colors">
            {isSaving ? 'Menyimpan...' : 'Tersimpan otomatis'}
          </p>
        </div>
        <!-- Color picker -->
        <div class="flex items-center gap-1.5">
          {#each Object.entries(COLORS) as [key, val]}
            <button
              onclick={() => { if (editingNote) { editingNote.color = key; handleInput() } }}
              class="w-4 h-4 rounded-full {val.dot} cursor-pointer transition-transform
                {editingNote.color === key ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : 'opacity-40 hover:opacity-70'}"
            ></button>
          {/each}
        </div>
        <button onclick={() => fullscreen = !fullscreen}
          class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-400">
          {#if fullscreen}<Minimize2 size={18} />{:else}<Maximize2 size={18} />{/if}
        </button>
        <button onclick={() => togglePin(editingNote!)}
          class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer {editingNote.is_pinned ? 'text-orange-500' : 'text-slate-400'}">
          {#if editingNote.is_pinned}<PinOff size={18} />{:else}<Pin size={18} />{/if}
        </button>
        <button onclick={() => deleteTargetId = editingNote!.id}
          class="p-2 rounded-2xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
          <Trash2 size={18} />
        </button>
      {:else}
        <button onclick={onClose} class="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-400 cursor-pointer">
          <X size={20} />
        </button>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-black text-slate-800">Catatan Pribadi</h2>
          <p class="text-xs text-slate-400 font-bold">{filteredNotes.length} catatan</p>
        </div>
        <button onclick={() => fullscreen = !fullscreen}
          class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-400">
          {#if fullscreen}<Minimize2 size={18} />{:else}<Maximize2 size={18} />{/if}
        </button>
        <button onclick={createNote}
          class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 border-b-[4px] border-orange-700 bg-orange-500 text-white text-xs font-black shadow-sm hover:bg-orange-600 transition-all active:translate-y-0.5 cursor-pointer">
          <Plus size={14} />
          Baru
        </button>
      {/if}
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto overscroll-contain">
      {#if editingNote}
        <div class="flex flex-col px-5 py-4 gap-3">
          <input
            bind:value={editingNote.title}
            oninput={handleInput}
            placeholder="Judul catatan..."
            class="w-full text-xl font-black text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300 placeholder:font-bold"
          />
          <div class="w-full h-px bg-slate-100"></div>

          {#if checklistMode}
            <!-- Checklist -->
            <div class="flex flex-col gap-0.5 pb-4">
              {#each editingNote.content.split('\n') as line, i}
                {#if line.startsWith('[ ] ') || line.startsWith('[x] ')}
                  {@const checked = line.startsWith('[x] ')}
                  <button onclick={() => toggleCheckItem(i)} class="flex items-start gap-3 text-left py-2 cursor-pointer">
                    <span class="mt-0.5 flex-shrink-0 {checked ? 'text-green-500' : 'text-slate-300'}">
                      {#if checked}<CheckSquare size={18} />{:else}<Square size={18} />{/if}
                    </span>
                    <span class="text-sm leading-relaxed {checked ? 'line-through text-slate-400' : 'text-slate-700'}">{line.slice(4)}</span>
                  </button>
                {/if}
              {/each}
              {#if editingNote.content.includes('[x] ')}
                <button onclick={clearCompleted}
                  class="flex items-center gap-1.5 mt-3 text-xs font-black text-slate-400 hover:text-red-400 transition-colors cursor-pointer self-start">
                  <CheckCheck size={13} />
                  Bersihkan yang selesai
                </button>
              {/if}
              <div class="flex items-center gap-3 mt-2 pt-2 border-t border-dashed border-slate-100">
                <span class="text-slate-200 flex-shrink-0"><Plus size={15} /></span>
                <input
                  bind:value={newItemText}
                  placeholder="Tambah item baru..."
                  onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
                  class="text-sm text-slate-600 bg-transparent outline-none flex-1 placeholder:text-slate-300"
                />
                {#if newItemText.trim()}
                  <button onclick={addCheckItem} class="text-xs font-black text-orange-500 cursor-pointer px-1">Tambah</button>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Rich text editor -->
            <div
              bind:this={editorRef}
              contenteditable="true"
              oninput={handleEditorInput}
              onkeyup={refreshFmt}
              onmouseup={refreshFmt}
              onkeydown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); execFormat(e as any, 'bold') }
                if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); execFormat(e as any, 'italic') }
                if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); execFormat(e as any, 'underline') }
              }}
              class="w-full text-sm text-slate-700 bg-transparent outline-none leading-relaxed min-h-[40vh] pb-4
                [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-slate-800 [&_h2]:my-1
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                [&_li]:my-0.5
                empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"
              data-placeholder="Tulis catatanmu di sini..."
              role="textbox"
              aria-multiline="true"
            ></div>
          {/if}
        </div>

      {:else}
        <!-- Search -->
        {#if notes.length > 2}
          <div class="px-4 pt-3 pb-1">
            <div class="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5">
              <Search size={14} class="text-slate-400 flex-shrink-0" />
              <input bind:value={searchQuery} placeholder="Cari catatan..."
                class="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400" />
              {#if searchQuery}
                <button onclick={() => searchQuery = ''} class="text-slate-400 cursor-pointer"><X size={14} /></button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- List -->
        {#if isLoading}
          <div class="flex items-center justify-center py-16">
            <div class="w-6 h-6 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        {:else if notes.length === 0}
          <div class="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
            <div class="w-16 h-16 rounded-3xl bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center text-3xl">📝</div>
            <div>
              <p class="font-black text-slate-700 text-base">Belum ada catatan</p>
              <p class="text-sm text-slate-400 mt-1">Tap <span class="font-black text-orange-500">Baru</span> untuk mulai menulis</p>
            </div>
          </div>
        {:else if filteredNotes.length === 0}
          <div class="flex flex-col items-center justify-center py-16 gap-3 text-center px-8">
            <Search size={32} class="text-slate-200" />
            <p class="text-sm font-bold text-slate-400">Tidak ditemukan untuk "<span class="text-slate-600">{searchQuery}</span>"</p>
          </div>
        {:else}
          <div class="p-4 grid grid-cols-2 gap-3">
            {#each filteredNotes as note (note.id)}
              {@const c = COLORS[note.color] ?? COLORS.yellow}
              <div class="relative">
                <button
                  onclick={() => { if (longPressId === note.id) { longPressId = null; return } openNote(note) }}
                  ontouchstart={() => handleLongPressStart(note.id)}
                  ontouchend={handleLongPressEnd}
                  ontouchcancel={handleLongPressEnd}
                  oncontextmenu={(e) => { e.preventDefault(); longPressId = note.id }}
                  class="w-full text-left p-4 rounded-[20px] border-2 border-b-[5px] {c.bg} {c.border} flex flex-col gap-2 min-h-[130px] hover:shadow-sm transition-all active:translate-y-0.5 active:border-b-[2px] cursor-pointer"
                >
                  {#if note.is_pinned}
                    <span class="absolute top-3 right-3 text-orange-400"><Pin size={11} /></span>
                  {/if}
                  <p class="text-sm font-black text-slate-800 line-clamp-2 pr-4 leading-snug">
                    {note.title || 'Tanpa judul'}
                  </p>
                  {#if note.content}
                    <p class="text-xs text-slate-500 line-clamp-3 flex-1 leading-relaxed">{notePreview(note.content)}</p>
                  {/if}
                  <p class="text-[10px] font-bold text-slate-400 mt-auto">{formatDate(note.updated_at)}</p>
                </button>

                {#if longPressId === note.id}
                  <div class="absolute inset-0 rounded-[20px] bg-black/40 grid grid-cols-2 gap-1.5 z-10 backdrop-blur-[2px] p-2"
                    transition:fade={{ duration: 120 }}>
                    <button onclick={() => { togglePin(note); longPressId = null }}
                      class="flex flex-col items-center justify-center gap-1 py-2 bg-white rounded-xl shadow cursor-pointer">
                      <span class="{note.is_pinned ? 'text-orange-500' : 'text-slate-500'}">
                        {#if note.is_pinned}<PinOff size={14} />{:else}<Pin size={14} />{/if}
                      </span>
                      <span class="text-[9px] font-black text-slate-600">{note.is_pinned ? 'Lepas' : 'Sematkan'}</span>
                    </button>
                    <button onclick={() => duplicateNote(note)}
                      class="flex flex-col items-center justify-center gap-1 py-2 bg-white rounded-xl shadow cursor-pointer">
                      <Copy size={14} class="text-slate-500" />
                      <span class="text-[9px] font-black text-slate-600">Duplikat</span>
                    </button>
                    <button onclick={() => { deleteTargetId = note.id; longPressId = null }}
                      class="flex flex-col items-center justify-center gap-1 py-2 bg-white rounded-xl shadow cursor-pointer">
                      <Trash2 size={14} class="text-red-500" />
                      <span class="text-[9px] font-black text-red-500">Hapus</span>
                    </button>
                    <button onclick={() => longPressId = null}
                      class="flex flex-col items-center justify-center gap-1 py-2 bg-white/70 rounded-xl cursor-pointer">
                      <X size={14} class="text-slate-400" />
                      <span class="text-[9px] font-black text-slate-400">Batal</span>
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Delete modal -->
    {#if deleteTargetId}
      <div class="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6"
        transition:fade={{ duration: 150 }} onclick={() => deleteTargetId = null} role="presentation">
        <div class="w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden"
          onclick={(e) => e.stopPropagation()} transition:fly={{ y: 20, duration: 200 }}>
          <div class="flex justify-center pt-6 pb-3">
            <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <Trash2 size={26} class="text-red-500" />
            </div>
          </div>
          <div class="px-6 pb-2 text-center">
            <p class="font-black text-slate-800 text-base">Hapus catatan?</p>
            <p class="text-sm text-slate-400 mt-1 line-clamp-2">"{deleteTargetNote?.title || 'Tanpa judul'}"</p>
            <p class="text-xs text-slate-400 mt-2">Catatan yang dihapus tidak bisa dikembalikan.</p>
          </div>
          <div class="flex gap-3 px-6 py-5">
            <button onclick={() => deleteTargetId = null}
              class="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-colors cursor-pointer">
              Batal
            </button>
            <button onclick={() => deleteNote(deleteTargetId!)}
              class="flex-1 py-3 rounded-2xl border-2 border-b-[4px] border-red-700 bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all active:translate-y-0.5 active:border-b-[2px] cursor-pointer">
              Hapus
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Formatting toolbar (editor only) -->
    {#if editingNote}
      <div class="flex-shrink-0 border-t border-slate-100 bg-white">
        <!-- Scrollable format row -->
        <div class="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto scrollbar-none">

          <!-- Undo / Redo -->
          <button onmousedown={(e) => execFormat(e, 'undo')}
            class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0">
            <Undo2 size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'redo')}
            class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0">
            <Redo2 size={17} />
          </button>

          <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

          <!-- Bold / Italic / Underline / Strike -->
          <button onmousedown={(e) => execFormat(e, 'bold')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.bold ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <Bold size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'italic')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.italic ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <Italic size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'underline')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.underline ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <Underline size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'strikeThrough')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.strike ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <Strikethrough size={17} />
          </button>

          <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

          <!-- Heading -->
          <button onmousedown={toggleHeading}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.h2 ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <Heading2 size={17} />
          </button>

          <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

          <!-- Alignment -->
          <button onmousedown={(e) => execFormat(e, 'justifyLeft')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.left ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <AlignLeft size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'justifyCenter')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.center ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <AlignCenter size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'justifyRight')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.right ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <AlignRight size={17} />
          </button>

          <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

          <!-- Lists -->
          <button onmousedown={(e) => execFormat(e, 'insertUnorderedList')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.ul ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <List size={17} />
          </button>
          <button onmousedown={(e) => execFormat(e, 'insertOrderedList')}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {fmt.ol ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <ListOrdered size={17} />
          </button>

          <div class="w-px h-5 bg-slate-200 mx-1 flex-shrink-0"></div>

          <!-- Checklist mode -->
          <button onclick={toggleChecklistMode}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {checklistMode ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-100'}">
            <ListChecks size={17} />
          </button>

          <!-- Share -->
          <button onclick={shareNote}
            class="p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 {copied ? 'text-green-500 bg-green-50' : 'text-slate-500 hover:bg-slate-100'}">
            {#if copied}<CheckCheck size={17} />{:else}<Share2 size={17} />{/if}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
{/if}
