import { useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Center,
    Grid,
    Group,
    Loader,
    Modal,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
} from "@mantine/core";
import { IconAlertTriangle, IconDownload, IconFileCode } from "@tabler/icons";
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
        },
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
                menuData: parsed,
                restaurantId,
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
                                        <Breadcrumbs>
                                            <Link href="/restaurant">{tRestaurant("breadcrumb")}</Link>
                                            <Link href={`/restaurant/${restaurant?.id}`}>{restaurant?.name}</Link>
                                            <Text>{t("breadcrumb")}</Text>
                                        </Breadcrumbs>
                                    </Box>
                                    <Group
                                        position="right"
                                        spacing="sm"
                                        sx={(theme) => ({
                                            justifyContent: "flex-end",
                                            width: "100%",
                                            [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                                justifyContent: "flex-start",
                                            },
                                        })}
                                    >
                                        <Button
                                            color="gray"
                                            disabled={isExpired}
                                            leftIcon={<IconFileCode size={16} />}
                                            onClick={() => setJsonModalOpen(true)}
                                            variant="light"
                                        >
                                            JSON Edit
                                        </Button>
                                        {restaurant && <PublishButton restaurant={restaurant} />}
                                    </Group>
                                </Box>

                                {isExpired && (
                                    <Alert
                                        color="red"
                                        icon={<IconAlertTriangle size={16} />}
                                        mt="md"
                                        title="Menu Editing Locked"
                                    >
                                        This restaurant's subscription has expired. Please renew the subscription to
                                        reactivate editing options.
                                    </Alert>
                                )}

                                <div
                                    style={{ opacity: isExpired ? 0.6 : 1, pointerEvents: isExpired ? "none" : "auto" }}
                                >
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
                centered
                onClose={() => {
                    setJsonModalOpen(false);
                    setJsonError(null);
                }}
                opened={jsonModalOpen}
                size="lg"
                title="JSON Menu Editor / Importer"
            >
                <Stack spacing="md">
                    <Text size="sm">
                        Create menus quickly by pasting a menu JSON configuration. You can download or view our template
                        structure below:
                    </Text>
                    <Group position="apart">
                        <Link href="/template.json" passHref target="_blank">
                            <Button color="gray" leftIcon={<IconDownload size={14} />} size="xs" variant="outline">
                                View template.json
                            </Button>
                        </Link>
                    </Group>

                    <Textarea
                        autosize
                        error={jsonError}
                        label="Paste Menu JSON"
                        maxRows={18}
                        minRows={12}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Paste JSON here..."
                        styles={{ input: { fontFamily: "monospace", fontSize: "12px" } }}
                        value={jsonInput}
                    />

                    <Group position="right">
                        <Button color="gray" onClick={() => setJsonModalOpen(false)} variant="outline">
                            Cancel
                        </Button>
                        <Button color="gray" loading={importing} onClick={handleApplyJson}>
                            Apply & Create Menu
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};

export default EditMenuPage;
