import { useState, useEffect } from "react";
import {
    Container,
    Stack,
    Group,
    Title,
    Text,
    Button,
    Card,
    SimpleGrid,
    Badge,
    Center,
    Loader,
    ActionIcon,
    Grid,
    Paper,
    Switch,
    Divider,
    useMantineTheme,
    Box,
} from "@mantine/core";
import {
    IconArrowLeft,
    IconClock,
    IconAlertCircle,
    IconVolume,
    IconVolumeOff,
    IconCheck,
    IconTrash,
} from "@tabler/icons";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";
import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";
import { showSuccessToast, showErrorToast } from "src/utils/helpers";

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
        onSuccess: () => {
            showSuccessToast("Order Updated", "Order status successfully transitioned.");
        },
        onError: (err: any) => {
            showErrorToast("Failed to update status", err);
        }
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
                const hasNew = Array.from(currentIds).some(id => !knownOrderIds.has(id));
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
                <Loader size="lg" color="primary" />
            </Center>
        );
    }

    const isApproved = restaurant && (restaurant as any).isKitchenEnabled;

    if (!isApproved) {
        return (
            <Center h="100vh" p="md">
                <Card withBorder shadow="md" p="xl" radius="lg" style={{ maxWidth: 500, textAlign: 'center' }}>
                    <IconAlertCircle size={50} color={theme.colors.red[6]} style={{ marginBottom: 15 }} />
                    <Title order={3} color="red.7" mb="sm">Access Denied</Title>
                    <Text size="sm" color="dimmed" mb="lg">
                        The kitchen screen feature is not approved for this restaurant by the superadmin.
                        Please reach out to administration to unlock the feature.
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
            status: nextStatus
        });
    };

    const handleCancelOrder = (orderId: string) => {
        updateStatus({
            id: orderId,
            restaurantId,
            status: "CANCELLED"
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
                withBorder
                shadow="xs"
                p="md"
                radius="md"
                sx={{
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    borderLeft: `5px solid ${
                        order.status === 'PENDING' ? theme.colors.primary[5] :
                        order.status === 'PREPARING' ? theme.colors.orange[5] :
                        theme.colors.green[5]
                    }`,
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows.sm
                    }
                }}
            >
                {/* Header: Table, Floor, Time Elapsed */}
                <Group position="apart" mb="sm" align="center" noWrap>
                    <Badge color="primary" size="lg" radius="sm" variant="filled">
                        {order.table ? `TABLE ${order.table}` : "GENERAL"}
                    </Badge>
                    <Group spacing={4} noWrap>
                        <IconClock size={14} color={theme.colors.gray[5]} />
                        <Text size="xs" color={getElapsedTimeColor(order.createdAt)} weight={700}>
                            {getElapsedTimeStr(order.createdAt)}
                        </Text>
                    </Group>
                </Group>

                {order.floor && (
                    <Text size="xs" color="dimmed" weight={600} mb="xs">
                        Section/Floor: {order.floor}
                    </Text>
                )}

                <Divider my="sm" variant="dashed" />

                {/* Items list */}
                <Stack spacing="xs" my="sm">
                    {parsedItems.map((item: any, idx: number) => (
                        <Box key={idx}>
                            <Group position="apart" align="flex-start" noWrap>
                                <Text size="sm" weight={700} color="dark.8" sx={{ flex: 1 }}>
                                    {item.quantity} × {item.name}
                                </Text>
                                <Text size="xs" color="gray.5" weight={600}>
                                    {item.price}
                                </Text>
                            </Group>
                            {item.notes && (
                                <Text size="xs" color="red.6" italic mt={2} pl="md">
                                    - {item.notes}
                                </Text>
                            )}
                        </Box>
                    ))}
                </Stack>

                {/* General Special Instructions */}
                {order.generalNotes && (
                    <Paper p="xs" bg="amber.0" mt="xs" sx={{ border: `1px solid ${theme.colors.yellow[2]}`, borderRadius: theme.radius.sm }}>
                        <Group spacing={4} align="flex-start" noWrap>
                            <IconAlertCircle size={14} color={theme.colors.yellow[8]} style={{ marginTop: 2 }} />
                            <Text size="xs" color="yellow.9" weight={500}>
                                {order.generalNotes}
                            </Text>
                        </Group>
                    </Paper>
                )}

                <Divider my="sm" />

                {/* Actions */}
                <Group position="apart" mt="xs" noWrap>
                    {order.status !== "READY" ? (
                        <Button
                            size="xs"
                            color="red"
                            variant="light"
                            onClick={() => handleCancelOrder(order.id)}
                            leftIcon={<IconTrash size={12} />}
                        >
                            Cancel
                        </Button>
                    ) : (
                        <div />
                    )}
                    <Button
                        size="xs"
                        color={
                            order.status === "PENDING" ? "primary" :
                            order.status === "PREPARING" ? "orange" : "green"
                        }
                        onClick={() => handleStatusUpdate(order.id, order.status)}
                        rightIcon={order.status === "READY" ? <IconCheck size={12} /> : undefined}
                    >
                        {
                            order.status === "PENDING" ? "Start Preparing" :
                            order.status === "PREPARING" ? "Mark as Ready" : "Done"
                        }
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
                    <Container py="lg" size="xl" fluid>
                        {/* Header Area */}
                        <Group position="apart" mb="lg">
                            <Stack spacing={4}>
                                <Group spacing="sm">
                                    <ActionIcon onClick={() => router.push(`/restaurant/${restaurantId}`)} size="lg" variant="light" color="primary">
                                        <IconArrowLeft size={18} />
                                    </ActionIcon>
                                    <Title order={2} color="dark.8">Kitchen Board — {restaurant?.name}</Title>
                                    <Badge color="green" variant="dot">Live</Badge>
                                </Group>
                                <Text size="sm" color="dimmed">
                                    Track and manage table orders in real-time. Sound alerts will notify you of new arrivals.
                                </Text>
                            </Stack>

                            <Group spacing="md">
                                <Button
                                    size="xs"
                                    color={isMuted ? "red" : "primary"}
                                    variant="outline"
                                    onClick={toggleMute}
                                    leftIcon={isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                                >
                                    {isMuted ? "Sound: Muted" : "Sound: Active"}
                                </Button>
                                <Switch
                                    label="Show Completed/Cancelled"
                                    checked={showCompleted}
                                    onChange={(event) => setShowCompleted(event.currentTarget.checked)}
                                />
                            </Group>
                        </Group>

                        {/* Kanban Columns */}
                        <Grid gutter="md" align="flex-start">
                            {/* Column 1: Pending */}
                            <Grid.Col xs={12} md={4}>
                                <Paper p="md" bg={theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0]} radius="md">
                                    <Group position="apart" mb="md">
                                        <Group spacing="xs">
                                            <Title order={4}>Pending Orders</Title>
                                            <Badge color="primary" variant="light">{pendingOrders.length}</Badge>
                                        </Group>
                                    </Group>
                                    <Stack spacing="md" style={{ minHeight: '50vh' }}>
                                        {pendingOrders.map(renderOrderCard)}
                                        {pendingOrders.length === 0 && (
                                            <Center py="xl" h="100%">
                                                <Text size="sm" color="dimmed" italic>No pending orders</Text>
                                            </Center>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Column 2: Preparing */}
                            <Grid.Col xs={12} md={4}>
                                <Paper p="md" bg={theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0]} radius="md">
                                    <Group position="apart" mb="md">
                                        <Group spacing="xs">
                                            <Title order={4}>Preparing</Title>
                                            <Badge color="orange" variant="light">{preparingOrders.length}</Badge>
                                        </Group>
                                    </Group>
                                    <Stack spacing="md" style={{ minHeight: '50vh' }}>
                                        {preparingOrders.map(renderOrderCard)}
                                        {preparingOrders.length === 0 && (
                                            <Center py="xl" h="100%">
                                                <Text size="sm" color="dimmed" italic>No orders preparing</Text>
                                            </Center>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Column 3: Ready */}
                            <Grid.Col xs={12} md={4}>
                                <Paper p="md" bg={theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0]} radius="md">
                                    <Group position="apart" mb="md">
                                        <Group spacing="xs">
                                            <Title order={4}>Ready for Delivery</Title>
                                            <Badge color="green" variant="light">{readyOrders.length}</Badge>
                                        </Group>
                                    </Group>
                                    <Stack spacing="md" style={{ minHeight: '50vh' }}>
                                        {readyOrders.map(renderOrderCard)}
                                        {readyOrders.length === 0 && (
                                            <Center py="xl" h="100%">
                                                <Text size="sm" color="dimmed" italic>No orders ready</Text>
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
                                    cols={3}
                                    breakpoints={[
                                        { maxWidth: "md", cols: 2 },
                                        { maxWidth: "sm", cols: 1 },
                                    ]}
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
                                            <Card key={order.id} withBorder shadow="xs" p="md" radius="md">
                                                <Group position="apart" mb="xs">
                                                    <Badge color={order.status === "COMPLETED" ? "green" : "red"}>
                                                        {order.status}
                                                    </Badge>
                                                    <Text size="xs" color="dimmed">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </Text>
                                                </Group>
                                                <Text size="sm" weight={700} color="dark.8" mb="xs">
                                                    Table: {order.table || "General"} {order.floor ? `(${order.floor})` : ""}
                                                </Text>
                                                <Divider my="xs" variant="dashed" />
                                                <Stack spacing={4}>
                                                    {parsedItems.map((item, i) => (
                                                        <Text key={i} size="xs" color="dark.7">
                                                            {item.quantity} × {item.name}
                                                        </Text>
                                                    ))}
                                                </Stack>
                                            </Card>
                                        );
                                    })}
                                    {finishedOrders.length === 0 && (
                                        <Center py="xl" sx={{ gridColumn: '1 / -1' }}>
                                            <Text size="sm" color="dimmed" italic>No completed or cancelled orders</Text>
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
    return { paths: [], fallback: "blocking" };
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default KitchenScreenPage;
