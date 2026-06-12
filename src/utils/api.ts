import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import type { Category, MenuItem, Menu, Restaurant, Image } from "@prisma/client";
import { supabase, uploadImage, deleteFile, encodeImageToBlurhash, getColor, rgba2hex } from "./supabaseClient";

// Helper to get current user ID
const getCurrentUserId = async () => {
    if (typeof window !== "undefined") {
        const ownerSessionStr = localStorage.getItem("owner_session");
        if (ownerSessionStr) {
            try {
                const session = JSON.parse(ownerSessionStr);
                if (session?.user?.id) {
                    return session.user.id;
                }
            } catch (e) {
                console.error("Failed to parse owner_session", e);
            }
        }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User is not authenticated");
    return user.id;
};

const getAdminRole = async () => {
    if (typeof window !== "undefined") {
        const ownerSessionStr = localStorage.getItem("owner_session");
        if (ownerSessionStr) {
            return null;
        }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    if (user.email === "farookisop@gmail.com") return "Super Admin";
    
    const { data: admin } = await supabase
        .from("AdminUser")
        .select("role")
        .eq("email", user.email)
        .single();
    return admin?.role || null;
};

const isAdmin = async () => {
    const role = await getAdminRole();
    return role === "Super Admin" || role === "Admin";
};

const isSuperAdmin = async () => {
    const role = await getAdminRole();
    return role === "Super Admin";
};

// Define detail fetcher helper
const fetchRestaurantDetails = async (id: string) => {
    const userId = await getCurrentUserId();
    const isAdm = await isAdmin();
    if (!isAdm && userId.startsWith("restaurant:")) {
        const ownerRestId = userId.replace("restaurant:", "");
        if (ownerRestId !== id) {
            throw new Error("Unauthorized access to this restaurant details");
        }
    }
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
    admin: {
        getRole: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(["adminRole"], async () => {
                    return await getAdminRole();
                }, options);
            },
        },
        getAdmins: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(["adminUsers"], async () => {
                    const isSuper = await isSuperAdmin();
                    if (!isSuper) throw new Error("Unauthorized");
                    const { data, error } = await supabase
                        .from("AdminUser")
                        .select("*")
                        .order("createdAt", { ascending: false });
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
        createAdmin: {
            useMutation: <TData = any, TError = Error, TVariables = { email: string; role: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const isSuper = await isSuperAdmin();
                    if (!isSuper) throw new Error("Unauthorized");
                    
                    const id = Math.random().toString(36).substring(2, 15);
                    const { data, error } = await supabase
                        .from("AdminUser")
                        .insert([{ id, email: input.email, role: input.role, createdAt: new Date().toISOString() }])
                        .select()
                        .single();
                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["adminUsers"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        deleteAdmin: {
            useMutation: <TData = any, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const isSuper = await isSuperAdmin();
                    if (!isSuper) throw new Error("Unauthorized");
                    
                    const { data, error } = await supabase
                        .from("AdminUser")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();
                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
                        queryClient.invalidateQueries(["adminUsers"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        getLoginLogs: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(["loginLogs"], async () => {
                    const isSuper = await isSuperAdmin();
                    if (!isSuper) throw new Error("Unauthorized");
                    const { data, error } = await supabase
                        .from("LoginLog")
                        .select("*")
                        .order("createdAt", { ascending: false });
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
    },
    billing: {
        getSummary: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(["billingSummary"], async () => {
                    const isAdm = await isAdmin();
                    if (!isAdm) throw new Error("Unauthorized");
                    
                    const { data: restaurants, error } = await supabase
                        .from("Restaurant")
                        .select("id, planName, subscriptionStatus");
                    if (error) throw error;
                    
                    const { data: transactions, error: txError } = await supabase
                        .from("BillingTransaction")
                        .select("amount, type");
                    if (txError) throw txError;
                    
                    let totalIncome = 0;
                    let totalExpense = 0;
                    (transactions || []).forEach((tx: any) => {
                        if (tx.amount > 0) {
                            totalIncome += tx.amount;
                        } else if (tx.amount < 0) {
                            totalExpense += Math.abs(tx.amount);
                        }
                    });
                    const netProfit = totalIncome - totalExpense;
                    
                    const activeSubs = (restaurants || []).filter((r: any) => r.subscriptionStatus === "active").length;
                    const trialSubs = (restaurants || []).filter((r: any) => r.subscriptionStatus === "trial").length;
                    const expiredSubs = (restaurants || []).filter((r: any) => r.subscriptionStatus === "expired").length;
                    
                    return {
                        totalIncome,
                        totalExpense,
                        netProfit,
                        activeSubs,
                        trialSubs,
                        expiredSubs,
                    };
                }, options);
            }
        },
        getAll: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(["billingRestaurants"], async () => {
                    const isAdm = await isAdmin();
                    if (!isAdm) throw new Error("Unauthorized");
                    
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .select("id, name, planName, subscriptionStatus, subscriptionExpiresAt, trialEndsAt")
                        .order("createdAt", { ascending: false });
                    if (error) throw error;
                    return data || [];
                }, options);
            }
        },
        getHistory: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(["billingHistory", input.restaurantId], async () => {
                    const isAdm = await isAdmin();
                    const userId = await getCurrentUserId();
                    if (!isAdm && userId.startsWith("restaurant:")) {
                        const ownerRestId = userId.replace("restaurant:", "");
                        if (ownerRestId !== input.restaurantId) {
                            throw new Error("Unauthorized");
                        }
                    }
                    
                    const { data, error } = await supabase
                        .from("BillingTransaction")
                        .select("*")
                        .eq("restaurantId", input.restaurantId)
                        .order("createdAt", { ascending: false });
                    if (error) throw error;
                    return data || [];
                }, options);
            }
        },
        updateSubscription: {
            useMutation: <TData = any, TError = Error, TVariables = {
                restaurantId: string;
                planName: string;
                subscriptionStatus: string;
                subscriptionExpiresAt: string | null;
                trialEndsAt: string | null;
                recordPayment?: boolean;
                paymentAmount?: number;
                paymentMethod?: string;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const isAdm = await isAdmin();
                    if (!isAdm) throw new Error("Unauthorized");
                    
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .update({
                            planName: input.planName,
                            subscriptionStatus: input.subscriptionStatus,
                            subscriptionExpiresAt: input.subscriptionExpiresAt,
                            trialEndsAt: input.trialEndsAt,
                            updatedAt: new Date().toISOString()
                        })
                        .eq("id", input.restaurantId)
                        .select()
                        .single();
                    if (error) throw error;
                    
                    if (input.recordPayment && input.paymentAmount && input.paymentAmount > 0) {
                        const txId = nanoid(24);
                        const { error: txErr } = await supabase
                            .from("BillingTransaction")
                            .insert([{
                                id: txId,
                                restaurantId: input.restaurantId,
                                amount: input.paymentAmount,
                                type: "income",
                                method: input.paymentMethod || "Cash",
                                description: `Subscription Payment for ${input.planName}`,
                                createdAt: new Date().toISOString()
                            }]);
                        if (txErr) throw txErr;
                    } else {
                        const txId = nanoid(24);
                        const { error: txErr } = await supabase
                            .from("BillingTransaction")
                            .insert([{
                                id: txId,
                                restaurantId: input.restaurantId,
                                amount: 0.0,
                                type: "system",
                                method: "System",
                                description: `Subscription settings updated (Plan: ${input.planName}, Status: ${input.subscriptionStatus})`,
                                createdAt: new Date().toISOString()
                            }]);
                        if (txErr) throw txErr;
                    }
                    
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables: any, context) => {
                        queryClient.invalidateQueries(["billingSummary"]);
                        queryClient.invalidateQueries(["billingRestaurants"]);
                        queryClient.invalidateQueries(["billingHistory", variables.restaurantId]);
                        queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    }
                });
            }
        },
        enterTransaction: {
            useMutation: <TData = any, TError = Error, TVariables = {
                restaurantId: string;
                amount: number;
                type: "income" | "expense";
                method: string;
                description: string;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const isAdm = await isAdmin();
                    if (!isAdm) throw new Error("Unauthorized");
                    
                    const txId = nanoid(24);
                    const finalAmount = input.type === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);
                    
                    const { data, error } = await supabase
                        .from("BillingTransaction")
                        .insert([{
                            id: txId,
                            restaurantId: input.restaurantId,
                            amount: finalAmount,
                            type: input.type,
                            method: input.method,
                            description: input.description,
                            createdAt: new Date().toISOString()
                        }])
                        .select()
                        .single();
                    if (error) throw error;
                    
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables: any, context) => {
                        queryClient.invalidateQueries(["billingSummary"]);
                        queryClient.invalidateQueries(["billingRestaurants"]);
                        queryClient.invalidateQueries(["billingHistory", variables.restaurantId]);
                        queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    }
                });
            }
        }
    },
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
        importMenu: {
            useMutation: <TData = any, TError = Error, TVariables = {
                restaurantId: string;
                menuData: {
                    menuName: string;
                    availableTime: string;
                    categories: {
                        name: string;
                        items: {
                            name: string;
                            description: string;
                            price: string;
                            imageUrl?: string;
                        }[];
                    }[];
                };
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    const menuId = nanoid(24);

                    // 1. Get last menu position
                    const { data: lastMenus } = await supabase
                        .from("Menu")
                        .select("position")
                        .eq("restaurantId", input.restaurantId)
                        .order("position", { ascending: false })
                        .limit(1);
                    const menuPosition = lastMenus && lastMenus[0] ? (lastMenus[0].position || 0) + 1 : 0;

                    // 2. Create the menu
                    const newMenu = {
                        id: menuId,
                        userId,
                        name: input.menuData.menuName || "Imported Menu",
                        availableTime: input.menuData.availableTime || "All Day",
                        position: menuPosition,
                        restaurantId: input.restaurantId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    const { data: menuResult, error: menuErr } = await supabase
                        .from("Menu")
                        .insert([newMenu])
                        .select()
                        .single();
                    if (menuErr) throw menuErr;

                    // 3. Create Categories and their MenuItems
                    if (input.menuData.categories && Array.isArray(input.menuData.categories)) {
                        for (let c = 0; c < input.menuData.categories.length; c++) {
                            const catInput = input.menuData.categories[c];
                            const catId = nanoid(24);

                            const newCat = {
                                id: catId,
                                userId,
                                name: catInput.name || `Category ${c + 1}`,
                                position: c,
                                menuId: menuId,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            };
                            const { error: catErr } = await supabase
                                .from("Category")
                                .insert([newCat]);
                            if (catErr) throw catErr;

                            if (catInput.items && Array.isArray(catInput.items)) {
                                const newItems = [];
                                for (let i = 0; i < catInput.items.length; i++) {
                                    const itemInput = catInput.items[i];
                                    const itemId = nanoid(24);
                                    let imageId = null;

                                    if (itemInput.imageUrl && itemInput.imageUrl.trim().startsWith("http")) {
                                        const imgId = nanoid(24);
                                        const { error: imgErr } = await supabase
                                            .from("Image")
                                            .insert([{
                                                id: imgId,
                                                path: itemInput.imageUrl.trim(),
                                                blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
                                                color: "#eaeaea"
                                            }]);
                                        if (!imgErr) {
                                            imageId = imgId;
                                        }
                                    }

                                    newItems.push({
                                        id: itemId,
                                        userId,
                                        name: itemInput.name || `Item ${i + 1}`,
                                        description: itemInput.description || "",
                                        price: String(itemInput.price || "0.00"),
                                        position: i,
                                        categoryId: catId,
                                        imageId: imageId,
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                    });
                                }
                                if (newItems.length > 0) {
                                    const { error: itemsErr } = await supabase
                                        .from("MenuItem")
                                        .insert(newItems);
                                    if (itemsErr) throw itemsErr;
                                }
                            }
                        }
                    }
                    return menuResult;
                }, {
                    ...options,
                    onSuccess: (data, variables: any, context) => {
                        queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                        queryClient.invalidateQueries(["menus", variables.restaurantId]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    }
                });
            }
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
        get: {
            useQuery: <TData = MenuItem & { image: Image | null }, TError = Error>(input: { id: string }, options?: any) => {
                return useQuery<TData, TError>(["menuItem", input.id], async () => {
                    if (!input.id) throw new Error("Item ID is required");
                    const { data: item, error: iErr } = await supabase
                        .from("MenuItem")
                        .select("*")
                        .eq("id", input.id)
                        .single();
                    if (iErr || !item) throw iErr || new Error("Menu item not found");

                    let image = null;
                    if (item.imageId) {
                        const { data: img } = await supabase
                            .from("Image")
                            .select("*")
                            .eq("id", item.imageId)
                            .single();
                        image = img;
                    }

                    return {
                        ...item,
                        image
                    } as any;
                }, {
                    enabled: !!input.id,
                    ...options,
                });
            }
        },
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
            useMutation: <TData = Restaurant & { image: Image | null }, TError = Error, TVariables = {
                name: string;
                location: string;
                contactNo: string;
                imageBase64: string;
                ownerUsername?: string;
                ownerPassword?: string;
                isOwnerDisabled?: boolean;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    if (userId.startsWith("restaurant:")) {
                        throw new Error("Restaurant owners are not authorized to create restaurants");
                    }
                    const restaurantId = nanoid(24);
                    const isAdm = await isAdmin();

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

                    const trialDurationDays = 14;
                    const trialEndsAt = new Date();
                    trialEndsAt.setDate(trialEndsAt.getDate() + trialDurationDays);

                    const newRestaurant: any = {
                        id: restaurantId,
                        userId,
                        name: input.name,
                        location: input.location,
                        contactNo: input.contactNo,
                        isPublished: false,
                        imageId: imgId,
                        planName: "Free Trial",
                        subscriptionStatus: "trial",
                        subscriptionExpiresAt: trialEndsAt.toISOString(),
                        trialEndsAt: trialEndsAt.toISOString(),
                        balance: 0.0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    if (isAdm) {
                        newRestaurant.ownerUsername = input.ownerUsername || null;
                        newRestaurant.ownerPassword = input.ownerPassword || null;
                        newRestaurant.isOwnerDisabled = input.isOwnerDisabled || false;
                    }

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
                    const userId = await getCurrentUserId();
                    if (userId.startsWith("restaurant:")) {
                        throw new Error("Restaurant owners are not authorized to delete restaurants");
                    }
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
                    const userId = await getCurrentUserId();
                    const isAdm = await isAdmin();
                    if (!isAdm && userId.startsWith("restaurant:")) {
                        const ownerRestId = userId.replace("restaurant:", "");
                        if (ownerRestId !== input.id) {
                            throw new Error("Unauthorized access to this restaurant");
                        }
                    }
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
                    const isAdm = await isAdmin();
                    let query = supabase.from("Restaurant").select("*, image:Image!fk_restaurant_image(*)");
                    if (!isAdm) {
                        if (userId.startsWith("restaurant:")) {
                            const actualId = userId.replace("restaurant:", "");
                            query = query.eq("id", actualId);
                        } else {
                            query = query.eq("userId", userId);
                        }
                    }
                    const { data, error } = await query;
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
                        .eq("isPublished", true)
                        .eq("isSuspended", false);
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
        setSuspended: {
            useMutation: <TData = Restaurant, TError = Error, TVariables = { id: string; isSuspended: boolean }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    const isAdm = await isAdmin();
                    if (!isAdm) {
                        throw new Error("Only admins can suspend or activate restaurants");
                    }
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .update({ isSuspended: input.isSuspended, updatedAt: new Date().toISOString() })
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
        clone: {
            useMutation: <TData = { id: string; name: string }, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const isAdm = await isAdmin();
                    if (!isAdm) {
                        throw new Error("Only admins can clone restaurants");
                    }
                    
                    // 1. Fetch full details of the original restaurant
                    const originalDetails = await fetchRestaurantDetails(input.id);
                    
                    // 2. Insert new profile image if it exists
                    let newImageId = null;
                    if (originalDetails.image) {
                        newImageId = nanoid(24);
                        const { error: imgErr } = await supabase
                            .from("Image")
                            .insert([{
                                id: newImageId,
                                path: originalDetails.image.path,
                                blurHash: originalDetails.image.blurHash,
                                color: originalDetails.image.color,
                            }]);
                        if (imgErr) throw imgErr;
                    }
                    
                    // 3. Create the cloned Restaurant
                    const newRestaurantId = nanoid(24);
                    const newRestaurant = {
                        id: newRestaurantId,
                        userId: originalDetails.userId,
                        name: `${originalDetails.name} (Cloned)`,
                        location: originalDetails.location,
                        contactNo: originalDetails.contactNo,
                        isPublished: false,
                        isSuspended: originalDetails.isSuspended || false,
                        isOwnerDisabled: originalDetails.isOwnerDisabled || false,
                        imageId: newImageId,
                        ownerUsername: originalDetails.ownerUsername ? `clone-${nanoid(4)}-${originalDetails.ownerUsername}` : null,
                        ownerPassword: originalDetails.ownerPassword || null,
                        planName: (originalDetails as any).planName || "Free Trial",
                        subscriptionStatus: (originalDetails as any).subscriptionStatus || "trial",
                        subscriptionExpiresAt: (originalDetails as any).subscriptionExpiresAt || null,
                        trialEndsAt: (originalDetails as any).trialEndsAt || null,
                        balance: (originalDetails as any).balance || 0.0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    
                    const { error: rErr } = await supabase
                        .from("Restaurant")
                        .insert([newRestaurant]);
                    if (rErr) throw rErr;
                    
                    // 4. Duplicate associated Banners
                    if (originalDetails.banners && originalDetails.banners.length > 0) {
                        const newBanners = originalDetails.banners.map((b: any) => ({
                            id: nanoid(24),
                            path: b.path,
                            blurHash: b.blurHash,
                            color: b.color,
                            restaurantId: newRestaurantId,
                        }));
                        const { error: bErr } = await supabase
                            .from("Image")
                            .insert(newBanners);
                        if (bErr) throw bErr;
                    }
                    
                    // 5. Duplicate Menus, Categories, and MenuItems
                    if (originalDetails.menus && originalDetails.menus.length > 0) {
                        for (const menu of originalDetails.menus) {
                            const newMenuId = nanoid(24);
                            const { error: mErr } = await supabase
                                .from("Menu")
                                .insert([{
                                    id: newMenuId,
                                    userId: menu.userId,
                                    name: menu.name,
                                    availableTime: menu.availableTime,
                                    position: menu.position,
                                    restaurantId: newRestaurantId,
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                }]);
                            if (mErr) throw mErr;
                            
                            if (menu.categories && menu.categories.length > 0) {
                                for (const cat of menu.categories) {
                                    const newCatId = nanoid(24);
                                    const { error: cErr } = await supabase
                                        .from("Category")
                                        .insert([{
                                            id: newCatId,
                                            userId: cat.userId,
                                            name: cat.name,
                                            position: cat.position,
                                            menuId: newMenuId,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                        }]);
                                    if (cErr) throw cErr;
                                    
                                    if (cat.items && cat.items.length > 0) {
                                        for (const item of cat.items) {
                                            const newItemId = nanoid(24);
                                            
                                            // Duplicate item image if it exists
                                            let newItemImageId = null;
                                            if (item.image) {
                                                newItemImageId = nanoid(24);
                                                const { error: itemImgErr } = await supabase
                                                    .from("Image")
                                                    .insert([{
                                                        id: newItemImageId,
                                                        path: item.image.path,
                                                        blurHash: item.image.blurHash,
                                                        color: item.image.color,
                                                    }]);
                                                if (itemImgErr) throw itemImgErr;
                                            }
                                            
                                            const { error: miErr } = await supabase
                                                .from("MenuItem")
                                                .insert([{
                                                    id: newItemId,
                                                    userId: item.userId,
                                                    name: item.name,
                                                    description: item.description,
                                                    price: item.price,
                                                    position: item.position,
                                                    categoryId: newCatId,
                                                    imageId: newItemImageId,
                                                    createdAt: new Date().toISOString(),
                                                    updatedAt: new Date().toISOString(),
                                                }]);
                                            if (miErr) throw miErr;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    return { id: newRestaurantId, name: newRestaurant.name } as any;
                }, {
                    ...options,
                    onSuccess: (data, variables, context) => {
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
                ownerUsername?: string;
                ownerPassword?: string;
                isOwnerDisabled?: boolean;
                userId?: string;
            }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const userId = await getCurrentUserId();
                    if (userId.startsWith("restaurant:")) {
                        throw new Error("Restaurant owners are not authorized to update restaurant settings");
                    }
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

                    const isAdm = await isAdmin();
                    const updateData: any = {
                        name: input.name,
                        location: input.location,
                        contactNo: input.contactNo,
                        imageId,
                        updatedAt: new Date().toISOString(),
                    };

                    if (isAdm) {
                        updateData.ownerUsername = input.ownerUsername || null;
                        updateData.ownerPassword = input.ownerPassword || null;
                        updateData.isOwnerDisabled = input.isOwnerDisabled || false;
                        if (input.userId) {
                            updateData.userId = input.userId;
                        }
                    }

                    const { data, error } = await supabase
                        .from("Restaurant")
                        .update(updateData)
                        .eq("id", input.id)
                        .select("*, image:Image!fk_restaurant_image(*)")
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
        renewWithCredits: {
            useMutation: <TData = any, TError = Error, TVariables = { restaurantId: string; planName: "Basic Plan" | "Premium Plan" }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const cost = input.planName === "Premium Plan" ? 40.0 : 15.0;
                    
                    const { data: currentRest, error: fetchErr } = await supabase
                        .from("Restaurant")
                        .select("balance, subscriptionExpiresAt, subscriptionStatus")
                        .eq("id", input.restaurantId)
                        .single();
                    if (fetchErr) throw fetchErr;
                    
                    if ((currentRest.balance || 0.0) < cost) {
                        throw new Error(`Insufficient balance. Plan cost is ${cost} credits, but current balance is ${currentRest.balance || 0.0} credits.`);
                    }
                    
                    let expiryDate = currentRest.subscriptionExpiresAt ? new Date(currentRest.subscriptionExpiresAt) : new Date();
                    if (new Date() > expiryDate) {
                        expiryDate = new Date();
                    }
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    
                    const newBalance = (currentRest.balance || 0.0) - cost;
                    const { data, error } = await supabase
                        .from("Restaurant")
                        .update({
                            planName: input.planName,
                            subscriptionStatus: "active",
                            subscriptionExpiresAt: expiryDate.toISOString(),
                            balance: newBalance,
                            updatedAt: new Date().toISOString()
                        })
                        .eq("id", input.restaurantId)
                        .select()
                        .single();
                    if (error) throw error;
                    
                    const txId = nanoid(24);
                    const { error: txErr } = await supabase
                        .from("BillingTransaction")
                        .insert([{
                            id: txId,
                            restaurantId: input.restaurantId,
                            amount: -cost,
                            type: "plan_renewal",
                            method: "Credit Balance",
                            description: `Renewed ${input.planName} using credits`,
                            createdAt: new Date().toISOString()
                        }]);
                    if (txErr) throw txErr;
                    
                    return data;
                }, {
                    ...options,
                    onSuccess: (data, variables: any, context) => {
                        queryClient.invalidateQueries(["billingSummary"]);
                        queryClient.invalidateQueries(["billingRestaurants"]);
                        queryClient.invalidateQueries(["billingHistory", variables.restaurantId]);
                        queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                        queryClient.invalidateQueries(["restaurants"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    }
                });
            }
        }
    },
    feedback: {
        getByMenuItem: {
            useQuery: (input: { menuItemId: string }, options?: any) => {
                return useQuery(["feedback", input.menuItemId], async () => {
                    const { data, error } = await supabase
                        .from("Feedback")
                        .select("*")
                        .eq("menuItemId", input.menuItemId)
                        .order("createdAt", { ascending: false });
                    if (error) throw error;
                    return data || [];
                }, options);
            },
        },
        create: {
            useMutation: <TData = any, TError = Error, TVariables = { menuItemId: string; rating: number; comment: string; reviewerName: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    // Use server-side API route to bypass Supabase RLS for public feedback submissions
                    const response = await fetch("/api/feedback/submit", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            menuItemId: input.menuItemId,
                            rating: input.rating,
                            comment: input.comment,
                            reviewerName: input.reviewerName || "Anonymous",
                        }),
                    });
                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(result?.error || "Failed to submit feedback");
                    }
                    return result.data;
                }, {
                    ...options,
                    onSuccess: (data: any, variables: any, context: any) => {
                        queryClient.invalidateQueries(["feedback", variables.menuItemId]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        reply: {
            useMutation: <TData = any, TError = Error, TVariables = { feedbackId: string; ownerResponse: string; menuItemId: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data, error } = await supabase
                        .from("Feedback")
                        .update({ ownerResponse: input.ownerResponse })
                        .eq("id", input.feedbackId)
                        .select()
                        .single();
                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data: any, variables: any, context: any) => {
                        queryClient.invalidateQueries(["feedback", variables.menuItemId]);
                        queryClient.invalidateQueries(["feedbackByRestaurant"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        delete: {
            useMutation: <TData = any, TError = Error, TVariables = { id: string; menuItemId: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const { data, error } = await supabase
                        .from("Feedback")
                        .delete()
                        .eq("id", input.id)
                        .select()
                        .single();
                    if (error) throw error;
                    return data;
                }, {
                    ...options,
                    onSuccess: (data: any, variables: any, context: any) => {
                        queryClient.invalidateQueries(["feedback", variables.menuItemId]);
                        queryClient.invalidateQueries(["feedbackByRestaurant"]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                });
            },
        },
        getByRestaurant: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(["feedbackByRestaurant", input.restaurantId], async () => {
                    // 1. Get menus
                    const { data: menus } = await supabase
                        .from("Menu")
                        .select("id")
                        .eq("restaurantId", input.restaurantId);
                    if (!menus || menus.length === 0) return [];
                    
                    // 2. Get categories
                    const menuIds = menus.map((m: any) => m.id);
                    const { data: categories } = await supabase
                        .from("Category")
                        .select("id")
                        .in("menuId", menuIds);
                    if (!categories || categories.length === 0) return [];
                    
                    // 3. Get menu items
                    const categoryIds = categories.map((c: any) => c.id);
                    const { data: items } = await supabase
                        .from("MenuItem")
                        .select("id, name")
                        .in("categoryId", categoryIds);
                    if (!items || items.length === 0) return [];
                    
                    // 4. Get feedbacks
                    const itemIds = items.map((i: any) => i.id);
                    const { data: feedbacks, error } = await supabase
                        .from("Feedback")
                        .select("*")
                        .in("menuItemId", itemIds)
                        .order("createdAt", { ascending: false });
                    if (error) throw error;
                    
                    return (feedbacks || []).map((fb: any) => ({
                        ...fb,
                        menuItem: items.find((i: any) => i.id === fb.menuItemId) || null
                    }));
                }, options);
            }
        }
    },
    analytics: {
        logView: {
            useMutation: <TData = any, TError = Error, TVariables = { restaurantId: string; type: "page_view" | "item_click"; menuItemId?: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(async (input: any) => {
                    const id = nanoid(24);
                    const newLog = {
                        id,
                        restaurantId: input.restaurantId,
                        type: input.type,
                        menuItemId: input.menuItemId || null,
                        createdAt: new Date().toISOString()
                    };
                    const { data, error } = await supabase
                        .from("MenuAnalytics")
                        .insert([newLog])
                        .select()
                        .single();
                    if (error) {
                        console.error("[Analytics] Failed to log event:", error.message, error.details);
                        throw error;
                    }
                    return data;
                }, {
                    ...options,
                    onSuccess: (data: any, variables: any, context: any) => {
                        queryClient.invalidateQueries(["analyticsStats", variables.restaurantId]);
                        if (options?.onSuccess) options.onSuccess(data, variables, context);
                    },
                    onError: (error: any) => {
                        console.error("[Analytics] Mutation error:", error?.message);
                        // Don't surface to user — analytics failures are non-critical
                        if (options?.onError) options.onError(error);
                    }
                });
            }
        },
        getStats: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(["analyticsStats", input.restaurantId], async () => {
                    const { data: logs, error } = await supabase
                        .from("MenuAnalytics")
                        .select("*")
                        .eq("restaurantId", input.restaurantId);
                    if (error) throw error;

                    const { data: menus } = await supabase
                        .from("Menu")
                        .select("id")
                        .eq("restaurantId", input.restaurantId);
                    
                    let items: any[] = [];
                    if (menus && menus.length > 0) {
                        const { data: categories } = await supabase
                            .from("Category")
                            .select("id")
                            .in("menuId", menus.map((m: any) => m.id));
                        if (categories && categories.length > 0) {
                            const { data: fetchedItems } = await supabase
                                .from("MenuItem")
                                .select("id, name, price")
                                .in("categoryId", categories.map((c: any) => c.id));
                            items = fetchedItems || [];
                        }
                    }

                    const safeLogs = logs || [];
                    const pageViews = safeLogs.filter((l: any) => l.type === "page_view");
                    const itemClicks = safeLogs.filter((l: any) => l.type === "item_click");

                    // 1. Daily views (last 7 days)
                    const dailyViewsMap: Record<string, number> = {};
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toISOString().split("T")[0]!;
                        dailyViewsMap[dateStr] = 0;
                    }

                    pageViews.forEach((l: any) => {
                        const dateStr = l.createdAt.split("T")[0];
                        if (dailyViewsMap[dateStr] !== undefined) {
                            dailyViewsMap[dateStr] += 1;
                        }
                    });

                    const dailyViews = Object.entries(dailyViewsMap).map(([date, count]) => ({
                        date,
                        count
                    }));

                    // 2. Popular items
                    const itemClickCounts: Record<string, number> = {};
                    itemClicks.forEach((l: any) => {
                        if (l.menuItemId) {
                            itemClickCounts[l.menuItemId] = (itemClickCounts[l.menuItemId] || 0) + 1;
                        }
                    });

                    const popularItems = Object.entries(itemClickCounts)
                        .map(([itemId, count]) => {
                            const item = items.find((i: any) => i.id === itemId);
                            return {
                                id: itemId,
                                name: item ? item.name : "Unknown Item",
                                price: item ? item.price : "0.00",
                                count
                            };
                        })
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    return {
                        totalPageViews: pageViews.length,
                        totalItemClicks: itemClicks.length,
                        dailyViews,
                        popularItems
                    };
                }, options);
            }
        }
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
            if (domain === "feedback") {
                if (method === "getByMenuItem") return ["feedback", variables?.menuItemId || variables];
                if (method === "getByRestaurant") return ["feedbackByRestaurant", variables?.restaurantId || variables];
            }
            if (domain === "analytics") {
                if (method === "getStats") return ["analyticsStats", variables?.restaurantId || variables];
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
