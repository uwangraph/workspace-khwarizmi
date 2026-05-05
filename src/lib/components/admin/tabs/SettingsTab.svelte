<script lang="ts">
  import type { AppSetting } from '$lib/components/admin/_types'
  import { Settings, MapPin, Target, Phone } from 'lucide-svelte'

  interface Props {
    settings: AppSetting | null
    onSave: (data: { office_lat: number; office_lng: number; office_radius: number; admin_contact: string | null }) => void
    onClearData: () => void
    onCancelClearData: () => void
    onExecuteImmediateDeletion: () => void
    onCleanupOldData: () => void
    isSaving: boolean
    isClearing: boolean
    isCleaningOldData: boolean
  }
  let { settings, onSave, onClearData, onCancelClearData, onExecuteImmediateDeletion, onCleanupOldData, isSaving, isClearing, isCleaningOldData } = $props<Props>()

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
  <div class="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 sm:p-8">
    <div class="flex items-center gap-4 mb-8">
      <div class="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
        <Settings size={22} />
      </div>
      <div>
        <h2 class="text-lg font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Pengaturan Sistem</h2>
        <p class="text-[11px] text-slate-400 mt-0.5">Konfigurasi dasar aplikasi dan validasi kehadiran</p>
      </div>
    </div>

    <form onsubmit={handleSubmit} class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div class="space-y-1.5">
          <label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <MapPin size={12} class="text-slate-300" /> Latitude Kantor
          </label>
          <input type="number" step="any" bind:value={lat} required
                 class="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-all placeholder:text-slate-300" />
        </div>
        <div class="space-y-1.5">
          <label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <MapPin size={12} class="text-slate-300" /> Longitude Kantor
          </label>
          <input type="number" step="any" bind:value={lng} required
                 class="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-all placeholder:text-slate-300" />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Target size={12} class="text-slate-300" /> Radius Toleransi (meter)
        </label>
        <input type="number" bind:value={radius} required min="5"
               class="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-all" />
        <p class="text-[10px] text-slate-400 mt-1.5 px-0.5 leading-relaxed">Jarak maksimal user dari koordinat di atas untuk melakukan absensi.</p>
      </div>

      <div class="space-y-1.5">
        <label class="ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Phone size={12} class="text-slate-300" /> Nomor WhatsApp Admin
        </label>
        <input type="text" bind:value={adminContact} placeholder="Contoh: 628123456789"
               class="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-all placeholder:text-slate-300" />
        <p class="text-[10px] text-slate-400 mt-1.5 px-0.5 leading-relaxed">Tujuan pesan saat pendaftar menekan tombol "Hubungi Admin".</p>
      </div>

      <div class="pt-6 border-t border-slate-50 flex justify-end">
        <button type="submit" disabled={isSaving}
                class="px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                style="background: linear-gradient(to right, #F97316, #EA580C);">
          {#if isSaving}
            <div class="flex items-center gap-2">
              <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              <span>Menyimpan...</span>
            </div>
          {:else}
            Simpan Pengaturan
          {/if}
        </button>
      </div>
    </form>
  </div>

  <div class="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 sm:p-8">
    <div class="flex items-center gap-4 mb-6">
      <div class="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </div>
      <div>
        <h2 class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Pembersihan Data Lama</h2>
        <p class="text-[11px] text-slate-400 mt-0.5 font-medium">Hapus file foto dan data absensi yang sudah lebih dari 40 hari</p>
      </div>
    </div>

    <div class="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 mb-6">
      <p class="text-[13px] text-indigo-700 leading-relaxed font-medium">
        Fungsi ini akan mencari dan menghapus seluruh <strong>file foto selfie di Storage</strong> serta <strong>riwayat absensi di database</strong> yang usianya sudah melewati 40 hari ke belakang. Sangat disarankan dilakukan setelah rekapan bulanan selesai.
      </p>
    </div>

    <button onclick={onCleanupOldData} disabled={isCleaningOldData || isClearing}
            class="w-full py-4 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            style="background: linear-gradient(to right, #6366F1, #4F46E5);">
      {#if isCleaningOldData}
        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
        Mengeksekusi Pembersihan...
      {:else}
        Sapu Bersih Data Lama (40 Hari)
      {/if}
    </button>
  </div>

  <div class="bg-white rounded-2xl shadow-sm border border-slate-50 p-6 sm:p-8">
    {#if isDeletionScheduled}
      <div class="flex flex-col items-center text-center space-y-5">
        <div class="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 animate-pulse">
          <Target size={32} />
        </div>
        <div>
          <h2 class="text-lg font-bold text-red-600" style="font-family:'Plus Jakarta Sans',sans-serif;">Penghapusan Dijadwalkan</h2>
          <p class="text-[11px] text-red-400 mt-1">Data sedang dalam masa tenggang pembekuan.</p>
        </div>

        <div class="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <p class="text-[10px] font-bold text-slate-400 mb-2">PENGHAPUSAN PERMANEN DALAM</p>
          <div class="text-2xl font-black text-slate-700 tracking-tight">
            {deletionTimeLeft || 'Menghitung...'}
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full">
          <button onclick={onCancelClearData} disabled={isClearing}
                  class="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-400 border border-slate-100 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50">
            BATALKAN
          </button>
          <button onclick={onExecuteImmediateDeletion} 
                  disabled={isClearing}
                  class="flex-1 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                  style="background: #EF4444;">
            {#if isClearing}
              Mengeksekusi...
            {:else}
              HAPUS SEKARANG
            {/if}
          </button>
        </div>
      </div>
    {:else}
      <div class="flex items-center gap-4 mb-6">
        <div class="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-800" style="font-family:'Plus Jakarta Sans',sans-serif;">Pembersihan Data</h2>
          <p class="text-[11px] text-slate-400 mt-0.5 font-medium">Tindakan berbahaya (Danger Zone)</p>
        </div>
      </div>

      <div class="bg-red-50/50 rounded-2xl border border-red-100 p-5 mb-6">
        <p class="text-[13px] text-red-700 leading-relaxed font-medium">
          Ini akan menghapus seluruh data **Tugas, Absensi, Notifikasi, dan Token FCM**. 
          Akun pengguna dan pengaturan tidak akan hilang.
        </p>
      </div>

      <button onclick={onClearData} disabled={isClearing}
              class="w-full py-4 rounded-xl text-sm font-bold text-red-500 border border-red-100 hover:bg-red-50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
        {#if isClearing}
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          Mempersiapkan...
        {:else}
          Hapus Seluruh Data Transaksi
        {/if}
      </button>
    {/if}
  </div>
</div>
