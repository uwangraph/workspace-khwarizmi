<script lang="ts">
  import { ArrowRight } from 'lucide-svelte'
  interface Props {
    attendance: { session_id: number; check_in: string | null; check_out: string | null }[]
    sessions: { id: number; label: string; time: string }[]
  }
  let { attendance, sessions }: Props = $props()
</script>
<section class="flex flex-col gap-2">
  <div class="flex justify-between items-center px-1">
    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Absensi Hari Ini</p>
    <a href="/absensi" class="text-[10px] font-bold text-orange-600 flex items-center gap-1 cursor-pointer hover:text-orange-700 transition-colors">
      Detail Absensi <ArrowRight size={12} />
    </a>
  </div>
  <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
    {#each sessions as s}
      {@const log = attendance.find(a => a.session_id === s.id)}
      <div class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full {log?.check_out ? 'bg-green-500' : log?.check_in ? 'bg-orange-500' : 'bg-slate-200'}"></div>
          <div>
            <p class="text-sm font-semibold text-slate-800">{s.label}</p>
            <p class="text-[10px] text-slate-400">{s.time}</p>
          </div>
        </div>
        <div class="text-right">
          {#if log?.check_out}
            <span class="text-[9px] font-bold px-2 py-1 bg-green-50 text-green-600 rounded-lg">SELESAI</span>
          {:else if log?.check_in}
            <span class="text-[9px] font-bold px-2 py-1 bg-orange-50 text-orange-600 rounded-lg">AKTIF</span>
          {:else}
            <span class="text-[9px] font-bold px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">BELUM</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</section>
