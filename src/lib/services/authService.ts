import { supabase } from '$lib/supabase';

export const authService = {
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async updateProfile(userId: string, data: any) {
    return await supabase.from('profiles').update(data).eq('id', userId);
  },

  async uploadAvatar(userId: string, blob: Blob) {
    const path = `${userId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { 
      upsert: true, 
      contentType: 'image/jpeg' 
    });
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
  },

  async getAllUsers() {
    return await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
  },

  async verifyPassword(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async changeEmail(newEmail: string) {
    return await supabase.auth.updateUser({ email: newEmail });
  },

  async changePassword(newPassword: string) {
    return await supabase.auth.updateUser({ password: newPassword });
  }
};
