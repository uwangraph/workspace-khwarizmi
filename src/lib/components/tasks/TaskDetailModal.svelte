<script lang="ts">
  interface Task { id: string; title: string; description: string|null; status: string; priority: string; progress: number; due_date: string|null; start_date: string|null; created_by: string }
  interface Contributor { id: string; name: string; avatar: string|null; status: string }
  interface Assignment { id: string; task_id: string; user_id: string; status: string }
  interface Props {
    task: Task; userId: string; contributors: Contributor[]; myAssignment: Assignment|null
    canEdit: boolean; canDelete: boolean
    due: { label: string; color: string } | null
    formatDateShort: (s: string|null) => string|null
    getUserName: (id: string) => string
    getInitials: (n: string) => string
    getAvatarGradient: (s?: string) => string
    onClose: () => void; onProgress: () => void; onEdit: () => void; onDelete: () => void
    onAccept: () => void; onReject: () => void
  }
  const CONTRIBUTORS_LABEL = 'Anggota Tim'
  const STATUS_STYLE: Record<string,{bg:string;text:string;dot:string}> = {
    not_started:{bg:'bg-slate-100',text:'text-slate-600',dot:'#94A3B8'},
    in_progress:{bg:'bg-blue-50',text:'text-blue-700',dot:'#3B82F6'},
    review:{bg:'bg-purple-50',text:'text-purple-700',dot:'#A855F7'},
    revision:{bg:'bg-amber-50',text:'text-amber-700',dot:'#F59E0B'},
    done:{bg:'bg-green-50',text:'text-green-700',dot:'#22C55E'},
  }
  const STATUS_LABEL: Record<string,string> = { not_started:'Belum Dikerjakan', in_progress:'Sedang Dikerjakan', review:'Review', revision:'Revisi', done:'Selesai' }
  const PRIORITY_LABEL: Record<string,string> = { low:'Rendah', medium:'Sedang', high:'Tinggi' }
  const PRIORITY_DOT: Record<string,string> = { low:'#94A3B8', medium:'#F59E0B', high:'#EF4444' }

  let { task: t, userId, contributors, myAssignment: myA, canEdit, canDelete, due, formatDateShort, getUserName, getInitials, getAvatarGradient, onClose, onProgress, onEdit, onDelete, onAccept, onReject }: Props = $props()
  let statusStyle = $derived(STATUS_STYLE[t.status])
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
     style="background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);" onclick={onClose}>
  <div class="w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
       style="animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);" onclick={(e) => e.stopPropagation()}>
    <div class="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10"><div class="w-10 h-1 rounded-full bg-slate-200"></div></div>
    <div class="px-6 pt-4 pb-5 border-b border-slate-100 sticky top-0 bg-white z-10">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 rounded-full" style="background:{PRIORITY_DOT[t.priority]};"></div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prioritas {PRIORITY_LABEL[t.priority]}</span>
          </div>
          <h2 class="text-lg font-bold text-slate-900 leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{t.title}</h2>
          <div class="flex items-center gap-1.5 mt-2">
            <span class="text-[10px] font-bold px-2 py-1 rounded-full {statusStyle.bg} {statusStyle.text} flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
              {STATUS_LABEL[t.status]}
            </span>
            <span class="text-[10px] text-slate-500">• Dibuat oleh {t.created_by === userId ? 'Anda' : getUserName(t.created_by)}</span>
          </div>
        </div>
        <button onclick={onClose} class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer flex-shrink-0">✕</button>
      </div>
    </div>
    <div class="px-6 py-5 flex flex-col gap-5">
      {#if t.description}<div><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Deskripsi</p><p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{t.description}</p></div>{/if}
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mulai</p><p class="text-xs font-semibold text-slate-700">{formatDateShort(t.start_date) || '—'}</p></div>
        <div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Deadline</p><p class="text-xs font-semibold {due?.color || 'text-slate-700'}">{formatDateShort(t.due_date) || '—'}{#if due}<span class="text-[10px] font-normal block mt-0.5">{due.label}</span>{/if}</p></div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</p>
          <span class="text-sm font-bold text-orange-600">{t.progress}%</span>
        </div>
        <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700" style="width:{t.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
        </div>
      </div>
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{CONTRIBUTORS_LABEL} ({contributors.length})</p>
        <div class="flex flex-col gap-1.5">
          {#each contributors as c}
            <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
              <div class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                   style="background:{c.avatar ? 'white' : getAvatarGradient(c.status)};">
                {#if c.avatar}<img src={c.avatar} alt={c.name} class="w-full h-full object-cover" />{:else}{getInitials(c.name)}{/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-800 truncate">
                  {c.id === userId ? 'Anda' : c.name}
                  {#if c.id === t.created_by}<span class="text-[10px] font-medium text-orange-600">• Pembuat</span>{/if}
                </p>
                <p class="text-[10px] text-slate-500">{c.status==='accepted'?'Telah bergabung':c.status==='pending'?'Menunggu konfirmasi':c.status==='completed'?'Telah menyelesaikan':c.status}</p>
              </div>
              <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:{c.status==='accepted'?'#22C55E':c.status==='pending'?'#3B82F6':c.status==='completed'?'#A855F7':'#94A3B8'};"></div>
            </div>
          {/each}
        </div>
      </div>
      <div class="flex flex-col gap-2 pt-2">
        {#if myA?.status === 'pending'}
          <div class="flex gap-2">
            <button onclick={onAccept} class="flex-1 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer" style="background:linear-gradient(135deg,#16A34A,#15803D);">✓ Bergabung</button>
            <button onclick={onReject} class="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 cursor-pointer">Tolak</button>
          </div>
        {:else if myA?.status === 'accepted' && t.status !== 'done'}
          <button onclick={onProgress} class="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer" style="background:linear-gradient(135deg,#F97316,#EA580C);">
            ⚡ Update Progress
          </button>
        {/if}
        {#if canEdit || canDelete}
          <div class="flex gap-2">
            {#if canEdit}<button onclick={onEdit} class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">Edit</button>{/if}
            {#if canDelete}<button onclick={onDelete} class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer">Hapus</button>{/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
