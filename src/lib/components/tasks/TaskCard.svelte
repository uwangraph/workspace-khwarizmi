<script lang="ts">
  interface Task {
    id: string; title: string; status: string; priority: string
    due_date: string | null; progress: number; created_by: string
  }
  interface Contributor { id: string; name: string; avatar: string | null; status: string }
  interface Props {
    task: Task
    isPending: boolean
    due: { label: string; color: string; urgent: boolean } | null
    contributors: Contributor[]
    onClick: () => void
    getInitials: (n: string) => string
    getAvatarGradient: (s?: string) => string
  }

  const PRIORITY_DOT: Record<string, string> = { low: '#94A3B8', medium: '#F59E0B', high: '#EF4444' }
  const STATUS_LABEL: Record<string, string> = { not_started:'Belum Dikerjakan', in_progress:'Sedang Dikerjakan', review:'Review', revision:'Revisi', done:'Selesai' }
  const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
    not_started: { bg:'bg-slate-100', text:'text-slate-600', dot:'#94A3B8' },
    in_progress:  { bg:'bg-blue-50',  text:'text-blue-700',  dot:'#3B82F6' },
    review:       { bg:'bg-purple-50',text:'text-purple-700', dot:'#A855F7' },
    revision:     { bg:'bg-amber-50', text:'text-amber-700',  dot:'#F59E0B' },
    done:         { bg:'bg-green-50', text:'text-green-700',  dot:'#22C55E' },
  }
  const PRIORITY_LABEL: Record<string,string> = { low:'Rendah', medium:'Sedang', high:'Tinggi' }

  let { task, isPending, due, contributors, onClick, getInitials, getAvatarGradient }: Props = $props()
  let statusStyle = $derived(STATUS_STYLE[task.status])
</script>

<button type="button" onclick={onClick}
        class="text-left bg-white/90 rounded-xl p-3.5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer w-full
               {isPending ? 'border-blue-200 ring-2 ring-blue-100' : 'border-white/50'}">
  <div class="flex items-start gap-2.5">
    <div class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
         style="background:{PRIORITY_DOT[task.priority]};"
         title="Prioritas {PRIORITY_LABEL[task.priority]}"></div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <p class="font-bold text-slate-800 text-sm leading-snug line-clamp-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {task.title}
        </p>
        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full {statusStyle.bg} {statusStyle.text} flex-shrink-0 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full" style="background:{statusStyle.dot};"></span>
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      <div class="flex items-center justify-between gap-2 mt-2">
        <div class="flex items-center gap-3 text-[11px]">
          {#if due}
            <div class="flex items-center gap-1 {due.color} {due.urgent ? 'font-semibold' : ''}">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {due.label}
            </div>
          {/if}
          <div class="text-slate-500 flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            {contributors.length}
          </div>
        </div>

        {#if contributors.length > 0}
          <div class="flex -space-x-1.5">
            {#each contributors.slice(0, 3) as c}
              <div class="w-6 h-6 rounded-full overflow-hidden border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                   style="background: {c.avatar ? 'white' : getAvatarGradient(c.status)};" title="{c.name} ({c.status})">
                {#if c.avatar}<img src={c.avatar} alt={c.name} class="w-full h-full object-cover" />{:else}{getInitials(c.name)}{/if}
              </div>
            {/each}
            {#if contributors.length > 3}
              <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 border-2 border-white">
                +{contributors.length - 3}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if !isPending && task.progress > 0}
        <div class="mt-2.5 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               style="width: {task.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
        </div>
      {/if}

      {#if isPending}
        <div class="mt-2.5 flex items-center gap-2 text-[10px] font-semibold text-blue-700">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Ketuk untuk merespon undangan
        </div>
      {/if}
    </div>
  </div>
</button>
