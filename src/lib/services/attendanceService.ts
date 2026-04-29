import { supabase } from '$lib/supabase';
import type { AttendanceRecord } from '$lib/type';

/** Tanggal lokal WIB (UTC+7) dalam format YYYY-MM-DD, bukan UTC */
function getLocalDate(): string {
  const now = new Date();
  // Offset WIB = UTC+7 = 420 menit
  const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wib.toISOString().split('T')[0];
}

export const attendanceService = {
  async getTodayData(userId: string) {
    const today = getLocalDate();
    const [attendRes, leavesRes, penaltiesRes, settingsRes, holidayRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('attendance_leaves').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('attendance_penalties').select('*').eq('user_id', userId).eq('date', today),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('holidays').select('*').eq('date', today).maybeSingle()
    ]);

    let thursdayRule = null;
    if (new Date().getDay() === 4) {
      const { data } = await supabase.from('thursday_rules').select('*').eq('date', today).single();
      thursdayRule = data;
    }

    return {
      attendance: attendRes.data || [],
      leaves: leavesRes.data || [],
      penalties: penaltiesRes.data || [],
      appSettings: settingsRes.data || null,
      todayHoliday: holidayRes.data || null,
      thursdayRule
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
    const today = getLocalDate();
    return await supabase.from('attendance').insert({ 
      user_id: userId, 
      session_id: sessionId, 
      date: today, 
      check_in: new Date().toISOString(), 
      photo_in_url: publicUrl, 
      late: isLate, 
      late_reason: lateReason || null 
    });
  },

  async submitCheckOut(userId: string, sessionId: number, publicUrl: string) {
    const today = getLocalDate();
    return await supabase.from('attendance')
      .update({ check_out: new Date().toISOString(), photo_out_url: publicUrl })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('date', today);
  },

  async autoCheckout(userId: string, recordId: string, sessionId: number, checkoutTime: string) {
    const today = getLocalDate();
    await supabase.from('attendance').update({ 
      check_out: checkoutTime, 
      forgot_checkout: true 
    }).eq('id', recordId);
    
    return await supabase.from('attendance_penalties').insert({ 
      user_id: userId, 
      date: today, 
      session_id: sessionId, 
      minutes: 10, 
      reason: `Lupa checkout` 
    });
  },

  async submitLeave(userId: string, type: 'izin' | 'sakit', reason: string, sessionId: number | null) {
    return await supabase.from('attendance_leaves').insert({ 
      user_id: userId, 
      date: getLocalDate(), 
      type, 
      reason: reason.trim(), 
      session_id: sessionId,
      status: 'pending'
    });
  },

  async getTotalAttendanceDays(userId: string) {
    const { data } = await supabase.from('attendance').select('date').eq('user_id', userId);
    return new Set((data || []).map(a => a.date)).size;
  }
};
