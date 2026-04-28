<script lang="ts">
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
	style="background:rgba(15, 23, 42, 0.6); backdrop-filter:blur(12px);"
	onclick={onClose}
>
	<div
		class="relative flex max-h-[94vh] w-full max-w-lg flex-col rounded-t-[2.5rem] bg-white shadow-2xl sm:rounded-[2.5rem]"
		style="animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Handle for mobile -->
		<div class="flex justify-center pt-4 pb-2 sm:hidden">
			<div class="h-1.5 w-12 rounded-full bg-slate-200/80"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between border-b border-slate-100 px-8 py-6">
			<div class="flex flex-col">
				<h3 class="text-xl font-black tracking-tight text-slate-900" style="font-family:'Plus Jakarta Sans',sans-serif;">
					{isEditing ? 'Perbarui Tugas' : 'Buat Tugas Baru'}
				</h3>
				<p class="mt-0.5 text-xs font-medium text-slate-500">Silakan lengkapi detail tugas di bawah ini</p>
			</div>
			<button
				onclick={onClose}
				class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 active:scale-90"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
			</button>
		</div>

		<!-- Content -->
		<div class="scrollbar-hide flex-1 space-y-7 overflow-y-auto px-8 py-6">
			
			<!-- Info Utama -->
			<div class="space-y-5">
				<div class="group relative">
					<label class="mb-2 ml-1 block text-[11px] font-black tracking-widest text-slate-400 uppercase">Judul Tugas</label>
					<input
						type="text"
						value={formTitle}
						oninput={(e) => onTitleChange((e.target as HTMLInputElement).value)}
						placeholder="Apa yang ingin dikerjakan?"
						class="w-full rounded-2xl border-2 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-800 transition-all focus:border-orange-400 focus:bg-white focus:shadow-lg focus:shadow-orange-400/5 focus:outline-none {formFieldErrors.title ? 'border-red-200' : 'border-slate-100'}"
					/>
					{#if formFieldErrors.title}<p class="mt-1.5 ml-2 text-[10px] font-bold text-red-500">{formFieldErrors.title}</p>{/if}
				</div>

				<div>
					<label class="mb-2 ml-1 block text-[11px] font-black tracking-widest text-slate-400 uppercase">Deskripsi & Catatan</label>
					<textarea
						value={formDescription}
						oninput={(e) => onDescChange((e.target as HTMLTextAreaElement).value)}
						rows="3"
						placeholder="Berikan detail tugas secara rinci..."
						class="w-full resize-none rounded-2xl border-2 bg-slate-50/50 px-5 py-4 text-sm font-medium text-slate-700 transition-all focus:border-orange-400 focus:bg-white focus:shadow-lg focus:shadow-orange-400/5 focus:outline-none {formFieldErrors.description ? 'border-red-200' : 'border-slate-100'}"
					></textarea>
				</div>
			</div>

			<!-- Collab Section (On-Demand Search) -->
			<div>
				<div class="mb-3 flex items-center justify-between px-1">
					<label class="text-[11px] font-black tracking-widest text-slate-400 uppercase">Kolaborasi Tim</label>
					<button onclick={() => showUserSelector = !showUserSelector} 
							class="flex items-center gap-1.5 rounded-xl bg-orange-100 px-3.5 py-1.5 text-[10px] font-black text-orange-600 transition-all hover:bg-orange-200 active:scale-95 shadow-sm">
						{#if showUserSelector}
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
							TUTUP
						{:else}
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
							TAMBAH ANGGOTA
						{/if}
					</button>
				</div>

				<!-- Selected Avatars -->
				{#if formAssignedUsers.length > 0}
					<div class="mb-4 flex flex-wrap gap-2 px-1">
						{#each formAssignedUsers as uid}
							{@const user = users.find(u => u.id === uid)}
							{#if user}
								<div class="flex items-center gap-2 rounded-2xl border-2 border-orange-100 bg-orange-50/50 pl-1 pr-3 py-1 shadow-sm animate-popIn">
									<div class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white overflow-hidden border-2 border-white shadow-sm">
										{#if user.avatar_url}<img src={user.avatar_url} alt="" class="h-full w-full object-cover" />{:else}{getInitials(user.full_name)}{/if}
									</div>
									<span class="text-[10px] font-bold text-slate-700">{user.full_name}</span>
									<button onclick={() => onAssignChange(uid, false)} class="ml-1 text-slate-400 hover:text-red-500 transition-colors">✕</button>
								</div>
							{/if}
						{/each}
					</div>
				{/if}

				{#if showUserSelector}
					<div class="animate-slideDown space-y-3 rounded-2.5xl bg-slate-50 p-5 shadow-inner border-2 border-slate-100">
						<div class="relative">
							<input type="text" bind:value={userSearchQuery} placeholder="Cari nama anggota tim..." 
								   class="w-full rounded-2xl border-2 border-white bg-white px-10 py-3.5 text-sm font-bold text-slate-800 outline-none focus:border-orange-400 shadow-sm transition-all" />
							<svg class="absolute left-4 top-4 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
						</div>
						<div class="scrollbar-hide max-h-48 space-y-2 overflow-y-auto pr-1">
							{#each filteredUsers as u}
								{@const isSelected = formAssignedUsers.includes(u.id)}
								<button onclick={() => onAssignChange(u.id, !isSelected)}
										class="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-all active:scale-[0.98] {isSelected ? 'bg-orange-100/50 border-2 border-orange-200' : 'bg-white border-2 border-transparent hover:border-slate-200 shadow-sm'}">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-white overflow-hidden shadow-sm">
										{#if u.avatar_url}<img src={u.avatar_url} alt="" class="h-full w-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
									</div>
									<div class="flex-1">
										<span class="block text-xs font-black text-slate-800">{u.full_name}</span>
										<span class="text-[10px] font-bold text-slate-400">{isSelected ? 'Klik untuk batal' : 'Klik untuk pilih'}</span>
									</div>
									{#if isSelected}
										<div class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
										</div>
									{/if}
								</button>
							{:else}
								<div class="py-10 text-center">
									<p class="text-xs font-bold text-slate-400 italic">Anggota tidak ditemukan...</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Pengaturan Lanjutan -->
			<div class="space-y-6">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="ml-1 text-[11px] font-black tracking-widest text-slate-400 uppercase">Status</label>
						<select value={formStatus} onchange={(e) => onStatusChange((e.target as HTMLSelectElement).value)}
								class="w-full cursor-pointer rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 focus:border-orange-400 focus:bg-white focus:outline-none transition-all shadow-sm">
							<option value="not_started">Belum Dimulai</option>
							<option value="in_progress">Dalam Proses</option>
							<option value="review">Tahap Review</option>
							<option value="revision">Perlu Revisi</option>
							<option value="done">Selesai</option>
						</select>
					</div>
					<div class="space-y-2">
						<label class="ml-1 text-[11px] font-black tracking-widest text-slate-400 uppercase">Prioritas</label>
						<select value={formPriority} onchange={(e) => onPriorityChange((e.target as HTMLSelectElement).value)}
								class="w-full cursor-pointer rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 focus:border-orange-400 focus:bg-white focus:outline-none transition-all shadow-sm">
							<option value="low">Rendah (Low)</option>
							<option value="medium">Sedang (Med)</option>
							<option value="high">Tinggi (High)</option>
						</select>
					</div>
				</div>

				<div>
					<div class="mb-3 flex items-center justify-between px-1">
						<label class="text-[11px] font-black tracking-widest text-slate-400 uppercase">Progress Pengerjaan</label>
						<span class="rounded-xl bg-orange-100 px-3 py-1 text-xs font-black text-orange-600 shadow-sm">{formProgress}%</span>
					</div>
					<div class="px-1">
						<input type="range" value={formProgress} oninput={(e) => onProgressChange(Number((e.target as HTMLInputElement).value))}
							   min="0" max="100" step="5" class="h-2 w-full accent-orange-500 bg-slate-100 rounded-full appearance-none transition-all hover:h-3" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="ml-1 text-[11px] font-black tracking-widest text-slate-400 uppercase">Mulai</label>
						<input type="date" value={formStartDate} onchange={(e) => onStartDateChange((e.target as HTMLInputElement).value)}
							   class="w-full rounded-2xl border-2 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 focus:border-orange-400 focus:bg-white focus:outline-none transition-all shadow-sm {formFieldErrors.startDate ? 'border-red-200' : 'border-slate-100'}" />
					</div>
					<div class="space-y-2">
						<label class="ml-1 text-[11px] font-black tracking-widest text-slate-400 uppercase">Batas Waktu</label>
						<input type="date" value={formDueDate} onchange={(e) => onDueDateChange((e.target as HTMLInputElement).value)}
							   class="w-full rounded-2xl border-2 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 focus:border-orange-400 focus:bg-white focus:outline-none transition-all shadow-sm {formFieldErrors.dueDate ? 'border-red-200' : 'border-slate-100'}" />
					</div>
				</div>
			</div>

			{#if formError}
				<div class="flex items-center gap-3 rounded-2xl border-2 border-red-100 bg-red-50 px-5 py-4 animate-shake shadow-sm">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-500 shadow-inner">!</div>
					<p class="text-xs font-bold text-red-700">{formError}</p>
				</div>
			{/if}
		</div>

		<!-- Action Footer -->
		<div class="border-t border-slate-100 bg-slate-50/50 px-8 py-6 sm:rounded-b-[2.5rem]">
			<div class="flex gap-4">
				<button onclick={onClose} class="flex-1 rounded-2xl py-4 text-sm font-black text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600">Batal</button>
				<button onclick={onSave} disabled={isSubmitting}
						class="relative flex-[2.5] cursor-pointer overflow-hidden rounded-2xl py-4 text-sm font-black text-white shadow-xl shadow-orange-500/30 transition-all active:scale-[0.96] disabled:opacity-50 flex items-center justify-center gap-2"
						style="background: linear-gradient(135deg, #F97316, #EA580C);">
					{#if isSubmitting}
						<svg class="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
						<span>Memproses...</span>
					{:else}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
						<span class="relative z-10">{isEditing ? 'Simpan Perubahan' : 'Terbitkan Tugas'}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes slideUp { 
		from { transform: translateY(60px); opacity: 0; filter: blur(10px); } 
		to { transform: translateY(0); opacity: 1; filter: blur(0); } 
	}
	@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
	@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
	.animate-slideDown { animation: slideDown 0.3s ease-out; }
	.animate-shake { animation: shake 0.3s ease-in-out 2; }
	.animate-popIn { animation: popIn 0.2s ease-out; }
	.scrollbar-hide::-webkit-scrollbar { display: none; }
	.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
