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
      Lupakan mesin absen lama. Sekarang Anda bisa melakukan presensi langsung dari HP dengan akurasi lokasi yang tinggi.
    </p>
  </div>

  <div class="flex flex-col gap-8 relative">
    <!-- Connecting Line (Vertical) -->
    <div class="absolute left-16 top-10 bottom-10 w-0.5 bg-slate-100 dark:bg-slate-800 z-0 hidden md:block"></div>

    {#each [
      { 
        step: '01', 
        title: 'Buka Dashboard', 
        desc: 'Masuk ke aplikasi dan temukan tombol "Presensi" di bagian atas beranda.',
        icon: Smartphone,
        color: 'bg-orange-600'
      },
      { 
        step: '02', 
        title: 'Verifikasi Lokasi', 
        desc: 'Pastikan GPS aktif. Sistem akan memverifikasi apakah Anda berada di radius kantor.',
        icon: Map,
        color: 'bg-blue-600'
      },
      { 
        step: '03', 
        title: 'Selesai!', 
        desc: 'Klik tombol konfirmasi dan data Anda akan langsung tercatat di server.',
        icon: CheckCircle2,
        color: 'bg-emerald-600'
      }
    ] as step}
      <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 p-8 md:p-10 bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group max-w-4xl">
        <div class="w-16 h-16 {step.color} text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 z-10">
          <step.icon size={32} />
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

        <div class="hidden md:block text-7xl font-black text-slate-50 dark:text-slate-800/30 group-hover:text-orange-500/10 transition-colors pointer-events-none absolute right-10">
          {step.step}
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-16 p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30 flex flex-col md:flex-row items-center gap-6">
    <div class="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
      <ShieldAlert size={24} />
    </div>
    <div>
      <h5 class="font-bold text-amber-900 dark:text-amber-200 text-sm mb-1">Penting: Izin Lokasi</h5>
      <p class="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">Aplikasi memerlukan izin "Allow Always" atau "While Using the App" agar presensi bisa dilakukan dengan lancar.</p>
    </div>
  </div>
</section>
