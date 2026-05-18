<script lang="ts">
  import { ArrowRight } from 'lucide-svelte'
  import type { AppNotification } from '$lib/type'
  interface Props {
    recentNotifs: AppNotification[]
    getIcon: (type: string) => { bg: string; color: string; path: string }
    formatTimeAgo: (iso: string) => string
    onClick: (n: AppNotification) => void
  }
  let { recentNotifs, getIcon, formatTimeAgo, onClick }: Props = $props()
</script>

<section class="flex flex-col gap-3">
  <div class="flex justify-between items-center px-1">
    <h3 class="text-lg font-black text-slate-800 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Pemberitahuan</h3>
    <a href="/notifications" class="text-xs font-extrabold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
      Lihat Semua <ArrowRight size={14} strokeWidth={2.5} />
    </a>
  </div>
  <div class="flex flex-col gap-3">
    {#each recentNotifs as notif}
      {@const icon = getIcon(notif.type)}
      <button 
        onclick={() => onClick(notif)}
        class="w-full bg-white rounded-[24px] border-2 border-b-[6px] {notif.is_read ? 'border-slate-200' : 'border-orange-300 bg-orange-50/20'} p-5 flex items-start gap-4 hover:border-slate-300 active:translate-y-0.5 active:border-b-[3px] transition-all text-left cursor-pointer"
      >
        <div class="w-12 h-12 rounded-2xl {icon.bg} flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg class="w-6 h-6 {icon.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d={icon.path}/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <p class="text-base font-extrabold text-slate-800 truncate">{notif.title}</p>
            <p class="text-xs text-slate-400 font-extrabold whitespace-nowrap">{formatTimeAgo(notif.created_at)}</p>
          </div>
          <p class="text-sm text-slate-600 line-clamp-2 mb-2 font-medium leading-snug">{notif.message}</p>
          {#if (notif as any).data?.sender_name}
            <span class="inline-block text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-100 text-slate-500 uppercase tracking-wider">
              Oleh: {(notif as any).data.sender_name}
            </span>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</section>
