import { useEffect, useState } from "react";

import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Grid,
    Group,
    Loader,
    Paper,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    Title,
    useMantineTheme,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconArrowLeft,
    IconCheck,
    IconClock,
    IconTrash,
    IconVolume,
    IconVolumeOff,
} from "@tabler/icons";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

const KitchenScreenPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const restaurantId = router.query?.restaurantId as string;

    const [isMuted, setIsMuted] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [knownOrderIds, setKnownOrderIds] = useState<Set<string>>(new Set());
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Auto-update elapsed time every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Load mute preference
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedMute = localStorage.getItem("kitchen_mute");
            setIsMuted(savedMute === "true");
        }
    }, []);

    const toggleMute = () => {
        const newVal = !isMuted;
        setIsMuted(newVal);
        if (typeof window !== "undefined") {
            localStorage.setItem("kitchen_mute", String(newVal));
        }
    };

    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.get.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    const { data: orders = [], isLoading: ordersLoading } = api.order.getByRestaurant.useQuery(
        { restaurantId },
        {
            enabled: !!restaurantId,
            refetchInterval: 5000, // Auto refresh every 5 seconds
            staleTime: 0,
        }
    );

    const { mutate: updateStatus } = api.order.updateStatus.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to update status", err);
        },
        onSuccess: () => {
            showSuccessToast("Order Updated", "Order status successfully transitioned.");
        },
    });

    const playNewOrderSound = () => {
        if (isMuted) return;
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

            oscillator.start();

            setTimeout(() => {
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
            }, 120);

            setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
            }, 250);
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    // Detect new orders and beep
    useEffect(() => {
        if (orders && orders.length > 0) {
            const currentIds = new Set(orders.map((o: any) => o.id));
            if (knownOrderIds.size > 0) {
                const hasNew = Array.from(currentIds).some((id) => !knownOrderIds.has(id));
                if (hasNew) {
                    playNewOrderSound();
                }
            }
            setKnownOrderIds(currentIds);
        }
    }, [orders, isMuted]);

    const isLoading = restaurantLoading || ordersLoading;

    if (isLoading) {
        return (
            <Center h="100vh">
                <Loader color="primary" size="lg" />
            </Center>
        );
    }

    const isApproved = restaurant && (restaurant as any).isKitchenEnabled;

    if (!isApproved) {
        return (
            <Center h="100vh" p="md">
                <Card p="xl" radius="lg" shadow="md" style={{ maxWidth: 500, textAlign: "center" }} withBorder>
                    <IconAlertCircle color={theme.colors.red[6]} size={50} style={{ marginBottom: 15 }} />
                    <Title color="red.7" mb="sm" order={3}>
                        Access Denied
                    </Title>
                    <Text color="dimmed" mb="lg" size="sm">
                        The kitchen screen feature is not approved for this restaurant by the superadmin. Please reach
                        out to administration to unlock the feature.
                    </Text>
                    <Button color="primary" onClick={() => router.push("/restaurant")}>
                        Back to Dashboard
                    </Button>
                </Card>
            </Center>
        );
    }

    // Categorize orders
    const pendingOrders = orders.filter((o: any) => o.status === "PENDING");
    const preparingOrders = orders.filter((o: any) => o.status === "PREPARING");
    const readyOrders = orders.filter((o: any) => o.status === "READY");
    const finishedOrders = orders.filter((o: any) => o.status === "COMPLETED" || o.status === "CANCELLED");

    const getElapsedTimeStr = (createdAtStr: string) => {
        const createdTime = new Date(createdAtStr).getTime();
        const diffMs = currentTime - createdTime;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins === 1) return "1 min ago";
        return `${diffMins} mins ago`;
    };

    const getElapsedTimeColor = (createdAtStr: string) => {
        const createdTime = new Date(createdAtStr).getTime();
        const diffMs = currentTime - createdTime;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins > 20) return "red.6";
        if (diffMins > 10) return "orange.6";
        return "gray.6";
    };

    const handleStatusUpdate = (orderId: string, currentStatus: string) => {
        let nextStatus = "PREPARING";
        if (currentStatus === "PREPARING") nextStatus = "READY";
        else if (currentStatus === "READY") nextStatus = "COMPLETED";

        updateStatus({
            id: orderId,
            restaurantId,
            status: nextStatus,
        });
    };

    const handleCancelOrder = (orderId: string) => {
        updateStatus({
            id: orderId,
            restaurantId,
            status: "CANCELLED",
        });
    };

    const renderOrderCard = (order: any) => {
        let parsedItems: any[] = [];
        try {
            parsedItems = JSON.parse(order.items);
        } catch (e) {
            console.error("Failed to parse order items", e);
        }

        return (
            <Card
                key={order.id}
                p="md"
                radius="md"
                shadow="xs"
                sx={{
                    "&:hover": {
                        boxShadow: theme.shadows.sm,
                        transform: "translateY(-2px)",
                    },
                    borderLeft: `5px solid ${
                        order.status === "PENDING"
                            ? theme.colors.primary[5]
                            : order.status === "PREPARING"
                            ? theme.colors.orange[5]
                            : theme.colors.green[5]
                    }`,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                withBorder
            >
                {/* Header: Table, Floor, Time Elapsed */}
                <Group align="center" mb="sm" noWrap position="apart">
                    <Badge color="primary" radius="sm" size="lg" variant="filled">
                        {order.table ? `TABLE ${order.table}` : "GENERAL"}
                    </Badge>
                    <Group noWrap spacing={4}>
                        <IconClock color={theme.colors.gray[5]} size={14} />
                        <Text color={getElapsedTimeColor(order.createdAt)} size="xs" weight={700}>
                            {getElapsedTimeStr(order.createdAt)}
                        </Text>
                    </Group>
                </Group>

                {order.floor && (
                    <Text color="dimmed" mb="xs" size="xs" weight={600}>
                        Section/Floor: {order.floor}
                    </Text>
                )}

                <Divider my="sm" variant="dashed" />

                {/* Items list */}
                <Stack my="sm" spacing="xs">
                    {parsedItems.map((item: any, idx: number) => (
                        <Box key={idx}>
                            <Group align="flex-start" noWrap position="apart">
                                <Text color="dark.8" size="sm" sx={{ flex: 1 }} weight={700}>
                                    {item.quantity} × {item.name}
                                </Text>
                                <Text color="gray.5" size="xs" weight={600}>
                                    {item.price}
                                </Text>
                            </Group>
                            {item.notes && (
                                <Text color="red.6" italic mt={2} pl="md" size="xs">
                                    - {item.notes}
                                </Text>
                            )}
                        </Box>
                    ))}
                </Stack>

                {/* General Special Instructions */}
                {order.generalNotes && (
                    <Paper
                        bg="amber.0"
                        mt="xs"
                        p="xs"
                        sx={{ border: `1px solid ${theme.colors.yellow[2]}`, borderRadius: theme.radius.sm }}
                    >
                        <Group align="flex-start" noWrap spacing={4}>
                            <IconAlertCircle color={theme.colors.yellow[8]} size={14} style={{ marginTop: 2 }} />
                            <Text color="yellow.9" size="xs" weight={500}>
                                {order.generalNotes}
                            </Text>
                        </Group>
                    </Paper>
                )}

                <Divider my="sm" />

                {/* Actions */}
                <Group mt="xs" noWrap position="apart">
                    {order.status !== "READY" ? (
                        <Button
                            color="red"
                            leftIcon={<IconTrash size={12} />}
                            onClick={() => handleCancelOrder(order.id)}
                            size="xs"
                            variant="light"
                        >
                            Cancel
                        </Button>
                    ) : (
                        <div />
                    )}
                    <Button
                        color={
                            order.status === "PENDING" ? "primary" : order.status === "PREPARING" ? "orange" : "green"
                        }
                        onClick={() => handleStatusUpdate(order.id, order.status)}
                        rightIcon={order.status === "READY" ? <IconCheck size={12} /> : undefined}
                        size="xs"
                    >
                        {order.status === "PENDING"
                            ? "Start Preparing"
                            : order.status === "PREPARING"
                            ? "Mark as Ready"
                            : "Done"}
                    </Button>
                </Group>
            </Card>
        );
    };

    return (
        <>
            <NextSeo description="Live kitchen display screen for order tracking" title="Kitchen Display Board" />
            <main>
                <AppShell>
                    <Container fluid py="lg" size="xl">
                        {/* Header Area */}
                        <Group mb="lg" position="apart">
                            <Stack spacing={4}>
                                <Group spacing="sm">
                                    <ActionIcon
                                        color="primary"
                                        onClick={() => router.push(`/restaurant/${restaurantId}`)}
                                        size="lg"
                                        variant="light"
                                    >
                                        <IconArrowLeft size={18} />
                                    </ActionIcon>
                                    <Title color="dark.8" order={2}>
                                        Kitchen Board — {restaurant?.name}
                                    </Title>
                                    <Badge color="green" variant="dot">
                                        Live
                                    </Badge>
                                </Group>
                                <Text color="dimmed" size="sm">
                                    Track and manage table orders in real-time. Sound alerts will notify you of new
                                    arrivals.
                                </Text>
                            </Stack>

                            <Group spacing="md">
                                <Button
                                    color={isMuted ? "red" : "primary"}
                                    leftIcon={isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                                    onClick={toggleMute}
                                    size="xs"
                                    variant="outline"
                                >
                                    {isMuted ? "Sound: Muted" : "Sound: Active"}
                                </Button>
                                <Switch
                                    checked={showCompleted}
                                    label="Show Completed/Cancelled"
                                    onChange={(event) => setShowCompleted(event.currentTarget.checked)}
                                />
                            </Group>
                        </Group>

                        {/* Kanban Columns */}
                        <Grid align="flex-start" gutter="md">
                            {/* Column 1: Pending */}
                            <Grid.Col md={4} xs={12}>
                                <Paper
                                    bg={theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0]}
                                    p="md"
                                    radius="md"
                                >
                                    <Group mb="md" position="apart">
                                        <Group spacing="xs">
                                            <Title order={4}>Pending Orders</Title>
                                            <Badge color="primary" variant="light">
                                                {pendingOrders.length}
                                            </Badge>
                                        </Group>
                                    </Group>
                                    <Stack spacing="md" style={{ minHeight: "50vh" }}>
                                        {pendingOrders.map(renderOrderCard)}
                                        {pendingOrders.length === 0 && (
                                            <Center h="100%" py="xl">
                                                <Text color="dimmed" italic size="sm">
                                                    No pending orders
                                                </Text>
                                            </Center>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Column 2: Preparing */}
                            <Grid.Col md={4} xs={12}>
                                <Paper
                                    bg={theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0]}
                                    p="md"
                                    radius="md"
                                >
                                    <Group mb="md" position="apart">
                                        <Group spacing="xs">
                                            <Title order={4}>Preparing</Title>
                                            <Badge color="orange" variant="light">
                                                {preparingOrders.length}
                                            </Badge>
                                        </Group>
                                    </Group>
                                    <Stack spacing="md" style={{ minHeight: "50vh" }}>
                                        {preparingOrders.map(renderOrderCard)}
                                        {preparingOrders.length === 0 && (
                                            <Center h="100%" py="xl">
                                                <Text color="dimmed" italic size="sm">
                                                    No orders preparing
                                                </Text>
                                            </Center>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Column 3: Ready */}
                            <Grid.Col md={4} xs={12}>
                                <Paper
                                    bg={theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[0]}
                                    p="md"
                                    radius="md"
                                >
                                    <Group mb="md" position="apart">
                                        <Group spacing="xs">
                                            <Title order={4}>Ready for Delivery</Title>
                                            <Badge color="green" variant="light">
                                                {readyOrders.length}
                                            </Badge>
                                        </Group>
                                    </Group>
                                    <Stack spacing="md" style={{ minHeight: "50vh" }}>
                                        {readyOrders.map(renderOrderCard)}
                                        {readyOrders.length === 0 && (
                                            <Center h="100%" py="xl">
                                                <Text color="dimmed" italic size="sm">
                                                    No orders ready
                                                </Text>
                                            </Center>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>
                        </Grid>

                        {/* Completed / Cancelled Section */}
                        {showCompleted && (
                            <Stack mt="xl">
                                <Divider label="Finished & Cancelled History" labelPosition="center" my="lg" />
                                <SimpleGrid
                                    breakpoints={[
                                        { cols: 2, maxWidth: "md" },
                                        { cols: 1, maxWidth: "sm" },
                                    ]}
                                    cols={3}
                                    spacing="md"
                                >
                                    {finishedOrders.map((order) => {
                                        let parsedItems: any[] = [];
                                        try {
                                            parsedItems = JSON.parse(order.items);
                                        } catch (e) {
                                            console.error("Failed to parse items", e);
                                        }
                                        return (
                                            <Card key={order.id} p="md" radius="md" shadow="xs" withBorder>
                                                <Group mb="xs" position="apart">
                                                    <Badge color={order.status === "COMPLETED" ? "green" : "red"}>
                                                        {order.status}
                                                    </Badge>
                                                    <Text color="dimmed" size="xs">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </Text>
                                                </Group>
                                                <Text color="dark.8" mb="xs" size="sm" weight={700}>
                                                    Table: {order.table || "General"}{" "}
                                                    {order.floor ? `(${order.floor})` : ""}
                                                </Text>
                                                <Divider my="xs" variant="dashed" />
                                                <Stack spacing={4}>
                                                    {parsedItems.map((item, i) => (
                                                        <Text key={i} color="dark.7" size="xs">
                                                            {item.quantity} × {item.name}
                                                        </Text>
                                                    ))}
                                                </Stack>
                                            </Card>
                                        );
                                    })}
                                    {finishedOrders.length === 0 && (
                                        <Center py="xl" sx={{ gridColumn: "1 / -1" }}>
                                            <Text color="dimmed" italic size="sm">
                                                No completed or cancelled orders
                                            </Text>
                                        </Center>
                                    )}
                                </SimpleGrid>
                            </Stack>
                        )}
                    </Container>
                </AppShell>
            </main>
        </>
    );
};

export const getStaticPaths = () => {
    return { fallback: "blocking", paths: [] };
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default KitchenScreenPage;
