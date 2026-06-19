import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { deleteFromImageKit, deleteFromCloudinary, getCloudinaryPublicId } from "src/utils/mediaServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing authorization token" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Unauthorized token" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized session" });
    }

    const { path } = req.body as { path: string };

    if (!path) {
        return res.status(400).json({ error: "Missing file path to delete" });
    }

    try {
        if (path.startsWith("http")) {
            if (path.includes("cloudinary.com")) {
                // Cloudinary Video Deletion
                const publicId = getCloudinaryPublicId(path);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } else {
                // ImageKit Image Deletion
                // Query Supabase to find the Image record by path (since we store ImageKit fileId in Image.id)
                const { data: imgRecord } = await supabase
                    .from("Image")
                    .select("id")
                    .eq("path", path)
                    .single();

                if (imgRecord?.id) {
                    await deleteFromImageKit(imgRecord.id);
                } else {
                    console.warn(`No DB record found for ImageKit path: ${path}. Attempting filename fallback.`);
                    // Fallback: extract filename without extension and try to delete,
                    // or just skip if we don't have the fileId.
                }
            }
        } else {
            // Delete from Supabase Storage (compatibility with old images)
            const { error: deleteErr } = await supabase.storage
                .from("menufic")
                .remove([path]);
            
            if (deleteErr) {
                console.error("Supabase Storage deletion error:", deleteErr);
                throw deleteErr;
            }
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error("Delete endpoint error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete file" });
    }
}
