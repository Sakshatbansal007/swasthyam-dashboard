-- ========================================================
-- Master Contacts Table Schema for Swasthyam Healthcare
-- Supports 5,599 categorized contacts across 15 categories
-- ========================================================

CREATE TABLE IF NOT EXISTS master_contacts (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  district TEXT DEFAULT '',
  state TEXT DEFAULT '',
  business TEXT DEFAULT '',
  birthday TEXT DEFAULT '',
  category TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE master_contacts ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon/authenticated (matching existing project setup)
DROP POLICY IF EXISTS "Allow public read on master_contacts" ON master_contacts;
CREATE POLICY "Allow public read on master_contacts" 
ON master_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on master_contacts" ON master_contacts;
CREATE POLICY "Allow public insert on master_contacts" 
ON master_contacts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on master_contacts" ON master_contacts;
CREATE POLICY "Allow public update on master_contacts" 
ON master_contacts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on master_contacts" ON master_contacts;
CREATE POLICY "Allow public delete on master_contacts" 
ON master_contacts FOR DELETE USING (true);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_mc_category ON master_contacts(category);
CREATE INDEX IF NOT EXISTS idx_mc_name ON master_contacts(name);
CREATE INDEX IF NOT EXISTS idx_mc_district ON master_contacts(district);
CREATE INDEX IF NOT EXISTS idx_mc_phone ON master_contacts(phone);

