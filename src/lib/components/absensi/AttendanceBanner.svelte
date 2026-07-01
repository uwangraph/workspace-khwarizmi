<script lang="ts">
  import { Home, Clock, Calendar, Star, FileText } from 'lucide-svelte'

  interface SpecialRule {
    type: 'normal' | 'custom_time' | 'wfa'
    start_time?: string | null
    note?: string | null
  }
  interface Props {
    isThursday: boolean
    isFriday: boolean
    specialRule: SpecialRule | null
  }
  let { isThursday, isFriday, specialRule }: Props = $props()
</script>

{#if isFriday}
  <div class="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-l-4 border-violet-400" style="background:#F5F3FF;">
    <div class="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
      <Star size={18} class="text-violet-500" strokeWidth={2} />
    </div>
    <div>
      <p class="text-sm font-bold text-violet-700">Hari Jumat — Sesi Reguler Libur</p>
      <p class="text-xs text-violet-500 mt-0.5">Sesi reguler libur hari ini. Sesi <strong>Lembur</strong> tetap tersedia jika diperlukan.</p>
    </div>
  </div>
{:else if specialRule || isThursday}
  <div class="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-l-4"
       style="background:{specialRule?.type==='wfa'?'#EFF6FF':specialRule?.type==='custom_time'?'#FFFBEB':'#FFF7ED'};
              border-left-color:{specialRule?.type==='wfa'?'#3B82F6':specialRule?.type==='custom_time'?'#F59E0B':'#F97316'}">
    <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
         style="background:{specialRule?.type==='wfa'?'#DBEAFE':specialRule?.type==='custom_time'?'#FEF3C7':'#FFEDD5'}">
      {#if specialRule?.type === 'wfa'}
        <Home size={18} class="text-blue-500" strokeWidth={2} />
      {:else if specialRule?.type === 'custom_time'}
        <Clock size={18} class="text-amber-500" strokeWidth={2} />
      {:else}
        <Calendar size={18} class="text-orange-500" strokeWidth={2} />
      {/if}
    </div>
    <div>
      <p class="text-sm font-bold text-slate-700">
        {isThursday ? 'Hari Kamis' : 'Jadwal Khusus'}
        {#if specialRule?.type === 'wfa'} · Mode WFA{/if}
      </p>
      <p class="text-xs text-slate-500 mt-0.5">
        {#if specialRule?.type === 'custom_time' && specialRule.start_time}
          Masuk jam {specialRule.start_time}
        {:else if specialRule?.type === 'wfa'}
          Work From Anywhere · GPS tidak diwajibkan
        {:else if isThursday}
          Hanya Sesi Pagi · Siang & Sore libur otomatis
        {/if}
      </p>
      {#if specialRule?.note}
        <p class="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <FileText size={10} />
          {specialRule.note}
        </p>
      {/if}
    </div>
  </div>
{/if}
