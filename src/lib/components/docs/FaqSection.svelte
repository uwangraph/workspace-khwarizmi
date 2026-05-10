<section id="faq" class="scroll-mt-32">
  <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-10" style="font-family:'Plus Jakarta Sans',sans-serif;">FAQ & Tips</h3>
  
  <div class="space-y-4">
    {#each [
      { q: 'Mengapa saya tidak bisa Check-in di rumah?', a: 'Presensi dibatasi oleh Geofencing kantor. Anda harus berada di lokasi fisik kantor yang telah didaftarkan Admin agar tombol Check-in aktif.' },
      { q: 'Bagaimana cara mendapatkan notifikasi push?', a: 'Pastikan Anda memberikan izin notifikasi di browser. Jika menggunakan iPhone, Anda harus menginstal aplikasi (Add to Home Screen) terlebih dahulu.' },
      { q: 'Foto selfie saya ditolak admin, kenapa?', a: 'Pastikan wajah terlihat jelas, tidak menggunakan masker (kecuali diizinkan), dan pencahayaan cukup terang saat mengambil foto.' }
    ] as faq}
      <div class="group bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:border-orange-100 transition-all">
        <h4 class="font-bold text-slate-900 text-lg mb-4 flex items-start gap-4">
          <span class="text-orange-500 font-black">Q.</span> {faq.q}
        </h4>
        <p class="text-slate-500 text-sm leading-relaxed pl-10 border-l-2 border-orange-100 group-hover:border-orange-500 transition-colors">
          {faq.a}
        </p>
      </div>
    {/each}
  </div>
</section>
