import { supabase } from '$lib/supabase'

export interface ScheduledMeeting {
  id: string
  title: string
  scheduled_at: string
  voice_only: boolean
  created_by: string
  participant_ids: string[]
  room_id: string | null
  created_at: string
  creator?: { full_name: string; avatar_url: string | null }
}

export const meetingService = {
  async getScheduledMeetings(userId: string) {
    const { data, error } = await supabase
      .from('scheduled_meetings')
      .select('*, creator:profiles!created_by(full_name, avatar_url)')
      .or(`created_by.eq.${userId},participant_ids.cs.{${userId}}`)
      .order('scheduled_at', { ascending: true })
    
    if (error) throw error
    return data as ScheduledMeeting[]
  },

  async deleteMeeting(id: string) {
    const { error } = await supabase
      .from('scheduled_meetings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}
