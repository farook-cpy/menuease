-- Create MenuAnalytics table
CREATE TABLE IF NOT EXISTS "MenuAnalytics" (
  "id" TEXT PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'page_view' or 'item_click'
  "menuItemId" TEXT, -- nullable
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_analytics_restaurant FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT fk_analytics_item FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_analytics_restaurant" ON "MenuAnalytics"("restaurantId");
CREATE INDEX IF NOT EXISTS "idx_analytics_item" ON "MenuAnalytics"("menuItemId");

-- Disable Row Level Security (RLS) to bypass client-side query blocks
ALTER TABLE "MenuAnalytics" DISABLE ROW LEVEL SECURITY;
