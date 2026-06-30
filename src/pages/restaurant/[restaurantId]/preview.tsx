import { useEffect } from "react";

import { Alert, Center, Container, Loader, Text, useMantineTheme } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import type { NextPage } from "next";

import { Footer } from "src/components/Footer";
import { RestaurantMenu } from "src/components/RestaurantMenu";
import { api } from "src/utils/api";
import { useSession } from "src/utils/supabaseAuth";

const RestaurantMenuPreviewPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const t = useTranslations("preview");
    const restaurantId = router.query?.restaurantId as string;

    const { data: session, status } = useSession({ required: true });

    const { data: restaurant, isLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId && status === "authenticated" }
    );

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        }
    }, [status, router]);

    useEffect(() => {
        if (restaurant && session && restaurant.userId !== session.user?.id) {
            // Preview page should only be accessible by the owner
            router.push("/");
        }
    }, [restaurant, session, router]);

    if (status === "loading" || isLoading) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <>
            <NextSeo description={t("seoDescription")} title={t("seoTitle")} />
            <main>
                <Container py="lg" size="xl">
                    <Alert
                        color="red"
                        data-testid="preview-mode-banner"
                        icon={<IconAlertCircle size={16} />}
                        mb="lg"
                        radius="lg"
                        title={t("alertTitle")}
                    >
                        <Text color={theme.black} weight="bold">
                            {t("alertContent")}
                        </Text>
                        <Text color={theme.black}>{t("alertDesc")}</Text>
                    </Alert>
                    {restaurant && <RestaurantMenu restaurant={restaurant} />}
                </Container>
            </main>
            <Footer />
        </>
    );
};

export default RestaurantMenuPreviewPage;
