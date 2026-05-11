<section id="tasks" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 transition-colors duration-300">Manajemen Tugas</h1>
  
  <div class="prose prose-slate dark:prose-invert max-w-none mb-12">
    <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
      Sistem Manajemen Tugas di Khwarizmi dirancang untuk akuntabilitas. Setiap tugas memiliki siklus hidup yang jelas untuk memastikan tidak ada pekerjaan yang terbengkalai.
    </p>
  </div>

  <!-- Task Lifecycle -->
  <div class="mb-20">
    <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
      <span class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center text-xs">1</span>
      Siklus Status Tugas
    </h4>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each [
        { status: 'Belum Dimulai', desc: 'Tugas baru yang belum disentuh oleh tim.', color: 'bg-slate-100 dark:bg-slate-800' },
        { status: 'Sedang Dikerjakan', desc: 'Tim sedang aktif mengerjakan tugas ini.', color: 'bg-blue-500 text-white' },
        { status: 'Dalam Review', desc: 'Menunggu validasi dari Admin/Manager.', color: 'bg-purple-500 text-white' },
        { status: 'Selesai', desc: 'Tugas telah divalidasi dan ditutup.', color: 'bg-emerald-500 text-white' }
      ] as item}
        <div class="p-6 {item.color} rounded-2xl border border-white/10 shadow-sm">
          <h5 class="font-bold text-sm mb-2">{item.status}</h5>
          <p class="text-xs opacity-80 leading-relaxed">{item.desc}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Features Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📋</div>
        <h4 class="font-black text-slate-900 dark:text-white text-xl">Sub-tasks & Checklist</h4>
      </div>
      <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
        Gunakan fitur checklist untuk memecah proyek besar menjadi langkah-langkah kecil yang dapat dikelola. Setiap sub-tugas yang dicentang akan secara otomatis meningkatkan persentase progres tugas utama.
      </p>
    </div>

    <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👥</div>
        <h4 class="font-black text-slate-900 dark:text-white text-xl">Sistem Kolaborasi</h4>
      </div>
      <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
        Butuh bantuan? Anda bisa mengundang rekan tim ke dalam tugas Anda. Rekan yang diundang akan mendapatkan akses edit dan notifikasi real-time terkait progres tugas tersebut.
      </p>
    </div>

    <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📌</div>
        <h4 class="font-black text-slate-900 dark:text-white text-xl">Label Prioritas</h4>
      </div>
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-xs font-bold text-red-600"><span class="w-2 h-2 rounded-full bg-red-600"></span> Tinggi: Harus selesai hari ini.</div>
        <div class="flex items-center gap-2 text-xs font-bold text-orange-600"><span class="w-2 h-2 rounded-full bg-orange-600"></span> Sedang: Target selesai minggu ini.</div>
        <div class="flex items-center gap-2 text-xs font-bold text-slate-500"><span class="w-2 h-2 rounded-full bg-slate-500"></span> Rendah: Pekerjaan pendukung.</div>
      </div>
    </div>

    <div class="p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">✅</div>
        <h4 class="font-black text-slate-900 dark:text-white text-xl">Sistem Pin & Bulk</h4>
      </div>
      <p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
        Pin tugas penting agar selalu muncul di bagian atas. Gunakan fitur seleksi massal (Bulk Action) untuk menyelesaikan atau menghapus banyak tugas sekaligus dengan sekali klik.
      </p>
    </div>
  </div>
</section>
