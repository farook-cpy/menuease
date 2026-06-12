-- Migration: Add subscription and billing fields to Restaurant
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "planName" TEXT DEFAULT 'Free Trial' NOT NULL;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'trial' NOT NULL;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "balance" DOUBLE PRECISION DEFAULT 0.0 NOT NULL;

-- Create BillingTransaction table
CREATE TABLE IF NOT EXISTS "BillingTransaction" (
  "id" TEXT PRIMARY KEY,
  "restaurantId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL, -- 'manual_payment', 'plan_renewal', 'credit_adjustment', 'debit_adjustment'
  "method" TEXT NOT NULL, -- 'Cash', 'Card', 'Bank Transfer', 'Credit Balance', 'System'
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_billing_restaurant FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE
);

-- Create index on restaurantId
CREATE INDEX IF NOT EXISTS "idx_billing_restaurant" ON "BillingTransaction"("restaurantId");

-- Disable RLS to allow direct client-side queries
ALTER TABLE "BillingTransaction" DISABLE ROW LEVEL SECURITY;
