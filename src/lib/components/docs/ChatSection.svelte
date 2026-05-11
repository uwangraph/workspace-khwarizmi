<script lang="ts">
  import { MessageSquare, Bell, UserRound, Zap } from 'lucide-svelte';
</script>

<section id="chat" class="scroll-mt-32 mb-32 relative">
  <!-- Background Glow -->
  <div class="absolute -right-20 -top-20 w-80 h-80 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

  <div class="flex flex-col md:flex-row items-center gap-6 mb-12">
    <h1 class="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight transition-colors duration-300">Obrolan <span class="text-blue-600 dark:text-blue-400">(Chat)</span></h1>
    <div class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl shadow-blue-600/30 animate-bounce">
      <Zap size={14} fill="currentColor" /> Real-time Sync
    </div>
  </div>
  
  <p class="text-xl text-slate-500 dark:text-slate-400 mb-16 leading-relaxed max-w-2xl font-medium transition-colors duration-300">
    Komunikasi adalah jantung kolaborasi. Khwarizmi Chat memberikan pengalaman bertukar pesan secepat kilat dengan fitur-fitur yang dirancang khusus untuk koordinasi pekerjaan.
  </p>

  <div class="grid lg:grid-cols-12 gap-8 mb-20">
    <div class="lg:col-span-7 p-1 md:p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[3.5rem] shadow-2xl shadow-blue-200 dark:shadow-blue-900/20">
      <div class="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.2rem] h-full relative overflow-hidden group transition-colors duration-300">
        <h4 class="font-black text-2xl text-slate-900 dark:text-white mb-8 tracking-tight leading-tight">Jenis Ruang Obrolan</h4>
        <div class="space-y-10">
          <div class="flex gap-6">
            <div class="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">👤</div>
            <div>
              <h5 class="font-bold text-slate-900 dark:text-white mb-1 text-lg">Private Chat (1-on-1)</h5>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Ruang privat antara Anda dan satu rekan tim. Cocok untuk instruksi langsung atau diskusi tertutup.</p>
            </div>
          </div>
          <div class="flex gap-6">
            <div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">🏢</div>
            <div>
              <h5 class="font-bold text-slate-900 dark:text-white mb-1 text-lg">Group Chat (Proyek)</h5>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Grup otomatis berdasarkan proyek atau divisi. Memungkinkan seluruh anggota tim melihat sejarah percakapan tanpa terputus.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="lg:col-span-5 space-y-6">
      <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm">
        <h4 class="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-blue-500"></div> Indikator Pesan
        </h4>
        <ul class="space-y-4">
          <li class="flex items-center gap-3">
            <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500 uppercase">Tebal</span>
            <span class="text-xs text-slate-600 dark:text-slate-400">Ada pesan baru yang belum Anda buka.</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] font-bold text-blue-600 uppercase">Tipis</span>
            <span class="text-xs text-slate-600 dark:text-slate-400">Pesan sudah dibaca oleh Anda.</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-[10px] font-bold text-emerald-600 uppercase">Checklist</span>
            <span class="text-xs text-slate-600 dark:text-slate-400">Indikator pengiriman berhasil ke server.</span>
          </li>
        </ul>
      </div>

      <div class="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
        <h4 class="font-bold text-slate-900 dark:text-white mb-4">💡 Tips Komunikasi</h4>
        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
          "Anda bisa melampirkan file atau foto langsung dari galeri HP dengan menekan ikon (+) di sebelah bilah ketik pesan."
        </p>
      </div>
    </div>
  </div>

  <div class="bg-blue-600 rounded-[3rem] p-10 md:p-16 text-white overflow-hidden relative group">
    <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000"></div>
    <div class="max-w-2xl relative z-10">
      <h3 class="text-3xl font-black mb-8 leading-tight">Pengalaman Real-time Tanpa Jeda</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-3">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">🚀</div>
          <h5 class="font-bold">Websocket Technology</h5>
          <p class="text-blue-100 text-sm leading-relaxed">Pesan muncul seketika tanpa perlu memuat ulang halaman, mirip dengan aplikasi perpesanan populer lainnya.</p>
        </div>
        <div class="space-y-3">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">🔔</div>
          <h5 class="font-bold">Notifikasi Cerdas</h5>
          <p class="text-blue-100 text-sm leading-relaxed">Dapatkan lencana merah (badge) di menu navigasi bawah saat ada pesan baru di ruangan mana pun.</p>
        </div>
      </div>
    </div>
  </div>
</section>
