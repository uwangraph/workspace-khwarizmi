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
  let { activeTab, onTabChange, pendingLeavesCount = 0 } = $props<Props>()

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

<div class="tab-bar-wrapper">
  <div class="tab-bar-inner">
    {#each TABS as tab}
      {@const isActive = activeTab === tab.id}
      <button
        onclick={() => onTabChange(tab.id)}
        class="tab-btn"
        class:active={isActive}
        aria-current={isActive ? 'page' : undefined}
      >
        <svelte:component this={tab.Icon} size={14} class="tab-icon" />
        <span class="tab-label">{tab.label}</span>
        
        {#if tab.id === 'attendance' && pendingLeavesCount > 0}
          <span class="tab-badge">{pendingLeavesCount}</span>
        {/if}

        {#if isActive}<div class="tab-indicator"></div>{/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .tab-bar-wrapper {
    position: sticky;
    top: 57px;
    z-index: 20;
    background: #fff;
    border-bottom: 1px solid #f1f5f9;
  }

  .tab-bar-inner {
    display: flex;
    max-width: 72rem;
    margin: 0 auto;
    overflow-x: auto;
    padding: 0 1rem;
    gap: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tab-bar-inner::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    height: 44px;
    border: none;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    color: #94a3b8;
    transition: color 0.15s ease;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: #64748b;
  }

  .tab-btn.active {
    color: #ea580c;
  }

  .tab-label {
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1;
  }

  :global(.tab-icon) {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .tab-btn.active :global(.tab-icon) {
    opacity: 1;
  }

  .tab-indicator {
    position: absolute;
    bottom: 0;
    left: 14px;
    right: 14px;
    height: 2px;
    background: #ea580c;
    border-radius: 2px 2px 0 0;
    animation: slide-in 0.15s ease;
  }

  .tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #ef4444;
    color: white;
    font-size: 9px;
    font-weight: 700;
    height: 16px;
    min-width: 16px;
    padding: 0 4px;
    border-radius: 99px;
    margin-left: 2px;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
  }

  @keyframes slide-in {
    from { opacity: 0; transform: scaleX(0.5); }
    to   { opacity: 1; transform: scaleX(1); }
  }
</style>
