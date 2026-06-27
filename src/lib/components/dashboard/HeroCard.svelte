<script lang="ts">
  interface Props {
    heroDate: string
    greeting: string
    firstName: string
    gpsActive: boolean
    totalIn: number
    totalSessions: number
    taskActive: number
    completionRate: number
  }
  let { heroDate, greeting, firstName, gpsActive, totalIn, totalSessions, taskActive, completionRate }: Props = $props()
</script>

<div class="rounded-[32px] p-7 sm:p-8 bg-gradient-to-b from-orange-500 to-orange-600 border-2 border-b-[8px] border-orange-700 shadow-xl shadow-orange-500/25">
  <div class="mb-8">
    <p class="text-xs sm:text-sm font-extrabold text-orange-100 tracking-wider uppercase mb-1.5">{heroDate}</p>
    <h2 class="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{greeting},<br/>{firstName}!</h2>
  </div>
  <div class="grid grid-cols-3 gap-3 sm:gap-4">
    <div class="bg-white border-2 border-b-[5px] border-slate-200 rounded-2xl p-3.5 sm:p-4 text-center shadow-sm flex flex-col justify-center transition-all">
      <p class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{totalIn}/{totalSessions}</p>
      <p class="text-[11px] font-black text-slate-500 mt-1 uppercase tracking-wider">Kehadiran</p>
    </div>
    <div class="bg-white border-2 border-b-[5px] border-slate-200 rounded-2xl p-3.5 sm:p-4 text-center shadow-sm flex flex-col justify-center transition-all">
      <p class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{taskActive}</p>
      <p class="text-[11px] font-black text-slate-500 mt-1 uppercase tracking-wider">Task Aktif</p>
    </div>
    <div class="bg-white border-2 border-b-[5px] border-slate-200 rounded-2xl p-3.5 sm:p-4 text-center shadow-sm flex flex-col justify-center transition-all">
      <p class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{completionRate}%</p>
      <p class="text-[11px] font-black text-slate-500 mt-1 uppercase tracking-wider">Selesai</p>
    </div>
  </div>
</div>
