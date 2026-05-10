<section id="dashboard" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 transition-colors duration-300">Beranda (Dashboard)</h1>
  <p class="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed transition-colors duration-300">Beranda adalah pusat informasi harian Anda. Di sini Anda bisa memantau segalanya dalam satu lirikan.</p>

  <div class="grid gap-4">
    {#each [
      { title: 'Statistik Tugas', desc: 'Melihat persentase tugas selesai, sedang dikerjakan, dan yang belum dimulai.', color: 'orange' },
      { title: 'Ringkasan Presensi', desc: 'Status kehadiran Anda untuk hari ini (Check-in/Check-out).', color: 'emerald' },
      { title: 'Tugas Prioritas', desc: 'Daftar tugas yang paling mendesak untuk segera diselesaikan.', color: 'blue' }
    ] as item}
      <div class="flex items-center gap-5 p-6 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl hover:shadow-xl transition-all duration-300 group">
        <div class="w-2 h-10 rounded-full bg-{item.color}-500 shadow-[0_0_10px_rgba(var(--{item.color}-500),0.3)]"></div>
        <div>
          <h4 class="font-bold text-slate-900 dark:text-white mb-1 transition-colors duration-300">{item.title}</h4>
          <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed transition-colors duration-300">{item.desc}</p>
        </div>
      </div>
    {/each}
  </div>
</section>
