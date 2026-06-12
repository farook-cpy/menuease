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
    Stack,
    Text,
    Title,
    SimpleGrid,
    useMantineTheme,
    Table,
    Progress
} from "@mantine/core";
import { IconArrowLeft, IconEye, IconClick, IconFlame, IconTrendingUp, IconCalendar } from "@tabler/icons";
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
    const engagementRate = stats && stats.totalPageViews > 0
        ? ((stats.totalItemClicks / stats.totalPageViews) * 100).toFixed(1)
        : "0.0";

    // Find max views for chart scaling
    const maxDailyViews = stats && stats.dailyViews.length > 0
        ? Math.max(...stats.dailyViews.map(d => d.count), 1)
        : 1;

    // Find max click count for items bar scaling
    const maxItemClicks = stats && stats.popularItems.length > 0
        ? Math.max(...stats.popularItems.map(item => item.count), 1)
        : 1;

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
                                <Box sx={{ maxWidth: "100%", overflowX: "auto", whiteSpace: "nowrap" }} py="xs">
                                    <Breadcrumbs color={theme.black}>
                                        <Link href="/restaurant">{tRestaurant("breadcrumb")}</Link>
                                        <Link href={`/restaurant/${restaurant?.id}`}>{restaurant?.name}</Link>
                                        <Text>Menu Analytics</Text>
                                    </Breadcrumbs>
                                </Box>

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
                                    <Stack spacing={4}>
                                        <Title order={2} color="dark.8">Menu Analytics</Title>
                                        <Text size="sm" color="dimmed">
                                            Monitor performance, menu engagement, and popular products.
                                        </Text>
                                    </Stack>
                                    <Button
                                        leftIcon={<IconArrowLeft size={16} />}
                                        variant="outline"
                                        color="gray"
                                        onClick={() => router.push(`/restaurant/${restaurantId}`)}
                                        sx={(theme) => ({
                                            [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                                alignSelf: "flex-start"
                                            }
                                        })}
                                    >
                                        Back to Dashboard
                                    </Button>
                                </Box>

                                {/* Core Metrics Grid */}
                                <SimpleGrid
                                    breakpoints={[
                                        { maxWidth: "md", cols: 2 },
                                        { maxWidth: "sm", cols: 1 },
                                    ]}
                                    cols={3}
                                    spacing="lg"
                                >
                                    <Card shadow="sm" radius="md" p="xl" withBorder>
                                        <Group position="apart" align="flex-start" noWrap>
                                            <Stack spacing={4}>
                                                <Text size="xs" color="dimmed" weight={600} transform="uppercase">Total Page Views</Text>
                                                <Title order={1} size="2.5rem">{stats?.totalPageViews || 0}</Title>
                                                <Text size="xs" color="dimmed">Visitor traffic to your public menu.</Text>
                                            </Stack>
                                            <Paper p="xs" radius="md" sx={{ backgroundColor: theme.colors.gray[1], color: theme.colors.gray[6] }}>
                                                <IconEye size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card shadow="sm" radius="md" p="xl" withBorder>
                                        <Group position="apart" align="flex-start" noWrap>
                                            <Stack spacing={4}>
                                                <Text size="xs" color="dimmed" weight={600} transform="uppercase">Item Detail Clicks</Text>
                                                <Title order={1} size="2.5rem">{stats?.totalItemClicks || 0}</Title>
                                                <Text size="xs" color="dimmed">Total interactions with items.</Text>
                                            </Stack>
                                            <Paper p="xs" radius="md" sx={{ backgroundColor: theme.colors.gray[1], color: theme.colors.gray[6] }}>
                                                <IconClick size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>

                                    <Card shadow="sm" radius="md" p="xl" withBorder>
                                        <Group position="apart" align="flex-start" noWrap>
                                            <Stack spacing={4}>
                                                <Text size="xs" color="dimmed" weight={600} transform="uppercase">Engagement Rate</Text>
                                                <Title order={1} size="2.5rem">{engagementRate}%</Title>
                                                <Text size="xs" color="dimmed">Percentage of page views clicked.</Text>
                                            </Stack>
                                            <Paper p="xs" radius="md" sx={{ backgroundColor: theme.colors.gray[1], color: theme.colors.gray[6] }}>
                                                <IconTrendingUp size={24} />
                                            </Paper>
                                        </Group>
                                    </Card>
                                </SimpleGrid>

                                <Grid gutter="lg" mt="md">
                                    {/* Daily Views Bar Chart */}
                                    <Grid.Col xs={12} md={7}>
                                        <Card shadow="sm" radius="md" p="lg" withBorder h="100%">
                                            <Group position="apart" mb="xl">
                                                <Group spacing="xs">
                                                    <IconCalendar size={18} color={theme.colors.gray[5]} />
                                                    <Text weight={600}>Views (Last 7 Days)</Text>
                                                </Group>
                                            </Group>
                                            
                                            <Box
                                                h={200}
                                                sx={(theme) => ({
                                                    display: 'flex',
                                                    alignItems: 'flex-end',
                                                    gap: 6,
                                                    justifyContent: 'space-between',
                                                    paddingBottom: 20,
                                                    [`@media (min-width: ${theme.breakpoints.sm}px)`]: {
                                                        gap: 12
                                                    }
                                                })}
                                            >
                                                {stats?.dailyViews.map((day) => {
                                                    const heightPercent = maxDailyViews > 0 ? (day.count / maxDailyViews) * 100 : 0;
                                                    // Extract friendly day format
                                                    const dateObj = new Date(day.date);
                                                    const formattedDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                                    
                                                    return (
                                                        <Box key={day.date} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                            {/* Count label above bar */}
                                                            <Text size="xs" weight={700} color={day.count > 0 ? "gray.7" : "gray.4"}>
                                                                {day.count}
                                                            </Text>
                                                            {/* Vertical Bar */}
                                                            <Box sx={{
                                                                width: '100%',
                                                                maxWidth: 40,
                                                                height: `${heightPercent * 1.5}px`, // scaled for display
                                                                minHeight: 4,
                                                                background: day.count > 0 
                                                                    ? `linear-gradient(180deg, ${theme.colors.gray[4]} 0%, ${theme.colors.gray[6]} 100%)` 
                                                                    : theme.colors.gray[2],
                                                                borderRadius: '4px 4px 0 0',
                                                                transition: 'height 0.5s ease',
                                                                '&:hover': {
                                                                    opacity: 0.85
                                                                }
                                                            }} />
                                                            {/* Day label */}
                                                            <Text size="xs" color="dimmed" weight={500}>{formattedDay}</Text>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Card>
                                    </Grid.Col>

                                    {/* Most Popular Menu Items */}
                                    <Grid.Col xs={12} md={5}>
                                        <Card shadow="sm" radius="md" p="lg" withBorder h="100%">
                                            <Group spacing="xs" mb="lg">
                                                <IconFlame size={18} color={theme.colors.gray[5]} />
                                                <Text weight={600}>Popular Products</Text>
                                            </Group>

                                            {stats?.popularItems.length === 0 ? (
                                                <Center h={180}>
                                                    <Text color="dimmed" size="sm" italic>No menu items clicked yet.</Text>
                                                </Center>
                                            ) : (
                                                <Table verticalSpacing="sm" horizontalSpacing="xs">
                                                    <thead>
                                                        <tr>
                                                            <th>Item</th>
                                                            <th style={{ textAlign: 'right' }}>Clicks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {stats?.popularItems.map((item, index) => {
                                                            const percent = maxItemClicks > 0 ? (item.count / maxItemClicks) * 100 : 0;
                                                            return (
                                                                <tr key={item.id}>
                                                                    <td style={{ width: '70%' }}>
                                                                        <Stack spacing={2}>
                                                                            <Text size="sm" weight={600} color="dark.8">
                                                                                {index + 1}. {item.name}
                                                                            </Text>
                                                                            <Progress 
                                                                                value={percent} 
                                                                                color="gray" 
                                                                                size="xs" 
                                                                                radius="xl"
                                                                            />
                                                                        </Stack>
                                                                    </td>
                                                                    <td style={{ width: '30%', textAlign: 'right', verticalAlign: 'middle' }}>
                                                                        <Text size="sm" weight={700} color="dark.7">
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
    return { paths: [], fallback: "blocking" };
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default StatsPage;
