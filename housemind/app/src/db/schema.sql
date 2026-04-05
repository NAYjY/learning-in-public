-- HouseMind MVP Database Schema
-- Run: psql -d housemind -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('architect', 'homeowner', 'contractor', 'admin')),
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invite tokens (magic links)
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('architect', 'homeowner', 'contractor')),
  invited_by UUID REFERENCES users(id),
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products (curated catalog)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tiles', 'fixtures', 'lighting', 'cladding')),
  description TEXT,
  specs JSONB DEFAULT '{}',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'reference' CHECK (status IN ('reference', 'available')),
  price_tier TEXT CHECK (price_tier IN ('$', '$$', '$$$')),
  availability_requests INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects (boards)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project members (who has access + their role on this project)
CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('architect', 'homeowner', 'contractor')),
  PRIMARY KEY (project_id, user_id)
);

-- Products pinned to a project board
CREATE TABLE project_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  added_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, product_id)
);

-- Comments on project products (role-based)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_product_id UUID NOT NULL REFERENCES project_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'reaction', 'flag')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback widget submissions
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  page TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_products_project ON project_products(project_id);
CREATE INDEX idx_comments_project_product ON comments(project_product_id);
CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);
