<script lang="ts">
  import { Clock, Eye } from 'lucide-svelte'
  interface AttendanceRecord {
    id: string; session_id: number
    photo_in_url: string | null; photo_out_url: string | null
    check_in: string | null; check_out: string | null; late: boolean
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
  <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
    <img src={rec.photo_in_url} alt="Check-in"
         onclick={() => onViewPhoto(rec.photo_in_url!)}
         onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
         class="w-12 h-12 flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover hover:scale-105 transition-transform" />
    <div class="flex-1 min-w-0">
      <p class="text-sm font-bold text-slate-800">{sesi?.name}</p>
      <p class="text-xs font-medium mt-0.5 {rec.late ? 'text-amber-600' : 'text-green-600'}">
        {rec.late ? 'Terlambat' : 'Tepat Waktu'}
      </p>
      <p class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
        <Clock size={10} /> {formatTime(rec.check_in)}
        <span class="mx-1">·</span>
        <Eye size={10} /> Ketuk untuk perbesar
      </p>
    </div>
    <span class="text-[9px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex-shrink-0">IN</span>
  </div>
{/if}

{#if rec.photo_out_url}
  <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
    <img src={rec.photo_out_url} alt="Check-out"
         onclick={() => onViewPhoto(rec.photo_out_url!)}
         onerror={(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }}
         class="w-12 h-12 flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 object-cover hover:scale-105 transition-transform" />
    <div class="flex-1 min-w-0">
      <p class="text-sm font-bold text-slate-800">{sesi?.name}</p>
      <p class="text-xs font-medium text-orange-600 mt-0.5">Check-out</p>
      <p class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
        <Clock size={10} /> {formatTime(rec.check_out)}
      </p>
    </div>
    <span class="text-[9px] font-bold px-2 py-1 rounded-lg bg-green-50 text-green-600 border border-green-200 flex-shrink-0">OUT</span>
  </div>
{/if}
