<script lang="ts">
  import type { AppSetting } from '$lib/components/admin/_types'
  import { Settings, MapPin, Target } from 'lucide-svelte'

  interface Props {
    settings: AppSetting | null
    onSave: (data: { office_lat: number; office_lng: number; office_radius: number }) => void
    isSaving: boolean
  }
  let { settings, onSave, isSaving } = $props<Props>()

  let lat = $state(settings?.office_lat ?? -6.655905)
  let lng = $state(settings?.office_lng ?? 106.696199)
  let radius = $state(settings?.office_radius ?? 25)

  $effect(() => {
    if (settings) {
      lat = settings.office_lat
      lng = settings.office_lng
      radius = settings.office_radius
    }
  })

  function handleSubmit(e: Event) {
    e.preventDefault()
    onSave({ office_lat: lat, office_lng: lng, office_radius: radius })
  }
</script>

<div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
      <Settings size={20} />
    </div>
    <div>
      <h2 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Pengaturan Sistem</h2>
      <p class="text-[11px] text-slate-500 mt-0.5">Atur koordinat pusat kantor dan radius untuk validasi absensi.</p>
    </div>
  </div>

  <form onsubmit={handleSubmit} class="flex flex-col gap-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
          <MapPin size={12} /> Latitude
        </label>
        <input type="number" step="any" bind:value={lat} required
               class="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
      </div>
      <div>
        <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
          <MapPin size={12} /> Longitude
        </label>
        <input type="number" step="any" bind:value={lng} required
               class="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
      </div>
    </div>

    <div>
      <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
        <Target size={12} /> Radius Toleransi (meter)
      </label>
      <input type="number" bind:value={radius} required min="5"
             class="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
      <p class="text-[10px] text-slate-400 mt-1.5">Jarak maksimal user dari koordinat di atas untuk bisa melakukan check-in/out.</p>
    </div>

    <div class="pt-4 border-t border-slate-100 flex justify-end">
      <button type="submit" disabled={isSaving}
              class="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
              style="background: linear-gradient(135deg, #F97316, #EA580C);">
        {#if isSaving}
          <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          Menyimpan...
        {:else}
          Simpan Pengaturan
        {/if}
      </button>
    </div>
  </form>
</div>
