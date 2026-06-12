-- Migration: Add isOwnerDisabled column
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isOwnerDisabled" BOOLEAN DEFAULT FALSE NOT NULL;

-- Create LoginLog table
CREATE TABLE IF NOT EXISTS "LoginLog" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create AdminUser table
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "role" TEXT DEFAULT 'Admin' NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Disable RLS to allow direct client-side queries
ALTER TABLE "AdminUser" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginLog" DISABLE ROW LEVEL SECURITY;
