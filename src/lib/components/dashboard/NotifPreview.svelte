<script lang="ts">
  import { ArrowRight } from 'lucide-svelte'
  interface PreviewNotification {
    id: string; type: string; title: string; message: string; is_read: boolean; created_at: string; data?: any
  }
  interface Props {
    recentNotifs: PreviewNotification[]
    getIcon: (type: string) => { bg: string; color: string; path: string }
    formatTimeAgo: (iso: string) => string
    onClick: (n: PreviewNotification) => void
  }
  let { recentNotifs, getIcon, formatTimeAgo, onClick }: Props = $props()
</script>
<section class="flex flex-col gap-2">
  <div class="flex justify-between items-center px-1">
    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pemberitahuan</p>
    <a href="/notifications" class="text-[10px] font-bold text-orange-600 flex items-center gap-1 cursor-pointer hover:text-orange-700 transition-colors">
      Lihat Semua <ArrowRight size={12} />
    </a>
  </div>
  <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
    {#each recentNotifs as notif}
      {@const icon = getIcon(notif.type)}
      <button 
        onclick={() => onClick(notif)}
        class="w-full flex items-start gap-3 p-4 hover:bg-orange-50/30 transition-colors text-left cursor-pointer {notif.is_read ? '' : 'bg-orange-50/30'}"
      >
        <div class="w-9 h-9 rounded-xl {icon.bg} flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 {icon.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d={icon.path}/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-0.5">
            <p class="text-sm font-semibold text-slate-800 truncate">{notif.title}</p>
            <p class="text-[9px] text-slate-400 font-medium whitespace-nowrap">{formatTimeAgo(notif.created_at)}</p>
          </div>
          <p class="text-[11px] text-slate-500 truncate mb-1">{notif.message}</p>
          {#if (notif as any).data?.sender_name}
            <span class="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 uppercase tracking-wider">
              Oleh: {(notif as any).data.sender_name}
            </span>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</section>
