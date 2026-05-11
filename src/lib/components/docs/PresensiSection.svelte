<script lang="ts">
  import { MapPin, Smartphone, CheckCircle2, ShieldAlert, Sparkles, Map } from 'lucide-svelte';
</script>

<section id="presensi" class="scroll-mt-32 mb-40">
  <div class="mb-16">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-6">
      <MapPin size={12} /> Geofencing Technology
    </div>
    <h2 class="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6 transition-colors duration-300">Sistem Presensi</h2>
    <p class="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed transition-colors duration-300">
      Lupakan mesin absen lama. Khwarizmi menggunakan teknologi <strong>Geofencing</strong> untuk memastikan Anda melakukan presensi tepat di lokasi yang telah ditentukan dengan keamanan tinggi.
    </p>
  </div>

  <!-- Session Schedule -->
  <div class="mb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
    {#each [
      { name: 'Sesi Pagi', time: '07:00 - 09:00', icon: '🌅', color: 'bg-orange-50 dark:bg-orange-900/20' },
      { name: 'Sesi Siang', time: '13:00 - 14:00', icon: '☀️', color: 'bg-amber-50 dark:bg-amber-900/20' },
      { name: 'Sesi Sore', time: '16:00 - 18:00', icon: '🌇', color: 'bg-blue-50 dark:bg-blue-900/20' }
    ] as session}
      <div class="p-6 {session.color} rounded-3xl border border-white/50 dark:border-white/5 shadow-sm">
        <span class="text-2xl mb-3 block">{session.icon}</span>
        <h5 class="font-bold text-slate-900 dark:text-white mb-1">{session.name}</h5>
        <p class="text-sm text-slate-500 dark:text-slate-400 font-bold">{session.time}</p>
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-8 relative mb-20">
    <!-- Connecting Line (Vertical) -->
    <div class="absolute left-16 top-10 bottom-10 w-0.5 bg-slate-100 dark:bg-slate-800 z-0 hidden md:block"></div>

    {#each [
      { 
        step: '01', 
        title: 'Verifikasi GPS', 
        desc: 'Saat Anda menekan tombol Presensi, sistem akan meminta akses lokasi. Pastikan Anda berada dalam radius 100-200 meter dari titik koordinat kantor yang telah didaftarkan.',
        icon: Map,
        color: 'bg-orange-600'
      },
      { 
        step: '02', 
        title: 'Foto Selfie Biometrik', 
        desc: 'Untuk menghindari penitipan absen, sistem akan membuka kamera. Ambil foto wajah Anda dengan jelas. Foto ini akan disimpan sebagai bukti otentik kehadiran Anda.',
        icon: Smartphone,
        color: 'bg-blue-600'
      },
      { 
        step: '03', 
        title: 'Konfirmasi Instan', 
        desc: 'Setelah data lokasi dan foto tervalidasi, ketuk "Kirim Presensi". Status Anda akan langsung berubah menjadi "Sudah Check-in" secara real-time di Dashboard Admin.',
        icon: CheckCircle2,
        color: 'bg-emerald-600'
      }
    ] as step}
      <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 p-8 md:p-10 bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group max-w-4xl">
        <div class="w-16 h-16 {step.color} text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 z-10">
          <svelte:component this={step.icon} size={32} />
        </div>
        
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">{step.step}</span>
            <h4 class="font-black text-slate-900 dark:text-white text-2xl tracking-tight transition-colors duration-300">{step.title}</h4>
          </div>
          <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium transition-colors duration-300">
            {step.desc}
          </p>
        </div>
      </div>
    {/each}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div class="p-8 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border border-red-100 dark:border-red-900/30">
      <div class="flex items-center gap-4 mb-4 text-red-600 dark:text-red-400">
        <ShieldAlert size={24} />
        <h5 class="font-bold">Kenapa Presensi Gagal?</h5>
      </div>
      <ul class="space-y-3 text-sm text-red-700/80 dark:text-red-400/80 font-medium list-disc pl-4">
        <li>Lokasi Anda berada di luar radius kantor (Geofence).</li>
        <li>Izin akses lokasi/GPS pada browser dimatikan.</li>
        <li>Anda mencoba melakukan presensi di luar jam sesi yang ditentukan.</li>
        <li>Koneksi internet tidak stabil saat mengunggah foto selfie.</li>
      </ul>
    </div>

    <div class="p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30">
      <div class="flex items-center gap-4 mb-4 text-emerald-600 dark:text-emerald-400">
        <Sparkles size={24} />
        <h5 class="font-bold">Tips Presensi Lancar</h5>
      </div>
      <ul class="space-y-3 text-sm text-emerald-700/80 dark:text-emerald-400/80 font-medium list-disc pl-4">
        <li>Gunakan Google Chrome untuk hasil pelacakan GPS terbaik.</li>
        <li>Berdirilah di area terbuka (bukan di dalam lift atau basement).</li>
        <li>Pastikan wajah menghadap cahaya saat mengambil foto selfie.</li>
      </ul>
    </div>
  </div>
</section>
