import { supabase } from '$lib/supabase';
import type { Task, TaskAssignment } from '$lib/type';
import { notificationService } from './notificationService';

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
        // If task is done, mark owner/editor assignment as completed
        if (uid === ownerId || uid === userId) {
          status = taskData.status === 'done' ? 'completed' : 'accepted';
        } else if (oldStatus === 'accepted' || oldStatus === 'completed') {
          status = taskData.status === 'done' ? 'completed' : oldStatus;
        }
        
        const assignment: any = { task_id: taskId, user_id: uid, status };
        if (status === 'completed' && (!oldStatus || oldStatus !== 'completed')) {
          assignment.completed_at = new Date().toISOString();
        } else if (oldStatus === 'completed') {
          // preserve existing completed_at if possible, but we don't have it in oldStatusMap easily
          // for now just set new date if it's missing or done
          assignment.completed_at = new Date().toISOString(); 
        }
        return assignment;
      });

      await supabase.from('task_assignments').insert(newAssignments);
      const newCollabs = assignedUserIds.filter(uid => {
        if (uid === userId || uid === ownerId) return false;
        const oldStatus = oldStatusMap.get(uid);
        return !oldStatus || oldStatus === 'pending' || oldStatus === 'rejected';
      });

      return { taskId, newCollabs };
    } else {
      const { data: newTask, error: insertError } = await supabase.from('tasks').insert({ ...taskData, created_by: userId }).select().single();
      if (insertError || !newTask) throw new Error(insertError?.message || 'Gagal membuat tugas');
      taskId = newTask.id;
      const allUserIds = [...new Set([...assignedUserIds, userId])];
      
      const isDone = taskData.status === 'done';
      await supabase.from('task_assignments').insert(allUserIds.map(uid => {
        const status = (uid === userId) ? (isDone ? 'completed' : 'accepted') : (isDone ? 'completed' : 'pending');
        const assignment: any = { task_id: taskId, user_id: uid, status };
        if (status === 'completed') assignment.completed_at = new Date().toISOString();
        return assignment;
      }));
      
      return { taskId, newCollabs: assignedUserIds.filter(uid => uid !== userId) };
    }
  },

  async checkLowTaskCount(userId: string) {
    const { count } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'rejected');

    if (count !== null && count <= 1) {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
        const adminIds = admins.map(a => a.id).filter(id => id !== userId);
        
        if (adminIds.length > 0) {
          const title = '⚠️ Peringatan Workload';
          const message = `${userProfile?.full_name || 'Anggota'} hanya memiliki ${count} tugas aktif. Mohon berikan tugas baru agar tetap produktif.`;
          await notificationService.sendBulk(adminIds, 'workload_alert', title, message, { user_id: userId, task_count: count });
        }
      }
    }
  },

  async updateProgress(taskId: string, progress: number, status: string, _note?: string | null) {
    await checkDeletionStatus();
    const updateData: any = { progress, status };
    const result = await supabase.from('tasks').update(updateData).eq('id', taskId);
    
    if (status === 'done') {
      const { data: ass } = await supabase.from('task_assignments').select('user_id').eq('task_id', taskId);
      if (ass) {
        for (const a of ass) {
          await this.checkLowTaskCount(a.user_id);
        }
      }
    }

    if (result.error) console.error('[taskService.updateProgress] Error:', result.error.message);
    return result;
  },

  async updateAssignmentStatus(assignmentId: string, status: string, completedAt?: string | null) {
    await checkDeletionStatus();
    const updateData: any = { status };
    if (completedAt) updateData.completed_at = completedAt;
    
    const result = await supabase.from('task_assignments').update(updateData).eq('id', assignmentId);
    
    if (status === 'completed') {
      const { data: ass } = await supabase.from('task_assignments').select('user_id').eq('id', assignmentId).single();
      if (ass) await this.checkLowTaskCount(ass.user_id);
    }

    return result;
  },

  async deleteTask(taskId: string) {
    await checkDeletionStatus();
    const { data: ass } = await supabase.from('task_assignments').select('user_id').eq('task_id', taskId);
    const result = await supabase.from('tasks').delete().eq('id', taskId);
    
    if (ass) {
      for (const a of ass) {
        await this.checkLowTaskCount(a.user_id);
      }
    }

    return result;
  },

  async bulkUpdateStatus(taskIds: string[], status: string, progress: number) {
    return await supabase.from('tasks').update({ status, progress }).in('id', taskIds);
  },

  async bulkCompleteAssignments(userId: string, taskIds: string[]) {
    return await supabase.from('task_assignments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('task_id', taskIds);
  },

  async bulkDeleteTasks(taskIds: string[]) {
    await supabase.from('task_assignments').delete().in('task_id', taskIds);
    return await supabase.from('tasks').delete().in('id', taskIds);
  },

  async updateTaskFields(taskId: string, fields: Partial<Task>) {
    const cleanFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    const result = await supabase.from('tasks').update(cleanFields).eq('id', taskId);
    if (result.error) console.error('[taskService.updateTaskFields] Error:', result.error.message, result.error.details, 'Fields:', Object.keys(cleanFields));
    return result;
  },

  async uploadAttachment(taskId: string, userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskId}/${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tasks')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('tasks')
      .getPublicUrl(filePath);

    const attachmentData = {
      task_id: taskId,
      user_id: userId,
      filename: file.name,
      file_url: publicUrl,
      file_type: file.type || 'application/octet-stream'
    };

    const { data, error } = await supabase
      .from('task_attachments')
      .insert(attachmentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAttachments(taskId: string) {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async deleteAttachment(attachmentId: string, filePath: string) {
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);
    
    if (dbError) throw dbError;

    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('tasks')
        .remove([filePath]);
      return { error: storageError };
    }
    
    return { error: null };
  },

  async addExternalLink(taskId: string, userId: string, filename: string, url: string) {
    const attachmentData = {
      task_id: taskId,
      user_id: userId,
      filename: filename,
      file_url: url,
      file_type: 'link/external'
    };

    const { data, error } = await supabase
      .from('task_attachments')
      .insert(attachmentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
