-- Trail Blaze Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create trails table
CREATE TABLE IF NOT EXISTS trails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trail_steps table
CREATE TABLE IF NOT EXISTS trail_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  step_index INTEGER NOT NULL,
  video_url TEXT,
  skip_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trail_id, step_index)
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('trail_view', 'step_complete', 'step_skip', 'tip_donated', 'trail_complete', 'video_watch')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT '{}',
  total_watch_time INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trail_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trails_creator_id ON trails(creator_id);
CREATE INDEX IF NOT EXISTS idx_trails_published ON trails(is_published);
CREATE INDEX IF NOT EXISTS idx_trail_steps_trail_id ON trail_steps(trail_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_trail_id ON analytics_events(trail_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_trail_id ON user_progress(trail_id);

-- Enable Row Level Security
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trails
CREATE POLICY "Public trails are viewable by everyone" ON trails
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can view their own trails" ON trails
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert their own trails" ON trails
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own trails" ON trails
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own trails" ON trails
  FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for trail_steps
CREATE POLICY "Steps of public trails are viewable by everyone" ON trail_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trails 
      WHERE trails.id = trail_steps.trail_id 
      AND trails.is_published = true
    )
  );

CREATE POLICY "Users can view steps of their own trails" ON trail_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trails 
      WHERE trails.id = trail_steps.trail_id 
      AND trails.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert steps for their own trails" ON trail_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trails 
      WHERE trails.id = trail_steps.trail_id 
      AND trails.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps for their own trails" ON trail_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trails 
      WHERE trails.id = trail_steps.trail_id 
      AND trails.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps for their own trails" ON trail_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trails 
      WHERE trails.id = trail_steps.trail_id 
      AND trails.creator_id = auth.uid()
    )
  );

-- RLS Policies for analytics_events
CREATE POLICY "Analytics events are viewable by trail creators" ON analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trails 
      WHERE trails.id = analytics_events.trail_id 
      AND trails.creator_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_trails_updated_at BEFORE UPDATE ON trails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO trails (id, title, description, creator_id, is_published, price) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Getting Started with Investing', 'Learn the basics of investing and building wealth', '00000000-0000-0000-0000-000000000000', true, 0),
  ('550e8400-e29b-41d4-a716-446655440001', 'Advanced Trading Strategies', 'Master advanced trading techniques and risk management', '00000000-0000-0000-0000-000000000000', true, 29.99)
ON CONFLICT (id) DO NOTHING;

INSERT INTO trail_steps (trail_id, title, content, step_index, video_url, skip_cost) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'What is Investing?', 'Investing is the act of allocating resources, usually money, with the expectation of generating an income or profit.', 0, 'https://example.com/video1.mp4', 0),
  ('550e8400-e29b-41d4-a716-446655440000', 'Types of Investments', 'Learn about stocks, bonds, mutual funds, and other investment vehicles.', 1, 'https://example.com/video2.mp4', 5.99),
  ('550e8400-e29b-41d4-a716-446655440000', 'Risk vs Reward', 'Understanding the relationship between risk and potential returns.', 2, 'https://example.com/video3.mp4', 0),
  ('550e8400-e29b-41d4-a716-446655440001', 'Technical Analysis', 'Learn to read charts and identify trading patterns.', 0, 'https://example.com/video4.mp4', 0),
  ('550e8400-e29b-41d4-a716-446655440001', 'Risk Management', 'Essential strategies for managing risk in trading.', 1, 'https://example.com/video5.mp4', 9.99)
ON CONFLICT (trail_id, step_index) DO NOTHING; 