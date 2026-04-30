import { supabase } from '$lib/supabase';

export const adminService = {
  async fetchAllData(period?: string) {
    // period can be 'YYYY-MM' or 'YYYY'
    const isYearly = period && period.length === 4;
    const month = period || new Date().toISOString().slice(0, 7);
    
    let startDate, endDate;
    if (isYearly) {
      startDate = `${period}-01-01`;
      endDate = `${period}-12-31`;
    } else {
      const [year, m] = month.split('-').map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      startDate = `${month}-01`;
      endDate = `${month}-${lastDay}`;
    }

    const [usersRes, tasksRes, attendRes, assignRes, holidaysRes, settingsRes, leavesRes, thursdayRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('task_assignments').select('*'),
      supabase.from('holidays').select('*').order('date'),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('attendance_leaves').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('thursday_rules').select('*').order('date')
    ]);

    return {
      users: usersRes.data || [],
      tasks: tasksRes.data || [],
      attendance: attendRes.data || [],
      assignments: assignRes.data || [],
      holidays: holidaysRes.data || [],
      settings: settingsRes.data || null,
      leaves: leavesRes.data || [],
      thursdayRules: thursdayRes.data || []
    };
  },

  async updateUser(userId: string, data: any) {
    return await supabase.from('profiles').update(data).eq('id', userId);
  },

  async deleteUser(userId: string) {
    // Delete via server API (requires admin privileges to remove auth user)
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) return { error: result.error || 'Gagal menghapus pengguna' };
      return { data: result };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async createUser(data: any) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) return { error: result.error || 'Gagal membuat akun' };
      return { data: result };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async saveHoliday(holiday: any) {
    if (holiday.id) return await supabase.from('holidays').update({ name: holiday.name, date: holiday.date }).eq('id', holiday.id);
    return await supabase.from('holidays').insert({ name: holiday.name, date: holiday.date });
  },

  async deleteHoliday(id: string) {
    return await supabase.from('holidays').delete().eq('id', id);
  },

  async saveThursdayRule(rule: any) {
    // Use upsert to handle both create and update, conflicting on date
    return await supabase
      .from('thursday_rules')
      .upsert(rule, { onConflict: 'date' })
      .select()
      .single();
  },

  async deleteThursdayRule(id: string) {
    return await supabase.from('thursday_rules').delete().eq('id', id);
  },

  async updateSettings(settings: any) {
    return await supabase.from('app_settings').update(settings).eq('id', 1);
  },

  async updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected', adminId: string) {
    return await supabase.from('attendance_leaves').update({ status, approved_by: adminId }).eq('id', leaveId);
  },

  async scheduleDeletion() {
    const now = new Date().toISOString();
    return await supabase.from('app_settings').update({ deletion_scheduled_at: now }).eq('id', 1);
  },

  async cancelDeletion() {
    return await supabase.from('app_settings').update({ deletion_scheduled_at: null }).eq('id', 1);
  },

  async checkScheduledDeletion(settings: any) {
    if (!settings?.deletion_scheduled_at) return false;
    const scheduledAt = new Date(settings.deletion_scheduled_at).getTime();
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;
    
    // Jika sudah lewat 24 jam, eksekusi hapus permanen!
    if (now - scheduledAt >= hours24) {
      await this.clearAllTransactionData();
      await this.cancelDeletion(); // Reset setelah berhasil dihapus
      return false; // Karena sudah dihapus, status 'menunggu' hilang
    }
    return true; // Sedang dalam masa tunggu 24 jam
  },
  
  async clearAllTransactionData() {
    // Menghapus semua data transaksi/operasional untuk pembersihan sistem
    const results = await Promise.all([
      supabase.from('task_assignments').delete().neq('task_id', '00000000-0000-0000-0000-000000000000'), // Delete assignments first to avoid FK constraint errors
      supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'), // Delete all tasks
      supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000'), // Delete all attendance
      supabase.from('attendance_leaves').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('attendance_penalties').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('fcm_tokens').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    ]);

    const error = results.find(r => r.error);
    if (error) throw error.error;
    return { success: true };
  }
};

