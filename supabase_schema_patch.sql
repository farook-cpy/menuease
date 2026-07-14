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

-- Helper function to check if the current user is a Super Admin or Admin user
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'farookisop@gmail.com'
    OR EXISTS (
      SELECT 1 FROM "AdminUser" 
      WHERE email = auth.jwt() ->> 'email' 
        AND role IN ('Admin', 'Super Admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS and setup policies for the Order table
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent duplicate errors
DROP POLICY IF EXISTS "Allow public insert" ON "Order";
DROP POLICY IF EXISTS "Allow owner select" ON "Order";
DROP POLICY IF EXISTS "Allow owner update" ON "Order";
DROP POLICY IF EXISTS "Allow owner delete" ON "Order";

-- Create policies for Order (allows owners and superadmins)
CREATE POLICY "Allow public insert" ON "Order" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner select" ON "Order" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);
CREATE POLICY "Allow owner update" ON "Order" FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);
CREATE POLICY "Allow owner delete" ON "Order" FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Order"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

-- Enable RLS and setup policies for the Restaurant table
ALTER TABLE "Restaurant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select restaurant" ON "Restaurant";
DROP POLICY IF EXISTS "Allow owner update restaurant" ON "Restaurant";
DROP POLICY IF EXISTS "Allow authenticated insert restaurant" ON "Restaurant";
DROP POLICY IF EXISTS "Allow admin delete restaurant" ON "Restaurant";

CREATE POLICY "Allow public select restaurant" ON "Restaurant" FOR SELECT TO public USING (true);
CREATE POLICY "Allow owner update restaurant" ON "Restaurant" FOR UPDATE TO authenticated USING (
    "userId" = auth.uid()::text OR is_admin()
) WITH CHECK (
    "userId" = auth.uid()::text OR is_admin()
);
CREATE POLICY "Allow authenticated insert restaurant" ON "Restaurant" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow admin delete restaurant" ON "Restaurant" FOR DELETE TO authenticated USING (is_admin());

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

-- Add foreign key constraint for cascading delete
ALTER TABLE "WaiterCall" DROP CONSTRAINT IF EXISTS fk_waitercall_restaurant;
ALTER TABLE "WaiterCall" 
ADD CONSTRAINT fk_waitercall_restaurant 
FOREIGN KEY ("restaurantId") 
REFERENCES "Restaurant"("id") 
ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS "WaiterCall_restaurantId_idx" ON "WaiterCall"("restaurantId");

-- Enable RLS and setup policies for WaiterCall table
ALTER TABLE "WaiterCall" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert waiter call" ON "WaiterCall";
DROP POLICY IF EXISTS "Allow owner manage waiter call" ON "WaiterCall";

CREATE POLICY "Allow public insert waiter call" ON "WaiterCall" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner manage waiter call" ON "WaiterCall" FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "WaiterCall"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
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

-- Add foreign key constraint for cascading delete
ALTER TABLE "CustomerLoyalty" DROP CONSTRAINT IF EXISTS fk_loyalty_restaurant;
ALTER TABLE "CustomerLoyalty" 
ADD CONSTRAINT fk_loyalty_restaurant 
FOREIGN KEY ("restaurantId") 
REFERENCES "Restaurant"("id") 
ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "CustomerLoyalty_restaurantId_idx" ON "CustomerLoyalty"("restaurantId");
CREATE INDEX IF NOT EXISTS "CustomerLoyalty_phone_idx" ON "CustomerLoyalty"("phone");

-- Enable RLS and setup policies for CustomerLoyalty table
ALTER TABLE "CustomerLoyalty" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow owner manage loyalty" ON "CustomerLoyalty";
DROP POLICY IF EXISTS "Allow public read loyalty" ON "CustomerLoyalty";
DROP POLICY IF EXISTS "Allow public insert loyalty" ON "CustomerLoyalty";
DROP POLICY IF EXISTS "Allow public update loyalty" ON "CustomerLoyalty";

-- Allow public read, insert, and update to prevent RLS failures during billing and customer status checks
CREATE POLICY "Allow public read loyalty" ON "CustomerLoyalty" FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert loyalty" ON "CustomerLoyalty" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update loyalty" ON "CustomerLoyalty" FOR UPDATE TO public USING (true);

-- 14. Create AuditLog table to track restaurant activity history
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "actionCode" TEXT NOT NULL,
    "payload" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraint for cascading delete
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS fk_auditlog_restaurant;
ALTER TABLE "AuditLog" 
ADD CONSTRAINT fk_auditlog_restaurant 
FOREIGN KEY ("restaurantId") 
REFERENCES "Restaurant"("id") 
ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS "AuditLog_restaurantId_idx" ON "AuditLog"("restaurantId");

-- Enable RLS and setup policies for AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert audit" ON "AuditLog";
DROP POLICY IF EXISTS "Allow owner read audit" ON "AuditLog";

CREATE POLICY "Allow public insert audit" ON "AuditLog" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner read audit" ON "AuditLog" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "AuditLog"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

-- 15. Security Hardening: Enable RLS and setup policies for AdminUser
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select admin" ON "AdminUser";
DROP POLICY IF EXISTS "Allow write admin" ON "AdminUser";
CREATE POLICY "Allow select admin" ON "AdminUser" FOR SELECT TO authenticated USING (email = auth.jwt() ->> 'email' OR is_admin());
CREATE POLICY "Allow write admin" ON "AdminUser" FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 16. Security Hardening: Enable RLS and setup policies for LoginLog
ALTER TABLE "LoginLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select login logs" ON "LoginLog";
DROP POLICY IF EXISTS "Allow public insert login log" ON "LoginLog";
CREATE POLICY "Allow select login logs" ON "LoginLog" FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Allow public insert login log" ON "LoginLog" FOR INSERT TO public WITH CHECK (true);

-- 17. Security Hardening: Enable RLS and setup policies for BillingTransaction
ALTER TABLE "BillingTransaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select billing" ON "BillingTransaction";
DROP POLICY IF EXISTS "Allow write billing" ON "BillingTransaction";
CREATE POLICY "Allow select billing" ON "BillingTransaction" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "BillingTransaction"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);
CREATE POLICY "Allow write billing" ON "BillingTransaction" FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 18. Security Hardening: Enable RLS and setup policies for MenuAnalytics
ALTER TABLE "MenuAnalytics" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert analytics" ON "MenuAnalytics";
DROP POLICY IF EXISTS "Allow owner read analytics" ON "MenuAnalytics";
CREATE POLICY "Allow public insert analytics" ON "MenuAnalytics" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner read analytics" ON "MenuAnalytics" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "MenuAnalytics"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

-- 19. Security Hardening: Enable RLS and setup policies for Feedback
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert feedback" ON "Feedback";
DROP POLICY IF EXISTS "Allow owner read feedback" ON "Feedback";
CREATE POLICY "Allow public insert feedback" ON "Feedback" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner read feedback" ON "Feedback" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Feedback"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

-- 20. Security Hardening: Enable RLS and setup policies for Menu, Category, MenuItem, Image
ALTER TABLE "Menu" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read menu" ON "Menu";
DROP POLICY IF EXISTS "Allow owner manage menu" ON "Menu";
CREATE POLICY "Allow public read menu" ON "Menu" FOR SELECT TO public USING (true);
CREATE POLICY "Allow owner manage menu" ON "Menu" FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "Menu"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read category" ON "Category";
DROP POLICY IF EXISTS "Allow owner manage category" ON "Category";
CREATE POLICY "Allow public read category" ON "Category" FOR SELECT TO public USING (true);
CREATE POLICY "Allow owner manage category" ON "Category" FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Menu"
        JOIN "Restaurant" ON "Restaurant".id = "Menu"."restaurantId"
        WHERE "Menu".id = "Category"."menuId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read item" ON "MenuItem";
DROP POLICY IF EXISTS "Allow owner manage item" ON "MenuItem";
CREATE POLICY "Allow public read item" ON "MenuItem" FOR SELECT TO public USING (true);
CREATE POLICY "Allow owner manage item" ON "MenuItem" FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Category"
        JOIN "Menu" ON "Menu".id = "Category"."menuId"
        JOIN "Restaurant" ON "Restaurant".id = "Menu"."restaurantId"
        WHERE "Category".id = "MenuItem"."categoryId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

ALTER TABLE "Image" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read image" ON "Image";
DROP POLICY IF EXISTS "Allow owner manage image" ON "Image";
CREATE POLICY "Allow public read image" ON "Image" FOR SELECT TO public USING (true);
CREATE POLICY "Allow owner manage image" ON "Image" FOR ALL TO authenticated USING (true);

-- 21. Subscription plan enhancement: Add custom Enterprise feature toggles column
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "enterpriseFeatures" TEXT;

-- 22. Add social media link columns to Restaurant
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "twitterUrl" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "tiktokUrl" TEXT;

-- 23. Create is_admin helper function for database policies
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    is_adm BOOLEAN;
BEGIN
    user_email := auth.jwt() ->> 'email';
    IF user_email IS NULL THEN
        RETURN FALSE;
    END IF;
    IF user_email = 'farookisop@gmail.com' THEN
        RETURN TRUE;
    END IF;
    SELECT EXISTS (
        SELECT 1 FROM "AdminUser" WHERE email = user_email
    ) INTO is_adm;
    RETURN COALESCE(is_adm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Create AuditLog table to track restaurant activity history
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "actionCode" TEXT NOT NULL,
    "payload" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 25. Add foreign key constraint for cascading delete on AuditLog
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS fk_auditlog_restaurant;
ALTER TABLE "AuditLog" 
ADD CONSTRAINT fk_auditlog_restaurant 
FOREIGN KEY ("restaurantId") 
REFERENCES "Restaurant"("id") 
ON DELETE CASCADE;

-- 26. Add index on restaurantId for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_restaurantId_idx" ON "AuditLog"("restaurantId");

-- 27. Enable RLS and setup policies for AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert audit" ON "AuditLog";
DROP POLICY IF EXISTS "Allow owner read audit" ON "AuditLog";

CREATE POLICY "Allow public insert audit" ON "AuditLog" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow owner read audit" ON "AuditLog" FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM "Restaurant"
        WHERE "Restaurant".id = "AuditLog"."restaurantId"
          AND ("Restaurant"."userId" = auth.uid()::text OR is_admin())
    )
);

