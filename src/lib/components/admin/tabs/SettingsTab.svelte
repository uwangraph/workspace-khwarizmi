<script lang="ts">
	import type { AppSetting } from '$lib/components/admin/_types';
	import { Settings, MapPin, Target, Phone } from 'lucide-svelte';

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
	} = $props<Props>();

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

<div class="space-y-6">
	<div class="rounded-2xl border border-slate-50 bg-white p-6 shadow-sm sm:p-8">
		<div class="mb-8 flex items-center gap-4">
			<div
				class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"
			>
				<Settings size={22} />
			</div>
			<div>
				<h2
					class="text-lg font-bold text-slate-800"
					style="font-family:'Plus Jakarta Sans',sans-serif;"
				>
					Pengaturan Sistem
				</h2>
				<p class="mt-0.5 text-[11px] text-slate-400">
					Konfigurasi dasar aplikasi dan validasi kehadiran
				</p>
			</div>
		</div>

		<form onsubmit={handleSubmit} class="space-y-6">
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div class="space-y-1.5">
					<label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
						<MapPin size={12} class="text-slate-300" /> Latitude Kantor
					</label>
					<input
						type="number"
						step="any"
						bind:value={lat}
						required
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-orange-500"
					/>
				</div>
				<div class="space-y-1.5">
					<label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
						<MapPin size={12} class="text-slate-300" /> Longitude Kantor
					</label>
					<input
						type="number"
						step="any"
						bind:value={lng}
						required
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-orange-500"
					/>
				</div>
			</div>

			<div class="space-y-1.5">
				<label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
					<Target size={12} class="text-slate-300" /> Radius Toleransi (meter)
				</label>
				<input
					type="number"
					bind:value={radius}
					required
					min="5"
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all outline-none focus:border-orange-500"
				/>
				<p class="mt-1.5 px-0.5 text-[10px] leading-relaxed text-slate-400">
					Jarak maksimal user dari koordinat di atas untuk melakukan absensi.
				</p>
			</div>

			<div class="border-t border-slate-50 pt-6">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h3 class="text-sm font-bold text-slate-800">Titik Lokasi Tambahan</h3>
						<p class="text-[10px] text-slate-400">Kantor cabang atau area proyek (opsional)</p>
					</div>
					<button
						type="button"
						onclick={addLocation}
						class="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
					>
						+ Tambah Titik
					</button>
				</div>

				<div class="space-y-4">
					{#each locations as loc, i}
						<div class="relative rounded-xl border border-slate-100 bg-slate-50 p-4">
							<button
								type="button"
								onclick={() => removeLocation(i)}
								class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-md bg-red-50 text-red-500 transition-colors hover:bg-red-100"
							>
								<svg
									class="h-3 w-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="3"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M6 18L18 6M6 6l12 12"
									/></svg
								>
							</button>

							<div class="space-y-3 pr-8">
								<div>
									<label class="mb-1 block text-[10px] font-semibold text-slate-500"
										>Nama Lokasi</label
									>
									<input
										type="text"
										bind:value={loc.name}
										required
										placeholder="Contoh: Kantor Khwarizmi"
										class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-orange-500"
									/>
								</div>
								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="mb-1 block text-[10px] font-semibold text-slate-500"
											>Latitude</label
										>
										<input
											type="number"
											step="any"
											bind:value={loc.lat}
											required
											class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-orange-500"
										/>
									</div>
									<div>
										<label class="mb-1 block text-[10px] font-semibold text-slate-500"
											>Longitude</label
										>
										<input
											type="number"
											step="any"
											bind:value={loc.lng}
											required
											class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-orange-500"
										/>
									</div>
								</div>
								<div>
									<label class="mb-1 block text-[10px] font-semibold text-slate-500"
										>Radius (meter)</label
									>
									<input
										type="number"
										bind:value={loc.radius}
										required
										min="5"
										class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-orange-500"
									/>
								</div>
							</div>
						</div>
					{/each}
					{#if locations.length === 0}
						<div class="rounded-xl border border-dashed border-slate-200 p-4 text-center">
							<p class="text-xs text-slate-400">Tidak ada lokasi tambahan.</p>
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-1.5">
				<label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
					<Phone size={12} class="text-slate-300" /> Nomor WhatsApp Admin
				</label>
				<input
					type="text"
					bind:value={adminContact}
					placeholder="Contoh: 628123456789"
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-orange-500"
				/>
				<p class="mt-1.5 px-0.5 text-[10px] leading-relaxed text-slate-400">
					Tujuan pesan saat pendaftar menekan tombol "Hubungi Admin".
				</p>
			</div>

			<div class="flex justify-end border-t border-slate-50 pt-6">
				<button
					type="submit"
					disabled={isSaving}
					class="rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
					style="background: linear-gradient(to right, #F97316, #EA580C);"
				>
					{#if isSaving}
						<div class="flex items-center gap-2">
							<svg class="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"
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
						</div>
					{:else}
						Simpan Pengaturan
					{/if}
				</button>
			</div>
		</form>
	</div>

	<div class="rounded-2xl border border-slate-50 bg-white p-6 shadow-sm sm:p-8">
		<div class="mb-6 flex items-center gap-4">
			<div
				class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"
			>
				<svg
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2.5"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/></svg
				>
			</div>
			<div>
				<h2
					class="text-base font-bold text-slate-800"
					style="font-family:'Plus Jakarta Sans',sans-serif;"
				>
					Pembersihan Data Lama
				</h2>
				<p class="mt-0.5 text-[11px] font-medium text-slate-400">
					Hapus file foto dan data absensi yang sudah lebih dari 40 hari
				</p>
			</div>
		</div>

		<div class="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
			<p class="text-[13px] leading-relaxed font-medium text-indigo-700">
				Fungsi ini akan mencari dan menghapus seluruh <strong>file foto selfie di Storage</strong>
				serta <strong>riwayat absensi di database</strong> yang usianya sudah melewati 40 hari ke belakang.
				Sangat disarankan dilakukan setelah rekapan bulanan selesai.
			</p>
		</div>

		<button
			onclick={onCleanupOldData}
			disabled={isCleaningOldData || isClearing}
			class="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
			style="background: linear-gradient(to right, #6366F1, #4F46E5);"
		>
			{#if isCleaningOldData}
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"
					><circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg
				>
				Mengeksekusi Pembersihan...
			{:else}
				Sapu Bersih Data Lama (40 Hari)
			{/if}
		</button>
	</div>

	<div class="rounded-2xl border border-slate-50 bg-white p-6 shadow-sm sm:p-8">
		{#if isDeletionScheduled}
			<div class="flex flex-col items-center space-y-5 text-center">
				<div
					class="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-red-50 text-red-500"
				>
					<Target size={32} />
				</div>
				<div>
					<h2
						class="text-lg font-bold text-red-600"
						style="font-family:'Plus Jakarta Sans',sans-serif;"
					>
						Penghapusan Dijadwalkan
					</h2>
					<p class="mt-1 text-[11px] text-red-400">Data sedang dalam masa tenggang pembekuan.</p>
				</div>

				<div class="w-full rounded-2xl border border-slate-100 bg-slate-50 p-6">
					<p class="mb-2 text-[10px] font-bold text-slate-400">PENGHAPUSAN PERMANEN DALAM</p>
					<div class="text-2xl font-black tracking-tight text-slate-700">
						{deletionTimeLeft || 'Menghitung...'}
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 sm:flex-row">
					<button
						onclick={onCancelClearData}
						disabled={isClearing}
						class="flex-1 rounded-xl border border-slate-100 py-3.5 text-sm font-bold text-slate-400 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
					>
						BATALKAN
					</button>
					<button
						onclick={onExecuteImmediateDeletion}
						disabled={isClearing}
						class="flex-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
						style="background: #EF4444;"
					>
						{#if isClearing}
							Mengeksekusi...
						{:else}
							HAPUS SEKARANG
						{/if}
					</button>
				</div>
			</div>
		{:else}
			<div class="mb-6 flex items-center gap-4">
				<div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2.5"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/></svg
					>
				</div>
				<div>
					<h2
						class="text-base font-bold text-slate-800"
						style="font-family:'Plus Jakarta Sans',sans-serif;"
					>
						Pembersihan Data
					</h2>
					<p class="mt-0.5 text-[11px] font-medium text-slate-400">
						Tindakan berbahaya (Danger Zone)
					</p>
				</div>
			</div>

			<div class="mb-6 rounded-2xl border border-red-100 bg-red-50/50 p-5">
				<p class="text-[13px] leading-relaxed font-medium text-red-700">
					Ini akan menghapus seluruh data **Tugas, Absensi, Notifikasi, dan Token FCM**. Akun
					pengguna dan pengaturan tidak akan hilang.
				</p>
			</div>

			<button
				onclick={onClearData}
				disabled={isClearing}
				class="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 py-4 text-sm font-bold text-red-500 transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
			>
				{#if isClearing}
					<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"
						><circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg
					>
					Mempersiapkan...
				{:else}
					Hapus Seluruh Data Transaksi
				{/if}
			</button>
		{/if}
	</div>
</div>
