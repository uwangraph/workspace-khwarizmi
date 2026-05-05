<script lang="ts">
  import type { Profile, AttendanceRecord, AttendanceLeave } from '$lib/components/admin/_types'
  import { getInitials, formatTime, SESSIONS, formatWA } from '$lib/components/admin/_utils'
  import { X, MessageCircle, Clock, CheckCircle2, AlertTriangle, FileText, MapPin, Image as ImageIcon } from 'lucide-svelte'

  interface Props {
    user: Profile
    attendance: AttendanceRecord[]
    leaves: AttendanceLeave[]
    date: string
    onClose: () => void
  }
  let { user, attendance, leaves, date, onClose } = $props<Props>()

  const waUrl = user.phone ? `https://wa.me/${formatWA(user.phone)}` : ''
  let viewPhotoUrl = $state('')
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog">
  <div class="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
    <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <h2 class="text-base font-bold text-slate-800">Detail Absensi Harian</h2>
      <button onclick={onClose} class="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
        <X size={20} />
      </button>
    </div>

    <div class="p-6">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white overflow-hidden shadow-sm"
             style="background:linear-gradient(135deg,#F97316,#EA580C)">
          {#if user.avatar_url}<img src={user.avatar_url} alt="" class="w-full h-full object-cover" />{:else}{getInitials(user.full_name)}{/if}
        </div>
        <div class="flex-1">
          <p class="text-lg font-bold text-slate-800 leading-tight">{user.full_name}</p>
          <p class="text-xs text-slate-500 mb-2">{user.position || 'Karyawan'}</p>
          {#if waUrl}
            <a href={waUrl} target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-bold border border-green-100">
              <MessageCircle size={14} /> Hubungi WhatsApp
            </a>
          {:else}
            <p class="text-[10px] text-slate-400 italic">Nomor WhatsApp tidak tersedia</p>
          {/if}
        </div>
      </div>

      <div class="mb-4">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sesi {new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <div class="flex flex-col gap-3">
          {#each SESSIONS as s}
            {@const att = attendance.find(a => a.session_id === s.id)}
            {@const leave = leaves.find(l => l.session_id === null || l.session_id === s.id)}
            
            <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-slate-400">
                  {#if att?.check_out}
                    <CheckCircle2 size={16} class="text-green-500" />
                  {:else if att?.check_in}
                    <Clock size={16} class="text-orange-500" />
                  {:else if leave && leave.status !== 'rejected'}
                    <FileText size={16} class={leave.type === 'sakit' ? 'text-red-500' : 'text-orange-500'} />
                  {:else}
                    <AlertTriangle size={16} class="text-slate-300" />
                  {/if}
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-700">{s.name}</p>
                  <p class="text-[10px] text-slate-400">{s.start} - {s.end}</p>
                  {#if att}
                    <p class="text-[9px] text-slate-500 flex items-center gap-1 mt-1"><MapPin size={10} class="text-blue-500"/> Sesuai Radius</p>
                    {#if att.late}
                      <p class="text-[9px] text-red-500 font-semibold mt-0.5">Telat: {att.late_reason || 'Tidak ada alasan'}</p>
                    {/if}
                  {/if}
                </div>
              </div>
              
              <div class="text-right">
                {#if att?.check_in}
                  <div class="flex flex-col items-end gap-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded text-white {att.late ? 'bg-red-500' : 'bg-green-500'} shadow-sm">In: {formatTime(att.check_in)}</span>
                    {#if att.photo_in_url}
                      <button onclick={() => viewPhotoUrl = att.photo_in_url!} class="relative group w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform">
                        <img src={att.photo_in_url} alt="Foto In" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ImageIcon size={12} class="text-white" />
                        </div>
                      </button>
                    {/if}

                    {#if att.check_out}
                      <div class="w-full h-px bg-slate-100 my-1"></div>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded text-white bg-green-500 shadow-sm">Out: {formatTime(att.check_out)}</span>
                      {#if att.photo_out_url}
                        <button onclick={() => viewPhotoUrl = att.photo_out_url!} class="relative group w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform">
                          <img src={att.photo_out_url} alt="Foto Out" class="w-full h-full object-cover" />
                          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ImageIcon size={12} class="text-white" />
                          </div>
                        </button>
                      {/if}
                    {/if}
                  </div>
                {:else if leave && leave.status !== 'rejected'}
                  <div class="flex flex-col items-end">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded text-white capitalize {leave.type === 'sakit' ? 'bg-red-500' : 'bg-orange-500'}">{leave.type} ({leave.status === 'approved' ? 'Disetujui' : 'Pending'})</span>
                  </div>
                {:else}
                  <span class="text-[10px] font-semibold text-slate-400">Kosong</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  {#if viewPhotoUrl}
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background:rgba(0,0,0,0.9)" onclick={() => viewPhotoUrl = ''} role="dialog" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (viewPhotoUrl = '')}>
      <button class="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-all">
        <X size={20} />
      </button>
      <img src={viewPhotoUrl} alt="Bukti Absensi" class="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain" />
    </div>
  {/if}
</div>
