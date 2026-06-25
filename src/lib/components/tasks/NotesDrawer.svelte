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

  const COLORS: Record<string, { bg: string; border: string; dot: string; activeBorder: string }> = {
    yellow: { bg: 'bg-yellow-50',  border: 'border-yellow-200', dot: 'bg-yellow-400', activeBorder: 'border-yellow-400' },
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400',   activeBorder: 'border-blue-400'   },
    green:  { bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-400',  activeBorder: 'border-green-400'  },
    pink:   { bg: 'bg-pink-50',    border: 'border-pink-200',   dot: 'bg-pink-400',   activeBorder: 'border-pink-400'   },
    purple: { bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-400', activeBorder: 'border-purple-400' },
    slate:  { bg: 'bg-slate-50',   border: 'border-slate-200',  dot: 'bg-slate-400',  activeBorder: 'border-slate-400'  },
  }

  let notes       = $state<Note[]>([])
  let isLoading   = $state(false)
  let editingNote = $state<Note | null>(null)
  let isSaving    = $state(false)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null

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
    notes = notes
      .map(n => n.id === note.id ? { ...n, is_pinned: newVal } : n)
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
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'Baru saja'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target !== e.currentTarget) return
    if (editingNote) { saveNote(); editingNote = null }
    else onClose()
  }

  function handleBack() {
    if (editingNote) { saveNote(); editingNote = null }
    else onClose()
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
      class="relative flex max-h-[94vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl overflow-hidden"
      transition:fly={{ y: 300, duration: 300 }}
      role="dialog"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
        <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
      </div>

      <!-- Header -->
      <div class="flex items-center gap-3 px-6 py-4 border-b border-slate-100 flex-shrink-0">
        {#if editingNote}
          <button onclick={handleBack} class="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer -ml-1">
            <ChevronLeft size={20} />
          </button>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Catatan Pribadi</p>
            <p class="text-[10px] {isSaving ? 'text-orange-400' : 'text-slate-300'} font-bold transition-colors">
              {isSaving ? 'Menyimpan...' : 'Tersimpan otomatis'}
            </p>
          </div>
          <!-- Color picker -->
          <div class="flex items-center gap-2">
            {#each Object.entries(COLORS) as [key, val]}
              <button
                onclick={() => { if (editingNote) { editingNote.color = key; handleInput() } }}
                class="w-5 h-5 rounded-full {val.dot} cursor-pointer transition-transform {editingNote.color === key ? 'scale-125 ring-2 ring-offset-1 ring-slate-300' : 'opacity-50 hover:opacity-80'}"
              ></button>
            {/each}
          </div>
          <button
            onclick={() => togglePin(editingNote!)}
            class="p-2 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer {editingNote.is_pinned ? 'text-orange-500' : 'text-slate-400'}"
          >
            {#if editingNote.is_pinned}<PinOff size={18} />{:else}<Pin size={18} />{/if}
          </button>
          <button
            onclick={() => deleteNote(editingNote!.id)}
            class="p-2 rounded-2xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        {:else}
          <button onclick={onClose} class="p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-400 cursor-pointer -ml-1">
            <X size={20} />
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-base font-black text-slate-800">Catatan Pribadi</h2>
            <p class="text-xs text-slate-400 font-bold">{notes.length} catatan</p>
          </div>
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
          <div class="flex flex-col px-6 py-5 gap-3 min-h-[60vh]">
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
              class="w-full text-sm text-slate-700 bg-transparent border-none outline-none resize-none leading-relaxed placeholder:text-slate-300 min-h-[50vh]"
            ></textarea>
          </div>
        {:else}
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
          {:else}
            <div class="p-4 grid grid-cols-2 gap-3">
              {#each notes as note (note.id)}
                {@const c = COLORS[note.color] ?? COLORS.yellow}
                <button
                  onclick={() => openNote(note)}
                  class="text-left p-4 rounded-[20px] border-2 border-b-[5px] {c.bg} {c.border} flex flex-col gap-2 min-h-[130px] hover:shadow-sm transition-all active:translate-y-0.5 active:border-b-[2px] cursor-pointer relative"
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
                    <p class="text-xs text-slate-500 line-clamp-3 flex-1 leading-relaxed">{note.content}</p>
                  {/if}
                  <p class="text-[10px] font-bold text-slate-400 mt-auto">{formatDate(note.updated_at)}</p>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}
