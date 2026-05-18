<script lang="ts">
  import { Clock, Eye } from 'lucide-svelte'
  interface AttendanceRecord {
    id: string; session_id: number
    photo_in_url: string | null; photo_out_url: string | null
    clock_in: string | null; clock_out: string | null; late: boolean
  }
  interface Session { id: number; name: string }
  interface Props {
    record: AttendanceRecord
    session: Session | undefined
    onViewPhoto: (url: string) => void
  }
  let { record: rec, session: sesi, onViewPhoto }: Props = $props()

  function formatTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
</script>

{#if rec.photo_in_url}
  <div class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer" onclick={() => onViewPhoto(rec.photo_in_url!)}>
    <img src={rec.photo_in_url} alt="Clock In"
         onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
         class="w-14 h-14 flex-shrink-0 rounded-2xl border-2 border-slate-200 object-cover shadow-sm" />
    <div class="flex-1 min-w-0">
      <p class="text-base font-extrabold text-slate-800">{sesi?.name}</p>
      <p class="text-xs font-bold mt-0.5 {rec.late ? 'text-amber-600' : 'text-emerald-600'}">
        {rec.late ? 'Terlambat' : 'Tepat Waktu'}
      </p>
      <p class="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
        <Clock size={12} strokeWidth={2.5} /> {formatTime(rec.clock_in)}
      </p>
    </div>
    <span class="text-[11px] font-black px-3 py-1 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0">IN</span>
  </div>
{/if}

{#if rec.photo_out_url}
  <div class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer" onclick={() => onViewPhoto(rec.photo_out_url!)}>
    <img src={rec.photo_out_url} alt="Clock Out"
         onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
         class="w-14 h-14 flex-shrink-0 rounded-2xl border-2 border-slate-200 object-cover shadow-sm" />
    <div class="flex-1 min-w-0">
      <p class="text-base font-extrabold text-slate-800">{sesi?.name}</p>
      <p class="text-xs font-bold text-orange-600 mt-0.5">Clock Out</p>
      <p class="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
        <Clock size={12} strokeWidth={2.5} /> {formatTime(rec.clock_out)}
      </p>
    </div>
    <span class="text-[11px] font-black px-3 py-1 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">OUT</span>
  </div>
{/if}
