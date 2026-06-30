<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowLeft, Phone, PhoneMissed, Video, VideoOff, Clock, MessageSquare, Search } from 'lucide-svelte'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'

  let user = $state<any>(null)
  let calls = $state<any[]>([])
  let isLoading = $state(true)
  let searchQuery = $state('')
  let activeFilter = $state<'all' | 'video' | 'voice'>('all')

  onMount(async () => {
    const u = await authService.getUser()
    if (!u) { goto('/auth'); return }
    user = u
    await fetchCallHistory()
  })

  async function fetchCallHistory() {
    isLoading = true
    try {
      // Ambil room-room yang diikuti user
      const { data: participantData, error: pErr } = await supabase
        .from('chat_participants')
        .select('room_id, room:chat_rooms(type, name)')
        .eq('user_id', user.id)

      if (pErr) throw pErr

      const roomIds = (participantData || []).map((r: any) => r.room_id)
      if (roomIds.length === 0) { calls = []; return }

      // Untuk direct room, cari profil partner (bukan user sendiri)
      const directRoomIds = (participantData || [])
        .filter((r: any) => r.room?.type === 'direct')
        .map((r: any) => r.room_id)

      const partnerMap: Record<string, { full_name: string; avatar_url: string | null }> = {}
      if (directRoomIds.length > 0) {
        const { data: partnerData } = await supabase
          .from('chat_participants')
          .select('room_id, profile:profiles(id, full_name, avatar_url)')
          .in('room_id', directRoomIds)
          .neq('user_id', user.id)

        for (const p of (partnerData || [])) {
          if (p.profile) partnerMap[p.room_id] = p.profile as any
        }
      }

      // Ambil pesan bertipe 'call' dari room yang diikuti user
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, room:chat_rooms(name, type), sender:profiles!sender_id(id, full_name, avatar_url)')
        .eq('type', 'call')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Lampirkan info partner untuk direct room
      calls = (data || []).map((c: any) => ({
        ...c,
        partner: c.room?.type === 'direct' ? (partnerMap[c.room_id] ?? null) : null
      }))
    } catch (e) {
      console.error('Failed to fetch call history:', e)
    } finally {
      isLoading = false
    }
  }

  let filteredCalls = $derived(
    calls.filter(c => {
      if (activeFilter === 'video' && c.metadata?.kind !== 'video') return false
      if (activeFilter === 'voice' && c.metadata?.kind !== 'voice') return false
      if (searchQuery.trim() === '') return true
      const q = searchQuery.toLowerCase()
      const displayName = c.room?.type === 'direct'
        ? (c.partner?.full_name || c.sender?.full_name || '')
        : (c.room?.name || '')
      return (
        displayName.toLowerCase().includes(q) ||
        c.content?.toLowerCase().includes(q)
      )
    })
  )

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
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

  function getStatusColor(status: string) {
    if (status === 'missed') return 'text-red-500'
    if (status === 'declined') return 'text-slate-400'
    return 'text-emerald-500'
  }

  function getStatusIcon(call: any) {
    const status = call.metadata?.call_status
    const isVideo = call.metadata?.kind === 'video'
    if (isVideo) return status === 'missed' ? VideoOff : Video
    return status === 'missed' ? PhoneMissed : Phone
  }

  function getDisplayProfile(call: any) {
    if (call.room?.type === 'direct') {
      return call.partner ?? call.sender
    }
    return call.sender
  }

  function getDisplayName(call: any) {
    if (call.room?.type === 'direct') {
      return call.partner?.full_name ?? call.sender?.full_name ?? 'Pengguna'
    }
    return call.room?.name ?? 'Grup'
  }
</script>

<svelte:head>
  <title>Riwayat Panggilan · Khwarizmi</title>
</svelte:head>

<div class="flex flex-col bg-[#FFF9F0]/30 min-h-screen pb-28">
  <!-- Top bar -->
  <div class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button onclick={() => goto('/chat')}
              class="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
        <ArrowLeft size={22} />
      </button>
      <div>
        <p class="text-[10px] font-black uppercase tracking-widest text-blue-500">Panggilan</p>
        <h1 class="text-xl font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">Riwayat Panggilan</h1>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 px-4 pt-5 pb-8 max-w-md w-full mx-auto">
    <!-- Search -->
    <div class="relative mb-4">
      <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="text" bind:value={searchQuery} placeholder="Cari panggilan..."
             class="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-700 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 mb-5">
      {#each ([['all','Semua'], ['video','Video'], ['voice','Suara']] as const) as [val, label]}
        <button onclick={() => activeFilter = val}
                class="px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5
                       {activeFilter === val ? 'bg-blue-500 text-white shadow-md' : 'bg-white border-2 border-b-[4px] border-slate-200 text-slate-500 hover:border-blue-200'}">
          {#if val === 'video'}<Video size={12} />{:else if val === 'voice'}<Phone size={12} />{/if}
          {label}
        </button>
      {/each}
    </div>

    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-24 gap-3">
        <div class="w-8 h-8 border-[4px] border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
        <p class="text-xs font-black text-slate-400">Memuat riwayat...</p>
      </div>
    {:else if filteredCalls.length === 0}
      <div class="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <div class="w-16 h-16 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] flex items-center justify-center mb-4 text-slate-400 shadow-sm">
          <Phone size={28} strokeWidth={2.5} />
        </div>
        <p class="text-base font-extrabold text-slate-800 mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Tidak ada riwayat</p>
        <p class="text-xs font-bold text-slate-400 leading-relaxed">Belum ada aktivitas panggilan yang tercatat.</p>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each filteredCalls as call (call.id)}
          {@const Icon = getStatusIcon(call)}
          {@const profile = getDisplayProfile(call)}
          <button onclick={() => goto(`/chat/${call.room_id}`)}
                  class="w-full relative flex items-center gap-4 bg-white rounded-[24px] p-4 border-2 border-b-[6px] border-slate-200 shadow-sm transition-all active:translate-y-0.5 active:border-b-[3px] text-left cursor-pointer select-none hover:border-orange-300">

            <div class="relative shrink-0">
              <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || '?')}&background=random&color=fff&size=64`}
                   alt={profile?.full_name}
                   class="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100 bg-slate-50" />
              <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-white shadow-md flex items-center justify-center border {getStatusColor(call.metadata?.call_status)}">
                <Icon size={14} strokeWidth={3} />
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <h3 class="text-base font-extrabold text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">
                  {getDisplayName(call)}
                </h3>
                <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatTime(call.created_at)}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-bold {getStatusColor(call.metadata?.call_status)} truncate flex items-center gap-1">
                  <Clock size={10} />
                  {call.content}
                </p>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(call.created_at)}</span>
              </div>
            </div>

            <div class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
              <MessageSquare size={16} />
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
