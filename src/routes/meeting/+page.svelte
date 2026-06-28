<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import {
    ArrowLeft, Users, Calendar, Clock, Video, Link2,
    Copy, Check, ChevronLeft, Search, Sparkles, Trash2, X, Bell, FileText,
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
  let showDeleteConfirm = $state<string | null>(null)
  let participantsMap = $state<Record<string, { full_name: string; avatar_url: string | null }>>({})

  // Instant
  let meetingName = $state('')

  // Schedule
  let schedTitle = $state('')
  let schedDescription = $state('')
  let schedDate = $state('')
  let schedTime = $state('')
  let isLoadingSchedule = $state(false)
  let showCancelConfirm = $state<string | null>(null)
  let isSendingReminder = $state<string | null>(null)

  // Linked
  let linkedRoomId = $state<string | null>(null)
  let linkedRoomUrl = $state('')
  let isCreatingLink = $state(false)
  let isLinkCopied = $state(false)

  let refreshInterval: ReturnType<typeof setInterval> | null = null

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

    // Auto-refresh setiap 30 detik untuk update status meeting
    refreshInterval = setInterval(() => {
      if (user) fetchScheduledMeetings(user.id)
    }, 30000)
  })

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval)
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
      // Fetch participant profiles for display
      const allParticipantIds = new Set<string>()
      scheduledMeetings.forEach(m => {
        m.participant_ids.forEach(id => allParticipantIds.add(id))
        if (m.created_by) allParticipantIds.add(m.created_by)
      })
      if (allParticipantIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(allParticipantIds))
        if (profiles) {
          profiles.forEach(p => { participantsMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url } })
        }
      }
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

  function goToLinkedRoom() {
    if (!linkedRoomId || !user) return
    const name = meetingName.trim() || 'Rapat'
    callService.prepareCall(linkedRoomId, name, 'start', [user.id, ...selectedUserIds])
  }

  async function copyLink() {
    if (!linkedRoomUrl) return
    await navigator.clipboard.writeText(linkedRoomUrl)
    isLinkCopied = true
    toast.success('Tautan disalin')
    setTimeout(() => { isLinkCopied = false }, 2000)
  }

  async function scheduleMeeting() {
    if (!user) return
    if (!schedTitle.trim()) { toast.error('Judul rapat wajib diisi'); return }
    if (!schedDate || !schedTime) { toast.error('Tanggal & waktu wajib diisi'); return }
    if (selectedUserIds.length === 0) { toast.error('Pilih minimal 1 peserta'); return }

    const scheduledAt = formatScheduleISO()
    if (!scheduledAt) return

    // Validasi: tidak bisa jadwalkan di masa lalu
    const scheduleDate = new Date(scheduledAt)
    if (scheduleDate.getTime() < Date.now()) {
      toast.error('Tidak bisa jadwalkan rapat di masa lalu')
      return
    }

    // Validasi: maksimal 30 hari ke depan
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    if (scheduleDate > maxDate) {
      toast.error('Jadwal rapat maksimal 30 hari ke depan')
      return
    }

    isLoadingSchedule = true
    try {
      await meetingService.createScheduledMeeting({
        title: schedTitle.trim(),
        description: schedDescription.trim() || undefined,
        scheduled_at: scheduledAt,
        created_by: user.id,
        participant_ids: selectedUserIds,

      })
      toast.success('Rapat berhasil dijadwalkan!')
      await fetchScheduledMeetings(user.id)
      view = 'list'
    } catch (err: any) {
      if (err?.code === '42P01') toast.error('Fitur jadwal rapat belum tersedia di database.')
      else toast.error('Gagal menjadwalkan rapat')
    }
    isLoadingSchedule = false
  }

  async function sendMeetingReminder(meetingId: string) {
    isSendingReminder = meetingId
    try {
      await meetingService.sendReminder(meetingId)
      toast.success('Pengingat terkirim!')
    } catch {
      toast.error('Gagal mengirim pengingat')
    } finally {
      isSendingReminder = null
    }
  }

  function confirmDeleteMeeting(id: string) {
    showDeleteConfirm = id
  }

  async function deleteMeeting(id: string) {
    try {
      await meetingService.deleteMeeting(id)
      scheduledMeetings = scheduledMeetings.filter(m => m.id !== id)
      showDeleteConfirm = null
      toast.success('Jadwal dihapus')
    } catch {
      toast.error('Gagal menghapus jadwal')
    }
  }

  async function cancelMeeting(id: string) {
    if (!confirm('Batalkan rapat ini? Peserta akan menerima notifikasi.')) return
    try {
      await meetingService.cancelMeeting(id)
      scheduledMeetings = scheduledMeetings.filter(m => m.id !== id)
      toast.success('Rapat dibatalkan')
    } catch {
      toast.error('Gagal membatalkan rapat')
    }
  }

  function joinScheduledMeeting(m: ScheduledMeeting) {
    if (!user) return
    const dateObj = new Date(m.scheduled_at)
    const isPast = dateObj.getTime() < Date.now()
    if (isPast) {
      toast.error('Rapat sudah lewat')
      return
    }
    callService.prepareCall(m.id, m.title, 'join', [m.created_by, ...m.participant_ids])
  }

  function getParticipantNames(meeting: ScheduledMeeting): string[] {
    const ids = [meeting.created_by, ...meeting.participant_ids]
    return ids.map(id => participantsMap[id]?.full_name || 'Unknown').filter(Boolean)
  }

  function getInitials(name: string): string {
    return (name || '?').split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase()
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

<div class="flex flex-col bg-[#FFF9F0]/30 min-h-screen pb-28">
  <!-- Top bar -->
  <div class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <button onclick={handleBackButton}
              class="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
        {#if view === 'home'}
          <ArrowLeft size={22} />
        {:else}
          <ChevronLeft size={22} />
        {/if}
      </button>
      <div>
        <p class="text-[10px] font-black uppercase tracking-widest text-orange-500">Khwarizmi Meet</p>
        <h1 class="text-xl font-black text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {#if view === 'home'}Rapat
          {:else if view === 'instant'}Mulai Rapat
          {:else if view === 'schedule'}Jadwalkan Rapat
          {:else if view === 'list'}Rapat Terjadwal
          {:else}Tautan Rapat
          {/if}
        </h1>
      </div>
    </div>
    {#if view === 'home'}
      <button onclick={() => goto('/meeting/history')} class="w-11 h-11 rounded-[20px] bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer border-2 border-b-[6px] border-emerald-700 shadow-sm active:translate-y-0.5" title="Riwayat Meeting">
        <Clock size={22} strokeWidth={3} />
      </button>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 px-4 pt-5 pb-8 max-w-md w-full mx-auto">

    {#if view === 'home'}
      <!-- Hero -->
      <div class="bg-white rounded-[24px] p-5 mb-5 border-2 border-b-[6px] border-slate-200 shadow-sm" in:fade={{ duration: 200 }}>
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
            <Video size={26} />
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
              Mulai rapat dengan tim
            </h2>
            <p class="text-xs font-bold text-slate-500 mt-1.5 leading-relaxed">
              Rapat tidak meninggalkan grup chat permanen — fokus diskusi tanpa berisik.
            </p>
          </div>
        </div>
      </div>

      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Pilih Cara Memulai</p>

      <div class="flex flex-col gap-3" in:fly={{ y: 8, duration: 220, easing: cubicOut }}>
        <button onclick={() => view = 'instant'}
                class="w-full relative flex items-center gap-4 bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] border-slate-200 shadow-sm transition-all active:translate-y-0.5 active:border-b-[3px] text-left cursor-pointer select-none hover:border-emerald-300">
          <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Sparkles size={24} />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Mulai rapat instan</p>
            <p class="text-xs font-bold text-slate-500 mt-0.5">Mulai sekarang dan undang peserta</p>
          </div>
        </button>

        <button onclick={createLinkedMeeting} disabled={isCreatingLink}
                class="w-full relative flex items-center gap-4 bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] border-slate-200 shadow-sm transition-all active:translate-y-0.5 active:border-b-[3px] text-left cursor-pointer select-none hover:border-blue-300 disabled:opacity-50">
          <div class="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            {#if isCreatingLink}
              <div class="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            {:else}
              <Link2 size={24} />
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Buat rapat untuk nanti</p>
            <p class="text-xs font-bold text-slate-500 mt-0.5">Dapatkan tautan untuk dibagikan</p>
          </div>
        </button>

        <button onclick={() => view = 'schedule'}
                class="w-full relative flex items-center gap-4 bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] border-slate-200 shadow-sm transition-all active:translate-y-0.5 active:border-b-[3px] text-left cursor-pointer select-none hover:border-purple-300">
          <div class="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Calendar size={24} />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Jadwalkan rapat</p>
            <p class="text-xs font-bold text-slate-500 mt-0.5">Atur tanggal dan waktu</p>
          </div>
        </button>

        <button onclick={() => view = 'list'}
                class="w-full relative flex items-center gap-4 bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] border-slate-200 shadow-sm transition-all active:translate-y-0.5 active:border-b-[3px] text-left cursor-pointer select-none hover:border-orange-300">
          <div class="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Lihat jadwal rapat</p>
            <p class="text-xs font-bold text-slate-500 mt-0.5">{scheduledMeetings.length} rapat mendatang</p>
          </div>
        </button>
      </div>

    {:else if view === 'list'}
      <div class="flex flex-col gap-3" in:fly={{ y: 20, duration: 250 }}>
        {#if isLoadingList}
          <div class="flex flex-col items-center justify-center py-24 gap-3">
            <div class="w-8 h-8 border-[4px] border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
            <p class="text-xs font-black text-slate-400">Memuat jadwal...</p>
          </div>
        {:else if scheduledMeetings.length === 0}
          <div class="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
            <div class="w-16 h-16 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] flex items-center justify-center mb-4 text-slate-400 shadow-sm">
              <Calendar size={28} strokeWidth={2.5} />
            </div>
            <p class="text-base font-extrabold text-slate-800 mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Belum ada rapat</p>
            <p class="text-xs font-bold text-slate-400 leading-relaxed">Rapat yang Anda buat atau undangannya akan muncul di sini.</p>
            <button onclick={() => view = 'schedule'}
                    class="mt-6 px-6 py-3.5 bg-orange-500 text-white text-xs font-black rounded-2xl border-2 border-b-[6px] border-orange-700 shadow-md hover:bg-orange-600 active:translate-y-0.5 transition-all cursor-pointer">
              Jadwalkan Sekarang
            </button>
          </div>
        {:else}
          {#each scheduledMeetings as m (m.id)}
            {@const dateObj = new Date(m.scheduled_at)}
            {@const isSoon = dateObj.getTime() - Date.now() < 30 * 60 * 1000 && dateObj.getTime() > Date.now()}
            {@const isPast = dateObj.getTime() < Date.now()}
            <div class="w-full relative bg-white rounded-[24px] p-4.5 border-2 border-b-[6px] shadow-sm transition-all active:translate-y-0.5 {isPast ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-emerald-300'}">
              {#if isSoon}
                <div class="absolute -top-1 -right-1 px-3 py-1 bg-amber-400 text-[9px] font-black text-white rounded-bl-xl uppercase tracking-widest animate-pulse shadow-md">Akan Datang</div>
              {:else if isPast}
                <div class="absolute -top-1 -right-1 px-3 py-1 bg-slate-400 text-[9px] font-black text-white rounded-bl-xl uppercase tracking-widest shadow-md">Berlalu</div>
              {/if}
              <div class="flex items-start gap-4 mb-3">
                <div class="w-14 h-14 rounded-2xl bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200">
                  <span class="text-[9px] font-black text-slate-400 uppercase">{dateObj.toLocaleDateString('id-ID', { month: 'short' })}</span>
                  <span class="text-xl font-black text-slate-800 -mt-1">{dateObj.getDate()}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-base font-extrabold text-slate-800 leading-tight mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">{m.title}</h3>
                  {#if m.description}
                    <p class="text-xs font-bold text-slate-500 mb-1 line-clamp-1">{m.description}</p>
                  {/if}
                  <div class="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                    <span class="flex items-center gap-1"><Clock size={10} /> {dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="flex items-center gap-1"><Users size={10} /> {m.participant_ids.length + 1} Peserta</span>
                    {#if m.voice_only}
                      <span class="flex items-center gap-1 text-blue-500"><Video size={10} /> Suara</span>
                    {/if}
                  </div>
                </div>
              </div>
              <!-- Participants preview row -->
              <div class="flex items-center gap-1 mb-3">
                {#each [m.created_by, ...m.participant_ids].slice(0, 5) as pid}
                  {@const p = participantsMap[pid]}
                  {#if p}
                    <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=64`}
                         alt={p.full_name} class="w-7 h-7 rounded-xl object-cover border-2 border-white -ml-1 first:ml-0" title={p.full_name} />
                  {:else}
                    <div class="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center border-2 border-white -ml-1 first:ml-0">
                      <span class="text-[8px] font-bold text-slate-500">?</span>
                    </div>
                  {/if}
                {/each}
                {#if [m.created_by, ...m.participant_ids].length > 5}
                  <span class="text-[9px] font-bold text-slate-400 ml-1">+{ [m.created_by, ...m.participant_ids].length - 5}</span>
                {/if}
              </div>
              <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div class="flex items-center gap-2">
                  <img src={m.creator?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.creator?.full_name || '?')}&background=random&color=fff&size=64`}
                       alt={m.creator?.full_name} class="w-7 h-7 rounded-xl object-cover" />
                  <span class="text-[10px] font-black text-slate-500 truncate max-w-[80px]">{m.creator?.full_name.split(' ')[0]}</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if m.created_by === user.id && !isPast}
                    <button onclick={() => sendMeetingReminder(m.id)} disabled={isSendingReminder === m.id}
                            class="w-9 h-9 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                            title="Kirim Pengingat">
                      {#if isSendingReminder === m.id}
                        <div class="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                      {:else}
                        <Bell size={16} />
                      {/if}
                    </button>
                    <button onclick={() => confirmDeleteMeeting(m.id)} class="w-9 h-9 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center" title="Hapus">
                      <Trash2 size={16} />
                    </button>
                  {/if}
                  <button onclick={() => joinScheduledMeeting(m)}
                          class="px-5 py-2.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border-2 border-b-[4px] active:translate-y-0.5 active:border-b-[2px]
                                 {isSoon ? 'bg-emerald-500 text-white border-emerald-700 shadow-lg shadow-emerald-500/20' : isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-100 hover:text-emerald-600 hover:border-emerald-300'}">
                    {isPast ? 'Berlalu' : 'Gabung'}
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

    {:else if view === 'instant'}
      <div class="flex flex-col gap-4" in:fly={{ x: 30, duration: 220, easing: cubicOut }}>
        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Nama Rapat</label>
          <input type="text" bind:value={meetingName} placeholder="Rapat Instan"
                 class="w-full px-4 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
        </div>

        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Undang Peserta</label>
          <div class="relative mb-2">
            <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" bind:value={participantSearch} placeholder="Cari nama..."
                   class="w-full pl-11 pr-4 py-3 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-700 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
          </div>
          {#if isLoadingProfiles}
            <div class="flex items-center justify-center py-6">
              <div class="w-8 h-8 border-[4px] border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
          {:else if filteredProfiles.length === 0}
            <p class="text-xs text-slate-400 text-center py-4">Tidak ada peserta</p>
          {:else}
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              {#each filteredProfiles as p (p.id)}
                <button onclick={() => toggleUser(p.id)}
                        class="w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left border-2
                               {selectedUserIds.includes(p.id) ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-100 hover:border-slate-200'}">
                  <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=64`}
                       alt={p.full_name} class="w-10 h-10 rounded-xl object-cover shrink-0" />
                  <span class="text-sm font-bold text-slate-700 truncate flex-1">{p.full_name}</span>
                  {#if selectedUserIds.includes(p.id)}
                    <div class="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
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
          🎥 Mulai Rapat Sekarang
        </button>
      </div>

    {:else if view === 'schedule'}
      <div class="flex flex-col gap-4" in:fly={{ x: 30, duration: 220, easing: cubicOut }}>
        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Judul Rapat</label>
          <input type="text" bind:value={schedTitle} placeholder="Standup Harian"
                 class="w-full px-4 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
        </div>

        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Deskripsi (Opsional)</label>
          <textarea bind:value={schedDescription} placeholder="Topik yang akan dibahas..." rows="2"
                    class="w-full px-4 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold resize-none"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Tanggal</label>
            <div class="relative">
              <Calendar size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="date" bind:value={schedDate}
                     class="w-full pl-11 pr-3 py-3 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-xs font-extrabold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all" />
            </div>
          </div>
          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Waktu</label>
            <div class="relative">
              <Clock size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="time" bind:value={schedTime}
                     class="w-full pl-11 pr-3 py-3 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-xs font-extrabold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all" />
            </div>
          </div>
        </div>

        {#if formatScheduleDisplay()}
          <div class="px-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-2xl">
            <p class="text-xs font-bold text-orange-700">📅 {formatScheduleDisplay()}</p>
          </div>
        {/if}

        <div>
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Undang Peserta</label>
          <div class="relative mb-2">
            <Search size={16} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" bind:value={participantSearch} placeholder="Cari nama..."
                   class="w-full pl-11 pr-4 py-3 bg-white border-2 border-b-[6px] border-slate-200 rounded-[24px] text-sm font-extrabold text-slate-700 outline-none focus:border-orange-500 shadow-sm transition-all placeholder:text-slate-300 placeholder:font-bold" />
          </div>
          {#if isLoadingProfiles}
            <div class="flex items-center justify-center py-6">
              <div class="w-8 h-8 border-[4px] border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
          {:else}
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              {#each filteredProfiles as p (p.id)}
                <button onclick={() => toggleUser(p.id)}
                        class="w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left border-2
                               {selectedUserIds.includes(p.id) ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-100 hover:border-slate-200'}">
                  <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random&color=fff&size=64`}
                       alt={p.full_name} class="w-10 h-10 rounded-xl object-cover shrink-0" />
                  <span class="text-sm font-bold text-slate-700 truncate flex-1">{p.full_name}</span>
                  {#if selectedUserIds.includes(p.id)}
                    <div class="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <button onclick={scheduleMeeting} disabled={isLoadingSchedule}
                class="w-full py-4 bg-orange-500 text-white text-sm font-black rounded-2xl border-2 border-b-[6px] border-orange-700 shadow-md hover:bg-orange-600 active:translate-y-0.5 active:border-b-[3px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
      <div class="flex flex-col gap-5" in:fly={{ x: 30, duration: 220, easing: cubicOut }}>
        <div class="bg-white rounded-[24px] p-6 border-2 border-b-[6px] border-slate-200 shadow-sm">
          <div class="flex flex-col items-center gap-3 mb-5">
            <div class="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Link2 size={28} />
            </div>
            <div class="text-center">
              <h3 class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Tautan rapat siap dibagikan</h3>
              <p class="text-xs font-bold text-slate-500 mt-1">Bagikan tautan ini ke peserta</p>
            </div>
          </div>

          <div class="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tautan</p>
            <p class="text-xs font-bold text-slate-700 break-all">{linkedRoomUrl}</p>
          </div>

          <div class="flex gap-3">
            <button onclick={copyLink}
                    class="flex-1 py-3.5 bg-white border-2 border-b-[6px] border-slate-200 hover:border-emerald-400 rounded-2xl text-xs font-black text-slate-700 transition-all active:translate-y-0.5 active:border-b-[3px] cursor-pointer flex items-center justify-center gap-2">
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
      </div>
    {/if}
  </div>

  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" transition:fade onclick={() => showDeleteConfirm = null}>
      <div class="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl border-2 border-b-[6px] border-slate-200" onclick={(e) => e.stopPropagation()} transition:fly={{ y: 20, duration: 200 }}>
        <div class="text-center mb-5">
          <div class="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3">
            <Trash2 size={24} class="text-red-500" />
          </div>
          <h3 class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Hapus Jadwal Rapat?</h3>
          <p class="text-xs font-bold text-slate-500 mt-1">Tindakan ini tidak bisa dibatalkan.</p>
        </div>
        <div class="flex gap-3">
          <button onclick={() => showDeleteConfirm = null}
                  class="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition-all cursor-pointer border-2 border-b-[4px] border-slate-200 active:translate-y-0.5 active:border-b-[2px]">
            Batal
          </button>
          <button onclick={() => deleteMeeting(showDeleteConfirm!)}
                  class="flex-1 py-3 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition-all cursor-pointer border-2 border-b-[4px] border-red-600 active:translate-y-0.5 active:border-b-[2px]">
            Hapus
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.custom-scrollbar::-webkit-scrollbar) { width: 4px; }
  :global(.custom-scrollbar::-webkit-scrollbar-track) { background: transparent; }
  :global(.custom-scrollbar::-webkit-scrollbar-thumb) { background: #e2e8f0; border-radius: 10px; }
</style>
