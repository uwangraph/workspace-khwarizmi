<script lang="ts">
  import { ShieldCheck, Camera, Edit2 } from 'lucide-svelte'
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
        <Camera size={20} class="text-white" />
      </div>
    </button>

    <div class="flex-1 min-w-0">
      <h2 class="text-lg font-bold text-slate-900 truncate" style="font-family:'Plus Jakarta Sans',sans-serif;">{profile.full_name}</h2>
      <p class="text-xs font-semibold text-orange-500 mt-0.5 truncate">
        {profile.position || (profile.role === 'admin' ? 'Administrator' : '')}
      </p>
      <div class="flex items-center gap-1.5 mt-2 flex-wrap">
        {#if profile.role === 'admin'}
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
            <ShieldCheck size={10} /> Administrator
          </span>
        {/if}
        {#if profile.joined_at}
          <span class="text-[10px] text-slate-400">Sejak {formatMonthYear(profile.joined_at)}</span>
        {/if}
      </div>
    </div>
  </div>

  <button onclick={onEdit}
          class="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
    <Edit2 size={14} />
    Edit Profil
  </button>
</div>
