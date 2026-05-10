<section id="tasks" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-12 transition-colors duration-300">Manajemen Tugas</h1>
  
  <div class="flex flex-col gap-6 max-w-4xl">
    {#each [
      { title: 'Checklist', desc: 'Pecah tugas besar menjadi sub-tugas yang lebih kecil.', icon: '📋' },
      { title: 'Kolaborasi', desc: 'Undang rekan kerja untuk membantu menyelesaikan tugas.', icon: '👥' },
      { title: 'Deadline', desc: 'Pantau batas waktu agar tidak ada pekerjaan yang terlewat.', icon: '🗓️' },
      { title: 'Prioritas', desc: 'Gunakan fitur Pin untuk menandai tugas yang sangat penting.', icon: '📌' }
    ] as t}
      <div class="flex items-center gap-8 p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-xl transition-all duration-300 group">
        <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <span class="text-4xl">{t.icon}</span>
        </div>
        <div>
          <h4 class="font-black text-slate-900 dark:text-white text-xl mb-2 transition-colors duration-300">{t.title}</h4>
          <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed transition-colors duration-300 font-medium">{t.desc}</p>
        </div>
      </div>
    {/each}
  </div>
</section>
