<script lang="ts">
  import { Clock, LogIn, LogOut, Lock, Check } from 'lucide-svelte'

  interface Session {
    id: number; name: string; start: string; end: string
    unlockAt: string; autoCheckoutAt: string
    hasLateCheck?: boolean; requireLocation?: boolean
  }
  interface AttendanceRecord {
    id: string; session_id: number; clock_in: string | null
    clock_out: string | null; late: boolean; late_reason: string | null
    forgot_checkout: boolean
  }
  interface LeaveRecord { session_id: number | null; type: 'izin' | 'sakit'; reason: string }

  interface Props {
    session: Session
    now: Date
    rec: AttendanceRecord | undefined
    sessionLeave: LeaveRecord | null
    isWfa?: boolean
    onCheckIn: (sid: number) => void
    onCheckOut: (sid: number) => void
    isLocValid: boolean
    locStatus: 'idle' | 'loading' | 'success' | 'error'
  }

  let { session: s, now, rec, sessionLeave, isWfa = false, onCheckIn, onCheckOut, isLocValid, locStatus }: Props = $props()

  function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h*60+m }
  function formatTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  let curMin = $derived(now.getHours() * 60 + now.getMinutes())
  let startMin = $derived(toMin(s.start))
  let endMin = $derived(toMin(s.end))
  let unlockMin = $derived(toMin(s.unlockAt))
  let isLocked = $derived(curMin < unlockMin)
  let isExpired = $derived(!rec && curMin > endMin + 30)
  let inWindow = $derived(curMin >= startMin && curMin <= endMin)
  let pct = $derived(rec && !rec.clock_out && inWindow
    ? Math.min(Math.round(((curMin - startMin) / (endMin - startMin)) * 100), 100)
    : 0)
  
  let needsLocation = $derived(s.requireLocation !== false && !isWfa)
  let canAction = $derived(!needsLocation || isLocValid)
</script>

<div class="bg-white rounded-[24px] p-5 shadow-sm border-2 border-b-[6px] border-slate-200 transition-all hover:border-slate-300"
     style={isLocked && s.id !== 4 ? 'opacity:0.6;' : ''}>
  <div class="flex items-start justify-between gap-3">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1 flex-wrap">
        <p class="text-base font-extrabold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.name}</p>
        {#if rec?.late}<span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">Terlambat</span>{/if}
        {#if rec?.forgot_checkout}<span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-xl bg-orange-100 text-orange-700 border border-orange-200">Lupa Clock Out</span>{/if}
        {#if isWfa && s.id === 1}<span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">WFA</span>{/if}
      </div>
      <p class="text-xs font-bold text-slate-400">{s.start} – {s.id === 4 ? 'Selesai' : s.end}</p>

      {#if isLocked && s.id !== 4}
        <p class="mt-2 text-xs font-extrabold text-orange-500 flex items-center gap-1.5 bg-orange-50 w-fit px-3 py-1 rounded-xl">
          <Lock size={14} strokeWidth={2.5} /> Buka pukul {s.unlockAt}
        </p>
      {/if}

      {#if rec}
        <div class="mt-3.5 flex items-center gap-4 text-xs font-extrabold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <span class="flex items-center gap-1.5"><LogIn size={16} class="text-emerald-500" strokeWidth={2.5} /> {formatTime(rec.clock_in)}</span>
          {#if rec.clock_out}<span class="flex items-center gap-1.5"><LogOut size={16} class="text-orange-500" strokeWidth={2.5} /> {formatTime(rec.clock_out)}</span>{/if}
        </div>
        {#if rec.late && rec.late_reason}<p class="mt-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">Alasan: {rec.late_reason}</p>{/if}
      {/if}

      {#if pct > 0}
        <div class="mt-4 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div class="h-full rounded-full transition-all duration-500"
               style="width:{pct}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
        </div>
      {/if}
    </div>

    <div class="flex-shrink-0 flex items-center my-auto">
      {#if sessionLeave}
        <span class="text-xs font-black px-4 py-2.5 rounded-2xl whitespace-nowrap shadow-sm
                     {sessionLeave.type === 'sakit' ? 'bg-red-50 text-red-600 border-2 border-red-200' : 'bg-orange-50 text-orange-600 border-2 border-orange-200'}">
          {sessionLeave.type === 'sakit' ? 'Sakit' : 'Izin'}
        </span>
      {:else if isLocked && s.id !== 4}
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border-2 border-b-[4px] border-slate-200 flex items-center justify-center">
          <Lock size={20} strokeWidth={2.5} />
        </div>
      {:else if rec?.forgot_checkout}
        <span class="text-xs font-black px-4 py-2.5 rounded-2xl bg-orange-100 text-orange-600 border-2 border-orange-200">Lupa</span>
      {:else if rec?.clock_out}
        <span class="text-xs font-black px-4 py-2.5 rounded-2xl bg-emerald-100 text-emerald-700 border-2 border-emerald-200 flex items-center gap-1.5 shadow-sm">
          <Check size={16} strokeWidth={3} /> Selesai
        </span>
      {:else if rec}
        <button onclick={() => onCheckOut(s.id)}
                disabled={!canAction}
                class="text-xs font-black px-4 py-3 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 shadow-sm
                       {!canAction ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-b-[4px] border-slate-200' : 'bg-orange-50 text-orange-600 border-2 border-b-[4px] border-orange-200 hover:bg-orange-100'}">
          {#if !canAction}<Lock size={16} strokeWidth={2.5} />{:else}<LogOut size={16} strokeWidth={2.5} />{/if}
          Clock Out
        </button>
      {:else if isExpired}
        <span class="text-xs font-extrabold text-slate-400 bg-slate-100 px-4 py-2.5 rounded-2xl border border-slate-200">Terlewat</span>
      {:else}
        <button onclick={() => onCheckIn(s.id)}
                disabled={!canAction}
                class="text-xs font-black px-5 py-3.5 rounded-2xl text-white transition-all active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer shadow-md
                       {!canAction ? 'bg-slate-300 cursor-not-allowed border-b-[4px] border-slate-400' : 'bg-orange-500 hover:bg-orange-600 border-b-[4px] border-orange-700'}"
                style={canAction ? 'background: linear-gradient(135deg, #F97316, #EA580C);' : ''}>
          {#if !canAction}<Lock size={16} strokeWidth={2.5} />{:else}<LogIn size={16} strokeWidth={2.5} />{/if}
          Clock In
        </button>
      {/if}
    </div>
  </div>
</div>
