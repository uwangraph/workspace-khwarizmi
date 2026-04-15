export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

// Supabase Database type (expand nanti)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
    }
  }
}