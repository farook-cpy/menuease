import { useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Box, Breadcrumbs, Button, Center, Group, Loader, SimpleGrid, Text, useMantineTheme } from "@mantine/core";
import {
    IconChartDots,
    IconClipboardList,
    IconQrcode,
    IconSlideshow,
    IconStars,
    IconToolsKitchen,
} from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { IconCard } from "src/components/Cards";
import { TableQrModal } from "src/components/Modal";
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
    const [qrModalOpen, setQrModalOpen] = useState(false);

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
                                        alignItems: "flex-start",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: theme.spacing.md,
                                        justifyContent: "space-between",
                                        width: "100%",
                                        [`@media (min-width: ${theme.breakpoints.sm}px)`]: {
                                            alignItems: "center",
                                            flexDirection: "row",
                                        },
                                    })}
                                >
                                    <Box py="xs" sx={{ maxWidth: "100%", overflowX: "auto", whiteSpace: "nowrap" }}>
                                        <Breadcrumbs color={theme.black}>
                                            <Link href="/restaurant">{t("breadcrumb")}</Link>
                                            <Text>{restaurant?.name}</Text>
                                        </Breadcrumbs>
                                    </Box>
                                    {restaurant && (
                                        <Group spacing="sm">
                                            {(restaurant as any).isOrderFeatureEnabled && (
                                                <Button
                                                    color="primary"
                                                    leftIcon={<IconQrcode size={16} />}
                                                    onClick={() => setQrModalOpen(true)}
                                                    variant="outline"
                                                >
                                                    Table QR Code
                                                </Button>
                                            )}
                                            <PublishButton restaurant={restaurant} />
                                        </Group>
                                    )}
                                </Box>
                                <SimpleGrid
                                    breakpoints={[
                                        { cols: 2, minWidth: "sm" },
                                        { cols: 3, minWidth: "md" },
                                    ]}
                                    cols={1}
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
                                    {(restaurant as any).isKitchenEnabled && (
                                        <IconCard
                                            Icon={IconClipboardList}
                                            href={`/restaurant/${router.query?.restaurantId}/kitchen`}
                                            subTitle="View and manage incoming table orders"
                                            title="Kitchen Screen"
                                        />
                                    )}
                                </SimpleGrid>
                            </>
                        )}
                    </Box>
                    {restaurant && (restaurant as any).isOrderFeatureEnabled && (
                        <TableQrModal
                            onClose={() => setQrModalOpen(false)}
                            opened={qrModalOpen}
                            restaurantId={restaurantId}
                            restaurantName={restaurant.name}
                        />
                    )}
                </AppShell>
            </main>
        </>
    );
};

export default RestaurantManagePage;
