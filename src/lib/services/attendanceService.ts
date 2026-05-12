import { supabase } from '$lib/supabase';
import type { AttendanceRecord } from '$lib/type';

/** Tanggal lokal WIB (UTC+7) dalam format YYYY-MM-DD, bukan UTC */
function getLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
}

async function checkDeletionStatus() {
  const { data: settings } = await supabase.from('app_settings').select('deletion_scheduled_at').eq('id', 1).single();
  if (settings?.deletion_scheduled_at) {
    const scheduledAt = new Date(settings.deletion_scheduled_at).getTime();
    const now = Date.now();
    // Jika sudah melewati jadwal dan masih dalam jendela 24 jam
    if (now >= scheduledAt && now - scheduledAt < 24 * 60 * 60 * 1000) {
      throw new Error('Sistem sedang dikunci karena pembersihan data dijadwalkan. Silakan hubungi Admin.');
    }
  }
}

export const attendanceService = {
  async getTodayData(userId: string) {
    const today = getLocalDate();
    const [attendRes, leavesRes, penaltiesRes, settingsRes, holidayRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('attendance_leaves').select('*').eq('user_id', userId).gte('date', today).order('date', { ascending: true }),
      supabase.from('attendance_penalties').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('holidays').select('*').eq('date', today).maybeSingle()
    ]);

    const { data: specialRule } = await supabase.from('special_rules').select('*').eq('date', today).maybeSingle();

    return {
      attendance: attendRes.data || [],
      leaves: leavesRes.data || [],
      penalties: penaltiesRes.data || [],
      appSettings: settingsRes.data || null,
      todayHoliday: holidayRes.data || null,
      specialRule
    };
  },

  async uploadSelfie(userId: string, blob: Blob, type: 'in' | 'out') {
    const path = `${userId}/${Date.now()}_${type}.jpg`;
    const { error: uploadError } = await supabase.storage.from('selfies').upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(path);
    return publicUrl;
  },

  async submitCheckIn(userId: string, sessionId: number, publicUrl: string, isLate: boolean, lateReason?: string | null) {
    await checkDeletionStatus();
    const today = getLocalDate();
    return await supabase.from('attendance').insert({ 
      user_id: userId, 
      session_id: sessionId, 
      date: today, 
      clock_in: new Date().toISOString(), 
      photo_in_url: publicUrl, 
      late: isLate, 
      late_reason: lateReason || null 
    });
  },

  async submitCheckOut(userId: string, sessionId: number, publicUrl: string) {
    await checkDeletionStatus();
    const today = getLocalDate();
    return await supabase.from('attendance')
      .update({ clock_out: new Date().toISOString(), photo_out_url: publicUrl })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('date', today);
  },

  async autoCheckout(userId: string, recordId: string, sessionId: number, clientCheckoutTime?: string) {
    const today = getLocalDate();
    
    // Tentukan waktu checkout di service untuk mencegah eksploitasi clock browser
    let clockOutTime = new Date().toISOString();
    const sessionTimeMap: Record<number, string> = {
      1: '12:00:00',
      2: '15:30:00',
      3: '17:30:00',
      4: '23:59:59'
    };
    
    if (sessionTimeMap[sessionId]) {
      const jkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const [h, m, s] = sessionTimeMap[sessionId].split(':').map(Number);
      jkt.setHours(h, m, s, 0);
      clockOutTime = jkt.toISOString();
    } else if (clientCheckoutTime) {
      clockOutTime = clientCheckoutTime;
    }

    await supabase.from('attendance').update({ 
      clock_out: clockOutTime, 
      forgot_checkout: true 
    }).eq('id', recordId);
    
    return await supabase.from('attendance_penalties').insert({ 
      user_id: userId, 
      date: today, 
      session_id: sessionId, 
      minutes: 10, 
      reason: `Lupa clock out` 
    });
  },

  async submitLeave(userId: string, type: 'izin' | 'sakit', reason: string, sessionId: number | null, date?: string) {
    await checkDeletionStatus();
    return await supabase.from('attendance_leaves').insert({ 
      user_id: userId, 
      date: date || getLocalDate(), 
      type, 
      reason: reason.trim(), 
      session_id: sessionId,
      status: 'pending'
    });
  },

  async getTotalAttendanceDays(userId: string) {
    const { data } = await supabase.from('attendance').select('date').eq('user_id', userId);
    return new Set((data || []).map(a => a.date)).size;
  },

  async cleanupOldData(days: number) {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ action: 'cleanup-old-data', days })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal membersihkan data');
      return result;
    } catch (err: any) {
      console.error('Error during cleanup:', err.message);
      return { success: false, error: err.message };
    }
  }
};
