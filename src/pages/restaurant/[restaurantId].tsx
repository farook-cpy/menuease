import { useState, useEffect } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Box, Breadcrumbs, Button, Center, Group, Loader, SimpleGrid, Text, useMantineTheme, Badge } from "@mantine/core";
import {
    IconChartDots,
    IconClipboardList,
    IconMessage2,
    IconQrcode,
    IconSlideshow,
    IconStars,
    IconToolsKitchen,
    IconHistory,
    IconBell,
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
import { UpgradePlanModal } from "src/components/UpgradePlanModal";
import { api } from "src/utils/api";
import { isFeatureEnabled } from "src/utils/features";
import { showErrorToast } from "src/utils/helpers";

/** Page to manage all the options under the restaurant */
const RestaurantManagePage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const [itemsParent] = useAutoAnimate<HTMLDivElement>();
    const restaurantId = router.query?.restaurantId as string;
    const t = useTranslations("dashboard.restaurantManage");
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [targetUpgradePlan, setTargetUpgradePlan] = useState<"Starter" | "Professional" | "Premium" | undefined>();

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

    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

    // Load saved preferences on startup
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("desktop_notifications_enabled") === "true";
            setNotificationsEnabled(saved);
        }
    }, []);

    // Query notifications feed from database (refetching every 15s to capture live broadcasts)
    const { data: notifications } = api.notification.getByRestaurant.useQuery(
        { restaurantId },
        { enabled: !!restaurantId, refetchInterval: 15000 }
    );

    // Watch for incoming notifications and fire desktop/in-app alert
    useEffect(() => {
        if (!notifications || notifications.length === 0) return;

        const seenIds = JSON.parse(localStorage.getItem("seen_notifications") || "[]");
        let newSeen = [...seenIds];
        let hasNew = false;

        notifications.forEach((notif: any) => {
            if (!seenIds.includes(notif.id)) {
                hasNew = true;
                newSeen.push(notif.id);

                // 1. Show in-app Mantine Alert Toast
                showErrorToast(`📢 ${notif.title}`, new Error(notif.message)); // Using helper to show a prominent alert notification

                // 2. Show system browser notification if enabled
                if (notificationsEnabled && typeof window !== "undefined" && "Notification" in window) {
                    if (Notification.permission === "granted") {
                        try {
                            new Notification(notif.title, {
                                body: notif.message,
                                icon: "/favicon.ico"
                            });
                        } catch (err) {
                            console.error("Browser Notification failed", err);
                        }
                    }
                }
            }
        });

        if (hasNew) {
            localStorage.setItem("seen_notifications", JSON.stringify(newSeen));
        }
    }, [notifications, notificationsEnabled]);

    const planName = (restaurant as any)?.planName || "Free Trial";
    
    // Evaluate custom features
    const isBannersEnabled = isFeatureEnabled(restaurant, "banners");
    const isReviewsEnabled = isFeatureEnabled(restaurant, "reviews");
    const isAnalyticsEnabled = isFeatureEnabled(restaurant, "analytics");
    const isLoyaltyEnabled = isFeatureEnabled(restaurant, "loyalty");
    const isOffersEnabled = isFeatureEnabled(restaurant, "offers");

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
                                            <Group spacing="xs" align="center" style={{ display: "inline-flex" }}>
                                                <Text>{restaurant?.name}</Text>
                                                <Badge color="blue" variant="light" size="sm" radius="md">
                                                    {planName}
                                                </Badge>
                                                <Button
                                                    size="xs"
                                                    color="orange"
                                                    compact
                                                    onClick={() => {
                                                        setTargetUpgradePlan(undefined);
                                                        setUpgradeModalOpen(true);
                                                    }}
                                                >
                                                    Renew / Upgrade
                                                </Button>
                                            </Group>
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
                                        Icon={IconBell}
                                        onClick={() => {
                                            if (typeof window !== "undefined" && "Notification" in window) {
                                                if (Notification.permission === "default") {
                                                    Notification.requestPermission().then((perm) => {
                                                        const enabled = perm === "granted";
                                                        setNotificationsEnabled(enabled);
                                                        localStorage.setItem("desktop_notifications_enabled", String(enabled));
                                                        if (enabled) {
                                                            showErrorToast("Notifications Allowed", new Error("You will now receive real-time alerts on this device!"));
                                                        }
                                                    });
                                                } else {
                                                    const next = !notificationsEnabled;
                                                    setNotificationsEnabled(next);
                                                    localStorage.setItem("desktop_notifications_enabled", String(next));
                                                    if (next && Notification.permission !== "granted") {
                                                        Notification.requestPermission();
                                                    }
                                                    showErrorToast(
                                                        next ? "Alerts Enabled" : "Alerts Muted",
                                                        new Error(next ? "You will receive desktop alerts." : "Desktop alerts have been muted.")
                                                    );
                                                }
                                            } else {
                                                showErrorToast("Not Supported", new Error("Desktop alerts are not supported by this browser."));
                                            }
                                        }}
                                        subTitle={notificationsEnabled ? "Status: Active (Tap to mute)" : "Status: Muted (Tap to enable)"}
                                        title="Desktop Alerts"
                                    />
                                    <IconCard
                                        Icon={IconSlideshow}
                                        href={isBannersEnabled ? `/restaurant/${router.query?.restaurantId}/banners` : undefined}
                                        onClick={!isBannersEnabled ? () => {
                                            setTargetUpgradePlan("Premium");
                                            setUpgradeModalOpen(true);
                                        } : undefined}
                                        subTitle={t("bannersCardSubTitle") + (!isBannersEnabled ? " (🔒 Premium Feature)" : "")}
                                        testId="manage-banners-card"
                                        title={t("bannersCardTitle")}
                                    />
                                    <IconCard
                                        Icon={IconStars}
                                        href={isReviewsEnabled ? `/restaurant/${router.query?.restaurantId}/feedback` : undefined}
                                        onClick={!isReviewsEnabled ? () => {
                                            setTargetUpgradePlan("Professional");
                                            setUpgradeModalOpen(true);
                                        } : undefined}
                                        subTitle={t("feedbackCardSubTitle") + (!isReviewsEnabled ? " (🔒 Pro Feature)" : "")}
                                        title={t("feedbackCardTitle")}
                                    />
                                    <IconCard
                                        Icon={IconChartDots}
                                        href={isAnalyticsEnabled ? `/restaurant/${router.query?.restaurantId}/stats` : undefined}
                                        onClick={!isAnalyticsEnabled ? () => {
                                            setTargetUpgradePlan("Professional");
                                            setUpgradeModalOpen(true);
                                        } : undefined}
                                        subTitle={t("statsCardSubTitle") + (!isAnalyticsEnabled ? " (🔒 Pro Feature)" : "")}
                                        title={t("statsCardTitle")}
                                    />
                                    <IconCard
                                        Icon={IconMessage2}
                                        href={isLoyaltyEnabled ? `/restaurant/${router.query?.restaurantId}/billing` : undefined}
                                        onClick={!isLoyaltyEnabled ? () => {
                                            setTargetUpgradePlan("Premium");
                                            setUpgradeModalOpen(true);
                                        } : undefined}
                                        subTitle={"Register customer visits and send bills via WhatsApp" + (!isLoyaltyEnabled ? " (🔒 Premium Feature)" : "")}
                                        title="WhatsApp Billing & Loyalty"
                                    />
                                    {(restaurant as any).isKitchenEnabled && (
                                        <IconCard
                                            Icon={IconClipboardList}
                                            href={`/restaurant/${router.query?.restaurantId}/kitchen`}
                                            subTitle="View and manage incoming table orders"
                                            title="Kitchen Screen"
                                        />
                                    )}
                                    <IconCard
                                        Icon={IconHistory}
                                        href={`/restaurant/${router.query?.restaurantId}/logs`}
                                        subTitle="View and export restaurant activity logs to CSV"
                                        title="Activity Logs"
                                    />
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
                    {restaurant && (
                        <UpgradePlanModal
                            opened={upgradeModalOpen}
                            onClose={() => setUpgradeModalOpen(false)}
                            restaurantId={restaurant.id}
                            restaurantName={restaurant.name}
                            targetPlan={targetUpgradePlan}
                        />
                    )}
                </AppShell>
            </main>
        </>
    );
};

export default RestaurantManagePage;
