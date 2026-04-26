<script lang="ts">
  type FilterValue = 'all' | 'not_started' | 'in_progress' | 'review' | 'revision' | 'done'
  interface Props {
    activeFilter: FilterValue
    search: string
    onFilterChange: (v: FilterValue) => void
    onSearchChange: (v: string) => void
  }
  let { activeFilter, search, onFilterChange, onSearchChange }: Props = $props()

  const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'not_started', label: 'Belum' },
    { value: 'in_progress', label: 'Progress' },
    { value: 'review', label: 'Review' },
    { value: 'revision', label: 'Revisi' },
    { value: 'done', label: 'Selesai' },
  ]
</script>

<div class="flex flex-col gap-3">
  <div class="relative">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
    <input value={search} oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
           placeholder="Cari judul atau deskripsi tugas..."
           class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-orange-100 text-sm bg-white/90 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm" />
  </div>

  <div class="flex gap-1 bg-slate-100/80 rounded-xl p-1 overflow-x-auto">
    {#each FILTERS as f}
      <button onclick={() => onFilterChange(f.value)}
              class="flex-1 min-w-fit py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer
                     {activeFilter === f.value ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
        {f.label}
      </button>
    {/each}
  </div>
</div>
