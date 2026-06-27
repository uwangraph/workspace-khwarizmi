<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { ArrowLeft, Phone, PhoneMissed, Video, VideoOff, Clock, Calendar, MessageSquare, Search } from 'lucide-svelte'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'
  import type { ChatMessage, Profile } from '$lib/type'

  let user = $state<any>(null)
  let calls = $state<any[]>([])
  let isLoading = $state(true)
  let searchQuery = $state('')

  onMount(async () => {
    const u = await authService.getUser()
    if (!u) { goto('/auth'); return }
    user = u

    await fetchCallHistory()
  })

  async function fetchCallHistory() {
    isLoading = true
    try {
      // Ambil semua pesan bertipe 'call' di mana user adalah peserta room-nya
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, room:chat_rooms(name, type), sender:profiles!sender_id(full_name, avatar_url)')
        .eq('type', 'call')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      calls = data || []
    } catch (e) {
      console.error('Failed to fetch call history:', e)
    } finally {
      isLoading = false
    }
  }

  let filteredCalls = $derived(
    searchQuery.trim() === ''
      ? calls
      : calls.filter(c => 
          c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.room?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
  )

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hari ini'
    
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
    
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  function initials(name: string) {
    return (name || '?').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
  }

  function getStatusColor(status: string) {
    if (status === 'missed') return 'text-red-500'
    if (status === 'declined') return 'text-slate-400'
    return 'text-emerald-500'
  }

  function getStatusIcon(call: any) {
    const status = call.metadata?.call_status
    const isVideo = call.metadata?.kind === 'video'
    
    if (isVideo) {
      return status === 'missed' ? VideoOff : Video
    }
    return status === 'missed' ? PhoneMissed : Phone
  }
</script>

<svelte:head>
  <title>Riwayat Panggilan · Khwarizmi</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col pb-12">
  <!-- Top bar -->
  <div class="sticky top-0 z-20 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 bg-white/85 backdrop-blur-md border-b border-slate-100 flex items-center gap-3">
    <button onclick={() => goto('/meeting')}
            class="p-2 -ml-2 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
      <ArrowLeft size={20} />
    </button>
    <div class="min-w-0 flex-1">
      <p class="text-[10px] font-black uppercase tracking-widest text-emerald-500">Log Rapat</p>
      <h1 class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">Riwayat Panggilan</h1>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 px-5 pt-4 pb-8 max-w-md w-full mx-auto">
    <!-- Search -->
    <div class="relative mb-6">
      <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
      <input type="text" bind:value={searchQuery} placeholder="Cari panggilan..."
             class="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-[22px] text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 shadow-sm transition-all placeholder:text-slate-300" />
    </div>

    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-20 gap-3">
        <div class="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat riwayat...</p>
      </div>
    {:else if filteredCalls.length === 0}
      <div class="text-center py-20 px-10">
        <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone size={32} class="text-slate-300" />
        </div>
        <h3 class="text-base font-black text-slate-800">Tidak ada riwayat</h3>
        <p class="text-xs font-medium text-slate-500 mt-1">Belum ada aktivitas panggilan yang tercatat.</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each filteredCalls as call (call.id)}
          {@const Icon = getStatusIcon(call)}
          <button onclick={() => goto(`/chat/${call.room_id}`)}
                  class="w-full p-4 bg-white border-2 border-slate-100 hover:border-emerald-200 rounded-[24px] flex items-center gap-4 transition-all active:scale-[0.98] text-left group">
            
            <div class="relative shrink-0">
              <img src={call.sender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(call.sender?.full_name || '?')}&background=random&color=fff&size=64`}
                   alt={call.sender?.full_name} class="w-12 h-12 rounded-2xl object-cover" />
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white shadow-md flex items-center justify-center {getStatusColor(call.metadata?.call_status)}">
                <Icon size={14} strokeWidth={3} />
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-0.5">
                <h3 class="text-sm font-black text-slate-800 truncate">
                  {call.room?.type === 'direct' ? call.sender?.full_name : (call.room?.name || 'Grup')}
                </h3>
                <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatTime(call.created_at)}</span>
              </div>
              
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] font-bold {getStatusColor(call.metadata?.call_status)} truncate">
                  {call.content}
                </p>
                <span class="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{formatDate(call.created_at)}</span>
              </div>
            </div>

            <div class="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0">
               <MessageSquare size={16} />
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
  }
</style>
