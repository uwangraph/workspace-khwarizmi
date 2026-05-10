<section id="faq" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-10 transition-colors duration-300">FAQ & Tips</h1>
  
  <div class="space-y-4">
    {#each [
      { q: 'Mengapa saya tidak bisa Check-in di rumah?', a: 'Presensi dibatasi oleh Geofencing kantor. Anda harus berada di lokasi fisik kantor yang telah didaftarkan Admin agar tombol Check-in aktif.' },
      { q: 'Bagaimana cara mendapatkan notifikasi push?', a: 'Pastikan Anda memberikan izin notifikasi di browser. Jika menggunakan iPhone, Anda harus menginstal aplikasi (Add to Home Screen) terlebih dahulu.' },
      { q: 'Foto selfie saya ditolak admin, kenapa?', a: 'Pastikan wajah terlihat jelas, tidak menggunakan masker (kecuali diizinkan), dan pencahayaan cukup terang saat mengambil foto.' }
    ] as faq}
      <div class="group bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/60 hover:border-orange-100 dark:hover:border-orange-500/30 transition-all duration-300">
        <h4 class="font-bold text-slate-900 dark:text-white text-lg mb-4 flex items-start gap-4 transition-colors duration-300">
          <span class="text-orange-500 font-black">Q.</span> {faq.q}
        </h4>
        <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed pl-10 border-l-2 border-orange-100 dark:border-slate-800 group-hover:border-orange-500 transition-colors duration-300">
          {faq.a}
        </p>
      </div>
    {/each}
  </div>
</section>
