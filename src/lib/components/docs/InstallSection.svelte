<script lang="ts">
  import { LogIn } from 'lucide-svelte';
</script>

<section id="install" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 transition-colors duration-300">Instalasi & Akses</h1>
  
  <div class="prose prose-slate dark:prose-invert max-w-none mb-12">
    <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
      Khwarizmi Workspace dibangun menggunakan teknologi <strong>Progressive Web App (PWA)</strong>. Ini berarti Anda mendapatkan pengalaman aplikasi native yang ringan tanpa perlu mengunduh file besar dari App Store atau Play Store.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
      <div class="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        <h5 class="font-bold mb-2 text-slate-900 dark:text-white">Hemat Memori</h5>
        <p class="text-sm text-slate-500 dark:text-slate-400">Ukuran kurang dari 1MB, tidak membebani penyimpanan perangkat Anda.</p>
      </div>
      <div class="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        <h5 class="font-bold mb-2 text-slate-900 dark:text-white">Selalu Update</h5>
        <p class="text-sm text-slate-500 dark:text-slate-400">Pembaruan fitur terjadi secara otomatis saat Anda membuka aplikasi.</p>
      </div>
      <div class="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        <h5 class="font-bold mb-2 text-slate-900 dark:text-white">Akses Offline</h5>
        <p class="text-sm text-slate-500 dark:text-slate-400">Beberapa fitur tetap dapat diakses meski koneksi internet tidak stabil.</p>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-8 max-w-4xl">
    <!-- Android -->
    <div class="bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row items-start gap-10 group">
      <div class="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
        <span class="text-4xl">🤖</span>
      </div>
      <div class="flex-1">
        <h4 class="font-black text-slate-900 dark:text-white text-2xl mb-4 tracking-tight">Android (Google Chrome)</h4>
        <ol class="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed list-decimal pl-4">
          <li>Buka browser <strong>Chrome</strong> dan akses URL workspace Anda.</li>
          <li>Ketuk ikon <strong>tiga titik vertikal</strong> di pojok kanan atas layar.</li>
          <li>Pilih menu <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
          <li>Tunggu proses instalasi selesai, dan ikon Khwarizmi akan muncul di menu aplikasi Anda.</li>
        </ol>
      </div>
    </div>

    <!-- iOS -->
    <div class="bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row items-start gap-10 group">
      <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:-rotate-12 transition-transform">
        <span class="text-4xl">🍎</span>
      </div>
      <div class="flex-1">
        <h4 class="font-black text-slate-900 dark:text-white text-2xl mb-4 tracking-tight">iOS / iPhone (Safari)</h4>
        <ol class="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed list-decimal pl-4">
          <li>Buka browser <strong>Safari</strong> (Wajib menggunakan Safari di iOS).</li>
          <li>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di bagian bawah layar.</li>
          <li>Gulir ke bawah hingga Anda menemukan pilihan <strong>"Add to Home Screen"</strong> (Tambahkan ke Layar Utama).</li>
          <li>Ketuk <strong>"Add"</strong> di pojok kanan atas untuk mengonfirmasi.</li>
        </ol>
      </div>
    </div>

    <!-- Desktop -->
    <div class="bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row items-start gap-10 group">
      <div class="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        <span class="text-4xl">💻</span>
      </div>
      <div class="flex-1">
        <h4 class="font-black text-slate-900 dark:text-white text-2xl mb-4 tracking-tight">Desktop / Laptop (Chrome/Edge)</h4>
        <p class="text-slate-600 dark:text-slate-400 mb-4">Anda juga bisa menggunakan Khwarizmi seperti aplikasi desktop mandiri:</p>
        <ul class="space-y-3 text-slate-600 dark:text-slate-400 list-disc pl-4">
          <li>Lihat di bagian <strong>Address Bar</strong> (bilah alamat) browser Anda.</li>
          <li>Klik ikon <strong>"Install"</strong> (biasanya berbentuk layar monitor dengan panah bawah).</li>
          <li>Atau buka menu browser dan pilih <strong>"Apps" > "Install this site as an app"</strong>.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="mt-20 p-8 rounded-[2rem] bg-orange-500 text-white shadow-xl shadow-orange-500/20">
    <h4 class="text-xl font-bold mb-2">💡 Tips Akses Cepat</h4>
    <p class="text-orange-50/80 leading-relaxed">
      Setelah terinstal, Anda tidak perlu lagi mengetik URL di browser. Cukup ketuk ikon Khwarizmi di layar utama HP Anda untuk masuk ke lingkungan kerja yang lebih imersif tanpa gangguan bilah navigasi browser.
    </p>
  </div>
</section>
