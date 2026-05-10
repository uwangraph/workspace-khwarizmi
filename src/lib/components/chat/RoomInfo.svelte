<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { X, ArrowLeft, Camera, Edit2, Plus, UserMinus, UserPlus, Info, Calendar, ShieldCheck, Mail, Hash } from 'lucide-svelte'
  import type { ChatRoom, Profile } from '$lib/type'
  import { chatService } from '$lib/services/chatService'
  import { supabase } from '$lib/supabase'
  import toast from 'svelte-french-toast'

  let {
    show = $bindable(false),
    room,
    currentUser,
    allProfiles = [],
    onUpdateRoom
  }: {
    show: boolean,
    room: any,
    currentUser: any,
    allProfiles: Profile[],
    onUpdateRoom: (updated: any) => void
  } = $props()

  let isEditing = $state(false)
  let editedName = $state(room?.name || '')
  let editedDesc = $state(room?.description || '')
  let isSaving = $state(false)
  let showAddMember = $state(false)
  let searchUserQuery = $state('')
  let avatarInputRef = $state<HTMLInputElement | null>(null)

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
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Nama Grup</label>
                <input bind:value={editedName} 
                       class="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:border-orange-400 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Deskripsi Grup</label>
                <textarea bind:value={editedDesc} rows="3"
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
              {room?.type === 'group' ? 'Grup Publik' : 'Pesan Langsung'} 
              {#if room?.participants}
                • {room.participants.length} Anggota
              {/if}
            </p>
            
            {#if room?.description}
              <div class="mt-6 w-full max-w-md p-5 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                <p class="text-sm text-slate-600 leading-relaxed font-medium italic">"{room.description}"</p>
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
{/if}
