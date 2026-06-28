<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { ArrowLeft, Calendar, Clock, Users, Search, Video } from 'lucide-svelte'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'
  import { meetingService, type ScheduledMeeting } from '$lib/services/meetingService'

  let user = $state<any>(null)
  let meetings = $state<ScheduledMeeting[]>([])
  let isLoading = $state(true)
  let searchQuery = $state('')

  onMount(async () => {
    const u = await authService.getUser()
    if (!u) { goto('/auth'); return }
    user = u

    await fetchMeetingHistory()
  })

  async function fetchMeetingHistory() {
    isLoading = true
    try {
      // Ambil semua meeting yang sudah lewat (scheduled_at < now)
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*, creator:profiles(full_name, avatar_url)')
        .or(`created_by.eq.${user.id},participant_ids.cs.{${user.id}}`)
        .lt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: false })
      
      if (error) throw error
      meetings = data as ScheduledMeeting[]
    } catch (e) {
      console.error('Failed to fetch meeting history:', e)
    } finally {
      isLoading = false
    }
  }

  let filteredMeetings = $derived(
    searchQuery.trim() === ''
      ? meetings
      : meetings.filter(m => 
          m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.creator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
    
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function initials(name: string) {
    return (name || '?').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
  }
</script>

<svelte:head>
  <title>Riwayat Meeting · Khwarizmi</title>
</svelte:head>

<div class="flex flex-col bg-[#FFF9F0]/30 min-h-screen pb-28">
  <!-- Top bar -->
  <div class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button onclick={() => goto('/meeting')}
              class="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
        <ArrowLeft size={22} />
      </button>
      <div>
        <p class="text-[10px] font-black uppercase tracking-widest text-emerald-500">Meeting</p>
        <h1 class="text-xl font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">Riwayat Meeting</h1>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 px-4 pt-5 pb-8 max-w-md w-full mx-auto">
    <!-- Search -->
    <div class="relative mb-4">
      <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="text" bind:value={searchQuery} placeholder="Cari meeting..."
             class="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-700 outline-none focus:border-emerald-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
    </div>

    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-24 gap-3">
        <div class="w-8 h-8 border-[4px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
        <p class="text-xs font-black text-slate-400">Memuat riwayat...</p>
      </div>
    {:else if filteredMeetings.length === 0}
      <div class="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <div class="w-16 h-16 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] flex items-center justify-center mb-4 text-slate-400 shadow-sm">
          <Calendar size={28} strokeWidth={2.5} />
        </div>
        <p class="text-base font-extrabold text-slate-800 mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Tidak ada riwayat</p>
        <p class="text-xs font-bold text-slate-400 leading-relaxed">Belum ada meeting yang sudah selesai.</p>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each filteredMeetings as m (m.id)}
          {@const dateObj = new Date(m.scheduled_at)}
          <div class="w-full relative bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] border-slate-200 shadow-sm">
            <div class="flex items-start gap-4 mb-3">
              <div class="w-14 h-14 rounded-2xl bg-emerald-100 flex flex-col items-center justify-center shrink-0 border border-emerald-200">
                <span class="text-[9px] font-black text-emerald-600 uppercase">{dateObj.toLocaleDateString('id-ID', { month: 'short' })}</span>
                <span class="text-xl font-black text-emerald-800 -mt-1">{dateObj.getDate()}</span>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-extrabold text-slate-800 leading-tight mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">{m.title}</h3>
                {#if m.description}
                  <p class="text-xs font-bold text-slate-500 mb-1 line-clamp-2">{m.description}</p>
                {/if}
                <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                  <span class="flex items-center gap-1"><Clock size={10} /> {formatTime(m.scheduled_at)}</span>
                  <span class="flex items-center gap-1"><Users size={10} /> {m.participant_ids.length + 1} Peserta</span>
                </div>
              </div>
            </div>
            
            <!-- Creator & Date -->
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <div class="flex items-center gap-2">
                <img src={m.creator?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.creator?.full_name || '?')}&background=random&color=fff&size=64`}
                     alt={m.creator?.full_name} class="w-7 h-7 rounded-xl object-cover" />
                <span class="text-[10px] font-black text-slate-500 truncate max-w-[100px]">{m.creator?.full_name}</span>
              </div>
              <span class="text-[10px] font-bold text-slate-400">{formatDate(m.scheduled_at)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
