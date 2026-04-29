<script lang="ts">
  import { X } from 'lucide-svelte'
	interface ProfileUser {
		id: string;
		full_name: string;
		avatar_url: string | null;
	}
	interface FormErrors {
		title?: string;
		description?: string;
		startDate?: string;
		dueDate?: string;
	}
	interface Props {
		isEditing: boolean;
		currentUserId: string;
		users: ProfileUser[];
		formTitle: string;
		formDescription: string;
		formStatus: string;
		formPriority: string;
		formProgress: number;
		formStartDate: string;
		formDueDate: string;
		formAssignedUsers: string[];
		formError: string;
		formFieldErrors: FormErrors;
		isSubmitting: boolean;
		onClose: () => void;
		onSave: () => void;
		onTitleChange: (v: string) => void;
		onDescChange: (v: string) => void;
		onStatusChange: (v: string) => void;
		onPriorityChange: (v: string) => void;
		onProgressChange: (v: number) => void;
		onStartDateChange: (v: string) => void;
		onDueDateChange: (v: string) => void;
		onAssignChange: (id: string, checked: boolean) => void;
		getInitials: (n: string) => string;
	}
	let {
		isEditing,
		currentUserId,
		users,
		formTitle,
		formDescription,
		formStatus,
		formPriority,
		formProgress,
		formStartDate,
		formDueDate,
		formAssignedUsers,
		formError,
		formFieldErrors,
		isSubmitting,
		onClose,
		onSave,
		onTitleChange,
		onDescChange,
		onStatusChange,
		onPriorityChange,
		onProgressChange,
		onStartDateChange,
		onDueDateChange,
		onAssignChange,
		getInitials
	}: Props = $props();

	let userSearchQuery = $state('');
	let showUserSelector = $state(false);
	let filteredUsers = $derived(
		users.filter(u => 
			u.id !== currentUserId && 
			(u.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()))
		)
	);
</script>

<div
	class="fixed inset-0 z-[55] flex items-end justify-center p-0 sm:items-center sm:p-4"
	style="background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(8px);"
	onclick={onClose}
>
	<div
		class="relative flex max-h-[94vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
		style="animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Handle for mobile -->
		<div class="flex justify-center pt-3 pb-1 sm:hidden">
			<div class="h-1 w-10 rounded-full bg-slate-200"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between px-8 py-6">
			<div class="flex flex-col">
				<h3 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">
					{isEditing ? 'Perbarui Tugas' : 'Buat Tugas Baru'}
				</h3>
				<p class="text-[11px] text-slate-400">Lengkapi detail tugas Anda di bawah ini</p>
			</div>
			<button
				onclick={onClose}
				class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 active:scale-90"
			>
				<X size={18} />
			</button>
		</div>

		<!-- Content -->
		<div class="scrollbar-hide flex-1 space-y-6 overflow-y-auto px-8 pb-8">
			
			<!-- Info Utama -->
			<div class="space-y-4">
				<div class="group relative">
					<label class="mb-1.5 ml-0.5 block text-[11px] font-semibold text-slate-500">Judul Tugas</label>
					<input
						type="text"
						value={formTitle}
						oninput={(e) => onTitleChange((e.target as HTMLInputElement).value)}
						placeholder="Apa yang ingin dikerjakan?"
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-all placeholder:text-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-none {formFieldErrors.title ? 'border-red-200' : ''}"
					/>
					{#if formFieldErrors.title}<p class="mt-1 ml-1 text-[10px] font-medium text-red-500">{formFieldErrors.title}</p>{/if}
				</div>

				<div>
					<label class="mb-1.5 ml-0.5 block text-[11px] font-semibold text-slate-500">Deskripsi & Catatan</label>
					<textarea
						value={formDescription}
						oninput={(e) => onDescChange((e.target as HTMLTextAreaElement).value)}
						rows="3"
						placeholder="Berikan detail tugas secara rinci..."
						class="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-all placeholder:text-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-none {formFieldErrors.description ? 'border-red-200' : ''}"
					></textarea>
				</div>
			</div>

			<!-- Collab Section -->
			<div>
				<div class="mb-3 flex items-center justify-between px-0.5">
					<label class="text-[11px] font-semibold text-slate-500">Kolaborasi Tim</label>
					<button onclick={() => showUserSelector = !showUserSelector} 
							class="flex items-center gap-1 text-[10px] font-bold text-orange-600 transition-colors hover:text-orange-700">
						{#if showUserSelector}
							TUTUP
						{:else}
							<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
							TAMBAH
						{/if}
					</button>
				</div>

				{#if formAssignedUsers.length > 0}
					<div class="mb-4 flex flex-wrap gap-2">
						{#each formAssignedUsers as uid}
							{@const user = users.find(u => u.id === uid)}
							{#if user}
								<div class="flex items-center gap-2 rounded-full border border-slate-100 bg-white pl-1 pr-2.5 py-1 shadow-sm animate-popIn">
									<div class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 overflow-hidden">
										{#if user.avatar_url}<img src={user.avatar_url} alt="" class="h-full w-full object-cover" />{:else}{getInitials(user.full_name)}{/if}
									</div>
									<span class="text-[10px] font-medium text-slate-700">{user.full_name}</span>
									<button onclick={() => onAssignChange(uid, false)} class="text-slate-300 hover:text-red-500 transition-colors">
										<X size={10} />
									</button>
								</div>
							{/if}
						{/each}
					</div>
				{/if}

				{#if showUserSelector}
					<div class="animate-slideDown space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
						<div class="relative">
							<input type="text" bind:value={userSearchQuery} placeholder="Cari nama anggota tim..." 
								   class="w-full rounded-xl border border-slate-200 bg-white px-9 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-orange-500 transition-all" />
							<svg class="absolute left-3 top-3 h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
						</div>
						<div class="scrollbar-hide max-h-40 space-y-1.5 overflow-y-auto">
							{#each filteredUsers as u}
								{@const isSelected = formAssignedUsers.includes(u.id)}
								<button onclick={() => onAssignChange(u.id, !isSelected)}
										class="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all {isSelected ? 'bg-orange-50 border border-orange-100' : 'hover:bg-white'}">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-white overflow-hidden">
										{#if u.avatar_url}<img src={u.avatar_url} alt="" class="h-full w-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
									</div>
									<div class="flex-1">
										<span class="block text-xs font-semibold text-slate-700">{u.full_name}</span>
									</div>
									{#if isSelected}
										<div class="h-4 w-4 rounded-full bg-orange-500 text-white flex items-center justify-center">
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
										</div>
									{/if}
								</button>
							{:else}
								<p class="py-4 text-center text-[10px] font-medium text-slate-400 italic">Tidak ada anggota ditemukan</p>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Pengaturan Lanjutan -->
			<div class="space-y-5">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label class="ml-0.5 text-[11px] font-semibold text-slate-500">Status</label>
						<select value={formStatus} onchange={(e) => onStatusChange((e.target as HTMLSelectElement).value)}
								class="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:outline-none transition-all">
							<option value="not_started">Belum Dimulai</option>
							<option value="in_progress">Dalam Proses</option>
							<option value="review">Tahap Review</option>
							<option value="revision">Perlu Revisi</option>
							<option value="done">Selesai</option>
						</select>
					</div>
					<div class="space-y-1.5">
						<label class="ml-0.5 text-[11px] font-semibold text-slate-500">Prioritas</label>
						<select value={formPriority} onchange={(e) => onPriorityChange((e.target as HTMLSelectElement).value)}
								class="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:outline-none transition-all">
							<option value="low">Rendah (Low)</option>
							<option value="medium">Sedang (Med)</option>
							<option value="high">Tinggi (High)</option>
						</select>
					</div>
				</div>

				<div>
					<div class="mb-2 flex items-center justify-between px-0.5">
						<label class="text-[11px] font-semibold text-slate-500">Progress</label>
						<span class="text-[11px] font-bold text-orange-600">{formProgress}%</span>
					</div>
					<div class="px-0.5">
						<input type="range" value={formProgress} oninput={(e) => onProgressChange(Number((e.target as HTMLInputElement).value))}
							   min="0" max="100" step="5" 
							   class="h-1.5 w-full accent-orange-500 bg-slate-100 rounded-full appearance-none cursor-pointer"
							   style="background: linear-gradient(to right, #F97316 0%, #F97316 {formProgress}%, #F1F5F9 {formProgress}%, #F1F5F9 100%)" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label class="ml-0.5 text-[11px] font-semibold text-slate-500">Mulai</label>
						<input type="date" value={formStartDate} onchange={(e) => onStartDateChange((e.target as HTMLInputElement).value)}
							   class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-orange-500 transition-all {formFieldErrors.startDate ? 'border-red-200' : ''}" />
					</div>
					<div class="space-y-1.5">
						<label class="ml-0.5 text-[11px] font-semibold text-slate-500">Batas Waktu</label>
						<input type="date" value={formDueDate} onchange={(e) => onDueDateChange((e.target as HTMLInputElement).value)}
							   class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-orange-500 transition-all {formFieldErrors.dueDate ? 'border-red-200' : ''}" />
					</div>
				</div>
			</div>

			{#if formError}
				<div class="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100 animate-shake">
					<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
					<p class="text-[10px] font-semibold text-red-600">{formError}</p>
				</div>
			{/if}
		</div>

		<!-- Action Footer -->
		<div class="px-8 py-6 border-t border-slate-50">
			<div class="flex gap-3">
				<button onclick={onClose} class="flex-1 rounded-xl py-3.5 text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors">Batal</button>
				<button onclick={onSave} disabled={isSubmitting}
						class="relative flex-[2] cursor-pointer overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
						style="background: linear-gradient(to right, #F97316, #EA580C);">
					{#if isSubmitting}
						<svg class="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
						<span>Memproses...</span>
					{:else}
						<span>{isEditing ? 'Simpan Perubahan' : 'Terbitkan Tugas'}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes slideUp { 
		from { transform: translateY(30px); opacity: 0; } 
		to { transform: translateY(0); opacity: 1; } 
	}
	@keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
	@keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
	.animate-slideDown { animation: slideDown 0.2s ease-out; }
	.animate-shake { animation: shake 0.3s ease-in-out 2; }
	.animate-popIn { animation: popIn 0.2s ease-out; }
	.scrollbar-hide::-webkit-scrollbar { display: none; }
	.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: #F97316;
		cursor: pointer;
		border-radius: 50%;
		border: 3px solid white;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}
</style>

