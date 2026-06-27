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

<div class="bg-white rounded-[24px] p-6 shadow-sm border-2 border-b-[6px] border-slate-200 transition-all hover:border-slate-300">
  <div class="flex items-center gap-5">
    <button onclick={onEdit} aria-label="Ubah foto profil"
            class="relative w-24 h-24 rounded-[20px] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md border-2 border-slate-100 group cursor-pointer active:scale-95 transition-all"
            style="background: linear-gradient(135deg, #F97316, #EA580C);">
      {#if profile.avatar_url}
        <img src={profile.avatar_url} alt="Avatar" class="w-full h-full object-cover" />
      {:else}
        <span class="text-3xl font-black text-white" style="font-family:'Plus Jakarta Sans',sans-serif;">{getInitials(profile.full_name)}</span>
      {/if}
      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <Camera size={24} class="text-white" />
      </div>
    </button>

    <div class="flex-1 min-w-0">
      <h2 class="text-xl font-black text-slate-900 truncate tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">{profile.full_name}</h2>
      <p class="text-sm font-extrabold text-orange-500 mt-1 truncate">
        {profile.position || (profile.role === 'admin' ? 'Administrator' : 'Anggota Tim')}
      </p>
      <div class="flex items-center gap-2 mt-3 flex-wrap">
        {#if profile.role === 'admin'}
          <span class="text-xs font-extrabold px-3 py-1 rounded-xl bg-orange-100 text-orange-700 flex items-center gap-1.5 border border-orange-200 shadow-sm">
            <ShieldCheck size={14} strokeWidth={2.5} /> Administrator
          </span>
        {/if}
        {#if profile.joined_at}
          <span class="text-xs font-bold text-slate-400">Sejak {formatMonthYear(profile.joined_at)}</span>
        {/if}
      </div>
    </div>
  </div>

  <button onclick={onEdit}
          class="w-full mt-5 py-3.5 rounded-2xl text-sm font-black text-orange-600 bg-orange-50 border-2 border-b-[4px] border-orange-200 hover:bg-orange-100 transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer shadow-sm">
    <Edit2 size={16} strokeWidth={2.5} />
    Edit Profil
  </button>
</div>
