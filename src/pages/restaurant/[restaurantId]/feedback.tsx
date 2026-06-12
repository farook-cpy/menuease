import { useState } from "react";
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
    Textarea,
    Title,
    Badge,
    ActionIcon,
    SimpleGrid,
    useMantineTheme
} from "@mantine/core";
import { IconArrowLeft, IconStar, IconMessage2, IconTrash, IconCornerDownRight, IconMessageReport } from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

const FeedbackPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const restaurantId = router.query?.restaurantId as string;
    const tRestaurant = useTranslations("dashboard.restaurantManage");

    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.get.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    const { data: feedbacks = [], isLoading: feedbacksLoading, refetch } = api.feedback.getByRestaurant.useQuery(
        { restaurantId },
        { enabled: !!restaurantId }
    );

    const { mutate: replyMutation, isLoading: replyInProgress } = api.feedback.reply.useMutation({
        onSuccess: () => {
            showSuccessToast("Reply saved", "Your response was posted successfully.");
            setReplyingTo(null);
            refetch();
        },
        onError: (err: any) => {
            showErrorToast("Failed to post reply", err);
        }
    });

    const { mutate: deleteMutation } = api.feedback.delete.useMutation({
        onSuccess: () => {
            showSuccessToast("Review deleted", "The review was deleted from the system.");
            refetch();
        },
        onError: (err: any) => {
            showErrorToast("Failed to delete review", err);
        }
    });

    const handleSendReply = (feedbackId: string, menuItemId: string) => {
        const text = replyText[feedbackId];
        if (!text || !text.trim()) return;

        replyMutation({
            feedbackId,
            ownerResponse: text.trim(),
            menuItemId
        });
    };

    const handleDelete = (feedbackId: string, menuItemId: string) => {
        if (window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
            deleteMutation({
                id: feedbackId,
                menuItemId
            });
        }
    };

    // Calculate rating metrics
    const totalReviews = feedbacks.length;
    const avgRating = totalReviews > 0
        ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1)
        : "0.0";

    const ratingCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }; // 1 to 5 stars
    feedbacks.forEach(f => {
        if (f.rating >= 1 && f.rating <= 5) {
            ratingCounts[f.rating - 1] = (ratingCounts[f.rating - 1] ?? 0) + 1;
        }
    });

    const renderStars = (count: number, size = 16) => {
        return (
            <Group spacing={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <IconStar
                        key={i}
                        size={size}
                        fill={i <= count ? theme.colors.gray[6] : "none"}
                        color={i <= count ? theme.colors.gray[6] : theme.colors.gray[3]}
                    />
                ))}
            </Group>
        );
    };

    const isLoading = restaurantLoading || feedbacksLoading;

    return (
        <>
            <NextSeo description="View customer reviews and feedback for your menu items" title="Feedback & Reviews" />
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
                                        <Text>Feedback & Reviews</Text>
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
                                        <Title order={2} color="dark.8">Feedback & Reviews</Title>
                                        <Text size="sm" color="dimmed">
                                            Track customer satisfaction and respond to opinions left by visitors.
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

                                {/* Metrics Cards */}
                                <SimpleGrid
                                    breakpoints={[
                                        { maxWidth: "md", cols: 2 },
                                        { maxWidth: "sm", cols: 1 },
                                    ]}
                                    cols={3}
                                    spacing="lg"
                                >
                                    <Card shadow="sm" radius="md" p="xl" withBorder>
                                        <Stack align="center" justify="center" h="100%">
                                            <Text size="sm" color="dimmed" weight={500} transform="uppercase">Average Rating</Text>
                                            <Title order={1} size="4rem" style={{ lineHeight: 1 }} color="dark.8">
                                                {avgRating}
                                            </Title>
                                            <Box mt="xs">{renderStars(Math.round(Number(avgRating)), 24)}</Box>
                                            <Text size="xs" color="dimmed" mt="xs">Based on {totalReviews} reviews</Text>
                                        </Stack>
                                    </Card>

                                    <Card shadow="sm" radius="md" p="xl" withBorder>
                                        <Text size="sm" color="dimmed" weight={500} transform="uppercase" mb="md">Rating Breakdown</Text>
                                        <Stack spacing="xs">
                                            {[5, 4, 3, 2, 1].map((stars) => {
                                                const count = ratingCounts[stars - 1] || 0;
                                                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                                return (
                                                    <Group key={stars} spacing="xs">
                                                        <Text size="sm" w={50} weight={500}>{stars} Star</Text>
                                                        <Box style={{ flex: 1, height: 8, backgroundColor: theme.colors.gray[2], borderRadius: 4, overflow: "hidden" }}>
                                                            <Box style={{ width: `${percent}%`, height: "100%", backgroundColor: theme.colors.gray[6], borderRadius: 4 }} />
                                                        </Box>
                                                        <Text size="sm" w={30} align="right" color="dimmed">{count}</Text>
                                                    </Group>
                                                );
                                            })}
                                        </Stack>
                                    </Card>

                                    <Card shadow="sm" radius="md" p="xl" withBorder style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <Stack align="center" spacing="xs" justify="center" h="100%" w="100%">
                                            <IconMessageReport size={48} color={theme.colors.gray[5]} />
                                            <Title order={3} mt="sm">{totalReviews}</Title>
                                            <Text size="sm" color="dimmed" align="center">
                                                Total customer submissions.
                                            </Text>
                                        </Stack>
                                    </Card>
                                </SimpleGrid>

                                <Divider label={<Text weight={600}>Recent Submissions</Text>} labelPosition="left" />

                                {/* Feedbacks List */}
                                <Stack spacing="md">
                                    {feedbacks.length === 0 ? (
                                        <Paper p="xl" withBorder radius="md">
                                            <Stack align="center" spacing="xs">
                                                <IconMessage2 size={40} color={theme.colors.gray[4]} />
                                                <Text weight={500} mt="md" color="dimmed" align="center">
                                                    No reviews received yet. Publish your menu and invite customers to leave feedback.
                                                </Text>
                                            </Stack>
                                        </Paper>
                                    ) : (
                                        feedbacks.map((fb) => (
                                            <Paper key={fb.id} p="lg" radius="md" withBorder shadow="xs">
                                                <Stack spacing="md">
                                                    <Group position="apart" align="flex-start" noWrap={false}>
                                                        <Stack spacing="xs" style={{ flex: 1 }}>
                                                            <Group spacing="sm">
                                                                <Text weight={700} size="md" color="dark.8">
                                                                    {fb.reviewerName}
                                                                </Text>
                                                                {fb.menuItem && (
                                                                    <Badge color="gray" variant="light">
                                                                        Item: {fb.menuItem.name}
                                                                    </Badge>
                                                                )}
                                                            </Group>
                                                            <Box>
                                                                {renderStars(fb.rating)}
                                                            </Box>
                                                        </Stack>
                                                        <Stack spacing="xs" align="flex-end">
                                                            <Text size="xs" color="dimmed">
                                                                {new Date(fb.createdAt).toLocaleString()}
                                                            </Text>
                                                            <Button
                                                                size="xs"
                                                                color="red"
                                                                variant="subtle"
                                                                leftIcon={<IconTrash size={14} />}
                                                                onClick={() => handleDelete(fb.id, fb.menuItemId)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </Stack>
                                                    </Group>

                                                    <Text size="sm" color="dark.7" style={{ fontStyle: fb.comment ? 'normal' : 'italic' }}>
                                                        {fb.comment || "No written comment left."}
                                                    </Text>

                                                    {/* Owner Response */}
                                                    {fb.ownerResponse ? (
                                                        <Box p="sm" sx={{ backgroundColor: theme.colors.gray[1], borderRadius: theme.radius.md, borderLeft: `3px solid ${theme.colors.gray[5]}` }}>
                                                            <Group spacing={4} mb={4}>
                                                                <IconCornerDownRight size={14} color={theme.colors.gray[5]} />
                                                                <Text size="xs" weight={700} color="gray.7">
                                                                    Your Response:
                                                                </Text>
                                                            </Group>
                                                            <Text size="sm" italic color="dark.8">
                                                                "{fb.ownerResponse}"
                                                            </Text>
                                                        </Box>
                                                    ) : replyingTo === fb.id ? (
                                                        <Stack spacing="xs">
                                                            <Textarea
                                                                placeholder="Type your reply to this customer..."
                                                                minRows={2}
                                                                autosize
                                                                value={replyText[fb.id] || ""}
                                                                onChange={(e) => setReplyText({ ...replyText, [fb.id]: e.target.value })}
                                                            />
                                                            <Group spacing="xs" position="right">
                                                                <Button size="xs" variant="outline" color="gray" onClick={() => setReplyingTo(null)}>
                                                                    Cancel
                                                                </Button>
                                                                <Button size="xs" color="gray" onClick={() => handleSendReply(fb.id, fb.menuItemId)} loading={replyInProgress}>
                                                                    Submit Reply
                                                                </Button>
                                                            </Group>
                                                        </Stack>
                                                    ) : (
                                                        <Box>
                                                            <Button size="xs" variant="light" color="gray" leftIcon={<IconCornerDownRight size={14} />} onClick={() => setReplyingTo(fb.id)}>
                                                                Respond to Review
                                                            </Button>
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        ))
                                    )}
                                </Stack>
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

export default FeedbackPage;
