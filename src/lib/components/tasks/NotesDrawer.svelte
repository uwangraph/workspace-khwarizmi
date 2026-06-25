<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { fly, fade } from 'svelte/transition'
  import { Pin, PinOff, Plus, Trash2, X, ChevronLeft, Search, CheckSquare, Square, ListChecks, Maximize2, Minimize2, Undo2, Redo2 } from 'lucide-svelte'

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

  let notes         = $state<Note[]>([])
  let isLoading     = $state(false)
  let editingNote   = $state<Note | null>(null)
  let isSaving      = $state(false)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let searchQuery   = $state('')
  let checklistMode = $state(false)
  let longPressId   = $state<string | null>(null)
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let newItemText   = $state('')
  let fullscreen      = $state(false)
  let confirmDelete   = $state(false)

  // Undo/redo history
  let history      = $state<{ title: string; content: string }[]>([])
  let historyIndex = $state(-1)
  let historyTimeout: ReturnType<typeof setTimeout> | null = null

  let canUndo = $derived(historyIndex > 0)
  let canRedo = $derived(historyIndex < history.length - 1)

  let filteredNotes = $derived(
    searchQuery.trim()
      ? notes.filter(n =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : notes
  )

  let charCount = $derived(editingNote?.content.length ?? 0)

  $effect(() => {
    if (open && userId) loadNotes()
  })

  $effect(() => {
    if (editingNote) {
      checklistMode = isChecklistContent(editingNote.content)
    }
  })

  function isChecklistContent(content: string) {
    if (!content.trim()) return false
    return content.split('\n').every(line => !line.trim() || line.startsWith('[ ] ') || line.startsWith('[x] '))
  }

  function autoResize(node: HTMLTextAreaElement) {
    function resize() {
      node.style.height = 'auto'
      node.style.height = node.scrollHeight + 'px'
    }
    resize()
    node.addEventListener('input', resize)
    return { destroy() { node.removeEventListener('input', resize) } }
  }

  function pushHistory() {
    if (!editingNote) return
    // Drop redo branch
    const trimmed = history.slice(0, historyIndex + 1)
    const snapshot = { title: editingNote.title, content: editingNote.content }
    history = [...trimmed, snapshot]
    historyIndex = history.length - 1
  }

  function undo() {
    if (!canUndo || !editingNote) return
    historyIndex--
    editingNote.title = history[historyIndex].title
    editingNote.content = history[historyIndex].content
    checklistMode = isChecklistContent(editingNote.content)
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveNote(), 800)
  }

  function redo() {
    if (!canRedo || !editingNote) return
    historyIndex++
    editingNote.title = history[historyIndex].title
    editingNote.content = history[historyIndex].content
    checklistMode = isChecklistContent(editingNote.content)
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveNote(), 800)
  }

  async function loadNotes() {
    isLoading = true
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    notes = (data as Note[]) ?? []
    isLoading = false
  }

  async function createNote() {
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: userId, title: '', content: '', color: 'yellow' })
      .select()
      .single()
    if (data) {
      notes = [data as Note, ...notes]
      editingNote = data as Note
      searchQuery = ''
      history = [{ title: '', content: '' }]
      historyIndex = 0
    }
  }

  function openNote(note: Note) {
    editingNote = { ...note }
    history = [{ title: note.title, content: note.content }]
    historyIndex = 0
    confirmDelete = false
  }

  function handleInput() {
    if (!editingNote) return
    // Debounce save
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveNote(), 800)
    // Debounce history push
    if (historyTimeout) clearTimeout(historyTimeout)
    historyTimeout = setTimeout(() => pushHistory(), 1000)
  }

  async function saveNote() {
    if (!editingNote) return
    const note = { ...editingNote }
    isSaving = true
    await supabase
      .from('notes')
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
    if (historyTimeout) { clearTimeout(historyTimeout); historyTimeout = null }
    await supabase.from('notes').delete().eq('id', id)
    notes = notes.filter(n => n.id !== id)
    if (editingNote?.id === id) editingNote = null
    confirmDelete = false
    longPressId = null
  }

  function toggleChecklistMode() {
    if (!editingNote) return
    if (checklistMode) {
      editingNote.content = editingNote.content
        .split('\n')
        .map(line => line.replace(/^\[[ x]\] /, ''))
        .join('\n')
      checklistMode = false
    } else {
      editingNote.content = editingNote.content
        .split('\n')
        .map(line => line.trim() ? `[ ] ${line}` : line)
        .join('\n')
      checklistMode = true
    }
    pushHistory()
    handleInput()
  }

  function toggleCheckItem(lineIndex: number) {
    if (!editingNote) return
    const lines = editingNote.content.split('\n')
    const line = lines[lineIndex]
    if (line.startsWith('[x] ')) lines[lineIndex] = '[ ] ' + line.slice(4)
    else if (line.startsWith('[ ] ')) lines[lineIndex] = '[x] ' + line.slice(4)
    editingNote.content = lines.join('\n')
    pushHistory()
    handleInput()
  }

  function addCheckItem() {
    if (!editingNote || !newItemText.trim()) return
    const sep = editingNote.content ? '\n' : ''
    editingNote.content += sep + '[ ] ' + newItemText.trim()
    newItemText = ''
    pushHistory()
    handleInput()
  }

  function handleLongPressStart(id: string) {
    longPressTimer = setTimeout(() => { longPressId = id }, 500)
  }

  function handleLongPressEnd() {
    if (longPressTimer) clearTimeout(longPressTimer)
    longPressTimer = null
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'Baru saja'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target !== e.currentTarget) return
    if (longPressId) { longPressId = null; return }
    if (editingNote) { saveNote(); editingNote = null }
    else { fullscreen = false; onClose() }
  }

  function handleBack() {
    if (editingNote) { saveNote(); editingNote = null; confirmDelete = false }
    else { fullscreen = false; onClose() }
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[55] flex items-end justify-center p-0 sm:items-center sm:p-4"
    transition:fade={{ duration: 200 }}
    role="presentation"
    onclick={handleBackdropClick}
  >
    <!-- Sheet -->
    <div
      class="relative flex w-full max-w-lg flex-col bg-white shadow-2xl overflow-hidden transition-all duration-300
        {fullscreen ? 'h-dvh max-h-dvh rounded-none' : 'max-h-[94vh] rounded-t-3xl sm:rounded-3xl'}"
      transition:fly={{ y: 300, duration: 300 }}
      role="dialog"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Handle (hidden in fullscreen) -->
      {#if !fullscreen}
        <div class="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
          <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
        </div>
      {/if}

      <!-- Header -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        {#if editingNote}
          <!-- Editor header: back | title+status | fullscreen | pin | delete -->
          <button onclick={handleBack} class="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
            <ChevronLeft size={20} />
          </button>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Catatan</p>
            <p class="text-[10px] {isSaving ? 'text-orange-400' : 'text-slate-300'} font-bold transition-colors">
              {isSaving ? 'Menyimpan...' : 'Tersimpan otomatis'}
            </p>
          </div>
          <button
            onclick={() => fullscreen = !fullscreen}
            class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-400"
          >
            {#if fullscreen}<Minimize2 size={18} />{:else}<Maximize2 size={18} />{/if}
          </button>
          <button
            onclick={() => togglePin(editingNote!)}
            class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer {editingNote.is_pinned ? 'text-orange-500' : 'text-slate-400'}"
          >
            {#if editingNote.is_pinned}<PinOff size={18} />{:else}<Pin size={18} />{/if}
          </button>
          {#if confirmDelete}
            <div class="flex items-center gap-1" transition:fade={{ duration: 100 }}>
              <button
                onclick={() => deleteNote(editingNote!.id)}
                class="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-black cursor-pointer hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
              <button
                onclick={() => confirmDelete = false}
                class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-black cursor-pointer hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
            </div>
          {:else}
            <button
              onclick={() => confirmDelete = true}
              class="p-2 rounded-2xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
          {/if}
        {:else}
          <!-- List header: close | title+count | fullscreen | new -->
          <button onclick={onClose} class="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-400 cursor-pointer">
            <X size={20} />
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-base font-black text-slate-800">Catatan Pribadi</h2>
            <p class="text-xs text-slate-400 font-bold">{filteredNotes.length} catatan</p>
          </div>
          <button
            onclick={() => fullscreen = !fullscreen}
            class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-400"
          >
            {#if fullscreen}<Minimize2 size={18} />{:else}<Maximize2 size={18} />{/if}
          </button>
          <button
            onclick={createNote}
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 border-b-[4px] border-orange-700 bg-orange-500 text-white text-xs font-black shadow-sm hover:bg-orange-600 transition-all active:translate-y-0.5 cursor-pointer"
          >
            <Plus size={14} />
            Baru
          </button>
        {/if}
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto overscroll-contain">
        {#if editingNote}
          <!-- Editor -->
          <div class="flex flex-col px-5 py-4 gap-3">
            <input
              bind:value={editingNote.title}
              oninput={handleInput}
              placeholder="Judul catatan..."
              class="w-full text-xl font-black text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300 placeholder:font-bold"
            />
            <div class="w-full h-px bg-slate-100"></div>

            {#if checklistMode}
              <!-- Checklist view -->
              <div class="flex flex-col gap-0.5 pb-4">
                {#each editingNote.content.split('\n') as line, i}
                  {#if line.startsWith('[ ] ') || line.startsWith('[x] ')}
                    {@const checked = line.startsWith('[x] ')}
                    <button
                      onclick={() => toggleCheckItem(i)}
                      class="flex items-start gap-3 text-left py-2 cursor-pointer group"
                    >
                      <span class="mt-0.5 flex-shrink-0 transition-colors {checked ? 'text-green-500' : 'text-slate-300'}">
                        {#if checked}<CheckSquare size={18} />{:else}<Square size={18} />{/if}
                      </span>
                      <span class="text-sm leading-relaxed transition-all {checked ? 'line-through text-slate-400' : 'text-slate-700'}">{line.slice(4)}</span>
                    </button>
                  {/if}
                {/each}
                <!-- Add new item -->
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
              <!-- Plain textarea -->
              <div class="relative pb-4">
                <textarea
                  bind:value={editingNote.content}
                  oninput={handleInput}
                  use:autoResize
                  placeholder="Tulis catatanmu di sini..."
                  class="w-full text-sm text-slate-700 bg-transparent border-none outline-none resize-none leading-relaxed placeholder:text-slate-300 min-h-[40vh]"
                ></textarea>
                {#if charCount > 0}
                  <p class="text-[10px] text-slate-300 font-bold text-right">{charCount} karakter</p>
                {/if}
              </div>
            {/if}
          </div>

        {:else}
          <!-- Search bar -->
          {#if notes.length > 2}
            <div class="px-4 pt-3 pb-1">
              <div class="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5">
                <Search size={14} class="text-slate-400 flex-shrink-0" />
                <input
                  bind:value={searchQuery}
                  placeholder="Cari catatan..."
                  class="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
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
                      <span class="absolute top-3 right-3 text-orange-400">
                        <Pin size={11} />
                      </span>
                    {/if}
                    <p class="text-sm font-black text-slate-800 line-clamp-2 pr-4 leading-snug">
                      {note.title || 'Tanpa judul'}
                    </p>
                    {#if note.content}
                      <p class="text-xs text-slate-500 line-clamp-3 flex-1 leading-relaxed">
                        {isChecklistContent(note.content)
                          ? note.content.split('\n').filter(l => l.trim()).map(l => (l.startsWith('[x] ') ? '✓ ' : '○ ') + l.slice(4)).join('  ·  ')
                          : note.content}
                      </p>
                    {/if}
                    <p class="text-[10px] font-bold text-slate-400 mt-auto">{formatDate(note.updated_at)}</p>
                  </button>

                  <!-- Long press quick actions -->
                  {#if longPressId === note.id}
                    <div
                      class="absolute inset-0 rounded-[20px] bg-black/30 flex items-center justify-center gap-3 z-10 backdrop-blur-[1px]"
                      transition:fade={{ duration: 120 }}
                    >
                      <button
                        onclick={() => { togglePin(note); longPressId = null }}
                        class="flex flex-col items-center gap-1 p-3 bg-white rounded-2xl shadow-lg cursor-pointer"
                      >
                        <span class="{note.is_pinned ? 'text-orange-500' : 'text-slate-500'}">
                          {#if note.is_pinned}<PinOff size={18} />{:else}<Pin size={18} />{/if}
                        </span>
                        <span class="text-[9px] font-black text-slate-500">{note.is_pinned ? 'Lepas' : 'Sematkan'}</span>
                      </button>
                      <button
                        onclick={() => deleteNote(note.id)}
                        class="flex flex-col items-center gap-1 p-3 bg-white rounded-2xl shadow-lg cursor-pointer"
                      >
                        <Trash2 size={18} class="text-red-500" />
                        <span class="text-[9px] font-black text-red-500">Hapus</span>
                      </button>
                      <button
                        onclick={() => longPressId = null}
                        class="flex flex-col items-center gap-1 p-3 bg-white rounded-2xl shadow-lg cursor-pointer"
                      >
                        <X size={18} class="text-slate-400" />
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

      <!-- Bottom toolbar (editor only) -->
      {#if editingNote}
        <div class="flex-shrink-0 border-t border-slate-100 px-4 py-2 flex items-center gap-1 bg-white">
          <!-- Undo / Redo -->
          <button
            onclick={undo}
            disabled={!canUndo}
            class="p-2 rounded-xl transition-colors cursor-pointer {canUndo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200 cursor-not-allowed'}"
          >
            <Undo2 size={17} />
          </button>
          <button
            onclick={redo}
            disabled={!canRedo}
            class="p-2 rounded-xl transition-colors cursor-pointer {canRedo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200 cursor-not-allowed'}"
          >
            <Redo2 size={17} />
          </button>

          <!-- Divider -->
          <div class="w-px h-5 bg-slate-150 mx-1 bg-slate-200"></div>

          <!-- Checklist toggle -->
          <button
            onclick={toggleChecklistMode}
            class="p-2 rounded-xl transition-colors cursor-pointer {checklistMode ? 'text-green-500 bg-green-50' : 'text-slate-400 hover:bg-slate-100'}"
          >
            <ListChecks size={17} />
          </button>

          <!-- Divider -->
          <div class="w-px h-5 bg-slate-200 mx-1"></div>

          <!-- Color picker -->
          <div class="flex items-center gap-2 flex-1 justify-end">
            {#each Object.entries(COLORS) as [key, val]}
              <button
                onclick={() => { if (editingNote) { editingNote.color = key; handleInput() } }}
                class="w-5 h-5 rounded-full {val.dot} cursor-pointer transition-transform
                  {editingNote.color === key ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : 'opacity-40 hover:opacity-70'}"
              ></button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
