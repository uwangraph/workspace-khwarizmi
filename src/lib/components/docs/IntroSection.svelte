<script lang="ts">
  import { Sparkles, LayoutDashboard, MessageSquare, Shield } from 'lucide-svelte';
</script>

<section id="intro" class="scroll-mt-32 mb-32">
  <div class="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-8">
    <Sparkles size={12} /> Panduan Resmi
  </div>
  <h2 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.05]" style="font-family:'Plus Jakarta Sans',sans-serif;">
    Kelola Pekerjaan Lebih <span class="text-orange-600 italic">Cerdas</span> di Khwarizmi
  </h2>
  <p class="text-xl text-slate-500 leading-relaxed mb-12 max-w-2xl font-medium">
    Tingkatkan produktivitas tim Anda dengan sistem manajemen tugas real-time dan presensi berbasis lokasi yang akurat.
  </p>
  
  <div class="grid md:grid-cols-2 gap-6">
    <div class="group p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
      <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
        <LayoutDashboard class="text-orange-600" size={28} />
      </div>
      <h4 class="font-bold text-slate-900 text-lg mb-3">Dashboard Terpadu</h4>
      <p class="text-sm text-slate-500 leading-relaxed">Semua informasi penting mulai dari tugas harian hingga status presensi ada dalam satu layar.</p>
    </div>
    <div class="group p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
      <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
        <MessageSquare class="text-blue-600" size={28} />
      </div>
      <h4 class="font-bold text-slate-900 text-lg mb-3">Komunikasi Instan</h4>
      <p class="text-sm text-slate-500 leading-relaxed">Hubungi rekan kerja secara real-time langsung di dalam aplikasi tanpa hambatan.</p>
    </div>
  </div>
</section>
