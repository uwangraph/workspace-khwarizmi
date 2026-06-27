<script lang="ts">
  import { ArrowRight } from 'lucide-svelte'
  interface Props {
    attendance: { session_id: number; clock_in: string | null; clock_out: string | null }[]
    sessions: { id: number; label: string; time: string }[]
  }
  let { attendance, sessions }: Props = $props()
</script>

<section class="flex flex-col gap-3">
  <div class="flex justify-between items-center px-1">
    <h3 class="text-lg font-black text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Presensi Hari Ini</h3>
    <a href="/absensi" class="text-xs font-extrabold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
      Detail <ArrowRight size={14} strokeWidth={2.5} />
    </a>
  </div>
  <div class="flex flex-col gap-3">
    {#each sessions as s}
      {@const log = attendance.find(a => a.session_id === s.id)}
      <div class="bg-white rounded-[24px] border-2 border-b-[6px] border-slate-200 p-5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-3.5 h-3.5 rounded-full {log?.clock_out ? 'bg-emerald-500 ring-4 ring-emerald-100' : log?.clock_in ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-slate-200'}"></div>
          <div>
            <p class="text-base font-extrabold text-slate-800">{s.label}</p>
            <p class="text-xs font-bold text-slate-400 mt-0.5">{s.time}</p>
          </div>
        </div>
        <div>
          {#if log?.clock_out}
            <span class="inline-block text-xs font-extrabold px-3.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl">SELESAI</span>
          {:else if log?.clock_in}
            <span class="inline-block text-xs font-extrabold px-3.5 py-1.5 bg-orange-100 text-orange-700 rounded-xl">AKTIF</span>
          {:else}
            <span class="inline-block text-xs font-extrabold px-3.5 py-1.5 bg-slate-100 text-slate-400 rounded-xl">BELUM</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</section>
