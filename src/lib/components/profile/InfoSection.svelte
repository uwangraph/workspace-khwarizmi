<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'
  interface Row { Icon: any; label: string; val: string | null | undefined; multiline?: boolean }
  interface Action { Icon: any; label: string; sublabel?: string; bg: string; iconColor: string; badge?: number; onClick: () => void }
  interface Props {
    title: string
    rows?: Row[]
    actions?: Action[]
  }
  let { title, rows = [], actions = [] }: Props = $props()
</script>

<div>
  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">{title}</p>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
    {#each rows as row}
      <div class="flex items-start gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
        <div class="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svelte:component this={row.Icon} size={16} class="text-slate-500" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{row.label}</p>
          <p class="text-sm font-medium mt-0.5 {row.multiline ? 'leading-relaxed break-all' : 'truncate'}"
             style="color:{row.val ? '#1e293b' : '#94a3b8'}; font-style:{row.val ? 'normal' : 'italic'};">
            {row.val || 'Belum diisi'}
          </p>
        </div>
      </div>
    {/each}

    {#each actions as act, i}
      <button onclick={act.onClick}
              class="w-full flex items-center gap-3 px-5 py-3.5 {i < actions.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-orange-50/40 transition-colors text-left cursor-pointer">
        <div class="w-9 h-9 rounded-lg {act.bg} flex items-center justify-center flex-shrink-0">
          <svelte:component this={act.Icon} size={16} class={act.iconColor} />
        </div>
        <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-slate-800">{act.label}</p>
            {#if act.sublabel}<p class="text-[11px] text-slate-500 mt-0.5 truncate">{act.sublabel}</p>{/if}
          </div>
          {#if act.badge && act.badge > 0}
            <span class="flex-shrink-0 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 animate-bounce-short">
              {act.badge > 99 ? '99+' : act.badge}
            </span>
          {/if}
        </div>
        <ChevronRight size={16} class="text-slate-300 flex-shrink-0" />
      </button>
    {/each}
  </div>
</div>
