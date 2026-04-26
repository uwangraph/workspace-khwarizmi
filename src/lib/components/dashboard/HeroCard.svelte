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
<div class="rounded-3xl p-6 shadow-lg shadow-orange-200/50" style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);">
  <div class="flex justify-between items-start mb-6">
    <div>
      <p class="text-[11px] text-orange-100/80 mb-1">{heroDate}</p>
      <h2 class="text-2xl font-bold text-white leading-tight">{greeting},<br/>{firstName}</h2>
    </div>
    <div class="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md flex items-center gap-2">
      <div class="w-2 h-2 rounded-full {gpsActive ? 'bg-green-400 animate-pulse' : 'bg-orange-300'}"></div>
      <span class="text-[10px] font-bold text-white">{gpsActive ? 'GPS AKTIF' : 'GPS OFF'}</span>
    </div>
  </div>
  <div class="grid grid-cols-3 gap-3">
    <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
      <p class="text-xl font-bold text-white">{totalIn}/{totalSessions}</p>
      <p class="text-[9px] text-orange-100 font-medium">Kehadiran</p>
    </div>
    <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
      <p class="text-xl font-bold text-white">{taskActive}</p>
      <p class="text-[9px] text-orange-100 font-medium">Task Aktif</p>
    </div>
    <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
      <p class="text-xl font-bold text-white">{completionRate}%</p>
      <p class="text-[9px] text-orange-100 font-medium">Selesai</p>
    </div>
  </div>
</div>
