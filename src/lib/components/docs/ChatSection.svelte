<script lang="ts">
  import { MessageSquare, Bell, UserRound, Sparkles, Zap } from 'lucide-svelte';
</script>

<section id="chat" class="scroll-mt-32 mb-32 relative">
  <!-- Background Glow -->
  <div class="absolute -right-20 -top-20 w-80 h-80 bg-blue-100/30 rounded-full blur-[100px] pointer-events-none"></div>

  <div class="flex flex-col md:flex-row items-center gap-6 mb-12">
    <h3 class="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight" style="font-family:'Plus Jakarta Sans',sans-serif;">Obrolan <span class="text-blue-600">(Chat)</span></h3>
    <div class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-xl shadow-blue-600/30 animate-bounce">
      <Zap size={14} fill="currentColor" /> Real-time Sync
    </div>
  </div>
  
  <p class="text-xl text-slate-500 mb-16 leading-relaxed max-w-2xl font-medium">
    Komunikasi tim yang sangat cepat dengan sinkronisasi status baca yang instan di semua perangkat Anda.
  </p>

  <div class="grid lg:grid-cols-12 gap-8">
    <div class="lg:col-span-7 p-1 md:p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[3.5rem] shadow-2xl shadow-blue-200">
      <div class="bg-white p-8 md:p-12 rounded-[3.2rem] h-full relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-48 h-48 bg-blue-50 rounded-bl-full -translate-y-10 translate-x-10 group-hover:translate-y-0 group-hover:translate-x-0 transition-transform duration-700"></div>
        
        <div class="relative z-10">
          <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
            <MessageSquare size={32} />
          </div>
          <h4 class="font-black text-2xl text-slate-900 mb-6 tracking-tight leading-tight">Apa yang membuat sistem kami <span class="text-blue-600 italic">berbeda?</span></h4>
          <ul class="space-y-6">
            {#each [
              { title: 'Presisi Tinggi', desc: 'Status "Sudah Dibaca" disinkronkan dalam milidetik.' },
              { title: 'Badge Notifikasi Global', desc: 'Pantau pesan baru dari halaman mana pun melalui Navigasi Bawah.' },
              { title: 'Grup Proyek', desc: 'Buat ruang obrolan khusus untuk setiap proyek atau tim.' }
            ] as feature}
              <li class="flex gap-4">
                <div class="mt-1 w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                <div>
                  <h5 class="font-bold text-slate-900 text-sm mb-1">{feature.title}</h5>
                  <p class="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <div class="lg:col-span-5 space-y-8">
      <div class="p-8 bg-orange-600 rounded-[3rem] text-white shadow-xl shadow-orange-600/20 relative overflow-hidden group">
        <div class="absolute -right-8 -top-8 opacity-20 group-hover:scale-125 transition-transform duration-700">
          <Bell size={120} />
        </div>
        <div class="relative z-10">
          <div class="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/20">
            <Bell size={24} />
          </div>
          <h4 class="font-bold text-xl mb-3">Notification Badge</h4>
          <p class="text-orange-100 text-sm leading-relaxed">Jangan pernah melewatkan pesan penting dengan indikator angka di menu navigasi.</p>
        </div>
      </div>

      <div class="p-8 bg-slate-900 rounded-[3rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group border border-slate-800">
        <div class="absolute -right-8 -bottom-8 opacity-20 group-hover:rotate-12 transition-transform duration-700">
          <UserRound size={120} />
        </div>
        <div class="relative z-10">
          <div class="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/10">
            <UserRound size={24} />
          </div>
          <h4 class="font-bold text-xl mb-3">Pesan Tebal (Bold)</h4>
          <p class="text-slate-400 text-sm leading-relaxed">Pesan yang belum Anda baca akan ditandai dengan teks tebal agar mudah ditemukan.</p>
        </div>
      </div>
    </div>
  </div>
</section>
