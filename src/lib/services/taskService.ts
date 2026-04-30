import { supabase } from '$lib/supabase';
import type { Task, TaskAssignment } from '$lib/type';

async function checkDeletionStatus() {
  const { data: settings } = await supabase.from('app_settings').select('deletion_scheduled_at').eq('id', 1).single();
  if (settings?.deletion_scheduled_at) {
    const scheduledAt = new Date(settings.deletion_scheduled_at).getTime();
    const now = Date.now();
    if (now - scheduledAt < 24 * 60 * 60 * 1000) {
      throw new Error('Sistem sedang dikunci karena pembersihan data dijadwalkan.');
    }
  }
}

export const taskService = {
  async getTasks(userId: string, _role: string): Promise<Task[]> {
    // For all users (including admins), get tasks they created or are assigned to
    const { data: myA } = await supabase
      .from('task_assignments')
      .select('task_id')
      .eq('user_id', userId)
      .in('status', ['accepted', 'pending']);
    
    const visibleTaskIds = (myA || []).map(a => a.task_id);
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    
    if (visibleTaskIds.length > 0) {
      query = query.or(`created_by.eq.${userId},id.in.(${visibleTaskIds.join(',')})`);
    } else {
      query = query.eq('created_by', userId);
    }
    
    const { data } = await query;
    return (data as Task[]) || [];
  },

  async getAssignments(userId: string): Promise<TaskAssignment[]> {
    const { data } = await supabase.from('task_assignments').select('*').eq('user_id', userId);
    return (data as TaskAssignment[]) || [];
  },

  async getAllAssignments(taskIds: string[]): Promise<TaskAssignment[]> {
    if (taskIds.length === 0) return [];
    const { data } = await supabase.from('task_assignments').select('*').in('task_id', taskIds);
    return (data as TaskAssignment[]) || [];
  },

  async saveTask(taskData: Partial<Task>, assignedUserIds: string[], userId: string, isEditing: boolean, editingTaskId?: string | null) {
    await checkDeletionStatus();
    let taskId: string;
    
    if (isEditing && editingTaskId) {
      // Ambil data tugas lama untuk tahu siapa pembuatnya
      const { data: currentTask } = await supabase.from('tasks').select('created_by').eq('id', editingTaskId).single();
      await supabase.from('tasks').update(taskData).eq('id', editingTaskId);
      taskId = editingTaskId;
      
      const { data: oldAssignments } = await supabase.from('task_assignments').select('user_id, status').eq('task_id', taskId);
      const oldStatusMap = new Map((oldAssignments || []).map(a => [a.user_id, a.status]));
      const ownerId = currentTask?.created_by || userId;

      await supabase.from('task_assignments').delete().eq('task_id', taskId);
      
      const allUserIds = [...new Set([...assignedUserIds, ownerId, userId])];
      const newAssignments = allUserIds.map(uid => {
        const oldStatus = oldStatusMap.get(uid);
        let status: any = 'pending';
        if (uid === ownerId || uid === userId) status = (oldStatus === 'completed') ? 'completed' : 'accepted';
        else if (oldStatus === 'accepted' || oldStatus === 'completed') status = oldStatus;
        return { task_id: taskId, user_id: uid, status };
      });

      await supabase.from('task_assignments').insert(newAssignments);
      
      // Return new collabs for notification
      return { taskId, newCollabs: assignedUserIds.filter(uid => uid !== userId && uid !== ownerId && !oldStatusMap.has(uid)) };
    } else {
      const { data: newTask, error: insertError } = await supabase.from('tasks').insert({ ...taskData, created_by: userId }).select().single();
      if (insertError || !newTask) throw new Error(insertError?.message || 'Gagal membuat tugas');
      taskId = newTask.id;
      const allUserIds = [...new Set([...assignedUserIds, userId])];
      
      await supabase.from('task_assignments').insert(allUserIds.map(uid => ({ 
        task_id: taskId, 
        user_id: uid, 
        status: uid === userId ? 'accepted' : 'pending' 
      })));
      
      return { taskId, newCollabs: assignedUserIds.filter(uid => uid !== userId) };
    }
  },

  async updateProgress(taskId: string, progress: number, status: string, _note?: string | null) {
    await checkDeletionStatus();
    // Note: progress_note column does not exist in DB schema
    const updateData: any = { progress, status };
    const result = await supabase.from('tasks').update(updateData).eq('id', taskId);
    if (result.error) console.error('[taskService.updateProgress] Error:', result.error.message);
    return result;
  },

  async updateAssignmentStatus(assignmentId: string, status: string, completedAt?: string | null) {
    await checkDeletionStatus();
    const updateData: any = { status };
    if (completedAt) updateData.completed_at = completedAt;
    return await supabase.from('task_assignments').update(updateData).eq('id', assignmentId);
  },

  async deleteTask(taskId: string) {
    await checkDeletionStatus();
    return await supabase.from('tasks').delete().eq('id', taskId);
  },

  async bulkUpdateStatus(taskIds: string[], status: string, progress: number) {
    return await supabase.from('tasks').update({ status, progress }).in('id', taskIds);
  },

  async bulkDeleteTasks(taskIds: string[]) {
    // Delete assignments first (though cascade should handle it)
    await supabase.from('task_assignments').delete().in('task_id', taskIds);
    return await supabase.from('tasks').delete().in('id', taskIds);
  },

  async updateTaskFields(taskId: string, fields: Partial<Task>) {
    // Strip undefined values to avoid Supabase 400 errors
    const cleanFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    const result = await supabase.from('tasks').update(cleanFields).eq('id', taskId);
    if (result.error) console.error('[taskService.updateTaskFields] Error:', result.error.message, result.error.details, 'Fields:', Object.keys(cleanFields));
    return result;
  }
};
