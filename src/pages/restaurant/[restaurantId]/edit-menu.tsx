import { useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Box, Breadcrumbs, Center, Grid, Loader, SimpleGrid, Text, Alert, Stack, Button, Modal, Textarea, Group } from "@mantine/core";
import { IconAlertTriangle, IconFileCode, IconDownload } from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import type { Menu } from "@prisma/client";

import { AppShell } from "src/components/AppShell";
import { Categories } from "src/components/EditMenu/Categories";
import { Menus } from "src/components/EditMenu/Menus";
import { PublishButton } from "src/components/PublishButton";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

/** Page to manage all the menus and related items of a selected restaurant */
const EditMenuPage: NextPage = () => {
    const router = useRouter();
    const [selectedMenu, setSelectedMenu] = useState<Menu | undefined>();
    const [gridItemParent] = useAutoAnimate<HTMLDivElement>();
    const [rootParent] = useAutoAnimate<HTMLDivElement>();
    const restaurantId = router.query?.restaurantId as string;
    const t = useTranslations("dashboard.editMenu");
    const tRestaurant = useTranslations("dashboard.restaurantManage");

    const { data: restaurant, isLoading } = api.restaurant.get.useQuery(
        { id: restaurantId },
        {
            enabled: !!restaurantId,
            onError: () => {
                showErrorToast(tRestaurant("restaurantFetchError"));
                router.push("/restaurant");
            },
        }
    );

    const [jsonModalOpen, setJsonModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    const trpcCtx = api.useContext();

    const { mutate: importMenu, isLoading: importing } = api.menu.importMenu.useMutation({
        onError: (err: any) => showErrorToast("Failed to import menu from JSON", err),
        onSuccess: (data: any) => {
            showSuccessToast("Menu Imported", "Menu successfully created from JSON!");
            setJsonModalOpen(false);
            setJsonInput("");
            setJsonError(null);
            setSelectedMenu(data);
            trpcCtx.restaurant.get.invalidate({ id: restaurantId });
            trpcCtx.menu.getAll.invalidate({ restaurantId });
        }
    });

    const handleApplyJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed.menuName) {
                setJsonError("Invalid template: 'menuName' is required at the root level.");
                return;
            }
            if (parsed.categories && !Array.isArray(parsed.categories)) {
                setJsonError("Invalid template: 'categories' must be an array.");
                return;
            }
            setJsonError(null);
            importMenu({
                restaurantId,
                menuData: parsed
            });
        } catch (e: any) {
            setJsonError(`JSON Syntax Error: ${e.message}`);
        }
    };

    const expiresAt = restaurant?.subscriptionExpiresAt ? new Date(restaurant.subscriptionExpiresAt) : null;
    const isExpired = restaurant?.subscriptionStatus === "expired" || (expiresAt ? new Date() > expiresAt : false);

    return (
        <>
            <NextSeo description={t("seoDescription")} title={t("seoTitle")} />
            <main>
                <AppShell>
                    <Box ref={rootParent}>
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
                                        <Breadcrumbs>
                                            <Link href="/restaurant">{tRestaurant("breadcrumb")}</Link>
                                            <Link href={`/restaurant/${restaurant?.id}`}>{restaurant?.name}</Link>
                                            <Text>{t("breadcrumb")}</Text>
                                        </Breadcrumbs>
                                    </Box>
                                    <Group position="right" spacing="sm" sx={(theme) => ({
                                        width: "100%",
                                        justifyContent: "flex-end",
                                        [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                            justifyContent: "flex-start"
                                        }
                                    })}>
                                        <Button
                                            variant="light"
                                            color="gray"
                                            onClick={() => setJsonModalOpen(true)}
                                            leftIcon={<IconFileCode size={16} />}
                                            disabled={isExpired}
                                        >
                                            JSON Edit
                                        </Button>
                                        {restaurant && <PublishButton restaurant={restaurant} />}
                                    </Group>
                                </Box>

                                {isExpired && (
                                    <Alert
                                        icon={<IconAlertTriangle size={16} />}
                                        title="Menu Editing Locked"
                                        color="red"
                                        mt="md"
                                    >
                                        This restaurant's subscription has expired. Please renew the subscription to reactivate editing options.
                                    </Alert>
                                )}

                                <div style={{ pointerEvents: isExpired ? 'none' : 'auto', opacity: isExpired ? 0.6 : 1 }}>
                                    <Grid gutter="lg" justify="center" mt="xl" ref={gridItemParent}>
                                        <Grid.Col lg={3} md={4} sm={12}>
                                            {router.query?.restaurantId && (
                                                <Menus
                                                    restaurantId={restaurantId}
                                                    selectedMenu={selectedMenu}
                                                    setSelectedMenu={setSelectedMenu}
                                                />
                                            )}
                                        </Grid.Col>
                                        {selectedMenu && (
                                            <Grid.Col lg={9} md={8} sm={12}>
                                                <Categories menuId={selectedMenu?.id} />
                                            </Grid.Col>
                                        )}
                                    </Grid>
                                </div>
                            </>
                        )}
                    </Box>
                </AppShell>
            </main>

            <Modal
                opened={jsonModalOpen}
                onClose={() => {
                    setJsonModalOpen(false);
                    setJsonError(null);
                }}
                title="JSON Menu Editor / Importer"
                size="lg"
                centered
            >
                <Stack spacing="md">
                    <Text size="sm">
                        Create menus quickly by pasting a menu JSON configuration. You can download or view our template structure below:
                    </Text>
                    <Group position="apart">
                        <Link href="/template.json" passHref target="_blank">
                            <Button variant="outline" size="xs" color="gray" leftIcon={<IconDownload size={14} />}>
                                View template.json
                            </Button>
                        </Link>
                    </Group>
                    
                    <Textarea
                        label="Paste Menu JSON"
                        placeholder="Paste JSON here..."
                        minRows={12}
                        maxRows={18}
                        autosize
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        error={jsonError}
                        styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
                    />
                    
                    <Group position="right">
                        <Button variant="outline" color="gray" onClick={() => setJsonModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button color="gray" onClick={handleApplyJson} loading={importing}>
                            Apply & Create Menu
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};


export default EditMenuPage;
