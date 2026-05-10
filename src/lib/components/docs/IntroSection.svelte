<script lang="ts">
  import { Sparkles, LayoutDashboard, MessageSquare, ArrowRight, Zap, ShieldCheck } from 'lucide-svelte';
</script>

<section id="intro" class="scroll-mt-32 mb-40">
  <div class="grid lg:grid-cols-2 gap-16 items-center">
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full border border-orange-100 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-8">
        <Sparkles size={12} /> Panduan Resmi v2.4
      </div>
      
      <h1 class="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1] mb-8">
        Kelola Kerja <br/>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Tanpa Batas.</span>
      </h1>
      
      <p class="text-lg text-slate-500 leading-relaxed font-medium mb-10 max-w-lg">
        Selamat datang di pusat dokumentasi Khwarizmi. Di sini Anda akan menemukan segala hal yang perlu diketahui untuk memaksimalkan efisiensi tim Anda.
      </p>

      <div class="flex flex-wrap gap-4">
        <a href="#features" class="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-2">
          Mulai Jelajahi <ArrowRight size={16} />
        </a>
        <div class="flex -space-x-3 items-center ml-4">
          {#each [1,2,3] as i}
            <div class="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">U{i}</div>
          {/each}
          <span class="ml-6 text-xs font-bold text-slate-400">+500 Users</span>
        </div>
      </div>
    </div>

    <div class="relative group">
      <div class="absolute -inset-4 bg-gradient-to-r from-orange-500 to-blue-500 rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
      <div class="relative bg-white p-4 rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
        <img 
          src="/Users/uwan/.gemini/antigravity/brain/69e4da53-e02f-41a7-adbd-175a4bf29979/khwarizmi_hero_illustration_1778429335536.png" 
          alt="Khwarizmi App" 
          class="w-full h-auto rounded-[2rem]"
        />
      </div>
    </div>
  </div>

  <div id="features" class="mt-40 grid md:grid-cols-3 gap-8 scroll-mt-24">
    <div class="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
      <div class="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
        <Zap size={28} />
      </div>
      <h3 class="font-black text-slate-900 text-xl mb-4 tracking-tight">Real-time Sync</h3>
      <p class="text-sm text-slate-500 leading-relaxed font-medium">Data presensi dan tugas diperbarui secara instan di semua perangkat tanpa perlu refresh halaman.</p>
    </div>

    <div class="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
      <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
        <LayoutDashboard size={28} />
      </div>
      <h3 class="font-black text-slate-900 text-xl mb-4 tracking-tight">Satu Dashboard</h3>
      <p class="text-sm text-slate-500 leading-relaxed font-medium">Lihat seluruh performa tim, rekapitulasi gaji, dan jadwal kerja dalam satu tampilan yang bersih.</p>
    </div>

    <div class="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
      <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
        <ShieldCheck size={28} />
      </div>
      <h3 class="font-black text-slate-900 text-xl mb-4 tracking-tight">Keamanan Tinggi</h3>
      <p class="text-sm text-slate-500 leading-relaxed font-medium">Sistem enkripsi end-to-end untuk data pribadi dan verifikasi lokasi yang tidak bisa dipalsukan.</p>
    </div>
  </div>
</section>
