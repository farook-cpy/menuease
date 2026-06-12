-- Migration: Add owner credentials and suspension columns to Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "ownerUsername" TEXT UNIQUE;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "ownerPassword" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT FALSE NOT NULL;
