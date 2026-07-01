<script lang="ts">
  import { onMount } from 'svelte'
  import { ArrowLeft, Calendar, Clock, Users, Search, Video, Mic, XCircle } from 'lucide-svelte'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import { authService } from '$lib/services/authService'
  import type { ScheduledMeeting } from '$lib/services/meetingService'

  let user = $state<any>(null)
  let meetings = $state<ScheduledMeeting[]>([])
  let isLoading = $state(true)
  let searchQuery = $state('')
  let activeFilter = $state<'all' | 'done' | 'cancelled'>('all')

  onMount(async () => {
    const u = await authService.getUser()
    if (!u) { goto('/auth'); return }
    user = u
    await fetchMeetingHistory()
  })

  async function fetchMeetingHistory() {
    isLoading = true
    try {
      const now = new Date().toISOString()

      // Query terpisah untuk menghindari masalah array containment dalam .or()
      const [{ data: asCreator, error: e1 }, { data: asParticipant, error: e2 }] = await Promise.all([
        supabase
          .from('scheduled_meetings')
          .select('*')
          .eq('created_by', user.id)
          .lt('scheduled_at', now)
          .order('scheduled_at', { ascending: false }),
        supabase
          .from('scheduled_meetings')
          .select('*')
          .contains('participant_ids', [user.id])
          .lt('scheduled_at', now)
          .order('scheduled_at', { ascending: false }),
      ])

      console.log('[MeetingHistory] asCreator:', asCreator, e1)
      console.log('[MeetingHistory] asParticipant:', asParticipant, e2)

      if (e1) throw e1
      if (e2) throw e2

      // Gabung dan deduplikasi
      const seen = new Set<string>()
      const combined = [...(asCreator || []), ...(asParticipant || [])].filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      }).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

      const rawMeetings = combined
      if (rawMeetings.length === 0) { meetings = []; return }

      // Ambil profil creator secara terpisah (created_by references auth.users)
      const creatorIds = [...new Set(rawMeetings.map((m: any) => m.created_by).filter(Boolean))]
      const { data: creatorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', creatorIds)

      const creatorMap: Record<string, any> = {}
      for (const p of (creatorProfiles || [])) creatorMap[p.id] = p

      meetings = rawMeetings.map((m: any) => ({
        ...m,
        creator: creatorMap[m.created_by] ?? null,
      })) as ScheduledMeeting[]
    } catch (e) {
      console.error('Failed to fetch meeting history:', e)
    } finally {
      isLoading = false
    }
  }

  let filteredMeetings = $derived(
    meetings.filter(m => {
      if (activeFilter === 'done' && m.is_cancelled) return false
      if (activeFilter === 'cancelled' && !m.is_cancelled) return false
      if (searchQuery.trim() === '') return true
      const q = searchQuery.toLowerCase()
      return (
        m.title?.toLowerCase().includes(q) ||
        (m.creator as any)?.full_name?.toLowerCase().includes(q)
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
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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

    <!-- Filter Tabs -->
    <div class="flex gap-2 mb-5">
      {#each ([['all','Semua'], ['done','Selesai'], ['cancelled','Dibatalkan']] as const) as [val, label]}
        <button onclick={() => activeFilter = val}
                class="px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer
                       {activeFilter === val ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border-2 border-b-[4px] border-slate-200 text-slate-500 hover:border-emerald-200'}">
          {label}
        </button>
      {/each}
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
        <p class="text-xs font-bold text-slate-400 leading-relaxed">Belum ada meeting yang tercatat.</p>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each filteredMeetings as m (m.id)}
          {@const dateObj = new Date(m.scheduled_at)}
          <div class="w-full relative bg-white rounded-[24px] p-4 border-2 border-b-[6px] shadow-sm
                      {m.is_cancelled ? 'border-red-100 opacity-70' : 'border-slate-200'}">

            {#if m.is_cancelled}
              <div class="flex items-center gap-1.5 mb-2 text-red-400">
                <XCircle size={12} strokeWidth={2.5} />
                <span class="text-[10px] font-black uppercase tracking-wider">Dibatalkan</span>
              </div>
            {/if}

            <div class="flex items-start gap-4 mb-3">
              <div class="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border
                          {m.is_cancelled ? 'bg-red-50 border-red-100' : 'bg-emerald-100 border-emerald-200'}">
                <span class="text-[9px] font-black uppercase {m.is_cancelled ? 'text-red-400' : 'text-emerald-600'}">
                  {dateObj.toLocaleDateString('id-ID', { month: 'short' })}
                </span>
                <span class="text-xl font-black {m.is_cancelled ? 'text-red-600' : 'text-emerald-800'} -mt-1">
                  {dateObj.getDate()}
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-extrabold text-slate-800 leading-tight mb-1 {m.is_cancelled ? 'line-through text-slate-400' : ''}"
                    style="font-family:'Plus Jakarta Sans',sans-serif;">{m.title}</h3>
                {#if m.description}
                  <p class="text-xs font-bold text-slate-500 mb-1 line-clamp-2">{m.description}</p>
                {/if}
                <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                  <span class="flex items-center gap-1"><Clock size={10} /> {formatTime(m.scheduled_at)}</span>
                  <span class="flex items-center gap-1"><Users size={10} /> {m.participant_ids.length + 1} Peserta</span>
                  <span class="flex items-center gap-1">
                    {#if m.voice_only}<Mic size={10} /> Suara{:else}<Video size={10} /> Video{/if}
                  </span>
                </div>
              </div>
            </div>

            <!-- Creator & Date -->
            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <div class="flex items-center gap-2">
                <img src={(m.creator as any)?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((m.creator as any)?.full_name || '?')}&background=random&color=fff&size=64`}
                     alt={(m.creator as any)?.full_name}
                     class="w-7 h-7 rounded-xl object-cover" />
                <span class="text-[10px] font-black text-slate-500 truncate max-w-[100px]">{(m.creator as any)?.full_name}</span>
                {#if m.created_by === user?.id}
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">Kamu</span>
                {/if}
              </div>
              <span class="text-[10px] font-bold text-slate-400">{formatDate(m.scheduled_at)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
