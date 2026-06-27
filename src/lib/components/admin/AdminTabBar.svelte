<script lang="ts">
  import type { AdminTab } from '$lib/components/admin/_types'
  import { BarChart3, Users, ClipboardList, Clock, FileText, CalendarOff, Settings } from 'lucide-svelte'

  interface Props {
    activeTab: AdminTab
    onTabChange: (tab: AdminTab) => void
    pendingLeavesCount?: number
  }
  let { activeTab, onTabChange, pendingLeavesCount = 0 }: Props = $props()

  const TABS: { id: AdminTab; label: string; Icon: any }[] = [
    { id: 'overview',   label: 'Ringkasan',  Icon: BarChart3     },
    { id: 'users',      label: 'Pengguna',   Icon: Users         },
    { id: 'tasks',      label: 'Tugas',      Icon: ClipboardList },
    { id: 'attendance', label: 'Kehadiran',  Icon: Clock         },
    { id: 'rekap',      label: 'Rekap',      Icon: FileText      },
    { id: 'holidays',   label: 'Libur',      Icon: CalendarOff   },
    { id: 'settings',   label: 'Pengaturan', Icon: Settings      },
  ]
</script>

<div class="sticky top-[64px] z-40 bg-white/90 backdrop-blur-md border-b-[4px] border-slate-200 py-2.5 px-4 shadow-xs">
  <div class="max-w-6xl mx-auto flex items-center justify-center gap-1.5">
    {#each TABS as tab}
      {@const isActive = activeTab === tab.id}
      <button
        onclick={() => onTabChange(tab.id)}
        class="relative flex items-center justify-center gap-2 py-2.5 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer active:translate-y-0.5 flex-shrink-0
          {isActive
            ? 'px-4 bg-orange-500 text-white border-2 border-b-[4px] border-orange-700 shadow-md'
            : 'px-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-2 border-transparent'}"
        aria-current={isActive ? 'page' : undefined}
        style="font-family:'Plus Jakarta Sans',sans-serif;"
      >
        <svelte:component this={tab.Icon} size={16} />
        {#if isActive}
          <span class="whitespace-nowrap">{tab.label}</span>
        {/if}
        {#if tab.id === 'attendance' && pendingLeavesCount > 0}
          <span class="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center bg-red-500 text-white font-black text-[9px] min-w-[16px] h-4 px-1 rounded-full border border-white shadow leading-none">{pendingLeavesCount}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>
