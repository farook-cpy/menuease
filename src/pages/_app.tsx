import { ColorSchemeProvider, MantineProvider } from "@mantine/core";
import { useColorScheme, useLocalStorage } from "@mantine/hooks";
import { NotificationsProvider } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { type AppType } from "next/app";
import { NextIntlProvider } from "next-intl";
import { DefaultSeo } from "next-seo";

import type { ColorScheme } from "@mantine/core";
import type { AbstractIntlMessages } from "next-intl";

import { env } from "src/env/client.mjs";
import { CustomFonts } from "src/styles/CustomFonts";
import { getMantineTheme, theme } from "src/styles/theme";
import { SupabaseAuthProvider } from "src/utils/supabaseAuth";
import messagesEn from "src/lang/en.json";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

const MyApp: AppType<{ messages?: AbstractIntlMessages }> = ({
    Component,
    pageProps,
}) => {
    const preferredColorScheme = useColorScheme();

    const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
        defaultValue: preferredColorScheme,
        getInitialValueInEffect: true,
        key: "mantine-color-scheme",
    });

    const toggleColorScheme = (value?: ColorScheme) =>
        setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

    return (
        <>
            <DefaultSeo
                additionalMetaTags={[
                    { content: "minimum-scale=1, initial-scale=1, width=device-width", name: "viewport" },
                ]}
                openGraph={{
                    images: [{ url: `${env.NEXT_PUBLIC_PROD_URL}/menufic_banner.jpg` }],
                    siteName: "menufic.com",
                    type: "website",
                    url: env.NEXT_PUBLIC_PROD_URL,
                }}
                themeColor={theme.light.primary[6]}
                titleTemplate="Menufic - %s"
                twitter={{ cardType: "summary_large_image" }}
            />
            <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
                <MantineProvider theme={getMantineTheme(colorScheme)} withGlobalStyles withNormalizeCSS>
                    <CustomFonts />
                    <NotificationsProvider>
                        <QueryClientProvider client={queryClient}>
                            <SupabaseAuthProvider>
                                <NextIntlProvider messages={(pageProps.messages || messagesEn) as any}>
                                    <Component {...pageProps} />
                                </NextIntlProvider>
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
