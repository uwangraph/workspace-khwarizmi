<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'
  interface Row { Icon: any; label: string; val: string | null | undefined; multiline?: boolean }
  interface Action { Icon: any; label: string; sublabel?: string; bg: string; iconColor: string; badge?: number; href?: string; onClick: () => void }
  interface Props {
    title: string
    rows?: Row[]
    actions?: Action[]
  }
  let { title, rows = [], actions = [] }: Props = $props()
</script>

<div>
  <p class="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2.5">{title}</p>
  <div class="bg-white rounded-[24px] shadow-sm border-2 border-b-[6px] border-slate-200 overflow-hidden transition-all hover:border-slate-300 divide-y-2 divide-slate-100">
    {#each rows as row}
      <div class="flex items-start gap-4 px-5 py-4.5">
        <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
          <svelte:component this={row.Icon} size={20} class="text-slate-500" strokeWidth={2.5} />
        </div>
        <div class="flex-1 min-w-0 my-auto">
          <p class="text-xs font-extrabold text-slate-400">{row.label}</p>
          <p class="text-base font-extrabold mt-1 {row.multiline ? 'leading-relaxed break-all' : 'truncate'}"
             style="color:{row.val ? '#1E293B' : '#94A3B8'}; font-style:{row.val ? 'normal' : 'italic'}; font-family:'Plus Jakarta Sans',sans-serif;">
            {row.val || 'Belum diisi'}
          </p>
        </div>
      </div>
    {/each}

    {#each actions as act}
      <button onclick={act.onClick}
              class="w-full flex items-center gap-4 px-5 py-4.5 hover:bg-slate-50 transition-colors text-left cursor-pointer active:bg-slate-100">
        <div class="w-12 h-12 rounded-2xl {act.bg} border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svelte:component this={act.Icon} size={20} class={act.iconColor} strokeWidth={2.5} />
        </div>
        <div class="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div>
            <p class="text-base font-extrabold text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{act.label}</p>
            {#if act.sublabel}<p class="text-xs font-bold text-slate-400 mt-1 truncate">{act.sublabel}</p>{/if}
          </div>
          {#if act.badge && act.badge > 0}
            <span class="flex-shrink-0 bg-orange-500 text-white text-xs font-black min-w-[22px] h-[22px] px-2 rounded-full flex items-center justify-center shadow-md animate-bounce border-2 border-white">
              {act.badge > 99 ? '99+' : act.badge}
            </span>
          {/if}
        </div>
        <ChevronRight size={18} class="text-slate-300 flex-shrink-0" strokeWidth={3} />
      </button>
    {/each}
  </div>
</div>
