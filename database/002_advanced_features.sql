-- =================================================================
-- Verdra — Database Migration 002: Advanced Real Features
-- Supports: Fields, Plants, Batch Scans, Shared Cases, Real Geolocation
-- =================================================================

-- 1. Fields entity within Farms
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  crop TEXT NOT NULL DEFAULT 'Tomato',
  area_hectares DOUBLE PRECISION,
  boundary_coordinates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id);
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can CRUD own fields" ON fields
    FOR ALL USING (
      farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. Individual Plant Specimens (Progression Tracking)
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  plant_tag TEXT NOT NULL, -- e.g. TOM-R3-P12
  crop TEXT NOT NULL DEFAULT 'Tomato',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plants_user ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_tag ON plants(plant_tag);
CREATE INDEX IF NOT EXISTS idx_plants_field ON plants(field_id);
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can CRUD own plants" ON plants
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 3. Batch Scans Grouping
CREATE TABLE IF NOT EXISTS batch_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  batch_name TEXT, -- e.g. North Field Morning Inspection
  crop TEXT NOT NULL DEFAULT 'Tomato',
  total_images INTEGER NOT NULL DEFAULT 0,
  valid_images INTEGER NOT NULL DEFAULT 0,
  rejected_images INTEGER NOT NULL DEFAULT 0,
  field_health_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  dominant_disease TEXT,
  overall_status TEXT DEFAULT 'Good', -- Good / Monitor / At Risk
  aggregate_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_scans_field ON batch_scans(field_id);
CREATE INDEX IF NOT EXISTS idx_batch_scans_created ON batch_scans(created_at DESC);
ALTER TABLE batch_scans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can CRUD own batch scans" ON batch_scans
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 4. Batch Scan Individual Items
CREATE TABLE IF NOT EXISTS batch_scan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batch_scans(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- completed / rejected
  error_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON batch_scan_items(batch_id);
ALTER TABLE batch_scan_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can CRUD own batch items" ON batch_scan_items
    FOR ALL USING (
      batch_id IN (SELECT id FROM batch_scans WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 5. Extend Existing Scans Table with Geolocation, Plant Tracking, and Batch ID
ALTER TABLE scans ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES fields(id) ON DELETE SET NULL;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plants(id) ON DELETE SET NULL;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batch_scans(id) ON DELETE SET NULL;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'HIGH'; -- HIGH / MODERATE / UNCERTAIN
ALTER TABLE scans ADD COLUMN IF NOT EXISTS confidence_message TEXT;

CREATE INDEX IF NOT EXISTS idx_scans_plant ON scans(plant_id);
CREATE INDEX IF NOT EXISTS idx_scans_field ON scans(field_id);
CREATE INDEX IF NOT EXISTS idx_scans_location ON scans(latitude, longitude);


-- 6. Cryptographically Secure Expert Shared Cases (Read-Only)
CREATE TABLE IF NOT EXISTS shared_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 of urlsafe token
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  case_data JSONB NOT NULL, -- sanitized public summary
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_token ON shared_cases(token_hash);
ALTER TABLE shared_cases ENABLE ROW LEVEL SECURITY;

-- Public can read non-revoked, non-expired shared cases via token
DO $$ BEGIN
  CREATE POLICY "Public can view valid shared cases" ON shared_cases
    FOR SELECT USING (
      revoked_at IS NULL AND expires_at > NOW()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can revoke own shared cases" ON shared_cases
    FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
