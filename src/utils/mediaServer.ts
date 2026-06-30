import { v2 as cloudinary } from "cloudinary";
import ImageKit from "imagekit";

// Configure Cloudinary
cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});

// Configure ImageKit
const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

/**
 * Uploads a buffer to ImageKit and returns its details
 */
export const uploadToImageKit = async (
    buffer: Buffer,
    fileName: string,
    folder: string
): Promise<{ url: string; fileId: string }> => {
    return new Promise((resolve, reject) => {
        imagekit.upload(
            {
                file: buffer,
                fileName,
                folder,
                useUniqueFileName: true,
            },
            (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!result) {
                    reject(new Error("ImageKit upload failed with no result"));
                    return;
                }
                resolve({
                    fileId: result.fileId,
                    url: result.url,
                });
            }
        );
    });
};

/**
 * Deletes a file from ImageKit by fileId
 */
export const deleteFromImageKit = async (fileId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        imagekit.deleteFile(fileId, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

/**
 * Uploads a buffer to Cloudinary (for videos) and returns its secure URL
 */
export const uploadToCloudinary = async (buffer: Buffer, folder: string): Promise<{ url: string }> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "video",
            },
            (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!result) {
                    reject(new Error("Cloudinary upload failed with no result"));
                    return;
                }
                resolve({
                    url: result.secure_url,
                });
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Deletes a video from Cloudinary by public ID
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: "video" }, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

/**
 * Extracts public_id from a Cloudinary URL
 */
export const getCloudinaryPublicId = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/");
        const uploadIndex = parts.indexOf("upload");
        if (uploadIndex === -1) return null;

        const versionIndex = uploadIndex + 1;
        let startIndex = versionIndex;
        if (parts[versionIndex]?.match(/^v\d+$/)) {
            startIndex = versionIndex + 1;
        }

        const publicIdWithExt = parts.slice(startIndex).join("/");
        return publicIdWithExt.replace(/\.[^/.]+$/, "");
    } catch (e) {
        return null;
    }
};
