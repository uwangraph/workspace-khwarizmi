<script lang="ts">
  import type { AdminTab } from '$lib/components/admin/_types'
  import {
    BarChart3, Users, ClipboardList, Clock, FileText, CalendarOff
  } from 'lucide-svelte'

  interface Props {
    activeTab: AdminTab
    onTabChange: (tab: AdminTab) => void
  }
  let { activeTab, onTabChange } = $props<Props>()

  const TABS: { id: AdminTab; label: string; Icon: any; desc: string }[] = [
    { id: 'overview',    label: 'Ringkasan',  Icon: BarChart3,     desc: 'Statistik hari ini' },
    { id: 'users',       label: 'Pengguna',   Icon: Users,         desc: 'Kelola akun' },
    { id: 'tasks',       label: 'Tugas',      Icon: ClipboardList, desc: 'Semua pekerjaan' },
    { id: 'attendance',  label: 'Kehadiran',  Icon: Clock,         desc: 'Absensi harian' },
    { id: 'rekap',       label: 'Rekap',      Icon: FileText,      desc: 'Laporan lengkap' },
    { id: 'holidays',    label: 'Hari Libur', Icon: CalendarOff,   desc: 'Kelola libur' },
  ]
</script>

<div class="sticky top-[57px] z-20 bg-white border-b border-slate-200 shadow-sm">
  <div class="flex max-w-6xl mx-auto w-full overflow-x-auto no-scrollbar">
    {#each TABS as tab}
      {@const isActive = activeTab === tab.id}
      <button
        onclick={() => onTabChange(tab.id)}
        class="flex flex-col items-center gap-0.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer flex-shrink-0 min-w-[80px]"
        class:border-orange-500={isActive}
        class:border-transparent={!isActive}
      >
        <div class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
             style={isActive ? 'background:linear-gradient(135deg,#F97316,#EA580C)' : 'background:#F8FAFC'}>
          <svelte:component this={tab.Icon} size={15}
            style={isActive ? 'color:white' : 'color:#94A3B8'} />
        </div>
        <span class="text-[10px] font-bold leading-none transition-colors"
              class:text-orange-600={isActive}
              class:text-slate-400={!isActive}>
          {tab.label}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
