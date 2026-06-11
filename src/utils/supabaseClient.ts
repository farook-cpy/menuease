import { createClient } from "@supabase/supabase-js";
import { encode } from "blurhash";
import { nanoid } from "nanoid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Helper to convert a base64 string to a Blob */
export const base64ToBlob = (base64: string, contentType = "image/jpeg") => {
    const byteCharacters = atob(base64.split(",")[1] || base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i += 1) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
};

/** Compute blurhash client-side using a hidden canvas */
export const encodeImageToBlurhash = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve("L6PZ|ndy1[V@~p%0IyS2IA%0NeR*"); // fallback blurhash
                return;
            }
            ctx.drawImage(img, 0, 0, 32, 32);
            try {
                const imgData = ctx.getImageData(0, 0, 32, 32);
                const blurhash = encode(imgData.data, imgData.width, imgData.height, 4, 4);
                resolve(blurhash);
            } catch (err) {
                console.error("Error computing blurhash", err);
                resolve("L6PZ|ndy1[V@~p%0IyS2IA%0NeR*");
            }
        };
        img.onerror = () => {
            resolve("L6PZ|ndy1[V@~p%0IyS2IA%0NeR*");
        };
    });
};

/** Extract average color client-side by drawing image onto 1x1 canvas */
export const getColor = (base64: string): Promise<[number, number, number]> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve([240, 240, 240]);
                return;
            }
            ctx.drawImage(img, 0, 0, 1, 1);
            try {
                const imgData = ctx.getImageData(0, 0, 1, 1);
                resolve([imgData.data[0] ?? 240, imgData.data[1] ?? 240, imgData.data[2] ?? 240]);
            } catch (err) {
                console.error("Error computing average color", err);
                resolve([240, 240, 240]);
            }
        };
        img.onerror = () => {
            resolve([240, 240, 240]);
        };
    });
};

/** Convert RGB values to hex */
export const rgba2hex = (rgb1: number, rgb2: number, rgb3: number) => {
    const hex =
        // eslint-disable-next-line no-bitwise
        ((rgb1 | (1 << 8)).toString(16).slice(1)) +
        // eslint-disable-next-line no-bitwise
        ((rgb2 | (1 << 8)).toString(16).slice(1)) +
        // eslint-disable-next-line no-bitwise
        ((rgb3 | (1 << 8)).toString(16).slice(1));
    return `#${hex}`;
};

/** Uploads base64 image to Supabase storage public bucket "menufic" */
export const uploadImage = async (imageBase64: string, imageFolder: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: Cannot upload image without user session");

    const blob = base64ToBlob(imageBase64, "image/jpeg");
    const fileId = nanoid(24);
    const filePath = `${user.id}/${imageFolder}/${fileId}.jpeg`;

    const { error } = await supabase.storage
        .from("menufic")
        .upload(filePath, blob, {
            cacheControl: "3600",
            contentType: "image/jpeg",
            upsert: true,
        });

    if (error) {
        throw error;
    }

    return {
        fileId: filePath, // Use filePath as the unique Image ID
        filePath, // Path to be stored in DB and loaded from public storage URL
    };
};

/** Deletes a file from Supabase Storage by path */
export const deleteFile = async (path: string) => {
    const { error } = await supabase.storage
        .from("menufic")
        .remove([path]);

    if (error) {
        console.error("Failed to delete file from storage", error);
    }
};
