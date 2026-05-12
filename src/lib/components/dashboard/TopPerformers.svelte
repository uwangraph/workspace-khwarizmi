<script lang="ts">
  import { Trophy, Star, CheckCircle, Clock } from 'lucide-svelte'

  interface Performer {
    user_id: string
    full_name: string
    avatar_url: string | null
    jabatan: string | null
    ontime_count: number
    late_count: number
    task_done_count: number
    score: number
  }

  let { performers, currentUserId, month }: {
    performers: Performer[]
    currentUserId: string
    month: string
  } = $props()

  const AVATAR_GRADIENTS = [
    'from-orange-400 to-rose-500',
    'from-violet-500 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-sky-400 to-blue-600',
    'from-pink-400 to-fuchsia-600',
  ]

  function getGradient(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
  }

  function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  function getFirstName(name: string) {
    return name.split(' ')[0]
  }

  const MEDALS = ['🥇', '🥈', '🥉']
  const RANK_RING = [
    'ring-2 ring-amber-400 shadow-amber-200',
    'ring-2 ring-slate-300 shadow-slate-200',
    'ring-2 ring-orange-300 shadow-orange-200',
  ]
  const RANK_LABEL_BG = [
    'bg-amber-400 text-white',
    'bg-slate-300 text-slate-700',
    'bg-orange-300 text-white',
  ]

  let topScore = $derived(performers[0]?.score || 1)

  function barWidth(score: number) {
    return Math.max(8, Math.round((score / topScore) * 100))
  }

  function formatMonth(m: string) {
    const [y, mo] = m.split('-').map(Number)
    const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
    return `${names[mo - 1]} ${y}`
  }
</script>

{#if performers.length > 0}
<section class="rounded-3xl overflow-hidden border border-orange-100 bg-white shadow-sm">
  <!-- Header -->
  <div class="relative px-5 pt-5 pb-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-b border-orange-100">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200/60">
          <Trophy size={17} class="text-white" />
        </div>
        <div>
          <h2 class="text-sm font-extrabold text-slate-800 leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Top Performer</h2>
          <p class="text-[10px] text-orange-500 font-semibold">{formatMonth(month)}</p>
        </div>
      </div>
      <span class="text-[10px] text-slate-400 font-medium bg-white/70 px-2 py-1 rounded-full border border-orange-100">
        Skor bulanan
      </span>
    </div>
  </div>

  <div class="px-4 pt-4 pb-5 flex flex-col gap-2.5">
    {#each performers as p, i}
      {@const isCurrent = p.user_id === currentUserId}
      {@const isTop3 = i < 3}
      <div class="relative flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all
        {isCurrent
          ? 'bg-orange-50 border border-orange-200 shadow-sm shadow-orange-100'
          : isTop3
            ? 'bg-slate-50/60 border border-slate-100'
            : 'bg-slate-50/30 border border-transparent'}"
      >
        <!-- Rank badge -->
        <div class="flex-shrink-0 w-7 text-center">
          {#if isTop3}
            <span class="text-xl leading-none">{MEDALS[i]}</span>
          {:else}
            <span class="text-xs font-bold text-slate-400">#{i + 1}</span>
          {/if}
        </div>

        <!-- Avatar -->
        <div class="relative flex-shrink-0">
          {#if p.avatar_url}
            <img
              src={p.avatar_url}
              alt={p.full_name}
              class="w-10 h-10 rounded-full object-cover shadow-sm {isTop3 ? RANK_RING[i] : ''}"
            />
          {:else}
            <div class="w-10 h-10 rounded-full bg-gradient-to-br {getGradient(p.full_name)} flex items-center justify-center shadow-sm {isTop3 ? RANK_RING[i] : ''}">
              <span class="text-xs font-bold text-white">{getInitials(p.full_name)}</span>
            </div>
          {/if}
          {#if isCurrent}
            <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white"></span>
          {/if}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="text-[13px] font-bold text-slate-800 truncate leading-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">
              {getFirstName(p.full_name)}
            </span>
            {#if isCurrent}
              <span class="text-[9px] font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Kamu</span>
            {/if}
          </div>
          <!-- Score bar -->
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700
                  {i === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : i === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                  : i === 2 ? 'bg-gradient-to-r from-orange-300 to-amber-400'
                  : 'bg-gradient-to-r from-blue-300 to-indigo-400'}"
                style="width: {barWidth(p.score)}%"
              ></div>
            </div>
            <span class="text-[11px] font-extrabold flex-shrink-0
              {i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-orange-400' : 'text-slate-400'}">
              {p.score} pts
            </span>
          </div>
          <!-- Stats chips -->
          <div class="flex items-center gap-2 mt-1.5">
            <span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
              <CheckCircle size={10} />
              {p.ontime_count} tepat
            </span>
            {#if p.late_count > 0}
              <span class="inline-flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                <Clock size={10} />
                {p.late_count} terlambat
              </span>
            {/if}
            {#if p.task_done_count > 0}
              <span class="inline-flex items-center gap-1 text-[10px] text-violet-500 font-semibold">
                <Star size={10} />
                {p.task_done_count} tugas
              </span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Footer note -->
  <div class="px-5 pb-4 -mt-1">
    <p class="text-[10px] text-slate-400 text-center">
      Skor: hadir tepat waktu +10 · terlambat +5 · tugas selesai +15
    </p>
  </div>
</section>
{/if}
