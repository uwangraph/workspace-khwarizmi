import { supabase } from '$lib/supabase'
import { notificationService } from './notificationService'

export interface ScheduledMeeting {
  id: string
  title: string
  scheduled_at: string
  voice_only: boolean
  created_by: string
  participant_ids: string[]
  room_id: string | null
  created_at: string
  description?: string | null
  creator?: { full_name: string; avatar_url: string | null }
  is_cancelled?: boolean
}

export interface MeetingParticipant {
  id: string
  full_name: string
  avatar_url: string | null
  email?: string
  is_online?: boolean
  last_seen?: string
}

export const meetingService = {
  async getScheduledMeetings(userId: string) {
    const { data, error } = await supabase
      .from('scheduled_meetings')
      .select('*, creator:profiles(full_name, avatar_url)')
      .or(`created_by.eq.${userId},participant_ids.cs.{${userId}}`)
      .eq('is_cancelled', false)
      .order('scheduled_at', { ascending: true })
    
    if (error) throw error
    return data as ScheduledMeeting[]
  },

  async getMeetingById(id: string) {
    const { data, error } = await supabase
      .from('scheduled_meetings')
      .select('*, creator:profiles(full_name, avatar_url)')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as ScheduledMeeting
  },

  async getMeetingParticipants(participantIds: string[]): Promise<MeetingParticipant[]> {
    if (!participantIds.length) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', participantIds)
    
    if (error) throw error
    return (data || []).map(p => ({
      ...p,
      is_online: false,
    }))
  },

  async createScheduledMeeting(meeting: {
    title: string
    description?: string
    scheduled_at: string
    created_by: string
    participant_ids: string[]
    voice_only?: boolean
  }) {
    const { data, error } = await supabase
      .from('scheduled_meetings')
      .insert({
        title: meeting.title,
        description: meeting.description || null,
        scheduled_at: meeting.scheduled_at,
        created_by: meeting.created_by,
        participant_ids: meeting.participant_ids,
        voice_only: meeting.voice_only || false,
      })
      .select('*, creator:profiles(full_name, avatar_url)')
      .single()
    
    if (error) throw error

    // Kirim notifikasi ke semua peserta
    const otherParticipants = meeting.participant_ids.filter(id => id !== meeting.created_by)
    if (otherParticipants.length > 0) {
      notificationService.sendBulk(
        otherParticipants,
        'meeting_scheduled',
        'Rapat Baru Dijadwalkan',
        `"${meeting.title}" — ${new Date(meeting.scheduled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`,
        {
          type: 'meeting_scheduled',
          meeting_id: data.id,
          meeting_title: meeting.title,
          scheduled_at: meeting.scheduled_at,
        }
      ).catch(e => console.warn('[MeetingService] Push notification failed:', e))
    }

    return data as ScheduledMeeting
  },

  async cancelMeeting(id: string) {
    const { error } = await supabase
      .from('scheduled_meetings')
      .update({ is_cancelled: true })
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  async deleteMeeting(id: string) {
    const { error } = await supabase
      .from('scheduled_meetings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  async rescheduleMeeting(id: string, updates: { scheduled_at?: string; title?: string; description?: string }) {
    const { data, error } = await supabase
      .from('scheduled_meetings')
      .update(updates)
      .eq('id', id)
      .select('*, creator:profiles(full_name, avatar_url)')
      .single()
    
    if (error) throw error
    return data as ScheduledMeeting
  },

  async sendReminder(meetingId: string) {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Meeting not found')

    const allParticipants = [meeting.created_by, ...meeting.participant_ids]
    await notificationService.sendBulk(
      allParticipants,
      'meeting_reminder',
      'Pengingat Rapat',
      `"${meeting.title}" akan segera dimulai`,
      {
        type: 'meeting_reminder',
        meeting_id: meetingId,
        meeting_title: meeting.title,
      }
    )
    return true
  }
}
