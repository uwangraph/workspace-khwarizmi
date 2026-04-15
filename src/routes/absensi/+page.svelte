<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';

	// ── Types ──────────────────────────────────────────
	interface Profile {
		id: string;
		full_name: string;
		role: 'admin' | 'user';
	}

	interface AttendanceRecord {
		id: string;
		session_id: number;
		date: string;
		check_in: string | null;
		check_out: string | null;
		photo_in_url: string | null;
		photo_out_url: string | null;
		forgot_checkout: boolean;
		late: boolean;
		late_reason: string | null;
	}

	interface Session {
		id: number;
		name: string;
		start: string;
		end: string;
		unlockAt: string;
		autoCheckoutAt: string;
		hasLateCheck?: boolean;
		requireLocation?: boolean;
	}

	interface LeaveRecord {
		id: string;
		date: string;
		type: 'izin' | 'sakit';
		reason: string;
		session_id: number | null;
	}

	interface PenaltyRecord {
		id: string;
		date: string;
		session_id: number;
		minutes: number;
		reason: string;
	}

	// ── Constants ──────────────────────────────────────
	const OFFICE_LAT = -6.655905;
	const OFFICE_LNG = 106.696199;
	const MAX_RADIUS_M = 25;

	const SESSIONS: Session[] = [
		{
			id: 1,
			name: 'Sesi Pagi',
			start: '08:00',
			end: '11:30',
			unlockAt: '06:00',
			autoCheckoutAt: '12:00',
			hasLateCheck: true,
			requireLocation: true
		},
		{
			id: 2,
			name: 'Sesi Siang',
			start: '13:30',
			end: '15:00',
			unlockAt: '12:00',
			autoCheckoutAt: '15:30',
			hasLateCheck: true,
			requireLocation: true
		},
		{
			id: 3,
			name: 'Sesi Sore',
			start: '16:00',
			end: '22:00',
			unlockAt: '15:30',
			autoCheckoutAt: '18:00',
			hasLateCheck: true,
			requireLocation: true
		},
		{
			id: 4,
			name: 'Lembur',
			start: '20:00',
			end: '23:59',
			unlockAt: '19:30',
			autoCheckoutAt: '23:59',
			requireLocation: false
		}
	];

	const LATE_TOLERANCE_MIN = 5;

	// ── State ──────────────────────────────────────────
	let user = $state<User | null>(null);
	let profile = $state<Profile | null>(null);
	let attendance = $state<AttendanceRecord[]>([]);
	let leaves = $state<LeaveRecord[]>([]);
	let penalties = $state<PenaltyRecord[]>([]);
	let isLoading = $state(true);

	// Camera
	let showCamera = $state(false);
	let cameraSessionId = $state(0);
	let cameraType = $state<'in' | 'out'>('in');
	let cameraStream = $state<MediaStream | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let capturedBlob = $state<Blob | null>(null);
	let capturedUrl = $state('');
	let cameraStatus = $state('');
	let isSubmitting = $state(false);

	// Late modal
	let showLateModal = $state(false);
	let lateSessionId = $state(0);
	let lateReason = $state('');
	let lateMinutes = $state(0);

	// Leave modal
	let showLeaveModal = $state(false);
	let leaveType = $state<'izin' | 'sakit'>('izin');
	let leaveReason = $state('');
	let leaveSessionId = $state<number | null>(null);
	let isSubmittingLeave = $state(false);
	let leaveStatus = $state('');

	// Photo viewer
	let photoViewUrl = $state('');
	let showPhotoView = $state(false);

	// Toast
	let toastMsg = $state('');
	let toastVisible = $state(false);
	let toastTimer = 0;

	// Clock
	let now = $state(new Date());

	// ── Effects ────────────────────────────────────────
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	$effect(() => {
		if (videoEl && cameraStream) videoEl.srcObject = cameraStream;
	});

	// ── Computed ───────────────────────────────────────
	let attendanceMap = $derived(Object.fromEntries(attendance.map((a) => [a.session_id, a])));

	let todayLeave = $derived(leaves.find((l) => l.date === new Date().toISOString().split('T')[0]));

	// ── Helpers ────────────────────────────────────────
	function toMin(time: string) {
		const [h, m] = time.split(':').map(Number);
		return h * 60 + m;
	}

	function formatTime(iso: string | null) {
		if (!iso) return '—';
		return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	function formatDateIndonesian(date: Date) {
		return date.toLocaleDateString('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function showToast(msg: string, dur = 3000) {
		clearTimeout(toastTimer);
		toastMsg = msg;
		toastVisible = true;
		toastTimer = setTimeout(() => (toastVisible = false), dur) as unknown as number;
	}

	// ── Geolocation ────────────────────────────────────
	function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6_371_000;
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLng = ((lng2 - lng1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	async function checkLocation(): Promise<{ ok: boolean; distance?: number; error?: string }> {
		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				resolve({ ok: false, error: 'Perangkat tidak mendukung fitur GPS' });
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const dist = haversineMeters(
						pos.coords.latitude,
						pos.coords.longitude,
						OFFICE_LAT,
						OFFICE_LNG
					);
					if (dist <= MAX_RADIUS_M) {
						resolve({ ok: true, distance: dist });
					} else {
						resolve({
							ok: false,
							distance: dist,
							error: `Anda berada ${Math.round(dist)} meter dari lokasi kantor. Maksimal jarak yang diizinkan adalah ${MAX_RADIUS_M} meter.`
						});
					}
				},
				(err) => {
					let msg = '';
					switch (err.code) {
						case err.PERMISSION_DENIED:
							msg = 'Akses lokasi ditolak. Silakan aktifkan GPS untuk melanjutkan absensi.';
							break;
						case err.POSITION_UNAVAILABLE:
							msg =
								'Lokasi tidak tersedia. Pastikan GPS aktif dan Anda berada di area dengan sinyal baik.';
							break;
						case err.TIMEOUT:
							msg = 'Waktu permintaan lokasi habis. Coba lagi dalam beberapa saat.';
							break;
						default:
							msg = 'Gagal mendapatkan lokasi. Periksa koneksi dan coba lagi.';
					}
					resolve({ ok: false, error: msg });
				},
				{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
			);
		});
	}

	// ── Late check ─────────────────────────────────────
	function isLate(session: Session): { late: boolean; minutes: number } {
		if (!session.hasLateCheck) return { late: false, minutes: 0 };
		const curMin = now.getHours() * 60 + now.getMinutes();
		const startMin = toMin(session.start);
		const diff = curMin - startMin;
		if (diff > LATE_TOLERANCE_MIN) return { late: true, minutes: diff };
		return { late: false, minutes: 0 };
	}

	// ── Auto Checkout ──────────────────────────────────
	async function runAutoCheckout(u: NonNullable<typeof user>) {
		const curMin = new Date().getHours() * 60 + new Date().getMinutes();
		const today = new Date().toISOString().split('T')[0];

		for (const s of SESSIONS) {
			const autoMin = toMin(s.autoCheckoutAt);
			if (curMin < autoMin) continue;

			const rec = attendance.find((a) => a.session_id === s.id);
			if (rec && rec.check_in && !rec.check_out) {
				const [h, m] = s.autoCheckoutAt.split(':').map(Number);
				const checkoutTime = new Date();
				checkoutTime.setHours(h, m, 0, 0);

				const { error } = await supabase
					.from('attendance')
					.update({
						check_out: checkoutTime.toISOString(),
						forgot_checkout: true
					})
					.eq('user_id', u.id)
					.eq('session_id', s.id)
					.eq('date', today);

				if (!error) {
					await supabase.from('attendance_penalties').insert({
						user_id: u.id,
						date: today,
						session_id: s.id,
						minutes: 10,
						reason: `Lupa checkout sesi ${s.name}`
					});
				}
			}
		}
	}

	// ── Data ───────────────────────────────────────────
	async function loadData() {
		isLoading = true;
		const {
			data: { user: u }
		} = await supabase.auth.getUser();
		if (!u) {
			location.assign('/auth');
			return;
		}
		user = u;

		const today = new Date().toISOString().split('T')[0];

		const [profileRes, attendRes, leavesRes, penaltiesRes] = await Promise.all([
			supabase.from('profiles').select('*').eq('id', u.id).single(),
			supabase.from('attendance').select('*').eq('user_id', u.id).eq('date', today),
			supabase.from('attendance_leaves').select('*').eq('user_id', u.id).eq('date', today),
			supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today)
		]);

		if (profileRes.data) profile = profileRes.data;
		if (attendRes.data) attendance = attendRes.data;
		if (leavesRes.data) leaves = leavesRes.data;
		if (penaltiesRes.data) penalties = penaltiesRes.data;

		await runAutoCheckout(u);

		const [freshAttend, freshPenalties] = await Promise.all([
			supabase.from('attendance').select('*').eq('user_id', u.id).eq('date', today),
			supabase.from('attendance_penalties').select('*').eq('user_id', u.id).eq('date', today)
		]);
		if (freshAttend.data) attendance = freshAttend.data;
		if (freshPenalties.data) penalties = freshPenalties.data;

		isLoading = false;
	}

	// ── Camera ─────────────────────────────────────────
	async function openCamera(sid: number, type: 'in' | 'out') {
		const session = SESSIONS.find((s) => s.id === sid)!;

		const requiresLocation = session.requireLocation !== false;

		if (requiresLocation) {
			cameraStatus = 'Memverifikasi lokasi...';
			showCamera = true;

			const loc = await checkLocation();
			if (!loc.ok) {
				closeCamera();
				showToast(loc.error || 'Lokasi tidak valid', 4000);
				return;
			}
		} else {
			cameraStatus = 'Membuka kamera...';
			showCamera = true;
		}

		if (type === 'in') {
			const lateInfo = isLate(session);
			if (lateInfo.late) {
				lateSessionId = sid;
				lateMinutes = lateInfo.minutes;
				showCamera = false;
				showLateModal = true;
				return;
			}
		}

		cameraSessionId = sid;
		cameraType = type;
		capturedBlob = null;
		capturedUrl = '';
		cameraStatus = '';
		isSubmitting = false;
		await startStream();
	}

	async function confirmLate(withReason: string) {
		showLateModal = false;
		lateReason = withReason;
		cameraSessionId = lateSessionId;
		cameraType = 'in';
		capturedBlob = null;
		capturedUrl = '';
		cameraStatus = '';
		isSubmitting = false;
		showCamera = true;
		await startStream();
	}

	async function startStream() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 720 } }
			});
			cameraStream = stream;
		} catch {
			showToast('Akses kamera diperlukan untuk melakukan absensi');
			closeCamera();
		}
	}

	function stopStream() {
		cameraStream?.getTracks().forEach((t) => t.stop());
		cameraStream = null;
	}

	function closeCamera() {
		stopStream();
		showCamera = false;
		cameraStatus = '';
	}

	function takePhoto() {
		if (!videoEl) return;
		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth || 720;
		canvas.height = videoEl.videoHeight || 960;
		canvas.getContext('2d')!.drawImage(videoEl, 0, 0);
		capturedUrl = canvas.toDataURL('image/jpeg', 0.85);
		canvas.toBlob(
			(b) => {
				capturedBlob = b;
			},
			'image/jpeg',
			0.75
		);
		stopStream();
		cameraStatus = 'Foto telah diambil. Pastikan foto jelas sebelum mengirim.';
	}

	async function retake() {
		capturedBlob = null;
		capturedUrl = '';
		cameraStatus = '';
		await startStream();
	}

	async function submitPhoto() {
		if (!capturedBlob || !user) return;
		isSubmitting = true;
		cameraStatus = '';

		try {
			const path = `${user.id}/${Date.now()}_${cameraType}.jpg`;
			const { error: upErr } = await supabase.storage
				.from('selfies')
				.upload(path, capturedBlob, { contentType: 'image/jpeg' });
			if (upErr) throw upErr;

			const {
				data: { publicUrl }
			} = supabase.storage.from('selfies').getPublicUrl(path);
			const today = new Date().toISOString().split('T')[0];

			if (cameraType === 'in') {
				const lateInfo = isLate(SESSIONS.find((s) => s.id === cameraSessionId)!);
				const { error } = await supabase.from('attendance').insert({
					user_id: user.id,
					session_id: cameraSessionId,
					date: today,
					check_in: new Date().toISOString(),
					photo_in_url: publicUrl,
					late: lateInfo.late,
					late_reason: lateReason || null
				});
				if (error) throw error;
				showToast('Check-in berhasil. Selamat bekerja!');
			} else {
				const { error } = await supabase
					.from('attendance')
					.update({
						check_out: new Date().toISOString(),
						photo_out_url: publicUrl
					})
					.eq('user_id', user.id)
					.eq('session_id', cameraSessionId)
					.eq('date', today);
				if (error) throw error;
				showToast('Check-out berhasil. Sampai jumpa di sesi berikutnya!');
			}

			lateReason = '';
			closeCamera();
			await loadData();
		} catch (e: unknown) {
			cameraStatus = e instanceof Error ? e.message : 'Terjadi kesalahan. Silakan coba kembali.';
			isSubmitting = false;
		}
	}

	// ── Leave ──────────────────────────────────────────
	function openLeaveModal() {
		leaveType = 'izin';
		leaveReason = '';
		leaveSessionId = null;
		leaveStatus = '';
		isSubmittingLeave = false;
		showLeaveModal = true;
	}

	async function submitLeave() {
		if (!user) return;
		if (!leaveReason.trim()) {
			leaveStatus = 'Alasan wajib diisi.';
			return;
		}
		isSubmittingLeave = true;
		leaveStatus = '';

		try {
			const { error } = await supabase.from('attendance_leaves').insert({
				user_id: user.id,
				date: new Date().toISOString().split('T')[0],
				type: leaveType,
				reason: leaveReason.trim(),
				session_id: leaveSessionId
			});
			if (error) throw error;
			showLeaveModal = false;
			showToast(
				leaveType === 'izin' ? 'Izin telah dicatat.' : 'Sakit telah dicatat. Istirahat yang cukup!'
			);
			await loadData();
		} catch (e: unknown) {
			leaveStatus = e instanceof Error ? e.message : 'Gagal menyimpan. Silakan coba lagi.';
			isSubmittingLeave = false;
		}
	}

	// ── Lifecycle ──────────────────────────────────────
	onMount(loadData);
</script>

<svelte:head>
	<title>Presensi — Workspace Khwarizmi</title>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Toast Notification -->
{#if toastVisible}
	<div
		class="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-xl duration-300"
		style="background: linear-gradient(135deg, #F97316, #EA580C); font-family:'Inter',sans-serif; backdrop-filter:blur(10px);"
	>
		{toastMsg}
	</div>
{/if}

<!-- Photo Viewer -->
{#if showPhotoView}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-5"
		style="background:rgba(0,0,0,0.92); backdrop-filter:blur(20px);"
		onclick={() => (showPhotoView = false)}
		role="dialog"
		aria-modal="true"
	>
		<button
			class="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full text-xl text-white transition-all hover:scale-110"
			style="background:rgba(255,255,255,0.1);"
			onclick={() => (showPhotoView = false)}>✕</button
		>
		<img
			src={photoViewUrl}
			alt="Bukti Absensi"
			class="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
		/>
	</div>
{/if}

<!-- Late Reason Modal -->
{#if showLateModal}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,0.6); backdrop-filter:blur(12px);"
	>
		<div
			class="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl duration-200"
		>
			<div class="border-b border-amber-100 px-6 py-5" style="background:#FFFBEB;">
				<div class="flex items-center gap-3">
					<svg class="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<p
							class="text-base font-bold text-amber-700"
							style="font-family:'Plus Jakarta Sans',sans-serif;"
						>
							Terlambat {lateMinutes} Menit
						</p>
						<p class="mt-0.5 text-xs text-amber-600">
							Melebihi toleransi {LATE_TOLERANCE_MIN} menit dari jadwal masuk
						</p>
					</div>
				</div>
			</div>
			<div class="flex flex-col gap-4 px-6 py-6">
				<div>
					<label class="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
						Alasan Keterlambatan <span class="font-normal text-slate-400">(Opsional)</span>
					</label>
					<textarea
						bind:value={lateReason}
						rows="3"
						placeholder="Contoh: Keterlambatan transportasi, kondisi cuaca, dll."
						class="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm
                   text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-amber-400
                   focus:outline-none"
						style="font-family:'Inter',sans-serif;"
					></textarea>
				</div>
				<div class="flex gap-3">
					<button
						onclick={() => (showLateModal = false)}
						class="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200"
					>
						Batal
					</button>
					<button
						onclick={() => confirmLate(lateReason)}
						class="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]"
						style="background: linear-gradient(135deg, #F97316, #EA580C);"
					>
						Lanjutkan Absen
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Leave Modal -->
{#if showLeaveModal}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,0.6); backdrop-filter:blur(12px);"
	>
		<div
			class="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl duration-200"
		>
			<div class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
				<span
					class="text-base font-bold text-slate-800"
					style="font-family:'Plus Jakarta Sans',sans-serif;">Pengajuan Izin / Sakit</span
				>
				<button
					onclick={() => (showLeaveModal = false)}
					class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-200"
				>
					✕
				</button>
			</div>
			<div class="flex flex-col gap-5 px-6 py-6">
				<!-- Tipe -->
				<div>
					<label class="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase"
						>Jenis Pengajuan</label
					>
					<div class="flex gap-3">
						<button
							onclick={() => (leaveType = 'izin')}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all"
							style="background:{leaveType === 'izin'
								? 'linear-gradient(135deg, #F97316, #EA580C)'
								: '#F1F5F9'};
                           color:{leaveType === 'izin' ? 'white' : '#64748B'};"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Izin
						</button>
						<button
							onclick={() => (leaveType = 'sakit')}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all"
							style="background:{leaveType === 'sakit'
								? 'linear-gradient(135deg, #F97316, #EA580C)'
								: '#F1F5F9'};
                           color:{leaveType === 'sakit' ? 'white' : '#64748B'};"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
								/>
							</svg>
							Sakit
						</button>
					</div>
				</div>

				<!-- Sesi -->
				<div>
					<label class="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
						Berlaku Untuk Sesi <span class="font-normal text-slate-400">(Opsional)</span>
					</label>
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => (leaveSessionId = null)}
							class="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
							style="background:{leaveSessionId === null
								? 'linear-gradient(135deg, #F97316, #EA580C)'
								: '#F1F5F9'};
                           color:{leaveSessionId === null ? 'white' : '#64748B'};"
						>
							Semua Sesi
						</button>
						{#each SESSIONS as s}
							<button
								onclick={() => (leaveSessionId = s.id)}
								class="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
								style="background:{leaveSessionId === s.id
									? 'linear-gradient(135deg, #F97316, #EA580C)'
									: '#F1F5F9'};
                             color:{leaveSessionId === s.id ? 'white' : '#64748B'};"
							>
								{s.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- Alasan -->
				<div>
					<label class="mb-2 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
						Alasan <span class="text-red-500">*</span>
					</label>
					<textarea
						bind:value={leaveReason}
						rows="3"
						placeholder="Jelaskan alasan izin atau sakit Anda..."
						class="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm
                   text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-orange-400
                   focus:outline-none"
						style="font-family:'Inter',sans-serif;"
					></textarea>
				</div>

				{#if leaveStatus}
					<p class="text-sm font-medium text-red-500">{leaveStatus}</p>
				{/if}

				<div class="flex gap-3">
					<button
						onclick={() => (showLeaveModal = false)}
						class="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200"
					>
						Batal
					</button>
					<button
						onclick={submitLeave}
						disabled={isSubmittingLeave}
						class="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
						style="background: linear-gradient(135deg, #F97316, #EA580C);"
					>
						{#if isSubmittingLeave}
							<span class="inline-flex items-center justify-center gap-2">
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									/>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
								</svg>
								Menyimpan...
							</span>
						{:else}
							Kirim Pengajuan
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Camera Modal -->
{#if showCamera}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center p-4"
		style="background:rgba(0,0,0,0.85); backdrop-filter:blur(16px);"
	>
		<div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
			<div
				class="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-orange-50/50 px-5 py-4"
			>
				<div>
					<span
						class="text-sm font-bold text-slate-800"
						style="font-family:'Plus Jakarta Sans',sans-serif;"
					>
						{SESSIONS.find((s) => s.id === cameraSessionId)?.name}
					</span>
					<span class="ml-2 text-xs font-semibold text-orange-600"
						>{cameraType === 'in' ? 'Check-in' : 'Check-out'}</span
					>
				</div>
				<button
					onclick={closeCamera}
					class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-200"
				>
					✕
				</button>
			</div>

			<div class="relative bg-black" style="aspect-ratio:3/4; overflow:hidden;">
				{#if capturedUrl}
					<img src={capturedUrl} alt="Preview Foto" class="h-full w-full object-cover" />
				{:else if cameraStream}
					<video autoplay playsinline muted bind:this={videoEl} class="h-full w-full object-cover"
					></video>
					<div
						class="pointer-events-none absolute inset-0 m-2 rounded-2xl border-4 border-white/20"
					></div>
					<div
						class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white"
						style="background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);"
					>
						Posisikan objek dalam bingkai
					</div>
				{:else}
					<div class="flex h-full w-full items-center justify-center">
						<div class="text-center">
							<svg
								class="mx-auto mb-3 h-8 w-8 animate-spin text-slate-400"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								/>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
							</svg>
							<p class="text-sm text-slate-400">{cameraStatus || 'Mengaktifkan kamera...'}</p>
						</div>
					</div>
				{/if}
			</div>

			<div class="px-5 pt-4 pb-5">
				{#if cameraStatus && cameraStream && !capturedUrl}
					<p class="mb-3 text-center text-xs text-slate-500">{cameraStatus}</p>
				{/if}
				<div class="flex gap-3">
					{#if capturedUrl}
						<button
							onclick={retake}
							disabled={isSubmitting}
							class="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-50"
						>
							↺ Ambil Ulang
						</button>
					{/if}
					<button
						onclick={capturedUrl ? submitPhoto : takePhoto}
						disabled={isSubmitting || (!capturedUrl && !cameraStream)}
						class="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
						style="background: linear-gradient(135deg, #F97316, #EA580C);"
					>
						{#if isSubmitting}
							<span class="inline-flex items-center justify-center gap-2">
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									/>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
								</svg>
								Mengirim...
							</span>
						{:else if capturedUrl}
							Konfirmasi Absensi
						{:else}
							Ambil Foto
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Main App -->
<div
	class="min-h-screen"
	style="background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%); font-family:'Inter',sans-serif;"
>
	<!-- Animated Background Blobs -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div
			class="animate-blob absolute -top-40 -right-40 h-80 w-80 rounded-full bg-orange-200 opacity-30 mix-blend-multiply blur-3xl filter"
		></div>
		<div
			class="animate-blob animation-delay-2000 absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-200 opacity-30 mix-blend-multiply blur-3xl filter"
		></div>
	</div>

	<!-- Header -->
<!-- Header Navigation -->
<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-orange-100 px-5 py-4 flex items-center justify-between">
  <div class="flex items-center gap-3">
    <!-- Logo Image -->
    <img 
      src="/logo-khwarizmi.png" 
      alt="Logo Khwarizmi" 
      class="w-9 h-9 rounded-xl object-contain shadow-md p-1 bg-white border border-orange-200"
    />
    <div>
      <span class="font-extrabold text-slate-900 text-base tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
        Presensi Harian
      </span>
      <p class="text-[10px] font-medium text-orange-600 mt-0.5">{formatDateIndonesian(new Date())}</p>
    </div>
  </div>
  <button onclick={openLeaveModal}
          class="flex items-center gap-2 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl px-4 py-2.5 transition-all duration-200">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <span>Izin / Sakit</span>
  </button>
</header>

	{#if isLoading}
		<div class="flex items-center justify-center py-32">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500"
				></div>
				<p class="text-sm font-medium text-slate-500">Memuat data presensi...</p>
			</div>
		</div>
	{:else}
		<main class="relative z-10 mx-auto flex max-w-lg flex-col gap-5 px-4 py-6 pb-20">
			<!-- Leave Banner -->
			{#if todayLeave}
				<div
					class="flex items-center gap-3 rounded-xl px-5 py-4 backdrop-blur-sm"
					style="background:{todayLeave.type === 'sakit'
						? 'rgba(254,242,242,0.95)'
						: 'rgba(239,246,255,0.95)'};
                  border-left:4px solid {todayLeave.type === 'sakit' ? '#EF4444' : '#F97316'};
                  box-shadow:0 2px 8px rgba(0,0,0,0.04);"
				>
					<svg
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						style="color:{todayLeave.type === 'sakit' ? '#DC2626' : '#F97316'}"
					>
						{#if todayLeave.type === 'sakit'}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
							/>
						{:else}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						{/if}
					</svg>
					<div class="flex-1">
						<p
							class="text-sm font-bold"
							style="color:{todayLeave.type === 'sakit' ? '#DC2626' : '#EA580C'};"
						>
							{todayLeave.type === 'sakit' ? 'Sakit Terkonfirmasi' : 'Izin Terkonfirmasi'}
							{#if todayLeave.session_id}
								· {SESSIONS.find((s) => s.id === todayLeave.session_id)?.name}
							{/if}
						</p>
						<p class="mt-1 text-xs text-slate-600">{todayLeave.reason}</p>
					</div>
				</div>
			{/if}

			<!-- Penalty Banner -->
			{#if penalties.length > 0}
				<div
					class="rounded-xl px-5 py-4 backdrop-blur-sm"
					style="background:rgba(254,243,199,0.95); border-left:4px solid #F59E0B; box-shadow:0 2px 8px rgba(0,0,0,0.04);"
				>
					<div class="mb-2 flex items-center gap-2">
						<svg
							class="h-4 w-4 text-amber-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<p class="text-xs font-bold tracking-wide text-amber-700 uppercase">Catatan Disiplin</p>
					</div>
					{#each penalties as p}
						<p class="text-sm font-medium text-amber-700">
							• {p.reason} <span class="text-amber-500">(-{p.minutes} menit)</span>
						</p>
					{/each}
				</div>
			{/if}

			<!-- Summary Strip - Glassmorphism Cards -->
			<div class="grid grid-cols-3 gap-3">
				{#each [{ label: 'Sesi Masuk', value: attendance.length, icon: 'in', color: '#F97316' }, { label: 'Sesi Selesai', value: attendance.filter((a) => a.check_out).length, icon: 'out', color: '#10B981' }, { label: 'Sisa Sesi', value: Math.max(0, 4 - attendance.length), icon: 'remaining', color: '#F59E0B' }] as stat}
					<div
						class="rounded-xl border border-white/50 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-sm"
						style="backdrop-filter:blur(10px);"
					>
						<div class="mb-2 flex items-center justify-between">
							{#if stat.icon === 'in'}
								<svg
									class="h-4 w-4"
									style="color:{stat.color}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
									/>
								</svg>
							{:else if stat.icon === 'out'}
								<svg
									class="h-4 w-4"
									style="color:{stat.color}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 5l7 7-7 7M5 5l7 7-7 7"
									/>
								</svg>
							{:else}
								<svg
									class="h-4 w-4"
									style="color:{stat.color}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{/if}
							<span class="text-[10px] font-bold tracking-wide text-slate-400">{stat.label}</span>
						</div>
						<p
							class="text-2xl font-bold"
							style="color:{stat.color}; font-family:'Plus Jakarta Sans',sans-serif;"
						>
							{stat.value}<span class="text-sm font-medium text-slate-300">/4</span>
						</p>
					</div>
				{/each}
			</div>

			<!-- Session Cards -->
			<div>
				<div class="mb-4 flex items-center gap-2">
					<div class="h-5 w-1 rounded-full bg-orange-500"></div>
					<p class="text-xs font-bold tracking-wide text-slate-500 uppercase">
						Jadwal Sesi Hari Ini
					</p>
				</div>

				<div class="flex flex-col gap-3">
					{#each SESSIONS as s}
						{@const curMin = now.getHours() * 60 + now.getMinutes()}
						{@const startMin = toMin(s.start)}
						{@const endMin = toMin(s.end)}
						{@const unlockMin = toMin(s.unlockAt)}
						{@const rec = attendanceMap[s.id]}

						{@const isLocked = curMin < unlockMin}
						{@const isExpired = !rec && curMin > endMin + 30}
						{@const inWindow = curMin >= startMin && curMin <= endMin}
						{@const pct =
							rec && !rec.check_out && inWindow
								? Math.min(Math.round(((curMin - startMin) / (endMin - startMin)) * 100), 100)
								: 0}

						{@const isOnLeave =
							!!todayLeave && (todayLeave.session_id === null || todayLeave.session_id === s.id)}

						<div
							class="rounded-xl border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:shadow-md"
							style={isLocked && s.id !== 4 ? 'opacity:0.6;' : ''}
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="mb-1 flex items-center gap-2">
										<p
											class="font-bold text-slate-800"
											style="font-family:'Plus Jakarta Sans',sans-serif;"
										>
											{s.name}
										</p>
									</div>
									<p class="text-xs font-medium text-slate-400">
										{s.start} – {s.id === 4 ? 'Selesai' : s.end}
									</p>
									{#if isLocked && s.id !== 4}
										<p class="mt-2 flex items-center gap-1 text-xs font-medium text-orange-400">
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<rect x="3" y="11" width="18" height="11" rx="2" stroke-width="2" />
												<path d="M7 11V7a5 5 0 0110 0v4" stroke-width="2" />
											</svg>
											Buka pukul {s.unlockAt}
										</p>
									{/if}
									{#if rec}
										<p
											class="mt-2 text-xs font-medium"
											class:text-slate-500={!rec.forgot_checkout && !rec.late}
											class:text-orange-600={rec.forgot_checkout}
											class:text-amber-600={rec.late && !rec.forgot_checkout}
										>
											Masuk: {formatTime(rec.check_in)}
											{#if rec.check_out}
												· Keluar: {formatTime(rec.check_out)}{/if}
											{#if rec.late}
												· Terlambat{/if}
											{#if rec.forgot_checkout}
												· Lupa Checkout{/if}
										</p>
										{#if rec.late && rec.late_reason}
											<p class="mt-1 text-xs text-amber-500">Catatan: {rec.late_reason}</p>
										{/if}
									{/if}
									{#if pct > 0}
										<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
											<div
												class="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
												style="width:{pct}%"
											></div>
										</div>
									{/if}
								</div>

								<div class="ml-4">
									{#if isOnLeave}
										<span
											class="rounded-lg px-3 py-1.5 text-center text-xs font-bold whitespace-nowrap"
											style="background:{todayLeave!.type === 'sakit' ? '#FEF2F2' : '#FFF7ED'};
                               color:{todayLeave!.type === 'sakit' ? '#DC2626' : '#EA580C'};
                               border:1px solid {todayLeave!.type === 'sakit'
												? '#FECACA'
												: '#FED7AA'};"
										>
											{todayLeave!.type === 'sakit' ? 'Sakit' : 'Izin'}
										</span>
									{:else if isLocked && s.id !== 4}
										<span
											class="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-slate-400"
										>
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<rect x="3" y="11" width="18" height="11" rx="2" stroke-width="2" />
												<path d="M7 11V7a5 5 0 0110 0v4" stroke-width="2" />
											</svg>
											Terkunci
										</span>
									{:else if rec?.forgot_checkout}
										<span
											class="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-orange-600"
										>
											Lupa Checkout
										</span>
									{:else if rec?.check_out}
										<span
											class="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-green-600"
										>
											Selesai
										</span>
									{:else if rec}
										<button
											onclick={() => openCamera(s.id, 'out')}
											class="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold whitespace-nowrap text-orange-600 transition-all hover:bg-orange-100"
										>
											Check-out →
										</button>
									{:else if isExpired}
										<span class="text-xs font-semibold whitespace-nowrap text-slate-400"
											>Kadaluarsa</span
										>
									{:else}
										<button
											onclick={() => openCamera(s.id, 'in')}
											class="rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap text-white transition-all hover:opacity-90"
											style="background: linear-gradient(135deg, #F97316, #EA580C);"
										>
											Check-in →
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- History Section -->
			<div>
				<div class="mb-4 flex items-center gap-2">
					<div class="h-5 w-1 rounded-full bg-orange-500"></div>
					<p class="text-xs font-bold tracking-wide text-slate-500 uppercase">
						Riwayat & Bukti Absensi
					</p>
				</div>

				<div
					class="overflow-hidden rounded-xl border border-white/50 bg-white/80 shadow-sm backdrop-blur-sm"
				>
					{#if attendance.length === 0}
						<div class="py-12 text-center">
							<svg
								class="mx-auto mb-3 h-12 w-12 text-slate-300"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<p class="text-sm font-medium text-slate-400">Belum ada riwayat presensi hari ini</p>
						</div>
					{:else}
						{#each attendance as rec}
							{@const sesi = SESSIONS.find((s) => s.id === rec.session_id)}

							{#if rec.photo_in_url}
								<div
									class="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-orange-50/30"
								>
									<img
										src={rec.photo_in_url}
										alt="Foto check-in"
										onclick={() => {
											photoViewUrl = rec.photo_in_url!;
											showPhotoView = true;
										}}
										onerror={(e: Event) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
										class="h-14 w-14 flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover transition-transform hover:scale-105"
									/>
									<div class="min-w-0 flex-1">
										<p class="font-bold text-slate-800">{sesi?.name}</p>
										<p
											class="mt-0.5 text-xs font-medium"
											class:text-emerald-600={!rec.late}
											class:text-amber-600={rec.late}
										>
											{rec.late ? 'Terlambat' : 'Check-in Terverifikasi'}
										</p>
										<p class="mt-1 text-xs text-slate-400">
											{formatTime(rec.check_in)} · Ketuk foto untuk perbesar
										</p>
										{#if rec.late && rec.late_reason}
											<p class="mt-1 text-xs text-amber-500">Alasan: {rec.late_reason}</p>
										{/if}
									</div>
									<span
										class="flex-shrink-0 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600"
										>IN</span
									>
								</div>
							{/if}

							{#if rec.photo_out_url}
								<div
									class="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-orange-50/30"
								>
									<img
										src={rec.photo_out_url}
										alt="Foto check-out"
										onclick={() => {
											photoViewUrl = rec.photo_out_url!;
											showPhotoView = true;
										}}
										onerror={(e: Event) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
										class="h-14 w-14 flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover transition-transform hover:scale-105"
									/>
									<div class="min-w-0 flex-1">
										<p class="font-bold text-slate-800">{sesi?.name}</p>
										<p class="mt-0.5 text-xs font-medium text-orange-600">
											Check-out Terverifikasi
										</p>
										<p class="mt-1 text-xs text-slate-400">
											{formatTime(rec.check_out)} · Ketuk foto untuk perbesar
										</p>
									</div>
									<span
										class="flex-shrink-0 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600"
										>OUT</span
									>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		</main>
	{/if}
</div>

<style>
	@keyframes blob {
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
	}
	.animate-blob {
		animation: blob 7s infinite;
	}
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-in {
		animation: fade-in 0.3s ease-out;
	}
</style>
