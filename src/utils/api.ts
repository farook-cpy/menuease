/* eslint-disable no-await-in-loop, no-restricted-syntax */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";

import type { Category, Image, Menu, MenuItem, Restaurant } from "@prisma/client";

import { deleteFile, encodeImageToBlurhash, getColor, rgba2hex, supabase, uploadImage } from "./supabaseClient";

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
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User is not authenticated");
    return user.id;
};

// Helper to write compressed audit logs to Supabase
const writeAuditLog = async (restaurantId: string, actionCode: string, payload: string) => {
    try {
        const userId = await getCurrentUserId().catch(() => null);
        const { error } = await supabase.from("AuditLog").insert([{
            id: nanoid(24),
            restaurantId,
            actionCode,
            payload,
            userId,
            createdAt: new Date().toISOString()
        }]);
        if (error) console.error("Failed to write audit log:", error);
    } catch (e) {
        console.error("Failed to write audit log:", e);
    }
};

const getAdminRole = async () => {
    if (typeof window !== "undefined") {
        const ownerSessionStr = localStorage.getItem("owner_session");
        if (ownerSessionStr) {
            return null;
        }
    }
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    if (user.email === "farookisop@gmail.com") return "Super Admin";

    const { data: admin } = await supabase.from("AdminUser").select("role").eq("email", user.email).single();
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
export const fetchRestaurantDetails = async (id: string) => {
    let userId = null;
    try {
        userId = await getCurrentUserId();
    } catch (e) {
        // Not authenticated, which is normal for public customers
    }
    const isAdm = await isAdmin();
    if (userId && !isAdm && userId.startsWith("restaurant:")) {
        const ownerRestId = userId.replace("restaurant:", "");
        if (ownerRestId !== id) {
            throw new Error("Unauthorized access to this restaurant details");
        }
    }
    const { data: restaurant, error: rErr } = await supabase.from("Restaurant").select("*").eq("id", id).single();
    if (rErr || !restaurant) throw rErr || new Error("Restaurant not found");

    let image = null;
    if (restaurant.imageId) {
        const { data: img } = await supabase.from("Image").select("*").eq("id", restaurant.imageId).single();
        image = img;
    }

    const { data: banners } = await supabase.from("Image").select("*").eq("restaurantId", id);

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
        const { data: itemImages } = await supabase.from("Image").select("*").in("id", itemImageIds);
        itemImagesList = itemImages || [];
    }

    let additionalImagesList: any[] = [];
    const itemIds = itemsList.map((i: any) => i.id);
    if (itemIds.length > 0) {
        const { data: addImages } = await supabase.from("Image").select("*").in("menuItemId", itemIds);
        additionalImagesList = addImages || [];
    }

    const itemsMap = itemsList.map((item: any) => {
        const primaryImage = itemImagesList.find((img: any) => img.id === item.imageId) || null;
        const itemAdditionalImages = additionalImagesList.filter((img: any) => img.menuItemId === item.id);

        return {
            ...item,
            image: primaryImage,
            images: [...(primaryImage ? [primaryImage] : []), ...itemAdditionalImages],
        };
    });

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
        createAdmin: {
            useMutation: <TData = any, TError = Error, TVariables = { email: string; role: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const isSuper = await isSuperAdmin();
                        if (!isSuper) throw new Error("Unauthorized");

                        const id = Math.random().toString(36).substring(2, 15);
                        const { data, error } = await supabase
                            .from("AdminUser")
                            .insert([{ createdAt: new Date().toISOString(), email: input.email, id, role: input.role }])
                            .select()
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["adminUsers"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        deleteAdmin: {
            useMutation: <TData = any, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["adminUsers"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getAdmins: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(
                    ["adminUsers"],
                    async () => {
                        const isSuper = await isSuperAdmin();
                        if (!isSuper) throw new Error("Unauthorized");
                        const { data, error } = await supabase
                            .from("AdminUser")
                            .select("*")
                            .order("createdAt", { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        getLoginLogs: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(
                    ["loginLogs"],
                    async () => {
                        const isSuper = await isSuperAdmin();
                        if (!isSuper) throw new Error("Unauthorized");
                        const { data, error } = await supabase
                            .from("LoginLog")
                            .select("*")
                            .order("createdAt", { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        getRole: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(
                    ["adminRole"],
                    async () => {
                        return getAdminRole();
                    },
                    options
                );
            },
        },
    },
    analytics: {
        getStats: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["analyticsStats", input.restaurantId],
                    async () => {
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
                        let categoriesList: any[] = [];
                        if (menus && menus.length > 0) {
                            const { data: categories } = await supabase
                                .from("Category")
                                .select("id, name")
                                .in(
                                    "menuId",
                                    menus.map((m: any) => m.id)
                                );
                            categoriesList = categories || [];
                            if (categoriesList.length > 0) {
                                const { data: fetchedItems } = await supabase
                                    .from("MenuItem")
                                    .select("id, name, price, categoryId")
                                    .in(
                                        "categoryId",
                                        categoriesList.map((c: any) => c.id)
                                    );
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
                            count,
                            date,
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
                                    count,
                                    id: itemId,
                                    name: item ? item.name : "Unknown Item",
                                    price: item ? item.price : "0.00",
                                };
                            })
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 5);

                        // 3. Most Viewed Dish
                        const mostViewedDish = popularItems.length > 0 ? popularItems[0] : null;

                        // 4. Most Clicked Category
                        const categoryClickCounts: Record<string, number> = {};
                        itemClicks.forEach((l: any) => {
                            if (l.menuItemId) {
                                const item = items.find((i: any) => i.id === l.menuItemId);
                                if (item && item.categoryId) {
                                    categoryClickCounts[item.categoryId] =
                                        (categoryClickCounts[item.categoryId] || 0) + 1;
                                }
                            }
                        });
                        const categoryClicks = Object.entries(categoryClickCounts)
                            .map(([catId, count]) => {
                                const cat = categoriesList.find((c: any) => c.id === catId);
                                return {
                                    count,
                                    id: catId,
                                    name: cat ? cat.name : "Unknown Category",
                                };
                            })
                            .sort((a, b) => b.count - a.count);
                        const mostClickedCategory = categoryClicks.length > 0 ? categoryClicks[0] : null;

                        // 5. Peak Viewing Hours (busiest hours based on page views)
                        const hourCounts: Record<number, number> = {};
                        for (let h = 0; h < 24; h++) {
                            hourCounts[h] = 0;
                        }
                        pageViews.forEach((l: any) => {
                            try {
                                const date = new Date(l.createdAt);
                                const hour = date.getHours();
                                if (hour >= 0 && hour < 24) {
                                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                                }
                            } catch (e) {
                                console.error("Failed to parse createdAt date for peak hours:", l.createdAt, e);
                            }
                        });
                        const peakHours = Object.entries(hourCounts).map(([hour, count]) => ({
                            count,
                            hour: Number(hour),
                        }));

                        // 6. Device Type Stats
                        const deviceCounts = {
                            Desktop: 0,
                            Mobile: 0,
                            Tablet: 0,
                            Unknown: 0,
                        };
                        safeLogs.forEach((l: any) => {
                            const device = l.deviceType || "Unknown";
                            const normalizedDevice =
                                device.toLowerCase() === "mobile"
                                    ? "Mobile"
                                    : device.toLowerCase() === "tablet"
                                    ? "Tablet"
                                    : device.toLowerCase() === "desktop"
                                    ? "Desktop"
                                    : "Unknown";
                            deviceCounts[normalizedDevice] += 1;
                        });

                        return {
                            dailyViews,
                            deviceStats: deviceCounts,
                            mostClickedCategory,
                            mostViewedDish,
                            peakHours,
                            popularItems,
                            totalItemClicks: itemClicks.length,
                            totalPageViews: pageViews.length,
                        };
                    },
                    options
                );
            },
        },
        logView: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    restaurantId: string;
                    type: "page_view" | "item_click";
                    menuItemId?: string;
                    deviceType?: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const id = nanoid(24);
                        const newLog: any = {
                            createdAt: new Date().toISOString(),
                            deviceType: input.deviceType || "Unknown",
                            id,
                            menuItemId: input.menuItemId || null,
                            restaurantId: input.restaurantId,
                            type: input.type,
                        };

                        let { data, error } = await supabase.from("MenuAnalytics").insert([newLog]).select().single();

                        if (error && error.code === "PGRST204" && error.message?.includes("deviceType")) {
                            console.warn("[Analytics] 'deviceType' column not found in database. Retrying without it.");
                            const fallbackLog = { ...newLog };
                            delete fallbackLog.deviceType;
                            const retry = await supabase.from("MenuAnalytics").insert([fallbackLog]).select().single();
                            data = retry.data;
                            error = retry.error;
                        }

                        if (error) {
                            console.error("[Analytics] Failed to log event:", error.message, error.details);
                            throw error;
                        }
                        return data;
                    },
                    {
                        ...options,
                        onError: (error: any) => {
                            console.error("[Analytics] Mutation error:", error?.message);
                            // Don't surface to user — analytics failures are non-critical
                            if (options?.onError) options.onError(error);
                        },
                        onSuccess: (data: any, variables: any, context: any) => {
                            queryClient.invalidateQueries(["analyticsStats", variables.restaurantId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    billing: {
        enterTransaction: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    restaurantId: string;
                    amount: number;
                    type: "income" | "expense";
                    method: string;
                    description: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const isAdm = await isAdmin();
                        if (!isAdm) throw new Error("Unauthorized");

                        const txId = nanoid(24);
                        const finalAmount = input.type === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount);

                        const { data, error } = await supabase
                            .from("BillingTransaction")
                            .insert([
                                {
                                    amount: finalAmount,
                                    createdAt: new Date().toISOString(),
                                    description: input.description,
                                    id: txId,
                                    method: input.method,
                                    restaurantId: input.restaurantId,
                                    type: input.type,
                                },
                            ])
                            .select()
                            .single();
                        if (error) throw error;

                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["billingSummary"]);
                            queryClient.invalidateQueries(["billingRestaurants"]);
                            queryClient.invalidateQueries(["billingHistory", variables.restaurantId]);
                            queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getAll: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(
                    ["billingRestaurants"],
                    async () => {
                        const isAdm = await isAdmin();
                        if (!isAdm) throw new Error("Unauthorized");

                        const { data, error } = await supabase
                            .from("Restaurant")
                            .select(
                                "id, name, planName, subscriptionStatus, subscriptionExpiresAt, trialEndsAt, currency, isOrderFeatureEnabled, whatsappNo, isKitchenEnabled"
                            )
                            .order("createdAt", { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        getHistory: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["billingHistory", input.restaurantId],
                    async () => {
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
                    },
                    options
                );
            },
        },
        getSummary: {
            useQuery: (variables?: any, options?: any) => {
                return useQuery(
                    ["billingSummary"],
                    async () => {
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

                        const activeSubs = (restaurants || []).filter(
                            (r: any) => r.subscriptionStatus === "active"
                        ).length;
                        const trialSubs = (restaurants || []).filter(
                            (r: any) => r.subscriptionStatus === "trial"
                        ).length;
                        const expiredSubs = (restaurants || []).filter(
                            (r: any) => r.subscriptionStatus === "expired"
                        ).length;

                        return {
                            activeSubs,
                            expiredSubs,
                            netProfit,
                            totalExpense,
                            totalIncome,
                            trialSubs,
                        };
                    },
                    options
                );
            },
        },
        updateSubscription: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    restaurantId: string;
                    planName: string;
                    subscriptionStatus: string;
                    subscriptionExpiresAt: string | null;
                    trialEndsAt: string | null;
                    recordPayment?: boolean;
                    paymentAmount?: number;
                    paymentMethod?: string;
                    isOrderFeatureEnabled?: boolean;
                    whatsappNo?: string | null;
                    isKitchenEnabled?: boolean;
                    enterpriseFeatures?: string | null;
                    instagramUrl?: string | null;
                    facebookUrl?: string | null;
                    twitterUrl?: string | null;
                    youtubeUrl?: string | null;
                    tiktokUrl?: string | null;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const isAdm = await isAdmin();
                        if (!isAdm) throw new Error("Unauthorized");

                        const updateData: any = {
                            planName: input.planName,
                            subscriptionExpiresAt: input.subscriptionExpiresAt,
                            subscriptionStatus: input.subscriptionStatus,
                            trialEndsAt: input.trialEndsAt,
                            updatedAt: new Date().toISOString(),
                        };
                        if (input.isOrderFeatureEnabled !== undefined) {
                            updateData.isOrderFeatureEnabled = input.isOrderFeatureEnabled;
                        }
                        if (input.whatsappNo !== undefined) {
                            updateData.whatsappNo = input.whatsappNo;
                        }
                        if (input.isKitchenEnabled !== undefined) {
                            updateData.isKitchenEnabled = input.isKitchenEnabled;
                        }
                        if (input.enterpriseFeatures !== undefined) {
                            updateData.enterpriseFeatures = input.enterpriseFeatures;
                        }
                        if (input.instagramUrl !== undefined) {
                            updateData.instagramUrl = input.instagramUrl;
                        }
                        if (input.facebookUrl !== undefined) {
                            updateData.facebookUrl = input.facebookUrl;
                        }
                        if (input.twitterUrl !== undefined) {
                            updateData.twitterUrl = input.twitterUrl;
                        }
                        if (input.youtubeUrl !== undefined) {
                            updateData.youtubeUrl = input.youtubeUrl;
                        }
                        if (input.tiktokUrl !== undefined) {
                            updateData.tiktokUrl = input.tiktokUrl;
                        }

                        const { data, error } = await supabase
                            .from("Restaurant")
                            .update(updateData)
                            .eq("id", input.restaurantId)
                            .select()
                            .single();
                        if (error) throw error;

                        if (input.recordPayment && input.paymentAmount && input.paymentAmount > 0) {
                            const txId = nanoid(24);
                            const { error: txErr } = await supabase.from("BillingTransaction").insert([
                                {
                                    amount: input.paymentAmount,
                                    createdAt: new Date().toISOString(),
                                    description: `Subscription Payment for ${input.planName}`,
                                    id: txId,
                                    method: input.paymentMethod || "Cash",
                                    restaurantId: input.restaurantId,
                                    type: "income",
                                },
                            ]);
                            if (txErr) throw txErr;
                        } else {
                            const txId = nanoid(24);
                            const { error: txErr } = await supabase.from("BillingTransaction").insert([
                                {
                                    amount: 0.0,
                                    createdAt: new Date().toISOString(),
                                    description: `Subscription settings updated (Plan: ${input.planName}, Status: ${input.subscriptionStatus})`,
                                    id: txId,
                                    method: "System",
                                    restaurantId: input.restaurantId,
                                    type: "system",
                                },
                            ]);
                            if (txErr) throw txErr;
                        }

                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["billingSummary"]);
                            queryClient.invalidateQueries(["billingRestaurants"]);
                            queryClient.invalidateQueries(["billingHistory", variables.restaurantId]);
                            queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    category: {
        create: {
            useMutation: <TData = Category, TError = Error, TVariables = { name: string; menuId: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                            createdAt: new Date().toISOString(),
                            id,
                            menuId: input.menuId,
                            name: input.name,
                            position,
                            updatedAt: new Date().toISOString(),
                            userId,
                        };

                        const { data: menuData } = await supabase.from("Menu").select("restaurantId").eq("id", input.menuId).single();
                        const restaurantId = menuData?.restaurantId || "";

                        const { data, error } = await supabase.from("Category").insert([newCat]).select().single();

                        if (error) throw error;
                        if (restaurantId) {
                            await writeAuditLog(restaurantId, "CC", id + "|" + input.name);
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["categories"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        delete: {
            useMutation: <TData = Category, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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

                        const { data: catData } = await supabase.from("Category").select("name, menuId").eq("id", input.id).single();
                        const catName = catData?.name || "";
                        let restaurantId = "";
                        if (catData?.menuId) {
                            const { data: menuData } = await supabase.from("Menu").select("restaurantId").eq("id", catData.menuId).single();
                            restaurantId = menuData?.restaurantId || "";
                        }

                        const { data, error } = await supabase
                            .from("Category")
                            .delete()
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        if (restaurantId) {
                            await writeAuditLog(restaurantId, "CD", input.id + "|" + catName);
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["categories"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getAll: {
            useQuery: (input: { menuId: string }, options?: any) => {
                return useQuery(
                    ["categories", input.menuId],
                    async () => {
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
                    },
                    options
                );
            },
        },
        update: {
            useMutation: <TData = Category, TError = Error, TVariables = { id: string; name: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: catData } = await supabase.from("Category").select("name, menuId").eq("id", input.id).single();
                        const oldName = catData?.name || "";
                        let restaurantId = "";
                        if (catData?.menuId) {
                            const { data: menuData } = await supabase.from("Menu").select("restaurantId").eq("id", catData.menuId).single();
                            restaurantId = menuData?.restaurantId || "";
                        }

                        const { data, error } = await supabase
                            .from("Category")
                            .update({ name: input.name, updatedAt: new Date().toISOString() })
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        if (restaurantId && oldName !== input.name) {
                            await writeAuditLog(restaurantId, "CU", input.id + "|" + oldName + "|" + input.name);
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["categories"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        updatePosition: {
            useMutation: <
                TData = { id: string; newPosition: number }[],
                TError = Error,
                TVariables = { id: string; newPosition: number }[]
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        await Promise.all(
                            input.map((item: any) =>
                                supabase
                                    .from("Category")
                                    .update({ position: item.newPosition, updatedAt: new Date().toISOString() })
                                    .eq("id", item.id)
                            )
                        );
                        return input;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["categories"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    feedback: {
        create: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    menuItemId: string;
                    rating: number;
                    comment: string;
                    reviewerName: string;
                    imageBase64?: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        // Use server-side API route to bypass Supabase RLS for public feedback submissions
                        const response = await fetch("/api/feedback/submit", {
                            body: JSON.stringify({
                                comment: input.comment,
                                imageBase64: input.imageBase64,
                                menuItemId: input.menuItemId,
                                rating: input.rating,
                                reviewerName: input.reviewerName || "Anonymous",
                            }),
                            headers: { "Content-Type": "application/json" },
                            method: "POST",
                        });
                        const result = await response.json();
                        if (!response.ok) {
                            throw new Error(result?.error || "Failed to submit feedback");
                        }
                        return result.data;
                    },
                    {
                        ...options,
                        onSuccess: (data: any, variables: any, context: any) => {
                            queryClient.invalidateQueries(["feedback", variables.menuItemId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        delete: {
            useMutation: <TData = any, TError = Error, TVariables = { id: string; menuItemId: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data, error } = await supabase
                            .from("Feedback")
                            .delete()
                            .eq("id", input.id)
                            .select()
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data: any, variables: any, context: any) => {
                            queryClient.invalidateQueries(["feedback", variables.menuItemId]);
                            queryClient.invalidateQueries(["feedbackByRestaurant"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getByMenuItem: {
            useQuery: (input: { menuItemId: string }, options?: any) => {
                return useQuery(
                    ["feedback", input.menuItemId],
                    async () => {
                        const { data, error } = await supabase
                            .from("Feedback")
                            .select("*")
                            .eq("menuItemId", input.menuItemId)
                            .order("createdAt", { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        getByRestaurant: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["feedbackByRestaurant", input.restaurantId],
                    async () => {
                        // 1. Get menus
                        const { data: menus } = await supabase
                            .from("Menu")
                            .select("id")
                            .eq("restaurantId", input.restaurantId);
                        if (!menus || menus.length === 0) return [];

                        // 2. Get categories
                        const menuIds = menus.map((m: any) => m.id);
                        const { data: categories } = await supabase.from("Category").select("id").in("menuId", menuIds);
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
                            menuItem: items.find((i: any) => i.id === fb.menuItemId) || null,
                        }));
                    },
                    options
                );
            },
        },
        reply: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { feedbackId: string; ownerResponse: string; menuItemId: string }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data, error } = await supabase
                            .from("Feedback")
                            .update({ ownerResponse: input.ownerResponse })
                            .eq("id", input.feedbackId)
                            .select()
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data: any, variables: any, context: any) => {
                            queryClient.invalidateQueries(["feedback", variables.menuItemId]);
                            queryClient.invalidateQueries(["feedbackByRestaurant"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    menu: {
        create: {
            useMutation: <
                TData = Menu,
                TError = Error,
                TVariables = { name: string; availableTime: string; restaurantId: string }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                            availableTime: input.availableTime,
                            createdAt: new Date().toISOString(),
                            id,
                            name: input.name,
                            position,
                            restaurantId: input.restaurantId,
                            updatedAt: new Date().toISOString(),
                            userId,
                        };

                        const { data, error } = await supabase.from("Menu").insert([newMenu]).select().single();

                        if (error) throw error;
                        await writeAuditLog(input.restaurantId, "MC", id + "|" + input.name);
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["menus"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        delete: {
            useMutation: <TData = Menu, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        // Cascade delete categories
                        const { data: cats } = await supabase.from("Category").select("id").eq("menuId", input.id);

                        if (cats && cats.length > 0) {
                            await Promise.all(
                                cats.map(async (cat: any) => {
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
                                })
                            );
                        }

                        const { data: menuData } = await supabase.from("Menu").select("name, restaurantId").eq("id", input.id).single();
                        const menuName = menuData?.name || "";
                        const restaurantId = menuData?.restaurantId || "";

                        const { data, error } = await supabase
                            .from("Menu")
                            .delete()
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        if (restaurantId) {
                            await writeAuditLog(restaurantId, "MD", input.id + "|" + menuName);
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["menus"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getAll: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["menus", input.restaurantId],
                    async () => {
                        const { data, error } = await supabase
                            .from("Menu")
                            .select("*")
                            .eq("restaurantId", input.restaurantId)
                            .order("position", { ascending: true });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        importMenu: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
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
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                            availableTime: input.menuData.availableTime || "All Day",
                            createdAt: new Date().toISOString(),
                            id: menuId,
                            name: input.menuData.menuName || "Imported Menu",
                            position: menuPosition,
                            restaurantId: input.restaurantId,
                            updatedAt: new Date().toISOString(),
                            userId,
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
                                    createdAt: new Date().toISOString(),
                                    id: catId,
                                    menuId,
                                    name: catInput.name || `Category ${c + 1}`,
                                    position: c,
                                    updatedAt: new Date().toISOString(),
                                    userId,
                                };
                                const { error: catErr } = await supabase.from("Category").insert([newCat]);
                                if (catErr) throw catErr;

                                if (catInput.items && Array.isArray(catInput.items)) {
                                    const newItems = [];
                                    for (let i = 0; i < catInput.items.length; i++) {
                                        const itemInput = catInput.items[i];
                                        const itemId = nanoid(24);
                                        let imageId = null;

                                        if (itemInput.imageUrl && itemInput.imageUrl.trim().startsWith("http")) {
                                            const imgId = nanoid(24);
                                            const { error: imgErr } = await supabase.from("Image").insert([
                                                {
                                                    blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
                                                    color: "#eaeaea",
                                                    id: imgId,
                                                    path: itemInput.imageUrl.trim(),
                                                },
                                            ]);
                                            if (!imgErr) {
                                                imageId = imgId;
                                            }
                                        }

                                        newItems.push({
                                            categoryId: catId,
                                            createdAt: new Date().toISOString(),
                                            description: itemInput.description || "",
                                            id: itemId,
                                            imageId,
                                            name: itemInput.name || `Item ${i + 1}`,
                                            position: i,
                                            price: String(itemInput.price || "0.00"),
                                            updatedAt: new Date().toISOString(),
                                            userId,
                                        });
                                    }
                                    if (newItems.length > 0) {
                                        const { error: itemsErr } = await supabase.from("MenuItem").insert(newItems);
                                        if (itemsErr) throw itemsErr;
                                    }
                                }
                            }
                        }
                        return menuResult;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                            queryClient.invalidateQueries(["menus", variables.restaurantId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        update: {
            useMutation: <
                TData = Menu,
                TError = Error,
                TVariables = { id: string; name: string; availableTime: string }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: menuData } = await supabase.from("Menu").select("name, restaurantId").eq("id", input.id).single();
                        const oldName = menuData?.name || "";
                        const restaurantId = menuData?.restaurantId || "";

                        const { data, error } = await supabase
                            .from("Menu")
                            .update({
                                availableTime: input.availableTime,
                                name: input.name,
                                updatedAt: new Date().toISOString(),
                            })
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        if (restaurantId && oldName !== input.name) {
                            await writeAuditLog(restaurantId, "MU", input.id + "|" + oldName + "|" + input.name);
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["menus"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        updatePosition: {
            useMutation: <
                TData = { id: string; newPosition: number }[],
                TError = Error,
                TVariables = { id: string; newPosition: number }[]
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        await Promise.all(
                            input.map((item: any) =>
                                supabase
                                    .from("Menu")
                                    .update({ position: item.newPosition, updatedAt: new Date().toISOString() })
                                    .eq("id", item.id)
                            )
                        );
                        return input;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["menus"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    menuItem: {
        create: {
            useMutation: <
                TData = MenuItem,
                TError = Error,
                TVariables = {
                    name: string;
                    description: string;
                    price: string;
                    categoryId: string;
                    menuId: string;
                    isVeg: boolean | null;
                    imageBase64?: string;
                    videoUrl?: string | null;
                    additionalImages?: { id: string; path: string; blurHash: string; color: string }[];
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                                blurHash,
                                color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                                id: imgId,
                                path: uploaded.filePath,
                            };

                            const { error: imgErr } = await supabase.from("Image").insert([newImage]);

                            if (imgErr) throw imgErr;
                            imageId = imgId;
                        }

                        const newItem = {
                            categoryId: input.categoryId,
                            createdAt: new Date().toISOString(),
                            description: input.description,
                            id,
                            imageId,
                            isVeg: input.isVeg,
                            name: input.name,
                            position,
                            price: input.price,
                            updatedAt: new Date().toISOString(),
                            userId,
                            videoUrl: input.videoUrl || null,
                        };

                        const { data: menuData } = await supabase.from("Menu").select("restaurantId").eq("id", input.menuId).single();
                        const restaurantId = menuData?.restaurantId || "";

                        const { data, error } = await supabase.from("MenuItem").insert([newItem]).select().single();

                        if (error) throw error;
                        if (restaurantId) {
                            await writeAuditLog(restaurantId, "IC", id + "|" + input.name + "|" + input.price);
                        }

                        if (input.additionalImages && input.additionalImages.length > 0) {
                            const imagesToInsert = input.additionalImages.map((img: any) => ({
                                blurHash: img.blurHash || "L6PZ|ndy1[V@~p%0IyS2IA%0NeR*",
                                color: img.color || "#eaeaea",
                                id: img.id,
                                menuItemId: id,
                                path: img.path,
                            }));

                            const { error: addsErr } = await supabase.from("Image").insert(imagesToInsert);
                            if (addsErr) throw addsErr;
                        }

                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        delete: {
            useMutation: <TData = MenuItem, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: current } = await supabase
                            .from("MenuItem")
                            .select("imageId, videoUrl, name, categoryId")
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

                        if (current && current.videoUrl) {
                            await deleteFile(current.videoUrl);
                        }

                        const { data: additionalImages } = await supabase
                            .from("Image")
                            .select("path")
                            .eq("menuItemId", input.id);

                        if (additionalImages && additionalImages.length > 0) {
                            await Promise.all(additionalImages.map((img: any) => deleteFile(img.path)));
                            await supabase.from("Image").delete().eq("menuItemId", input.id);
                        }

                        const { data: itemData } = await supabase.from("MenuItem").select("name, categoryId").eq("id", input.id).single();
                        const itemName = itemData?.name || "";
                        let restaurantId = "";
                        if (itemData?.categoryId) {
                            const { data: catData } = await supabase.from("Category").select("menuId").eq("id", itemData.categoryId).single();
                            if (catData?.menuId) {
                                const { data: menuData } = await supabase.from("Menu").select("restaurantId").eq("id", catData.menuId).single();
                                restaurantId = menuData?.restaurantId || "";
                            }
                        }

                        const { data, error } = await supabase
                            .from("MenuItem")
                            .delete()
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        if (restaurantId) {
                            await writeAuditLog(restaurantId, "ID", input.id + "|" + itemName);
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        get: {
            useQuery: <TData = MenuItem & { image: Image | null; images?: Image[] }, TError = Error>(
                input: { id: string },
                options?: any
            ) => {
                return useQuery<TData, TError>(
                    ["menuItem", input.id],
                    async () => {
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

                        const { data: additional } = await supabase.from("Image").select("*").eq("menuItemId", item.id);

                        return {
                            ...item,
                            image,
                            images: [...(image ? [image] : []), ...(additional || [])],
                        } as any;
                    },
                    {
                        enabled: !!input.id,
                        ...options,
                    }
                );
            },
        },
        update: {
            useMutation: <
                TData = MenuItem,
                TError = Error,
                TVariables = {
                    id: string;
                    name: string;
                    description: string;
                    price: string;
                    isVeg: boolean | null;
                    imageBase64?: string;
                    imagePath?: string;
                    videoUrl?: string | null;
                    additionalImages?: { id: string; path: string; blurHash: string; color: string }[];
                    deletedImageIds?: string[];
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: current } = await supabase
                            .from("MenuItem")
                            .select("imageId, videoUrl")
                            .eq("id", input.id)
                            .single();

                        let imageId = current?.imageId || null;
                        let videoUrl = current?.videoUrl || null;

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

                        if (
                            current?.videoUrl &&
                            (input.videoUrl === null || input.videoUrl === "" || input.videoUrl !== current.videoUrl)
                        ) {
                            await deleteFile(current.videoUrl);
                            videoUrl = null;
                        }

                        if (input.videoUrl) {
                            videoUrl = input.videoUrl;
                        }

                        if (input.deletedImageIds && input.deletedImageIds.length > 0) {
                            const { data: toDelete } = await supabase
                                .from("Image")
                                .select("path")
                                .in("id", input.deletedImageIds);

                            if (toDelete && toDelete.length > 0) {
                                await Promise.all(toDelete.map((img: any) => deleteFile(img.path)));
                            }
                            await supabase.from("Image").delete().in("id", input.deletedImageIds);
                        }

                        if (input.imageBase64) {
                            const [uploaded, blurHash, rawColor] = await Promise.all([
                                uploadImage(input.imageBase64, `menu/item-${input.id}`),
                                encodeImageToBlurhash(input.imageBase64),
                                getColor(input.imageBase64),
                            ]);

                            const imgId = uploaded.fileId;
                            const newImage = {
                                blurHash,
                                color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                                id: imgId,
                                path: uploaded.filePath,
                            };

                            const { error: imgErr } = await supabase.from("Image").insert([newImage]);

                            if (imgErr) throw imgErr;
                            imageId = imgId;
                        }

                        if (input.additionalImages && input.additionalImages.length > 0) {
                            const imagesToInsert = input.additionalImages.map((img: any) => ({
                                blurHash: img.blurHash || "L6PZ|ndy1[V@~p%0IyS2IA%0NeR*",
                                color: img.color || "#eaeaea",
                                id: img.id,
                                menuItemId: input.id,
                                path: img.path,
                            }));

                            const { error: addsErr } = await supabase.from("Image").insert(imagesToInsert);
                            if (addsErr) throw addsErr;
                        }

                        const { data, error } = await supabase
                            .from("MenuItem")
                            .update({
                                description: input.description,
                                imageId,
                                isVeg: input.isVeg,
                                name: input.name,
                                price: input.price,
                                updatedAt: new Date().toISOString(),
                                videoUrl,
                            })
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        updateLikes: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { id: string; likesDelta: number; dislikesDelta: number }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: current, error: fetchErr } = await supabase
                            .from("MenuItem")
                            .select("likes, dislikes")
                            .eq("id", input.id)
                            .single();
                        if (fetchErr) throw fetchErr;

                        const newLikes = Math.max(0, (current?.likes || 0) + input.likesDelta);
                        const newDislikes = Math.max(0, (current?.dislikes || 0) + input.dislikesDelta);

                        const { data, error } = await supabase
                            .from("MenuItem")
                            .update({
                                dislikes: newDislikes,
                                likes: newLikes,
                                updatedAt: new Date().toISOString(),
                            })
                            .eq("id", input.id)
                            .select()
                            .single();

                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data: any, variables: any, context: any) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["menuItem", variables.id]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        updatePosition: {
            useMutation: <
                TData = { id: string; newPosition: number }[],
                TError = Error,
                TVariables = { id: string; newPosition: number }[]
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        for (const item of input) {
                            await supabase
                                .from("MenuItem")
                                .update({ position: item.newPosition, updatedAt: new Date().toISOString() })
                                .eq("id", item.id);
                        }
                        return input;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        updateAvailability: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { id: string; isAvailable: boolean }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data, error } = await supabase
                            .from("MenuItem")
                            .update({
                                isAvailable: input.isAvailable,
                                updatedAt: new Date().toISOString(),
                            })
                            .eq("id", input.id)
                            .select()
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        updateIsTodaySpecial: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { id: string; isTodaySpecial: boolean }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data, error } = await supabase
                            .from("MenuItem")
                            .update({
                                isTodaySpecial: input.isTodaySpecial,
                                updatedAt: new Date().toISOString(),
                            })
                            .eq("id", input.id)
                            .select()
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    order: {
        create: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    restaurantId: string;
                    table: string | null;
                    floor: string | null;
                    items: string;
                    generalNotes: string | null;
                    status?: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const id = nanoid(24);
                        const newOrder = {
                            createdAt: new Date().toISOString(),
                            floor: input.floor || null,
                            generalNotes: input.generalNotes || null,
                            id,
                            items: input.items,
                            restaurantId: input.restaurantId,
                            status: input.status || "PENDING",
                            table: input.table || null,
                            updatedAt: new Date().toISOString(),
                        };
                        const { data, error } = await supabase.from("Order").insert([newOrder]).select().single();
                        if (error) throw error;
                        await writeAuditLog(input.restaurantId, "ON", newOrder.id + "|" + (newOrder.table || ""));
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["orders", variables.restaurantId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getByRestaurant: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["orders", input.restaurantId],
                    async () => {
                        const { data, error } = await supabase
                            .from("Order")
                            .select("*")
                            .eq("restaurantId", input.restaurantId)
                            .order("createdAt", { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        updateStatus: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    id: string;
                    restaurantId: string;
                    status: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        // Fetch old status
                        const { data: orderData } = await supabase.from("Order").select("status").eq("id", input.id).single();
                        const oldStatus = orderData?.status || "UNKNOWN";

                        const { data, error } = await supabase
                            .from("Order")
                            .update({ status: input.status, updatedAt: new Date().toISOString() })
                            .eq("id", input.id)
                            .select()
                            .single();
                        if (error) throw error;
                        await writeAuditLog(input.restaurantId, "OS", input.id + "|" + oldStatus + "|" + input.status);
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["orders", variables.restaurantId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    restaurant: {
        addBanner: {
            useMutation: <TData = Image, TError = Error, TVariables = { restaurantId: string; imageBase64: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const [uploaded, blurHash, rawColor] = await Promise.all([
                            uploadImage(input.imageBase64, `${input.restaurantId}/banners`),
                            encodeImageToBlurhash(input.imageBase64),
                            getColor(input.imageBase64),
                        ]);

                        const imgId = uploaded.fileId;
                        const newImage = {
                            blurHash,
                            color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                            id: imgId,
                            path: uploaded.filePath,
                            restaurantId: input.restaurantId,
                        };

                        const { data, error } = await supabase.from("Image").insert([newImage]).select().single();

                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["restaurantBanners"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        clone: {
            useMutation: <TData = { id: string; name: string }, TError = Error, TVariables = { id: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                            const { error: imgErr } = await supabase.from("Image").insert([
                                {
                                    blurHash: originalDetails.image.blurHash,
                                    color: originalDetails.image.color,
                                    id: newImageId,
                                    path: originalDetails.image.path,
                                },
                            ]);
                            if (imgErr) throw imgErr;
                        }

                        // 3. Create the cloned Restaurant
                        const newRestaurantId = nanoid(24);
                        const newRestaurant = {
                            balance: (originalDetails as any).balance || 0.0,
                            contactNo: originalDetails.contactNo,
                            createdAt: new Date().toISOString(),
                            id: newRestaurantId,
                            imageId: newImageId,
                            isOwnerDisabled: originalDetails.isOwnerDisabled || false,
                            isPublished: false,
                            isSuspended: originalDetails.isSuspended || false,
                            location: originalDetails.location,
                            name: `${originalDetails.name} (Cloned)`,
                            ownerPassword: originalDetails.ownerPassword || null,
                            ownerUsername: originalDetails.ownerUsername
                                ? `clone-${nanoid(4)}-${originalDetails.ownerUsername}`
                                : null,
                            planName: (originalDetails as any).planName || "Free Trial",
                            subscriptionExpiresAt: (originalDetails as any).subscriptionExpiresAt || null,
                            subscriptionStatus: (originalDetails as any).subscriptionStatus || "trial",
                            trialEndsAt: (originalDetails as any).trialEndsAt || null,
                            updatedAt: new Date().toISOString(),
                            userId: originalDetails.userId,
                        };

                        const { error: rErr } = await supabase.from("Restaurant").insert([newRestaurant]);
                        if (rErr) throw rErr;

                        // 4. Duplicate associated Banners
                        if (originalDetails.banners && originalDetails.banners.length > 0) {
                            const newBanners = originalDetails.banners.map((b: any) => ({
                                blurHash: b.blurHash,
                                color: b.color,
                                id: nanoid(24),
                                path: b.path,
                                restaurantId: newRestaurantId,
                            }));
                            const { error: bErr } = await supabase.from("Image").insert(newBanners);
                            if (bErr) throw bErr;
                        }

                        // 5. Duplicate Menus, Categories, and MenuItems
                        if (originalDetails.menus && originalDetails.menus.length > 0) {
                            for (const menu of originalDetails.menus) {
                                const newMenuId = nanoid(24);
                                const { error: mErr } = await supabase.from("Menu").insert([
                                    {
                                        availableTime: menu.availableTime,
                                        createdAt: new Date().toISOString(),
                                        id: newMenuId,
                                        name: menu.name,
                                        position: menu.position,
                                        restaurantId: newRestaurantId,
                                        updatedAt: new Date().toISOString(),
                                        userId: menu.userId,
                                    },
                                ]);
                                if (mErr) throw mErr;

                                if (menu.categories && menu.categories.length > 0) {
                                    for (const cat of menu.categories) {
                                        const newCatId = nanoid(24);
                                        const { error: cErr } = await supabase.from("Category").insert([
                                            {
                                                createdAt: new Date().toISOString(),
                                                id: newCatId,
                                                menuId: newMenuId,
                                                name: cat.name,
                                                position: cat.position,
                                                updatedAt: new Date().toISOString(),
                                                userId: cat.userId,
                                            },
                                        ]);
                                        if (cErr) throw cErr;

                                        if (cat.items && cat.items.length > 0) {
                                            for (const item of cat.items) {
                                                const newItemId = nanoid(24);

                                                // Duplicate item image if it exists
                                                let newItemImageId = null;
                                                if (item.image) {
                                                    newItemImageId = nanoid(24);
                                                    const { error: itemImgErr } = await supabase.from("Image").insert([
                                                        {
                                                            blurHash: item.image.blurHash,
                                                            color: item.image.color,
                                                            id: newItemImageId,
                                                            path: item.image.path,
                                                        },
                                                    ]);
                                                    if (itemImgErr) throw itemImgErr;
                                                }

                                                const { error: miErr } = await supabase.from("MenuItem").insert([
                                                    {
                                                        categoryId: newCatId,
                                                        createdAt: new Date().toISOString(),
                                                        description: item.description,
                                                        id: newItemId,
                                                        imageId: newItemImageId,
                                                        name: item.name,
                                                        position: item.position,
                                                        price: item.price,
                                                        updatedAt: new Date().toISOString(),
                                                        userId: item.userId,
                                                    },
                                                ]);
                                                if (miErr) throw miErr;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        return { id: newRestaurantId, name: newRestaurant.name } as any;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        create: {
            useMutation: <
                TData = Restaurant & { image: Image | null },
                TError = Error,
                TVariables = {
                    name: string;
                    location: string;
                    contactNo: string;
                    imageBase64: string;
                    ownerUsername?: string;
                    ownerPassword?: string;
                    isOwnerDisabled?: boolean;
                    currency?: string;
                    isOrderFeatureEnabled?: boolean;
                    whatsappNo?: string;
                    isKitchenEnabled?: boolean;
                    logoBase64?: string;
                    logoUrl?: string;
                    instagramUrl?: string | null;
                    facebookUrl?: string | null;
                    twitterUrl?: string | null;
                    youtubeUrl?: string | null;
                    tiktokUrl?: string | null;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const userId = await getCurrentUserId();
                        if (userId.startsWith("restaurant:")) {
                            throw new Error("Restaurant owners are not authorized to create restaurants");
                        }
                        const restaurantId = nanoid(24);
                        const isSuper = await isSuperAdmin();

                        let logoUrl = input.logoUrl || null;
                        if (input.logoBase64) {
                            const logoUpload = await uploadImage(input.logoBase64, `${restaurantId}/logo`);
                            logoUrl = logoUpload.filePath;
                        }

                        const [uploaded, blurHash, rawColor] = await Promise.all([
                            uploadImage(input.imageBase64, `${restaurantId}/profile`),
                            encodeImageToBlurhash(input.imageBase64),
                            getColor(input.imageBase64),
                        ]);

                        const imgId = uploaded.fileId;
                        const newImage = {
                            blurHash,
                            color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                            id: imgId,
                            path: uploaded.filePath,
                        };

                        const { error: imgErr } = await supabase.from("Image").insert([newImage]);
                        if (imgErr) throw imgErr;

                        const trialDurationDays = 14;
                        const trialEndsAt = new Date();
                        trialEndsAt.setDate(trialEndsAt.getDate() + trialDurationDays);

                        const newRestaurant: any = {
                            balance: 0.0,
                            contactNo: input.contactNo,
                            createdAt: new Date().toISOString(),
                            currency: input.currency || "₹",
                            id: restaurantId,
                            imageId: imgId,
                            isKitchenEnabled: input.isKitchenEnabled || false,
                            isOrderFeatureEnabled: input.isOrderFeatureEnabled || false,
                            isPublished: false,
                            location: input.location,
                            logoUrl,
                            name: input.name,
                            planName: "Free Trial",
                            subscriptionExpiresAt: trialEndsAt.toISOString(),
                            subscriptionStatus: "trial",
                            trialEndsAt: trialEndsAt.toISOString(),
                            updatedAt: new Date().toISOString(),
                            userId,
                            whatsappNo: input.whatsappNo || null,
                        };

                        if (isSuper) {
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
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        delete: {
            useMutation: <TData = Restaurant, TError = Error, TVariables = { id: string }>(options?: any) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                                const { data: cats } = await supabase
                                    .from("Category")
                                    .select("id")
                                    .eq("menuId", menu.id);
                                if (cats) {
                                    for (const cat of cats) {
                                        const { data: items } = await supabase
                                            .from("MenuItem")
                                            .select("id, imageId")
                                            .eq("categoryId", cat.id);
                                        if (items && items.length > 0) {
                                            const itemIds = items.map((i: any) => i.id);
                                            const imageIds = items.map((i: any) => i.imageId).filter(Boolean);

                                            if (imageIds.length > 0) {
                                                const { data: itemImages } = await supabase
                                                    .from("Image")
                                                    .select("path")
                                                    .in("id", imageIds);
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
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        deleteBanner: {
            useMutation: <TData = Image, TError = Error, TVariables = { id: string; restaurantId: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: img } = await supabase.from("Image").select("path").eq("id", input.id).single();
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
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails"]);
                            queryClient.invalidateQueries(["restaurantBanners"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        get: {
            useQuery: (input: { id: string }, options?: any) => {
                return useQuery(
                    ["restaurant", input.id],
                    async () => {
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
                            .select("*, image:Image!fk_restaurant_image(*)")
                            .eq("id", input.id)
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    options
                );
            },
        },
        getAll: {
            useQuery: (variables: any, options?: any) => {
                return useQuery(
                    ["restaurants"],
                    async () => {
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
                    },
                    options
                );
            },
        },
        getAllPublished: {
            useQuery: (variables: any, options?: any) => {
                return useQuery(
                    ["restaurantsPublished"],
                    async () => {
                        const { data, error } = await supabase
                            .from("Restaurant")
                            .select("*, image:Image!fk_restaurant_image(*)")
                            .eq("isPublished", true)
                            .eq("isSuspended", false);
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        getBanners: {
            useQuery: (input: { id: string }, options?: any) => {
                return useQuery(
                    ["restaurantBanners", input.id],
                    async () => {
                        const { data, error } = await supabase.from("Image").select("*").eq("restaurantId", input.id);
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        getDetails: {
            useQuery: (input: { id: string }, options?: any) => {
                return useQuery(
                    ["restaurantDetails", input.id],
                    async () => {
                        return fetchRestaurantDetails(input.id);
                    },
                    options
                );
            },
        },
        renewWithCredits: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { restaurantId: string; planName: "Basic Plan" | "Premium Plan" }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const cost = input.planName === "Premium Plan" ? 40.0 : 15.0;

                        const { data: currentRest, error: fetchErr } = await supabase
                            .from("Restaurant")
                            .select("balance, subscriptionExpiresAt, subscriptionStatus")
                            .eq("id", input.restaurantId)
                            .single();
                        if (fetchErr) throw fetchErr;

                        if ((currentRest.balance || 0.0) < cost) {
                            throw new Error(
                                `Insufficient balance. Plan cost is ${cost} credits, but current balance is ${
                                    currentRest.balance || 0.0
                                } credits.`
                            );
                        }

                        let expiryDate = currentRest.subscriptionExpiresAt
                            ? new Date(currentRest.subscriptionExpiresAt)
                            : new Date();
                        if (new Date() > expiryDate) {
                            expiryDate = new Date();
                        }
                        expiryDate.setDate(expiryDate.getDate() + 30);

                        const newBalance = (currentRest.balance || 0.0) - cost;
                        const { data, error } = await supabase
                            .from("Restaurant")
                            .update({
                                balance: newBalance,
                                planName: input.planName,
                                subscriptionExpiresAt: expiryDate.toISOString(),
                                subscriptionStatus: "active",
                                updatedAt: new Date().toISOString(),
                            })
                            .eq("id", input.restaurantId)
                            .select()
                            .single();
                        if (error) throw error;

                        const txId = nanoid(24);
                        const { error: txErr } = await supabase.from("BillingTransaction").insert([
                            {
                                amount: -cost,
                                createdAt: new Date().toISOString(),
                                description: `Renewed ${input.planName} using credits`,
                                id: txId,
                                method: "Credit Balance",
                                restaurantId: input.restaurantId,
                                type: "plan_renewal",
                            },
                        ]);
                        if (txErr) throw txErr;

                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["billingSummary"]);
                            queryClient.invalidateQueries(["billingRestaurants"]);
                            queryClient.invalidateQueries(["billingHistory", variables.restaurantId]);
                            queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        setCurrency: {
            useMutation: <TData = any, TError = Error, TVariables = { restaurantId: string; currency: string }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const isAdm = await isAdmin();
                        if (!isAdm) throw new Error("Unauthorized");
                        const { data, error } = await supabase
                            .from("Restaurant")
                            .update({ currency: input.currency, updatedAt: new Date().toISOString() })
                            .eq("id", input.restaurantId)
                            .select()
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["restaurants"]);
                            queryClient.invalidateQueries(["restaurantDetails", variables.restaurantId]);
                            queryClient.invalidateQueries(["billingRestaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        setPublished: {
            useMutation: <TData = Restaurant, TError = Error, TVariables = { id: string; isPublished: boolean }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data, error } = await supabase
                            .from("Restaurant")
                            .update({ isPublished: input.isPublished, updatedAt: new Date().toISOString() })
                            .eq("id", input.id)
                            .select()
                            .single();
                        if (error) throw error;
                        await writeAuditLog(input.id, "RP", input.id + "|" + input.isPublished);
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails", (variables as any).id]);
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        setSuspended: {
            useMutation: <TData = Restaurant, TError = Error, TVariables = { id: string; isSuspended: boolean }>(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
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
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails", (variables as any).id]);
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        update: {
            useMutation: <
                TData = Restaurant & { image: Image | null },
                TError = Error,
                TVariables = {
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
                    currency?: string;
                    isOrderFeatureEnabled?: boolean;
                    whatsappNo?: string;
                    isKitchenEnabled?: boolean;
                    logoBase64?: string;
                    logoUrl?: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const userId = await getCurrentUserId();
                        if (userId.startsWith("restaurant:")) {
                            const ownerRestId = userId.replace("restaurant:", "");
                            if (ownerRestId !== input.id) {
                                throw new Error("Restaurant owners are not authorized to update other restaurants");
                            }
                        }
                        const { data: current } = await supabase
                            .from("Restaurant")
                            .select("imageId, logoUrl, name, location, contactNo, currency, whatsappNo, isKitchenEnabled, isOrderFeatureEnabled")
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
                                blurHash,
                                color: rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240),
                                id: imgId,
                                path: uploaded.filePath,
                            };

                            const { error: imgErr } = await supabase.from("Image").insert([newImage]);
                            if (imgErr) throw imgErr;
                            imageId = imgId;
                        }

                        let logoUrl = input.logoUrl;
                        // Delete old logo file if replaced
                        if (input.logoBase64) {
                            if (current?.logoUrl) {
                                await deleteFile(current.logoUrl);
                            }
                            const logoUpload = await uploadImage(input.logoBase64, `${input.id}/logo`);
                            logoUrl = logoUpload.filePath;
                        } else if (input.logoUrl === "") {
                            if (current?.logoUrl) {
                                await deleteFile(current.logoUrl);
                            }
                            logoUrl = null;
                        }

                        const isSuper = await isSuperAdmin();
                        const updateData: any = {
                            brandColor: input.brandColor || null,
                            contactNo: input.contactNo,
                            currency: input.currency || "₹",
                            festivalTheme: input.festivalTheme || "NONE",
                            googleReviewUrl: input.googleReviewUrl || null,
                            happyHourDiscount: input.happyHourDiscount !== undefined ? parseInt(input.happyHourDiscount) : 0,
                            happyHourEnd: input.happyHourEnd || null,
                            happyHourStart: input.happyHourStart || null,
                            imageId,
                            isKitchenEnabled: input.isKitchenEnabled || false,
                            isOrderFeatureEnabled: input.isOrderFeatureEnabled || false,
                            location: input.location,
                            logoUrl,
                            name: input.name,
                            updatedAt: new Date().toISOString(),
                            whatsappNo: input.whatsappNo || null,
                            instagramUrl: input.instagramUrl || null,
                            facebookUrl: input.facebookUrl || null,
                            twitterUrl: input.twitterUrl || null,
                            youtubeUrl: input.youtubeUrl || null,
                            tiktokUrl: input.tiktokUrl || null,
                        };

                        if (isSuper) {
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

                        // Insert audit logs for changed fields
                        if (current) {
                            if (current.name !== input.name) {
                                await writeAuditLog(input.id, "RN", current.name + "|" + input.name);
                            }
                            if (current.location !== input.location) {
                                await writeAuditLog(input.id, "RL", current.location + "|" + input.location);
                            }
                            if (current.contactNo !== input.contactNo) {
                                await writeAuditLog(input.id, "RC", current.contactNo + "|" + input.contactNo);
                            }
                            if ((current.whatsappNo || "") !== (input.whatsappNo || "")) {
                                await writeAuditLog(input.id, "RW", (current.whatsappNo || "") + "|" + (input.whatsappNo || ""));
                            }
                            if ((current.currency || "") !== (input.currency || "")) {
                                await writeAuditLog(input.id, "RCO", (current.currency || "") + "|" + (input.currency || ""));
                            }
                            if (current.isKitchenEnabled !== (input.isKitchenEnabled || false)) {
                                await writeAuditLog(input.id, "RK", current.isKitchenEnabled + "|" + (input.isKitchenEnabled || false));
                            }
                            if (current.isOrderFeatureEnabled !== (input.isOrderFeatureEnabled || false)) {
                                await writeAuditLog(input.id, "RO", current.isOrderFeatureEnabled + "|" + (input.isOrderFeatureEnabled || false));
                            }
                        }

                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables, context) => {
                            queryClient.invalidateQueries(["restaurantDetails", (variables as any).id]);
                            queryClient.invalidateQueries(["restaurants"]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    waiterCall: {
        create: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = {
                    restaurantId: string;
                    table: string | null;
                    requestType: string;
                }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const id = nanoid(24);
                        const newCall = {
                            createdAt: new Date().toISOString(),
                            id,
                            requestType: input.requestType,
                            restaurantId: input.restaurantId,
                            status: "PENDING",
                            table: input.table || null,
                        };
                        const { data, error } = await supabase.from("WaiterCall").insert([newCall]).select().single();
                        if (error) throw error;
                        await writeAuditLog(input.restaurantId, "WC", input.requestType + "|" + (input.table || ""));
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["waiterCalls", variables.restaurantId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
        getByRestaurant: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["waiterCalls", input.restaurantId],
                    async () => {
                        const { data, error } = await supabase
                            .from("WaiterCall")
                            .select("*")
                            .eq("restaurantId", input.restaurantId)
                            .eq("status", "PENDING")
                            .order("createdAt", { ascending: true });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
            },
        },
        resolve: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { id: string; restaurantId: string }
            >(
                options?: any
            ) => {
                const queryClient = useQueryClient();
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        // Fetch call details
                        const { data: callData } = await supabase.from("WaiterCall").select("requestType, table").eq("id", input.id).single();
                        const { data, error } = await supabase
                            .from("WaiterCall")
                            .update({ status: "RESOLVED" })
                            .eq("id", input.id)
                            .select()
                            .single();
                        if (error) throw error;
                        if (callData) {
                            await writeAuditLog(input.restaurantId, "WR", callData.requestType + "|" + (callData.table || ""));
                        }
                        return data;
                    },
                    {
                        ...options,
                        onSuccess: (data, variables: any, context) => {
                            queryClient.invalidateQueries(["waiterCalls", variables.restaurantId]);
                            if (options?.onSuccess) options.onSuccess(data, variables, context);
                        },
                    }
                );
            },
        },
    },
    loyalty: {
        registerVisit: {
            useMutation: <
                TData = any,
                TError = Error,
                TVariables = { restaurantId: string; phone: string }
            >(
                options?: any
            ) => {
                return useMutation<TData, TError, TVariables>(
                    async (input: any) => {
                        const { data: current, error: fetchErr } = await supabase
                            .from("CustomerLoyalty")
                            .select("*")
                            .eq("restaurantId", input.restaurantId)
                            .eq("phone", input.phone)
                            .maybeSingle();

                        if (fetchErr) throw fetchErr;

                        if (current) {
                            const { data, error } = await supabase
                                .from("CustomerLoyalty")
                                .update({
                                    visitCount: current.visitCount + 1,
                                    updatedAt: new Date().toISOString()
                                })
                                .eq("id", current.id)
                                .select()
                                .single();
                            if (error) throw error;
                            await writeAuditLog(input.restaurantId, "LV", input.phone + "|" + current.visitCount + "|" + (current.visitCount + 1));
                            return data;
                        } else {
                            const id = nanoid(24);
                            const newLoyalty = {
                                createdAt: new Date().toISOString(),
                                id,
                                phone: input.phone,
                                restaurantId: input.restaurantId,
                                updatedAt: new Date().toISOString(),
                                visitCount: 1,
                            };
                            const { data, error } = await supabase.from("CustomerLoyalty").insert([newLoyalty]).select().single();
                            if (error) throw error;
                            await writeAuditLog(input.restaurantId, "LV", input.phone + "|0|1");
                            return data;
                        }
                    },
                    options
                );
            },
        },
        getByPhone: {
            useQuery: (input: { restaurantId: string; phone: string }, options?: any) => {
                return useQuery(
                    ["customerLoyalty", input.restaurantId, input.phone],
                    async () => {
                        if (!input.phone) return null;
                        const { data, error } = await supabase
                            .from("CustomerLoyalty")
                            .select("*")
                            .eq("restaurantId", input.restaurantId)
                            .eq("phone", input.phone)
                            .maybeSingle();
                        if (error) throw error;
                        return data || null;
                    },
                    options
                );
            },
        },
    },
    auditLog: {
        getByRestaurant: {
            useQuery: (input: { restaurantId: string }, options?: any) => {
                return useQuery(
                    ["auditLogs", input.restaurantId],
                    async () => {
                        const { data, error } = await supabase
                            .from("AuditLog")
                            .select("*")
                            .eq("restaurantId", input.restaurantId)
                            .order("createdAt", { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    options
                );
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
            if (domain === "feedback") {
                if (method === "getByMenuItem") return ["feedback", variables?.menuItemId || variables];
                if (method === "getByRestaurant") return ["feedbackByRestaurant", variables?.restaurantId || variables];
            }
            if (domain === "analytics") {
                if (method === "getStats") return ["analyticsStats", variables?.restaurantId || variables];
            }
            if (domain === "order") {
                if (method === "getByRestaurant") return ["orders", variables?.restaurantId || variables];
            }
            if (domain === "waiterCall") {
                if (method === "getByRestaurant") return ["waiterCalls", variables?.restaurantId || variables];
            }
            if (domain === "loyalty") {
                if (method === "getByPhone") return ["customerLoyalty", variables?.restaurantId || variables?.phone || variables];
            }
            if (domain === "auditLog") {
                if (method === "getByRestaurant") return ["auditLogs", variables?.restaurantId || variables];
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
                },
            });
        };

        return createProxy([]);
    },
};
export type AppRouter = any;
