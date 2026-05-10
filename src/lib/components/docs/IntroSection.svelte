<script lang="ts">
  import { Sparkles, LayoutDashboard, MessageSquare, ArrowRight, Zap, ShieldCheck } from 'lucide-svelte';
</script>

<section id="intro" class="scroll-mt-32 mb-40">
  <div class="relative py-20 lg:py-32">
    <!-- Background Decorative Elements -->
    <div class="absolute -right-20 top-0 w-96 h-96 bg-orange-100/40 dark:bg-orange-900/10 rounded-full blur-[100px] pointer-events-none"></div>
    <div class="absolute -left-20 bottom-0 w-72 h-72 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[80px] pointer-events-none"></div>

    <div class="max-w-3xl">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-800 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-10">
        <Sparkles size={12} /> Panduan Resmi
      </div>
      
      <h1 class="text-5xl lg:text-[5.5rem] font-black text-slate-900 dark:text-white tracking-tight leading-[0.95] mb-12 transition-colors duration-300">
        Kelola Kerja <br/>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Tanpa Batas.</span>
      </h1>
      
      <p class="text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-14 max-w-xl transition-colors duration-300">
        Pusat informasi lengkap untuk mengoptimalkan penggunaan Khwarizmi dalam ekosistem kerja tim Anda.
      </p>

      <div class="flex flex-wrap items-center gap-6">
        <a href="#features" class="px-10 py-5 bg-slate-900 dark:bg-orange-600 text-white rounded-[2rem] font-bold text-sm shadow-2xl shadow-slate-900/30 dark:shadow-orange-600/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-3">
          Mulai Jelajahi <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </div>

  <!-- Features List (Vertical) -->
  <div id="features" class="mt-40 flex flex-col gap-6 max-w-[800px] scroll-mt-24">
    {#each [
      { 
        title: 'Real-time Sync', 
        desc: 'Data presensi dan tugas diperbarui secara instan di semua perangkat tanpa perlu refresh halaman.',
        icon: Zap,
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/40'
      },
      { 
        title: 'Satu Dashboard', 
        desc: 'Lihat seluruh performa tim, rekapitulasi gaji, dan jadwal kerja dalam satu tampilan yang bersih.',
        icon: LayoutDashboard,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/40'
      },
      { 
        title: 'Keamanan Tinggi', 
        desc: 'Sistem enkripsi end-to-end untuk data pribadi dan verifikasi lokasi yang tidak bisa dipalsukan.',
        icon: ShieldCheck,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/40'
      }
    ] as feature}
      <div class="group flex items-start gap-8 p-8 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-900/5 transition-all duration-500">
        <div class="w-16 h-16 {feature.bg} {feature.color} rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
          <svelte:component this={feature.icon} size={32} strokeWidth={2.5} />
        </div>
        <div>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight group-hover:text-orange-600 transition-colors">{feature.title}</h3>
          <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium transition-colors duration-300">{feature.desc}</p>
        </div>
      </div>
    {/each}
  </div>
</section>
