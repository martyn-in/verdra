-- ============================================
-- AgriVisionAI — Supabase Database Migrations
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Users Profile ----
CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  preferred_language TEXT DEFAULT 'en',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ---- Farms ----
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  crop TEXT NOT NULL DEFAULT 'Tomato',
  field_size DOUBLE PRECISION,
  planting_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farms_user ON farms(user_id);
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own farms" ON farms
  FOR ALL USING (auth.uid() = user_id);


-- ---- Scans ----
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  image_url TEXT,
  crop TEXT NOT NULL,
  prediction TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  severity TEXT DEFAULT 'N/A',
  infected_percentage DOUBLE PRECISION DEFAULT 0,
  risk_level TEXT DEFAULT 'N/A',
  temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  rainfall DOUBLE PRECISION,
  is_healthy BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_user ON scans(user_id);
CREATE INDEX idx_scans_created ON scans(created_at DESC);
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own scans" ON scans
  FOR ALL USING (auth.uid() = user_id);


-- ---- Predictions (detailed top-K per scan) ----
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_predictions_scan ON predictions(scan_id);
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read predictions for own scans" ON predictions
  FOR SELECT USING (
    scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert predictions for own scans" ON predictions
  FOR INSERT WITH CHECK (
    scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid())
  );


-- ---- Alerts ----
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id);


-- ---- Storage Bucket ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-images', 'scan-images', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read scan images" ON storage.objects
  FOR SELECT USING (bucket_id = 'scan-images');

CREATE POLICY "Authenticated users can upload scan images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'scan-images' AND auth.role() = 'authenticated'
  );
