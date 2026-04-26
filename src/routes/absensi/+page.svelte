<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import {
    Clock, Check, X, Camera, RotateCcw, Send,
    AlertTriangle, FileText, Lock, LogIn, LogOut,
    ChevronRight, MapPin, Shield, Eye
  } from 'lucide-svelte'

  // ── Types ──────────────────────────────────────────
  interface Profile {
    id: string
    full_name: string
    role: 'admin' | 'user'
  }

  interface AttendanceRecord {
    id: string
    session_id: number
    date: string
    check_in: string | null
    check_out: string | null
    photo_in_url: string | null
    photo_out_url: string | null
    forgot_checkout: boolean
    late: boolean
    late_reason: string | null
  }

  interface Session {
    id: number
    name: string
    start: string
    end: string
    unlockAt: string
    autoCheckoutAt: string
    hasLateCheck?: boolean
    requireLocation?: boolean
  }

  interface LeaveRecord {
    id: string
    date: string
    type: 'izin' | 'sakit'
    reason: string
    session_id: number | null
  }

  interface PenaltyRecord {
    id: string
    date: string
    session_id: number
    minutes: number
    reason: string
  }

  interface ThursdayRule {
    id: string
    date: string
    type: 'normal' | 'custom_time' | 'wfa'
    start_time?: string | null
    note?: string | null
  }

  // ── Constants ──────────────────────────────────────
  const OFFICE_LAT = -6.655905
  const OFFICE_LNG = 106.696199
  const MAX_RADIUS_M = 25
  const LATE_TOLERANCE_MIN = 5

  const SESSIONS: Session[] = [
    { id: 1, name: 'Sesi Pagi',  start: '08:00', end: '11:30', unlockAt: '06:00', autoCheckoutAt: '12:00', hasLateCheck: true, requireLocation: true },
    { id: 2, name: 'Sesi Siang', start: '13:30', end: '15:00', unlockAt: '12:00', autoCheckoutAt: '15:30', hasLateCheck: true, requireLocation: true },
    { id: 3, name: 'Sesi Sore',  start: '16:00', end: '22:00', unlockAt: '15:30', autoCheckoutAt: '22:30', hasLateCheck: true, requireLocation: true },
    { id: 4, name: 'Lembur',     start: '20:00', end: '23:59', unlockAt: '19:30', autoCheckoutAt: '23:59', requireLocation: false },
  ]

  // ── State ──────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let attendance = $state<AttendanceRecord[]>([])
  let leaves = $state<LeaveRecord[]>([])
  let penalties = $state<PenaltyRecord[]>([])
  let thursdayRule = $state<ThursdayRule | null>(null)
  let isLoading = $state(true)

  // Camera
  let showCamera = $state(false)
  let cameraSessionId = $state(0)
  let cameraType = $state<'in' | 'out'>('in')
  let cameraStream = $state<MediaStream | null>(null)
  let videoEl = $state<HTMLVideoElement | null>(null)
  let capturedBlob = $state<Blob | null>(null)
  let capturedUrl = $state('')
  let cameraStatus = $state('')
  let isSubmitting = $state(false)

  // Late
  let showLateModal = $state(false)
  let lateSessionId = $state(0)
  let lateReason = $state('')
  let lateMinutes = $state(0)

  // Leave
  let showLeaveModal = $state(false)
  let leaveType = $state<'izin' | 'sakit'>('izin')
  let leaveReason = $state('')
  let leaveSessionId = $state<number | null>(null)
  let isSubmittingLeave = $state(false)
  let leaveStatus = $state('')

  // Photo viewer
  let photoViewUrl = $state('')
  let showPhotoView = $state(false)

  // Toast
  let toastMsg = $state('')
  let toastType = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer = 0

  // Clock
  let now = $state(new Date())

  // ── Effects ────────────────────────────────────────
  $effect(() => {
    const t = setInterval(() => (now = new Date()), 30_000)
    return () => clearInterval(t)
  })

  $effect(() => {
    if (videoEl && cameraStream) videoEl.srcObject = cameraStream
  })

  // ── Computed ───────────────────────────────────────
  let attendanceMap = $derived(Object.fromEntries(attendance.map(a => [a.session_id, a])))
  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let isTodayThursday = $derived(new Date().getDay() === 4)
  let isTodayFriday   = $derived(new Date().getDay() === 5)
  // Kamis: hanya sesi Pagi (id=1). Jumat: tidak ada sesi (libur)
  let activeSessions  = $derived(
    isTodayFriday   ? [] :
    isTodayThursday ? SESSIONS.slice(0, 1) :
    SESSIONS
  )
  // Jam masuk Kamis: custom jika ada rule, default 08:00
  let thursdayStartTime = $derived(
    thursdayRule?.type === 'custom_time' && thursdayRule.start_time
      ? thursdayRule.start_time
      : '08:00'
  )

  // ── Helpers ────────────────────────────────────────
  function toMin(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  function formatTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDateIndonesian(date: Date) {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success', dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastType = type
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  /** Check apakah sesi tertentu sedang izin/sakit */
  function isSessionOnLeave(sessionId: number): LeaveRecord | null {
    // Cek leave yang berlaku untuk semua sesi (session_id = null) ATAU spesifik sesi ini
    return leaves.find(l => l.session_id === null || l.session_id === sessionId) || null
  }

  // ── Geolocation ────────────────────────────────────
  function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  async function checkLocation(): Promise<{ ok: boolean; distance?: number; error?: string }> {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve({ ok: false, error: 'Perangkat tidak mendukung GPS' })
        return
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG)
          if (dist <= MAX_RADIUS_M) resolve({ ok: true, distance: dist })
          else resolve({ ok: false, distance: dist, error: `Anda ${Math.round(dist)}m dari kantor (maks ${MAX_RADIUS_M}m)` })
        },
        err => {
          const msgs: Record<number, string> = {
            [err.PERMISSION_DENIED]: 'Akses lokasi ditolak. Aktifkan GPS.',
            [err.POSITION_UNAVAILABLE]: 'Lokasi tidak tersedia. Pastikan GPS aktif.',
            [err.TIMEOUT]: 'Timeout. Coba lagi.',
          }
          resolve({ ok: false, error: msgs[err.code] || 'Gagal mendapatkan lokasi' })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  // ── Late check ─────────────────────────────────────
  function isLate(session: Session): { late: boolean; minutes: number } {
    if (!session.hasLateCheck) return { late: false, minutes: 0 }
    const curMin = now.getHours() * 60 + now.getMinutes()
    const startMin = toMin(session.start)
    const diff = curMin - startMin
    if (diff > LATE_TOLERANCE_MIN) return { late: true, minutes: diff }
    return { late: false, minutes: 0 }
  }

  // ── Auto Checkout ──────────────────────────────────
  async function runAutoCheckout(u: User) {
    const curMin = new Date().getHours() * 60 + new Date().getMinutes()
    const today = new Date().toISOString().split('T')[0]

    for (const s of SESSIONS) {
      const autoMin = toMin(s.autoCheckoutAt)
      if (curMin < autoMin) continue

      const rec = attendance.find(a => a.session_id === s.id)
      if (rec && rec.check_in && !rec.check_out) {
        const [h, m] = s.autoCheckoutAt.split(':').map(Number)
        const checkoutTime = new Date()
        checkoutTime.setHours(h, m, 0, 0)

        const { error } = await supabase.from('attendance')
          .update({ check_out: checkoutTime.toISOString(), forgot_checkout: true })
          .eq('id', rec.id)

        if (!error) {
          await supabase.from('attendance_penalties').insert({
            user_id: u.id,
            date: today,
            session_id: s.id,
            minutes: 10,
            reason: `Lupa checkout ${s.name}`,
          })
        }
      }
    }
  }

  // ── Data ───────────────────────────────────────────
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
      supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today),
    ])

    if (profileRes.data) profile = profileRes.data
    if (attendRes.data) attendance = attendRes.data
    if (leavesRes.data) leaves = leavesRes.data
    if (penaltiesRes.data) penalties = penaltiesRes.data

    // Load thursday rule jika hari ini adalah hari Kamis
    if (new Date().getDay() === 4) {
      const { data: tr } = await supabase.from('thursday_rules').select('*').eq('date', today).single()
      thursdayRule = tr ?? null
    }

    await runAutoCheckout(u)

    // Refresh after auto checkout
    const [freshA, freshP] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', u.id).eq('date', today),
      supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today),
    ])
    if (freshA.data) attendance = freshA.data
    if (freshP.data) penalties = freshP.data

    isLoading = false
  }

  // ── Camera ─────────────────────────────────────────
  async function openCamera(sid: number, type: 'in' | 'out') {
    const session = SESSIONS.find(s => s.id === sid)!

    if (session.requireLocation !== false) {
      cameraStatus = 'Memverifikasi lokasi...'
      showCamera = true

      const loc = await checkLocation()
      if (!loc.ok) {
        closeCamera()
        showToast(loc.error || 'Lokasi tidak valid', 'error', 4000)
        return
      }
    } else {
      cameraStatus = 'Membuka kamera...'
      showCamera = true
    }

    if (type === 'in') {
      const lateInfo = isLate(session)
      if (lateInfo.late) {
        lateSessionId = sid
        lateMinutes = lateInfo.minutes
        showCamera = false
        showLateModal = true
        return
      }
    }

    cameraSessionId = sid
    cameraType = type
    capturedBlob = null
    capturedUrl = ''
    cameraStatus = ''
    isSubmitting = false
    await startStream()
  }

  async function confirmLate(withReason: string) {
    showLateModal = false
    lateReason = withReason
    cameraSessionId = lateSessionId
    cameraType = 'in'
    capturedBlob = null
    capturedUrl = ''
    cameraStatus = ''
    isSubmitting = false
    showCamera = true
    await startStream()
  }

  async function startStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 } }
      })
      cameraStream = stream
    } catch {
      showToast('Akses kamera diperlukan', 'error')
      closeCamera()
    }
  }

  function stopStream() {
    cameraStream?.getTracks().forEach(t => t.stop())
    cameraStream = null
  }

  function closeCamera() {
    stopStream()
    showCamera = false
    cameraStatus = ''
  }

  function takePhoto() {
    if (!videoEl) return
    const canvas = document.createElement('canvas')
    const vw = videoEl.videoWidth || 720
    const vh = videoEl.videoHeight || 960
    canvas.width = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')!
    // Mirror horizontal agar hasil sama seperti preview selfie
    ctx.translate(vw, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoEl, 0, 0, vw, vh)
    capturedUrl = canvas.toDataURL('image/jpeg', 0.85)
    canvas.toBlob(b => { capturedBlob = b }, 'image/jpeg', 0.75)
    stopStream()
    cameraStatus = 'Pastikan foto jelas sebelum mengirim'
  }

  async function retake() {
    capturedBlob = null
    capturedUrl = ''
    cameraStatus = ''
    await startStream()
  }

  async function submitPhoto() {
    if (!capturedBlob || !user) return
    isSubmitting = true
    cameraStatus = ''

    try {
      const path = `${user.id}/${Date.now()}_${cameraType}.jpg`
      const { error: upErr } = await supabase.storage.from('selfies').upload(path, capturedBlob, { contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(path)
      const today = new Date().toISOString().split('T')[0]

      if (cameraType === 'in') {
        const lateInfo = isLate(SESSIONS.find(s => s.id === cameraSessionId)!)
        const { error } = await supabase.from('attendance').insert({
          user_id: user.id,
          session_id: cameraSessionId,
          date: today,
          check_in: new Date().toISOString(),
          photo_in_url: publicUrl,
          late: lateInfo.late,
          late_reason: lateReason || null,
        })
        if (error) throw error
        showToast('Check-in berhasil', 'success')
      } else {
        const { error } = await supabase.from('attendance')
          .update({ check_out: new Date().toISOString(), photo_out_url: publicUrl })
          .eq('user_id', user.id)
          .eq('session_id', cameraSessionId)
          .eq('date', today)
        if (error) throw error
        showToast('Check-out berhasil', 'success')
      }

      lateReason = ''
      closeCamera()
      await loadData()
    } catch (e: unknown) {
      cameraStatus = e instanceof Error ? e.message : 'Terjadi kesalahan'
      isSubmitting = false
    }
  }

  // ── Leave ──────────────────────────────────────────
  function openLeaveModal() {
    leaveType = 'izin'
    leaveReason = ''
    leaveSessionId = null
    leaveStatus = ''
    isSubmittingLeave = false
    showLeaveModal = true
  }

  async function submitLeave() {
    if (!user) return
    if (!leaveReason.trim()) {
      leaveStatus = 'Alasan wajib diisi'
      return
    }

    // Validasi: cek apakah sudah ada leave untuk sesi ini hari ini
    if (leaveSessionId !== null) {
      const existingLeave = leaves.find(l => l.session_id === leaveSessionId)
      if (existingLeave) {
        leaveStatus = `Sudah ada izin/sakit untuk ${SESSIONS.find(s => s.id === leaveSessionId)?.name}`
        return
      }
    }

    isSubmittingLeave = true
    leaveStatus = ''

    try {
      const { error } = await supabase.from('attendance_leaves').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        type: leaveType,
        reason: leaveReason.trim(),
        session_id: leaveSessionId,
      })
      if (error) throw error
      showLeaveModal = false
      showToast(leaveType === 'izin' ? 'Izin berhasil dicatat' : 'Sakit berhasil dicatat', 'success')
      await loadData()
    } catch (e: unknown) {
      leaveStatus = e instanceof Error ? e.message : 'Gagal menyimpan'
      isSubmittingLeave = false
    }
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Presensi — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-2xl flex items-center gap-2 max-w-[90vw]"
       style="background: {toastType === 'success' ? '#16A34A' : toastType === 'error' ? '#DC2626' : '#3B82F6'}; animation: slideInUp 0.3s ease-out;">
    {#if toastType === 'success'}<Check size={16} />
    {:else if toastType === 'error'}<X size={16} />
    {:else}<AlertTriangle size={16} />{/if}
    {toastMsg}
  </div>
{/if}

<!-- Photo Viewer -->
{#if showPhotoView}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
       style="background:rgba(0,0,0,0.92); backdrop-filter:blur(20px);"
       onclick={() => showPhotoView = false} role="dialog" aria-modal="true">
    <button class="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
            style="background:rgba(255,255,255,0.1);" onclick={() => showPhotoView = false}>
      <X size={20} />
    </button>
    <img src={photoViewUrl} alt="Bukti Absensi" class="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl" />
  </div>
{/if}

<!-- Late Reason Modal -->
{#if showLateModal}
  <div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style="animation: zoomIn 0.2s ease-out;">
      <div class="px-6 py-5 border-b border-amber-100 bg-amber-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock size={18} class="text-amber-600" />
          </div>
          <div>
            <p class="text-base font-bold text-amber-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
              Terlambat {lateMinutes} Menit
            </p>
            <p class="text-xs text-amber-600 mt-0.5">Melebihi toleransi {LATE_TOLERANCE_MIN} menit</p>
          </div>
        </div>
      </div>
      <div class="px-6 py-5 flex flex-col gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Alasan Keterlambatan</label>
          <textarea bind:value={lateReason} rows="3" placeholder="Opsional — jelaskan alasan keterlambatan..."
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"></textarea>
        </div>
        <div class="flex gap-3">
          <button onclick={() => showLateModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
            Batal
          </button>
          <button onclick={() => confirmLate(lateReason)}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98]"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            Lanjutkan Absen
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Leave Modal -->
{#if showLeaveModal}
  <div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
       style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);"
       onclick={() => showLeaveModal = false}>
    <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
         onclick={(e) => e.stopPropagation()}>

      <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <span class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Pengajuan Izin / Sakit</span>
        <button onclick={() => showLeaveModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">
          <X size={14} />
        </button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-5">
        <!-- Type -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-2">Jenis Pengajuan</label>
          <div class="flex gap-3">
            {#each [['izin', 'Izin'], ['sakit', 'Sakit']] as [val, label]}
              <button onclick={() => leaveType = val as 'izin' | 'sakit'}
                      class="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                      style="background:{leaveType === val ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#F1F5F9'};
                             color:{leaveType === val ? 'white' : '#64748B'};">
                {#if val === 'izin'}<FileText size={14} />{:else}<Shield size={14} />{/if}
                {label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Session -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-2">Berlaku Untuk Sesi</label>
          <div class="flex flex-wrap gap-2">
            <button onclick={() => leaveSessionId = null}
                    class="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                    style="background:{leaveSessionId === null ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#F1F5F9'};
                           color:{leaveSessionId === null ? 'white' : '#64748B'};">
              Semua Sesi
            </button>
            {#each SESSIONS as s}
              {@const hasLeave = leaves.some(l => l.session_id === s.id)}
              <button onclick={() => leaveSessionId = s.id}
                      disabled={hasLeave}
                      class="rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style="background:{leaveSessionId === s.id ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#F1F5F9'};
                             color:{leaveSessionId === s.id ? 'white' : '#64748B'};">
                {s.name}
                {#if hasLeave}<span class="ml-1 text-[9px]">(sudah izin)</span>{/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Reason -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Alasan <span class="text-red-500">*</span></label>
          <textarea bind:value={leaveReason} rows="3" placeholder="Jelaskan alasan izin/sakit..."
                    class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
        </div>

        {#if leaveStatus}
          <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle size={14} class="text-red-500 flex-shrink-0 mt-0.5" />
            <p class="text-xs text-red-600 font-medium">{leaveStatus}</p>
          </div>
        {/if}

        <div class="flex gap-3 pb-4">
          <button onclick={() => showLeaveModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
            Batal
          </button>
          <button onclick={submitLeave} disabled={isSubmittingLeave}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {isSubmittingLeave ? 'Menyimpan...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Camera Modal -->
{#if showCamera}
  <div class="fixed inset-0 z-[55] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.92); backdrop-filter:blur(16px);">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style="animation: zoomIn 0.2s ease-out;">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-transparent">
        <div>
          <span class="text-sm font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
            {SESSIONS.find(s => s.id === cameraSessionId)?.name || 'Kamera'}
          </span>
          <span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full
                       {cameraType === 'in' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}">
            {cameraType === 'in' ? 'Check-in' : 'Check-out'}
          </span>
        </div>
        <button onclick={closeCamera}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <X size={14} />
        </button>
      </div>

      <div class="relative bg-black" style="aspect-ratio:3/4; overflow:hidden;">
        {#if capturedUrl}
          <!-- Preview hasil capture (TIDAK di-mirror) -->
          <img src={capturedUrl} alt="Preview Foto" class="w-full h-full object-cover" />
        {:else if cameraStream}
          <!-- Video live di-mirror agar natural saat selfie, tapi capture TIDAK mirror -->
          <video autoplay playsinline muted bind:this={videoEl}
                 class="w-full h-full object-cover"
                 style="transform: scaleX(-1);"></video>
          <div class="absolute inset-0 m-3 rounded-2xl border-2 border-white/20 pointer-events-none"></div>
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5"
               style="background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);">
            <Camera size={12} />
            Posisikan wajah dalam bingkai
          </div>
        {:else}
          <div class="w-full h-full flex items-center justify-center">
            <div class="text-center">
              {#if cameraStatus.includes('lokasi')}
                <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <MapPin size={20} class="text-white animate-pulse" />
                </div>
              {:else}
                <div class="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto mb-3"></div>
              {/if}
              <p class="text-sm text-slate-400">{cameraStatus || 'Mengaktifkan kamera...'}</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="px-5 pt-4 pb-5">
        {#if cameraStatus && !capturedUrl && !cameraStream}
          <!-- status shown in camera area -->
        {:else if cameraStatus && capturedUrl}
          <p class="text-center text-xs text-slate-500 mb-3">{cameraStatus}</p>
        {/if}
        <div class="flex gap-3">
          {#if capturedUrl}
            <button onclick={retake} disabled={isSubmitting}
                    class="py-3 px-5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2">
              <RotateCcw size={14} />
              Ulang
            </button>
          {/if}
          <button onclick={capturedUrl ? submitPhoto : takePhoto}
                  disabled={isSubmitting || (!capturedUrl && !cameraStream)}
                  class="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isSubmitting}
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Mengirim...
            {:else if capturedUrl}
              <Send size={14} />
              Konfirmasi
            {:else}
              <Camera size={14} />
              Ambil Foto
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Main App -->
<div class="min-h-screen" style="background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%); font-family:'Inter',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/logo-khwarizmi.png" alt="Logo" class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200 cursor-pointer" />
      <div>
        <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Presensi</span>
        <p class="text-[10px] font-medium text-orange-600 mt-0.5">{formatDateIndonesian(new Date())}</p>
      </div>
    </div>
    <button onclick={openLeaveModal}
            class="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl px-3.5 py-2.5 transition-colors border border-orange-100 cursor-pointer">
      <FileText size={14} />
      Izin / Sakit
    </button>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-32">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4"></div>
        <p class="text-sm font-medium text-slate-500">Memuat presensi...</p>
      </div>
    </div>
  {:else}
    <main class="max-w-lg mx-auto px-4 py-5 pb-20 flex flex-col gap-4 relative z-10">

      <!-- Leave Banners -->
      {#each leaves as leave}
        {@const sessionName = leave.session_id ? SESSIONS.find(s => s.id === leave.session_id)?.name : 'Semua Sesi'}
        <div class="flex items-center gap-3 rounded-xl px-4 py-3.5 border-l-4"
             style="background:{leave.type === 'sakit' ? '#FEF2F2' : '#FFF7ED'};
                    border-left-color:{leave.type === 'sakit' ? '#EF4444' : '#F97316'};">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                      {leave.type === 'sakit' ? 'bg-red-100' : 'bg-orange-100'}">
            {#if leave.type === 'sakit'}
              <Shield size={16} class="text-red-600" />
            {:else}
              <FileText size={16} class="text-orange-600" />
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold" style="color:{leave.type === 'sakit' ? '#DC2626' : '#EA580C'};">
              {leave.type === 'sakit' ? 'Sakit' : 'Izin'} — {sessionName}
            </p>
            <p class="text-xs text-slate-600 mt-0.5 truncate">{leave.reason}</p>
          </div>
        </div>
      {/each}

      <!-- Penalty Banner -->
      {#if penalties.length > 0}
        <div class="rounded-xl px-4 py-3.5 bg-amber-50 border-l-4 border-amber-400">
          <div class="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} class="text-amber-600" />
            <p class="text-[10px] font-bold uppercase tracking-widest text-amber-700">Catatan Disiplin</p>
          </div>
          {#each penalties as p}
            <p class="text-sm font-medium text-amber-700">
              {p.reason} <span class="text-amber-500 font-normal">(-{p.minutes} menit)</span>
            </p>
          {/each}
        </div>
      {/if}

      <!-- Friday / Thursday banners -->
      {#if isTodayFriday}
        <div class="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-l-4 border-violet-400"
             style="background:#F5F3FF;">
          <div class="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <span class="text-lg">🕌</span>
          </div>
          <div>
            <p class="text-sm font-bold text-violet-700">Hari Jumat — Libur Mingguan</p>
            <p class="text-xs text-violet-500 mt-0.5">Tidak ada sesi absensi hari ini. Selamat beristirahat!</p>
          </div>
        </div>
      {:else if isTodayThursday}
        <div class="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-l-4"
             style="background:{thursdayRule?.type==='wfa'?'#EFF6FF':thursdayRule?.type==='custom_time'?'#FFFBEB':'#FFF7ED'};
                    border-left-color:{thursdayRule?.type==='wfa'?'#3B82F6':thursdayRule?.type==='custom_time'?'#F59E0B':'#F97316'}">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
               style="background:{thursdayRule?.type==='wfa'?'#DBEAFE':thursdayRule?.type==='custom_time'?'#FEF3C7':'#FFEDD5'}">
            <span class="text-lg">{thursdayRule?.type==='wfa'?'🏠':thursdayRule?.type==='custom_time'?'⏰':'📅'}</span>
          </div>
          <div>
            <p class="text-sm font-bold text-slate-700">
              Hari Kamis — Hanya Sesi Pagi
              {#if thursdayRule?.type === 'wfa'} · Mode WFA{/if}
            </p>
            <p class="text-xs text-slate-500 mt-0.5">
              {#if thursdayRule?.type === 'custom_time' && thursdayRule.start_time}
                Masuk jam {thursdayRule.start_time} · Siang & Sore libur
              {:else if thursdayRule?.type === 'wfa'}
                Work From Anywhere · GPS tidak diwajibkan
              {:else}
                Sesi Siang & Sore libur otomatis
              {/if}
            </p>
            {#if thursdayRule?.note}<p class="text-[10px] text-slate-400 mt-1">📝 {thursdayRule.note}</p>{/if}
          </div>
        </div>
      {/if}

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        {#each [
          { label: 'Sesi Masuk', value: attendance.length, total: activeSessions.length, color: '#F97316', Icon: LogIn },
          { label: 'Selesai', value: attendance.filter(a => a.check_out).length, total: activeSessions.length, color: '#10B981', Icon: Check },
          { label: 'Sisa', value: Math.max(0, activeSessions.length - attendance.length), total: activeSessions.length, color: '#F59E0B', Icon: Clock },
        ] as stat}
          <div class="bg-white/90 rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <div class="flex items-center justify-center gap-1.5 mb-2">
              <svelte:component this={stat.Icon} size={14} style="color:{stat.color};" />
              <span class="text-[9px] font-bold text-slate-400 uppercase">{stat.label}</span>
            </div>
            <p class="text-2xl font-bold" style="color:{stat.color}; font-family:'Plus Jakarta Sans',sans-serif;">
              {stat.value}<span class="text-sm font-medium text-slate-300">/{stat.total}</span>
            </p>
          </div>
        {/each}
      </div>

      <!-- Session Cards -->
      <div class="flex flex-col gap-2.5">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Jadwal Sesi</p>

        {#if isTodayFriday}
          <div class="bg-white/90 rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
            <span class="text-3xl block mb-2">🕌</span>
            <p class="text-sm font-semibold text-slate-500">Tidak ada sesi hari Jumat</p>
            <p class="text-xs text-slate-400 mt-1">Selamat menikmati hari libur mingguan</p>
          </div>
        {:else}
          {#each activeSessions as s}
          {@const curMin = now.getHours() * 60 + now.getMinutes()}
          {@const startMin = toMin(s.start)}
          {@const endMin = toMin(s.end)}
          {@const unlockMin = toMin(s.unlockAt)}
          {@const rec = attendanceMap[s.id]}
          {@const isLocked = curMin < unlockMin}
          {@const isExpired = !rec && curMin > endMin + 30}
          {@const inWindow = curMin >= startMin && curMin <= endMin}
          {@const pct = rec && !rec.check_out && inWindow
            ? Math.min(Math.round(((curMin - startMin) / (endMin - startMin)) * 100), 100)
            : 0}
          {@const sessionLeave = isSessionOnLeave(s.id)}

          <div class="bg-white/90 rounded-2xl p-4 shadow-sm border border-slate-100 transition-all hover:shadow-md"
               style={isLocked && s.id !== 4 ? 'opacity:0.5;' : ''}>
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.name}</p>
                  {#if rec?.late}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Terlambat</span>
                  {/if}
                  {#if rec?.forgot_checkout}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Lupa Checkout</span>
                  {/if}
                </div>
                <p class="text-xs text-slate-400">{s.start} – {s.id === 4 ? 'Selesai' : s.end}</p>

                {#if isLocked && s.id !== 4}
                  <p class="mt-2 text-xs text-orange-400 flex items-center gap-1">
                    <Lock size={11} />
                    Buka pukul {s.unlockAt}
                  </p>
                {/if}

                {#if rec}
                  <div class="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span class="flex items-center gap-1"><LogIn size={11} /> {formatTime(rec.check_in)}</span>
                    {#if rec.check_out}
                      <span class="flex items-center gap-1"><LogOut size={11} /> {formatTime(rec.check_out)}</span>
                    {/if}
                  </div>
                  {#if rec.late && rec.late_reason}
                    <p class="mt-1 text-xs text-amber-500">Alasan: {rec.late_reason}</p>
                  {/if}
                {/if}

                {#if pct > 0}
                  <div class="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                         style="width:{pct}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
                  </div>
                {/if}
              </div>

              <div class="ml-3 flex-shrink-0">
                {#if sessionLeave}
                  <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap
                               {sessionLeave.type === 'sakit' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}">
                    {sessionLeave.type === 'sakit' ? 'Sakit' : 'Izin'}
                  </span>
                {:else if isLocked && s.id !== 4}
                  <span class="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Lock size={12} />
                  </span>
                {:else if rec?.forgot_checkout}
                  <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-orange-100 text-orange-600">Lupa</span>
                {:else if rec?.check_out}
                  <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 flex items-center gap-1">
                    <Check size={11} /> Selesai
                  </span>
                {:else if rec}
                  <button onclick={() => openCamera(s.id, 'out')}
                          class="text-[10px] font-bold px-3 py-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors flex items-center gap-1">
                    <LogOut size={11} />
                    Checkout
                  </button>
                {:else if isExpired}
                  <span class="text-[10px] font-semibold text-slate-400">Terlewat</span>
                {:else}
                  <button onclick={() => openCamera(s.id, 'in')}
                          class="text-[10px] font-bold px-3 py-2 rounded-lg text-white transition-all active:scale-95 flex items-center gap-1"
                          style="background: linear-gradient(135deg, #F97316, #EA580C);">
                    <LogIn size={11} />
                    Check-in
                  </button>
                {/if}
              </div>
            </div>
          </div>
          {/each}
        {/if}
      </div>

      <!-- History -->
      {#if attendance.length > 0}
        <div class="flex flex-col gap-2.5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Riwayat Absensi</p>

          <div class="bg-white/90 rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
            {#each attendance as rec}
              {@const sesi = SESSIONS.find(s => s.id === rec.session_id)}

              {#if rec.photo_in_url}
                <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <img src={rec.photo_in_url} alt="Check-in"
                       onclick={() => { photoViewUrl = rec.photo_in_url!; showPhotoView = true }}
                       onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
                       class="w-12 h-12 flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover hover:scale-105 transition-transform" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-800">{sesi?.name}</p>
                    <p class="text-xs font-medium mt-0.5 {rec.late ? 'text-amber-600' : 'text-green-600'}">
                      {rec.late ? 'Terlambat' : 'Tepat Waktu'}
                    </p>
                    <p class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {formatTime(rec.check_in)}
                      <span class="mx-1">·</span>
                      <Eye size={10} /> Ketuk untuk perbesar
                    </p>
                  </div>
                  <span class="text-[9px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex-shrink-0">IN</span>
                </div>
              {/if}

              {#if rec.photo_out_url}
                <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <img src={rec.photo_out_url} alt="Check-out"
                       onclick={() => { photoViewUrl = rec.photo_out_url!; showPhotoView = true }}
                       onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
                       class="w-12 h-12 flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover hover:scale-105 transition-transform" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-slate-800">{sesi?.name}</p>
                    <p class="text-xs font-medium text-orange-600 mt-0.5">Check-out</p>
                    <p class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} /> {formatTime(rec.check_out)}
                    </p>
                  </div>
                  <span class="text-[9px] font-bold px-2 py-1 rounded-lg bg-green-50 text-green-600 border border-green-200 flex-shrink-0">OUT</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <p class="text-center text-[9px] text-slate-400 pt-3">
        © {new Date().getFullYear()} Workspace Khwarizmi · v1.0.0
      </p>
    </main>
  {/if}
</div>

<style>
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideInUp {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes zoomIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>