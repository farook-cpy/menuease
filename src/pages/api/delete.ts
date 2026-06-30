import { createClient } from "@supabase/supabase-js";

import type { NextApiRequest, NextApiResponse } from "next";

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
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized session" });
    }

    const { path } = req.body as { path: string };

    if (!path) {
        return res.status(400).json({ error: "Missing file path to delete" });
    }

    try {
        let relativePath = path;
        if (path.includes("supabase.co/storage/v1/object/public/menufic/")) {
            relativePath = path.split("/public/menufic/")[1] || path;
        }

        const { error: deleteErr } = await supabase.storage.from("menufic").remove([relativePath]);

        if (deleteErr) {
            console.error("Supabase Storage deletion error:", deleteErr);
            throw deleteErr;
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error("Delete endpoint error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete file" });
    }
}
