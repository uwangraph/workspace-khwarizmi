<script lang="ts">
  import { onMount } from 'svelte'
  import type { User } from '@supabase/supabase-js'
  import toast from 'svelte-french-toast'
  import { Eye, Clock, Shield, FileText } from 'lucide-svelte'
  
  import { authService } from '$lib/services/authService'
  import { attendanceService } from '$lib/services/attendanceService'
  import { locationService } from '$lib/services/locationService'
  import type { Profile, AttendanceRecord, Holiday } from '$lib/type'
  
  import AppHeader from '$lib/components/shared/AppHeader.svelte'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  
  import AttendanceBanner from '$lib/components/absensi/AttendanceBanner.svelte'
  import AttendanceStats from '$lib/components/absensi/AttendanceStats.svelte'
  import SessionCard from '$lib/components/absensi/SessionCard.svelte'
  import HistoryItem from '$lib/components/absensi/HistoryItem.svelte'
  import CameraModal from '$lib/components/absensi/CameraModal.svelte'
  import LateReasonModal from '$lib/components/absensi/LateReasonModal.svelte'
  import LeaveModal from '$lib/components/absensi/LeaveModal.svelte'

  interface Session { id: number; name: string; start: string; end: string; unlockAt: string; autoCheckoutAt: string; hasLateCheck?: boolean; requireLocation?: boolean }
  interface LeaveRecord { id: string; date: string; type: 'izin' | 'sakit'; reason: string; session_id: number | null; status: 'pending' | 'approved' | 'rejected' }
  interface PenaltyRecord { id: string; date: string; session_id: number; minutes: number; reason: string }
  interface ThursdayRule { id: string; date: string; type: 'normal' | 'custom_time' | 'wfa'; start_time?: string | null; note?: string | null }
  interface AppSetting { office_lat: number; office_lng: number; office_radius: number }

  const LATE_TOLERANCE_MIN = 5
  const SESSIONS: Session[] = [
    { id: 1, name: 'Sesi Pagi',  start: '08:00', end: '11:30', unlockAt: '06:00', autoCheckoutAt: '12:00', hasLateCheck: true, requireLocation: true },
    { id: 2, name: 'Sesi Siang', start: '13:30', end: '15:00', unlockAt: '12:00', autoCheckoutAt: '15:30', hasLateCheck: true, requireLocation: true },
    { id: 3, name: 'Sesi Sore',  start: '16:00', end: '22:00', unlockAt: '15:30', autoCheckoutAt: '22:30', hasLateCheck: true, requireLocation: true },
    { id: 4, name: 'Lembur',     start: '20:00', end: '23:59', unlockAt: '19:30', autoCheckoutAt: '23:59', requireLocation: false },
  ]

  let user = $state<User | null>(null), profile = $state<Profile | null>(null), attendance = $state<AttendanceRecord[]>([]), leaves = $state<LeaveRecord[]>([]), penalties = $state<PenaltyRecord[]>([]), thursdayRule = $state<ThursdayRule | null>(null), appSettings = $state<AppSetting | null>(null), isLoading = $state(true)
  let showCamera = $state(false), cameraSessionId = $state(0), cameraType = $state<'in' | 'out'>('in'), cameraStream = $state<MediaStream | null>(null), capturedBlob = $state<Blob | null>(null), capturedUrl = $state(''), cameraStatus = $state(''), isSubmitting = $state(false)
  let showLateModal = $state(false), lateSessionId = $state(0), lateReason = $state(''), lateMinutes = $state(0)
  let showLeaveModal = $state(false), isSubmittingLeave = $state(false), leaveStatus = $state('')
  let photoViewUrl = $state(''), showPhotoView = $state(false)
  let todayHoliday = $state<{id: string, name: string, date: string} | null>(null)
  let now = $state(new Date())

  $effect(() => { const t = setInterval(() => (now = new Date()), 30_000); return () => clearInterval(t) })

  let attendanceMap = $derived(Object.fromEntries(attendance.map(a => [a.session_id, a])))
  let isTodayThursday = $derived(new Date().getDay() === 4), isTodayFriday = $derived(new Date().getDay() === 5)
  let activeSessions = $derived(isTodayFriday ? [] : isTodayThursday ? SESSIONS.slice(0, 1) : SESSIONS)
  let isWfa = $derived(isTodayThursday && thursdayRule?.type === 'wfa')

  function toMin(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + m }
  function isSessionOnLeave(sessionId: number) { return leaves.find(l => (l.session_id === null || l.session_id === sessionId) && l.status !== 'rejected') || null }
  function formatDateIndonesian(date: Date) { return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }

  async function checkLocation(): Promise<{ ok: boolean; distance?: number; error?: string }> {
    if (!appSettings) return { ok: false, error: 'Pengaturan lokasi belum dikonfigurasi' }
    const pos = await locationService.getCurrentPosition()
    if (!pos.ok) return { ok: false, error: pos.error }
    return locationService.isWithinRadius(pos.coords!, appSettings.office_lat, appSettings.office_lng, appSettings.office_radius)
  }

  function checkIsLate(session: Session) {
    if (!session.hasLateCheck) return { late: false, minutes: 0 }
    let startMin = toMin(session.start)
    if (isTodayThursday && session.id === 1 && thursdayRule?.type === 'custom_time' && thursdayRule.start_time) {
      startMin = toMin(thursdayRule.start_time)
    }
    const diff = (now.getHours() * 60 + now.getMinutes()) - startMin
    return { late: diff > LATE_TOLERANCE_MIN, minutes: diff }
  }

  async function runAutoCheckout(u: User) {
    const curMin = new Date().getHours() * 60 + new Date().getMinutes()
    for (const s of SESSIONS) {
      if (curMin < toMin(s.autoCheckoutAt)) continue
      const rec = attendance.find(a => a.session_id === s.id)
      if (rec && rec.check_in && !rec.check_out) {
        const [h, m] = s.autoCheckoutAt.split(':').map(Number); const checkoutTime = new Date(); checkoutTime.setHours(h, m, 0, 0)
        await attendanceService.autoCheckout(u.id, rec.id, s.id, checkoutTime.toISOString())
      }
    }
  }

  async function loadData() {
    isLoading = true
    const u = await authService.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u
    
    const { data: p } = await authService.getProfile(u.id)
    if (p) profile = p as Profile
    
    const data = await attendanceService.getTodayData(u.id)
    attendance = data.attendance as AttendanceRecord[]
    leaves = data.leaves as LeaveRecord[]
    penalties = data.penalties as PenaltyRecord[]
    appSettings = data.appSettings
    todayHoliday = data.todayHoliday as any
    thursdayRule = data.thursdayRule as any

    await runAutoCheckout(u)
    
    // Refresh attendance after auto checkout
    const fresh = await attendanceService.getTodayData(u.id)
    attendance = fresh.attendance as AttendanceRecord[]
    penalties = fresh.penalties as PenaltyRecord[]
    
    isLoading = false
  }

  async function openCamera(sid: number, type: 'in' | 'out') {
    if (todayHoliday) {
      toast.error(`Tidak dapat absen. Hari ini libur: ${todayHoliday.name}`)
      return
    }
    const session = SESSIONS.find(s => s.id === sid)!
    if (session.requireLocation !== false && !(isTodayThursday && sid === 1 && thursdayRule?.type === 'wfa')) {
      cameraStatus = 'Memverifikasi lokasi...'; showCamera = true
      const loc = await checkLocation()
      if (!loc.ok) { closeCamera(); toast.error(loc.error || 'Lokasi tidak valid'); return }
    } else { cameraStatus = 'Membuka kamera...'; showCamera = true }

    if (type === 'in') {
      const lateInfo = checkIsLate(session)
      if (lateInfo.late) { lateSessionId = sid; lateMinutes = lateInfo.minutes; showCamera = false; showLateModal = true; return }
    }
    cameraSessionId = sid; cameraType = type; capturedBlob = null; capturedUrl = ''; cameraStatus = ''; isSubmitting = false; await startStream()
  }

  async function confirmLate(reason: string) { showLateModal = false; lateReason = reason; cameraSessionId = lateSessionId; cameraType = 'in'; capturedBlob = null; capturedUrl = ''; cameraStatus = ''; isSubmitting = false; showCamera = true; await startStream() }
  async function startStream() { try { cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 } } }) } catch { toast.error('Akses kamera diperlukan'); closeCamera() } }
  function closeCamera() { cameraStream?.getTracks().forEach(t => t.stop()); cameraStream = null; showCamera = false; cameraStatus = '' }
  
  function takePhoto() {
    const vid = document.querySelector('video')
    if (!vid) return
    const canvas = document.createElement('canvas'), vw = vid.videoWidth || 720, vh = vid.videoHeight || 960
    canvas.width = vw; canvas.height = vh; const ctx = canvas.getContext('2d')!
    ctx.translate(vw, 0); ctx.scale(-1, 1); ctx.drawImage(vid, 0, 0, vw, vh)
    capturedUrl = canvas.toDataURL('image/jpeg', 0.85); canvas.toBlob(b => { capturedBlob = b }, 'image/jpeg', 0.75)
    cameraStream?.getTracks().forEach(t => t.stop()); cameraStream = null; cameraStatus = 'Pastikan foto jelas sebelum mengirim'
  }

  async function submitPhoto() {
    if (!capturedBlob || !user) return
    isSubmitting = true; cameraStatus = ''
    try {
      const publicUrl = await attendanceService.uploadSelfie(user.id, capturedBlob, cameraType)
      
      if (cameraType === 'in') {
        const lateInfo = checkIsLate(SESSIONS.find(s => s.id === cameraSessionId)!)
        await attendanceService.submitCheckIn(user.id, cameraSessionId, publicUrl, lateInfo.late, lateReason)
        toast.success('Check-in berhasil')
      } else {
        await attendanceService.submitCheckOut(user.id, cameraSessionId, publicUrl)
        toast.success('Check-out berhasil')
      }
      lateReason = ''; closeCamera(); await loadData()
    } catch (e: any) { cameraStatus = e.message; isSubmitting = false }
  }

  async function submitLeave(data: { type: 'izin' | 'sakit', reason: string, sessionId: number | null }) {
    if (!user) return
    if (!data.reason.trim()) { leaveStatus = 'Alasan wajib diisi'; return }
    if (data.sessionId !== null && leaves.find(l => l.session_id === data.sessionId)) { leaveStatus = `Sudah ada izin/sakit untuk sesi tersebut`; return }
    isSubmittingLeave = true; leaveStatus = ''
    try {
      await attendanceService.submitLeave(user.id, data.type, data.reason, data.sessionId)
      showLeaveModal = false; toast.success(data.type === 'izin' ? 'Izin berhasil dicatat' : 'Sakit berhasil dicatat'); await loadData()
    } catch (e: any) { leaveStatus = e.message || 'Gagal menyimpan' } finally { isSubmittingLeave = false }
  }

  onMount(loadData)
</script>

<svelte:head><title>Presensi — Workspace Khwarizmi</title></svelte:head>

<div class="min-h-screen pb-24 bg-[#FFF9F0]">
  <AppHeader title="Kehadiran" subtitle="Catat absensi harian Anda">
    <button onclick={() => { leaveStatus = ''; showLeaveModal = true }} class="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors flex items-center gap-1.5 shadow-sm">
      <FileText size={14} /> Izin / Sakit
    </button>
  </AppHeader>

  <main class="max-w-lg mx-auto p-4 flex flex-col gap-4">
    {#if isLoading}
      <LoadingSpinner message="Memuat jadwal absensi..." />
    {:else}
      {#if todayHoliday}
        <div class="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 flex items-start gap-3 mb-2 shadow-sm">
          <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-indigo-900">Hari Libur</h3>
            <p class="text-xs text-indigo-700 leading-relaxed mt-0.5">Hari ini adalah hari libur <strong>"{todayHoliday.name}"</strong>. Semua presensi dinonaktifkan.</p>
          </div>
        </div>
      {/if}
      <div class="flex items-center justify-between mb-2">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hari ini</p>
          <p class="text-sm font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{formatDateIndonesian(now)}</p>
        </div>
        <div class="bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
          <Clock size={14} class="text-orange-500" />
          <span class="text-sm font-bold text-slate-700 font-mono tracking-tight">{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      <AttendanceBanner isThursday={isTodayThursday} isFriday={isTodayFriday} {thursdayRule} />

      {#if activeSessions.length > 0}
        <AttendanceStats {attendance} {activeSessions} />
        <div class="flex flex-col gap-3">
          {#each activeSessions as session}
            <SessionCard {session} {now} rec={attendanceMap[session.id]} sessionLeave={isSessionOnLeave(session.id)}
                         {isWfa} onCheckIn={(sid) => openCamera(sid, 'in')} onCheckOut={(sid) => openCamera(sid, 'out')} />
          {/each}
        </div>
      {/if}

      {#if leaves.length > 0}
        <div class="mt-4">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 ml-1">Pengajuan Anda Hari Ini</p>
          <div class="flex flex-col gap-2">
            {#each leaves as leave}
              <div class="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div class="w-10 h-10 rounded-xl {leave.type === 'sakit' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} flex items-center justify-center flex-shrink-0">
                  {#if leave.type === 'sakit'}<Shield size={18} />{:else}<FileText size={18} />{/if}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-bold text-slate-800 capitalize">{leave.type}</p>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase">
                      {leave.session_id === null ? 'Semua Sesi' : SESSIONS.find(s => s.id === leave.session_id)?.name}
                    </span>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-md text-white uppercase {leave.status === 'approved' ? 'bg-green-500' : leave.status === 'rejected' ? 'bg-red-500' : 'bg-slate-400'}">
                      {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Pending'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">{leave.reason}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if attendance.some(a => a.photo_in_url || a.photo_out_url)}
        <div class="mt-4">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 ml-1">Riwayat Foto</p>
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {#each attendance as a}
              <HistoryItem record={a} session={SESSIONS.find(s => s.id === a.session_id)} onViewPhoto={(url) => { photoViewUrl = url; showPhotoView = true }} />
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </main>
</div>

{#if showPhotoView}
  <div class="fixed inset-0 z-[70] flex items-center justify-center p-5" style="background:rgba(0,0,0,0.92); backdrop-filter:blur(20px);" onclick={() => showPhotoView = false} role="dialog" aria-modal="true">
    <button class="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style="background:rgba(255,255,255,0.1);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    <img src={photoViewUrl} alt="Bukti Absensi" class="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl" />
  </div>
{/if}

{#if showLateModal}
  <LateReasonModal {lateMinutes} toleranceMin={LATE_TOLERANCE_MIN} onConfirm={confirmLate} onCancel={() => showLateModal = false} />
{/if}

{#if showLeaveModal}
  <LeaveModal sessions={activeSessions} {leaves} status={leaveStatus} {isSubmittingLeave} onSubmit={submitLeave} onClose={() => showLeaveModal = false} />
{/if}

{#if showCamera}
  <CameraModal sessionId={cameraSessionId} type={cameraType} sessions={SESSIONS} status={cameraStatus} stream={cameraStream} {capturedUrl} {isSubmitting}
               onClose={closeCamera} onTakePhoto={takePhoto} onRetake={() => { capturedBlob = null; capturedUrl = ''; cameraStatus = ''; startStream() }} onSubmit={submitPhoto} />
{/if}