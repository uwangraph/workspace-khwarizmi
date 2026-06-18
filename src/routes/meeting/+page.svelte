<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import {
    ArrowLeft, Users, Calendar, Clock, Video, Link2,
    Copy, Check, ChevronLeft, Search, Sparkles, Trash2,
  } from 'lucide-svelte'
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import type { Profile } from '$lib/type'
  import { callService } from '$lib/services/callService'
  import { authService } from '$lib/services/authService'
  import { meetingService, type ScheduledMeeting } from '$lib/services/meetingService'
  import toast from 'svelte-french-toast'

  function generateMeetingId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    return 'mtg-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36)
  }

  type View = 'home' | 'instant' | 'schedule' | 'linked' | 'list'
  let view = $state<View>('home')

  let user = $state<any>(null)
  let profile = $state<Profile | null>(null)

  let profiles = $state<Profile[]>([])
  let isLoadingProfiles = $state(true)
  let participantSearch = $state('')
  let selectedUserIds = $state<string[]>([])

  // Scheduled Meetings List
  let scheduledMeetings = $state<ScheduledMeeting[]>([])
  let isLoadingList = $state(false)

  // Instant
  let meetingName = $state('')

  // Schedule
  let schedTitle = $state('')
  let schedDate = $state('')
  let schedTime = $state('')
  let isLoadingSchedule = $state(false)

  // Linked
  let linkedRoomId = $state<string | null>(null)
  let linkedRoomUrl = $state('')
  let isCreatingLink = $state(false)
  let isLinkCopied = $state(false)

  onMount(async () => {
    const u = await authService.getUser()
    if (!u) { goto('/auth'); return }
    user = u

    const pr = await authService.getProfile(u.id)
    profile = pr.data

    await Promise.all([
      fetchProfiles(u.id),
      fetchScheduledMeetings(u.id)
    ])
  })

  async function fetchProfiles(uid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', uid)
      .order('full_name')
    if (data) profiles = data
    isLoadingProfiles = false
  }

  async function fetchScheduledMeetings(uid: string) {
    isLoadingList = true
    try {
      scheduledMeetings = await meetingService.getScheduledMeetings(uid)
    } catch (e) {
      console.error('Failed to fetch scheduled meetings:', e)
    } finally {
      isLoadingList = false
    }
  }

  let filteredProfiles = $derived(
    participantSearch.trim() === ''
      ? profiles
      : profiles.filter(p => p.full_name.toLowerCase().includes(participantSearch.toLowerCase()))
  )

  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

  function formatScheduleDisplay() {
    if (!schedDate || !schedTime) return null
    const [y, m, d] = schedDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' })
    const monthName = monthNames[m - 1]
    return `${dayName}, ${d} ${monthName} ${y} • ${schedTime}`
  }

  function formatScheduleISO() {
    if (!schedDate || !schedTime) return null
    const [y, m, d] = schedDate.split('-').map(Number)
    const [hh, mm] = schedTime.split(':').map(Number)
    return new Date(y, m - 1, d, hh, mm).toISOString()
  }

  function toggleUser(uid: string) {
    if (selectedUserIds.includes(uid)) selectedUserIds = selectedUserIds.filter(id => id !== uid)
    else selectedUserIds = [...selectedUserIds, uid]
  }

  function buildMeetingLink(id: string, name: string): string {
    const qs = name ? `?name=${encodeURIComponent(name)}` : ''
    return `${window.location.origin}/meeting/${id}${qs}`
  }

  function startInstantMeeting() {
    if (!user) return
    const name = meetingName.trim() || 'Rapat Instan'
    const meetingId = generateMeetingId()

    if (selectedUserIds.length === 0) {
      linkedRoomId = meetingId
      linkedRoomUrl = buildMeetingLink(meetingId, name)
      view = 'linked'
      return
    }

    callService.prepareCall(meetingId, name, 'start', [user.id, ...selectedUserIds])
  }

  function createLinkedMeeting() {
    if (isCreatingLink) return
    isCreatingLink = true
    const name = meetingName.trim() || 'Rapat Tertaut'
    const meetingId = generateMeetingId()
    linkedRoomId = meetingId
    linkedRoomUrl = buildMeetingLink(meetingId, name)
    view = 'linked'
    isCreatingLink = false
  }

  async function copyLink() {
    if (!linkedRoomUrl) return
    await navigator.clipboard.writeText(linkedRoomUrl)
    isLinkCopied = true
    toast.success('Tautan disalin')
    setTimeout(() => { isLinkCopied = false }, 2000)
  }

  function goToLinkedRoom() {
    if (!linkedRoomId || !user) return
    const name = meetingName.trim() || 'Rapat'
    callService.prepareCall(linkedRoomId, name, 'start', [user.id, ...selectedUserIds])
  }

  async function scheduleMeeting() {
    if (!user) return
    if (!schedTitle.trim()) { toast.error('Judul rapat wajib diisi'); return }
    if (!schedDate || !schedTime) { toast.error('Tanggal & waktu wajib diisi'); return }
    if (selectedUserIds.length === 0) { toast.error('Pilih minimal 1 peserta'); return }

    const scheduledAt = formatScheduleISO()
    if (!scheduledAt) return

    isLoadingSchedule = true
    try {
      const { error } = await supabase.from('scheduled_meetings').insert({
        title: schedTitle.trim(),
        scheduled_at: scheduledAt,
        created_by: user.id,
        participant_ids: selectedUserIds,
      })
      if (error) throw error
      toast.success('Rapat berhasil dijadwalkan!')
      await fetchScheduledMeetings(user.id)
      view = 'list'
    } catch (err: any) {
      if (err?.code === '42P01') toast.error('Fitur jadwal rapat belum tersedia di database.')
      else toast.error('Gagal menjadwalkan rapat')
    }
    isLoadingSchedule = false
  }

  function deleteMeeting(id: string) {
    if (!confirm('Hapus jadwal rapat ini?')) return
    meetingService.deleteMeeting(id).then(() => {
      scheduledMeetings = scheduledMeetings.filter(m => m.id !== id)
      toast.success('Jadwal dihapus')
    }).catch(() => toast.error('Gagal menghapus jadwal'))
  }

  function joinScheduledMeeting(m: ScheduledMeeting) {
    if (!user) return
    callService.prepareCall(m.id, m.title, 'join', [m.created_by, ...m.participant_ids])
  }

  function backToHome() {
    view = 'home'
    meetingName = ''
    selectedUserIds = []
    participantSearch = ''
  }

  function handleBackButton() {
    if (view === 'home') goto('/chat')
    else backToHome()
  }
</script>

<svelte:head>
  <title>Rapat · Khwarizmi</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col pb-12">
  <!-- Top bar -->
  <div class="sticky top-0 z-20 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 bg-white/85 backdrop-blur-md border-b border-slate-100 flex items-center gap-3">
    <button onclick={handleBackButton}
            class="p-2 -ml-2 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
      {#if view === 'home'}
        <ArrowLeft size={20} />
      {:else}
        <ChevronLeft size={20} />
      {/if}
    </button>
    <div class="min-w-0 flex-1">
      <p class="text-[10px] font-black uppercase tracking-widest text-emerald-500">Khwarizmi Meet</p>
      <h1 class="text-base font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">
        {#if view === 'home'}Rapat
        {:else if view === 'instant'}Mulai Rapat
        {:else if view === 'schedule'}Jadwalkan Rapat
        {:else if view === 'list'}Rapat Terjadwal
        {:else}Tautan Rapat
        {/if}
      </h1>
    </div>
    {#if view === 'home'}
      <button onclick={() => goto('/meeting/history')} class="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer" title="Riwayat Panggilan">
        <Clock size={20} />
      </button>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 px-5 pt-4 pb-8 max-w-md w-full mx-auto">

    {#if view === 'home'}
      <!-- Hero -->
      <div class="rounded-[28px] bg-gradient-to-br from-emerald-50 via-white to-orange-50 border-2 border-emerald-100 p-5 mb-5 relative overflow-hidden" in:fade={{ duration: 200 }}>
        <div class="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-emerald-100/50 blur-2xl pointer-events-none"></div>
        <div class="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-orange-100/50 blur-2xl pointer-events-none"></div>
        <div class="relative">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
            <Video size={22} />
          </div>
          <h2 class="text-lg font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
            Mulai rapat dengan tim
          </h2>
          <p class="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
            Rapat tidak meninggalkan grup chat permanen — fokus diskusi tanpa berisik.
          </p>
        </div>
      </div>

      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Pilih Cara Memulai</p>

      <div class="space-y-2.5" in:fly={{ y: 8, duration: 220, easing: cubicOut }}>
        <button onclick={() => view = 'instant'}
                class="w-full p-4 bg-white border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] cursor-pointer text-left group">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Sparkles size={22} />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-slate-800">Mulai rapat instan</p>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5">Mulai sekarang dan undang peserta</p>
          </div>
        </button>

        <button onclick={createLinkedMeeting} disabled={isCreatingLink}
                class="w-full p-4 bg-white border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] cursor-pointer text-left group disabled:opacity-50">
          <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            {#if isCreatingLink}
              <div class="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            {:else}
              <Link2 size={22} />
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-slate-800">Buat rapat untuk nanti</p>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5">Dapatkan tautan untuk dibagikan</p>
          </div>
        </button>

        <button onclick={() => view = 'schedule'}
                class="w-full p-4 bg-white border-2 border-slate-100 hover:border-purple-300 hover:bg-purple-50/40 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] cursor-pointer text-left group">
          <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Calendar size={22} />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-slate-800">Jadwalkan rapat</p>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5">Atur tanggal dan waktu</p>
          </div>
        </button>

        <button onclick={() => view = 'list'}
                class="w-full p-4 bg-white border-2 border-slate-100 hover:border-orange-300 hover:bg-orange-50/40 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] cursor-pointer text-left group">
          <div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Users size={22} />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-slate-800">Lihat jadwal rapat</p>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5">{scheduledMeetings.length} rapat mendatang</p>
          </div>
        </button>
      </div>

    {:else if view === 'list'}
      <div class="space-y-4" in:fly={{ y: 20, duration: 250 }}>
        {#if isLoadingList}
           <div class="flex flex-col items-center justify-center py-20 gap-3">
             <div class="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
             <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat jadwal...</p>
           </div>
        {:else if scheduledMeetings.length === 0}
          <div class="text-center py-20 px-10">
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} class="text-slate-300" />
            </div>
            <h3 class="text-base font-black text-slate-800">Belum ada rapat</h3>
            <p class="text-xs font-medium text-slate-500 mt-1">Rapat yang Anda buat atau undangannya akan muncul di sini.</p>
            <button onclick={() => view = 'schedule'} class="mt-6 px-6 py-3 bg-emerald-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/20">
              Jadwalkan Sekarang
            </button>
          </div>
        {:else}
          {#each scheduledMeetings as m (m.id)}
            {@const dateObj = new Date(m.scheduled_at)}
            {@const isSoon = dateObj.getTime() - Date.now() < 30 * 60 * 1000 && dateObj.getTime() > Date.now()}
            {@const isPast = dateObj.getTime() < Date.now()}
            <div class="p-5 bg-white border-2 border-slate-100 rounded-[28px] relative overflow-hidden group hover:border-emerald-200 transition-all">
              {#if isSoon}
                <div class="absolute top-0 right-0 px-3 py-1 bg-amber-400 text-[9px] font-black text-white rounded-bl-xl uppercase tracking-widest animate-pulse">Akan Datang</div>
              {/if}
              <div class="flex items-start gap-4 mb-4">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200">
                  <span class="text-[9px] font-black text-slate-400 uppercase">{dateObj.toLocaleDateString('id-ID', { month: 'short' })}</span>
                  <span class="text-lg font-black text-slate-800 -mt-1">{dateObj.getDate()}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-black text-slate-800 leading-tight mb-1">{m.title}</h3>
                  <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                    <span class="flex items-center gap-1"><Clock size={10} /> {dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="flex items-center gap-1"><Users size={10} /> {m.participant_ids.length + 1} Peserta</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
                <div class="flex items-center gap-2">
                  <img src={m.creator?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.creator?.full_name || '?')}&background=random&color=fff&size=64`}
                       alt={m.creator?.full_name} class="w-6 h-6 rounded-lg object-cover" />
                  <span class="text-[10px] font-black text-slate-500 truncate max-w-[80px]">{m.creator?.full_name.split(' ')[0]}</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if m.created_by === user.id}
                    <button onclick={() => deleteMeeting(m.id)} class="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  {/if}
                  <button onclick={() => joinScheduledMeeting(m)}
                          class="px-5 py-2.5 rounded-xl text-[11px] font-black transition-all
                                 {isSoon ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600'}">
                    {isPast ? 'Lihat' : 'Gabung'}
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

    {:else if view === 'instant'}
      <div class="space-y-5" in:fly={{ x: 30, duration: 220, easing: cubicOut }}>
        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nama Rapat</label>
          <input type="text" bind:value={meetingName} placeholder="Rapat Instan"
                 class="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300" />
        </div>

        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Undang Peserta</label>
          <div class="relative mb-2">
            <Search size={14} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" bind:value={participantSearch} placeholder="Cari nama..."
                   class="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition-all placeholder:text-slate-300" />
          </div>
          {#if isLoadingProfiles}
            <div class="flex items-center justify-center py-6">
              <div class="w-6 h-6 border-[3px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          {:else if filteredProfiles.length === 0}
            <p class="text-xs text-slate-400 text-center py-4">Tidak ada peserta</p>
          {:else}
            <div class="space-y-1 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {#each filteredProfiles as p (p.id)}
                <button onclick={() => toggleUser(p.id)}
                        class="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left
                               {selectedUserIds.includes(p.id) ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-white border-2 border-slate-100 hover:border-slate-200'}">
                  <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=64`}
                       alt={p.full_name} class="w-8 h-8 rounded-lg object-cover shrink-0" />
                  <span class="text-xs font-bold text-slate-700 truncate flex-1">{p.full_name}</span>
                  {#if selectedUserIds.includes(p.id)}
                    <div class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
          {#if selectedUserIds.length > 0}
            <p class="mt-2 text-[10px] font-bold text-emerald-600">{selectedUserIds.length} peserta dipilih</p>
          {/if}
        </div>

        <button onclick={startInstantMeeting}
                class="w-full py-4 bg-emerald-500 text-white text-sm font-black rounded-2xl border-2 border-b-[6px] border-emerald-700 shadow-md hover:bg-emerald-600 active:translate-y-0.5 active:border-b-[3px] transition-all cursor-pointer">
          🚀 Mulai Rapat Sekarang
        </button>
      </div>

    {:else if view === 'schedule'}
      <div class="space-y-5" in:fly={{ x: 30, duration: 220, easing: cubicOut }}>
        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Judul Rapat</label>
          <input type="text" bind:value={schedTitle} placeholder="Standup Harian"
                 class="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Tanggal</label>
            <div class="relative">
              <Calendar size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="date" bind:value={schedDate}
                     class="w-full pl-10 pr-3 py-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all" />
            </div>
          </div>
          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Waktu</label>
            <div class="relative">
              <Clock size={16} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="time" bind:value={schedTime}
                     class="w-full pl-10 pr-3 py-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all" />
            </div>
          </div>
        </div>

        {#if formatScheduleDisplay()}
          <div class="px-4 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
            <p class="text-xs font-bold text-emerald-700">📅 {formatScheduleDisplay()}</p>
          </div>
        {/if}

        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Undang Peserta</label>
          <div class="relative mb-2">
            <Search size={14} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" bind:value={participantSearch} placeholder="Cari nama..."
                   class="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white transition-all placeholder:text-slate-300" />
          </div>
          {#if isLoadingProfiles}
            <div class="flex items-center justify-center py-6">
              <div class="w-6 h-6 border-[3px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          {:else}
            <div class="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {#each filteredProfiles as p (p.id)}
                <button onclick={() => toggleUser(p.id)}
                        class="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left
                               {selectedUserIds.includes(p.id) ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-white border-2 border-slate-100 hover:border-slate-200'}">
                  <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=64`}
                       alt={p.full_name} class="w-8 h-8 rounded-lg object-cover shrink-0" />
                  <span class="text-xs font-bold text-slate-700 truncate flex-1">{p.full_name}</span>
                  {#if selectedUserIds.includes(p.id)}
                    <div class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <button onclick={scheduleMeeting} disabled={isLoadingSchedule}
                class="w-full py-4 bg-purple-500 text-white text-sm font-black rounded-2xl border-2 border-b-[6px] border-purple-700 shadow-md hover:bg-purple-600 active:translate-y-0.5 active:border-b-[3px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          {#if isLoadingSchedule}
            <span class="flex items-center justify-center gap-2">
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Menyimpan...
            </span>
          {:else}
            📅 Jadwalkan Rapat
          {/if}
        </button>
      </div>

    {:else if view === 'linked'}
      <div class="space-y-5" in:fly={{ x: 30, duration: 220, easing: cubicOut }}>
        <div class="flex flex-col items-center gap-3 py-6">
          <div class="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Link2 size={28} />
          </div>
          <div class="text-center">
            <h3 class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Tautan rapat siap dibagikan</h3>
            <p class="text-xs font-medium text-slate-500 mt-1">Bagikan tautan ini ke peserta</p>
          </div>
        </div>

        <div class="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tautan</p>
          <p class="text-xs font-bold text-slate-700 break-all">{linkedRoomUrl}</p>
        </div>

        <div class="flex gap-2">
          <button onclick={copyLink}
                  class="flex-1 py-3.5 bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-2xl text-xs font-black text-slate-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2">
            {#if isLinkCopied}
              <Check size={16} class="text-emerald-500" />
              Tersalin
            {:else}
              <Copy size={16} />
              Salin Tautan
            {/if}
          </button>
          <button onclick={goToLinkedRoom}
                  class="flex-1 py-3.5 bg-blue-500 text-white text-xs font-black rounded-2xl border-2 border-b-[6px] border-blue-700 hover:bg-blue-600 active:translate-y-0.5 active:border-b-[3px] transition-all cursor-pointer">
            Mulai Rapat
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.custom-scrollbar::-webkit-scrollbar) { width: 4px; }
  :global(.custom-scrollbar::-webkit-scrollbar-track) { background: transparent; }
  :global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: #e2e8f0; border-radius: 10px; }
</style>
