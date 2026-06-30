import type { FC, PropsWithChildren } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useRouter } from "next/router";

import { supabase } from "./supabaseClient";

interface SupabaseSession {
    user: {
        id: string;
        email?: string;
        name?: string;
        image?: string;
        role?: string;
        restaurantId?: string;
    } | null;
}

interface SupabaseAuthContextType {
    session: SupabaseSession | null;
    status: "authenticated" | "unauthenticated" | "loading";
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
    session: null,
    status: "loading",
});

export const SupabaseAuthProvider: FC<PropsWithChildren> = ({ children }) => {
    const [session, setSession] = useState<SupabaseSession | null>(null);
    const [status, setStatus] = useState<"authenticated" | "unauthenticated" | "loading">("loading");

    useEffect(() => {
        // Fetch current session on mount
        if (typeof window !== "undefined") {
            const ownerSessionStr = localStorage.getItem("owner_session");
            if (ownerSessionStr) {
                try {
                    const currentSession = JSON.parse(ownerSessionStr);
                    if (currentSession?.user) {
                        setSession(currentSession);
                        setStatus("authenticated");
                        return () => {};
                    }
                } catch (e) {
                    console.error("Failed to parse owner_session on mount", e);
                }
            }
        }

        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession) {
                setSession({
                    user: {
                        email: currentSession.user.email,
                        id: currentSession.user.id,
                        image: currentSession.user.user_metadata?.avatar_url || "",
                        name:
                            currentSession.user.user_metadata?.name ||
                            currentSession.user.email?.split("@")[0] ||
                            "User",
                    },
                });
                setStatus("authenticated");
            } else {
                setSession(null);
                setStatus("unauthenticated");
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, currentSession) => {
            const hasOwnerSession = typeof window !== "undefined" && localStorage.getItem("owner_session") !== null;
            if (!hasOwnerSession) {
                if (currentSession) {
                    setSession({
                        user: {
                            email: currentSession.user.email,
                            id: currentSession.user.id,
                            image: currentSession.user.user_metadata?.avatar_url || "",
                            name:
                                currentSession.user.user_metadata?.name ||
                                currentSession.user.email?.split("@")[0] ||
                                "User",
                        },
                    });
                    setStatus("authenticated");
                } else {
                    setSession(null);
                    setStatus("unauthenticated");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const contextValue = React.useMemo(() => ({ session, status }), [session, status]);

    return <SupabaseAuthContext.Provider value={contextValue}>{children}</SupabaseAuthContext.Provider>;
};

export const useSession = (options?: { required?: boolean }) => {
    const context = useContext(SupabaseAuthContext);
    const router = useRouter();

    useEffect(() => {
        if (options?.required && context.status === "unauthenticated") {
            router.push("/auth/signin");
        }
    }, [options?.required, context.status, router]);

    return {
        data: context.session,
        status: context.status,
    };
};

export const signIn = async (
    provider: string,
    options?: { callbackUrl?: string; email?: string; password?: string }
) => {
    if (provider === "restaurant-owner") {
        if (options?.email && options?.password) {
            const { data: restaurant, error } = await supabase
                .from("Restaurant")
                .select("id, name, ownerUsername, isOwnerDisabled")
                .eq("ownerUsername", options.email)
                .eq("ownerPassword", options.password)
                .single();

            if (error || !restaurant) {
                throw new Error("Invalid restaurant username or password");
            }

            if (restaurant.isOwnerDisabled) {
                throw new Error("Login is disabled for this restaurant owner account.");
            }

            const sessionData = {
                user: {
                    email: restaurant.ownerUsername,
                    id: `restaurant:${restaurant.id}`,
                    name: restaurant.name,
                    restaurantId: restaurant.id,
                    role: "restaurant-owner",
                },
            };

            // Log to LoginLog
            try {
                await supabase.from("LoginLog").insert([
                    {
                        createdAt: new Date().toISOString(),
                        id: Math.random().toString(36).substring(2, 15),
                        role: "Restaurant Owner",
                        username: restaurant.ownerUsername,
                    },
                ]);
            } catch (e) {
                console.error("Failed to insert LoginLog", e);
            }

            if (typeof window !== "undefined") {
                localStorage.setItem("owner_session", JSON.stringify(sessionData));
                window.location.href = options.callbackUrl || "/restaurant";
            }
            return { error: null, ok: true, url: options.callbackUrl || "/restaurant" };
        }
    }
    if (provider === "credentials" || provider === "email") {
        if (options?.email && options?.password) {
            const { error } = await supabase.auth.signInWithPassword({
                email: options.email,
                password: options.password,
            });
            if (error) throw error;

            // Log to LoginLog
            try {
                let role = "User";
                if (options.email === "farookisop@gmail.com") {
                    role = "Super Admin";
                } else {
                    const { data: admin } = await supabase
                        .from("AdminUser")
                        .select("role")
                        .eq("email", options.email)
                        .single();
                    if (admin) {
                        role = admin.role;
                    }
                }
                await supabase.from("LoginLog").insert([
                    {
                        createdAt: new Date().toISOString(),
                        id: Math.random().toString(36).substring(2, 15),
                        role,
                        username: options.email,
                    },
                ]);
            } catch (e) {
                console.error("Failed to insert LoginLog", e);
            }

            return { error: null, ok: true, url: options.callbackUrl || "/restaurant" };
        }
    }
    return { error: "Unsupported sign-in options", ok: false };
};

export const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) throw error;
    return data;
};

export const signOut = async (options?: { callbackUrl?: string }) => {
    if (typeof window !== "undefined") {
        localStorage.removeItem("owner_session");
        localStorage.removeItem("admin_session");
    }
    await supabase.auth.signOut();
    if (options?.callbackUrl) {
        window.location.href = options.callbackUrl;
    }
};

export const impersonate = (restaurantId: string, restaurantName: string, ownerUsername: string) => {
    if (typeof window !== "undefined") {
        localStorage.setItem("admin_session", "true");
        const sessionData = {
            user: {
                email: ownerUsername,
                id: `restaurant:${restaurantId}`,
                name: restaurantName,
                restaurantId,
                role: "restaurant-owner",
            },
        };
        localStorage.setItem("owner_session", JSON.stringify(sessionData));
        window.location.href = "/restaurant";
    }
};

export const exitImpersonation = () => {
    if (typeof window !== "undefined") {
        localStorage.removeItem("owner_session");
        localStorage.removeItem("admin_session");
        window.location.href = "/restaurant";
    }
};
