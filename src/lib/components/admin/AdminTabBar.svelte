<script lang="ts">
  import type { AdminTab } from '$lib/components/admin/_types'
  import {
    BarChart3, Users, ClipboardList, Clock, FileText, CalendarOff, Settings
  } from 'lucide-svelte'

  interface Props {
    activeTab: AdminTab
    onTabChange: (tab: AdminTab) => void
    pendingLeavesCount?: number
  }
  let { activeTab, onTabChange, pendingLeavesCount = 0 }: Props = $props()

  const TABS: { id: AdminTab; label: string; Icon: any }[] = [
    { id: 'overview',    label: 'Ringkasan',  Icon: BarChart3     },
    { id: 'users',       label: 'Pengguna',   Icon: Users         },
    { id: 'tasks',       label: 'Tugas',      Icon: ClipboardList },
    { id: 'attendance',  label: 'Kehadiran',  Icon: Clock         },
    { id: 'rekap',       label: 'Rekap',      Icon: FileText      },
    { id: 'holidays',    label: 'Libur',      Icon: CalendarOff   },
    { id: 'settings',    label: 'Pengaturan', Icon: Settings      },
  ]
</script>

<div class="sticky top-[64px] z-40 bg-white/90 backdrop-blur-md border-b-[4px] border-slate-200 py-2.5 px-4 shadow-xs">
  <div class="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
    {#each TABS as tab}
      {@const isActive = activeTab === tab.id}
      <button
        onclick={() => onTabChange(tab.id)}
        class="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all whitespace-nowrap cursor-pointer flex-shrink-0 active:translate-y-0.5 {isActive ? 'bg-orange-100 text-orange-600 border-2 border-b-[4px] border-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-700 bg-transparent hover:bg-slate-100 border-2 border-transparent'}"
        aria-current={isActive ? 'page' : undefined}
        style="font-family:'Plus Jakarta Sans',sans-serif;"
      >
        <svelte:component this={tab.Icon} size={16} class={isActive ? 'text-orange-600' : 'text-slate-400'} />
        <span>{tab.label}</span>
        
        {#if tab.id === 'attendance' && pendingLeavesCount > 0}
          <span class="inline-flex items-center justify-center bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full border-2 border-red-700 shadow-xs ml-1 leading-none">{pendingLeavesCount}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
