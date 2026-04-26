<script lang="ts">
  interface ThursdayRule {
    type: 'normal' | 'custom_time' | 'wfa'
    start_time?: string | null
    note?: string | null
  }
  interface Props {
    isThursday: boolean
    isFriday: boolean
    thursdayRule: ThursdayRule | null
  }
  let { isThursday, isFriday, thursdayRule }: Props = $props()
</script>

{#if isFriday}
  <div class="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-l-4 border-violet-400" style="background:#F5F3FF;">
    <div class="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
      <span class="text-lg">🕌</span>
    </div>
    <div>
      <p class="text-sm font-bold text-violet-700">Hari Jumat — Libur Mingguan</p>
      <p class="text-xs text-violet-500 mt-0.5">Tidak ada sesi absensi hari ini. Selamat beristirahat!</p>
    </div>
  </div>
{:else if isThursday}
  <div class="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-l-4"
       style="background:{thursdayRule?.type==='wfa'?'#EFF6FF':thursdayRule?.type==='custom_time'?'#FFFBEB':'#FFF7ED'};
              border-left-color:{thursdayRule?.type==='wfa'?'#3B82F6':thursdayRule?.type==='custom_time'?'#F59E0B':'#F97316'}">
    <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
         style="background:{thursdayRule?.type==='wfa'?'#DBEAFE':thursdayRule?.type==='custom_time'?'#FEF3C7':'#FFEDD5'}">
      <span class="text-lg">{thursdayRule?.type==='wfa'?'🏠':thursdayRule?.type==='custom_time'?'⏰':'📅'}</span>
    </div>
    <div>
      <p class="text-sm font-bold text-slate-700">
        Hari Kamis — Hanya Sesi Pagi
        {#if thursdayRule?.type === 'wfa'} · Mode WFA{/if}
      </p>
      <p class="text-xs text-slate-500 mt-0.5">
        {#if thursdayRule?.type === 'custom_time' && thursdayRule.start_time}
          Masuk jam {thursdayRule.start_time} · Siang & Sore libur
        {:else if thursdayRule?.type === 'wfa'}
          Work From Anywhere · GPS tidak diwajibkan
        {:else}
          Sesi Siang & Sore libur otomatis
        {/if}
      </p>
      {#if thursdayRule?.note}<p class="text-[10px] text-slate-400 mt-1">📝 {thursdayRule.note}</p>{/if}
    </div>
  </div>
{/if}
