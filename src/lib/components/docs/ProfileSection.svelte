<script lang="ts">
  import { UserRound, Shield } from 'lucide-svelte';
</script>

<section id="profile" class="scroll-mt-32 mb-32">
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 transition-colors duration-300">Profil & Keamanan</h1>
  
  <div class="grid gap-4">
    <div class="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-5 transition-colors duration-300">
      <div class="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-400 dark:text-slate-500">
        <UserRound size={24} />
      </div>
      <div>
        <h4 class="font-bold text-slate-900 dark:text-white mb-1 transition-colors duration-300">Update Data Diri</h4>
        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed transition-colors duration-300">Ubah foto profil, WhatsApp, dan informasi jabatan Anda untuk mempermudah identifikasi tim.</p>
      </div>
    </div>
    <div class="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-5 transition-colors duration-300">
      <div class="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-400 dark:text-slate-500">
        <Shield size={24} />
      </div>
      <div>
        <h4 class="font-bold text-slate-900 dark:text-white mb-1 transition-colors duration-300">Ganti Password</h4>
        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed transition-colors duration-300">Ganti password secara berkala di menu profil untuk menjaga keamanan akun Anda dari akses yang tidak sah.</p>
      </div>
    </div>
  </div>
</section>
