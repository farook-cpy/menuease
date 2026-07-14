import { useEffect } from "react";

import { ColorSchemeProvider, MantineProvider } from "@mantine/core";
import { NotificationsProvider } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { type AppType } from "next/app";
import { useRouter } from "next/router";
import { NextIntlClientProvider } from "next-intl";
import { DefaultSeo } from "next-seo";

import type { ColorScheme } from "@mantine/core";
import type { AbstractIntlMessages } from "next-intl";

import { env } from "src/env/client.mjs";
import messagesEn from "src/lang/en.json";
import { CustomFonts } from "src/styles/CustomFonts";
import { getMantineTheme, theme } from "src/styles/theme";
import { PlateProvider } from "src/utils/plateContext";
import { SupabaseAuthProvider } from "src/utils/supabaseAuth";
import { OfflineSyncProvider } from "src/utils/offlineSync";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

const MyApp: AppType<{ messages?: AbstractIntlMessages }> = ({ Component, pageProps }) => {
    const router = useRouter();
    const locale = router.locale || "en";
    const colorScheme: ColorScheme = "light";
    const toggleColorScheme = () => {};

    // Restore and persist React Query cache in localStorage for complete offline reloading support
    useEffect(() => {
        if (typeof window === "undefined") return;
        
        const persisted = localStorage.getItem("menuease_query_cache");
        if (persisted) {
            try {
                const queries = JSON.parse(persisted);
                queries.forEach((q: any) => {
                    queryClient.setQueryData(q.queryKey, q.state.data);
                });
            } catch (e) {
                console.error("Failed to restore persisted cache", e);
            }
        }

        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            if (event.type === "observerAdded" || event.type === "updated") {
                const allQueries = queryClient.getQueryCache().getAll();
                const toPersist = allQueries
                    .filter((q) => q.state.status === "success" && q.state.data)
                    .map((q) => ({
                        queryKey: q.queryKey,
                        state: { data: q.state.data }
                    }));
                try {
                    localStorage.setItem("menuease_query_cache", JSON.stringify(toPersist));
                } catch (e) {
                    console.error("Failed to persist query cache", e);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const checkKeepAlive = async () => {
            try {
                const lastPing = localStorage.getItem("supabase_keepalive_last");
                const now = Date.now();
                // 12 hours interval (43200000 ms)
                if (!lastPing || now - parseInt(lastPing, 10) > 43200000) {
                    await fetch("/api/keepalive");
                    localStorage.setItem("supabase_keepalive_last", now.toString());
                }
            } catch (e) {
                console.error("Keep-alive ping failed:", e);
            }
        };
        checkKeepAlive();
    }, []);

    return (
        <>
            <DefaultSeo
                additionalMetaTags={[
                    { content: "minimum-scale=1, initial-scale=1, width=device-width", name: "viewport" },
                ]}
                openGraph={{
                    images: [{ url: `${env.NEXT_PUBLIC_PROD_URL}/menufic_banner.jpg` }],
                    siteName: "foodler.com",
                    type: "website",
                    url: env.NEXT_PUBLIC_PROD_URL,
                }}
                themeColor={theme.light.primary[6]}
                titleTemplate="Foodler - %s"
                twitter={{ cardType: "summary_large_image" }}
            />
            <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
                <MantineProvider theme={getMantineTheme(colorScheme)} withGlobalStyles withNormalizeCSS>
                    <CustomFonts />
                    <NotificationsProvider>
                        <QueryClientProvider client={queryClient}>
                            <SupabaseAuthProvider>
                                <NextIntlClientProvider
                                    locale={locale}
                                    messages={(pageProps.messages || messagesEn) as any}
                                    timeZone="UTC"
                                >
                                    <PlateProvider>
                                        <OfflineSyncProvider>
                                            <Component {...pageProps} />
                                        </OfflineSyncProvider>
                                    </PlateProvider>
                                </NextIntlClientProvider>
                                <Analytics />
                            </SupabaseAuthProvider>
                        </QueryClientProvider>
                    </NotificationsProvider>
                </MantineProvider>
            </ColorSchemeProvider>
        </>
    );
};

export default MyApp;
