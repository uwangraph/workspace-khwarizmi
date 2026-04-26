<script lang="ts">
  import { getInitials } from '$lib/components/admin/_utils'
  import type { Profile } from '$lib/components/admin/_types'

  interface SaveData {
    full_name: string; phone: string | null; position: string | null
    role: 'admin' | 'user'; joined_at: string | null
  }
  interface Props {
    user: Profile; isSubmitting?: boolean
    onSave: (data: SaveData) => Promise<void>; onClose: () => void
  }
  let { user, isSubmitting = false, onSave, onClose } = $props<Props>()

  let editFullName = $state(user.full_name)
  let editPhone    = $state(user.phone || '')
  let editPosition = $state(user.position || '')
  let editRole     = $state<'admin' | 'user'>(user.role)
  let editJoinedAt = $state(user.joined_at || '')

  async function handleSave() {
    await onSave({
      full_name: editFullName.trim(), phone: editPhone.trim() || null,
      position: editPosition.trim() || null, role: editRole, joined_at: editJoinedAt || null,
    })
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
      <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Edit Pengguna</p>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base overflow-hidden flex-shrink-0"
             style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {#if user.avatar_url}<img src={user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(user.full_name)}{/if}
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-700">{user.full_name}</p>
          <p class="text-xs text-slate-400">{user.id.slice(0, 12)}...</p>
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Nama Lengkap <span class="text-red-500">*</span></label>
        <input bind:value={editFullName} class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Posisi</label>
        <input bind:value={editPosition} placeholder="Contoh: Frontend Developer"
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">WhatsApp</label>
        <input bind:value={editPhone} placeholder="08xx-xxxx-xxxx" type="tel"
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Tanggal Bergabung</label>
        <input type="date" bind:value={editJoinedAt}
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Role</label>
        <div class="grid grid-cols-2 gap-2">
          {#each [{ val: 'user', label: 'Karyawan' }, { val: 'admin', label: 'Administrator' }] as r}
            <button onclick={() => editRole = r.val as any}
                    class="py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer"
                    class:text-white={editRole === r.val} class:border-transparent={editRole === r.val}
                    class:border-slate-200={editRole !== r.val} class:text-slate-600={editRole !== r.val}
                    class:bg-slate-50={editRole !== r.val}
                    style={editRole === r.val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
              {r.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="flex gap-3 pt-2 pb-6">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={handleSave} disabled={isSubmitting || !editFullName.trim()}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  </div>
</div>
<style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
