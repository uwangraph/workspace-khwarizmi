<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import { Search, X, Users, MessageSquare } from 'lucide-svelte'
  import { supabase } from '$lib/supabase'
  import type { Profile } from '$lib/type'

  let { onClose, onSubmit } = $props<{
    onClose: () => void,
    onSubmit: (selectedUsers: Profile[], groupName?: string) => void
  }>()

  let profiles = $state<Profile[]>([])
  let searchQuery = $state('')
  let isLoading = $state(true)
  let isGroupMode = $state(false)
  let groupName = $state('')
  let selectedUsers = $state<Profile[]>([])

  onMount(async () => {
    // Ambil daftar pengguna aktif
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id) // Jangan tampilkan diri sendiri
      .order('full_name')

    if (data) profiles = data
    isLoading = false
  })

  let filteredProfiles = $derived(
    profiles.filter(p => p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  function toggleUserSelection(p: Profile) {
    if (!isGroupMode) {
      // Jika DM biasa, langsung submit 1 orang tersebut
      onSubmit([p])
      return
    }

    const exists = selectedUsers.find(u => u.id === p.id)
    if (exists) {
      selectedUsers = selectedUsers.filter(u => u.id !== p.id)
    } else {
      selectedUsers = [...selectedUsers, p]
    }
  }

  function handleCreateGroup() {
    if (selectedUsers.length === 0 || !groupName.trim()) return
    onSubmit(selectedUsers, groupName.trim())
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-0 sm:p-4" transition:fade={{ duration: 200 }}>
  <!-- Modal Content -->
  <div class="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" transition:slide={{ duration: 300, axis: 'y' }}>
    
    <!-- Header -->
    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
      <div>
        <h2 class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {isGroupMode ? 'Buat Grup Proyek Baru' : 'Mulai Obrolan Baru'}
        </h2>
        <p class="text-[11px] text-slate-500 mt-0.5">
          {isGroupMode ? 'Pilih anggota dan masukkan nama grup' : 'Pilih rekan tim untuk diajak mengobrol'}
        </p>
      </div>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors">
        <X size={16} />
      </button>
    </div>

    <!-- Toggle & Input Group -->
    <div class="p-4 border-b border-slate-50 bg-slate-50/50 shrink-0 space-y-3">
      <div class="flex p-1 bg-slate-200/50 rounded-xl">
        <button onclick={() => { isGroupMode = false; selectedUsers = [] }} 
                class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all {!isGroupMode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}">
          Direct Message
        </button>
        <button onclick={() => isGroupMode = true} 
                class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all {isGroupMode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}">
          Grup Proyek
        </button>
      </div>

      {#if isGroupMode}
        <input type="text" bind:value={groupName} placeholder="Nama Grup (Misal: Proyek Alpha)" 
               class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400" />
      {/if}

      <div class="relative">
        <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" bind:value={searchQuery} placeholder="Cari nama..." 
               class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400" />
      </div>
    </div>

    <!-- List Users -->
    <div class="flex-1 overflow-y-auto p-2">
      {#if isLoading}
        <div class="py-10 text-center">
          <div class="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-xs text-slate-400">Memuat kontak...</p>
        </div>
      {:else if filteredProfiles.length === 0}
        <div class="py-10 text-center">
          <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
            <Search size={20} />
          </div>
          <p class="text-xs font-bold text-slate-600">Kontak tidak ditemukan</p>
        </div>
      {:else}
        <div class="space-y-1">
          {#each filteredProfiles as p}
            {@const isSelected = selectedUsers.some(u => u.id === p.id)}
            <button onclick={() => toggleUserSelection(p)}
                    class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-left border {isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent'}">
              <div class="flex items-center gap-3">
                <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&background=random`} 
                     class="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-100" alt={p.full_name} />
                <div>
                  <p class="text-sm font-bold text-slate-800">{p.full_name}</p>
                  <p class="text-[10px] font-medium text-slate-500">{p.role === 'admin' ? 'Administrator' : 'Karyawan'}</p>
                </div>
              </div>
              
              {#if isGroupMode}
                <div class="w-5 h-5 rounded-full border flex items-center justify-center transition-colors {isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}">
                  {#if isSelected}
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {/if}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer for Group Mode -->
    {#if isGroupMode}
      <div class="p-4 border-t border-slate-100 bg-white shrink-0">
        <button onclick={handleCreateGroup} disabled={selectedUsers.length === 0 || !groupName.trim()}
                class="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2">
          <Users size={16} /> Buat Grup ({selectedUsers.length} Anggota)
        </button>
      </div>
    {/if}
  </div>
</div>
