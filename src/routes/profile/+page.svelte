<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase'
  import toast from 'svelte-french-toast'
  import type { User } from '@supabase/supabase-js'
  import { Smartphone, MapPin, Mail, Briefcase, CalendarDays, UserRound, ClipboardList, Bell, Clock, LogOut } from 'lucide-svelte'
  import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte'
  import ProfileHero from '$lib/components/profile/ProfileHero.svelte'
  import ProfileStats from '$lib/components/profile/ProfileStats.svelte'
  import TaskProgressCard from '$lib/components/profile/TaskProgressCard.svelte'
  import InfoSection from '$lib/components/profile/InfoSection.svelte'
  import ChangePasswordModal from '$lib/components/profile/ChangePasswordModal.svelte'
  import ChangeEmailModal from '$lib/components/profile/ChangeEmailModal.svelte'

  interface Profile { id: string; full_name: string; role: 'admin'|'user'; avatar_url?: string|null; phone?: string|null; address?: string|null; joined_at?: string|null; birth_date?: string|null; position?: string|null }

  let user = $state<User | null>(null)
  let profile = $state<Profile | null>(null)
  let isLoading = $state(true)
  let showPasswordModal = $state(false)
  let showEmailModal = $state(false)
  let showLogoutModal = $state(false)
  let attendanceDays = $state(0)
  let taskSummary = $state({ total: 0, done: 0, in_progress: 0, todo: 0, review: 0 })

  // Edit modal state (inline since it uses cropper)
  let showEditModal = $state(false)
  let isSaving = $state(false)
  let editName = $state(''); let editPhone = $state(''); let editAddress = $state('')
  let editJoinedAt = $state(''); let editBirthDate = $state(''); let editPosition = $state('')
  let avatarPreview = $state<string | null>(null)
  let croppedBlob = $state<Blob | null>(null)
  let uploadingAvatar = $state(false)
  let showCropper = $state(false); let cropSourceUrl = $state<string|null>(null)
  let cropImage = $state<HTMLImageElement|null>(null); let cropScale = $state(1)
  let cropMinScale = $state(1); let cropOffsetX = $state(0); let cropOffsetY = $state(0)
  let isDragging = $state(false); let dragStartX = 0; let dragStartY = 0; let lastTouchDistance = 0
  const CROP_SIZE = 280; const OUTPUT_SIZE = 512

  function getInitials(name: string) { return name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?' }
  function formatDate(iso: string|null|undefined) { return iso ? new Date(iso).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : null }
  function formatMonthYear(iso: string|null|undefined) { return iso ? new Date(iso).toLocaleDateString('id-ID',{month:'long',year:'numeric'}) : null }
  let completionRate = $derived(taskSummary.total > 0 ? Math.round((taskSummary.done / taskSummary.total) * 100) : 0)

  async function loadData() {
    isLoading = true
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { location.assign('/auth'); return }
    user = u
    const [profileRes, attendRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('attendance').select('date').eq('user_id', u.id),
    ])
    if (profileRes.data) { profile = profileRes.data; avatarPreview = profile?.avatar_url || null }
    if (attendRes.data) attendanceDays = new Set(attendRes.data.map((a: any) => a.date)).size
    const { data: myAssign } = await supabase.from('task_assignments').select('task_id').eq('user_id', u.id)
    const ids = (myAssign||[]).map(a => a.task_id)
    const { data: t } = await supabase.from('tasks').select('id,status,created_by')
      .or(`id.in.(${ids.length ? ids.join(',') : '""'}),created_by.eq.${u.id}`)
    if (t) taskSummary = { total:t.length, done:t.filter((x:any)=>x.status==='done').length, in_progress:t.filter((x:any)=>x.status==='in_progress').length, review:t.filter((x:any)=>x.status==='review'||x.status==='revision').length, todo:t.filter((x:any)=>x.status==='not_started').length }
    isLoading = false
  }

  // Cropper helpers
  function clampOffset() { if (!cropImage) return; const sw=cropImage.width*cropScale,sh=cropImage.height*cropScale,mx=(sw-CROP_SIZE)/2,my=(sh-CROP_SIZE)/2; cropOffsetX=Math.max(-mx,Math.min(mx,cropOffsetX)); cropOffsetY=Math.max(-my,Math.min(my,cropOffsetY)) }
  function setScale(s: number) { cropScale=Math.max(cropMinScale,Math.min(cropMinScale*4,s)); clampOffset() }
  function onPointerDown(e: PointerEvent) { isDragging=true; dragStartX=e.clientX-cropOffsetX; dragStartY=e.clientY-cropOffsetY; (e.target as HTMLElement).setPointerCapture(e.pointerId) }
  function onPointerMove(e: PointerEvent) { if (!isDragging) return; cropOffsetX=e.clientX-dragStartX; cropOffsetY=e.clientY-dragStartY; clampOffset() }
  function onPointerUp(e: PointerEvent) { isDragging=false; try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {} }
  function onWheel(e: WheelEvent) { e.preventDefault(); setScale(cropScale+(e.deltaY>0?-0.05:0.05)*cropScale) }
  function onTouchStart(e: TouchEvent) { if (e.touches.length===2) { const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; lastTouchDistance=Math.sqrt(dx*dx+dy*dy) } }
  function onTouchMove(e: TouchEvent) { if (e.touches.length===2) { e.preventDefault(); const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.sqrt(dx*dx+dy*dy); if (lastTouchDistance>0) setScale(cropScale*(dist/lastTouchDistance)); lastTouchDistance=dist } }

  function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return }
    if (file.size > 10*1024*1024) { toast.error('Ukuran gambar maksimal 10MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { cropSourceUrl=ev.target?.result as string; const img=new Image(); img.onload=()=>{ cropImage=img; const sc=Math.max(CROP_SIZE/img.width,CROP_SIZE/img.height); cropMinScale=sc; cropScale=sc; cropOffsetX=0; cropOffsetY=0; showCropper=true }; img.src=cropSourceUrl }
    reader.readAsDataURL(file); (e.target as HTMLInputElement).value=''
  }

  async function applyCrop() {
    if (!cropImage) return
    const canvas=document.createElement('canvas'); canvas.width=OUTPUT_SIZE; canvas.height=OUTPUT_SIZE
    const ctx=canvas.getContext('2d')!; const out=OUTPUT_SIZE/CROP_SIZE
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,OUTPUT_SIZE,OUTPUT_SIZE); ctx.save(); ctx.translate(OUTPUT_SIZE/2,OUTPUT_SIZE/2)
    const dw=cropImage.width*cropScale*out,dh=cropImage.height*cropScale*out
    ctx.drawImage(cropImage,cropOffsetX*out-dw/2,cropOffsetY*out-dh/2,dw,dh); ctx.restore()
    const blob: Blob|null = await new Promise(res => canvas.toBlob(b=>res(b),'image/jpeg',0.9))
    if (blob) { croppedBlob=blob; if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview); avatarPreview=URL.createObjectURL(blob) }
    showCropper=false; cropSourceUrl=null; cropImage=null
  }

  async function uploadAvatar() {
    if (!croppedBlob||!user) return profile?.avatar_url||null
    uploadingAvatar=true; const fp=`${user.id}/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(fp,croppedBlob,{upsert:true,contentType:'image/jpeg'})
    if (error) { uploadingAvatar=false; return null }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fp)
    uploadingAvatar=false; return data.publicUrl
  }

  function openEdit() { editName=profile?.full_name||''; editPhone=profile?.phone||''; editAddress=profile?.address||''; editJoinedAt=profile?.joined_at||''; editBirthDate=profile?.birth_date||''; editPosition=profile?.position||''; avatarPreview=profile?.avatar_url||null; croppedBlob=null; showEditModal=true }

  async function saveProfile() {
    if (!user||!editName.trim()) { toast.error('Nama tidak boleh kosong'); return }
    isSaving=true; const finalAvatar=await uploadAvatar()
    const { error } = await supabase.from('profiles').update({ full_name:editName.trim(), phone:editPhone.trim()||null, address:editAddress.trim()||null, avatar_url:finalAvatar, joined_at:editJoinedAt||null, birth_date:editBirthDate||null, position:editPosition.trim()||null }).eq('id',user.id)
    isSaving=false
    if (error) { toast.error('Gagal menyimpan perubahan'); return }
    profile={...profile!,full_name:editName.trim(),avatar_url:finalAvatar,phone:editPhone.trim()||null,address:editAddress.trim()||null,joined_at:editJoinedAt||null,birth_date:editBirthDate||null,position:editPosition.trim()||null}
    croppedBlob=null; showEditModal=false; toast.success('Profil berhasil diperbarui')
  }

  async function signOut() {
    await supabase.auth.signOut(); location.assign('/auth')
  }

  onMount(loadData)
</script>

<svelte:head>
  <title>Profil — Workspace Khwarizmi</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen pb-28 bg-[#FFF9F0]" style="font-family:'Inter',sans-serif;">
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center gap-3">
    <a href="/" aria-label="Kembali" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-orange-50 transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </a>
    <div class="flex-1">
      <span class="font-bold text-slate-900 text-base" style="font-family:'Plus Jakarta Sans',sans-serif;">Pengaturan</span>
      <p class="text-[10px] text-slate-500 mt-0.5">Kelola profil & keamanan akun</p>
    </div>
  </header>

  {#if isLoading}
    <LoadingSpinner />
  {:else if profile}
    {@const rate = completionRate}
    <main class="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">
      <ProfileHero {profile} onEdit={openEdit} {getInitials} {formatMonthYear} />
      <ProfileStats totalTasks={taskSummary.total} doneTasks={taskSummary.done} {attendanceDays} />
      <TaskProgressCard done={taskSummary.done} inProgress={taskSummary.in_progress} review={taskSummary.review} todo={taskSummary.todo} total={taskSummary.total} {rate} />

      <InfoSection title="Informasi Pribadi" rows={[
        { Icon: Briefcase,    label: 'Posisi',              val: profile.position },
        { Icon: CalendarDays, label: 'Tanggal Bergabung',   val: formatDate(profile.joined_at) },
        { Icon: UserRound,    label: 'Tanggal Lahir',       val: formatDate(profile.birth_date) },
      ]} />

      <InfoSection title="Informasi Kontak" rows={[
        { Icon: Mail,       label: 'Email',     val: user?.email, multiline: true },
        { Icon: Smartphone, label: 'WhatsApp',  val: profile.phone },
        { Icon: MapPin,     label: 'Alamat',    val: profile.address, multiline: true },
      ]} />

      <InfoSection title="Keamanan Akun" actions={[
        { Icon: Mail,     label: 'Ganti Email',    sublabel: user?.email, bg: 'bg-blue-50',   iconColor: 'text-blue-600',   onClick: () => showEmailModal = true },
        { Icon: LogOut,   label: 'Ganti Password', sublabel: 'Ubah password akun Anda', bg: 'bg-purple-50', iconColor: 'text-purple-600', onClick: () => showPasswordModal = true },
      ]} />

      <InfoSection title="Navigasi" actions={[
        { Icon: ClipboardList, label: 'Daftar Tugas', href: '/tasks',         bg: 'bg-orange-50', iconColor: 'text-orange-600', onClick: () => location.assign('/tasks') },
        { Icon: Bell,          label: 'Notifikasi',   href: '/notifications', bg: 'bg-amber-50',  iconColor: 'text-amber-600',  onClick: () => location.assign('/notifications') },
        { Icon: Clock,         label: 'Kehadiran',    href: '/absensi',       bg: 'bg-green-50',  iconColor: 'text-green-600',  onClick: () => location.assign('/absensi') },
      ]} />

      <button onclick={() => showLogoutModal = true}
              class="w-full py-3.5 mt-2 rounded-2xl text-sm font-semibold text-red-500 bg-white border border-red-100 hover:bg-red-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
        <LogOut size={15} /> Keluar dari Akun
      </button>
    </main>
  {/if}
</div>

{#if showPasswordModal}
  <ChangePasswordModal userEmail={user?.email || ''} onClose={() => showPasswordModal = false} />
{/if}
{#if showEmailModal}
  <ChangeEmailModal userEmail={user?.email || ''} onClose={() => showEmailModal = false} />
{/if}

<!-- Logout Confirm -->
{#if showLogoutModal}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);" onclick={() => showLogoutModal = false}>
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl" style="animation:zoomIn .2s ease-out;" onclick={(e) => e.stopPropagation()}>
      <div class="px-6 py-5 text-center">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><LogOut size={20} class="text-red-600" /></div>
        <p class="font-bold text-slate-800 mb-1" style="font-family:'Plus Jakarta Sans',sans-serif;">Keluar dari Akun?</p>
        <p class="text-sm text-slate-500 mb-5">Anda perlu login ulang setelah keluar.</p>
        <div class="flex gap-3">
          <button onclick={() => showLogoutModal = false} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 cursor-pointer">Batal</button>
          <button onclick={signOut} class="flex-1 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer" style="background:#DC2626;">Ya, Keluar</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Profile Modal (still inline due to cropper complexity) -->
{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-end justify-center" style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={() => showEditModal = false}>
    <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl" style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); max-height:92vh; overflow-y:auto;" onclick={(e) => e.stopPropagation()}>
      <div class="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
      <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100 sticky top-4 bg-white z-10">
        <span class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Edit Profil</span>
        <button onclick={() => showEditModal = false} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm cursor-pointer">✕</button>
      </div>
      <div class="px-6 py-5 flex flex-col gap-5">
        <div class="flex flex-col items-center gap-3">
          <div class="relative w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg" style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {#if avatarPreview}<img src={avatarPreview} alt="Preview" class="w-full h-full object-cover" />{:else}<span class="text-3xl font-black text-white">{getInitials(editName||'')}</span>{/if}
          </div>
          <label class="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 transition-colors flex items-center gap-2">
            📷 {croppedBlob ? 'Ganti Foto' : avatarPreview ? 'Ubah Foto' : 'Pilih Foto'}
            <input type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
          </label>
          {#if croppedBlob}<span class="text-[10px] text-green-600 font-semibold">✓ Foto siap disimpan</span>{/if}
        </div>
        <div class="h-px bg-slate-100"></div>
        {#each [
          ['Nama Lengkap *', editName, (v: string) => editName = v, 'text'],
          ['Posisi', editPosition, (v: string) => editPosition = v, 'text'],
          ['WhatsApp', editPhone, (v: string) => editPhone = v, 'text'],
          ['Alamat', editAddress, (v: string) => editAddress = v, 'text'],
          ['Tanggal Bergabung', editJoinedAt, (v: string) => editJoinedAt = v, 'date'],
          ['Tanggal Lahir', editBirthDate, (v: string) => editBirthDate = v, 'date'],
        ] as [label, value, setter, type]}
          <div>
            <label class="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
            <input type={type} value={value} oninput={(e) => setter((e.target as HTMLInputElement).value)}
                   class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        {/each}
        <div class="flex gap-3 pb-4">
          <button onclick={() => showEditModal = false} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 cursor-pointer">Batal</button>
          <button onclick={saveProfile} disabled={isSaving||uploadingAvatar}
                  class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                  style="background: linear-gradient(135deg, #F97316, #EA580C);">
            {isSaving||uploadingAvatar ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Cropper Modal -->
{#if showCropper && cropSourceUrl}
  <div class="fixed inset-0 z-[70] flex items-center justify-center" style="background:rgba(0,0,0,0.9);" onclick={() => { showCropper=false; cropSourceUrl=null; cropImage=null }}>
    <div class="relative" style="width:{CROP_SIZE}px; height:{CROP_SIZE}px;" onclick={(e) => e.stopPropagation()}>
      {#if cropImage}
        <div class="overflow-hidden rounded-2xl relative" style="width:{CROP_SIZE}px; height:{CROP_SIZE}px; cursor:grab;"
             onpointerdown={onPointerDown} onpointermove={onPointerMove} onpointerup={onPointerUp}
             onwheel={onWheel} ontouchstart={onTouchStart} ontouchmove={onTouchMove}>
          <img src={cropSourceUrl} alt="Crop" draggable="false" style="position:absolute; left:50%; top:50%; transform:translate(calc(-50% + {cropOffsetX}px), calc(-50% + {cropOffsetY}px)) scale({cropScale}); transform-origin:center; user-select:none; pointer-events:none;" />
        </div>
        <div class="absolute inset-0 rounded-full border-4 border-white/60 pointer-events-none" style="box-shadow:0 0 0 9999px rgba(0,0,0,0.5);"></div>
      {/if}
    </div>
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
      <button onclick={() => setScale(cropScale/1.15)} class="px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold">🔍−</button>
      <button onclick={() => { cropScale=cropMinScale; cropOffsetX=0; cropOffsetY=0 }} class="px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold">↩ Reset</button>
      <button onclick={() => setScale(cropScale*1.15)} class="px-4 py-2 rounded-xl bg-white/20 text-white text-xs font-bold">🔍+</button>
      <button onclick={applyCrop} class="px-5 py-2 rounded-xl text-white text-sm font-bold" style="background:linear-gradient(135deg,#F97316,#EA580C);">✓ Gunakan</button>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>