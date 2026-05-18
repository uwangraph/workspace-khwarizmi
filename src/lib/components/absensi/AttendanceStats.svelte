<script lang="ts">
  import { LogIn, Check, Clock } from 'lucide-svelte'
  interface Session { id: number; name: string }
  interface Props {
    attendance: { session_id: number; clock_out: string | null }[]
    activeSessions: Session[]
  }
  let { attendance, activeSessions }: Props = $props()

  const ICONS = [LogIn, Check, Clock]
  const COLORS = ['#F97316', '#10B981', '#F59E0B']
  const LABELS = ['Sesi Masuk', 'Selesai', 'Sisa']

  let stats = $derived([
    { label: LABELS[0], value: attendance.length,                                   total: activeSessions.length, color: COLORS[0], Icon: ICONS[0] },
    { label: LABELS[1], value: attendance.filter(a => a.clock_out).length,          total: activeSessions.length, color: COLORS[1], Icon: ICONS[1] },
    { label: LABELS[2], value: Math.max(0, activeSessions.length - attendance.length), total: activeSessions.length, color: COLORS[2], Icon: ICONS[2] },
  ])
</script>

<div class="grid grid-cols-3 gap-3 my-2">
  {#each stats as s}
    <div class="bg-white rounded-[24px] p-4 border-2 border-b-[6px] border-slate-200 text-center shadow-sm transition-all hover:border-slate-300">
      <div class="flex items-center justify-center gap-1.5 mb-2">
        <svelte:component this={s.Icon} size={18} style="color:{s.color};" strokeWidth={2.5} />
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.label}</span>
      </div>
      <p class="text-3xl font-black" style="color:{s.color}; font-family:'Plus Jakarta Sans',sans-serif;">
        {s.value}<span class="text-base font-extrabold text-slate-300">/{s.total}</span>
      </p>
    </div>
  {/each}
</div>
