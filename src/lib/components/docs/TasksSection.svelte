<section id="tasks" class="scroll-mt-32 mb-32">
  <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-12" style="font-family:'Plus Jakarta Sans',sans-serif;">Manajemen Tugas</h3>
  
  <div class="grid sm:grid-cols-2 gap-6">
    {#each [
      { title: 'Checklist', desc: 'Pecah tugas besar menjadi sub-tugas yang lebih kecil.', icon: '📋' },
      { title: 'Kolaborasi', desc: 'Undang rekan kerja untuk membantu menyelesaikan tugas.', icon: '👥' },
      { title: 'Deadline', desc: 'Pantau batas waktu agar tidak ada pekerjaan yang terlewat.', icon: '🗓️' },
      { title: 'Prioritas', desc: 'Gunakan fitur Pin untuk menandai tugas yang sangat penting.', icon: '📌' }
    ] as t}
      <div class="p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-orange-200 hover:shadow-xl transition-all group">
        <span class="text-4xl mb-6 block group-hover:scale-110 transition-transform origin-left">{t.icon}</span>
        <h4 class="font-bold text-slate-900 text-lg mb-2">{t.title}</h4>
        <p class="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
      </div>
    {/each}
  </div>
</section>
