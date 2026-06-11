import { useRouter } from "next/router";
import type { FC, PropsWithChildren } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface SupabaseSession {
    user: {
        id: string;
        email?: string;
        name?: string;
        image?: string;
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
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession) {
                setSession({
                    user: {
                        id: currentSession.user.id,
                        email: currentSession.user.email,
                        name: currentSession.user.user_metadata?.name || currentSession.user.email?.split("@")[0] || "User",
                        image: currentSession.user.user_metadata?.avatar_url || "",
                    },
                });
                setStatus("authenticated");
            } else {
                setSession(null);
                setStatus("unauthenticated");
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (currentSession) {
                setSession({
                    user: {
                        id: currentSession.user.id,
                        email: currentSession.user.email,
                        name: currentSession.user.user_metadata?.name || currentSession.user.email?.split("@")[0] || "User",
                        image: currentSession.user.user_metadata?.avatar_url || "",
                    },
                });
                setStatus("authenticated");
            } else {
                setSession(null);
                setStatus("unauthenticated");
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const contextValue = React.useMemo(() => ({ session, status }), [session, status]);

    return (
        <SupabaseAuthContext.Provider value={contextValue}>
            {children}
        </SupabaseAuthContext.Provider>
    );
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
    if (provider === "credentials" || provider === "email") {
        if (options?.email && options?.password) {
            const { error } = await supabase.auth.signInWithPassword({
                email: options.email,
                password: options.password,
            });
            if (error) throw error;
            return { ok: true, error: null, url: options.callbackUrl || "/restaurant" };
        }
    }
    return { ok: false, error: "Unsupported sign-in options" };
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
    await supabase.auth.signOut();
    if (options?.callbackUrl) {
        window.location.href = options.callbackUrl;
    }
};
