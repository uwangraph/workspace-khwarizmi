<script lang="ts">
  interface Profile { id: string; full_name: string; role?: string; avatar_url?: string | null; position?: string | null; joined_at?: string | null }
  interface Props {
    profile: Profile
    onEdit: () => void
    getInitials: (n: string) => string
    formatMonthYear: (s: string | null | undefined) => string | null
  }
  let { profile, onEdit, getInitials, formatMonthYear }: Props = $props()
</script>

<div class="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
  <div class="flex items-center gap-4">
    <button onclick={onEdit} aria-label="Ubah foto profil"
            class="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md group cursor-pointer"
            style="background: linear-gradient(135deg, #F97316, #EA580C);">
      {#if profile.avatar_url}
        <img src={profile.avatar_url} alt="Avatar" class="w-full h-full object-cover" />
      {:else}
        <span class="text-2xl font-black text-white" style="font-family:'Plus Jakarta Sans',sans-serif;">{getInitials(profile.full_name)}</span>
      {/if}
      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </div>
    </button>

    <div class="flex-1 min-w-0">
      <h2 class="text-lg font-bold text-slate-900 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{profile.full_name}</h2>
      <p class="text-xs font-semibold text-orange-500 mt-0.5 truncate">
        {profile.position || (profile.role === 'admin' ? 'Administrator' : '')}
      </p>
      <div class="flex items-center gap-1.5 mt-2 flex-wrap">
        {#if profile.role === 'admin'}
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🛡️ Administrator</span>
        {/if}
        {#if profile.joined_at}
          <span class="text-[10px] text-slate-400">Sejak {formatMonthYear(profile.joined_at)}</span>
        {/if}
      </div>
    </div>
  </div>

  <button onclick={onEdit}
          class="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
    </svg>
    Edit Profil
  </button>
</div>
