-- SQL Schema Patch to support multiple images and videos for MenuItems
-- Copy and run this in your Supabase SQL Editor:

-- 1. Add videoUrl column to MenuItem table
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- 2. Add menuItemId column to Image table to support multiple images per product
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "menuItemId" TEXT;

-- 3. Add foreign key constraint linking Image back to MenuItem
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

