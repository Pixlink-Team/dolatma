-- Campaign Live Report - Supabase Schema
-- Run this in Supabase SQL Editor

-- Campaign Settings (multiple campaigns supported)
CREATE TABLE IF NOT EXISTS campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('live', 'completed', 'draft')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  features JSONB NOT NULL DEFAULT '{"billboards":true,"posters":true,"videos":true,"analytics":true,"submissions":true}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billboards
CREATE TABLE IF NOT EXISTS billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  thumbnail_url TEXT NOT NULL,
  external_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media Categories (poster | video)
CREATE TABLE IF NOT EXISTS media_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('poster', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posters
CREATE TABLE IF NOT EXISTS posters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES media_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poster Versions
CREATE TABLE IF NOT EXISTS poster_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES posters(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'revised', 'final')),
  is_final BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES media_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Video Versions
CREATE TABLE IF NOT EXISTS video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'revised', 'final')),
  is_final BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Analytics Metrics
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  visitors INT NOT NULL DEFAULT 0,
  unique_visitors INT NOT NULL DEFAULT 0,
  page_views INT NOT NULL DEFAULT 0,
  avg_session_duration INT NOT NULL DEFAULT 0,
  source TEXT CHECK (source IN ('instagram', 'telegram', 'direct', 'google', 'referral', 'other')),
  device TEXT CHECK (device IN ('mobile', 'desktop', 'tablet')),
  page TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign Submissions
CREATE TABLE IF NOT EXISTS campaign_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaign_settings(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL DEFAULT '',
  participant_name TEXT NOT NULL,
  participant_phone TEXT,
  participant_email TEXT,
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billboards_published ON billboards(published, sort_order);
CREATE INDEX IF NOT EXISTS idx_posters_published ON posters(published, sort_order);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published, sort_order);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON campaign_submissions(status, published);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_metrics(date);

-- RLS Policies (public read for published, authenticated write)
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posters ENABLE ROW LEVEL SECURITY;
ALTER TABLE poster_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_submissions ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read campaign settings" ON campaign_settings FOR SELECT USING (true);
CREATE POLICY "Public read published billboards" ON billboards FOR SELECT USING (published = true);
CREATE POLICY "Public read published categories" ON media_categories FOR SELECT USING (published = true);
CREATE POLICY "Public read published posters" ON posters FOR SELECT USING (published = true);
CREATE POLICY "Public read poster versions" ON poster_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM posters WHERE posters.id = poster_id AND posters.published = true)
);
CREATE POLICY "Public read published videos" ON videos FOR SELECT USING (published = true);
CREATE POLICY "Public read video versions" ON video_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM videos WHERE videos.id = video_id AND videos.published = true)
);
CREATE POLICY "Public read analytics" ON analytics_metrics FOR SELECT USING (true);
CREATE POLICY "Public read approved submissions" ON campaign_submissions FOR SELECT USING (published = true AND status = 'approved');

-- Authenticated full access (admin)
CREATE POLICY "Admin all campaign_settings" ON campaign_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all billboards" ON billboards FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all media_categories" ON media_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all posters" ON posters FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all poster_versions" ON poster_versions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all videos" ON videos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all video_versions" ON video_versions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all analytics_metrics" ON analytics_metrics FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all campaign_submissions" ON campaign_submissions FOR ALL USING (auth.role() = 'authenticated');

-- Storage bucket for media (run in Supabase dashboard or via API)
-- CREATE BUCKET campaign-media WITH public = true;
