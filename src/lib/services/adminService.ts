import { supabase } from '$lib/supabase';

export const adminService = {
  async fetchAllData(attendanceMonth?: string) {
    const month = attendanceMonth || new Date().toISOString().slice(0, 7);
    const [usersRes, tasksRes, attendRes, assignRes, holidaysRes, settingsRes, leavesRes, thursdayRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      // Filter attendance to current month to avoid fetching all historical data
      supabase.from('attendance').select('*').gte('date', `${month}-01`).lte('date', `${month}-31`).order('date', { ascending: false }),
      supabase.from('task_assignments').select('*'),
      supabase.from('holidays').select('*').order('date'),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('attendance_leaves').select('*').gte('date', `${month}-01`).order('date', { ascending: false }),
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
  }
};
