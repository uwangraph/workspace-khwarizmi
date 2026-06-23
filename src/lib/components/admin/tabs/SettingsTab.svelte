<script lang="ts">
	import type { AppSetting } from '$lib/components/admin/_types';
	import { Settings, MapPin, Target, Phone, Plus, Trash2, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-svelte';

	interface Props {
		settings: AppSetting | null;
		onSave: (data: {
			office_lat: number;
			office_lng: number;
			office_radius: number;
			admin_contact: string | null;
		}) => void;
		onClearData: () => void;
		onCancelClearData: () => void;
		onExecuteImmediateDeletion: () => void;
		onCleanupOldData: () => void;
		isSaving: boolean;
		isClearing: boolean;
		isCleaningOldData: boolean;
	}
	let {
		settings,
		onSave,
		onClearData,
		onCancelClearData,
		onExecuteImmediateDeletion,
		onCleanupOldData,
		isSaving,
		isClearing,
		isCleaningOldData
	}: Props = $props();

	let lat = $state(settings?.office_lat ?? -6.655905);
	let lng = $state(settings?.office_lng ?? 106.696199);
	let radius = $state(settings?.office_radius ?? 25);
	let locations = $state(settings?.office_locations ?? []);
	let adminContact = $state(settings?.admin_contact ?? '');

	let deletionTimeLeft = $state('');
	let isDeletionScheduled = $derived(!!settings?.deletion_scheduled_at);

	$effect(() => {
		if (settings?.deletion_scheduled_at) {
			const updateTimer = () => {
				const scheduledAt = new Date(settings.deletion_scheduled_at!).getTime();
				const diff = 24 * 60 * 60 * 1000 - (Date.now() - scheduledAt);
				if (diff <= 0) {
					deletionTimeLeft = 'Waktu habis';
				} else {
					const h = Math.floor(diff / (1000 * 60 * 60));
					const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
					deletionTimeLeft = `${h} jam ${m} menit`;
				}
			};
			updateTimer();
			const interval = setInterval(updateTimer, 60000);
			return () => clearInterval(interval);
		}
	});
	$effect(() => {
		if (settings) {
			lat = settings.office_lat;
			lng = settings.office_lng;
			radius = settings.office_radius;
			locations = settings.office_locations ?? [];
			adminContact = settings.admin_contact ?? '';
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSave({
			office_lat: lat,
			office_lng: lng,
			office_radius: radius,
			office_locations: locations,
			admin_contact: adminContact || null
		} as any);
	}

	function addLocation() {
		locations = [
			...locations,
			{ name: '', lat: -6.655905, lng: 106.696199, radius: 25 }
		];
	}
	function removeLocation(index: number) {
		locations = locations.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-6 pb-12">
	<!-- Pengaturan Sistem -->
	<div class="rounded-[24px] border-2 border-b-[8px] border-slate-200 bg-white p-6 shadow-xs sm:p-8">
		<div class="mb-8 flex items-center gap-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 border-2 border-orange-300 flex-shrink-0 shadow-xs">
				<Settings size={24} />
			</div>
			<div>
				<h2 class="text-lg font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
					Pengaturan Sistem
				</h2>
				<p class="mt-0.5 text-xs font-bold text-slate-400">
					Konfigurasi dasar operasional dan validasi lokasi absensi
				</p>
			</div>
		</div>

		<form onsubmit={handleSubmit} class="space-y-6">
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div class="space-y-2">
					<label class="ml-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600">
						<MapPin size={14} class="text-orange-500" /> Latitude Kantor
					</label>
					<input
						type="number"
						step="any"
						bind:value={lat}
						required
						class="w-full rounded-2xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-orange-500 shadow-xs"
					/>
				</div>
				<div class="space-y-2">
					<label class="ml-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600">
						<MapPin size={14} class="text-orange-500" /> Longitude Kantor
					</label>
					<input
						type="number"
						step="any"
						bind:value={lng}
						required
						class="w-full rounded-2xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-orange-500 shadow-xs"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<label class="ml-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600">
					<Target size={14} class="text-orange-500" /> Radius Toleransi (meter)
				</label>
				<input
					type="number"
					bind:value={radius}
					required
					min="5"
					class="w-full rounded-2xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition-all outline-none focus:border-orange-500 shadow-xs"
				/>
				<p class="mt-1.5 ml-1 text-xs font-bold text-slate-400">
					Jarak maksimal dalam meter yang diizinkan dari titik pusat koordinat untuk melakukan absensi.
				</p>
			</div>

			<div class="border-t-2 border-slate-100 pt-8 mt-8">
				<div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h3 class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Titik Lokasi Tambahan</h3>
						<p class="text-xs font-bold text-slate-400 mt-0.5">Kantor cabang atau area proyek tambahan (opsional)</p>
					</div>
					<button
						type="button"
						onclick={addLocation}
						class="flex items-center gap-2 rounded-xl bg-orange-100 border-2 border-b-[4px] border-orange-200 px-4 py-2.5 text-xs font-black text-orange-600 transition-all hover:bg-orange-200 active:translate-y-0.5 active:border-b-[2px] shadow-xs cursor-pointer self-start sm:self-auto"
					>
						<Plus size={16} /> Tambah Titik
					</button>
				</div>

				<div class="space-y-4">
					{#each locations as loc, i}
						<div class="relative rounded-2xl border-2 border-b-[6px] border-slate-200 bg-slate-50 p-5 shadow-xs">
							<button
								type="button"
								onclick={() => removeLocation(i)}
								class="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 border-2 border-b-[4px] border-red-200 text-red-600 transition-all hover:bg-red-200 active:translate-y-0.5 active:border-b-[2px] cursor-pointer shadow-xs"
							>
								<Trash2 size={16} />
							</button>

							<div class="space-y-4 pr-12">
								<div>
									<label class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600"
										>Nama Lokasi</label
									>
									<input
										type="text"
										bind:value={loc.name}
										required
										placeholder="Contoh: Kantor Khwarizmi Cabang"
										class="w-full rounded-xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-orange-500 shadow-xs"
									/>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600"
											>Latitude</label
										>
										<input
											type="number"
											step="any"
											bind:value={loc.lat}
											required
											class="w-full rounded-xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-orange-500 shadow-xs"
										/>
									</div>
									<div>
										<label class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600"
											>Longitude</label
										>
										<input
											type="number"
											step="any"
											bind:value={loc.lng}
											required
											class="w-full rounded-xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-orange-500 shadow-xs"
										/>
									</div>
								</div>
								<div>
									<label class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600"
										>Radius (meter)</label
									>
									<input
										type="number"
										bind:value={loc.radius}
										required
										min="5"
										class="w-full rounded-xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-orange-500 shadow-xs"
									/>
								</div>
							</div>
						</div>
					{/each}
					{#if locations.length === 0}
						<div class="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
							<p class="text-xs font-bold text-slate-400">Belum ada lokasi tambahan yang didaftarkan.</p>
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-2 border-t-2 border-slate-100 pt-8 mt-8">
				<label class="ml-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600">
					<Phone size={14} class="text-orange-500" /> Nomor WhatsApp Admin
				</label>
				<input
					type="text"
					bind:value={adminContact}
					placeholder="Contoh: 628123456789"
					class="w-full rounded-2xl border-2 border-b-[4px] border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-orange-500 shadow-xs"
				/>
				<p class="mt-1.5 ml-1 text-xs font-bold text-slate-400">
					Tujuan pengalihan chat WhatsApp saat pengguna menekan tombol "Hubungi Admin".
				</p>
			</div>

			<div class="flex justify-end border-t-2 border-slate-100 pt-8 mt-8">
				<button
					type="submit"
					disabled={isSaving}
					class="w-full sm:w-auto rounded-2xl px-10 py-4 text-sm font-black text-white bg-orange-500 border-2 border-b-[6px] border-orange-700 hover:bg-orange-600 active:translate-y-0.5 active:border-b-[2px] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{#if isSaving}
						<svg class="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"
							><circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg
						>
						<span>Menyimpan...</span>
					{:else}
						Simpan Pengaturan
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Pembersihan Data Lama -->
	<div class="rounded-[24px] border-2 border-b-[8px] border-indigo-200 bg-white p-6 sm:p-8 shadow-xs">
		<div class="mb-6 flex items-center gap-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 border-2 border-indigo-300 flex-shrink-0 shadow-xs">
				<Sparkles size={24} />
			</div>
			<div>
				<h2 class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
					Pembersihan Data Lama
				</h2>
				<p class="mt-0.5 text-xs font-bold text-slate-400">
					Hapus file foto dan data absensi rutin yang sudah lebih dari 40 hari
				</p>
			</div>
		</div>

		<div class="mb-6 rounded-2xl border-2 border-b-[4px] border-indigo-200 bg-indigo-50 p-5 shadow-xs">
			<p class="text-xs leading-relaxed font-bold text-indigo-900">
				Fungsi ini akan mencari dan menghapus seluruh <strong class="font-black text-indigo-950">file foto selfie di Storage</strong>
				serta <strong class="font-black text-indigo-950">riwayat absensi di database</strong> yang usianya sudah melewati 40 hari ke belakang.
				Sangat disarankan dilakukan secara berkala setelah rekapan bulanan diexport.
			</p>
		</div>

		<button
			onclick={onCleanupOldData}
			disabled={isCleaningOldData || isClearing}
			class="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white bg-indigo-600 border-2 border-b-[6px] border-indigo-800 hover:bg-indigo-700 active:translate-y-0.5 active:border-b-[2px] transition-all shadow-md cursor-pointer disabled:opacity-50"
		>
			{#if isCleaningOldData}
				<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"
					><circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg
				>
				<span>Mengeksekusi Pembersihan...</span>
			{:else}
				<Sparkles size={18} /> Sapu Bersih Data Lama (&gt; 40 Hari)
			{/if}
		</button>
	</div>

	<!-- Danger Zone: Pembersihan Data Seluruhnya -->
	<div class="rounded-[24px] border-2 border-b-[8px] border-red-200 bg-white p-6 sm:p-8 shadow-xs">
		{#if isDeletionScheduled}
			<div class="flex flex-col items-center space-y-6 text-center">
				<div class="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-red-100 border-2 border-red-300 text-red-600 shadow-md">
					<AlertTriangle size={32} />
				</div>
				<div>
					<h2 class="text-xl font-black text-red-600" style="font-family:'Plus Jakarta Sans',sans-serif;">
						Penghapusan Seluruh Data Dijadwalkan
					</h2>
					<p class="mt-1 text-xs font-bold text-red-400">Sistem sedang dalam masa tenggang pembekuan sebelum eksekusi.</p>
				</div>

				<div class="w-full rounded-2xl border-2 border-b-[6px] border-slate-200 bg-slate-50 p-6 shadow-inner">
					<p class="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">PENGHAPUSAN PERMANEN DALAM</p>
					<div class="text-3xl font-black tracking-tight text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
						{deletionTimeLeft || 'Menghitung...'}
					</div>
				</div>

				<div class="flex w-full flex-col sm:flex-row gap-4">
					<button
						onclick={onCancelClearData}
						disabled={isClearing}
						class="flex-1 rounded-2xl bg-slate-100 text-slate-600 border-2 border-b-[6px] border-slate-300 py-4 text-sm font-black transition-all hover:bg-slate-200 active:translate-y-0.5 active:border-b-[2px] cursor-pointer shadow-xs disabled:opacity-50"
					>
						BATALKAN JADWAL
					</button>
					<button
						onclick={onExecuteImmediateDeletion}
						disabled={isClearing}
						class="flex-1 rounded-2xl bg-red-600 text-white border-2 border-b-[6px] border-red-800 py-4 text-sm font-black transition-all hover:bg-red-700 active:translate-y-0.5 active:border-b-[2px] cursor-pointer shadow-md disabled:opacity-50"
					>
						{#if isClearing}
							Mengeksekusi...
						{:else}
							HAPUS INSTAN SEKARANG
						{/if}
					</button>
				</div>
			</div>
		{:else}
			<div class="mb-6 flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 border-2 border-red-300 flex-shrink-0 shadow-xs">
					<ShieldAlert size={24} />
				</div>
				<div>
					<h2 class="text-base font-black text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
						Pembersihan Data Master
					</h2>
					<p class="mt-0.5 text-xs font-bold text-red-500 uppercase tracking-wider">
						Danger Zone (Zona Bahaya)
					</p>
				</div>
			</div>

			<div class="mb-6 rounded-2xl border-2 border-b-[4px] border-red-200 bg-red-50 p-5 shadow-xs">
				<p class="text-xs leading-relaxed font-bold text-red-900">
					Tindakan ini akan menghapus seluruh data <strong class="font-black text-red-950">Tugas, Absensi, Notifikasi, dan Token FCM</strong> di aplikasi. Akun
					pengguna dan pengaturan sistem tidak akan terhapus.
				</p>
			</div>

			<button
				onclick={onClearData}
				disabled={isClearing}
				class="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-red-600 bg-red-100 border-2 border-b-[6px] border-red-300 hover:bg-red-200 active:translate-y-0.5 active:border-b-[2px] transition-all shadow-md cursor-pointer disabled:opacity-50"
			>
				{#if isClearing}
					<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"
						><circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg
					>
					<span>Mempersiapkan Penghapusan...</span>
				{:else}
					<ShieldAlert size={18} /> Hapus Seluruh Riwayat Transaksi
				{/if}
			</button>
		{/if}
	</div>
</div>
