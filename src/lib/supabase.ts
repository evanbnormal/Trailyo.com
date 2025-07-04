import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Trail {
  id: string
  title: string
  description: string
  creator_id: string
  steps: TrailStep[]
  created_at: string
  updated_at: string
  is_published: boolean
  price?: number
}

export interface TrailStep {
  id: string
  trail_id: string
  title: string
  content: string
  step_index: number
  video_url?: string
  skip_cost?: number
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}

export interface AnalyticsEvent {
  id: string
  trail_id: string
  event_type: 'trail_view' | 'step_complete' | 'step_skip' | 'tip_donated' | 'trail_complete' | 'video_watch'
  user_id?: string
  data: any
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  trail_id: string
  current_step: number
  completed_steps: number[]
  total_watch_time: number
  created_at: string
  updated_at: string
} 