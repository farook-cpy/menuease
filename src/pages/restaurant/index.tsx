import type { FC } from "react";
import { useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Box, Center, Flex, Loader, SimpleGrid, Title, Badge, Button, Group, Text, Stack, Alert, Modal, Select, Table, Divider, Card } from "@mantine/core";
import { IconCirclePlus, IconAlertTriangle, IconCreditCard, IconHistory } from "@tabler/icons";
import { useSession, impersonate } from "src/utils/supabaseAuth";
import { type NextPage } from "next";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import type { Image, Restaurant } from "@prisma/client";

import { AppShell } from "src/components/AppShell";
import { IconCard, ImageCard } from "src/components/Cards";
import { DeleteConfirmModal } from "src/components/DeleteConfirmModal";
import { RestaurantForm } from "src/components/Forms/RestaurantForm";
import { env } from "src/env/client.mjs";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

/** Image card that will represent each restaurant that the user created */
const RestaurantCard: FC<{ item: Restaurant & { image: Image | null }; isOwner: boolean }> = ({ item: rawItem, isOwner }) => {
    const item = rawItem as any;
    const status = item.subscriptionStatus || "trial";
    const trpcCtx = api.useContext();
    const { data: session } = useSession();
    const { data: adminRole } = api.admin.getRole.useQuery();
    const isAdmin = adminRole === "Super Admin" || adminRole === "Admin";
    const isSuperAdmin = session?.user?.email === "farookisop@gmail.com";
    const [restaurantFormOpen, setRestaurantFormOpen] = useState(false);
    const [deleteFormOpen, setDeleteFormOpen] = useState(false);
    const t = useTranslations("dashboard.restaurant");
    const tCommon = useTranslations("common");

    const { mutate: deleteRestaurant, isLoading: isDeleting } = api.restaurant.delete.useMutation({
        onError: (err: any) => showErrorToast(t("deleteError"), err),
        onSettled: () => setDeleteFormOpen(false),
        onSuccess: (data: any) => {
            trpcCtx.restaurant.getAll.setData(undefined, (restaurants: any[] | undefined) =>
                restaurants?.filter((restaurantItem: any) => restaurantItem.id !== data.id)
            );
            showSuccessToast(tCommon("deleteSuccess"), t("deleteSuccessDesc", { name: data.name }));
        },
    });

    const { mutate: cloneRestaurant, isLoading: isCloning } = api.restaurant.clone.useMutation({
        onError: (err: any) => showErrorToast("Failed to clone restaurant", err),
        onSuccess: (data: any) => {
            trpcCtx.restaurant.getAll.invalidate();
            showSuccessToast("Restaurant Cloned", `Successfully cloned to ${data.name}`);
        },
    });

    const { mutate: setSuspended, isLoading: isTogglingSuspension } = api.restaurant.setSuspended.useMutation({
        onError: (err: any) => showErrorToast("Failed to update status", err),
        onSuccess: (data: any) => {
            trpcCtx.restaurant.getAll.invalidate();
            showSuccessToast(
                data.isSuspended ? "Restaurant Suspended" : "Restaurant Activated",
                `Successfully updated status of ${data.name}`
            );
        },
    });

    const [billingOpen, setBillingOpen] = useState(false);
    const [renewPlanName, setRenewPlanName] = useState<"Basic Plan" | "Premium Plan">("Basic Plan");

    const { data: billingHistory = [], isLoading: loadingHistory } = api.billing.getHistory.useQuery(
        { restaurantId: item.id },
        { enabled: billingOpen }
    );

    const { mutate: renewWithCredits, isLoading: isRenewing } = api.restaurant.renewWithCredits.useMutation({
        onError: (err: any) => showErrorToast("Failed to renew subscription", err),
        onSuccess: (data: any) => {
            trpcCtx.restaurant.getAll.invalidate();
            showSuccessToast("Subscription Renewed", `Successfully renewed plan for ${data.name}`);
            setBillingOpen(false);
        }
    });

    const isSuspended = (item as any).isSuspended || false;
    const loading = isDeleting || isCloning || isTogglingSuspension;

    return (
        <Stack spacing="xs">
            <ImageCard
                editDeleteOptions={isOwner ? undefined : {
                    onDeleteClick: () => setDeleteFormOpen(true),
                    onEditClick: () => setRestaurantFormOpen(true),
                    onCloneClick: isAdmin ? () => cloneRestaurant({ id: item.id }) : undefined,
                    onImpersonateClick: isAdmin ? () => impersonate(item.id, item.name, (item as any).ownerUsername || "") : undefined,
                    isSuspended: isSuspended,
                    onSuspendClick: isAdmin ? () => setSuspended({ id: item.id, isSuspended: !isSuspended }) : undefined,
                    loading,
                }}
                href={`/restaurant/${item.id}`}
                image={item.image}
                imageAlt={item.name}
                subTitle={isSuspended ? `[SUSPENDED] - ${item.location}` : item.location}
                testId={`restaurant-card-${item.name}`}
                title={isSuspended ? `🚫 ${item.name}` : item.name}
            />
            {isOwner && (
                <Card withBorder radius="md" p="xs" mt="-xs">
                    <Group position="apart">
                        <Stack spacing={2}>
                            <Text size="xs" color="dimmed" weight={500}>
                                Subscription: <Badge size="xs" color={status === "expired" ? "red" : status === "trial" ? "yellow" : "green"} variant="filled">{item.planName || "Free Trial"}</Badge>
                            </Text>
                            <Text size="xs" color="dimmed">
                                Balance: <Text span weight={600} color="teal">{((item as any).balance || 0).toFixed(2)} Credits</Text>
                            </Text>
                        </Stack>
                        <Button size="xs" variant="light" color="violet" onClick={() => setBillingOpen(true)}>
                            Billing & Renew
                        </Button>
                    </Group>
                </Card>
            )}
            <RestaurantForm
                onClose={() => setRestaurantFormOpen(false)}
                opened={restaurantFormOpen}
                restaurant={item}
            />
            <DeleteConfirmModal
                description={t("deleteModalDesc")}
                loading={isDeleting}
                onClose={() => setDeleteFormOpen(false)}
                onDelete={() => deleteRestaurant({ id: item.id || "" })}
                opened={deleteFormOpen}
                title={t("deleteModalTitle", { name: item.name })}
            />

            {/* Owner Billing & Renew Modal */}
            <Modal
                opened={billingOpen}
                onClose={() => setBillingOpen(false)}
                title={`Billing & Subscription Settings: ${item.name}`}
                size="md"
                centered
            >
                <Stack spacing="md">
                    <div>
                        <Text size="sm" color="dimmed" weight={500}>Current Plan</Text>
                        <Badge size="lg" color="violet" variant="light" mt="xs">
                            {item.planName || "Free Trial"}
                        </Badge>
                    </div>

                    <div>
                        <Text size="sm" color="dimmed" weight={500}>Subscription Status</Text>
                        <Badge 
                            size="lg" 
                            color={
                                status === "expired" 
                                    ? "red" 
                                    : status === "trial" 
                                    ? "yellow" 
                                    : "green"
                            } 
                            variant="filled" 
                            mt="xs"
                        >
                            {status.toUpperCase()}
                        </Badge>
                    </div>

                    <div>
                        <Text size="sm" color="dimmed" weight={500}>Expiry / Trial End Date</Text>
                        <Text size="sm" weight={600} mt="xs">
                            {status === "trial" && (item as any).trialEndsAt
                                ? new Date((item as any).trialEndsAt).toLocaleDateString()
                                : item.subscriptionExpiresAt
                                ? new Date(item.subscriptionExpiresAt).toLocaleDateString()
                                : "N/A"}
                        </Text>
                    </div>

                    <Divider />

                    <div>
                        <Text size="sm" color="dimmed" weight={500}>Your Account Balance</Text>
                        <Title order={3} color="teal" mt="xs">
                            {((item as any).balance || 0).toFixed(2)} Credits
                        </Title>
                        <Text size="xs" color="dimmed" mt="xs">
                            To add credits to your balance, please complete a deposit payment by contacting system administrators.
                        </Text>
                    </div>

                    <Divider />

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        renewWithCredits({
                            restaurantId: item.id,
                            planName: renewPlanName
                        });
                    }}>
                        <Stack spacing="xs">
                            <Text size="sm" weight={500}>Renew / Upgrade Plan</Text>
                            <Select
                                value={renewPlanName}
                                onChange={(val) => setRenewPlanName(val as any || "Basic Plan")}
                                data={[
                                    { value: "Basic Plan", label: "Basic Plan (Cost: 15 Credits for 30 Days)" },
                                    { value: "Premium Plan", label: "Premium Plan (Cost: 40 Credits for 30 Days)" },
                                ]}
                            />
                            <Button
                                type="submit"
                                color="violet"
                                loading={isRenewing}
                                fullWidth
                                mt="sm"
                            >
                                Renew Subscription
                            </Button>
                        </Stack>
                    </form>

                    <Divider label="Payment Ledger" labelPosition="center" />

                    <div>
                        <Text size="sm" weight={500} mb="xs">Recent Transactions</Text>
                        {loadingHistory ? (
                            <Center py="xs"><Loader size="xs" /></Center>
                        ) : (
                            <Table striped verticalSpacing="xs">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Details</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingHistory.slice(0, 5).map((tx: any) => {
                                        const isDebit = tx.amount < 0;
                                        return (
                                            <tr key={tx.id}>
                                                <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                <td><Text size="xs">{tx.description}</Text></td>
                                                <td>
                                                    <Text size="xs" weight={600} color={isDebit ? "red" : "green"}>
                                                        {isDebit ? "" : "+"}${Math.abs(tx.amount).toFixed(2)}
                                                    </Text>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {billingHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={3}>
                                                <Text align="center" size="xs" color="dimmed">No transaction history.</Text>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </div>
                </Stack>
            </Modal>
        </Stack>
    );
};

/** Page to view all the restaurants that were created by you */
const RestaurantsListPage: NextPage = () => {
    const { data: session } = useSession();
    const { data: adminRole } = api.admin.getRole.useQuery();
    const isSuperAdmin = adminRole === "Super Admin";
    const isAdmin = adminRole === "Super Admin" || adminRole === "Admin";
    const isOwner = session?.user?.role === "restaurant-owner";
    const [restaurantFormOpen, setRestaurantFormOpen] = useState(false);
    const t = useTranslations("dashboard.restaurant");
    const { data: restaurants, isLoading } = api.restaurant.getAll.useQuery(undefined, {
        onError: () => showErrorToast(t("fetchRestaurantsError")),
    });
    const [gridItemParent] = useAutoAnimate<HTMLDivElement>();
    const [rootParent] = useAutoAnimate<HTMLDivElement>();

    return (
        <>
            <NextSeo description={t("seoDescription")} title={t("seoTitle")} />
            <main>
                <AppShell>
                    <Flex align="center" justify="space-between">
                        <Title order={1}>{t("headerTitle")}</Title>
                        <Group spacing="xs">
                            {isSuperAdmin && (
                                <Button
                                    color="violet"
                                    onClick={() => window.location.href = "/admin/console"}
                                    variant="light"
                                >
                                    Admin Console
                                </Button>
                            )}
                            {isAdmin && (
                                <Badge color="violet" size="lg" variant="filled">
                                    {adminRole} Mode
                                </Badge>
                            )}
                            {isOwner && (
                                <Badge color="blue" size="lg" variant="filled">
                                    Restaurant Owner Mode
                                </Badge>
                            )}
                        </Group>
                    </Flex>
                    <Box mt="xl" ref={rootParent}>
                        {isOwner && restaurants?.map((rest: any) => {
                            const expiresAt = rest.subscriptionExpiresAt ? new Date(rest.subscriptionExpiresAt) : null;
                            const restStatus = rest.subscriptionStatus || "trial";
                            const isExpired = restStatus === "expired" || (expiresAt && new Date() > expiresAt);
                            const isExpiringSoon = expiresAt && !isExpired && (expiresAt.getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000);
                            
                            if (isExpired || isExpiringSoon) {
                                return (
                                    <Alert
                                        icon={<IconAlertTriangle size={16} />}
                                        title={isExpired ? "Subscription Expired" : "Subscription Expiring Soon"}
                                        color={isExpired ? "red" : "yellow"}
                                        mb="md"
                                        key={rest.id}
                                    >
                                        <Text size="sm">
                                            {isExpired 
                                              ? `Your subscription for "${rest.name}" has expired. Access to edit menus is blocked. Please renew your plan using the card button below.` 
                                              : `Your subscription for "${rest.name}" expires soon on ${expiresAt?.toLocaleDateString()}. Please renew soon.`}
                                        </Text>
                                    </Alert>
                                );
                            }
                            return null;
                        })}
                        {isLoading ? (
                            <Center h="50vh" w="100%">
                                <Loader size="lg" />
                            </Center>
                        ) : (
                            <SimpleGrid
                                breakpoints={[
                                    { cols: 3, minWidth: "lg" },
                                    { cols: 2, minWidth: "sm" },
                                    { cols: 1, minWidth: "xs" },
                                ]}
                                mt="md"
                                ref={gridItemParent}
                            >
                                {restaurants?.map((item) => (
                                    <RestaurantCard key={item.id} item={item} isOwner={isOwner} />
                                ))}
                                {!isOwner && (isAdmin || (restaurants && restaurants.length < Number(env.NEXT_PUBLIC_MAX_RESTAURANTS_PER_USER))) && (
                                        <IconCard
                                            key="add-new-restaurant"
                                            Icon={IconCirclePlus}
                                            onClick={() => setRestaurantFormOpen(true)}
                                            subTitle={t("addNewCardSubTitle")}
                                            testId="add-new-restaurant"
                                            title={t("addNewCardTitle")}
                                        />
                                    )}
                            </SimpleGrid>
                        )}
                    </Box>
                </AppShell>
                <RestaurantForm onClose={() => setRestaurantFormOpen(false)} opened={restaurantFormOpen} />
            </main>
        </>
    );
};

export const getStaticProps = async () => ({ props: { messages: (await import("src/lang/en.json")).default } });

export default RestaurantsListPage;
