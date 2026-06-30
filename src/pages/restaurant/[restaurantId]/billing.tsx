import { useMemo, useState } from "react";
import {
    ActionIcon,
    Box,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Flex,
    Grid,
    Group,
    Loader,
    NumberInput,
    Paper,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Title,
    useMantineTheme,
} from "@mantine/core";
import { IconBrandWhatsapp, IconChevronLeft, IconPlus, IconTrash } from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";
import { formatPrice, parsePrice } from "src/utils/plateContext";

interface SelectedItem {
    id: string;
    name: string;
    price: string;
    quantity: number;
}

const BillingPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const restaurantId = router.query?.restaurantId as string;

    const [phone, setPhone] = useState("");
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch restaurant details (menus, categories, items)
    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    // Fetch customer loyalty data if phone is entered
    const { data: loyalty, refetch: refetchLoyalty } = api.loyalty.getByPhone.useQuery(
        { phone, restaurantId },
        { enabled: !!restaurantId && phone.length >= 8 }
    );

    const { mutate: registerVisit, isLoading: registeringVisit } = api.loyalty.registerVisit.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to register visit", err);
        },
    });

    // Flatten all menu items for easy selection
    const allMenuItems = useMemo(() => {
        const items: any[] = [];
        if (restaurant?.menus) {
            restaurant.menus.forEach((menu: any) => {
                if (menu.categories) {
                    menu.categories.forEach((cat: any) => {
                        if (cat.items) {
                            cat.items.forEach((item: any) => {
                                // Prevent duplicates if item exists in multiple categories
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

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        if (!searchQuery) return allMenuItems;
        return allMenuItems.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allMenuItems, searchQuery]);

    const handleAddItem = (item: any) => {
        const existing = selectedItems.find((i) => i.id === item.id);
        if (existing) {
            setSelectedItems(
                selectedItems.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                )
            );
        } else {
            setSelectedItems([...selectedItems, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
        }
    };

    const handleRemoveItem = (itemId: string) => {
        setSelectedItems(selectedItems.filter((i) => i.id !== itemId));
    };

    const handleQuantityChange = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            handleRemoveItem(itemId);
            return;
        }
        setSelectedItems(selectedItems.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    };

    const getBillTotal = () => {
        let totalVal = 0;
        let currencyStr = restaurant?.currency || "₹";

        selectedItems.forEach((item) => {
            const { number, currency } = parsePrice(item.price);
            totalVal += number * item.quantity;
            if (currency && !restaurant?.currency) {
                currencyStr = currency;
            }
        });

        return {
            formatted: formatPrice(totalVal, currencyStr),
            totalVal,
        };
    };

    const handleProcessBill = () => {
        if (!phone) {
            showErrorToast("Phone Number Required", { message: "Please enter customer phone number first." });
            return;
        }
        if (selectedItems.length === 0) {
            showErrorToast("Empty Order", { message: "Please add at least one item to the bill." });
            return;
        }

        // Register the visit
        registerVisit(
            { phone, restaurantId },
            {
                onSuccess: (data: any) => {
                    showSuccessToast("Loyalty Visit Registered!", `Visit count: ${data.visitCount}`);
                    refetchLoyalty();

                    // Generate WhatsApp message
                    let msg = `*Thanks for visiting!* 🍽️\n\n`;
                    selectedItems.forEach((item) => {
                        msg += `${item.quantity} x ${item.name} (${item.price})\n`;
                    });
                    msg += `\n*Total:* ${getBillTotal().formatted}\n`;
                    msg += `---------------------------\n`;
                    msg += `*Visit ${data.visitCount} / 10*\n`;
                    msg += `---------------------------\n`;
                    msg += `See our Menu again: ${window.location.origin}/restaurant/${restaurantId}/menu\n`;

                    const cleanPhone = phone.replace(/[^0-9]/g, "");
                    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                    window.open(waUrl, "_blank");

                    // Clear items after bill is processed
                    setSelectedItems([]);
                },
            }
        );
    };

    if (restaurantLoading) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <>
            <NextSeo title={`WhatsApp Billing & Loyalty - ${restaurant?.name || "Dashboard"}`} />
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
                                    <Title order={2}>WhatsApp Billing & Loyalty</Title>
                                </Group>
                            </Group>

                            <Grid gutter="md">
                                {/* Left Side: Customer & Item Selection */}
                                <Grid.Col md={7}>
                                    <Stack spacing="md">
                                        <Card p="md" radius="md" withBorder>
                                            <Title order={4} mb="sm">1. Customer Information</Title>
                                            <TextInput
                                                label="Customer Phone Number (with Country Code, e.g. 919876543210)"
                                                placeholder="Enter phone number"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                            />
                                            {loyalty && (
                                                <Paper bg="primary.0" p="sm" mt="md" radius="sm">
                                                    <Group position="apart">
                                                        <Text size="sm" weight={600} color="primary.9">
                                                            Returning Customer Loyalty Visit Profile:
                                                        </Text>
                                                        <Text size="sm" weight={700} color="primary.9">
                                                            Visits: {loyalty.visitCount} / 10
                                                        </Text>
                                                    </Group>
                                                </Paper>
                                            )}
                                        </Card>

                                        <Card p="md" radius="md" withBorder>
                                            <Title order={4} mb="sm">2. Add Menu Items</Title>
                                            <TextInput
                                                placeholder="Search menu items..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                mb="md"
                                            />
                                            <ScrollArea h={320} type="auto">
                                                <Stack spacing="xs">
                                                    {filteredItems.map((item) => (
                                                        <Paper
                                                            key={item.id}
                                                            p="sm"
                                                            radius="sm"
                                                            sx={(theme) => ({
                                                                "&:hover": {
                                                                    backgroundColor: theme.colors.gray[0],
                                                                },
                                                                border: `1px solid ${theme.colors.gray[2]}`,
                                                            })}
                                                        >
                                                            <Group position="apart">
                                                                <Box>
                                                                    <Text size="sm" weight={600}>{item.name}</Text>
                                                                    <Text size="xs" color="dimmed">{item.price}</Text>
                                                                </Box>
                                                                <Button
                                                                    compact
                                                                    onClick={() => handleAddItem(item)}
                                                                    size="xs"
                                                                    leftIcon={<IconPlus size={12} />}
                                                                >
                                                                    Add
                                                                </Button>
                                                            </Group>
                                                        </Paper>
                                                    ))}
                                                    {filteredItems.length === 0 && (
                                                        <Text color="dimmed" align="center" size="sm" py="xl">
                                                            No items found
                                                        </Text>
                                                    )}
                                                </Stack>
                                            </ScrollArea>
                                        </Card>
                                    </Stack>
                                </Grid.Col>

                                {/* Right Side: Bill Summary & Checkout */}
                                <Grid.Col md={5}>
                                    <Card p="md" radius="md" withBorder sx={{ height: "100%" }}>
                                        <Flex direction="column" justify="space-between" h="100%" sx={{ minHeight: 460 }}>
                                            <Box>
                                                <Title order={4} mb="md">Order Summary</Title>
                                                <ScrollArea h={280} type="auto" mb="md">
                                                    <Stack spacing="xs" pr="xs">
                                                        {selectedItems.map((item) => (
                                                            <Paper key={item.id} p="xs" bg="gray.0" radius="xs">
                                                                <Group position="apart" noWrap>
                                                                    <Box sx={{ flex: 1 }}>
                                                                        <Text size="sm" weight={600}>{item.name}</Text>
                                                                        <Text size="xs" color="dimmed">{item.price}</Text>
                                                                    </Box>
                                                                    <Group spacing={8} noWrap>
                                                                        <NumberInput
                                                                            value={item.quantity}
                                                                            onChange={(val) => handleQuantityChange(item.id, val || 0)}
                                                                            max={99}
                                                                            min={0}
                                                                            size="xs"
                                                                            sx={{ width: 60 }}
                                                                        />
                                                                        <ActionIcon
                                                                            color="red"
                                                                            onClick={() => handleRemoveItem(item.id)}
                                                                            size="sm"
                                                                            variant="subtle"
                                                                        >
                                                                            <IconTrash size={14} />
                                                                        </ActionIcon>
                                                                    </Group>
                                                                </Group>
                                                            </Paper>
                                                        ))}
                                                        {selectedItems.length === 0 && (
                                                            <Text color="dimmed" align="center" size="sm" py="xl">
                                                                No items selected
                                                            </Text>
                                                        )}
                                                    </Stack>
                                                </ScrollArea>
                                            </Box>

                                            <Box>
                                                <Divider my="md" />
                                                <Group position="apart" mb="md">
                                                    <Text size="lg" weight={700}>Total Bill Amount:</Text>
                                                    <Text color="primary" size="xl" weight={800}>
                                                        {getBillTotal().formatted}
                                                    </Text>
                                                </Group>
                                                <Button
                                                    color="green"
                                                    fullWidth
                                                    leftIcon={<IconBrandWhatsapp size={20} />}
                                                    loading={registeringVisit}
                                                    onClick={handleProcessBill}
                                                    size="md"
                                                >
                                                    Submit & Send WhatsApp Receipt
                                                </Button>
                                            </Box>
                                        </Flex>
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

export default BillingPage;
