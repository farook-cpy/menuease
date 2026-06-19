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
    description: z.string().trim().max(185, "Description cannot be longer than 185 characters"),
    imageBase64: z.string().optional(),
    imagePath: z.string().optional(),
    name: z.string().trim().min(1, "Name is required").max(50, "Name cannot be longer than 50 characters"),
    price: z.string().trim().min(1, "Price is required").max(12, "Price cannot be longer than 12 characters"),
    isVeg: z.boolean().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    additionalImages: z.array(z.object({
        id: z.string(),
        path: z.string(),
        blurHash: z.string(),
        color: z.string()
    })).optional(),
    deletedImageIds: z.array(z.string()).optional(),
});
export const restaurantInput = z.object({
    contactNo: z.union([
        z
            .string()
            .trim()
            .regex(/^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$/, "Invalid contact number"),
        z.literal(""),
    ]),
    imageBase64: z.string(),
    imagePath: z.string().min(1, "Image is required"),
    location: z.string().trim().min(1, "Location is required").max(75, "Location cannot be longer than 75 characters"),
    name: z.string().trim().min(1, "Name is required").max(40, "Name cannot be longer than 40 characters"),
    ownerUsername: z.string().trim().max(30, "Username cannot be longer than 30 characters").optional().or(z.literal("")),
    ownerPassword: z.string().trim().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    userId: z.string().optional().or(z.literal("")),
    isOwnerDisabled: z.boolean().optional(),
});
export const bannerInput = z.object({
    imageBase64: z.string().min(1, "Image is required"),
    restaurantId: z.string().min(1),
});
