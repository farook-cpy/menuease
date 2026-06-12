-- Create Feedback table
CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" TEXT PRIMARY KEY,
  "menuItemId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "reviewerName" TEXT DEFAULT 'Anonymous' NOT NULL,
  "ownerResponse" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Delete cascade constraint
ALTER TABLE "Feedback"
ADD CONSTRAINT fk_feedback_menuitem
FOREIGN KEY ("menuItemId")
REFERENCES "MenuItem"("id")
ON DELETE CASCADE;

-- ============================================================
-- OPTION 1 (Simplest): Disable RLS entirely for Feedback table
-- Run this in Supabase SQL Editor:
-- ============================================================
ALTER TABLE "Feedback" DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- OPTION 2: Keep RLS but allow anonymous inserts + public reads
-- Use this if you want RLS enabled but allow public submissions:
-- ============================================================
-- ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow anyone to read feedback
-- CREATE POLICY "Allow public read feedback"
--   ON "Feedback" FOR SELECT
--   TO anon, authenticated
--   USING (true);
-- 
-- -- Allow anyone to insert feedback (public reviews)
-- CREATE POLICY "Allow public insert feedback"
--   ON "Feedback" FOR INSERT
--   TO anon, authenticated
--   WITH CHECK (true);
-- 
-- -- Allow authenticated users (restaurant owners) to update ownerResponse
-- CREATE POLICY "Allow authenticated update feedback"
--   ON "Feedback" FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);
-- 
-- -- Allow authenticated users to delete feedback
-- CREATE POLICY "Allow authenticated delete feedback"
--   ON "Feedback" FOR DELETE
--   TO authenticated
--   USING (true);

