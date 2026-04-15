<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'

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

  // ── Constants ──────────────────────────────────────
  const OFFICE_LAT   = -6.655905
  const OFFICE_LNG   = 106.696199
  const MAX_RADIUS_M = 10

  const SESSIONS: Session[] = [
    { id: 1, name: 'Sesi Pagi',  start: '08:00', end: '11:30', unlockAt: '06:00', autoCheckoutAt: '12:00', hasLateCheck: true  },
    { id: 2, name: 'Sesi Siang', start: '13:30', end: '15:00', unlockAt: '12:00', autoCheckoutAt: '15:30', hasLateCheck: true  },
    { id: 3, name: 'Sesi Sore',  start: '16:00', end: '22:00', unlockAt: '15:30', autoCheckoutAt: '18:00', hasLateCheck: true  },
    { id: 4, name: 'Overtime',   start: '20:00', end: '23:59', unlockAt: '19:30', autoCheckoutAt: '23:59' },
  ]

  const LATE_TOLERANCE_MIN = 5

  // ── State ──────────────────────────────────────────
  let user       = $state<User | null>(null)
  let profile    = $state<Profile | null>(null)
  let attendance = $state<AttendanceRecord[]>([])
  let leaves     = $state<LeaveRecord[]>([])
  let penalties  = $state<PenaltyRecord[]>([])
  let isLoading  = $state(true)

  // Camera
  let showCamera      = $state(false)
  let cameraSessionId = $state(0)
  let cameraType      = $state<'in' | 'out'>('in')
  let cameraStream    = $state<MediaStream | null>(null)
  let videoEl         = $state<HTMLVideoElement | null>(null)
  let capturedBlob    = $state<Blob | null>(null)
  let capturedUrl     = $state('')
  let cameraStatus    = $state('')
  let isSubmitting    = $state(false)

  // Late modal
  let showLateModal  = $state(false)
  let lateSessionId  = $state(0)
  let lateReason     = $state('')
  let lateMinutes    = $state(0)

  // Leave modal
  let showLeaveModal    = $state(false)
  let leaveType         = $state<'izin' | 'sakit'>('izin')
  let leaveReason       = $state('')
  let leaveSessionId    = $state<number | null>(null)
  let isSubmittingLeave = $state(false)
  let leaveStatus       = $state('')

  // Photo viewer
  let photoViewUrl  = $state('')
  let showPhotoView = $state(false)

  // Toast
  let toastMsg     = $state('')
  let toastVisible = $state(false)
  let toastTimer   = 0

  // Clock
  let now = $state(new Date())

  // ── Effects ────────────────────────────────────────
  $effect(() => {
    const t = setInterval(() => now = new Date(), 30_000)
    return () => clearInterval(t)
  })

  $effect(() => {
    if (videoEl && cameraStream) videoEl.srcObject = cameraStream
  })

  // ── Computed ───────────────────────────────────────
  let attendanceMap = $derived(
    Object.fromEntries(attendance.map(a => [a.session_id, a]))
  )

  let todayLeave = $derived(
    leaves.find(l => l.date === new Date().toISOString().split('T')[0])
  )

  // ── Helpers ────────────────────────────────────────
  function toMin(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  function formatTime(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function showToast(msg: string, dur = 2500) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  // ── Geolocation ────────────────────────────────────
  function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R    = 6_371_000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a    = Math.sin(dLat/2)**2 +
                 Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                 Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  async function checkLocation(): Promise<{ ok: boolean; distance?: number; error?: string }> {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve({ ok: false, error: 'Browser tidak mendukung GPS' })
        return
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const dist = haversineMeters(
            pos.coords.latitude, pos.coords.longitude,
            OFFICE_LAT, OFFICE_LNG
          )
          if (dist <= MAX_RADIUS_M) {
            resolve({ ok: true, distance: dist })
          } else {
            resolve({ ok: false, distance: dist,
              error: `Kamu berada ${Math.round(dist)} m dari kantor. Maksimal ${MAX_RADIUS_M} m.` })
          }
        },
        err => {
          const msg = err.code === 1
            ? 'Izin lokasi ditolak. Aktifkan GPS terlebih dahulu.'
            : 'Gagal mendapatkan lokasi, coba lagi.'
          resolve({ ok: false, error: msg })
        },
        { enableHighAccuracy: true, timeout: 10_000 }
      )
    })
  }

  // ── Late check ─────────────────────────────────────
  function isLate(session: Session): { late: boolean; minutes: number } {
    if (!session.hasLateCheck) return { late: false, minutes: 0 }
    const curMin   = now.getHours() * 60 + now.getMinutes()
    const startMin = toMin(session.start)
    const diff     = curMin - startMin
    if (diff > LATE_TOLERANCE_MIN) return { late: true, minutes: diff }
    return { late: false, minutes: 0 }
  }

  // ── Auto Checkout ──────────────────────────────────
  async function runAutoCheckout(u: NonNullable<typeof user>) {
    const curMin = new Date().getHours() * 60 + new Date().getMinutes()
    const today  = new Date().toISOString().split('T')[0]

    for (const s of SESSIONS) {
      const autoMin = toMin(s.autoCheckoutAt)
      if (curMin < autoMin) continue

      const rec = attendance.find(a => a.session_id === s.id)
      if (rec && rec.check_in && !rec.check_out) {
        const [h, m] = s.autoCheckoutAt.split(':').map(Number)
        const checkoutTime = new Date()
        checkoutTime.setHours(h, m, 0, 0)

        const { error } = await supabase.from('attendance').update({
          check_out:       checkoutTime.toISOString(),
          forgot_checkout: true,
        }).eq('user_id', u.id)
          .eq('session_id', s.id)
          .eq('date', today)

        if (!error) {
          await supabase.from('attendance_penalties').insert({
            user_id:    u.id,
            date:       today,
            session_id: s.id,
            minutes:    10,
            reason:     `Lupa checkout sesi ${s.name}`,
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

    if (profileRes.data)   profile    = profileRes.data
    if (attendRes.data)    attendance = attendRes.data
    if (leavesRes.data)    leaves     = leavesRes.data
    if (penaltiesRes.data) penalties  = penaltiesRes.data

    await runAutoCheckout(u)

    const [freshAttend, freshPenalties] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', u.id).eq('date', today),
      supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today),
    ])
    if (freshAttend.data)    attendance = freshAttend.data
    if (freshPenalties.data) penalties  = freshPenalties.data

    isLoading = false
  }

  // ── Camera ─────────────────────────────────────────
  async function openCamera(sid: number, type: 'in' | 'out') {
    cameraStatus = '📍 Memeriksa lokasi...'
    showCamera   = true

    const loc = await checkLocation()
    if (!loc.ok) {
      closeCamera()
      showToast(`⚠ ${loc.error}`, 4000)
      return
    }

    const session = SESSIONS.find(s => s.id === sid)!
    if (type === 'in') {
      const lateInfo = isLate(session)
      if (lateInfo.late) {
        lateSessionId = sid
        lateMinutes   = lateInfo.minutes
        showCamera    = false
        showLateModal = true
        return
      }
    }

    cameraSessionId = sid
    cameraType      = type
    capturedBlob    = null
    capturedUrl     = ''
    cameraStatus    = ''
    isSubmitting    = false
    await startStream()
  }

  async function confirmLate(withReason: string) {
    showLateModal   = false
    lateReason      = withReason
    cameraSessionId = lateSessionId
    cameraType      = 'in'
    capturedBlob    = null
    capturedUrl     = ''
    cameraStatus    = ''
    isSubmitting    = false
    showCamera      = true
    await startStream()
  }

  async function startStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 } }
      })
      cameraStream = stream
    } catch {
      showToast('Aktifkan izin kamera terlebih dahulu')
      closeCamera()
    }
  }

  function stopStream() {
    cameraStream?.getTracks().forEach(t => t.stop())
    cameraStream = null
  }

  function closeCamera() {
    stopStream()
    showCamera   = false
    cameraStatus = ''
  }

  function takePhoto() {
    if (!videoEl) return
    const canvas = document.createElement('canvas')
    canvas.width  = videoEl.videoWidth  || 720
    canvas.height = videoEl.videoHeight || 960
    canvas.getContext('2d')!.drawImage(videoEl, 0, 0)
    capturedUrl = canvas.toDataURL('image/jpeg', 0.85)
    canvas.toBlob(b => { capturedBlob = b }, 'image/jpeg', 0.75)
    stopStream()
    cameraStatus = 'Pastikan wajah terlihat jelas sebelum mengirim'
  }

  async function retake() {
    capturedBlob = null
    capturedUrl  = ''
    cameraStatus = ''
    await startStream()
  }

  async function submitPhoto() {
    if (!capturedBlob || !user) return
    isSubmitting = true
    cameraStatus = ''

    try {
      const path = `${user.id}/${Date.now()}_${cameraType}.jpg`
      const { error: upErr } = await supabase.storage
        .from('selfies').upload(path, capturedBlob, { contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(path)
      const today = new Date().toISOString().split('T')[0]

      if (cameraType === 'in') {
        const lateInfo = isLate(SESSIONS.find(s => s.id === cameraSessionId)!)
        const { error } = await supabase.from('attendance').insert({
          user_id:      user.id,
          session_id:   cameraSessionId,
          date:         today,
          check_in:     new Date().toISOString(),
          photo_in_url: publicUrl,
          late:         lateInfo.late,
          late_reason:  lateReason || null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('attendance').update({
          check_out:     new Date().toISOString(),
          photo_out_url: publicUrl,
        }).eq('user_id', user.id)
          .eq('session_id', cameraSessionId)
          .eq('date', today)
        if (error) throw error
      }

      lateReason = ''
      closeCamera()
      showToast(cameraType === 'in' ? '✓ Check-IN berhasil!' : '✓ Check-OUT berhasil!')
      await loadData()
    } catch (e: unknown) {
      cameraStatus = e instanceof Error ? e.message : 'Terjadi kesalahan, coba lagi'
      isSubmitting = false
    }
  }

  // ── Leave ──────────────────────────────────────────
  function openLeaveModal() {
    leaveType         = 'izin'
    leaveReason       = ''
    leaveSessionId    = null
    leaveStatus       = ''
    isSubmittingLeave = false
    showLeaveModal    = true
  }

  async function submitLeave() {
    if (!user) return
    if (!leaveReason.trim()) { leaveStatus = 'Alasan wajib diisi.'; return }
    isSubmittingLeave = true
    leaveStatus = ''

    try {
      const { error } = await supabase.from('attendance_leaves').insert({
        user_id:    user.id,
        date:       new Date().toISOString().split('T')[0],
        type:       leaveType,
        reason:     leaveReason.trim(),
        session_id: leaveSessionId,
      })
      if (error) throw error
      showLeaveModal = false
      showToast(`✓ ${leaveType === 'izin' ? 'Izin' : 'Sakit'} berhasil dicatat!`)
      await loadData()
    } catch (e: unknown) {
      leaveStatus = e instanceof Error ? e.message : 'Gagal menyimpan, coba lagi'
      isSubmittingLeave = false
    }
  }

  // ── Lifecycle ──────────────────────────────────────
  onMount(loadData)
</script>

<svelte:head>
  <title>Absensi — Khwarizmi Hub</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold text-white shadow-lg"
       style="background:#0f172a;font-family:'DM Sans',sans-serif;white-space:nowrap;">
    {toastMsg}
  </div>
{/if}

<!-- Photo Viewer -->
{#if showPhotoView}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-5"
       style="background:rgba(0,0,0,0.92);"
       onclick={() => showPhotoView = false}
       role="dialog" aria-modal="true">
    <button class="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl"
            style="background:rgba(255,255,255,0.15);"
            onclick={() => showPhotoView = false}>✕</button>
    <img src={photoViewUrl} alt="Bukti absensi" class="max-w-full max-h-[90vh] rounded-2xl object-contain" />
  </div>
{/if}

<!-- Late Reason Modal -->
{#if showLateModal}
  <div class="fixed inset-0 z-40 flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);">
    <div class="w-full max-w-sm rounded-3xl overflow-hidden bg-white">
      <div class="px-5 py-4 border-b border-slate-100 bg-amber-50">
        <p class="text-sm font-bold text-amber-700" style="font-family:'Syne',sans-serif;">
          ⚠ Kamu Terlambat {lateMinutes} Menit
        </p>
        <p class="text-[11px] text-amber-500 mt-0.5">
          Lebih dari {LATE_TOLERANCE_MIN} menit dari jam masuk sesi
        </p>
      </div>
      <div class="px-5 py-5 flex flex-col gap-3">
        <div>
          <label class="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-1.5">
            Alasan Keterlambatan <span class="text-slate-300 normal-case tracking-normal">(opsional)</span>
          </label>
          <textarea
            bind:value={lateReason}
            rows="3"
            placeholder="Contoh: macet, hujan, dll..."
            class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
            style="font-family:'DM Sans',sans-serif;"></textarea>
        </div>
        <div class="flex gap-2">
          <button onclick={() => showLateModal = false}
                  class="px-5 py-3.5 rounded-2xl text-xs font-bold tracking-wide uppercase
                         bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  style="font-family:'DM Sans',sans-serif;">
            Batal
          </button>
          <button onclick={() => confirmLate(lateReason)}
                  class="flex-1 py-3.5 rounded-2xl text-xs font-bold tracking-widest uppercase
                         text-white transition-all active:scale-[0.98]"
                  style="background:#b45309;font-family:'DM Sans',sans-serif;">
            Lanjut Absen
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Leave Modal -->
{#if showLeaveModal}
  <div class="fixed inset-0 z-40 flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);">
    <div class="w-full max-w-sm rounded-3xl overflow-hidden bg-white">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <span class="text-xs font-bold tracking-widest uppercase text-slate-700"
              style="font-family:'DM Sans',sans-serif;">
          Izin / Sakit
        </span>
        <button onclick={() => showLeaveModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400">
          ✕
        </button>
      </div>
      <div class="px-5 py-5 flex flex-col gap-4">

        <!-- Tipe -->
        <div>
          <label class="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2">Jenis</label>
          <div class="flex gap-2">
            {#each [{ v: 'izin', label: '🙏 Izin', color: '#3b82f6' }, { v: 'sakit', label: '🤒 Sakit', color: '#ef4444' }] as opt}
              <button onclick={() => leaveType = opt.v as 'izin' | 'sakit'}
                      class="flex-1 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all"
                      style="font-family:'DM Sans',sans-serif;
                             background:{leaveType === opt.v ? opt.color : '#f1f5f9'};
                             color:{leaveType === opt.v ? 'white' : '#94a3b8'};">
                {opt.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Sesi (opsional) -->
        <div>
          <label class="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2">
            Berlaku untuk sesi <span class="text-slate-300 normal-case tracking-normal">(opsional, kosong = seharian)</span>
          </label>
          <div class="flex flex-wrap gap-1.5">
            <button onclick={() => leaveSessionId = null}
                    class="px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all"
                    style="background:{leaveSessionId === null ? '#0f172a' : '#f1f5f9'};
                           color:{leaveSessionId === null ? 'white' : '#94a3b8'};
                           font-family:'DM Sans',sans-serif;">
              Semua
            </button>
            {#each SESSIONS as s}
              <button onclick={() => leaveSessionId = s.id}
                      class="px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all"
                      style="background:{leaveSessionId === s.id ? '#0f172a' : '#f1f5f9'};
                             color:{leaveSessionId === s.id ? 'white' : '#94a3b8'};
                             font-family:'DM Sans',sans-serif;">
                {s.name}
              </button>
            {/each}
          </div>
        </div>

        <!-- Alasan -->
        <div>
          <label class="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-1.5">
            Alasan <span class="text-red-400">*</span>
          </label>
          <textarea
            bind:value={leaveReason}
            rows="3"
            placeholder="Tulis alasan izin atau sakit..."
            class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            style="font-family:'DM Sans',sans-serif;"></textarea>
        </div>

        {#if leaveStatus}
          <p class="text-xs text-red-500 font-semibold -mt-1">{leaveStatus}</p>
        {/if}

        <div class="flex gap-2">
          <button onclick={() => showLeaveModal = false}
                  class="px-5 py-3.5 rounded-2xl text-xs font-bold tracking-wide uppercase
                         bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  style="font-family:'DM Sans',sans-serif;">
            Batal
          </button>
          <button onclick={submitLeave}
                  disabled={isSubmittingLeave}
                  class="flex-1 py-3.5 rounded-2xl text-xs font-bold tracking-widest uppercase text-white
                         transition-all active:scale-[0.98] disabled:opacity-60"
                  style="background:#0f172a;font-family:'DM Sans',sans-serif;">
            {#if isSubmittingLeave}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menyimpan...
              </span>
            {:else}
              ✓ Simpan
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Camera Modal -->
{#if showCamera}
  <div class="fixed inset-0 z-40 flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);">
    <div class="w-full max-w-sm rounded-3xl overflow-hidden bg-white">

      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <span class="text-xs font-bold tracking-widest uppercase text-slate-700"
              style="font-family:'DM Sans',sans-serif;">
          {SESSIONS.find(s => s.id === cameraSessionId)?.name} · {cameraType === 'in' ? 'Check-IN' : 'Check-OUT'}
        </span>
        <button onclick={closeCamera}
                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
          ✕
        </button>
      </div>

      <div class="relative bg-black" style="aspect-ratio:3/4;overflow:hidden;">
        {#if capturedUrl}
          <img src={capturedUrl} alt="Preview selfie" class="w-full h-full object-cover" />
        {:else if cameraStream}
          <video autoplay playsinline muted bind:this={videoEl} class="w-full h-full object-cover"></video>
          <div class="absolute inset-0 pointer-events-none"
               style="border:24px solid rgba(0,0,0,0.35);border-radius:60px;"></div>
          <div class="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-[10px] font-bold tracking-widest uppercase"
               style="background:rgba(0,0,0,0.5);white-space:nowrap;">
            Posisikan wajah dalam bingkai
          </div>
        {:else}
          <div class="w-full h-full flex items-center justify-center">
            <div class="text-center text-white">
              <svg class="animate-spin w-8 h-8 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <p class="text-xs font-semibold text-slate-400">{cameraStatus || 'Memuat kamera...'}</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="px-5 pt-4 pb-5 bg-slate-50">
        {#if cameraStatus && cameraStream}
          <p class="text-xs font-medium text-center mb-3"
             class:text-red-500={cameraStatus.includes('kesalahan')}
             class:text-slate-500={!cameraStatus.includes('kesalahan')}>
            {cameraStatus}
          </p>
        {/if}
        <div class="flex gap-2">
          {#if capturedUrl}
            <button onclick={retake} disabled={isSubmitting}
                    class="px-5 py-4 rounded-2xl text-xs font-bold tracking-wide uppercase
                           bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    style="font-family:'DM Sans',sans-serif;">
              ↺ Ulangi
            </button>
          {/if}
          <button onclick={capturedUrl ? submitPhoto : takePhoto}
                  disabled={isSubmitting || (!capturedUrl && !cameraStream)}
                  class="flex-1 py-4 rounded-2xl text-xs font-bold tracking-widest uppercase text-white
                         transition-all active:scale-[0.98] disabled:opacity-60"
                  style="background:#0f172a;font-family:'DM Sans',sans-serif;">
            {#if isSubmitting}
              <span class="inline-flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Mengirim...
              </span>
            {:else if capturedUrl}
              ✓ Kirim Absensi
            {:else}
              📷 Ambil Foto
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Main -->
<div class="min-h-screen" style="background:#f0f2f5;font-family:'DM Sans',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3">
    <a href="/"
       class="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
        <path d="M19 12H5M12 19l-7-7 7-7" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </a>
    <div class="flex-1">
      <h1 class="text-sm font-bold text-slate-900 leading-none" style="font-family:'Syne',sans-serif;">Absensi</h1>
      <p class="text-[10px] font-semibold text-slate-400 tracking-wide mt-0.5">
        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
    <button onclick={openLeaveModal}
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase
                   bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            style="font-family:'DM Sans',sans-serif;">
      🙏 Izin / Sakit
    </button>
  </header>

  {#if isLoading}
    <div class="flex items-center justify-center py-32">
      <svg class="animate-spin w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
    </div>
  {:else}
  <main class="max-w-lg mx-auto px-4 py-5 pb-12 flex flex-col gap-5">

    <!-- Leave Banner -->
    {#if todayLeave}
      <div class="rounded-2xl px-5 py-4 flex items-center gap-3 border"
           style="background:{todayLeave.type === 'sakit' ? '#fef2f2' : '#eff6ff'};
                  border-color:{todayLeave.type === 'sakit' ? '#fecaca' : '#bfdbfe'};">
        <span class="text-2xl">{todayLeave.type === 'sakit' ? '🤒' : '🙏'}</span>
        <div>
          <p class="text-sm font-bold"
             style="color:{todayLeave.type === 'sakit' ? '#dc2626' : '#2563eb'};">
            {todayLeave.type === 'sakit' ? 'Sakit Hari Ini' : 'Izin Hari Ini'}
            {#if todayLeave.session_id}
              · {SESSIONS.find(s => s.id === todayLeave.session_id)?.name}
            {/if}
          </p>
          <p class="text-[11px] text-slate-500 mt-0.5">{todayLeave.reason}</p>
        </div>
      </div>
    {/if}

    <!-- Penalty Banner -->
    {#if penalties.length > 0}
      <div class="rounded-2xl px-5 py-4 border border-orange-200 bg-orange-50">
        <p class="text-[10px] font-bold tracking-widest uppercase text-orange-400 mb-1.5">⚠ Catatan Penalty</p>
        {#each penalties as p}
          <p class="text-xs font-semibold text-orange-600">
            -{p.minutes} menit · {p.reason}
          </p>
        {/each}
      </div>
    {/if}

    <!-- Summary Strip -->
    <div class="grid grid-cols-3 gap-3">
      {#each [
        { label: 'Sesi Masuk',   value: attendance.length,                          color: '#3b82f6' },
        { label: 'Sesi Selesai', value: attendance.filter(a => a.check_out).length, color: '#22c55e' },
        { label: 'Sisa Sesi',    value: Math.max(0, 4 - attendance.length),         color: '#f59e0b' },
      ] as stat}
        <div class="bg-white rounded-2xl px-4 py-3.5 border border-slate-100">
          <p class="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">{stat.label}</p>
          <p class="text-2xl font-bold" style="color:{stat.color};font-family:'Syne',sans-serif;">
            {stat.value}<span class="text-xs font-medium text-slate-300">/4</span>
          </p>
        </div>
      {/each}
    </div>

    <!-- Session Cards -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="w-1 h-4 rounded-full bg-blue-500"></span>
        <p class="text-[11px] font-bold tracking-widest uppercase text-slate-400">Jadwal Sesi</p>
      </div>

      <div class="flex flex-col gap-2.5">
        {#each SESSIONS as s}
          {@const curMin    = now.getHours() * 60 + now.getMinutes()}
          {@const startMin  = toMin(s.start)}
          {@const endMin    = toMin(s.end)}
          {@const unlockMin = toMin(s.unlockAt)}
          {@const rec       = attendanceMap[s.id]}

          {@const isLocked  = curMin < unlockMin}
          {@const isExpired = !rec && curMin > endMin + 30}
          {@const inWindow  = curMin >= startMin && curMin <= endMin}
          {@const pct = rec && !rec.check_out && inWindow
            ? Math.min(Math.round(((curMin - startMin) / (endMin - startMin)) * 100), 100)
            : 0}

          {@const isOnLeave = !!todayLeave && (
            todayLeave.session_id === null || todayLeave.session_id === s.id
          )}

          <div class="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 border border-slate-100 transition-opacity"
               style="{isLocked ? 'opacity:0.4;' : ''}">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-bold text-slate-900">{s.name}</p>
                {#if s.id === 4}
                  <span class="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full
                               bg-amber-50 text-amber-600 border border-amber-200">OT</span>
                {/if}
              </div>
              <p class="text-[11px] font-semibold tracking-wide uppercase text-slate-400 mt-0.5">
                {s.start} – {s.id === 4 ? 'Selesai' : s.end}
              </p>
              {#if isLocked}
                <p class="text-[10px] font-semibold text-slate-300 mt-1">
                  Terbuka pukul {s.unlockAt}
                </p>
              {/if}
              {#if rec}
                <p class="text-[10px] font-semibold mt-1"
                   class:text-slate-400={!rec.forgot_checkout && !rec.late}
                   class:text-orange-500={rec.forgot_checkout}
                   class:text-amber-600={rec.late && !rec.forgot_checkout}>
                  IN: {formatTime(rec.check_in)}{rec.check_out ? ' · OUT: ' + formatTime(rec.check_out) : ''}
                  {#if rec.late}· ⏰ Terlambat{#if rec.late_reason} ({rec.late_reason}){/if}{/if}
                  {#if rec.forgot_checkout}· ⚠ Lupa Checkout{/if}
                </p>
              {/if}
              {#if pct > 0}
                <div class="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-green-400 rounded-full transition-all duration-500" style="width:{pct}%"></div>
                </div>
              {/if}
            </div>

            {#if isOnLeave}
              <span class="px-3 py-1.5 rounded-full text-[11px] font-bold text-center leading-tight"
                    style="background:{todayLeave!.type === 'sakit' ? '#fef2f2' : '#eff6ff'};
                           color:{todayLeave!.type === 'sakit' ? '#dc2626' : '#2563eb'};
                           border:1px solid {todayLeave!.type === 'sakit' ? '#fecaca' : '#bfdbfe'};">
                {todayLeave!.type === 'sakit' ? '🤒 Sakit' : '🙏 Izin'}
              </span>
            {:else if isLocked}
              <span class="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-300">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2"/>
                </svg>
                Terkunci
              </span>
            {:else if rec?.forgot_checkout}
              <span class="px-3 py-1.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-500 border border-orange-200 text-center leading-tight">
                ⚠ Lupa<br/>Checkout
              </span>
            {:else if rec?.check_out}
              <span class="px-3 py-1.5 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-200">
                ✓ Selesai
              </span>
            {:else if rec}
              <button onclick={() => openCamera(s.id, 'out')}
                      class="px-4 py-2.5 rounded-xl text-[11px] font-bold tracking-wide uppercase
                             bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                      style="font-family:'DM Sans',sans-serif;">
                Check-OUT
              </button>
            {:else if isExpired}
              <span class="text-[10px] font-bold tracking-widest uppercase text-slate-300">Kadaluarsa</span>
            {:else}
              <button onclick={() => openCamera(s.id, 'in')}
                      class="px-4 py-2.5 rounded-xl text-[11px] font-bold tracking-wide uppercase
                             text-white hover:opacity-90 transition-opacity"
                      style="background:{s.id === 4 ? '#92400e' : '#0f172a'};font-family:'DM Sans',sans-serif;">
                Check-IN
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- History -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="w-1 h-4 rounded-full bg-blue-500"></span>
        <p class="text-[11px] font-bold tracking-widest uppercase text-slate-400">Bukti & Riwayat Hari Ini</p>
      </div>

      <div class="bg-white rounded-2xl overflow-hidden border border-slate-100">
        {#if attendance.length === 0}
          <div class="py-12 text-center">
            <p class="text-slate-300 text-sm font-semibold">Belum ada riwayat hari ini</p>
          </div>
        {:else}
          {#each attendance as rec}
            {@const sesi = SESSIONS.find(s => s.id === rec.session_id)}

            {#if rec.photo_in_url}
              <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0">
                <img src="{rec.photo_in_url}"
                     alt="Foto check-in"
                     onclick={() => { photoViewUrl = rec.photo_in_url!; showPhotoView = true }}
                     onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
                     class="w-14 h-14 rounded-2xl object-cover cursor-pointer border border-slate-100
                            hover:scale-105 transition-transform flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-900">{sesi?.name}</p>
                  <p class="text-xs font-semibold mt-0.5"
                     class:text-green-500={!rec.late}
                     class:text-amber-500={rec.late}>
                    {rec.late ? '⏰ Terlambat' : 'Check-IN Terverifikasi'}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{formatTime(rec.check_in)} · Tap foto untuk perbesar</p>
                  {#if rec.late && rec.late_reason}
                    <p class="text-[10px] text-amber-400 mt-0.5">Alasan: {rec.late_reason}</p>
                  {/if}
                </div>
                <span class="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase
                             bg-green-50 text-green-600 border border-green-200 flex-shrink-0">IN</span>
              </div>
            {/if}

            {#if rec.photo_out_url}
              <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0">
                <img src="{rec.photo_out_url}"
                     alt="Foto check-out"
                     onclick={() => { photoViewUrl = rec.photo_out_url!; showPhotoView = true }}
                     onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
                     class="w-14 h-14 rounded-2xl object-cover cursor-pointer border border-slate-100
                            hover:scale-105 transition-transform flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-900">{sesi?.name}</p>
                  <p class="text-xs font-semibold text-blue-500 mt-0.5">Check-OUT Terverifikasi</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{formatTime(rec.check_out)} · Tap foto untuk perbesar</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase
                             bg-blue-50 text-blue-600 border border-blue-200 flex-shrink-0">OUT</span>
              </div>
            {/if}

            {#if !rec.photo_in_url && !rec.photo_out_url}
              <div class="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0">
                <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-dashed border-slate-200
                            flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#cbd5e1" stroke-width="1.5"/>
                    <path d="M21 15l-5-5L5 21" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900">{sesi?.name}</p>
                  <p class="text-xs font-semibold text-slate-400 mt-0.5">Tanpa foto</p>
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      </div>
    </div>

  </main>
  {/if}
</div>