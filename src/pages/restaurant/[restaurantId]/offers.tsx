import { useMemo, useState } from "react";
import {
    Badge,
    Box,
    Breadcrumbs,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Flex,
    Grid,
    Group,
    Loader,
    MultiSelect,
    Paper,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    TextInput,
    Title,
    useMantineTheme,
} from "@mantine/core";

import { IconCheck, IconChevronLeft, IconGift, IconPlus, IconTag, IconTrash, IconLock } from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { UpgradePlanModal } from "src/components/UpgradePlanModal";
import { api } from "src/utils/api";
import { isFeatureEnabled } from "src/utils/features";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

const OffersPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const restaurantId = router.query?.restaurantId as string;

    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

    // Form states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [type, setType] = useState<"SPECIAL_OFFER" | "COMBO_DEAL">("SPECIAL_OFFER");
    const [isAvailable, setIsAvailable] = useState(true);
    const [endsAt, setEndsAt] = useState<Date | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

    // Fetch restaurant details & offers
    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    const { data: offers = [], isLoading: offersLoading, refetch: refetchOffers } = api.offer.getByRestaurant.useQuery(
        { restaurantId },
        { enabled: !!restaurantId }
    );

    // Mutations
    const { mutate: createOffer, isLoading: creating } = api.offer.create.useMutation({
        onSuccess: () => {
            showSuccessToast("Offer Created Successfully", "The new offer has been added to your menu!");
            resetForm();
            refetchOffers();
        },
        onError: (err: any) => {
            showErrorToast("Failed to create offer", err);
        },
    });

    const { mutate: updateOffer, isLoading: updating } = api.offer.update.useMutation({
        onSuccess: () => {
            showSuccessToast("Offer Updated Successfully", "Your offer changes have been saved!");
            resetForm();
            refetchOffers();
        },
        onError: (err: any) => {
            showErrorToast("Failed to update offer", err);
        },
    });

    const { mutate: deleteOffer } = api.offer.delete.useMutation({
        onSuccess: () => {
            showSuccessToast("Offer Removed", "The offer has been deleted from your listing.");
            refetchOffers();
        },
        onError: (err: any) => {
            showErrorToast("Failed to delete offer", err);
        },
    });

    // Flatten all items for selection dropdown
    const allMenuItems = useMemo(() => {
        const items: any[] = [];
        if (restaurant?.menus) {
            restaurant.menus.forEach((menu: any) => {
                if (menu.categories) {
                    menu.categories.forEach((cat: any) => {
                        if (cat.items) {
                            cat.items.forEach((item: any) => {
                                if (!items.some((i) => i.id === item.id)) {
                                    items.push(item);
                                }
                            });
                        }
                    });
                }
            });
        }
        return items;
    }, [restaurant]);

    const selectData = useMemo(() => {
        return allMenuItems.map((item) => ({
            value: item.id,
            label: `${item.name} (${item.price})`,
        }));
    }, [allMenuItems]);

    const isOffersAllowed = useMemo(() => {
        return isFeatureEnabled(restaurant, "offers");
    }, [restaurant]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setPrice("");
        setType("SPECIAL_OFFER");
        setIsAvailable(true);
        setEndsAt(null);
        setSelectedItemIds([]);
        setEditingOfferId(null);
    };

    const handleEdit = (offer: any) => {
        setEditingOfferId(offer.id);
        setTitle(offer.title);
        setDescription(offer.description);
        setPrice(offer.price || "");
        setType(offer.type as any);
        setIsAvailable(offer.isAvailable);
        setEndsAt(offer.endsAt ? new Date(offer.endsAt) : null);
        
        let ids: string[] = [];
        if (offer.items) {
            try {
                const parsed = JSON.parse(offer.items);
                ids = parsed.map((item: any) => item.itemId);
            } catch (e) {
                console.error("Failed to parse combo items", e);
            }
        }
        setSelectedItemIds(ids);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            showErrorToast("Validation Error", new Error("Offer title is required."));
            return;
        }

        const serializedItems = type === "COMBO_DEAL" 
            ? JSON.stringify(selectedItemIds.map(id => ({ itemId: id, qty: 1 }))) 
            : null;

        const payload = {
            restaurantId,
            title: title.trim(),
            description: description.trim(),
            price: price.trim() || null,
            type,
            isAvailable,
            endsAt: endsAt ? endsAt.toISOString() : null,
            items: serializedItems,
        };

        if (editingOfferId) {
            updateOffer({ id: editingOfferId, ...payload });
        } else {
            createOffer(payload);
        }
    };

    if (restaurantLoading || offersLoading) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    if (!isOffersAllowed) {
        return (
            <>
                <NextSeo title="Smart Offers & Combo Deals" />
                <main>
                    <AppShell>
                        <Container py="xl" size="sm">
                            <Card p="xl" radius="md" shadow="sm" withBorder style={{ textAlign: "center" }}>
                                <IconLock size={48} color={theme.colors.orange[6]} style={{ marginBottom: "16px" }} />
                                <Title order={2} mb="xs">
                                    Smart Offers Locked
                                </Title>
                                <Text color="dimmed" mb="lg">
                                    Special Offers & Combo Deals are premium marketing tools designed to boost average order value and guest retention. Please upgrade to our **Premium Plan** to unlock this feature.
                                </Text>
                                <Button color="orange" size="md" onClick={() => setUpgradeModalOpen(true)}>
                                    Upgrade Plan
                                </Button>
                            </Card>
                        </Container>
                        {restaurant && (
                            <UpgradePlanModal
                                opened={upgradeModalOpen}
                                onClose={() => setUpgradeModalOpen(false)}
                                restaurantId={restaurant.id}
                                restaurantName={restaurant.name}
                                targetPlan="Premium"
                            />
                        )}
                    </AppShell>
                </main>
            </>
        );
    }

    return (
        <>
            <NextSeo title={`Smart Offers & Combos - ${restaurant?.name}`} />
            <main>
                <AppShell>
                    <Container fluid py="lg">
                        <Stack spacing="lg">
                            <Group position="apart">
                                <Group spacing="sm">
                                    <Link href={`/restaurant/${restaurantId}`} passHref>
                                        <Button
                                            color="gray"
                                            compact
                                            leftIcon={<IconChevronLeft size={16} />}
                                            variant="subtle"
                                        >
                                            Back
                                        </Button>
                                    </Link>
                                    <Title order={2}>Manage Smart Offers & Combo Deals</Title>
                                </Group>
                            </Group>

                            <Grid gutter="lg">
                                {/* Left: Create/Edit Form */}
                                <Grid.Col md={5}>
                                    <Card p="md" radius="md" withBorder>
                                        <Title order={4} mb="md">
                                            {editingOfferId ? "Edit Offer / Combo" : "Create New Offer or Combo"}
                                        </Title>
                                        <form onSubmit={handleSubmit}>
                                            <Stack spacing="md">
                                                <TextInput
                                                    label="Offer Title (e.g. Diwali Burger Feast)"
                                                    placeholder="Enter title"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    required
                                                />
                                                
                                                <TextInput
                                                    label="Offer Description (e.g. Get 1 Cheeseburger + 1 Fries + Drink)"
                                                    placeholder="Enter details"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                />

                                                <Select
                                                    label="Offer Type"
                                                    data={[
                                                        { label: "Limited-Time Special Offer", value: "SPECIAL_OFFER" },
                                                        { label: "Irresistible Combo Deal", value: "COMBO_DEAL" },
                                                    ]}
                                                    value={type}
                                                    onChange={(val) => {
                                                        setType(val as any);
                                                        if (val === "SPECIAL_OFFER") {
                                                            setSelectedItemIds([]);
                                                        }
                                                    }}
                                                />

                                                {type === "COMBO_DEAL" && (
                                                    <MultiSelect
                                                        label="Bundle Dishes into Combo"
                                                        placeholder="Search and select dishes"
                                                        data={selectData}
                                                        value={selectedItemIds}
                                                        onChange={setSelectedItemIds}
                                                        searchable
                                                        clearable
                                                        nothingFound="No dishes found"
                                                    />
                                                )}

                                                <TextInput
                                                    label="Promo Price or Discount Value (e.g. ₹299 or 20% Off)"
                                                    placeholder="e.g. ₹299"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                />

                                                <TextInput
                                                    type="date"
                                                    label="Expiration Date (Creates sense of urgency)"
                                                    placeholder="Select date (optional)"
                                                    value={endsAt ? endsAt.toISOString().slice(0, 10) : ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEndsAt(val ? new Date(val) : null);
                                                    }}
                                                />

                                                <Switch
                                                    label="Offer Status (Available/Active)"
                                                    checked={isAvailable}
                                                    onChange={(e) => setIsAvailable(e.currentTarget.checked)}
                                                />

                                                <Group position="right" mt="sm">
                                                    {editingOfferId && (
                                                        <Button variant="outline" color="gray" onClick={resetForm}>
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    <Button type="submit" loading={creating || updating}>
                                                        {editingOfferId ? "Save Changes" : "Create Offer"}
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </form>
                                    </Card>
                                </Grid.Col>

                                {/* Right: Active Offers Grid */}
                                <Grid.Col md={7}>
                                    <Card p="md" radius="md" withBorder sx={{ height: "100%", minHeight: 450 }}>
                                        <Title order={4} mb="md">Active Live Offers ({offers.length})</Title>
                                        
                                        <ScrollArea h={480} type="auto">
                                            <Stack spacing="md">
                                                {offers.map((offer: any) => {
                                                    const isExpired = offer.endsAt && new Date(offer.endsAt) < new Date();
                                                    return (
                                                        <Paper
                                                            key={offer.id}
                                                            p="md"
                                                            radius="sm"
                                                            style={{
                                                                border: `1px solid ${offer.isAvailable && !isExpired ? theme.colors.green[2] : theme.colors.gray[2]}`,
                                                                opacity: offer.isAvailable && !isExpired ? 1 : 0.7,
                                                            }}
                                                        >
                                                            <Group position="apart" align="flex-start" noWrap>
                                                                <Stack spacing={4} sx={{ flex: 1 }}>
                                                                    <Group spacing={8}>
                                                                        <Badge color={offer.type === "COMBO_DEAL" ? "violet" : "orange"} variant="filled">
                                                                            {offer.type === "COMBO_DEAL" ? "Combo" : "Special"}
                                                                        </Badge>
                                                                        {offer.price && (
                                                                            <Badge color="red" variant="outline">
                                                                                {offer.price}
                                                                            </Badge>
                                                                        )}
                                                                        {!offer.isAvailable && (
                                                                            <Badge color="gray">Inactive</Badge>
                                                                        )}
                                                                        {isExpired && (
                                                                            <Badge color="red">Expired</Badge>
                                                                        )}
                                                                    </Group>

                                                                    <Text weight={700} size="md" mt={4}>
                                                                        {offer.title}
                                                                    </Text>

                                                                    <Text size="xs" color="dimmed">
                                                                        {offer.description}
                                                                    </Text>

                                                                    {offer.endsAt && (
                                                                        <Text size="xs" color="red" weight={500} mt={4}>
                                                                            Expires: {new Date(offer.endsAt).toLocaleDateString()}
                                                                        </Text>
                                                                    )}
                                                                </Stack>

                                                                <Group spacing={6}>
                                                                    <Button size="xs" variant="light" onClick={() => handleEdit(offer)}>
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="light"
                                                                        color="red"
                                                                        onClick={() => deleteOffer({ id: offer.id, restaurantId })}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </Group>
                                                            </Group>
                                                        </Paper>
                                                    );
                                                })}

                                                {offers.length === 0 && (
                                                    <Center style={{ height: 200 }}>
                                                        <Stack spacing="xs" style={{ alignItems: "center" }}>
                                                            <IconTag size={36} color={theme.colors.gray[4]} />
                                                            <Text color="dimmed" size="sm">No offers or bundles built yet.</Text>
                                                        </Stack>
                                                    </Center>
                                                )}
                                            </Stack>
                                        </ScrollArea>
                                    </Card>
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Container>
                </AppShell>
            </main>
        </>
    );
};

export default OffersPage;
