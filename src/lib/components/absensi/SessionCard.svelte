<script lang="ts">
  import { Clock, LogIn, LogOut, Lock, Check } from 'lucide-svelte'

  interface Session {
    id: number; name: string; start: string; end: string
    unlockAt: string; autoCheckoutAt: string
    hasLateCheck?: boolean; requireLocation?: boolean
  }
  interface AttendanceRecord {
    id: string; session_id: number; check_in: string | null
    check_out: string | null; late: boolean; late_reason: string | null
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
  }

  let { session: s, now, rec, sessionLeave, isWfa = false, onCheckIn, onCheckOut }: Props = $props()

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
  let pct = $derived(rec && !rec.check_out && inWindow
    ? Math.min(Math.round(((curMin - startMin) / (endMin - startMin)) * 100), 100)
    : 0)
</script>

<div class="bg-white/90 rounded-2xl p-4 shadow-sm border border-slate-100 transition-all hover:shadow-md"
     style={isLocked && s.id !== 4 ? 'opacity:0.5;' : ''}>
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <p class="font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">{s.name}</p>
        {#if rec?.late}<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Terlambat</span>{/if}
        {#if rec?.forgot_checkout}<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Lupa Checkout</span>{/if}
        {#if isWfa && s.id === 1}<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">WFA</span>{/if}
      </div>
      <p class="text-xs text-slate-400">{s.start} – {s.id === 4 ? 'Selesai' : s.end}</p>

      {#if isLocked && s.id !== 4}
        <p class="mt-2 text-xs text-orange-400 flex items-center gap-1">
          <Lock size={11} /> Buka pukul {s.unlockAt}
        </p>
      {/if}

      {#if rec}
        <div class="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span class="flex items-center gap-1"><LogIn size={11} /> {formatTime(rec.check_in)}</span>
          {#if rec.check_out}<span class="flex items-center gap-1"><LogOut size={11} /> {formatTime(rec.check_out)}</span>{/if}
        </div>
        {#if rec.late && rec.late_reason}<p class="mt-1 text-xs text-amber-500">Alasan: {rec.late_reason}</p>{/if}
      {/if}

      {#if pct > 0}
        <div class="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               style="width:{pct}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
        </div>
      {/if}
    </div>

    <div class="ml-3 flex-shrink-0">
      {#if sessionLeave}
        <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap
                     {sessionLeave.type === 'sakit' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}">
          {sessionLeave.type === 'sakit' ? 'Sakit' : 'Izin'}
        </span>
      {:else if isLocked && s.id !== 4}
        <span class="text-xs font-semibold text-slate-400 flex items-center gap-1"><Lock size={12} /></span>
      {:else if rec?.forgot_checkout}
        <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-orange-100 text-orange-600">Lupa</span>
      {:else if rec?.check_out}
        <span class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 flex items-center gap-1">
          <Check size={11} /> Selesai
        </span>
      {:else if rec}
        <button onclick={() => onCheckOut(s.id)}
                class="text-[10px] font-bold px-3 py-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors flex items-center gap-1">
          <LogOut size={11} /> Checkout
        </button>
      {:else if isExpired}
        <span class="text-[10px] font-semibold text-slate-400">Terlewat</span>
      {:else}
        <button onclick={() => onCheckIn(s.id)}
                class="text-[10px] font-bold px-3 py-2 rounded-lg text-white transition-all active:scale-95 flex items-center gap-1"
                style="background: linear-gradient(135deg, #F97316, #EA580C);">
          <LogIn size={11} /> Check-in
        </button>
      {/if}
    </div>
  </div>
</div>
