<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { X, ArrowLeft, Camera, Plus, UserMinus, UserPlus, Calendar, ShieldCheck, Hash, ImageIcon, FileText, ExternalLink, Play, Pause, Mic, Download } from 'lucide-svelte'
  import type { ChatRoom, Profile } from '$lib/type'
  import { chatService } from '$lib/services/chatService'
  import { supabase } from '$lib/supabase'
  import toast from 'svelte-french-toast'

  let {
    show = $bindable(false),
    room,
    currentUser,
    allProfiles = [],
    messages = [],
    chatImages = [],
    chatFiles = [],
    onImagePreview,
    onUpdateRoom
  }: {
    show: boolean,
    room: any,
    currentUser: any,
    allProfiles: Profile[],
    messages: any[],
    chatImages: any[],
    chatFiles: any[],
    onImagePreview: (url: string) => void,
    onUpdateRoom: (updated: any) => void
  } = $props()

  let isEditing = $state(false)
  let editedName = $state(room?.name || '')
  let editedDesc = $state(room?.description || '')
  let isSaving = $state(false)
  let showAddMember = $state(false)
  let searchUserQuery = $state('')
  let avatarInputRef = $state<HTMLInputElement | null>(null)
  let activeTab = $state<'media' | 'docs' | 'links'>('media')
  let previewImageUrl = $state<string | null>(null)
  let playingAudioId = $state<string | null>(null)
  let audioPlayerEl = $state<HTMLAudioElement | null>(null)

  function toggleAudio(id: string, url: string) {
    if (playingAudioId === id) {
      audioPlayerEl?.pause()
      playingAudioId = null
    } else {
      if (audioPlayerEl) audioPlayerEl.pause()
      playingAudioId = id
      // The audio element with bind:src will auto-play via autoplay attr
    }
  }

  let filteredUsers = $derived(
    searchUserQuery.trim() === '' 
      ? [] 
      : allProfiles.filter(p => 
          !room.participants.some((m: any) => m.id === p.id) &&
          p.full_name.toLowerCase().includes(searchUserQuery.toLowerCase())
        )
  )

  async function handleSaveInfo() {
    if (!editedName.trim()) return
    isSaving = true
    try {
      const updated = await chatService.updateRoom(room.id, { 
        name: editedName, 
        description: editedDesc 
      })
      onUpdateRoom(updated)
      isEditing = false
      toast.success('Info grup diperbarui')
    } catch (e) {
      toast.error('Gagal memperbarui info')
    } finally {
      isSaving = false
    }
  }

  async function handleAvatarUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !room) return
    
    const t = toast.loading('Mengunggah foto...')
    try {
      // Reuse media upload logic or similar
      const fileExt = file.name.split('.').pop()
      const fileName = `${room.id}_${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('chat_media')
        .upload(`avatars/${fileName}`, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('chat_media')
        .getPublicUrl(`avatars/${fileName}`)

      const updated = await chatService.updateRoom(room.id, { avatar_url: publicUrl })
      onUpdateRoom(updated)
      toast.success('Foto profil diperbarui', { id: t })
    } catch (e) {
      toast.error('Gagal mengunggah foto', { id: t })
    }
  }

  async function addMember(userId: string) {
    try {
      await chatService.addParticipants(room.id, [userId])
      // Refresh room participants locally for UI
      const newUser = allProfiles.find(p => p.id === userId)
      if (newUser) {
        room.participants = [...room.participants, { ...newUser, joined_at: new Date().toISOString() }]
      }
      toast.success('Anggota ditambahkan')
    } catch (e) {
      toast.error('Gagal menambah anggota')
    }
  }

  async function removeMember(userId: string) {
    if (userId === currentUser.id) return
    if (!confirm('Hapus anggota ini dari grup?')) return
    try {
      await chatService.removeParticipant(room.id, userId)
      room.participants = room.participants.filter((p: any) => p.id !== userId)
      toast.success('Anggota dihapus')
    } catch (e) {
      toast.error('Gagal menghapus anggota')
    }
  }

  const isCreator = $derived(room?.created_by === currentUser?.id)
  const imageItems = $derived((chatImages || []).slice().reverse())
  const fileItems = $derived((chatFiles || []).slice().reverse())
  const urlRegex = /https?:\/\/[^\s]+/g
  const linkItems = $derived(
    [...(messages || [])]
      .flatMap((message: any) => {
        const content = typeof message?.content === 'string' ? message.content : ''
        const urls = content.match(urlRegex) || []
        return urls.map((url: string) => ({ id: `${message.id}-${url}`, url, message }))
      })
  )

  async function downloadFile(url: string, filename: string) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
</script>

{#if show}
  <div class="fixed inset-0 z-[300] bg-white flex flex-col animate-in fade-in slide-in-from-right duration-300">
    <!-- Header -->
    <div class="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 shadow-sm">
      <button onclick={() => show = false} class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
        <ArrowLeft size={20} />
      </button>
      <h2 class="font-bold text-slate-800">Info {room?.type === 'group' ? 'Grup' : 'Profil'}</h2>
      <div class="flex-1"></div>
      {#if room?.type === 'group' && isCreator}
        <button onclick={() => isEditing = !isEditing} class="px-4 py-1.5 rounded-full text-xs font-bold {isEditing ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'} transition-all">
          {isEditing ? 'Batal' : 'Edit Grup'}
        </button>
      {/if}
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <!-- Top Profile Section -->
      <div class="bg-gradient-to-b from-slate-50 to-white pb-10 border-b border-slate-100">
        <div class="max-w-2xl mx-auto px-6 pt-10 flex flex-col items-center">
          <div class="relative group">
            <div class="w-32 h-32 rounded-[40px] bg-white shadow-xl flex items-center justify-center overflow-hidden border-4 border-white ring-1 ring-slate-100 transition-transform duration-500 group-hover:scale-105">
              {#if room?.type === 'group'}
                {#if room?.avatar_url}
                  <img src={room.avatar_url} alt="" class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full bg-orange-100 text-orange-500 flex items-center justify-center">
                    <Hash size={48} strokeWidth={2.5} />
                  </div>
                {/if}
              {:else}
                <img src={room?.partner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room?.name || 'U')}&background=random&color=fff&size=160`}
                     alt="" class="w-full h-full object-cover" />
              {/if}
            </div>

            {#if room?.type === 'group' && isCreator}
              <button onclick={() => avatarInputRef?.click()} 
                      class="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-orange-600 transition-all hover:scale-110">
                <Camera size={18} />
              </button>
              <input bind:this={avatarInputRef} type="file" class="hidden" accept="image/*" onchange={handleAvatarUpload} />
            {/if}
          </div>

          {#if isEditing}
            <div class="mt-8 w-full space-y-4 animate-in fade-in slide-in-from-top-4 duration-300" in:slide>
              <div class="space-y-1.5">
                <label for="group-name" class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Nama Grup</label>
                <input bind:value={editedName} 
                       id="group-name"
                       class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-orange-400 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label for="group-description" class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Deskripsi Grup</label>
                <textarea bind:value={editedDesc} rows="3"
                          id="group-description"
                          class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:border-orange-400 outline-none transition-all resize-none"
                          placeholder="Tambahkan deskripsi grup..."></textarea>
              </div>
              <button onclick={handleSaveInfo} disabled={isSaving}
                      class="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all disabled:opacity-50">
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          {:else}
            <h1 class="mt-6 text-2xl font-extrabold text-slate-800 tracking-tight">{room?.name}</h1>
            <p class="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              {room?.type === 'group' ? 'Grup Publik' : 'Kontak Pribadi'} 
              {#if room?.type === 'group' && room?.participants}
                • {room.participants.length} Anggota
              {/if}
            </p>
            
            {#if room?.description}
              <div class="mt-6 w-full max-w-md p-5 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                <p class="text-sm text-slate-600 leading-relaxed font-medium italic">"{room.description}"</p>
              </div>
            {:else if room?.type === 'group'}
              <div class="mt-6 w-full max-w-md p-5 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm text-center">
                <p class="text-sm text-slate-400 leading-relaxed font-medium italic">Belum ada deskripsi</p>
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <div class="max-w-2xl mx-auto p-6 space-y-10">
        <!-- Metadata -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div class="flex items-center gap-3 mb-2">
              <Calendar size={16} class="text-indigo-500" />
              <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Dibuat</span>
            </div>
            <p class="text-xs font-bold text-slate-700">{new Date(room?.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div class="p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div class="flex items-center gap-3 mb-2">
              <ShieldCheck size={16} class="text-emerald-500" />
              <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pembuat</span>
            </div>
            <p class="text-xs font-bold text-slate-700 truncate">{room?.profiles?.full_name || 'Admin'}</p>
          </div>
        </div>

        <!-- Participants Section -->
        {#if room?.type === 'group'}
          <div>
            <div class="flex items-center justify-between mb-4 px-2">
              <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Anggota Grup</h3>
              {#if isCreator}
                <button onclick={() => showAddMember = !showAddMember} class="text-[10px] font-extrabold text-orange-600 flex items-center gap-1 hover:underline">
                  <UserPlus size={14} /> TAMBAH ANGGOTA
                </button>
              {/if}
            </div>

            {#if showAddMember}
              <div class="mb-4 animate-in slide-in-from-top-2" in:slide>
                <input type="text" bind:value={searchUserQuery} placeholder="Cari kontak untuk ditambahkan..."
                       class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-orange-200" />
                
                {#if filteredUsers.length > 0}
                  <div class="mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                    {#each filteredUsers as user}
                      <button onclick={() => addMember(user.id)} class="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-all group">
                        <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random&color=fff`} 
                             class="w-8 h-8 rounded-full" alt="" />
                        <span class="text-xs font-bold text-slate-700 flex-1 text-left">{user.full_name}</span>
                        <Plus size={14} class="text-orange-500 group-hover:scale-125 transition-transform" />
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <div class="space-y-2">
              {#each room.participants as member}
                <div class="flex items-center gap-4 p-4 bg-white border border-slate-50 rounded-[32px] hover:border-slate-100 transition-all group">
                  <div class="relative">
                    <img src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=random&color=fff`} 
                         alt="" class="w-12 h-12 rounded-full object-cover shadow-sm" />
                    {#if member.id === room.created_by}
                      <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white">
                        <ShieldCheck size={10} strokeWidth={3} />
                      </div>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-bold text-slate-800 truncate">{member.full_name}</p>
                      {#if member.id === room.created_by}
                        <span class="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded border border-emerald-100">Creator</span>
                      {/if}
                      {#if member.id === currentUser.id}
                        <span class="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded border border-slate-200">Anda</span>
                      {/if}
                    </div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                  </div>
                  
                  {#if isCreator && member.id !== currentUser.id}
                    <button onclick={() => removeMember(member.id)} class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                      <UserMinus size={18} />
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div>
          <div class="mb-4 flex items-center justify-between px-2">
            <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Media, Tautan, dan Dokumen</h3>
            <span class="text-[10px] font-black text-slate-500">{imageItems.length + fileItems.length + linkItems.length}</span>
          </div>

          <div class="mb-4 flex gap-2 overflow-x-auto px-2">
            <button onclick={() => activeTab = 'media'} class="rounded-full px-3 py-1.5 text-[11px] font-black {activeTab === 'media' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}">
              Media ({imageItems.length})
            </button>
            <button onclick={() => activeTab = 'docs'} class="rounded-full px-3 py-1.5 text-[11px] font-black {activeTab === 'docs' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}">
              Dokumen ({fileItems.length})
            </button>
            <button onclick={() => activeTab = 'links'} class="rounded-full px-3 py-1.5 text-[11px] font-black {activeTab === 'links' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}">
              Tautan ({linkItems.length})
            </button>
          </div>

          {#if activeTab === 'media'}
            {#if imageItems.length > 0}
              <div class="mb-4 grid grid-cols-3 gap-2">
                {#each imageItems as media}
                  {#if media.type === 'image'}
                    <div class="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      <button onclick={() => previewImageUrl = media.metadata?.url} class="aspect-square w-full overflow-hidden relative group">
                        <img src={media.metadata?.url} alt="Media chat" class="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon size={20} class="text-white" />
                        </div>
                      </button>
                      <button onclick={() => downloadFile(media.metadata?.url, media.metadata?.originalName || 'media-chat')} class="w-full border-t border-slate-100 bg-white px-2 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1">
                        <Download size={10} /> Unduh
                      </button>
                    </div>
                  {:else if media.type === 'audio'}
                    <div class="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      <button onclick={() => toggleAudio(media.id, media.metadata?.url)} class="aspect-square w-full flex flex-col items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 transition-colors">
                        <div class="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                          {#if playingAudioId === media.id}
                            <Pause size={18} fill="currentColor" />
                          {:else}
                            <Play size={18} class="ml-0.5" fill="currentColor" />
                          {/if}
                        </div>
                        <Mic size={12} class="text-orange-400" />
                        <span class="text-[9px] font-bold text-orange-700">{media.metadata?.duration || 'Audio'}</span>
                      </button>
                      <button onclick={() => downloadFile(media.metadata?.url, media.metadata?.originalName || 'audio.webm')} class="w-full border-t border-slate-100 bg-white px-2 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1">
                        <Download size={10} /> Unduh
                      </button>
                    </div>
                  {/if}
                {/each}
              </div>

              {#if playingAudioId}
                {@const playingItem = imageItems.find(m => m.id === playingAudioId)}
                {#if playingItem}
                  <audio
                    src={playingItem.metadata?.url}
                    autoplay
                    bind:this={audioPlayerEl}
                    onended={() => playingAudioId = null}
                    class="hidden"
                  ></audio>
                {/if}
              {/if}
            {:else}
              <div class="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                  <ImageIcon size={22} />
                </div>
                <p class="text-xs font-bold text-slate-500">Belum ada media yang dibagikan</p>
              </div>
            {/if}
          {/if}

          {#if activeTab === 'docs'}
            {#if fileItems.length > 0}
              <div class="space-y-2">
                {#each fileItems as file}
                  <div class="rounded-2xl border border-slate-100 bg-white">
                    <a href={file.metadata?.url} target="_blank" class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                        <FileText size={18} />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-xs font-bold text-slate-700">{file.metadata?.originalName || file.content}</p>
                        <p class="text-[10px] text-slate-400">Dokumen chat</p>
                      </div>
                      <ExternalLink size={14} class="text-slate-300" />
                    </a>
                    <button onclick={() => downloadFile(file.metadata?.url, file.metadata?.originalName || 'dokumen-chat')} class="w-full border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-100">
                      Download File
                    </button>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                  <FileText size={22} />
                </div>
                <p class="text-xs font-bold text-slate-500">Belum ada dokumen yang dibagikan</p>
              </div>
            {/if}
          {/if}

          {#if activeTab === 'links'}
            {#if linkItems.length > 0}
              <div class="space-y-2">
                {#each linkItems as item}
                  <a href={item.url} target="_blank" class="block rounded-2xl border border-slate-100 bg-white px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div class="mb-1 flex items-center gap-2">
                      <ExternalLink size={14} class="text-orange-500" />
                      <span class="truncate text-[10px] font-black text-slate-400">{new URL(item.url).hostname}</span>
                    </div>
                    <p class="truncate text-xs font-bold text-slate-700">{item.url}</p>
                    <p class="mt-1 text-[10px] text-slate-400">Dibagikan dalam chat</p>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                  <ExternalLink size={22} />
                </div>
                <p class="text-xs font-bold text-slate-500">Belum ada tautan yang dibagikan</p>
              </div>
            {/if}
          {/if}
        </div>

        <!-- Other Info -->
        <div class="space-y-4">
           <div class="flex items-center justify-between px-2">
              <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Detail Keamanan</h3>
            </div>
            <div class="p-5 bg-orange-50 rounded-[32px] border border-orange-100/50 flex gap-4">
              <div class="w-10 h-10 rounded-2xl bg-white text-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div class="flex-1">
                <p class="text-xs font-bold text-orange-800">Enkripsi End-to-End</p>
                <p class="text-[10px] text-orange-700/70 mt-0.5 leading-relaxed">Pesan dan panggilan Anda diamankan. Tidak seorang pun di luar chat ini yang dapat membaca atau mendengarkannya.</p>
              </div>
            </div>
        </div>

        <!-- Danger Zone -->
        {#if room?.type === 'group'}
          <div class="pt-6">
            <button class="w-full py-4 rounded-3xl border border-red-100 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all">
              Keluar dari Grup
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if previewImageUrl}
    <div class="fixed inset-0 z-[500] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm" transition:fade onclick={() => previewImageUrl = null}>
      <div class="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-10 bg-linear-to-b from-black/50 to-transparent">
        <p class="text-white/80 text-xs font-bold">Pratinjau Gambar</p>
        <button onclick={() => previewImageUrl = null} class="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
          <X size={20} />
        </button>
      </div>
      <img src={previewImageUrl} alt="Pratinjau" class="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-xl" onclick={(e) => e.stopPropagation()} />
      <button onclick={() => downloadFile(previewImageUrl!, 'media-chat')} class="mt-4 px-6 py-2.5 bg-white/10 text-white rounded-full text-xs font-bold hover:bg-white/20 transition-all flex items-center gap-2">
        <Download size={14} /> Unduh Gambar
      </button>
    </div>
  {/if}
{/if}
