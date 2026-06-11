-- Supabase Database Schema for Menufic

-- Create Image table
CREATE TABLE IF NOT EXISTS "Image" (
  "id" TEXT PRIMARY KEY,
  "path" TEXT NOT NULL,
  "blurHash" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "restaurantId" TEXT
);

-- Create Restaurant table
CREATE TABLE IF NOT EXISTS "Restaurant" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "contactNo" TEXT NOT NULL,
  "isPublished" BOOLEAN DEFAULT FALSE NOT NULL,
  "imageId" TEXT
);

-- Create Menu table
CREATE TABLE IF NOT EXISTS "Menu" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "name" TEXT NOT NULL,
  "availableTime" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "restaurantId" TEXT
);

-- Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "menuId" TEXT
);

-- Create MenuItem table
CREATE TABLE IF NOT EXISTS "MenuItem" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "categoryId" TEXT,
  "imageId" TEXT
);

-- Define Foreign Key Constraints for PostgREST Relationships

-- Link Restaurant to Image
ALTER TABLE "Restaurant"
ADD CONSTRAINT fk_restaurant_image
FOREIGN KEY ("imageId")
REFERENCES "Image"("id")
ON DELETE SET NULL;


-- Link Menu to Restaurant
ALTER TABLE "Menu"
ADD CONSTRAINT fk_menu_restaurant
FOREIGN KEY ("restaurantId")
REFERENCES "Restaurant"("id")
ON DELETE CASCADE;

-- Link Category to Menu
ALTER TABLE "Category"
ADD CONSTRAINT fk_category_menu
FOREIGN KEY ("menuId")
REFERENCES "Menu"("id")
ON DELETE CASCADE;

-- Link MenuItem to Category
ALTER TABLE "MenuItem"
ADD CONSTRAINT fk_menuitem_category
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE CASCADE;

-- Link MenuItem to Image
ALTER TABLE "MenuItem"
ADD CONSTRAINT fk_menuitem_image
FOREIGN KEY ("imageId")
REFERENCES "Image"("id")
ON DELETE SET NULL;


-- =========================================================================
-- OPTIONAL: Supabase Storage Row Level Security (RLS) Policies
-- Run these commands in the SQL Editor if you get RLS/policy upload errors
-- =========================================================================

-- Enable RLS on storage objects (usually enabled by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload/insert files in the "menufic" bucket
-- CREATE POLICY "Allow authenticated insert to menufic" 
-- ON storage.objects FOR INSERT 
-- TO authenticated 
-- WITH CHECK (bucket_id = 'menufic');

-- Policy to allow authenticated users to update files in the "menufic" bucket
-- CREATE POLICY "Allow authenticated update to menufic" 
-- ON storage.objects FOR UPDATE 
-- TO authenticated 
-- USING (bucket_id = 'menufic');

-- Policy to allow authenticated users to delete files in the "menufic" bucket
-- CREATE POLICY "Allow authenticated delete from menufic" 
-- ON storage.objects FOR DELETE 
-- TO authenticated 
-- USING (bucket_id = 'menufic');

-- Policy to allow public access to view/select files in the "menufic" bucket
-- CREATE POLICY "Allow public select from menufic" 
-- ON storage.objects FOR SELECT 
-- TO public 
-- USING (bucket_id = 'menufic');

