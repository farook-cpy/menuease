-- SQL Schema Patch to support multiple images and videos for MenuItems
-- Copy and run this in your Supabase SQL Editor:

-- 1. Add videoUrl column to MenuItem table
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- 2. Add menuItemId column to Image table to support multiple images per product
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "menuItemId" TEXT;

-- 3. Add foreign key constraint linking Image back to MenuItem
ALTER TABLE "Image" DROP CONSTRAINT IF EXISTS fk_image_menuitem;
ALTER TABLE "Image" 
ADD CONSTRAINT fk_image_menuitem 
FOREIGN KEY ("menuItemId") 
REFERENCES "MenuItem"("id") 
ON DELETE CASCADE;

-- 4. Add columns for WhatsApp ordering and currency settings to Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isOrderFeatureEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "whatsappNo" TEXT;

-- 5. Add isKitchenEnabled column to Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isKitchenEnabled" BOOLEAN DEFAULT FALSE;

-- 6. Create Order table to support the Kitchen Screen orders
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "table" TEXT,
    "floor" TEXT,
    "items" TEXT NOT NULL, -- JSON serialized text containing order items
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generalNotes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "Order_restaurantId_idx" ON "Order"("restaurantId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");

-- Add foreign key constraint for cascading delete
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS fk_order_restaurant;
ALTER TABLE "Order" 
ADD CONSTRAINT fk_order_restaurant 
FOREIGN KEY ("restaurantId") 
REFERENCES "Restaurant"("id") 
ON DELETE CASCADE;

-- 7. Add brandColor and logoUrl columns to Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "brandColor" TEXT DEFAULT '#7048e8';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- 8. Add likes and dislikes columns to MenuItem table
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "likes" INTEGER DEFAULT 0;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "dislikes" INTEGER DEFAULT 0;

-- 9. Enable RLS and setup policies for the Order table
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent duplicate errors
DROP POLICY IF EXISTS "Allow public insert" ON "Order";
DROP POLICY IF EXISTS "Allow owner select" ON "Order";
DROP POLICY IF EXISTS "Allow owner update" ON "Order";
DROP POLICY IF EXISTS "Allow owner delete" ON "Order";

-- Create policies
CREATE POLICY "Allow public insert" ON "Order" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner select" ON "Order" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND "Restaurant"."userId" = auth.uid()::text
    )
);
CREATE POLICY "Allow owner update" ON "Order" FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND "Restaurant"."userId" = auth.uid()::text
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND "Restaurant"."userId" = auth.uid()::text
    )
);
CREATE POLICY "Allow owner delete" ON "Order" FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND "Restaurant"."userId" = auth.uid()::text
    )
);

-- 10. Add new columns for review link, festival themes, and Happy Hour settings to Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "festivalTheme" TEXT DEFAULT 'NONE';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "happyHourStart" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "happyHourEnd" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "happyHourDiscount" INTEGER DEFAULT 0;

-- 11. Add isAvailable and isTodaySpecial columns to MenuItem table
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT TRUE;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isTodaySpecial" BOOLEAN DEFAULT FALSE;

-- 12. Create WaiterCall table to track table assistant alerts
CREATE TABLE IF NOT EXISTS "WaiterCall" (
    "id" TEXT PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "table" TEXT,
    "requestType" TEXT NOT NULL, -- 'WATER', 'BILL', 'WAITER'
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS and setup policies for WaiterCall table
ALTER TABLE "WaiterCall" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert waiter call" ON "WaiterCall";
DROP POLICY IF EXISTS "Allow owner manage waiter call" ON "WaiterCall";

CREATE POLICY "Allow public insert waiter call" ON "WaiterCall" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner manage waiter call" ON "WaiterCall" FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "WaiterCall"."restaurantId"
          AND "Restaurant"."userId" = auth.uid()::text
    )
);

-- 13. Create CustomerLoyalty table to track WhatsApp billing visits
CREATE TABLE IF NOT EXISTS "CustomerLoyalty" (
    "id" TEXT PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "visitCount" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS and setup policies for CustomerLoyalty table
ALTER TABLE "CustomerLoyalty" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow owner manage loyalty" ON "CustomerLoyalty";

CREATE POLICY "Allow owner manage loyalty" ON "CustomerLoyalty" FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "CustomerLoyalty"."restaurantId"
          AND "Restaurant"."userId" = auth.uid()::text
    )
);

