<section id="dashboard" class="scroll-mt-32 mb-32">
  <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-6" style="font-family:'Plus Jakarta Sans',sans-serif;">Beranda (Dashboard)</h3>
  <p class="text-slate-600 mb-10 leading-relaxed">Beranda adalah pusat informasi harian Anda. Di sini Anda bisa memantau segalanya dalam satu lirikan.</p>

  <div class="grid gap-4">
    {#each [
      { title: 'Statistik Tugas', desc: 'Melihat persentase tugas selesai, sedang dikerjakan, dan yang belum dimulai.', color: 'orange' },
      { title: 'Ringkasan Presensi', desc: 'Status kehadiran Anda untuk hari ini (Check-in/Check-out).', color: 'emerald' },
      { title: 'Tugas Prioritas', desc: 'Daftar tugas yang paling mendesak untuk segera diselesaikan.', color: 'blue' }
    ] as item}
      <div class="flex items-center gap-5 p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:shadow-slate-200/50 transition-all">
        <div class="w-2 h-10 rounded-full bg-{item.color}-500"></div>
        <div>
          <h4 class="font-bold text-slate-900 mb-1">{item.title}</h4>
          <p class="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
        </div>
      </div>
    {/each}
  </div>
</section>
