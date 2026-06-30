import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

import type { NextApiRequest, NextApiResponse } from "next";


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser(token);

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

        const fileIdGen = nanoid(12);
        let extension = isVideo ? "mp4" : "jpg";
        if (!isVideo) {
            if (mimeType === "image/png") extension = "png";
            else if (mimeType === "image/gif") extension = "gif";
            else if (mimeType === "image/webp") extension = "webp";
        }

        const fileName = `${fileIdGen}.${extension}`;
        const storagePath = `${user.id}/${imageFolder}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
            .from("menufic")
            .upload(storagePath, new Uint8Array(buffer), {
                contentType: mimeType,
                upsert: true,
            });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("menufic").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
        fileId = storagePath;

        return res.status(200).json({ data: { fileId, url: publicUrl } });
    } catch (err: any) {
        console.error("Upload endpoint error:", err);
        return res.status(500).json({ error: err.message || "Upload failed" });
    }
}
