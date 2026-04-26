<script lang="ts">
  interface ProfileUser { id: string; full_name: string; avatar_url: string|null }
  interface FormErrors { title?: string; description?: string; startDate?: string; dueDate?: string }
  interface Props {
    isEditing: boolean; currentUserId: string; users: ProfileUser[]
    formTitle: string; formDescription: string; formStatus: string; formPriority: string
    formProgress: number; formStartDate: string; formDueDate: string
    formAssignedUsers: string[]; formError: string; formFieldErrors: FormErrors
    isSubmitting: boolean
    onClose: () => void; onSave: () => void
    onTitleChange: (v: string) => void; onDescChange: (v: string) => void
    onStatusChange: (v: string) => void; onPriorityChange: (v: string) => void
    onProgressChange: (v: number) => void; onStartDateChange: (v: string) => void
    onDueDateChange: (v: string) => void; onAssignChange: (id: string, checked: boolean) => void
    getInitials: (n: string) => string
  }
  let { isEditing, currentUserId, users, formTitle, formDescription, formStatus, formPriority, formProgress, formStartDate, formDueDate, formAssignedUsers, formError, formFieldErrors, isSubmitting, onClose, onSave, onTitleChange, onDescChange, onStatusChange, onPriorityChange, onProgressChange, onStartDateChange, onDueDateChange, onAssignChange, getInitials }: Props = $props()
</script>

<div class="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);" onclick={(e) => e.stopPropagation()}>
    <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
      <span class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{isEditing ? 'Edit Tugas' : 'Tugas Baru'}</span>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer">✕</button>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Judul <span class="text-red-500">*</span></label>
        <input type="text" value={formTitle} oninput={(e) => onTitleChange((e.target as HTMLInputElement).value)} placeholder="Masukkan judul tugas"
               class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 {formFieldErrors.title ? 'border-red-300' : 'border-slate-200'}" />
        {#if formFieldErrors.title}<p class="text-[10px] text-red-500 font-medium mt-1">{formFieldErrors.title}</p>{/if}
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Deskripsi <span class="text-red-500">*</span></label>
        <textarea value={formDescription} oninput={(e) => onDescChange((e.target as HTMLTextAreaElement).value)} rows="3" placeholder="Detail tugas..."
                  class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none {formFieldErrors.description ? 'border-red-300' : 'border-slate-200'}"></textarea>
        {#if formFieldErrors.description}<p class="text-[10px] text-red-500 font-medium mt-1">{formFieldErrors.description}</p>{/if}
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Ajak Kolaborator <span class="text-[10px] font-normal text-slate-400">(opsional)</span></label>
        <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
          {#each users.filter(u => u.id !== currentUserId) as u}
            <label class="flex items-center gap-2.5 cursor-pointer hover:bg-white p-2 rounded-lg">
              <input type="checkbox" value={u.id} checked={formAssignedUsers.includes(u.id)}
                     onchange={(e) => onAssignChange(u.id, (e.target as HTMLInputElement).checked)}
                     class="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer" />
              <div class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                   style="background:{u.avatar_url ? 'white' : 'linear-gradient(135deg,#F97316,#EA580C)'};">
                {#if u.avatar_url}<img src={u.avatar_url} alt={u.full_name} class="w-full h-full object-cover" />{:else}{getInitials(u.full_name)}{/if}
              </div>
              <span class="text-sm text-slate-700">{u.full_name}</span>
            </label>
          {:else}
            <p class="text-xs text-slate-400 text-center py-3">Tidak ada user lain</p>
          {/each}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Status</label>
          <select value={formStatus} onchange={(e) => onStatusChange((e.target as HTMLSelectElement).value)}
                  class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer">
            <option value="not_started">Belum Dikerjakan</option>
            <option value="in_progress">Sedang Dikerjakan</option>
            <option value="review">Review</option>
            <option value="revision">Revisi</option>
            <option value="done">Selesai</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Prioritas</label>
          <select value={formPriority} onchange={(e) => onPriorityChange((e.target as HTMLSelectElement).value)}
                  class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer">
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
          </select>
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-slate-500">Progress</label>
          <span class="text-xs font-bold text-orange-600">{formProgress}%</span>
        </div>
        <input type="range" value={formProgress} oninput={(e) => onProgressChange(Number((e.target as HTMLInputElement).value))}
               min="0" max="100" step="5" class="range-orange w-full cursor-pointer" style="--fill:{formProgress}%;" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Mulai <span class="text-red-500">*</span></label>
          <input type="date" value={formStartDate} onchange={(e) => onStartDateChange((e.target as HTMLInputElement).value)}
                 class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 {formFieldErrors.startDate ? 'border-red-300' : 'border-slate-200'}" />
          {#if formFieldErrors.startDate}<p class="text-[10px] text-red-500 font-medium mt-1">{formFieldErrors.startDate}</p>{/if}
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 block mb-1.5">Deadline <span class="text-red-500">*</span></label>
          <input type="date" value={formDueDate} onchange={(e) => onDueDateChange((e.target as HTMLInputElement).value)}
                 class="w-full rounded-xl border px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 {formFieldErrors.dueDate ? 'border-red-300' : 'border-slate-200'}" />
          {#if formFieldErrors.dueDate}<p class="text-[10px] text-red-500 font-medium mt-1">{formFieldErrors.dueDate}</p>{/if}
        </div>
      </div>
      {#if formError}
        <div class="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p class="text-xs text-red-600 font-medium">{formError}</p>
        </div>
      {/if}
      <div class="flex gap-3 pt-2 pb-4">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={onSave} disabled={isSubmitting}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          {#if isSubmitting}<span class="inline-flex items-center justify-center gap-2"><svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Menyimpan...</span>
          {:else}{isEditing ? 'Simpan Perubahan' : 'Buat Tugas'}{/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .range-orange { accent-color: #F97316; }
</style>
