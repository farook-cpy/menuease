import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { uploadToImageKit } from "src/utils/mediaServer";

// Use service role key server-side to bypass RLS, fallback to anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { menuItemId, rating, comment, reviewerName, imageBase64 } = req.body as {
        menuItemId: string;
        rating: number;
        comment: string;
        reviewerName: string;
        imageBase64?: string;
    };

    if (!menuItemId || !comment || rating == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    try {
        const id = nanoid(24);
        let imageUrl: string | null = null;

        if (imageBase64) {
            try {
                const buffer = Buffer.from(imageBase64.split(",")[1] || imageBase64, "base64");
                const fileId = nanoid(12);
                const filePath = `feedback/${menuItemId}/${fileId}.jpeg`;
                const fileIdGen = nanoid(12);
                const result = await uploadToImageKit(buffer, `${fileIdGen}.jpeg`, `feedback/${menuItemId}`);
                imageUrl = result.url;
            } catch (uploadErr) {
                console.error("Error processing feedback image:", uploadErr);
            }
        }

        const { data, error } = await supabaseAdmin
            .from("Feedback")
            .insert([
                {
                    id,
                    menuItemId,
                    rating: Number(rating),
                    comment: String(comment).trim(),
                    reviewerName: String(reviewerName || "Anonymous").trim() || "Anonymous",
                    imageUrl,
                    createdAt: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Feedback insert error:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ data });
    } catch (err: any) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}
