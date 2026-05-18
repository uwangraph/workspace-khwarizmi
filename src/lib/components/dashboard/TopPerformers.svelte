<script lang="ts">
  import { Trophy, Info } from 'lucide-svelte'
  import { slide } from 'svelte/transition'

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

  function formatMonth(m: string) {
    const [y, mo] = m.split('-').map(Number)
    const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
    return `${names[mo - 1]} ${y}`
  }

  let showInfo = $state(false)
</script>

{#if performers.length > 0}
<section class="rounded-[32px] border-2 border-b-[8px] border-amber-300 bg-white overflow-hidden shadow-sm">
  <!-- Header -->
  <div class="p-8 bg-gradient-to-r from-amber-400 to-orange-500 text-white flex flex-col items-center justify-center text-center border-b border-amber-300 relative">
    <div class="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border-b-[4px] border-white/30 shadow-sm mb-3">
      <Trophy size={32} strokeWidth={2.5} class="text-white" />
    </div>
    <h2 class="text-2xl sm:text-3xl font-black leading-tight tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Papan Peringkat</h2>
    <p class="text-sm font-black text-amber-100 mt-1 uppercase tracking-widest">{formatMonth(month)}</p>
  </div>

  <div class="p-5 flex flex-col gap-3">
    {#each performers as p, i}
      {@const isCurrent = p.user_id === currentUserId}
      {@const isTop3 = i < 3}
      <div class="flex items-center gap-4 p-4 rounded-[20px] border-2 border-b-[4px] {isCurrent ? 'bg-orange-50 border-orange-300' : 'bg-slate-50/70 border-slate-200'} transition-all">
        <!-- Rank badge -->
        <div class="flex-shrink-0 w-10 text-center">
          {#if isTop3}
            <span class="text-3xl leading-none block">{MEDALS[i]}</span>
          {:else}
            <span class="text-lg font-black text-slate-400">#{i + 1}</span>
          {/if}
        </div>

        <!-- Avatar -->
        <div class="relative flex-shrink-0">
          {#if p.avatar_url}
            <img
              src={p.avatar_url}
              alt={p.full_name}
              class="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
          {:else}
            <div class="w-12 h-12 rounded-full bg-gradient-to-br {getGradient(p.full_name)} flex items-center justify-center border-2 border-white shadow-sm">
              <span class="text-sm font-black text-white">{getInitials(p.full_name)}</span>
            </div>
          {/if}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-base font-extrabold text-slate-800 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">
              {getFirstName(p.full_name)}
            </span>
            {#if isCurrent}
              <span class="text-xs font-black text-white bg-orange-500 px-2.5 py-0.5 rounded-xl flex-shrink-0">Kamu</span>
            {/if}
          </div>
          {#if p.jabatan}
            <p class="text-xs font-bold text-slate-400 mt-0.5 truncate">{p.jabatan}</p>
          {/if}
        </div>

        <!-- Points badge -->
        <div class="flex-shrink-0">
          <span class="inline-block text-sm font-black px-4 py-2 rounded-xl {i === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : i === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' : i === 2 ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
            {p.score} pts
          </span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Footer note with Info toggle -->
  <div class="p-4 pt-1 pb-6 flex flex-col items-center">
    <button onclick={() => showInfo = !showInfo} class="w-10 h-10 rounded-2xl bg-slate-100 border-2 border-b-[4px] border-slate-200 text-slate-500 hover:bg-slate-200 active:translate-y-0.5 active:border-b-[2px] transition-all flex items-center justify-center cursor-pointer shadow-xs" title="Informasi Perhitungan Skor">
      <Info size={20} strokeWidth={2.5} />
    </button>
    {#if showInfo}
      <div transition:slide={{ duration: 200 }} class="mt-4 p-4 rounded-2xl bg-slate-50 text-xs font-black text-slate-600 text-center border-2 border-slate-200 shadow-inner w-full sm:w-5/6 mx-auto leading-relaxed">
        Perhitungan Rincian Skor Bulanan:<br />
        <span class="text-emerald-600">Hadir Tepat Waktu +10</span> · <span class="text-amber-600">Terlambat +5</span> · <span class="text-indigo-600">Tugas Selesai +15</span>
      </div>
    {/if}
  </div>
</section>
{/if}
