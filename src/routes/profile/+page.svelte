<script lang="ts">
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import type { User } from '@supabase/supabase-js';
	import {
		Smartphone,
		MapPin,
		Mail,
		Briefcase,
		CalendarDays,
		UserRound,
		ClipboardList,
		Bell,
		Clock,
		LogOut,
		Check,
		Camera,
		X,
		ZoomIn,
		ZoomOut,
		RotateCcw
	} from 'lucide-svelte';

	import { authService } from '$lib/services/authService';
	import { taskService } from '$lib/services/taskService';
	import { attendanceService } from '$lib/services/attendanceService';
	import type { Profile as UserProfileType, Task } from '$lib/type';
	import LoadingSpinner from '$lib/components/shared/LoadingSpinner.svelte';
	import ProfileHero from '$lib/components/profile/ProfileHero.svelte';
	import ProfileStats from '$lib/components/profile/ProfileStats.svelte';
	import TaskProgressCard from '$lib/components/profile/TaskProgressCard.svelte';
	import InfoSection from '$lib/components/profile/InfoSection.svelte';
	import ChangePasswordModal from '$lib/components/profile/ChangePasswordModal.svelte';
	import ChangeEmailModal from '$lib/components/profile/ChangeEmailModal.svelte';
	import { unreadCount } from '$lib/stores/notificationStore';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';

	let user = $state<User | null>(null);
	let profile = $state<UserProfileType | null>(null);
	let isLoading = $state(true);
	let showPasswordModal = $state(false);
	let showEmailModal = $state(false);
	let showLogoutModal = $state(false);
	let attendanceDays = $state(0);
	let taskSummary = $state({ total: 0, done: 0, in_progress: 0, todo: 0, review: 0 });

	// Edit modal state (inline since it uses cropper)
	let showEditModal = $state(false);
	let isSaving = $state(false);
	let editName = $state('');
	let editPhone = $state('');
	let editAddress = $state('');
	let editJoinedAt = $state('');
	let editBirthDate = $state('');
	let editPosition = $state('');
	let avatarPreview = $state<string | null>(null);
	let croppedBlob = $state<Blob | null>(null);
	let uploadingAvatar = $state(false);
	let showCropper = $state(false);
	let cropSourceUrl = $state<string | null>(null);
	let cropImage = $state<HTMLImageElement | null>(null);
	let cropScale = $state(1);
	let cropMinScale = $state(1);
	let cropOffsetX = $state(0);
	let cropOffsetY = $state(0);
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartY = 0;
	let lastTouchDistance = 0;
	const CROP_SIZE = 280;
	const OUTPUT_SIZE = 512;

	function getInitials(name: string) {
		return name
			? name
					.split(' ')
					.map((n) => n[0])
					.slice(0, 2)
					.join('')
					.toUpperCase()
			: '?';
	}
	function formatDate(iso: string | null | undefined) {
		return iso
			? new Date(iso).toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: null;
	}
	function formatMonthYear(iso: string | null | undefined) {
		return iso
			? new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
			: null;
	}
	let completionRate = $derived(
		taskSummary.total > 0 ? Math.round((taskSummary.done / taskSummary.total) * 100) : 0
	);

	const deletionStore = getContext<Writable<boolean>>('deletionStore');
	let isDataHidden = $state(false);

	$effect(() => {
		const unsubscribe = deletionStore?.subscribe((value) => {
			isDataHidden = value;
			if (value) {
				attendanceDays = 0;
				taskSummary = { total: 0, done: 0, in_progress: 0, todo: 0, review: 0 };
			} else if (!isLoading && user) {
				// If data was hidden but now it's not, we might need to reload stats
				// But loadData handles the initial load anyway
			}
		});
		return unsubscribe;
	});

	async function loadData() {
		isLoading = true;
		const u = await authService.getUser();
		if (!u) {
			location.assign('/auth');
			return;
		}
		user = u;

		const { data: p } = await authService.getProfile(u.id);
		if (p) {
			profile = p as UserProfileType;
			avatarPreview = p.avatar_url || null;
		}

		if (isDataHidden) {
			isLoading = false;
			return;
		}

		// Only fetch total attendance days, no need for full today data if unused
		attendanceDays = await attendanceService.getTotalAttendanceDays(u.id);

		const t = await taskService.getTasks(u.id, profile?.role || 'user');
		if (t) {
			taskSummary = {
				total: t.length,
				done: t.filter((x: any) => x.status === 'done').length,
				in_progress: t.filter((x: any) => x.status === 'in_progress').length,
				review: t.filter((x: any) => x.status === 'review' || x.status === 'revision').length,
				todo: t.filter((x: any) => x.status === 'not_started').length
			};
		}
		isLoading = false;
	}

	// Cropper helpers
	// cropScale is a multiplier relative to the 'fill' base size (CROP_SIZE)
	// so scale=1 means image exactly fills the crop box
	function clampOffset() {
		if (!cropImage) return;
		// actual rendered size = CROP_SIZE * (naturalAspect) * cropScale
		const ratio = cropImage.width / cropImage.height;
		let rw: number, rh: number;
		if (ratio > 1) { rw = CROP_SIZE * ratio; rh = CROP_SIZE; }
		else { rw = CROP_SIZE; rh = CROP_SIZE / ratio; }
		const sw = rw * cropScale, sh = rh * cropScale;
		const mx = (sw - CROP_SIZE) / 2, my = (sh - CROP_SIZE) / 2;
		cropOffsetX = Math.max(-mx, Math.min(mx, cropOffsetX));
		cropOffsetY = Math.max(-my, Math.min(my, cropOffsetY));
	}
	function setScale(s: number) {
		cropScale = Math.max(cropMinScale, Math.min(4, s));
		clampOffset();
	}
	function onPointerDown(e: PointerEvent) {
		isDragging = true;
		dragStartX = e.clientX - cropOffsetX;
		dragStartY = e.clientY - cropOffsetY;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		cropOffsetX = e.clientX - dragStartX;
		cropOffsetY = e.clientY - dragStartY;
		clampOffset();
	}
	function onPointerUp(e: PointerEvent) {
		isDragging = false;
		try {
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {}
	}
	function onWheel(e: WheelEvent) {
		e.preventDefault();
		setScale(cropScale + (e.deltaY > 0 ? -0.05 : 0.05) * cropScale);
	}
	function onTouchStart(e: TouchEvent) {
		if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX,
				dy = e.touches[0].clientY - e.touches[1].clientY;
			lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
		}
	}
	function onTouchMove(e: TouchEvent) {
		if (e.touches.length === 2) {
			e.preventDefault();
			const dx = e.touches[0].clientX - e.touches[1].clientX,
				dy = e.touches[0].clientY - e.touches[1].clientY,
				dist = Math.sqrt(dx * dx + dy * dy);
			if (lastTouchDistance > 0) setScale(cropScale * (dist / lastTouchDistance));
			lastTouchDistance = dist;
		}
	}

	function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			toast.error('File harus berupa gambar');
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			toast.error('Ukuran gambar maksimal 10MB');
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			cropSourceUrl = ev.target?.result as string;
			const img = new Image();
			img.onload = () => {
				cropImage = img;
				// start at scale=1 = image fills crop area (cover)
				cropMinScale = 1;
				cropScale = 1;
				cropOffsetX = 0;
				cropOffsetY = 0;
				showCropper = true;
			};
			img.src = cropSourceUrl;
		};
		reader.readAsDataURL(file);
		(e.target as HTMLInputElement).value = '';
	}

	async function applyCrop() {
		if (!cropImage) return;
		const canvas = document.createElement('canvas');
		canvas.width = OUTPUT_SIZE;
		canvas.height = OUTPUT_SIZE;
		const ctx = canvas.getContext('2d')!;
		const out = OUTPUT_SIZE / CROP_SIZE;
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
		ctx.save();
		ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
		// compute rendered size (same logic as CSS img)
		const ratio = cropImage.width / cropImage.height;
		const rw = ratio > 1 ? CROP_SIZE * ratio : CROP_SIZE;
		const rh = ratio > 1 ? CROP_SIZE : CROP_SIZE / ratio;
		const dw = rw * cropScale * out,
			dh = rh * cropScale * out;
		ctx.drawImage(cropImage, cropOffsetX * out - dw / 2, cropOffsetY * out - dh / 2, dw, dh);
		ctx.restore();
		const blob: Blob | null = await new Promise((res) =>
			canvas.toBlob((b) => res(b), 'image/jpeg', 0.9)
		);
		if (blob) {
			croppedBlob = blob;
			if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
			avatarPreview = URL.createObjectURL(blob);
		}
		showCropper = false;
		cropSourceUrl = null;
		cropImage = null;
	}

	async function uploadAvatar() {
		if (!croppedBlob || !user) return profile?.avatar_url || null;
		uploadingAvatar = true;
		try {
			const url = await authService.uploadAvatar(user.id, croppedBlob);
			uploadingAvatar = false;
			return url;
		} catch {
			uploadingAvatar = false;
			return null;
		}
	}

	function openEdit() {
		editName = profile?.full_name || '';
		editPhone = profile?.phone || '';
		editAddress = profile?.address || '';
		editJoinedAt = profile?.joined_at || '';
		editBirthDate = profile?.birth_date || '';
		editPosition = profile?.position || '';
		avatarPreview = profile?.avatar_url || null;
		croppedBlob = null;
		showEditModal = true;
	}

	async function saveProfile() {
		if (!profile || !user) return;
		isSaving = true;
		try {
			const avatar_url = await uploadAvatar();
			const updateData = {
				full_name: editName,
				phone: editPhone || null,
				address: editAddress || null,
				joined_at: editJoinedAt || null,
				birth_date: editBirthDate || null,
				position: editPosition || null,
				avatar_url
			};
			const { error } = await authService.updateProfile(user.id, updateData);
			if (error) throw error;
			
			// Update auth metadata to sync Display Name in Supabase Dashboard
			await authService.updateAuthMetadata({ full_name: editName });

			profile = { ...profile, ...updateData };
			toast.success('Profil diperbarui');
			showEditModal = false;
		} catch {
			toast.error('Gagal memperbarui profil');
		} finally {
			isSaving = false;
		}
	}

	async function logout() {
		const { error } = await authService.signOut();
		if (error) toast.error('Gagal keluar');
		else location.assign('/auth');
	}

	onMount(loadData);
</script>

<svelte:head>
	<title>Profil — Workspace Khwarizmi</title>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen bg-[#FFF9F0] pb-28" style="font-family:'Inter',sans-serif;">
	<header
		class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-50 bg-white/80 px-5 py-4 backdrop-blur-xl"
	>
		<a
			href="/"
			aria-label="Kembali"
			class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 transition-colors hover:bg-slate-100"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="#64748B"
				stroke-width="2.5"><polyline points="15 18 9 12 15 6" /></svg
			>
		</a>
		<div class="flex-1">
			<span
				class="text-base font-bold text-slate-800"
				style="font-family:'Plus Jakarta Sans',sans-serif;">Pengaturan</span
			>
			<p class="mt-0.5 text-[10px] text-slate-400">Kelola profil & keamanan akun</p>
		</div>
	</header>

	{#if isLoading}
		<div class="flex min-h-[60vh] flex-col items-center justify-center gap-3">
			<LoadingSpinner />
			<p class="animate-pulse text-xs font-medium text-slate-400">Memuat data profil...</p>
		</div>
	{:else if profile}
		{@const rate = completionRate}
		<main class="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
			<ProfileHero {profile} onEdit={openEdit} {getInitials} {formatMonthYear} />
			<ProfileStats totalTasks={taskSummary.total} doneTasks={taskSummary.done} {attendanceDays} />
			<TaskProgressCard
				done={taskSummary.done}
				inProgress={taskSummary.in_progress}
				review={taskSummary.review}
				todo={taskSummary.todo}
				total={taskSummary.total}
				{rate}
			/>

			<InfoSection
				title="Informasi Pribadi"
				rows={[
					{ Icon: Briefcase, label: 'Posisi', val: profile.position },
					{ Icon: CalendarDays, label: 'Tanggal Bergabung', val: formatDate(profile.joined_at) },
					{ Icon: UserRound, label: 'Tanggal Lahir', val: formatDate(profile.birth_date) }
				]}
			/>

			<InfoSection
				title="Informasi Kontak"
				rows={[
					{ Icon: Mail, label: 'Email', val: user?.email, multiline: true },
					{ Icon: Smartphone, label: 'WhatsApp', val: profile.phone },
					{ Icon: MapPin, label: 'Alamat', val: profile.address, multiline: true }
				]}
			/>

			<InfoSection
				title="Keamanan Akun"
				actions={[
					{
						Icon: Mail,
						label: 'Ganti Email',
						sublabel: user?.email,
						bg: 'bg-blue-50/50',
						iconColor: 'text-blue-500',
						onClick: () => (showEmailModal = true)
					},
					{
						Icon: LogOut,
						label: 'Ganti Password',
						sublabel: 'Ubah password akun Anda',
						bg: 'bg-purple-50/50',
						iconColor: 'text-purple-500',
						onClick: () => (showPasswordModal = true)
					}
				]}
			/>

			<InfoSection
				title="Navigasi Cepat"
				actions={[
					{
						Icon: ClipboardList,
						label: 'Daftar Tugas',
						href: '/tasks',
						bg: 'bg-orange-50/50',
						iconColor: 'text-orange-500',
						onClick: () => location.assign('/tasks')
					},
					{
						Icon: Bell,
						label: 'Notifikasi',
						href: '/notifications',
						bg: 'bg-amber-50/50',
						iconColor: 'text-amber-500',
						badge: isDataHidden ? 0 : $unreadCount,
						onClick: () => location.assign('/notifications')
					},
					{
						Icon: Clock,
						label: 'Kehadiran',
						href: '/absensi',
						bg: 'bg-green-50/50',
						iconColor: 'text-green-500',
						onClick: () => location.assign('/absensi')
					}
				]}
			/>

			<button
				onclick={() => (showLogoutModal = true)}
				class="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-50 bg-white py-3.5 text-sm font-semibold text-red-500 shadow-sm transition-all hover:bg-red-50 active:scale-[0.98]"
			>
				<LogOut size={15} /> Keluar dari Akun
			</button>
		</main>
	{/if}
</div>

{#if showPasswordModal}
	<ChangePasswordModal userEmail={user?.email || ''} onClose={() => (showPasswordModal = false)} />
{/if}
{#if showEmailModal}
	<ChangeEmailModal userId={user?.id || ''} userEmail={user?.email || ''} onClose={() => (showEmailModal = false)} />
{/if}

<!-- Logout Confirm -->
{#if showLogoutModal}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center p-4"
		style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);"
		onclick={() => (showLogoutModal = false)}
	>
		<div
			class="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
			style="animation:zoomIn .2s ease-out;"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="px-8 py-8 text-center">
				<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
					<LogOut size={24} class="text-red-500" />
				</div>
				<h4
					class="mb-1 text-lg font-bold text-slate-800"
					style="font-family:'Plus Jakarta Sans',sans-serif;"
				>
					Keluar dari Akun?
				</h4>
				<p class="mb-7 text-xs leading-relaxed text-slate-400">
					Anda perlu masuk kembali untuk mengakses data pekerjaan Anda.
				</p>
				<div class="flex flex-col gap-2">
					<button
						onclick={logout}
						class="w-full cursor-pointer rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
						style="background:#EF4444;">Ya, Keluar Sekarang</button
					>
					<button
						onclick={() => (showLogoutModal = false)}
						class="w-full cursor-pointer rounded-xl py-3.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-50"
						>Batal</button
					>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Profile Modal -->
{#if showEditModal}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
		style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);"
		onclick={() => (showEditModal = false)}
	>
		<div
			class="flex w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
			style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); max-height:92vh;"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-1 sm:hidden">
				<div class="h-1 w-10 rounded-full bg-slate-200"></div>
			</div>

			<div class="flex items-center justify-between px-8 py-6">
				<div class="flex flex-col">
					<h3
						class="text-lg font-bold text-slate-800"
						style="font-family:'Plus Jakarta Sans',sans-serif;"
					>
						Edit Profil
					</h3>
					<p class="text-[11px] text-slate-400">Sesuaikan informasi publik Anda</p>
				</div>
				<button
					onclick={() => (showEditModal = false)}
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 active:scale-90"
				>
					<X size={18} />
				</button>
			</div>

			<div class="scrollbar-hide flex flex-col gap-6 overflow-y-auto px-8 pb-8">
				<div class="flex flex-col items-center gap-4 py-2">
					<div class="group relative">
						<div
							class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-slate-50 shadow-xl"
						>
							{#if avatarPreview}<img
									src={avatarPreview}
									alt="Preview"
									class="h-full w-full object-cover"
								/>{:else}<span class="text-3xl font-black text-slate-300"
									>{getInitials(editName || '')}</span
								>{/if}
						</div>
						<label
							class="absolute -right-1 -bottom-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-4 border-white bg-orange-500 text-white shadow-lg transition-transform hover:scale-110"
						>
							<Camera size={16} />
							<input type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
						</label>
					</div>
					{#if croppedBlob}
						<span
							class="flex animate-bounce items-center gap-1 text-[10px] font-bold text-emerald-500"
						>
							<Check size={10} strokeWidth={4} /> Foto siap diperbarui
						</span>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-5">
					{#each [['Nama Lengkap *', editName, (v: string) => (editName = v), 'text', 'Masukkan nama lengkap'], ['Jabatan / Posisi', editPosition, (v: string) => (editPosition = v), 'text', 'Contoh: Creative Designer'], ['Nomor WhatsApp', editPhone, (v: string) => (editPhone = v), 'tel', '08xxx'], ['Alamat Lengkap', editAddress, (v: string) => (editAddress = v), 'text', 'Nama jalan, kota...'], ['Tanggal Bergabung', editJoinedAt, (v: string) => (editJoinedAt = v), 'date', ''], ['Tanggal Lahir', editBirthDate, (v: string) => (editBirthDate = v), 'date', '']] as [label, value, setter, type, placeholder]}
						<div class="space-y-1.5">
							<label class="ml-0.5 text-[11px] font-semibold text-slate-500">{label}</label>
							<input
								{type}
								{value}
								{placeholder}
								oninput={(e) => setter((e.target as HTMLInputElement).value)}
								class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-all placeholder:text-slate-300 focus:border-orange-500 focus:outline-none"
							/>
						</div>
					{/each}
				</div>

				<div class="flex gap-3 pt-2">
					<button
						onclick={() => (showEditModal = false)}
						class="flex-1 rounded-xl py-3.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-50"
						>Batal</button
					>
					<button
						onclick={saveProfile}
						disabled={isSaving || uploadingAvatar}
						class="flex-[2] rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
						style="background: linear-gradient(to right, #F97316, #EA580C);"
					>
						{isSaving || uploadingAvatar ? 'Menyimpan...' : 'Simpan Profil'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Cropper Modal -->
{#if showCropper && cropSourceUrl}
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center"
		style="background:rgba(0,0,0,0.9);"
		onclick={() => {
			showCropper = false;
			cropSourceUrl = null;
			cropImage = null;
		}}
	>
		<div
			class="relative"
			style="width:{CROP_SIZE}px; height:{CROP_SIZE}px;"
			onclick={(e) => e.stopPropagation()}
		>
			{#if cropImage}
				<div
					class="relative overflow-hidden rounded-2xl"
					style="width:{CROP_SIZE}px; height:{CROP_SIZE}px; cursor:grab;"
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onwheel={onWheel}
					ontouchstart={onTouchStart}
					ontouchmove={onTouchMove}
				>
					<img
						src={cropSourceUrl}
						alt="Crop"
						draggable="false"
						style={`
							position:absolute; left:50%; top:50%;
							width:${cropImage && cropImage.width > cropImage.height ? CROP_SIZE * (cropImage.width / cropImage.height) : CROP_SIZE}px;
							height:${cropImage && cropImage.height > cropImage.width ? CROP_SIZE * (cropImage.height / cropImage.width) : CROP_SIZE}px;
							transform:translate(calc(-50% + ${cropOffsetX}px), calc(-50% + ${cropOffsetY}px)) scale(${cropScale});
							transform-origin:center; user-select:none; pointer-events:none;
						`}
					/>
				</div>
				<div
					class="pointer-events-none absolute inset-0 rounded-full border-4 border-white/60"
					style="box-shadow:0 0 0 9999px rgba(0,0,0,0.5);"
				></div>
			{/if}
		</div>
		<div class="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2" onclick={(e) => e.stopPropagation()}>
			<button
				onclick={() => setScale(cropScale / 1.15)}
				class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90"
				title="Perkecil"
			>
				<ZoomOut size={18} />
			</button>
			<button
				onclick={() => {
					cropScale = cropMinScale;
					cropOffsetX = 0;
					cropOffsetY = 0;
				}}
				class="flex h-11 items-center gap-2 rounded-2xl bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90"
				title="Reset"
			>
				<RotateCcw size={14} /> Reset
			</button>
			<button
				onclick={() => setScale(cropScale * 1.15)}
				class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-90"
				title="Perbesar"
			>
				<ZoomIn size={18} />
			</button>
			<button
				onclick={applyCrop}
				class="flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all active:scale-[0.98]"
				style="background:linear-gradient(to right,#F97316,#EA580C);"
			>
				<Check size={16} /> Gunakan
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes zoomIn {
		from {
			transform: scale(0.9);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
