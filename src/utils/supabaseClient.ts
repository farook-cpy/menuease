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
        (rgb1 | (1 << 8)).toString(16).slice(1) +
        // eslint-disable-next-line no-bitwise
        (rgb2 | (1 << 8)).toString(16).slice(1) +
        // eslint-disable-next-line no-bitwise
        (rgb3 | (1 << 8)).toString(16).slice(1);
    return `#${hex}`;
};

/** Uploads base64 image/video to Supabase Storage via server-side API */
export const uploadImage = async (imageBase64: string, imageFolder: string) => {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Unauthorized: Cannot upload files without user session");

    const response = await fetch("/api/upload", {
        body: JSON.stringify({
            imageBase64,
            imageFolder,
        }),
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload image/video to Supabase Storage");
    }

    const { data } = await response.json();
    return {
        fileId: data.fileId, // Store the ImageKit fileId or Cloudinary URL as the Image ID in DB
        filePath: data.url, // Path/URL to be loaded in the app
    };
};

/** Deletes a file from storage via server-side API (deletes from R2 or Supabase depending on path) */
export const deleteFile = async (path: string) => {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch("/api/delete", {
        body: JSON.stringify({ path }),
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Failed to delete file from storage:", errData.error || response.statusText);
    }
};

/** Uploads base64 image/video with granular progress tracking */
export const uploadFileWithProgress = (
    imageBase64: string,
    imageFolder: string,
    token: string,
    onProgress: (progress: number) => void
): Promise<{ url: string; fileId: string }> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            }
        });

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.data);
                } catch (e) {
                    reject(new Error("Failed to parse upload response"));
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    reject(new Error(response.error || "Upload failed"));
                } catch (e) {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network error during upload"));
        };

        xhr.send(JSON.stringify({ imageBase64, imageFolder }));
    });
};
