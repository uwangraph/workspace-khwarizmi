<script lang="ts">
  import { MessageSquare, Bell, UserRound } from 'lucide-svelte';
</script>

<section id="chat" class="scroll-mt-32 mb-32">
  <div class="flex items-center gap-4 mb-8">
    <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan (Chat)</h3>
    <span class="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-orange-600/20">Real-time</span>
  </div>
  
  <div class="p-10 bg-orange-50/50 rounded-[3rem] border border-orange-100/50 relative overflow-hidden group">
    <div class="absolute right-0 bottom-0 opacity-10 -rotate-12 translate-x-10 translate-y-10 group-hover:scale-110 transition-transform">
      <MessageSquare size={240} />
    </div>
    <div class="relative z-10 max-w-xl">
      <p class="text-lg text-slate-700 leading-relaxed mb-8 font-medium">
        Sistem chat kami mendukung komunikasi tim yang sangat cepat dengan sinkronisasi status baca yang instan.
      </p>
      <div class="space-y-4">
        <div class="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
          <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><Bell size={20} /></div>
          <p class="text-sm font-bold text-slate-800">Badge Notifikasi Global di Navigasi</p>
        </div>
        <div class="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm">
          <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><UserRound size={20} /></div>
          <p class="text-sm font-bold text-slate-800">Indikator Pesan Baru (Teks Bold)</p>
        </div>
      </div>
    </div>
  </div>
</section>
