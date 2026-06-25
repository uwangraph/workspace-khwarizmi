<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { fly, fade } from 'svelte/transition'
  import { Pin, PinOff, Plus, Trash2, X, ChevronLeft } from 'lucide-svelte'

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

  let notes       = $state<Note[]>([])
  let isLoading   = $state(false)
  let editingNote = $state<Note | null>(null)
  let isSaving    = $state(false)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  // Load catatan saat drawer dibuka
  $effect(() => {
    if (open && userId) loadNotes()
  })

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
    }
  }

  function openNote(note: Note) {
    editingNote = { ...note }
  }

  function handleInput() {
    if (!editingNote) return
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => saveNote(), 800)
  }

  async function saveNote() {
    if (!editingNote) return
    isSaving = true
    await supabase
      .from('notes')
      .update({ title: editingNote.title, content: editingNote.content, color: editingNote.color })
      .eq('id', editingNote.id)
    notes = notes.map(n => n.id === editingNote!.id ? { ...n, ...editingNote! } : n)
    isSaving = false
  }

  async function togglePin(note: Note) {
    const newVal = !note.is_pinned
    await supabase.from('notes').update({ is_pinned: newVal }).eq('id', note.id)
    notes = notes.map(n => n.id === note.id ? { ...n, is_pinned: newVal } : n)
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
    if (editingNote?.id === note.id) editingNote = { ...editingNote, is_pinned: newVal }
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    notes = notes.filter(n => n.id !== id)
    if (editingNote?.id === id) editingNote = null
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Baru saja'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      if (editingNote) { saveNote(); editingNote = null } else onClose()
    }
  }

  function handleBack() {
    if (editingNote) { saveNote(); editingNote = null }
    else onClose()
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    role="presentation"
    onclick={handleBackdropClick}
  ></div>

  <!-- Drawer -->
  <div
    class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col"
    style="max-height: 92dvh; height: 92dvh;"
    transition:fly={{ y: 400, duration: 320 }}
  >
    <!-- Handle -->
    <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
      <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
    </div>

    <!-- Header -->
    <div class="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-shrink-0">
      {#if editingNote}
        <button onclick={handleBack} class="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
          <ChevronLeft size={20} />
        </button>
        <div class="flex-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Catatan</p>
          {#if isSaving}
            <p class="text-[10px] text-slate-400">Menyimpan...</p>
          {:else}
            <p class="text-[10px] text-slate-400">Tersimpan otomatis</p>
          {/if}
        </div>
        <!-- Color picker -->
        <div class="flex items-center gap-1.5">
          {#each Object.entries(COLORS) as [key, val]}
            <button
              onclick={() => { if (editingNote) { editingNote.color = key; handleInput() } }}
              class="w-5 h-5 rounded-full {val.dot} transition-transform {editingNote.color === key ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'opacity-60 hover:opacity-100'} cursor-pointer"
            ></button>
          {/each}
        </div>
        <button onclick={() => deleteNote(editingNote!.id)} class="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
          <Trash2 size={18} />
        </button>
        <button onclick={() => togglePin(editingNote!)} class="p-1.5 rounded-xl hover:bg-slate-100 transition-colors {editingNote.is_pinned ? 'text-orange-500' : 'text-slate-400'} cursor-pointer">
          {#if editingNote.is_pinned}<PinOff size={18} />{:else}<Pin size={18} />{/if}
        </button>
      {:else}
        <button onclick={onClose} class="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
          <X size={20} />
        </button>
        <div class="flex-1">
          <h2 class="text-base font-black text-slate-800">Catatan</h2>
          <p class="text-xs text-slate-400">{notes.length} catatan pribadi</p>
        </div>
        <button
          onclick={createNote}
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-orange-500 text-white text-xs font-black shadow-md hover:bg-orange-600 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={15} />
          Baru
        </button>
      {/if}
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto overscroll-contain">
      {#if editingNote}
        <!-- Note Editor -->
        <div class="flex flex-col h-full p-4 gap-3">
          <input
            bind:value={editingNote.title}
            oninput={handleInput}
            placeholder="Judul catatan..."
            class="w-full text-xl font-black text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300 placeholder:font-bold"
          />
          <div class="w-full h-px bg-slate-100"></div>
          <textarea
            bind:value={editingNote.content}
            oninput={handleInput}
            placeholder="Tulis catatanmu di sini..."
            class="flex-1 w-full text-sm text-slate-700 bg-transparent border-none outline-none resize-none leading-relaxed placeholder:text-slate-300 min-h-[60dvh]"
          ></textarea>
        </div>
      {:else}
        <!-- Notes List -->
        {#if isLoading}
          <div class="flex items-center justify-center py-16 text-slate-400 text-sm">Memuat...</div>
        {:else if notes.length === 0}
          <div class="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
            <div class="w-16 h-16 rounded-3xl bg-yellow-50 flex items-center justify-center text-3xl">📝</div>
            <p class="font-black text-slate-700">Belum ada catatan</p>
            <p class="text-sm text-slate-400">Tap tombol <span class="font-bold text-orange-500">Baru</span> untuk mulai menulis</p>
          </div>
        {:else}
          <div class="p-4 grid grid-cols-2 gap-3">
            {#each notes as note (note.id)}
              {@const c = COLORS[note.color] ?? COLORS.yellow}
              <button
                onclick={() => openNote(note)}
                class="text-left p-4 rounded-2xl border-2 {c.bg} {c.border} flex flex-col gap-2 min-h-[120px] hover:shadow-md transition-all active:scale-95 cursor-pointer relative"
              >
                {#if note.is_pinned}
                  <div class="absolute top-2.5 right-2.5 text-orange-400">
                    <Pin size={12} />
                  </div>
                {/if}
                <p class="text-sm font-black text-slate-800 line-clamp-2 pr-4">
                  {note.title || 'Tanpa judul'}
                </p>
                {#if note.content}
                  <p class="text-xs text-slate-500 line-clamp-3 flex-1">{note.content}</p>
                {/if}
                <p class="text-[10px] text-slate-400 mt-auto">{formatDate(note.updated_at)}</p>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
