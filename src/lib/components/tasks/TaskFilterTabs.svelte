<script lang="ts">
  type FilterValue = 'all' | 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
  type PriorityValue = 'all' | 'low' | 'medium' | 'high'
  type SortValue = 'newest' | 'oldest' | 'due_date' | 'progress'
  
  interface Props {
    activeFilter: FilterValue
    activePriority: PriorityValue
    sortBy: SortValue
    search: string
    onFilterChange: (v: FilterValue) => void
    onPriorityChange: (v: PriorityValue) => void
    onSortChange: (v: SortValue) => void
    onSearchChange: (v: string) => void
  }
  let { activeFilter, activePriority, sortBy, search, onFilterChange, onPriorityChange, onSortChange, onSearchChange }: Props = $props()

  const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'not_started', label: 'Belum Dikerjakan' },
    { value: 'in_progress', label: 'Sedang Dikerjakan' },
    { value: 'review', label: 'Siap Review' },
    { value: 'revision', label: 'Perlu Revisi' },
    { value: 'done', label: 'Selesai' },
  ]

  const PRIORITIES: { value: PriorityValue; label: string }[] = [
    { value: 'all', label: 'Semua Prioritas' },
    { value: 'low', label: 'Rendah' },
    { value: 'medium', label: 'Sedang' },
    { value: 'high', label: 'Tinggi' },
  ]

  const SORTS: { value: SortValue; label: string }[] = [
    { value: 'newest', label: 'Terbaru' },
    { value: 'oldest', label: 'Terlama' },
    { value: 'due_date', label: 'Deadline' },
    { value: 'progress', label: 'Progress' },
  ]
</script>

<div class="flex flex-col gap-3">
  <div class="relative">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
    <input value={search} oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
           placeholder="Cari tugas..."
           class="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-orange-100 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/20 shadow-sm" />
  </div>

  <div class="relative group">
    <!-- Scrollable Container -->
    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth">
      <div class="flex items-center gap-2 animate-peek">
      <div class="flex items-center gap-2 flex-shrink-0 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm hover:border-orange-300 transition-colors">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
        </svg>
        <select 
          value={activeFilter} 
          onchange={(e) => onFilterChange((e.target as HTMLSelectElement).value as FilterValue)}
          class="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer appearance-none uppercase tracking-tight"
        >
          {#each FILTERS as f}
            <option value={f.value}>{f.label}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm hover:border-orange-300 transition-colors">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
        </svg>
        <select 
          value={activePriority} 
          onchange={(e) => onPriorityChange((e.target as HTMLSelectElement).value as PriorityValue)}
          class="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer appearance-none uppercase tracking-tight"
        >
          {#each PRIORITIES as p}
            <option value={p.value}>{p.label}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm hover:border-orange-300 transition-colors">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
        <select 
          value={sortBy} 
          onchange={(e) => onSortChange((e.target as HTMLSelectElement).value as SortValue)}
          class="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer appearance-none uppercase tracking-tight"
        >
          {#each SORTS as s}
            <option value={s.value}>{s.label}</option>
          {/each}
        </select>
      </div>

      {#if activeFilter !== 'all' || activePriority !== 'all' || sortBy !== 'newest' || search}
        <button 
          onclick={() => { onFilterChange('all'); onPriorityChange('all'); onSortChange('newest'); onSearchChange(''); }}
          class="flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-3 py-1.5 text-[10px] font-bold hover:bg-orange-100 transition-all cursor-pointer flex-shrink-0 shadow-sm active:scale-95"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          RESET
        </button>
      {/if}
      
      <!-- Spacer agar tombol Reset tidak tertutup gradient saat scroll mentok -->
      <div class="w-12 flex-shrink-0"></div>
    </div>
    </div>

    <!-- Fade Overlay -->
    <div class="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-[#FFF9F0] to-transparent pointer-events-none z-10 opacity-100 transition-opacity"></div>
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
  
  .animate-peek {
    animation: peekScroll 1.5s ease-in-out;
  }

  @keyframes peekScroll {
    0% { transform: translateX(0); }
    30% { transform: translateX(-20px); }
    100% { transform: translateX(0); }
  }
</style>
