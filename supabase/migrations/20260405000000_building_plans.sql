-- =====================================================
-- TimeTracker - Building Plans Module
-- Migration: 20260405000000_building_plans
-- =====================================================

-- =====================================================
-- TABLE: building_plans
-- Plany budowy / Baupläne dla poszczególnych budów
-- =====================================================
CREATE TABLE IF NOT EXISTS building_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
  name TEXT,
  plan_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_building_plans_site ON building_plans(site_id);
CREATE INDEX IF NOT EXISTS idx_building_plans_created_at ON building_plans(created_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS building_plans_updated_at ON building_plans;
CREATE TRIGGER building_plans_updated_at
  BEFORE UPDATE ON building_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE building_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for authenticated users" ON building_plans;
CREATE POLICY "Enable select for authenticated users" ON building_plans
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users" ON building_plans;
CREATE POLICY "Enable insert for anon users" ON building_plans
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON building_plans;
CREATE POLICY "Enable insert for authenticated users" ON building_plans
  FOR INSERT TO authenticated WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON building_plans;
CREATE POLICY "Enable delete for authenticated users" ON building_plans
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STORAGE BUCKET: building-plans
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'building-plans',
  'building-plans',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for building-plans bucket
DROP POLICY IF EXISTS "Public read building plans" ON storage.objects;
CREATE POLICY "Public read building plans" ON storage.objects
  FOR SELECT USING (bucket_id = 'building-plans');

DROP POLICY IF EXISTS "Anon can upload building plans" ON storage.objects;
CREATE POLICY "Anon can upload building plans" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'building-plans');

DROP POLICY IF EXISTS "Authenticated users can upload building plans" ON storage.objects;
CREATE POLICY "Authenticated users can upload building plans" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'building-plans');

DROP POLICY IF EXISTS "Authenticated users can update building plans" ON storage.objects;
CREATE POLICY "Authenticated users can update building plans" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'building-plans');

DROP POLICY IF EXISTS "Authenticated users can delete building plans" ON storage.objects;
CREATE POLICY "Authenticated users can delete building plans" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'building-plans');
