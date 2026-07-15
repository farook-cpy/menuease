import { useMemo } from "react";

import {
    Box,
    Breadcrumbs,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Grid,
    Group,
    Loader,
    Paper,
    Progress,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Title,
    useMantineTheme,
} from "@mantine/core";
import {
    IconArrowLeft,
    IconCalendar,
    IconClick,
    IconClock,
    IconDevices,
    IconEye,
    IconFlame,
    IconList,
    IconTrendingUp,
    IconQrcode,
} from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";

const StatsPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const restaurantId = router.query?.restaurantId as string;
    const tRestaurant = useTranslations("dashboard.restaurantManage");

    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.get.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    const { data: stats, isLoading: statsLoading } = api.analytics.getStats.useQuery(
        { restaurantId },
        { enabled: !!restaurantId, refetchInterval: 30000, staleTime: 0 }
    );

    const isLoading = restaurantLoading || statsLoading;

    // Engagement score (clicks per view)
    const engagementRate =
        stats && stats.totalPageViews > 0 ? ((stats.totalItemClicks / stats.totalPageViews) * 100).toFixed(1) : "0.0";

    // Find max views for chart scaling
    const maxDailyViews =
        stats && stats.dailyViews.length > 0 ? Math.max(...stats.dailyViews.map((d) => d.count), 1) : 1;

    // Find max click count for items bar scaling
    const maxItemClicks =
        stats && stats.popularItems.length > 0 ? Math.max(...stats.popularItems.map((item) => item.count), 1) : 1;

    // Peak viewing hour format
    const peakHourInfo = useMemo(() => {
        if (!stats || !stats.peakHours || stats.peakHours.length === 0) return "No data yet";
        let maxCount = 0;
        let peakHour = -1;
        stats.peakHours.forEach((h: any) => {
            if (h.count > maxCount) {
                maxCount = h.count;
                peakHour = h.hour;
            }
        });
        if (peakHour === -1 || maxCount === 0) return "No data yet";
        const startHour = peakHour;
        const endHour = (peakHour + 1) % 24;
        const formatHr = (hr: number) => {
            if (hr === 0) return "12 AM";
            if (hr === 12) return "12 PM";
            return hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
        };
        return `${formatHr(startHour)} - ${formatHr(endHour)}`;
    }, [stats]);

    // Device distribution percentages
    const devicePercentages = useMemo(() => {
        if (!stats || !stats.deviceStats) return { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
        const { Mobile, Tablet, Desktop, Unknown } = stats.deviceStats;
        const total = Mobile + Tablet + Desktop + Unknown;
        if (total === 0) return { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
        return {
            Desktop: Math.round((Desktop / total) * 100),
            Mobile: Math.round((Mobile / total) * 100),
            Tablet: Math.round((Tablet / total) * 100),
            Unknown: Math.round((Unknown / total) * 100),
        };
    }, [stats]);

    return (
        <>
            <NextSeo description="View real-time page views and product analytics" title="Menu Analytics" />
            <main>
                <AppShell>
                    <Container py="lg" size="xl">
                        {isLoading ? (
                            <Center h="50vh" w="100%">
                                <Loader size="lg" />
                            </Center>
                        ) : (
                            <Stack spacing="xl">
                                <Box py="xs" sx={{ maxWidth: "100%", overflowX: "auto", whiteSpace: "nowrap" }}>
                                    <Breadcrumbs color={theme.black}>
                                        <Link href="/restaurant">{tRestaurant("breadcrumb")}</Link>
                                        <Link href={`/restaurant/${restaurant?.id}`}>{restaurant?.name}</Link>
                                        <Text>Menu Analytics</Text>
                                    </Breadcrumbs>
                                </Box>

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
                                    <Stack spacing={4}>
                                        <Title color="dark.8" order={2}>
                                            Menu Analytics
                                        </Title>
                                        <Text color="dimmed" size="sm">
                                            Monitor performance, menu engagement, and popular products.
                                        </Text>
                                    </Stack>
                                    <Button
                                        color="gray"
                                        leftIcon={<IconArrowLeft size={16} />}
                                        onClick={() => router.push(`/restaurant/${restaurantId}`)}
                                        sx={(theme) => ({
                                            [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                                alignSelf: "flex-start",
                                            },
                                        })}
                                        variant="outline"
                                    >
                                        Back to Dashboard
                                    </Button>
                                </Box>

                                {/* Core Metrics Grid */}
                                <SimpleGrid
                                    breakpoints={[
                                        { cols: 2, maxWidth: "md" },
                                        { cols: 1, maxWidth: "sm" },
                                    ]}
                                    cols={4}
                                    spacing="lg"
                                >
                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Total Page Views
                                                </Text>
                                                <Title order={1} size="2.5rem">
                                                    {stats?.totalPageViews || 0}
                                                </Title>
                                                <Text color="dimmed" size="xs">
                                                    Visitor traffic to your public menu.
                                                </Text>
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconEye size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Item Detail Clicks
                                                </Text>
                                                <Title order={1} size="2.5rem">
                                                    {stats?.totalItemClicks || 0}
                                                </Title>
                                                <Text color="dimmed" size="xs">
                                                    Total interactions with items.
                                                </Text>
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconClick size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Engagement Rate
                                                </Text>
                                                <Title order={1} size="2.5rem">
                                                    {engagementRate}%
                                                </Title>
                                                <Text color="dimmed" size="xs">
                                                    Percentage of page views clicked.
                                                </Text>
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconTrendingUp size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Branded QR Scans
                                                </Text>
                                                <Title order={1} size="2.5rem">
                                                    {stats?.totalQrScans || 0}
                                                </Title>
                                                <Text color="dimmed" size="xs">
                                                    Scans of your personalized QR codes.
                                                </Text>
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconQrcode size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>
                                </SimpleGrid>

                                {/* Additional Analytics Grid */}
                                <SimpleGrid
                                    breakpoints={[
                                        { cols: 2, maxWidth: "md" },
                                        { cols: 1, maxWidth: "sm" },
                                    ]}
                                    cols={3}
                                    spacing="lg"
                                >
                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Most Viewed Dish
                                                </Text>
                                                <Title color="dark.8" order={2} size="1.5rem">
                                                    {stats?.mostViewedDish ? stats.mostViewedDish.name : "No data yet"}
                                                </Title>
                                                {stats?.mostViewedDish && (
                                                    <Text color="dimmed" size="xs">
                                                        {stats.mostViewedDish.count} clicks •{" "}
                                                        {stats.mostViewedDish.price}
                                                    </Text>
                                                )}
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconFlame size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Most Clicked Category
                                                </Text>
                                                <Title color="dark.8" order={2} size="1.5rem">
                                                    {stats?.mostClickedCategory
                                                        ? stats.mostClickedCategory.name
                                                        : "No data yet"}
                                                </Title>
                                                {stats?.mostClickedCategory && (
                                                    <Text color="dimmed" size="xs">
                                                        {stats.mostClickedCategory.count} total item clicks
                                                    </Text>
                                                )}
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconList size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Group align="flex-start" noWrap position="apart">
                                            <Stack spacing={4}>
                                                <Text color="dimmed" size="xs" transform="uppercase" weight={600}>
                                                    Peak Viewing Hour
                                                </Text>
                                                <Title color="dark.8" order={2} size="1.5rem">
                                                    {peakHourInfo}
                                                </Title>
                                                <Text color="dimmed" size="xs">
                                                    Hour when public menu gets most views.
                                                </Text>
                                            </Stack>
                                            <Paper
                                                p="xs"
                                                radius="md"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[6],
                                                }}
                                            >
                                                <IconClock size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>
                                </SimpleGrid>

                                <Grid gutter="lg" mt="md">
                                    {/* Daily Views Bar Chart */}
                                    <Grid.Col md={7} xs={12}>
                                        <Card h="100%" p="lg" radius="md" shadow="sm" withBorder>
                                            <Group mb="xl" position="apart">
                                                <Group spacing="xs">
                                                    <IconCalendar color={theme.colors.gray[5]} size={18} />
                                                    <Text weight={600}>Views (Last 7 Days)</Text>
                                                </Group>
                                            </Group>

                                            <Box
                                                h={200}
                                                sx={(theme) => ({
                                                    alignItems: "flex-end",
                                                    display: "flex",
                                                    gap: 6,
                                                    justifyContent: "space-between",
                                                    paddingBottom: 20,
                                                    [`@media (min-width: ${theme.breakpoints.sm}px)`]: {
                                                        gap: 12,
                                                    },
                                                })}
                                            >
                                                {stats?.dailyViews.map((day) => {
                                                    const heightPercent =
                                                        maxDailyViews > 0 ? (day.count / maxDailyViews) * 100 : 0;
                                                    // Extract friendly day format
                                                    const dateObj = new Date(day.date);
                                                    const formattedDay = dateObj.toLocaleDateString("en-US", {
                                                        weekday: "short",
                                                    });

                                                    return (
                                                        <Box
                                                            key={day.date}
                                                            sx={{
                                                                alignItems: "center",
                                                                display: "flex",
                                                                flex: 1,
                                                                flexDirection: "column",
                                                                gap: 8,
                                                            }}
                                                        >
                                                            {/* Count label above bar */}
                                                            <Text
                                                                color={day.count > 0 ? "gray.7" : "gray.4"}
                                                                size="xs"
                                                                weight={700}
                                                            >
                                                                {day.count}
                                                            </Text>
                                                            {/* Vertical Bar */}
                                                            <Box
                                                                sx={{
                                                                    "&:hover": {
                                                                        opacity: 0.85,
                                                                    },
                                                                    background:
                                                                        day.count > 0
                                                                            ? `linear-gradient(180deg, ${theme.colors.gray[4]} 0%, ${theme.colors.gray[6]} 100%)`
                                                                            : theme.colors.gray[2],
                                                                    borderRadius: "4px 4px 0 0",
                                                                    height: `${heightPercent * 1.5}px`,

                                                                    maxWidth: 40,

                                                                    // scaled for display
                                                                    minHeight: 4,

                                                                    transition: "height 0.5s ease",
                                                                    width: "100%",
                                                                }}
                                                            />
                                                            {/* Day label */}
                                                            <Text color="dimmed" size="xs" weight={500}>
                                                                {formattedDay}
                                                            </Text>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Card>
                                    </Grid.Col>

                                    {/* Right Side Stats Column */}
                                    <Grid.Col md={5} xs={12}>
                                        <Stack spacing="lg">
                                            {/* Device Type Distribution Card */}
                                            <Card p="lg" radius="md" shadow="sm" withBorder>
                                                <Group mb="lg" spacing="xs">
                                                    <IconDevices color={theme.colors.gray[5]} size={18} />
                                                    <Text weight={600}>Device Type Stats</Text>
                                                </Group>
                                                <Stack spacing="sm">
                                                    <Box>
                                                        <Group mb={4} position="apart">
                                                            <Text size="xs" weight={600}>
                                                                Mobile
                                                            </Text>
                                                            <Text size="xs" weight={700}>
                                                                {devicePercentages.Mobile}% (
                                                                {stats?.deviceStats?.Mobile || 0})
                                                            </Text>
                                                        </Group>
                                                        <Progress
                                                            color="gray"
                                                            radius="xl"
                                                            size="sm"
                                                            value={devicePercentages.Mobile}
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Group mb={4} position="apart">
                                                            <Text size="xs" weight={600}>
                                                                Desktop
                                                            </Text>
                                                            <Text size="xs" weight={700}>
                                                                {devicePercentages.Desktop}% (
                                                                {stats?.deviceStats?.Desktop || 0})
                                                            </Text>
                                                        </Group>
                                                        <Progress
                                                            color="gray"
                                                            radius="xl"
                                                            size="sm"
                                                            value={devicePercentages.Desktop}
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Group mb={4} position="apart">
                                                            <Text size="xs" weight={600}>
                                                                Tablet
                                                            </Text>
                                                            <Text size="xs" weight={700}>
                                                                {devicePercentages.Tablet}% (
                                                                {stats?.deviceStats?.Tablet || 0})
                                                            </Text>
                                                        </Group>
                                                        <Progress
                                                            color="gray"
                                                            radius="xl"
                                                            size="sm"
                                                            value={devicePercentages.Tablet}
                                                        />
                                                    </Box>
                                                    {devicePercentages.Unknown > 0 && (
                                                        <Box>
                                                            <Group mb={4} position="apart">
                                                                <Text size="xs" weight={600}>
                                                                    Unknown
                                                                </Text>
                                                                <Text size="xs" weight={700}>
                                                                    {devicePercentages.Unknown}% (
                                                                    {stats?.deviceStats?.Unknown || 0})
                                                                </Text>
                                                            </Group>
                                                            <Progress
                                                                color="gray"
                                                                radius="xl"
                                                                size="sm"
                                                                value={devicePercentages.Unknown}
                                                            />
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Card>

                                            {/* Popular Products Card */}
                                            <Card p="lg" radius="md" shadow="sm" withBorder>
                                                <Group mb="lg" spacing="xs">
                                                    <IconFlame color={theme.colors.gray[5]} size={18} />
                                                    <Text weight={600}>Popular Products</Text>
                                                </Group>

                                                {stats?.popularItems.length === 0 ? (
                                                    <Center h={180}>
                                                        <Text color="dimmed" italic size="sm">
                                                            No menu items clicked yet.
                                                        </Text>
                                                    </Center>
                                                ) : (
                                                    <Table horizontalSpacing="xs" verticalSpacing="sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Item</th>
                                                                <th style={{ textAlign: "right" }}>Clicks</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stats?.popularItems.map((item, index) => {
                                                                const percent =
                                                                    maxItemClicks > 0
                                                                        ? (item.count / maxItemClicks) * 100
                                                                        : 0;
                                                                return (
                                                                    <tr key={item.id}>
                                                                        <td style={{ width: "70%" }}>
                                                                            <Stack spacing={2}>
                                                                                <Text
                                                                                    color="dark.8"
                                                                                    size="sm"
                                                                                    weight={600}
                                                                                >
                                                                                    {index + 1}. {item.name}
                                                                                </Text>
                                                                                <Progress
                                                                                    color="gray"
                                                                                    radius="xl"
                                                                                    size="xs"
                                                                                    value={percent}
                                                                                />
                                                                            </Stack>
                                                                        </td>
                                                                        <td
                                                                            style={{
                                                                                textAlign: "right",
                                                                                verticalAlign: "middle",
                                                                                width: "30%",
                                                                            }}
                                                                        >
                                                                            <Text color="dark.7" size="sm" weight={700}>
                                                                                {item.count} views
                                                                            </Text>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </Table>
                                                )}
                                            </Card>
                                        </Stack>
                                    </Grid.Col>
                                </Grid>
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

export default StatsPage;
