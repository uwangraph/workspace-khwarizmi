import { supabase } from '$lib/supabase';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

export const adminService = {
  async fetchAllData(period?: string, page = 1, pageSize = 100) {
    // period can be 'YYYY-MM' or 'YYYY'
    const isYearly = period && period.length === 4;
    const month = period || new Date().toISOString().slice(0, 7);
    const offset = (page - 1) * pageSize;
    
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

    // Tabel kecil (users, holidays, assignments, settings, special_rules) — ambil semua tanpa pagination
    // Tabel besar (tasks, attendance, leaves) — pagination per tabel dengan range terpisah
    const [usersRes, tasksRes, attendRes, assignRes, holidaysRes, settingsRes, leavesRes, specialRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }).range(offset, offset + pageSize - 1),
      supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }).range(offset, offset + pageSize - 1),
      supabase.from('task_assignments').select('*'),
      supabase.from('holidays').select('*').order('date'),
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('attendance_leaves').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }).range(offset, offset + pageSize - 1),
      supabase.from('special_rules').select('*').order('date')
    ]);

    return {
      users: usersRes.data || [],
      tasks: tasksRes.data || [],
      attendance: attendRes.data || [],
      assignments: assignRes.data || [],
      holidays: holidaysRes.data || [],
      settings: settingsRes.data || null,
      leaves: leavesRes.data || [],
      specialRules: specialRes.data || []
    };
  },

  async updateUser(userId: string, data: any) {
    return await supabase.from('profiles').update(data).eq('id', userId);
  },

  async deleteUser(userId: string) {
    // Delete via server API (requires admin privileges to remove auth user)
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });
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
        headers: await getAuthHeaders(),
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
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(holiday)
      })
      const result = await res.json()
      if (!res.ok) return { data: null, error: { message: result.error } }
      return { data: result.data, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  },

  async deleteHoliday(id: string) {
    try {
      const res = await fetch(`/api/admin/holidays?id=${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      })
      const result = await res.json()
      if (!res.ok) return { error: result.error }
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  },

  async saveSpecialRule(rule: any) {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'save-special-rule', rule })
      })
      const result = await res.json()
      if (!res.ok) return { data: null, error: result.error }
      return { data: result.data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  },

  async deleteSpecialRule(id: string) {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'delete-special-rule', id })
      })
      const result = await res.json()
      if (!res.ok) return { error: result.error }
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  },

  async updateSettings(settings: any) {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'update-settings', settings })
      })
      const result = await res.json()
      if (!res.ok) return { error: result.error }
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  },

  async updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected', adminId: string, rejectionNote?: string) {
    const updateData: any = { status, approved_by: adminId }
    if (status === 'rejected' && rejectionNote) {
      updateData.rejection_note = rejectionNote
    }
    return await supabase.from('attendance_leaves').update(updateData).eq('id', leaveId);
  },

  async scheduleDeletion() {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'schedule-deletion', confirm: true })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menjadwalkan penghapusan');
      return { data: result };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async cancelDeletion() {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'cancel-deletion' })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal membatalkan penghapusan');
      return { data: result };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async checkScheduledDeletion(settings: any) {
    if (!settings?.deletion_scheduled_at) return false;
    const scheduledAt = new Date(settings.deletion_scheduled_at).getTime();
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;
    
    return now >= scheduledAt && now - scheduledAt < hours24;
  },
  
  async clearAllTransactionData() {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'clear-transaction-data', confirm: true })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus data');
      return { data: result };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  async getPendingLeavesCount() {
    const { count, error } = await supabase
      .from('attendance_leaves')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) return 0;
    return count || 0;
  }
};
