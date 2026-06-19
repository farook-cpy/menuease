import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Perform a lightweight query to generate database activity on Supabase
        const { data, error } = await supabase
            .from("Restaurant")
            .select("id")
            .limit(1);

        if (error) {
            console.error("Keepalive DB query error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            message: "Supabase database activity generated successfully to prevent pausing.",
        });
    } catch (err: any) {
        console.error("Keepalive handler error:", err);
        return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
}
