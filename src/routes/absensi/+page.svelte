<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import toast from 'svelte-french-toast'
  import { Eye, Clock, Shield, FileText } from 'lucide-svelte'
  
  import AppHeader from '$lib/components/shared/AppHeader.svelte'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  
  import AttendanceBanner from '$lib/components/absensi/AttendanceBanner.svelte'
  import AttendanceStats from '$lib/components/absensi/AttendanceStats.svelte'
  import SessionCard from '$lib/components/absensi/SessionCard.svelte'
  import HistoryItem from '$lib/components/absensi/HistoryItem.svelte'
  import CameraModal from '$lib/components/absensi/CameraModal.svelte'
  import LateReasonModal from '$lib/components/absensi/LateReasonModal.svelte'
  import LeaveModal from '$lib/components/absensi/LeaveModal.svelte'

  interface Profile { id: string; full_name: string; role: 'admin' | 'user' }
  interface AttendanceRecord { id: string; session_id: number; date: string; check_in: string | null; check_out: string | null; photo_in_url: string | null; photo_out_url: string | null; forgot_checkout: boolean; late: boolean; late_reason: string | null }
  interface Session { id: number; name: string; start: string; end: string; unlockAt: string; autoCheckoutAt: string; hasLateCheck?: boolean; requireLocation?: boolean }
  interface LeaveRecord { id: string; date: string; type: 'izin' | 'sakit'; reason: string; session_id: number | null }
  interface PenaltyRecord { id: string; date: string; session_id: number; minutes: number; reason: string }
  interface ThursdayRule { id: string; date: string; type: 'normal' | 'custom_time' | 'wfa'; start_time?: string | null; note?: string | null }

  const OFFICE_LAT = -6.655905, OFFICE_LNG = 106.696199, MAX_RADIUS_M = 25, LATE_TOLERANCE_MIN = 5
  const SESSIONS: Session[] = [
    { id: 1, name: 'Sesi Pagi',  start: '08:00', end: '11:30', unlockAt: '06:00', autoCheckoutAt: '12:00', hasLateCheck: true, requireLocation: true },
    { id: 2, name: 'Sesi Siang', start: '13:30', end: '15:00', unlockAt: '12:00', autoCheckoutAt: '15:30', hasLateCheck: true, requireLocation: true },
    { id: 3, name: 'Sesi Sore',  start: '16:00', end: '22:00', unlockAt: '15:30', autoCheckoutAt: '22:30', hasLateCheck: true, requireLocation: true },
    { id: 4, name: 'Lembur',     start: '20:00', end: '23:59', unlockAt: '19:30', autoCheckoutAt: '23:59', requireLocation: false },
  ]

  let user = $state<User | null>(null), profile = $state<Profile | null>(null), attendance = $state<AttendanceRecord[]>([]), leaves = $state<LeaveRecord[]>([]), penalties = $state<PenaltyRecord[]>([]), thursdayRule = $state<ThursdayRule | null>(null), isLoading = $state(true)
  let showCamera = $state(false), cameraSessionId = $state(0), cameraType = $state<'in' | 'out'>('in'), cameraStream = $state<MediaStream | null>(null), capturedBlob = $state<Blob | null>(null), capturedUrl = $state(''), cameraStatus = $state(''), isSubmitting = $state(false)
  let showLateModal = $state(false), lateSessionId = $state(0), lateReason = $state(''), lateMinutes = $state(0)
  let showLeaveModal = $state(false), isSubmittingLeave = $state(false), leaveStatus = $state('')
  let photoViewUrl = $state(''), showPhotoView = $state(false)
  let now = $state(new Date())

  $effect(() => { const t = setInterval(() => (now = new Date()), 30_000); return () => clearInterval(t) })

  let attendanceMap = $derived(Object.fromEntries(attendance.map(a => [a.session_id, a])))
  let isTodayThursday = $derived(new Date().getDay() === 4), isTodayFriday = $derived(new Date().getDay() === 5)
  let activeSessions = $derived(isTodayFriday ? [] : isTodayThursday ? SESSIONS.slice(0, 1) : SESSIONS)
  let isWfa = $derived(isTodayThursday && thursdayRule?.type === 'wfa')

  function toMin(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + m }
  function isSessionOnLeave(sessionId: number) { return leaves.find(l => l.session_id === null || l.session_id === sessionId) || null }
  function formatDateIndonesian(date: Date) { return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }

  function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  async function checkLocation(): Promise<{ ok: boolean; distance?: number; error?: string }> {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve({ ok: false, error: 'Perangkat tidak mendukung GPS' })
      navigator.geolocation.getCurrentPosition(
        pos => {
          const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG)
          if (dist <= MAX_RADIUS_M) resolve({ ok: true, distance: dist })
          else resolve({ ok: false, distance: dist, error: `Anda ${Math.round(dist)}m dari kantor (maks ${MAX_RADIUS_M}m)` })
        },
        err => resolve({ ok: false, error: err.code === 1 ? 'Akses lokasi ditolak. Aktifkan GPS.' : err.code === 2 ? 'Lokasi tidak tersedia. Pastikan GPS aktif.' : 'Gagal mendapatkan lokasi' }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
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
    const curMin = new Date().getHours() * 60 + new Date().getMinutes(), today = new Date().toISOString().split('T')[0]
    for (const s of SESSIONS) {
      if (curMin < toMin(s.autoCheckoutAt)) continue
      const rec = attendance.find(a => a.session_id === s.id)
      if (rec && rec.check_in && !rec.check_out) {
        const [h, m] = s.autoCheckoutAt.split(':').map(Number); const checkoutTime = new Date(); checkoutTime.setHours(h, m, 0, 0)
        const { error } = await supabase.from('attendance').update({ check_out: checkoutTime.toISOString(), forgot_checkout: true }).eq('id', rec.id)
        if (!error) await supabase.from('attendance_penalties').insert({ user_id: u.id, date: today, session_id: s.id, minutes: 10, reason: `Lupa checkout ${s.name}` })
      }
    }
  }

  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u
    const today = new Date().toISOString().split('T')[0]
    const [profileRes, attendRes, leavesRes, penaltiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('attendance').select('*').eq('user_id', u.id).eq('date', today),
      supabase.from('attendance_leaves').select('*').eq('user_id', u.id).eq('date', today),
      supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today)
    ])
    if (profileRes.data) profile = profileRes.data; if (attendRes.data) attendance = attendRes.data; if (leavesRes.data) leaves = leavesRes.data; if (penaltiesRes.data) penalties = penaltiesRes.data
    if (new Date().getDay() === 4) { const { data } = await supabase.from('thursday_rules').select('*').eq('date', today).single(); thursdayRule = data || null }
    await runAutoCheckout(u)
    const freshA = await supabase.from('attendance').select('*').eq('user_id', u.id).eq('date', today), freshP = await supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today)
    if (freshA.data) attendance = freshA.data; if (freshP.data) penalties = freshP.data
    isLoading = false
  }

  async function openCamera(sid: number, type: 'in' | 'out') {
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
      const path = `${user.id}/${Date.now()}_${cameraType}.jpg`
      await supabase.storage.from('selfies').upload(path, capturedBlob, { contentType: 'image/jpeg' })
      const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(path)
      const today = new Date().toISOString().split('T')[0]
      if (cameraType === 'in') {
        const lateInfo = checkIsLate(SESSIONS.find(s => s.id === cameraSessionId)!)
        await supabase.from('attendance').insert({ user_id: user.id, session_id: cameraSessionId, date: today, check_in: new Date().toISOString(), photo_in_url: publicUrl, late: lateInfo.late, late_reason: lateReason || null })
        toast.success('Check-in berhasil')
      } else {
        await supabase.from('attendance').update({ check_out: new Date().toISOString(), photo_out_url: publicUrl }).eq('user_id', user.id).eq('session_id', cameraSessionId).eq('date', today)
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
      await supabase.from('attendance_leaves').insert({ user_id: user.id, date: new Date().toISOString().split('T')[0], type: data.type, reason: data.reason.trim(), session_id: data.sessionId })
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

      <AttendanceBanner {isThursday} {isFriday} {thursdayRule} />

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