<script lang="ts">
  import { LogIn } from 'lucide-svelte';
</script>

<section id="install" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 transition-colors duration-300">Instalasi & Akses</h1>
  <p class="text-lg text-slate-500 dark:text-slate-400 mb-12 leading-relaxed transition-colors duration-300">
    Khwarizmi adalah <strong>Progressive Web App (PWA)</strong>. Anda bisa menginstalnya langsung dari browser ke layar utama HP Anda.
  </p>

  <div class="flex flex-col gap-6 max-w-4xl">
    <div class="bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row items-center gap-10 group">
      <div class="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
        <span class="text-5xl">🤖</span>
      </div>
      <div class="flex-1">
        <h4 class="font-black text-slate-900 dark:text-white text-2xl mb-3 tracking-tight">Android (Chrome)</h4>
        <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-6">Buka Khwarizmi di Chrome, lalu ketuk menu <span class="font-bold dark:text-slate-200">titik tiga</span> di pojok kanan atas dan pilih <span class="text-orange-600 dark:text-orange-400 font-bold">Instal Aplikasi</span>.</p>
        <div class="w-fit px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider">Paling Direkomendasikan</div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900/40 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col md:flex-row items-center gap-10 group">
      <div class="w-24 h-24 bg-orange-50 dark:bg-orange-900/30 rounded-[2rem] flex items-center justify-center shrink-0 group-hover:-rotate-12 transition-transform">
        <span class="text-5xl">🍎</span>
      </div>
      <div class="flex-1">
        <h4 class="font-black text-slate-900 dark:text-white text-2xl mb-3 tracking-tight">iOS (Safari)</h4>
        <p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-6">Buka di Safari, ketuk ikon <span class="font-bold dark:text-slate-200">Bagikan</span> (kotak dengan panah), lalu scroll ke bawah dan pilih <span class="text-orange-600 dark:text-orange-400 font-bold">Add to Home Screen</span>.</p>
        <div class="w-fit px-4 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-wider">Hanya via Safari</div>
      </div>
    </div>
  </div>
</section>
