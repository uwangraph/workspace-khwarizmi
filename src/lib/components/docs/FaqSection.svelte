<section id="faq" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-12 transition-colors duration-300">FAQ & Tips</h1>
  
  <div class="grid grid-cols-1 gap-6">
    {#each [
      { 
        q: 'Mengapa saya tidak bisa Check-in di rumah?', 
        a: 'Demi integritas data, presensi dibatasi oleh radius Geofencing kantor (sekitar 100-200 meter). Anda harus berada di lokasi fisik kantor agar tombol Check-in dapat ditekan.' 
      },
      { 
        q: 'Data saya tidak sinkron di HP lain, kenapa?', 
        a: 'Pastikan Anda login dengan akun yang sama dan memiliki koneksi internet stabil. Khwarizmi menggunakan sinkronisasi awan, jadi data akan diperbarui otomatis saat perangkat Anda online.' 
      },
      { 
        q: 'Bagaimana jika saya lupa password?', 
        a: 'Gunakan fitur "Lupa Password" di halaman login. Sistem akan mengirimkan tautan pemulihan ke alamat email terdaftar Anda. Jika email tidak masuk, silakan hubungi Admin IT.' 
      },
      { 
        q: 'Apakah data selfie saya aman?', 
        a: 'Ya. Foto selfie hanya digunakan untuk verifikasi biometrik oleh Admin dan tidak dibagikan kepada pihak ketiga. Kami mengenkripsi seluruh penyimpanan media di server kami.' 
      },
      { 
        q: 'Saya salah input tugas, apakah bisa dihapus?', 
        a: 'Ya, Anda bisa menghapus tugas yang Anda buat sendiri. Namun, jika tugas tersebut ditugaskan oleh Admin, Anda hanya bisa mengubah statusnya atau meminta Admin untuk menghapusnya.' 
      },
      { 
        q: 'Browser apa yang paling disarankan?', 
        a: 'Kami sangat menyarankan Google Chrome (Android/Desktop) dan Safari (iOS) untuk pengalaman terbaik dalam pelacakan lokasi dan fitur PWA.' 
      }
    ] as faq}
      <div class="group bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:border-orange-200 dark:hover:border-orange-500/30 transition-all duration-500">
        <h4 class="font-black text-slate-900 dark:text-white text-xl mb-4 flex items-start gap-4">
          <span class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center text-xs shrink-0 font-black">Q</span>
          {faq.q}
        </h4>
        <div class="pl-12">
          <p class="text-slate-500 dark:text-slate-400 text-lg leading-relaxed font-medium">
            {faq.a}
          </p>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-20 p-12 rounded-[3.5rem] bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl shadow-orange-500/30 relative overflow-hidden">
    <div class="absolute top-0 right-0 p-10 opacity-10 rotate-12">
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
    <div class="relative z-10 max-w-2xl">
      <h3 class="text-3xl font-black mb-6">Masih Butuh Bantuan?</h3>
      <p class="text-orange-100 text-lg leading-relaxed mb-10 font-medium">
        Jika Anda mengalami kendala teknis yang tidak tercantum di atas, jangan ragu untuk menghubungi tim dukungan kami melalui grup obrolan internal atau melalui email dukungan resmi.
      </p>
      <div class="flex flex-wrap gap-4">
        <div class="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-sm font-bold">
          support@khwarizmi.id
        </div>
        <div class="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-sm font-bold">
          Help Center (08:00 - 17:00)
        </div>
      </div>
    </div>
  </div>
</section>
