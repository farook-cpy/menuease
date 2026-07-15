import { z } from "zod";

export const menuId = z.object({ menuId: z.string().min(1) });
export const categoryId = z.object({ categoryId: z.string().min(1) });
export const restaurantId = z.object({ restaurantId: z.string().min(1) });
export const id = z.object({ id: z.string().min(1) });

export const categoryInput = z.object({
    name: z.string().trim().min(1, "Name is required").max(30, "Name cannot be longer than 30 characters"),
});
export const menuInput = z.object({
    availableTime: z.string().trim().max(20, "Available time cannot be longer than 20 characters"),
    name: z.string().trim().min(1, "Name is required").max(30, "Name cannot be longer than 30 characters"),
});
export const menuItemInput = z.object({
    additionalImages: z
        .array(
            z.object({
                blurHash: z.string(),
                color: z.string(),
                id: z.string(),
                path: z.string(),
            })
        )
        .optional(),
    deletedImageIds: z.array(z.string()).optional(),
    description: z.string().trim().max(185, "Description cannot be longer than 185 characters"),
    imageBase64: z.string().optional(),
    imagePath: z.string().optional(),
    isVeg: z.boolean().nullable().optional(),
    name: z.string().trim().min(1, "Name is required").max(50, "Name cannot be longer than 50 characters"),
    price: z.string().trim().min(1, "Price is required").max(12, "Price cannot be longer than 12 characters"),
    videoUrl: z.string().nullable().optional(),
    sizes: z.string().optional().nullable(),
    variants: z.string().optional().nullable(),
    addons: z.string().optional().nullable(),
});
export const restaurantInput = z.object({
    brandColor: z.string().optional().nullable(),
    contactNo: z.union([
        z
            .string()
            .trim()
            .regex(/^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$/, "Invalid contact number"),
        z.literal(""),
    ]),
    currency: z.string().optional().nullable(),
    imageBase64: z.string(),
    imagePath: z.string().min(1, "Image is required"),
    isKitchenEnabled: z.boolean().optional(),
    isOrderFeatureEnabled: z.boolean().optional(),
    isOwnerDisabled: z.boolean().optional(),
    location: z.string().trim().min(1, "Location is required").max(75, "Location cannot be longer than 75 characters"),
    logoBase64: z.string().optional(),
    logoUrl: z.string().optional().nullable(),
    name: z.string().trim().min(1, "Name is required").max(40, "Name cannot be longer than 40 characters"),
    ownerPassword: z.string().trim().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    ownerUsername: z
        .string()
        .trim()
        .max(30, "Username cannot be longer than 30 characters")
        .optional()
        .or(z.literal("")),
    userId: z.string().optional().or(z.literal("")),
    whatsappNo: z.string().optional().nullable(),
    googleReviewUrl: z.string().optional().nullable(),
    festivalTheme: z.string().optional().nullable(),
    instagramUrl: z.string().optional().nullable(),
    facebookUrl: z.string().optional().nullable(),
    twitterUrl: z.string().optional().nullable(),
    youtubeUrl: z.string().optional().nullable(),
    tiktokUrl: z.string().optional().nullable(),
    menuTheme: z.string().optional().default("GRID"),
    qrFgColor: z.string().optional().default("#000000"),
    qrBgColor: z.string().optional().default("#ffffff"),
    qrStyle: z.string().optional().default("SQUARE"),
    qrLogoUrl: z.string().optional().nullable(),
    happyHourStart: z.string().optional().nullable(),
    happyHourEnd: z.string().optional().nullable(),
    happyHourDiscount: z.union([z.number(), z.string()]).optional().nullable(),
});
export const bannerInput = z.object({
    imageBase64: z.string().min(1, "Image is required"),
    restaurantId: z.string().min(1),
});
export const offerInput = z.object({
    title: z.string().trim().min(1, "Title is required").max(60, "Title cannot be longer than 60 characters"),
    description: z.string().trim().max(250, "Description cannot be longer than 250 characters"),
    price: z.string().trim().optional().nullable(),
    type: z.enum(["SPECIAL_OFFER", "COMBO_DEAL"]),
    isAvailable: z.boolean().default(true),
    endsAt: z.string().optional().nullable(),
    items: z.string().optional().nullable(), // JSON string
});
