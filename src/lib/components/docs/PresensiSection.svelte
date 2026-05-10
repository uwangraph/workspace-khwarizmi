<script lang="ts">
  import { MapPin, Camera, Clock } from 'lucide-svelte';
</script>

<section id="presensi" class="scroll-mt-32 mb-32">
  <div class="flex items-center gap-4 mb-8">
    <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Sistem Presensi</h3>
  </div>
  
  <div class="bg-slate-900 rounded-[3.5rem] p-8 md:p-14 text-white shadow-3xl relative overflow-hidden">
    <div class="absolute -right-32 -bottom-32 w-80 h-80 bg-orange-600/30 rounded-full blur-[100px]"></div>
    <div class="relative z-10 space-y-12">
      <div class="flex flex-col md:flex-row gap-6 md:items-start">
        <div class="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
          <MapPin size={28} class="text-orange-500" />
        </div>
        <div>
          <h4 class="font-bold text-2xl mb-3 leading-tight">Geofencing & Lokasi</h4>
          <p class="text-slate-400 text-base leading-relaxed">Tombol presensi hanya akan aktif jika sistem mendeteksi Anda berada di radius kantor. Jika tidak muncul, pastikan <span class="text-white font-bold underline decoration-orange-500 underline-offset-4">GPS Aktif</span> dan izin lokasi diberikan.</p>
        </div>
      </div>
      <div class="flex flex-col md:flex-row gap-6 md:items-start">
        <div class="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
          <Camera size={28} class="text-blue-500" />
        </div>
        <div>
          <h4 class="font-bold text-2xl mb-3 leading-tight">Verifikasi Wajah (Selfie)</h4>
          <p class="text-slate-400 text-base leading-relaxed">Setiap aksi Check-in/out mewajibkan foto selfie langsung. Gunakan pencahayaan yang baik dan pastikan wajah terlihat jelas untuk validasi admin.</p>
        </div>
      </div>
    </div>
  </div>
</section>
