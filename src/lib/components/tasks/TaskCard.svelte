<script lang="ts">
  interface Task {
    id: string; title: string; status: string; priority: string
    due_date: string | null; progress: number; created_by: string
  }
  interface Contributor { id: string; name: string; avatar: string | null; status: string }
  interface Props {
    task: Task
    isPending: boolean
    isPinned: boolean
    selectionMode?: boolean
    isSelected?: boolean
    due: { label: string; color: string; urgent: boolean } | null
    contributors: Contributor[]
    onClick: () => void
    onSelect?: () => void
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

  let { task, isPending, isPinned, selectionMode = false, isSelected = false, due, contributors, onClick, onSelect, getInitials, getAvatarGradient }: Props = $props()
  let statusStyle = $derived(STATUS_STYLE[task.status])
</script>

<button type="button" onclick={(e) => { if (selectionMode && onSelect) { e.preventDefault(); e.stopPropagation(); onSelect(); } else { onClick(); } }}
        class="text-left bg-white rounded-[24px] p-5 shadow-sm border-2 border-b-[6px] transition-all hover:border-slate-300 active:translate-y-0.5 active:border-b-[3px] cursor-pointer w-full
               {isPending ? 'border-blue-300 bg-blue-50/20' : (isSelected ? 'border-orange-500 bg-orange-50/40' : 'border-slate-200')}">
  <div class="flex items-start gap-3.5 relative">
    {#if selectionMode}
      <div class="my-auto flex-shrink-0 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors {isSelected ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'border-slate-300 bg-white'}">
        {#if isSelected}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        {/if}
      </div>
    {/if}
    
    <div class="w-2.5 h-10 rounded-full mt-0.5 flex-shrink-0 shadow-inner"
         style="background:{PRIORITY_DOT[task.priority]};"
         title="Prioritas {PRIORITY_LABEL[task.priority]}"></div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <p class="font-extrabold text-slate-800 text-base leading-snug line-clamp-1" style="font-family:'Plus Jakarta Sans',sans-serif;">
          {task.title}
        </p>
        <div class="flex items-center gap-2 flex-shrink-0">
          {#if isPinned}
            <span class="text-orange-500">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>
            </span>
          {/if}
          <span class="text-[11px] font-black px-3 py-1 rounded-xl {statusStyle.bg} {statusStyle.text} flex items-center gap-1.5 border border-slate-200/60 shadow-sm">
            <span class="w-2 h-2 rounded-full" style="background:{statusStyle.dot};"></span>
            {STATUS_LABEL[task.status]}
          </span>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 mt-3">
        <div class="flex items-center gap-3 text-xs font-bold">
          {#if due}
            <div class="flex items-center gap-1.5 {due.color} {due.urgent ? 'font-extrabold bg-red-50 px-2 py-0.5 rounded-lg border border-red-100' : ''}">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {due.label}
            </div>
          {/if}
          <div class="text-slate-400 flex items-center gap-1.5 font-extrabold">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            {contributors.length}
          </div>
        </div>

        {#if contributors.length > 0}
          <div class="flex -space-x-2">
            {#each contributors.slice(0, 3) as c}
              <div class="w-7 h-7 rounded-full overflow-hidden border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                   style="background: {c.avatar ? 'white' : getAvatarGradient(c.status)};" title="{c.name} ({c.status})">
                {#if c.avatar}<img src={c.avatar} alt={c.name} class="w-full h-full object-cover" />{:else}{getInitials(c.name)}{/if}
              </div>
            {/each}
            {#if contributors.length > 3}
              <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 border-2 border-white shadow-sm">
                +{contributors.length - 3}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if !isPending && task.progress > 0}
        <div class="mt-3.5 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div class="h-full rounded-full transition-all duration-500"
               style="width: {task.progress}%; background: linear-gradient(90deg, #F97316, #EA580C);"></div>
        </div>
      {/if}

      {#if isPending}
        <div class="mt-3.5 flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Ketuk untuk merespon undangan
        </div>
      {/if}
    </div>
  </div>
</button>
