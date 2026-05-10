<script lang="ts">
  import { UserRound, Shield } from 'lucide-svelte';
</script>

<section id="profile" class="scroll-mt-32 mb-32">
  <h3 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-8" style="font-family:'Plus Jakarta Sans',sans-serif;">Profil & Keamanan</h3>
  
  <div class="grid gap-4">
    <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-5">
      <div class="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
        <UserRound size={24} />
      </div>
      <div>
        <h4 class="font-bold text-slate-900 mb-1">Update Data Diri</h4>
        <p class="text-sm text-slate-500 leading-relaxed">Ubah foto profil, WhatsApp, dan informasi jabatan Anda untuk mempermudah identifikasi tim.</p>
      </div>
    </div>
    <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-5">
      <div class="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
        <Shield size={24} />
      </div>
      <div>
        <h4 class="font-bold text-slate-900 mb-1">Ganti Password</h4>
        <p class="text-sm text-slate-500 leading-relaxed">Ganti password secara berkala di menu profil untuk menjaga keamanan akun Anda dari akses yang tidak sah.</p>
      </div>
    </div>
  </div>
</section>
