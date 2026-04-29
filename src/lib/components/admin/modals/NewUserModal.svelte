<script lang="ts">
  import { Eye, EyeOff, X } from 'lucide-svelte'

  interface CreateData {
    name: string; email: string; password: string
    position: string; role: 'admin' | 'user'
  }
  interface Props {
    isCreating?: boolean
    onCreate: (data: CreateData) => Promise<void>
    onClose: () => void
  }
  let { isCreating = false, onCreate, onClose } = $props<Props>()

  let newName     = $state('')
  let newEmail    = $state('')
  let newPassword = $state('')
  let newPosition = $state('')
  let newRole     = $state<'admin' | 'user'>('user')
  let showPw      = $state(false)

  async function handleCreate() {
    await onCreate({ name: newName, email: newEmail, password: newPassword, position: newPosition, role: newRole })
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center"
     style="background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
       style="animation:slideUp .3s cubic-bezier(.16,1,.3,1); max-height:90vh; overflow-y:auto;"
       onclick={e => e.stopPropagation()}>
    <div class="flex justify-center pt-3 pb-1"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="flex items-center justify-between px-6 py-3 border-b border-slate-100">
      <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Tambah Pengguna</p>
      <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer">
        <X size={16} />
      </button>
    </div>
    <div class="px-6 py-5 flex flex-col gap-4">
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Nama Lengkap <span class="text-red-500">*</span></label>
        <input bind:value={newName} placeholder="Nama lengkap"
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Email <span class="text-red-500">*</span></label>
        <input type="email" bind:value={newEmail} placeholder="email@example.com"
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Password <span class="text-red-500">*</span></label>
        <div class="relative">
          <input type={showPw ? 'text' : 'password'} bind:value={newPassword} placeholder="Min. 8 karakter"
                 class="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button type="button" onclick={() => showPw = !showPw}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            {#if showPw}<EyeOff size={15} />{:else}<Eye size={15} />{/if}
          </button>
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Posisi</label>
        <input bind:value={newPosition} placeholder="Contoh: Desainer UI"
               class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500 block mb-1.5">Role</label>
        <div class="grid grid-cols-2 gap-2">
          {#each [{ val: 'user', label: 'Karyawan' }, { val: 'admin', label: 'Administrator' }] as r}
            <button onclick={() => newRole = r.val as any}
                    class="py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer"
                    class:text-white={newRole === r.val} class:border-transparent={newRole === r.val}
                    class:border-slate-200={newRole !== r.val} class:text-slate-600={newRole !== r.val}
                    class:bg-slate-50={newRole !== r.val}
                    style={newRole === r.val ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : ''}>
              {r.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="flex gap-3 pt-1 pb-6">
        <button onclick={onClose} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">Batal</button>
        <button onclick={handleCreate} disabled={isCreating}
                class="flex-[2] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
                style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {isCreating ? 'Membuat...' : 'Buat Pengguna'}
        </button>
      </div>
    </div>
  </div>
</div>
<style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
