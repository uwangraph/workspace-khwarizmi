<script lang="ts">
  import { MapPin, Smartphone, CheckCircle2, ShieldAlert, Sparkles, Map } from 'lucide-svelte';
</script>

<section id="presensi" class="scroll-mt-32 mb-40">
  <div class="mb-16">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6">
      <MapPin size={12} /> Geofencing Technology
    </div>
    <h2 class="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-6">Sistem Presensi</h2>
    <p class="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
      Lupakan mesin absen lama. Sekarang Anda bisa melakukan presensi langsung dari HP dengan akurasi lokasi yang tinggi.
    </p>
  </div>

  <div class="grid lg:grid-cols-3 gap-8 relative">
    <!-- Connecting Line (Desktop) -->
    <div class="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>

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
      <div class="relative z-10 p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
        <div class="w-16 h-16 {step.color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:rotate-6">
          <step.icon size={32} />
        </div>
        <div class="text-[4rem] font-black text-slate-50 leading-none absolute top-6 right-8 group-hover:text-slate-100 transition-colors">{step.step}</div>
        <h4 class="font-black text-slate-900 text-xl mb-4 relative z-10">{step.title}</h4>
        <p class="text-sm text-slate-500 leading-relaxed font-medium relative z-10">{step.desc}</p>
      </div>
    {/each}
  </div>

  <div class="mt-16 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex flex-col md:flex-row items-center gap-6">
    <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
      <ShieldAlert size={24} />
    </div>
    <div>
      <h5 class="font-bold text-amber-900 text-sm mb-1">Penting: Izin Lokasi</h5>
      <p class="text-xs text-amber-700 leading-relaxed font-medium">Aplikasi memerlukan izin "Allow Always" atau "While Using the App" agar presensi bisa dilakukan dengan lancar.</p>
    </div>
  </div>
</section>
