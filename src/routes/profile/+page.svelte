<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { User } from '@supabase/supabase-js'
  import {
    Smartphone, MapPin, Mail, Briefcase,
    CalendarDays, UserRound,
    ClipboardList, Bell, Clock,
    ChevronRight, LogOut, ZoomIn, ZoomOut, RotateCcw,
    Camera, Lock, ShieldCheck, KeyRound, Eye, EyeOff,
    CheckCircle2, AlertCircle, Pencil
  } from 'lucide-svelte'

  interface Profile {
    id: string
    full_name: string
    role: 'admin' | 'user'
    avatar_url?: string | null
    phone?: string | null
    address?: string | null
    joined_at?: string | null
    birth_date?: string | null
    position?: string | null
  }

  interface Task {
    id: string
    status: 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
    created_by: string
  }

  // ── State ─────────────────────────────────────────────
  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let isLoading = $state(true)
  let isSaving = $state(false)

  // Modals
  let showEditModal = $state(false)
  let showPasswordModal = $state(false)
  let showEmailModal = $state(false)
  let showLogoutModal = $state(false)

  // Avatar
  let avatarPreview = $state<string | null>(null)
  let croppedBlob = $state<Blob | null>(null)
  let uploadingAvatar = $state(false)

  // Cropper
  let showCropper = $state(false)
  let cropSourceUrl = $state<string | null>(null)
  let cropImage = $state<HTMLImageElement | null>(null)
  let cropScale = $state(1)
  let cropMinScale = $state(1)
  let cropOffsetX = $state(0)
  let cropOffsetY = $state(0)
  let isDragging = $state(false)
  let dragStartX = 0
  let dragStartY = 0
  let lastTouchDistance = 0

  const CROP_SIZE = 280
  const OUTPUT_SIZE = 512

  // Stats
  let attendanceSummary = $state({ total_days: 0 })
  let taskSummary = $state({ total: 0, done: 0, in_progress: 0, todo: 0, review: 0 })

  // Edit profile form
  let editName = $state('')
  let editPhone = $state('')
  let editAddress = $state('')
  let editJoinedAt = $state('')
  let editBirthDate = $state('')
  let editPosition = $state('')

  // Password form
  let currentPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let showCurrentPw = $state(false)
  let showNewPw = $state(false)
  let passwordError = $state('')
  let isChangingPassword = $state(false)

  // Email form
  let newEmail = $state('')
  let emailPassword = $state('')
  let emailError = $state('')
  let emailSuccess = $state(false)
  let isChangingEmail = $state(false)

  // Toast
  let toastMsg = $state('')
  let toastType = $state<'success' | 'error' | 'info'>('success')
  let toastVisible = $state(false)
  let toastTimer = 0

  const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', user: 'Karyawan' }

  // ── Helpers ───────────────────────────────────────────
  function getInitials(name: string) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function getCompletionRate() {
    if (taskSummary.total === 0) return 0
    return Math.round((taskSummary.done / taskSummary.total) * 100)
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatMonthYear(iso: string | null | undefined) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  }

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success', dur = 3000) {
    clearTimeout(toastTimer)
    toastMsg = msg
    toastType = type
    toastVisible = true
    toastTimer = setTimeout(() => toastVisible = false, dur) as unknown as number
  }

  function passwordStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0
    if (pw.length >= 8) score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 2) return { score, label: 'Lemah', color: '#EF4444' }
    if (score <= 3) return { score, label: 'Cukup', color: '#F59E0B' }
    if (score <= 4) return { score, label: 'Baik', color: '#3B82F6' }
    return { score, label: 'Kuat', color: '#22C55E' }
  }

  let pwStrength = $derived(passwordStrength(newPassword))

  // ── Load Data ─────────────────────────────────────────
  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u

    const [profileRes, attendRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('attendance').select('date').eq('user_id', u.id),
    ])

    if (profileRes.data) {
      profile = profileRes.data
      avatarPreview = profile?.avatar_url || null
    }

    if (attendRes.data) {
      attendanceSummary.total_days = new Set(attendRes.data.map((a: any) => a.date)).size
    }

    const { data: myAssignments } = await supabase
      .from('task_assignments').select('task_id').eq('user_id', u.id)

    const assignedTaskIds = (myAssignments || []).map(a => a.task_id)

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, status, created_by')
      .or(`id.in.(${assignedTaskIds.length ? assignedTaskIds.join(',') : '""'}),created_by.eq.${u.id}`)

    if (tasksData) {
      const t = tasksData as Task[]
      taskSummary = {
        total: t.length,
        done: t.filter(x => x.status === 'done').length,
        in_progress: t.filter(x => x.status === 'in_progress').length,
        review: t.filter(x => x.status === 'review' || x.status === 'revision').length,
        todo: t.filter(x => x.status === 'not_started').length,
      }
    }

    isLoading = false
  }

  // ── Cropper Logic ─────────────────────────────────────
  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 10MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      cropSourceUrl = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        cropImage = img
        const scale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height)
        cropMinScale = scale
        cropScale = scale
        cropOffsetX = 0
        cropOffsetY = 0
        showCropper = true
      }
      img.src = cropSourceUrl
    }
    reader.readAsDataURL(file)
    target.value = ''
  }

  function clampOffset() {
    if (!cropImage) return
    const scaledW = cropImage.width * cropScale
    const scaledH = cropImage.height * cropScale
    const maxX = (scaledW - CROP_SIZE) / 2
    const maxY = (scaledH - CROP_SIZE) / 2
    cropOffsetX = Math.max(-maxX, Math.min(maxX, cropOffsetX))
    cropOffsetY = Math.max(-maxY, Math.min(maxY, cropOffsetY))
  }

  function onPointerDown(e: PointerEvent) {
    isDragging = true
    dragStartX = e.clientX - cropOffsetX
    dragStartY = e.clientY - cropOffsetY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return
    cropOffsetX = e.clientX - dragStartX
    cropOffsetY = e.clientY - dragStartY
    clampOffset()
  }
  function onPointerUp(e: PointerEvent) {
    isDragging = false
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setScale(cropScale + delta * cropScale)
  }
  function setScale(newScale: number) {
    cropScale = Math.max(cropMinScale, Math.min(cropMinScale * 4, newScale))
    clampOffset()
  }
  function zoomIn()  { setScale(cropScale * 1.15) }
  function zoomOut() { setScale(cropScale / 1.15) }
  function resetCrop() { cropScale = cropMinScale; cropOffsetX = 0; cropOffsetY = 0 }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy)
    }
  }
  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastTouchDistance > 0) {
        const ratio = dist / lastTouchDistance
        setScale(cropScale * ratio)
      }
      lastTouchDistance = dist
    }
  }

  async function applyCrop() {
    if (!cropImage) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const outScale = OUTPUT_SIZE / CROP_SIZE
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    ctx.save()
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2)
    const drawW = cropImage.width * cropScale * outScale
    const drawH = cropImage.height * cropScale * outScale
    const drawX = cropOffsetX * outScale - drawW / 2
    const drawY = cropOffsetY * outScale - drawH / 2
    ctx.drawImage(cropImage, drawX, drawY, drawW, drawH)
    ctx.restore()

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    })

    if (blob) {
      croppedBlob = blob
      if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
      avatarPreview = URL.createObjectURL(blob)
    }
    closeCropper()
  }

  function closeCropper() {
    showCropper = false
    cropSourceUrl = null
    cropImage = null
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!croppedBlob || !user) return profile?.avatar_url || null
    uploadingAvatar = true
    const filePath = `${user.id}/${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' })
    if (error) { uploadingAvatar = false; return null }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    uploadingAvatar = false
    return data.publicUrl
  }

  // ── Save Profile ──────────────────────────────────────
  async function saveProfile() {
    if (!user || !editName.trim()) {
      showToast('Nama tidak boleh kosong', 'error')
      return
    }
    isSaving = true
    const finalAvatarUrl = await uploadAvatar()
    const { error } = await supabase.from('profiles')
      .update({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        avatar_url: finalAvatarUrl,
        joined_at: editJoinedAt || null,
        birth_date: editBirthDate || null,
        position: editPosition.trim() || null,
      })
      .eq('id', user.id)

    isSaving = false
    if (error) {
      showToast('Gagal menyimpan perubahan', 'error')
      return
    }
    profile = {
      ...profile!,
      full_name: editName.trim(),
      avatar_url: finalAvatarUrl,
      phone: editPhone.trim() || null,
      address: editAddress.trim() || null,
      joined_at: editJoinedAt || null,
      birth_date: editBirthDate || null,
      position: editPosition.trim() || null,
    }
    croppedBlob = null
    showEditModal = false
    showToast('Profil berhasil diperbarui', 'success')
  }

  function openEdit() {
    editName = profile?.full_name || ''
    editPhone = profile?.phone || ''
    editAddress = profile?.address || ''
    editJoinedAt = profile?.joined_at || ''
    editBirthDate = profile?.birth_date || ''
    editPosition = profile?.position || ''
    avatarPreview = profile?.avatar_url || null
    croppedBlob = null
    showEditModal = true
  }

  // ── Password Change ───────────────────────────────────
  function openPasswordModal() {
    currentPassword = ''
    newPassword = ''
    confirmPassword = ''
    passwordError = ''
    showPasswordModal = true
  }

  async function changePassword() {
    passwordError = ''

    if (!currentPassword || !newPassword || !confirmPassword) {
      passwordError = 'Semua field wajib diisi'
      return
    }
    if (newPassword.length < 8) {
      passwordError = 'Password minimal 8 karakter'
      return
    }
    if (newPassword !== confirmPassword) {
      passwordError = 'Konfirmasi password tidak cocok'
      return
    }
    if (currentPassword === newPassword) {
      passwordError = 'Password baru harus berbeda dengan yang lama'
      return
    }

    isChangingPassword = true

    // Reauth dengan password lama
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    })
    if (authError) {
      passwordError = 'Password lama tidak benar'
      isChangingPassword = false
      return
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    isChangingPassword = false

    if (updateError) {
      passwordError = updateError.message
      return
    }

    showPasswordModal = false
    showToast('Password berhasil diubah', 'success')
  }

  // ── Email Change ──────────────────────────────────────
  function openEmailModal() {
    newEmail = ''
    emailPassword = ''
    emailError = ''
    emailSuccess = false
    showEmailModal = true
  }

  async function changeEmail() {
    emailError = ''
    emailSuccess = false

    if (!newEmail.trim() || !emailPassword) {
      emailError = 'Semua field wajib diisi'
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail.trim())) {
      emailError = 'Format email tidak valid'
      return
    }
    if (newEmail.trim() === user?.email) {
      emailError = 'Email baru sama dengan email saat ini'
      return
    }

    isChangingEmail = true

    // Reauth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: emailPassword,
    })
    if (authError) {
      emailError = 'Password tidak benar'
      isChangingEmail = false
      return
    }

    // Update email (Supabase akan kirim email konfirmasi)
    const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() })
    isChangingEmail = false

    if (updateError) {
      emailError = updateError.message
      return
    }

    emailSuccess = true
    showToast('Link konfirmasi dikirim ke email baru', 'info', 4000)
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Profil — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Toast -->
{#if toastVisible}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-3 rounded-xl text-sm font-medium text-white shadow-2xl flex items-center gap-2 max-w-[90vw]"
       style="background: {toastType === 'success' ? '#16A34A' : toastType === 'error' ? '#DC2626' : '#3B82F6'}; animation: slideInUp 0.3s ease-out;">
    {#if toastType === 'success'}<CheckCircle2 size={16} />
    {:else if toastType === 'error'}<AlertCircle size={16} />
    {:else}<AlertCircle size={16} />{/if}
    {toastMsg}
  </div>
{/if}

<div class="min-h-screen pb-28 bg-[#FFF9F0]" style="font-family:'Inter',sans-serif;">

  <!-- Header -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center gap-3">
    <a href="/" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-orange-50 transition-colors cursor-pointer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </a>
    <div class="flex-1">
      <span class="font-bold text-slate-900 text-base" style="font-family:'Plus Jakarta Sans',sans-serif;">Pengaturan</span>
      <p class="text-[10px] text-slate-500 mt-0.5">Kelola profil & keamanan akun</p>
    </div>
  </header>

  {#if isLoading}
    <div class="flex flex-col items-center justify-center py-40 gap-3">
      <div class="w-8 h-8 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin"></div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memuat...</p>
    </div>
  {:else}

    {@const rate = getCompletionRate()}

    <main class="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

      <!-- ── Hero Profile ───────────────────────────────── -->
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
        <div class="flex items-center gap-4">
          <button onclick={openEdit}
                  class="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md group cursor-pointer"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);"
                  aria-label="Ubah foto profil">
            {#if profile?.avatar_url}
              <img src={profile.avatar_url} alt="Avatar" class="w-full h-full object-cover" />
            {:else}
              <span class="text-2xl font-black text-white" style="font-family:'Plus Jakarta Sans',sans-serif;">{getInitials(profile?.full_name || '')}</span>
            {/if}
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={18} class="text-white" />
            </div>
          </button>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-bold text-slate-900 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{profile?.full_name}</h2>
            <p class="text-xs font-semibold text-orange-500 mt-0.5 truncate">
              {profile?.position || (profile?.role === 'admin' ? 'Administrator' : '')}
            </p>
            <div class="flex items-center gap-1.5 mt-2 flex-wrap">
              {#if profile?.role === 'admin'}
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                  <ShieldCheck size={10} />
                  Administrator
                </span>
              {/if}
              {#if profile?.joined_at}
                <span class="text-[10px] text-slate-400">{profile?.role === 'admin' ? '•' : ''} Sejak {formatMonthYear(profile.joined_at)}</span>
              {/if}
            </div>
          </div>
        </div>

        <button
          onclick={openEdit}
          class="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
          <Pencil size={14} />
          Edit Profil
        </button>
      </div>

      <!-- ── Stats ─────────────────────────────────────── -->
      <div class="grid grid-cols-3 gap-3">
        {#each [
          { label: 'Total Tugas', val: taskSummary.total, color: '#F97316' },
          { label: 'Diselesaikan', val: taskSummary.done, color: '#16A34A' },
          { label: 'Hari Hadir', val: attendanceSummary.total_days, color: '#2563EB' },
        ] as s}
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 text-center">
            <p class="text-2xl font-black" style="color:{s.color}; font-family:'Plus Jakarta Sans',sans-serif;">{s.val}</p>
            <p class="text-[10px] font-semibold text-slate-400 mt-1">{s.label}</p>
          </div>
        {/each}
      </div>

      <!-- ── Progress Tugas ────────────────────────────── -->
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-bold text-slate-700" style="font-family:'Plus Jakarta Sans',sans-serif;">Progress Tugas</p>
          <span class="text-sm font-bold text-orange-500">{rate}%</span>
        </div>
        <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div class="h-full rounded-full transition-all duration-700"
               style="width:{rate}%; background: linear-gradient(90deg, #F97316, #FBBF24);"></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each [
            { label: 'Selesai', val: taskSummary.done, dot: '#22C55E' },
            { label: 'Dikerjakan', val: taskSummary.in_progress, dot: '#3B82F6' },
            { label: 'Review', val: taskSummary.review, dot: '#A855F7' },
            { label: 'Belum Mulai', val: taskSummary.todo, dot: '#CBD5E1' },
          ] as item}
            <div class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:{item.dot};"></div>
                <span class="text-xs text-slate-500">{item.label}</span>
              </div>
              <span class="text-sm font-bold text-slate-700">{item.val}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- ── SECTION: Informasi Pribadi ─────────────────── -->
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">Informasi Pribadi</p>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
          {#each [
            { Icon: Briefcase, label: 'Posisi', val: profile?.position },
            { Icon: CalendarDays, label: 'Tanggal Bergabung', val: formatDate(profile?.joined_at) },
            { Icon: UserRound, label: 'Tanggal Lahir', val: formatDate(profile?.birth_date) },
          ] as row}
            <div class="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
              <div class="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                <svelte:component this={row.Icon} size={16} class="text-slate-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{row.label}</p>
                <p class="text-sm font-medium mt-0.5 truncate"
                   style="color:{row.val ? '#1e293b' : '#94a3b8'}; font-style:{row.val ? 'normal' : 'italic'};">
                  {row.val || 'Belum diisi'}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- ── SECTION: Informasi Kontak ──────────────────── -->
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">Informasi Kontak</p>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
          {#each [
            { Icon: Mail, label: 'Email', val: user?.email },
            { Icon: Smartphone, label: 'WhatsApp', val: profile?.phone },
            { Icon: MapPin, label: 'Alamat', val: profile?.address },
          ] as row}
            <div class="flex items-start gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
              <div class="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svelte:component this={row.Icon} size={16} class="text-slate-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{row.label}</p>
                <p class="text-sm font-medium mt-0.5 leading-relaxed break-all"
                   style="color:{row.val ? '#1e293b' : '#94a3b8'}; font-style:{row.val ? 'normal' : 'italic'};">
                  {row.val || 'Belum diisi'}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- ── SECTION: Keamanan Akun ─────────────────────── -->
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">Keamanan Akun</p>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
          <button onclick={openEmailModal}
                  class="w-full flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 hover:bg-orange-50/40 transition-colors text-left cursor-pointer">
            <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail size={16} class="text-blue-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-800">Ganti Email</p>
              <p class="text-[11px] text-slate-500 mt-0.5 truncate">{user?.email}</p>
            </div>
            <ChevronRight size={16} class="text-slate-300 flex-shrink-0" />
          </button>

          <button onclick={openPasswordModal}
                  class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50/40 transition-colors text-left cursor-pointer">
            <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <KeyRound size={16} class="text-purple-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-800">Ganti Password</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Ubah password akun Anda</p>
            </div>
            <ChevronRight size={16} class="text-slate-300 flex-shrink-0" />
          </button>
        </div>
      </div>

      <!-- ── SECTION: Navigasi Cepat ────────────────────── -->
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">Navigasi</p>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
          {#each [
            { Icon: ClipboardList, label: 'Daftar Tugas', href: '/tasks', color: 'text-orange-600', bg: 'bg-orange-50' },
            { Icon: Bell, label: 'Notifikasi', href: '/notifications', color: 'text-amber-600', bg: 'bg-amber-50' },
            { Icon: Clock, label: 'Kehadiran', href: '/absensi', color: 'text-green-600', bg: 'bg-green-50' },
          ] as nav}
            <a href={nav.href}
               class="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg {nav.bg} flex items-center justify-center">
                  <svelte:component this={nav.Icon} size={16} class={nav.color} />
                </div>
                <span class="text-sm font-semibold text-slate-700">{nav.label}</span>
              </div>
              <ChevronRight size={16} class="text-slate-300" />
            </a>
          {/each}
        </div>
      </div>

      <!-- ── Sign Out ───────────────────────────────────── -->
      <button
        onclick={() => showLogoutModal = true}
        class="w-full py-3.5 mt-2 rounded-2xl text-sm font-semibold text-red-500 bg-white border border-red-100 hover:bg-red-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
        <LogOut size={15} />
        Keluar dari Akun
      </button>

    </main>
  {/if}
</div>

<!-- ════════════════════════════════════════════════════════ -->
<!--  Edit Profile Modal                                      -->
<!-- ════════════════════════════════════════════════════════ -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-end justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showEditModal = false}>
    <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); max-height:92vh; overflow-y:auto;"
         onclick={(e) => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100 sticky top-4 bg-white z-10">
        <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Edit Profil</span>
        <button onclick={() => showEditModal = false}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 text-sm cursor-pointer">✕</button>
      </div>

      <div class="px-6 py-5 flex flex-col gap-5">

        <!-- Avatar -->
        <div class="flex flex-col items-center gap-3">
          <div class="relative w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg"
               style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if avatarPreview}
              <img src={avatarPreview} alt="Preview" class="w-full h-full object-cover" />
            {:else}
              <span class="text-3xl font-black text-white" style="font-family:'Plus Jakarta Sans',sans-serif;">{getInitials(editName || '')}</span>
            {/if}
          </div>
          <label class="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 transition-colors flex items-center gap-2">
            <Camera size={13} />
            {croppedBlob ? 'Ganti Foto' : avatarPreview ? 'Ubah Foto' : 'Pilih Foto'}
            <input type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
          </label>
          {#if croppedBlob}
            <span class="text-[10px] text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={11} /> Foto siap disimpan
            </span>
          {/if}
        </div>

        <div class="h-px bg-slate-100"></div>

        <!-- Sections -->
        <div class="flex flex-col gap-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Diri</p>

          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Nama Lengkap <span class="text-red-500">*</span></label>
            <input bind:value={editName} placeholder="Nama lengkap"
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Posisi</label>
            <input bind:value={editPosition} placeholder="Contoh: Frontend Developer"
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-slate-500 block mb-1.5">Tgl Bergabung</label>
              <input type="date" bind:value={editJoinedAt}
                     class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-500 block mb-1.5">Tgl Lahir</label>
              <input type="date" bind:value={editBirthDate}
                     class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
        </div>

        <div class="h-px bg-slate-100"></div>

        <div class="flex flex-col gap-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontak</p>

          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">WhatsApp</label>
            <input bind:value={editPhone} placeholder="08xx-xxxx-xxxx" type="tel"
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Alamat</label>
            <textarea bind:value={editAddress} rows="2" placeholder="Alamat domisili..."
                      class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"></textarea>
          </div>
        </div>

        <div class="flex gap-3 pt-2 pb-6">
          <button onclick={() => showEditModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
            Batal
          </button>
          <button onclick={saveProfile} disabled={isSaving || uploadingAvatar}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98] cursor-pointer"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if isSaving || uploadingAvatar}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                {uploadingAvatar ? 'Mengupload foto...' : 'Menyimpan...'}
              </span>
            {:else}
              Simpan Perubahan
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  Change Password Modal                                   -->
<!-- ════════════════════════════════════════════════════════ -->
{#if showPasswordModal}
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showPasswordModal = false}>
    <div class="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); max-height:92vh; overflow-y:auto;"
         onclick={(e) => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1 sm:hidden sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <div class="px-6 pt-5 pb-4 border-b border-slate-100">
        <div class="flex items-start justify-between mb-3">
          <div class="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
            <Lock size={18} class="text-purple-600" />
          </div>
          <button onclick={() => showPasswordModal = false}
                  class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 text-sm cursor-pointer">✕</button>
        </div>
        <h3 class="font-bold text-slate-800 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Ganti Password</h3>
        <p class="text-xs text-slate-500 mt-1">Pastikan password baru Anda aman dan mudah diingat.</p>
      </div>

      <div class="px-6 py-5 flex flex-col gap-4">

        <!-- Current Password -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Password Saat Ini</label>
          <div class="relative">
            <input type={showCurrentPw ? 'text' : 'password'} bind:value={currentPassword}
                   placeholder="Masukkan password saat ini"
                   class="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <button type="button" onclick={() => showCurrentPw = !showCurrentPw}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              {#if showCurrentPw}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
          </div>
        </div>

        <!-- New Password -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Password Baru</label>
          <div class="relative">
            <input type={showNewPw ? 'text' : 'password'} bind:value={newPassword}
                   placeholder="Minimal 8 karakter"
                   class="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <button type="button" onclick={() => showNewPw = !showNewPw}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              {#if showNewPw}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
            </button>
          </div>
          {#if newPassword}
            <div class="mt-2">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] text-slate-500">Kekuatan password</span>
                <span class="text-[10px] font-bold" style="color:{pwStrength.color};">{pwStrength.label}</span>
              </div>
              <div class="flex gap-1">
                {#each [1,2,3,4,5] as i}
                  <div class="flex-1 h-1 rounded-full transition-colors"
                       style="background:{i <= pwStrength.score ? pwStrength.color : '#E2E8F0'};"></div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Konfirmasi Password Baru</label>
          <input type={showNewPw ? 'text' : 'password'} bind:value={confirmPassword}
                 placeholder="Ulangi password baru"
                 class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400" />
          {#if confirmPassword && newPassword !== confirmPassword}
            <p class="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> Password tidak cocok
            </p>
          {/if}
        </div>

        {#if passwordError}
          <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertCircle size={14} class="text-red-500 flex-shrink-0 mt-0.5" />
            <p class="text-xs text-red-600 font-medium">{passwordError}</p>
          </div>
        {/if}

        <div class="flex gap-3 pt-1 pb-6">
          <button onclick={() => showPasswordModal = false}
                  class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
            Batal
          </button>
          <button onclick={changePassword} disabled={isChangingPassword}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98] cursor-pointer"
                  style="background: linear-gradient(135deg, #A855F7, #7C3AED);">
            {#if isChangingPassword}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Mengubah...
              </span>
            {:else}
              Ubah Password
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  Change Email Modal                                      -->
<!-- ════════════════════════════════════════════════════════ -->
{#if showEmailModal}
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showEmailModal = false}>
    <div class="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); max-height:92vh; overflow-y:auto;"
         onclick={(e) => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1 sm:hidden sticky top-0 bg-white z-10">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <div class="px-6 pt-5 pb-4 border-b border-slate-100">
        <div class="flex items-start justify-between mb-3">
          <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <Mail size={18} class="text-blue-600" />
          </div>
          <button onclick={() => showEmailModal = false}
                  class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 text-sm cursor-pointer">✕</button>
        </div>
        <h3 class="font-bold text-slate-800 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Ganti Email</h3>
        <p class="text-xs text-slate-500 mt-1">Kami akan mengirim link konfirmasi ke email baru Anda.</p>
      </div>

      <div class="px-6 py-5 flex flex-col gap-4">

        {#if emailSuccess}
          <div class="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 size={16} class="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-semibold text-green-700">Link konfirmasi terkirim</p>
              <p class="text-xs text-green-600 mt-1 leading-relaxed">
                Buka inbox email <strong>{newEmail}</strong> dan klik link konfirmasi untuk menyelesaikan perubahan.
              </p>
            </div>
          </div>
        {:else}
          <!-- Email saat ini -->
          <div class="bg-slate-50 rounded-xl px-4 py-3">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Saat Ini</p>
            <p class="text-sm font-medium text-slate-700 break-all">{user?.email}</p>
          </div>

          <!-- Email baru -->
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Email Baru</label>
            <input type="email" bind:value={newEmail} placeholder="email.baru@example.com"
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <!-- Password konfirmasi -->
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">Password Saat Ini</label>
            <input type="password" bind:value={emailPassword} placeholder="Masukkan password untuk verifikasi"
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <p class="text-[10px] text-slate-400 mt-1.5">Diperlukan untuk memverifikasi identitas Anda</p>
          </div>

          {#if emailError}
            <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <AlertCircle size={14} class="text-red-500 flex-shrink-0 mt-0.5" />
              <p class="text-xs text-red-600 font-medium">{emailError}</p>
            </div>
          {/if}
        {/if}

        <div class="flex gap-3 pt-1 pb-6">
          {#if emailSuccess}
            <button onclick={() => showEmailModal = false}
                    class="w-full py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] cursor-pointer"
                    style="background: linear-gradient(135deg, #3B82F6, #2563EB);">
              Tutup
            </button>
          {:else}
            <button onclick={() => showEmailModal = false}
                    class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
              Batal
            </button>
            <button onclick={changeEmail} disabled={isChangingEmail}
                    class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98] cursor-pointer"
                    style="background: linear-gradient(135deg, #3B82F6, #2563EB);">
              {#if isChangingEmail}
                <span class="flex items-center justify-center gap-2">
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Mengirim...
                </span>
              {:else}
                Kirim Link Konfirmasi
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  Cropper Modal                                           -->
<!-- ════════════════════════════════════════════════════════ -->
{#if showCropper}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4"
       style="background:rgba(0,0,0,0.85); backdrop-filter:blur(4px);">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
         style="animation: fadeIn 0.25s ease-out;">

      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 class="font-bold text-slate-800 text-base" style="font-family:'Plus Jakarta Sans',sans-serif;">Sesuaikan Foto</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">Geser & zoom untuk menyesuaikan</p>
        </div>
        <button onclick={closeCropper}
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 text-sm cursor-pointer">✕</button>
      </div>

      <div class="p-5 flex flex-col items-center gap-4 bg-slate-900">
        <div class="relative overflow-hidden rounded-2xl select-none touch-none"
             style="width:{CROP_SIZE}px; height:{CROP_SIZE}px; background:#0f172a;"
             onpointerdown={onPointerDown}
             onpointermove={onPointerMove}
             onpointerup={onPointerUp}
             onpointercancel={onPointerUp}
             onwheel={onWheel}
             ontouchstart={onTouchStart}
             ontouchmove={onTouchMove}>
          {#if cropImage && cropSourceUrl}
            {@const displayW = Math.round(cropImage.width * cropScale)}
            {@const displayH = Math.round(cropImage.height * cropScale)}
            <img src={cropSourceUrl} alt="Crop source" draggable="false"
                 style="
                   position:absolute;
                   left:{Math.round(CROP_SIZE / 2 - displayW / 2 + cropOffsetX)}px;
                   top:{Math.round(CROP_SIZE / 2 - displayH / 2 + cropOffsetY)}px;
                   width:{displayW}px;
                   height:{displayH}px;
                   max-width:none;
                   max-height:none;
                   cursor:{isDragging ? 'grabbing' : 'grab'};
                   user-select:none;
                   -webkit-user-drag:none;
                 " />
          {/if}

          <div class="absolute inset-0 pointer-events-none"
               style="box-shadow: 0 0 0 9999px rgba(15,23,42,0.65); border-radius:50%; border:2px solid rgba(255,255,255,0.9);"></div>

          <div class="absolute inset-0 pointer-events-none opacity-30"
               style="background-image:
                 linear-gradient(to right, transparent 33%, rgba(255,255,255,0.4) 33%, rgba(255,255,255,0.4) 33.5%, transparent 33.5%, transparent 66%, rgba(255,255,255,0.4) 66%, rgba(255,255,255,0.4) 66.5%, transparent 66.5%),
                 linear-gradient(to bottom, transparent 33%, rgba(255,255,255,0.4) 33%, rgba(255,255,255,0.4) 33.5%, transparent 33.5%, transparent 66%, rgba(255,255,255,0.4) 66%, rgba(255,255,255,0.4) 66.5%, transparent 66.5%);
                 border-radius:50%;"></div>
        </div>

        <div class="w-full flex items-center gap-3 px-2">
          <button onclick={zoomOut} class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <ZoomOut size={16} class="text-white" />
          </button>
          <input type="range" min={cropMinScale} max={cropMinScale * 4} step="0.001"
                 bind:value={cropScale} oninput={clampOffset}
                 class="flex-1 accent-orange-500 h-1" />
          <button onclick={zoomIn} class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <ZoomIn size={16} class="text-white" />
          </button>
          <button onclick={resetCrop} class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <RotateCcw size={15} class="text-white" />
          </button>
        </div>
      </div>

      <div class="flex gap-3 px-5 py-4 border-t border-slate-100">
        <button onclick={closeCropper}
                class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
          Batal
        </button>
        <button onclick={applyCrop}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] cursor-pointer"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          Gunakan Foto
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ════════════════════════════════════════════════════════ -->
<!--  Logout Confirmation Modal                               -->
<!-- ════════════════════════════════════════════════════════ -->
{#if showLogoutModal}
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
       style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);"
       onclick={() => showLogoutModal = false}>
    <div class="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
         style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);"
         onclick={(e) => e.stopPropagation()}>

      <div class="flex justify-center pt-3 pb-1 sm:hidden">
        <div class="w-10 h-1 rounded-full bg-slate-200"></div>
      </div>

      <div class="px-6 pt-6 pb-3 flex flex-col items-center text-center gap-3">
        <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <LogOut size={22} class="text-red-500" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800 text-lg" style="font-family:'Plus Jakarta Sans',sans-serif;">Keluar dari Akun?</h3>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Kamu akan keluar dari sesi ini.<br />Pastikan semua pekerjaan sudah tersimpan.
          </p>
        </div>
      </div>

      <div class="flex gap-3 px-6 py-5">
        <button onclick={() => showLogoutModal = false}
                class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
          Batal
        </button>
        <button onclick={async () => { await supabase.auth.signOut(); location.assign('/auth') }}
                class="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
          <LogOut size={14} />
          Ya, Keluar
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  @keyframes slideInUp {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  input[type="range"] {
    -webkit-appearance: none;
    background: rgba(255,255,255,0.15);
    border-radius: 999px;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #F97316;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  input[type="range"]::-moz-range-thumb {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #F97316;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
</style>