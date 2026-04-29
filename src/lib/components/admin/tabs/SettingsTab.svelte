<script lang="ts">
  import type { AppSetting } from '$lib/components/admin/_types'
  import { Settings, MapPin, Target, Phone } from 'lucide-svelte'

  interface Props {
    settings: AppSetting | null
    onSave: (data: { office_lat: number; office_lng: number; office_radius: number; admin_contact: string | null }) => void
    onClearData: () => void
    onCancelClearData: () => void
    onExecuteImmediateDeletion: () => void
    isSaving: boolean
    isClearing: boolean
  }
  let { settings, onSave, onClearData, onCancelClearData, onExecuteImmediateDeletion, isSaving, isClearing } = $props<Props>()

  let lat = $state(settings?.office_lat ?? -6.655905)
  let lng = $state(settings?.office_lng ?? 106.696199)
  let radius = $state(settings?.office_radius ?? 25)
  let adminContact = $state(settings?.admin_contact ?? '')
  
  let deletionTimeLeft = $state('')
  let isDeletionScheduled = $derived(!!settings?.deletion_scheduled_at)

  $effect(() => {
    if (settings?.deletion_scheduled_at) {
      const updateTimer = () => {
        const scheduledAt = new Date(settings.deletion_scheduled_at!).getTime()
        const diff = (24 * 60 * 60 * 1000) - (Date.now() - scheduledAt)
        if (diff <= 0) {
          deletionTimeLeft = 'Waktu habis'
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60))
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          deletionTimeLeft = `${h} jam ${m} menit`
        }
      }
      updateTimer()
      const interval = setInterval(updateTimer, 60000)
      return () => clearInterval(interval)
    }
  })
  $effect(() => {
    if (settings) {
      lat = settings.office_lat
      lng = settings.office_lng
      radius = settings.office_radius
      adminContact = settings.admin_contact ?? ''
    }
  })

  function handleSubmit(e: Event) {
    e.preventDefault()
    onSave({ office_lat: lat, office_lng: lng, office_radius: radius, admin_contact: adminContact || null })
  }
</script>

<div class="space-y-6">
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

      <div>
        <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 tracking-widest uppercase mb-2">
          <Phone size={12} /> WhatsApp Admin
        </label>
        <input type="text" bind:value={adminContact} placeholder="Contoh: 628123456789"
               class="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20" />
        <p class="text-[10px] text-slate-400 mt-1.5">Digunakan untuk tombol "Hubungi Admin" di halaman pendaftaran.</p>
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

  <div class={isDeletionScheduled ? "bg-red-50 rounded-2xl border-2 border-red-500 p-6 shadow-lg relative overflow-hidden" : "bg-red-50/30 rounded-2xl border-2 border-dashed border-red-100 p-6"}>
    {#if isDeletionScheduled}
      <div class="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div class="flex items-center gap-3 mb-6 relative z-10">
        <div class="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white animate-pulse shadow-md">
          <Target size={24} />
        </div>
        <div>
          <h2 class="text-lg font-black text-red-600 uppercase tracking-wide" style="font-family:'Plus Jakarta Sans',sans-serif;">Pembersihan Dijadwalkan</h2>
          <p class="text-xs text-red-500/80 font-medium mt-0.5">Semua data transaksi sedang dibekukan.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl border-2 border-red-100 p-5 mb-5 relative z-10 text-center shadow-sm">
        <p class="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Penghapusan Permanen Dalam</p>
        <div class="text-3xl font-black text-red-600 tracking-wider">
          {deletionTimeLeft || 'Menghitung...'}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 relative z-10">
        <button onclick={onCancelClearData} disabled={isClearing}
                class="py-3.5 rounded-xl text-xs font-black text-slate-500 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50">
          BATALKAN
        </button>
        <button onclick={onExecuteImmediateDeletion} 
                disabled={isClearing}
                class="py-3.5 rounded-xl text-xs font-black text-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-red-500/20"
                style="background: linear-gradient(135deg, #EF4444, #B91C1C);">
          {#if isClearing}
            Mengeksekusi...
          {:else}
            HAPUS SEKARANG
          {/if}
        </button>
      </div>

    {:else}
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <div>
          <h2 class="text-base font-bold text-red-600" style="font-family:'Plus Jakarta Sans',sans-serif;">Pembersihan Data (Danger Zone)</h2>
          <p class="text-[10px] text-red-400 font-medium mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-red-100 p-4 mb-4">
        <p class="text-xs text-slate-600 leading-relaxed">
          Menghapus seluruh data <strong>Tugas, Absensi, Notifikasi, dan Token FCM</strong>. 
          Akun pengguna dan pengaturan sistem tidak akan dihapus.
        </p>
      </div>

      <button onclick={onClearData} disabled={isClearing}
              class="w-full py-3.5 rounded-xl text-sm font-black text-red-600 bg-white border-2 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
        {#if isClearing}
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          Sedang Membersihkan...
        {:else}
          HAPUS SEMUA DATA TRANSAKSI
        {/if}
      </button>
    {/if}
  </div>
</div>
