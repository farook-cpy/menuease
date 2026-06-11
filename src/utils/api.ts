import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import type { Category, MenuItem, Menu, Restaurant, Image } from "@prisma/client";
import { supabase, uploadImage, deleteFile, encodeImageToBlurhash, getColor, rgba2hex } from "./supabaseClient";

// Helper to get current user ID
const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User is not authenticated");
    return user.id;
};

// Define detail fetcher helper
const fetchRestaurantDetails = async (id: string) => {
    const { data: restaurant, error: rErr } = await supabase
        .from("Restaurant")
        .select("*")
        .eq("id", id)
        .single();
    if (rErr || !restaurant) throw rErr || new Error("Restaurant not found");

    let image = null;
    if (restaurant.imageId) {
        const { data: img } = await supabase
            .from("Image")
            .select("*")
            .eq("id", restaurant.imageId)
            .single();
        image = img;
    }

    const { data: banners } = await supabase
        .from("Image")
        .select("*")
        .eq("restaurantId", id);

    const { data: menus } = await supabase
        .from("Menu")
        .select("*")
        .eq("restaurantId", id)
        .order("position", { ascending: true });

    const menuList = menus || [];

    let categoriesList: any[] = [];
    if (menuList.length > 0) {
        const menuIds = menuList.map((m: any) => m.id);
        const { data: categories } = await supabase
            .from("Category")
            .select("*")
            .in("menuId", menuIds)
            .order("position", { ascending: true });
        categoriesList = categories || [];
    }

    let itemsList: any[] = [];
    if (categoriesList.length > 0) {
        const catIds = categoriesList.map((c: any) => c.id);
        const { data: items } = await supabase
            .from("MenuItem")
            .select("*")
            .in("categoryId", catIds)
            .order("position", { ascending: true });
        itemsList = items || [];
    }

    let itemImagesList: any[] = [];
    const itemImageIds = itemsList.map((i: any) => i.imageId).filter(Boolean);
    if (itemImageIds.length > 0) {
        const { data: itemImages } = await supabase
            .from("Image")
            .select("*")
            .in("id", itemImageIds);
        itemImagesList = itemImages || [];
    }

    const itemsMap = itemsList.map((item: any) => ({
        ...item,
        image: itemImagesList.find((img: any) => img.id === item.imageId) || null,
    }));

    const categoriesMap = categoriesList.map((cat: any) => ({
        ...cat,
        items: itemsMap.filter((item: any) => item.categoryId === cat.id),
    }));

    const menusMap = menuList.map((menu: any) => ({
        ...menu,
        categories: categoriesMap.filter((cat: any) => cat.menuId === menu.id),
    }));

    return {
        ...restaurant,
        banners: banners || [],
        image,
        menus: menusMap,
    };
};

export const api = {
    category: {
        getAll: {
            useQuery: (input: { menuId: string }, options?: any) => {
                return useQuery(["categories", input.menuId], async () => {
                    const { data: categories, error: cErr } = await supabase
                        .from("Category")
                        .select("*")
                        .eq("menuId", input.menuId)
                        .order("position", { ascending: true });
                    if (cErr) throw cErr;
                    if (!categories || categories.length === 0) return [];

                    const categoryIds = categories.map((c: any) => c.id);
                    const { data: items, error: iErr } = await supabase
                        .from("MenuItem")
                        .select("*")
                        .in("categoryId", categoryIds)
                        .order("position", { ascending: true });
                    if (iErr) throw iErr;

                    const itemIds = (items || []).map((i: any) => i.imageId).filter(Boolean);
                    let images: any[] = [];
                    if (itemIds.length > 0) {
                        const { data: imgs, error: imgErr } = await supabase
                            .from("Image")
                            .select("*")
                            .in("id", itemIds);
                        if (imgErr) throw imgErr;
                        images = imgs || [];
                    }

                    const itemsWithImages = (items || []).map((item: any) => ({
                        ...item,
                        image: images.find((img: any) => img.id === item.imageId) || null,
                    }));

                    return categories.map((cat: any) => ({
                        ...cat,
                        items: itemsWithImages.filter((item: any) => item.categoryId === cat.id),
                    }));
                }, options);
            },
        },
        create: {
            useMutation: <TData = Category, TError = Error, TVariables = { name: string; menuId: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    const id = nanoid(24);

                    // Get last category position
                    const { data: lastCats } = await supabase
                        .from("Category")
                        .select("position")
                        .eq("menuId", input.menuId)
                        .order("position", { ascending: false })
                        .limit(1);
                    const position = lastCats && lastCats[0] ? (lastCats[0].position || 0) + 1 : 0;

                    const newCat = {
                        id,
                        userId,
                        name: input.name,
                        position,
                        menuId: input.menuId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    const { data, error } = await supabase
                        .from("Category")
                        .insert([newCat])
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["categories"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        delete: {
            useMutation: <TData = Category, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    // Cascade deletes client side
                    const { data: items } = await supabase
                        .from("MenuItem")
                        .select("id, imageId")
                        .eq("categoryId", input.id);
                    
                    if (items && items.length > 0) {
                        const itemIds = items.map((i: any) => i.id);
                        const imageIds = items.map((i: any) => i.imageId).filter(Boolean);

                        // Delete images from Storage & DB
                        if (imageIds.length > 0) {
                            const { data: imageObjects } = await supabase
                                .from("Image")
                                .select("path")
                                .in("id", imageIds);
                            if (imageObjects) {
                                await Promise.all(imageObjects.map((img: any) => deleteFile(img.path)));
                            }
                            await supabase.from("Image").delete().in("id", imageIds);
                        }

                        // Delete items
                        await supabase.from("MenuItem").delete().in("id", itemIds);
                    }

                    const { data, error } = await supabase
                        .from("Category")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["categories"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        update: {
            useMutation: <TData = Category, TError = Error, TVariables = { id: string; name: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data, error } = await supabase
                        .from("Category")
                        .update({ name: input.name, updatedAt: new Date().toISOString() })
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["categories"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        updatePosition: {
            useMutation: <TData = { id: string; newPosition: number }[], TError = Error, TVariables = { id: string; newPosition: number }[]>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    await Promise.all(input.map((item: any) =>
                        supabase
                            .from("Category")
                            .update({ position: item.newPosition, updatedAt: new Date().toISOString() })
                            .eq("id", item.id)
                    ));
                    return input;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["categories"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
    },
    menu: {
        getAll: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(["menus", input.restaurantId], async () => {
                    const { data, error } = await supabase
                        .from("Menu")
                        .select("*")
                        .eq("restaurantId", input.restaurantId)
                        .order("position", { ascending: true });
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
        create: {
            useMutation: <TData = Menu, TError = Error, TVariables = { name: string; availableTime: string; restaurantId: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    const id = nanoid(24);

                    const { data: lastMenus } = await supabase
                        .from("Menu")
                        .select("position")
                        .eq("restaurantId", input.restaurantId)
                        .order("position", { ascending: false })
                        .limit(1);
                    const position = lastMenus && lastMenus[0] ? (lastMenus[0].position || 0) + 1 : 0;

                    const newMenu = {
                        id,
                        userId,
                        name: input.name,
                        availableTime: input.availableTime,
                        position,
                        restaurantId: input.restaurantId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    const { data, error } = await supabase
                        .from("Menu")
                        .insert([newMenu])
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["menus"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        delete: {
            useMutation: <TData = Menu, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    // Cascade delete categories
                    const { data: cats } = await supabase
                        .from("Category")
                        .select("id")
                        .eq("menuId", input.id);
                    
                    if (cats && cats.length > 0) {
                        await Promise.all(cats.map(async (cat: any) => {
                            // Cascade delete items
                            const { data: items } = await supabase
                                .from("MenuItem")
                                .select("id, imageId")
                                .eq("categoryId", cat.id);

                            if (items && items.length > 0) {
                                const itemIds = items.map((i: any) => i.id);
                                const imageIds = items.map((i: any) => i.imageId).filter(Boolean);

                                if (imageIds.length > 0) {
                                    const { data: imageObjects } = await supabase
                                        .from("Image")
                                        .select("path")
                                        .in("id", imageIds);
                                    if (imageObjects) {
                                        await Promise.all(imageObjects.map((img: any) => deleteFile(img.path)));
                                    }
                                    await supabase.from("Image").delete().in("id", imageIds);
                                }
                                await supabase.from("MenuItem").delete().in("id", itemIds);
                            }
                            await supabase.from("Category").delete().eq("id", cat.id);
                        }));
                    }

                    const { data, error } = await supabase
                        .from("Menu")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["menus"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        update: {
            useMutation: <TData = Menu, TError = Error, TVariables = { id: string; name: string; availableTime: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data, error } = await supabase
                        .from("Menu")
                        .update({
                            name: input.name,
                            availableTime: input.availableTime,
                            updatedAt: new Date().toISOString(),
                        })
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["menus"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        updatePosition: {
            useMutation: <TData = { id: string; newPosition: number }[], TError = Error, TVariables = { id: string; newPosition: number }[]>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    await Promise.all(input.map((item: any) =>
                        supabase
                            .from("Menu")
                            .update({ position: item.newPosition, updatedAt: new Date().toISOString() })
                            .eq("id", item.id)
                    ));
                    return input;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["menus"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
    },
    menuItem: {
        create: {
            useMutation: <TData = MenuItem, TError = Error, TVariables = {
                name: string;
                description: string;
                price: string;
                categoryId: string;
                menuId: string;
                imageBase64?: string;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    const id = nanoid(24);

                    const { data: lastItems } = await supabase
                        .from("MenuItem")
                        .select("position")
                        .eq("categoryId", input.categoryId)
                        .order("position", { ascending: false })
                        .limit(1);
                    const position = lastItems && lastItems[0] ? (lastItems[0].position || 0) + 1 : 0;

                    let imageId = null;
                    if (input.imageBase64) {
                        const [uploaded, blurHash, rawColor] = await Promise.all([
                            uploadImage(input.imageBase64, `menu/${input.menuId}`),
                            encodeImageToBlurhash(input.imageBase64),
                            getColor(input.imageBase64),
                        ]);

                        const imgId = uploaded.fileId;
                        const newImage = {
                            id: imgId,
                            path: uploaded.filePath,
                            blurHash,
                            color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                        };

                        const { error: imgErr } = await supabase
                            .from("Image")
                            .insert([newImage]);

                        if (imgErr) throw imgErr;
                        imageId = imgId;
                    }

                    const newItem = {
                        id,
                        userId,
                        name: input.name,
                        description: input.description,
                        price: input.price,
                        position,
                        categoryId: input.categoryId,
                        imageId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    const { data, error } = await supabase
                        .from("MenuItem")
                        .insert([newItem])
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        delete: {
            useMutation: <TData = MenuItem, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data: current } = await supabase
                        .from("MenuItem")
                        .select("imageId")
                        .eq("id", input.id)
                        .single();

                    if (current && current.imageId) {
                        const { data: img } = await supabase
                            .from("Image")
                            .select("path")
                            .eq("id", current.imageId)
                            .single();
                        if (img) {
                            await deleteFile(img.path);
                        }
                        await supabase.from("Image").delete().eq("id", current.imageId);
                    }

                    const { data, error } = await supabase
                        .from("MenuItem")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        update: {
            useMutation: <TData = MenuItem, TError = Error, TVariables = {
                id: string;
                name: string;
                description: string;
                price: string;
                imageBase64?: string;
                imagePath?: string;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data: current } = await supabase
                        .from("MenuItem")
                        .select("imageId")
                        .eq("id", input.id)
                        .single();

                    let imageId = current?.imageId || null;

                    // Delete old image if it is deleted or replaced
                    if (current?.imageId && (!input.imagePath || input.imageBase64)) {
                        const { data: img } = await supabase
                            .from("Image")
                            .select("path")
                            .eq("id", current.imageId)
                            .single();
                        if (img) {
                            await deleteFile(img.path);
                        }
                        await supabase.from("Image").delete().eq("id", current.imageId);
                        imageId = null;
                    }

                    // Upload new image
                    if (input.imageBase64) {
                        const [uploaded, blurHash, rawColor] = await Promise.all([
                            uploadImage(input.imageBase64, `menu/item-${input.id}`),
                            encodeImageToBlurhash(input.imageBase64),
                            getColor(input.imageBase64),
                        ]);

                        const imgId = uploaded.fileId;
                        const newImage = {
                            id: imgId,
                            path: uploaded.filePath,
                            blurHash,
                            color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                        };

                        const { error: imgErr } = await supabase
                            .from("Image")
                            .insert([newImage]);

                        if (imgErr) throw imgErr;
                        imageId = imgId;
                    }

                    const { data, error } = await supabase
                        .from("MenuItem")
                        .update({
                            name: input.name,
                            description: input.description,
                            price: input.price,
                            imageId,
                            updatedAt: new Date().toISOString(),
                        })
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        updatePosition: {
            useMutation: <TData = { id: string; newPosition: number }[], TError = Error, TVariables = { id: string; newPosition: number }[]>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    for (const item of input) {
                        await supabase
                            .from("MenuItem")
                            .update({ position: item.newPosition, updatedAt: new Date().toISOString() })
                            .eq("id", item.id);
                    }
                    return input;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
    },
    restaurant: {
        addBanner: {
            useMutation: <TData = Image, TError = Error, TVariables = { restaurantId: string; imageBase64: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const [uploaded, blurHash, rawColor] = await Promise.all([
                        uploadImage(input.imageBase64, `${input.restaurantId}/banners`),
                        encodeImageToBlurhash(input.imageBase64),
                        getColor(input.imageBase64),
                    ]);

                    const imgId = uploaded.fileId;
                    const newImage = {
                        id: imgId,
                        path: uploaded.filePath,
                        blurHash,
                        color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                        restaurantId: input.restaurantId,
                    };

                    const { data, error } = await supabase
                        .from("Image")
                        .insert([newImage])
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["restaurantBanners"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        create: {
            useMutation: <TData = Restaurant & { image: Image | null }, TError = Error, TVariables = { name: string; location: string; contactNo: string; imageBase64: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    const restaurantId = nanoid(24);

                    const [uploaded, blurHash, rawColor] = await Promise.all([
                        uploadImage(input.imageBase64, `${restaurantId}/profile`),
                        encodeImageToBlurhash(input.imageBase64),
                        getColor(input.imageBase64),
                    ]);

                    const imgId = uploaded.fileId;
                    const newImage = {
                        id: imgId,
                        path: uploaded.filePath,
                        blurHash,
                        color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                    };

                    const { error: imgErr } = await supabase
                        .from("Image")
                        .insert([newImage]);
                    if (imgErr) throw imgErr;

                    const newRestaurant = {
                        id: restaurantId,
                        userId,
                        name: input.name,
                        location: input.location,
                        contactNo: input.contactNo,
                        isPublished: false,
                        imageId: imgId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    const { data, error: rErr } = await supabase
                        .from("Restaurant")
                        .insert([newRestaurant])
                        .select("*, image:Image!fk_restaurant_image(*)")
                        .single();

                    if (rErr) throw rErr;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        delete: {
            useMutation: <TData = Restaurant, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data: restaurant } = await supabase
                        .from("Restaurant")
                        .select("imageId")
                        .eq("id", input.id)
                        .single();

                    // Delete main profile image
                    if (restaurant && restaurant.imageId) {
                        const { data: img } = await supabase
                            .from("Image")
                            .select("path")
                            .eq("id", restaurant.imageId)
                            .single();
                        if (img) await deleteFile(img.path);
                        await supabase.from("Image").delete().eq("id", restaurant.imageId);
                    }

                    // Delete banners
                    const { data: banners } = await supabase
                        .from("Image")
                        .select("path, id")
                        .eq("restaurantId", input.id);
                    if (banners && banners.length > 0) {
                        for (const b of banners) {
                            await deleteFile(b.path);
                        }
                        const bannerIds = banners.map((b: any) => b.id);
                        await supabase.from("Image").delete().in("id", bannerIds);
                    }

                    // Delete menus -> categories -> items
                    const { data: menus } = await supabase.from("Menu").select("id").eq("restaurantId", input.id);
                    if (menus) {
                        for (const menu of menus) {
                            const { data: cats } = await supabase.from("Category").select("id").eq("menuId", menu.id);
                            if (cats) {
                                for (const cat of cats) {
                                    const { data: items } = await supabase.from("MenuItem").select("id, imageId").eq("categoryId", cat.id);
                                    if (items && items.length > 0) {
                                        const itemIds = items.map((i: any) => i.id);
                                        const imageIds = items.map((i: any) => i.imageId).filter(Boolean);

                                        if (imageIds.length > 0) {
                                            const { data: itemImages } = await supabase.from("Image").select("path").in("id", imageIds);
                                            if (itemImages) {
                                                for (const img of itemImages) {
                                                    await deleteFile(img.path);
                                                }
                                            }
                                            await supabase.from("Image").delete().in("id", imageIds);
                                        }
                                        await supabase.from("MenuItem").delete().in("id", itemIds);
                                    }
                                    await supabase.from("Category").delete().eq("id", cat.id);
                                }
                            }
                            await supabase.from("Menu").delete().eq("id", menu.id);
                        }
                    }

                    const { data, error } = await supabase
                        .from("Restaurant")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        deleteBanner: {
            useMutation: <TData = Image, TError = Error, TVariables = { id: string; restaurantId: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data: img } = await supabase
                        .from("Image")
                        .select("path")
                        .eq("id", input.id)
                        .single();
                    if (img) {
                        await deleteFile(img.path);
                    }
                    const { data, error } = await supabase
                        .from("Image")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails"]);
                        queryClient.invalidateQueries(["restaurantBanners"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        get: {
            useQuery: (input: { id: string }, options?: any) => {
                return useQuery(["restaurant", input.id], async () => {
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .select("*")
                        .eq("id", input.id)
                        .single();
                    if (error) throw error;
                    return data;
                }, options);
            },
        },
        getAll: {
            useQuery: (variables: any, options?: any) => {
                return useQuery(["restaurants"], async () => {
                    const userId = await getCurrentUserId();
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .select("*, image:Image!fk_restaurant_image(*)")
                        .eq("userId", userId);
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
        getAllPublished: {
            useQuery: (variables: any, options?: any) => {
                return useQuery(["restaurantsPublished"], async () => {
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .select("*, image:Image!fk_restaurant_image(*)")
                        .eq("isPublished", true);
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
        getBanners: {
            useQuery: (input: { id: string }, options?: any) => {
                return useQuery(["restaurantBanners", input.id], async () => {
                    const { data, error } = await supabase
                        .from("Image")
                        .select("*")
                        .eq("restaurantId", input.id);
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
        getDetails: {
            useQuery: (input: { id: string }, options?: any) => {
                return useQuery(["restaurantDetails", input.id], async () => {
                    return fetchRestaurantDetails(input.id);
                }, options);
            },
        },
        setPublished: {
            useMutation: <TData = Restaurant, TError = Error, TVariables = { id: string; isPublished: boolean }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .update({ isPublished: input.isPublished, updatedAt: new Date().toISOString() })
                        .eq("id", input.id)
                        .select()
                        .single();
                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails", (variables as any).id]);
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        update: {
            useMutation: <TData = Restaurant & { image: Image | null }, TError = Error, TVariables = {
                id: string;
                name: string;
                location: string;
                contactNo: string;
                imageBase64?: string;
                imagePath?: string;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data: current } = await supabase
                        .from("Restaurant")
                        .select("imageId")
                        .eq("id", input.id)
                        .single();

                    let imageId = current?.imageId || null;

                    // Delete old profile image if replaced
                    if (current?.imageId && input.imageBase64) {
                        const { data: img } = await supabase
                            .from("Image")
                            .select("path")
                            .eq("id", current.imageId)
                            .single();
                        if (img) await deleteFile(img.path);
                        await supabase.from("Image").delete().eq("id", current.imageId);
                        imageId = null;
                    }

                    // Upload new profile image
                    if (input.imageBase64) {
                        const [uploaded, blurHash, rawColor] = await Promise.all([
                            uploadImage(input.imageBase64, `${input.id}/profile`),
                            encodeImageToBlurhash(input.imageBase64),
                            getColor(input.imageBase64),
                        ]);

                        const imgId = uploaded.fileId;
                        const newImage = {
                            id: imgId,
                            path: uploaded.filePath,
                            blurHash,
                            color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                        };

                        const { error: imgErr } = await supabase
                            .from("Image")
                            .insert([newImage]);
                        if (imgErr) throw imgErr;
                        imageId = imgId;
                    }

                    const { data, error } = await supabase
                        .from("Restaurant")
                        .update({
                            name: input.name,
                            location: input.location,
                            contactNo: input.contactNo,
                            imageId,
                            updatedAt: new Date().toISOString(),
                        })
                        .eq("id", input.id)
                        .select("*, image:Image(*)")
                        .single();

                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["restaurantDetails", (variables as any).id]);
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
    },
    useContext: (): any => {
        const queryClient = useQueryClient();
        
        const getQueryKeyForPath = (path: string[], variables: any): any[] | null => {
            const domain = path[0];
            const method = path[1];
            if (domain === "restaurant") {
                if (method === "getAll") return ["restaurants"];
                if (method === "getDetails") return ["restaurantDetails", variables?.id || variables];
                if (method === "getBanners") return ["restaurantBanners", variables?.id || variables];
                if (method === "get") return ["restaurant", variables?.id || variables];
            }
            if (domain === "menu") {
                if (method === "getAll") return ["menus", variables?.restaurantId || variables];
                return ["restaurantDetails"];
            }
            if (domain === "category" || domain === "menuItem") {
                return ["restaurantDetails"];
            }
            return null;
        };

        const createProxy = (path: string[]): any => {
            return new Proxy(() => {}, {
                get(target, prop: string) {
                    if (prop === "setData") {
                        return (variables: any, updater: any) => {
                            const queryKey = getQueryKeyForPath(path, variables);
                            if (queryKey) {
                                queryClient.setQueryData(queryKey, updater);
                            }
                        };
                    }
                    if (prop === "invalidate") {
                        return (variables: any) => {
                            const queryKey = getQueryKeyForPath(path, variables);
                            if (queryKey) {
                                queryClient.invalidateQueries(queryKey);
                            }
                        };
                    }
                    if (prop === "cancel") {
                        return async (variables: any) => {
                            const queryKey = getQueryKeyForPath(path, variables);
                            if (queryKey) {
                                await queryClient.cancelQueries(queryKey);
                            }
                        };
                    }
                    if (prop === "getData") {
                        return (variables: any) => {
                            const queryKey = getQueryKeyForPath(path, variables);
                            return queryKey ? queryClient.getQueryData(queryKey) : undefined;
                        };
                    }
                    return createProxy([...path, prop]);
                }
            });
        };

        return createProxy([]);
    }
};
export type AppRouter = any;
