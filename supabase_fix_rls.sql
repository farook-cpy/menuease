-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- ============================================================
-- Fix: Disable RLS on all custom tables so client-side 
-- queries from the anon key are not blocked.
-- ============================================================

-- 1. MenuAnalytics (page views & item clicks)
CREATE TABLE IF NOT EXISTS "MenuAnalytics" (
  "id" TEXT PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "menuItemId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_analytics_restaurant FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT fk_analytics_item FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_analytics_restaurant" ON "MenuAnalytics"("restaurantId");
CREATE INDEX IF NOT EXISTS "idx_analytics_item" ON "MenuAnalytics"("menuItemId");
ALTER TABLE "MenuAnalytics" DISABLE ROW LEVEL SECURITY;

-- 2. BillingTransaction
CREATE TABLE IF NOT EXISTS "BillingTransaction" (
  "id" TEXT PRIMARY KEY,
  "restaurantId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_billing_restaurant FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_billing_restaurant" ON "BillingTransaction"("restaurantId");
ALTER TABLE "BillingTransaction" DISABLE ROW LEVEL SECURITY;

-- 3. Feedback table (if exists)
ALTER TABLE IF EXISTS "Feedback" DISABLE ROW LEVEL SECURITY;

-- 4. AdminUser table
ALTER TABLE IF EXISTS "AdminUser" DISABLE ROW LEVEL SECURITY;

-- 5. LoginLog table
ALTER TABLE IF EXISTS "LoginLog" DISABLE ROW LEVEL SECURITY;

-- 6. Restaurant billing columns (safe to re-run)
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "planName" TEXT DEFAULT 'Free Trial' NOT NULL;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'trial' NOT NULL;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "balance" DOUBLE PRECISION DEFAULT 0.0 NOT NULL;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR' NOT NULL;

-- 7. Add columns for stats, feedback images, and veg labels (safe to re-run)
ALTER TABLE "MenuAnalytics" ADD COLUMN IF NOT EXISTS "deviceType" TEXT DEFAULT 'Unknown';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isVeg" BOOLEAN DEFAULT NULL;
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT DEFAULT NULL;

