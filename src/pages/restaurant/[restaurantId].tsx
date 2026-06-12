import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Box, Breadcrumbs, Center, Loader, SimpleGrid, Text, useMantineTheme } from "@mantine/core";
import { IconChartDots, IconSlideshow, IconStars, IconToolsKitchen } from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { IconCard } from "src/components/Cards";
import { PublishButton } from "src/components/PublishButton";
import { api } from "src/utils/api";
import { showErrorToast } from "src/utils/helpers";

/** Page to manage all the options under the restaurant */
const RestaurantManagePage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const [itemsParent] = useAutoAnimate<HTMLDivElement>();
    const restaurantId = router.query?.restaurantId as string;
    const t = useTranslations("dashboard.restaurantManage");

    const { data: restaurant, isLoading } = api.restaurant.get.useQuery(
        { id: restaurantId },
        {
            enabled: !!restaurantId,
            onError: () => {
                showErrorToast(t("restaurantFetchError"));
                router.push("/restaurant");
            },
        }
    );

    return (
        <>
            <NextSeo description={t("seoDescription")} title={t("seoTitle")} />
            <main>
                <AppShell>
                    <Box ref={itemsParent}>
                        {isLoading ? (
                            <Center h="50vh" w="100%">
                                <Loader size="lg" />
                            </Center>
                        ) : (
                            <>
                                <Box
                                    sx={(theme) => ({
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: theme.spacing.md,
                                        width: "100%",
                                        [`@media (min-width: ${theme.breakpoints.sm}px)`]: {
                                            flexDirection: "row",
                                            alignItems: "center",
                                        },
                                    })}
                                >
                                    <Box sx={{ maxWidth: "100%", overflowX: "auto", whiteSpace: "nowrap" }} py="xs">
                                        <Breadcrumbs color={theme.black}>
                                            <Link href="/restaurant">{t("breadcrumb")}</Link>
                                            <Text>{restaurant?.name}</Text>
                                        </Breadcrumbs>
                                    </Box>
                                    {restaurant && <PublishButton restaurant={restaurant} />}
                                </Box>
                                <SimpleGrid
                                    cols={1}
                                    breakpoints={[
                                        { cols: 2, minWidth: "sm" },
                                        { cols: 3, minWidth: "md" },
                                    ]}
                                    mt="xl"
                                >
                                    <IconCard
                                        Icon={IconToolsKitchen}
                                        href={`/restaurant/${router.query?.restaurantId}/edit-menu`}
                                        subTitle={t("menuCardSubTitle")}
                                        testId="manage-menus-card"
                                        title={t("menuCardTitle")}
                                    />
                                    <IconCard
                                        Icon={IconSlideshow}
                                        href={`/restaurant/${router.query?.restaurantId}/banners`}
                                        subTitle={t("bannersCardSubTitle")}
                                        testId="manage-banners-card"
                                        title={t("bannersCardTitle")}
                                    />
                                    <IconCard
                                        Icon={IconStars}
                                        href={`/restaurant/${router.query?.restaurantId}/feedback`}
                                        subTitle={t("feedbackCardSubTitle")}
                                        title={t("feedbackCardTitle")}
                                    />
                                    <IconCard
                                        Icon={IconChartDots}
                                        href={`/restaurant/${router.query?.restaurantId}/stats`}
                                        subTitle={t("statsCardSubTitle")}
                                        title={t("statsCardTitle")}
                                    />
                                </SimpleGrid>
                            </>
                        )}
                    </Box>
                </AppShell>
            </main>
        </>
    );
};


export default RestaurantManagePage;
