import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { uploadToImageKit, uploadToCloudinary } from "src/utils/mediaServer";
import { nanoid } from "nanoid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
    },
};

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized session" });
    }

    const { imageBase64, imageFolder } = req.body as {
        imageBase64: string;
        imageFolder: string;
    };

    if (!imageBase64 || !imageFolder) {
        return res.status(400).json({ error: "Missing imageBase64 or imageFolder" });
    }

    try {
        const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : "image/jpeg";
        const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const isVideo = mimeType.startsWith("video/");
        
        let publicUrl = "";
        let fileId = "";

        if (isVideo) {
            // Upload to Cloudinary for videos
            const result = await uploadToCloudinary(buffer, `menufic/${user.id}/${imageFolder}`);
            publicUrl = result.url;
            fileId = result.url; // Use URL as the fallback file ID
        } else {
            // Upload to ImageKit for images
            const fileIdGen = nanoid(12);
            let extension = "jpg";
            if (mimeType === "image/png") extension = "png";
            else if (mimeType === "image/gif") extension = "gif";
            else if (mimeType === "image/webp") extension = "webp";
            
            const fileName = `${fileIdGen}.${extension}`;
            const folderPath = `menufic/${user.id}/${imageFolder}`;
            
            const result = await uploadToImageKit(buffer, fileName, folderPath);
            publicUrl = result.url;
            fileId = result.fileId; // Keep ImageKit's unique fileId
        }

        return res.status(200).json({ data: { url: publicUrl, fileId } });
    } catch (err: any) {
        console.error("Upload endpoint error:", err);
        return res.status(500).json({ error: err.message || "Upload failed" });
    }
}
