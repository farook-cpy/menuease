import { useState } from "react";

import {
    ActionIcon,
    Badge,
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
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    Title,
    useMantineTheme,
} from "@mantine/core";
import {
    IconArrowLeft,
    IconCornerDownRight,
    IconMessage2,
    IconMessageReport,
    IconStar,
    IconTrash,
} from "@tabler/icons";
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

    const {
        data: feedbacks = [],
        isLoading: feedbacksLoading,
        refetch,
    } = api.feedback.getByRestaurant.useQuery({ restaurantId }, { enabled: !!restaurantId });

    const { mutate: replyMutation, isLoading: replyInProgress } = api.feedback.reply.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to post reply", err);
        },
        onSuccess: () => {
            showSuccessToast("Reply saved", "Your response was posted successfully.");
            setReplyingTo(null);
            refetch();
        },
    });

    const { mutate: deleteMutation } = api.feedback.delete.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to delete review", err);
        },
        onSuccess: () => {
            showSuccessToast("Review deleted", "The review was deleted from the system.");
            refetch();
        },
    });

    const handleSendReply = (feedbackId: string, menuItemId: string) => {
        const text = replyText[feedbackId];
        if (!text || !text.trim()) return;

        replyMutation({
            feedbackId,
            menuItemId,
            ownerResponse: text.trim(),
        });
    };

    const handleDelete = (feedbackId: string, menuItemId: string) => {
        if (window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
            deleteMutation({
                id: feedbackId,
                menuItemId,
            });
        }
    };

    // Calculate rating metrics
    const totalReviews = feedbacks.length;
    const avgRating =
        totalReviews > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1) : "0.0";

    const ratingCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }; // 1 to 5 stars
    feedbacks.forEach((f) => {
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
                        color={i <= count ? theme.colors.gray[6] : theme.colors.gray[3]}
                        fill={i <= count ? theme.colors.gray[6] : "none"}
                        size={size}
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
                                <Box py="xs" sx={{ maxWidth: "100%", overflowX: "auto", whiteSpace: "nowrap" }}>
                                    <Breadcrumbs color={theme.black}>
                                        <Link href="/restaurant">{tRestaurant("breadcrumb")}</Link>
                                        <Link href={`/restaurant/${restaurant?.id}`}>{restaurant?.name}</Link>
                                        <Text>Feedback & Reviews</Text>
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
                                            Feedback & Reviews
                                        </Title>
                                        <Text color="dimmed" size="sm">
                                            Track customer satisfaction and respond to opinions left by visitors.
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

                                {/* Metrics Cards */}
                                <SimpleGrid
                                    breakpoints={[
                                        { cols: 2, maxWidth: "md" },
                                        { cols: 1, maxWidth: "sm" },
                                    ]}
                                    cols={3}
                                    spacing="lg"
                                >
                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Stack align="center" h="100%" justify="center">
                                            <Text color="dimmed" size="sm" transform="uppercase" weight={500}>
                                                Average Rating
                                            </Text>
                                            <Title color="dark.8" order={1} size="4rem" style={{ lineHeight: 1 }}>
                                                {avgRating}
                                            </Title>
                                            <Box mt="xs">{renderStars(Math.round(Number(avgRating)), 24)}</Box>
                                            <Text color="dimmed" mt="xs" size="xs">
                                                Based on {totalReviews} reviews
                                            </Text>
                                        </Stack>
                                    </Card>

                                    <Card p="xl" radius="md" shadow="sm" withBorder>
                                        <Text color="dimmed" mb="md" size="sm" transform="uppercase" weight={500}>
                                            Rating Breakdown
                                        </Text>
                                        <Stack spacing="xs">
                                            {[5, 4, 3, 2, 1].map((stars) => {
                                                const count = ratingCounts[stars - 1] || 0;
                                                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                                return (
                                                    <Group key={stars} spacing="xs">
                                                        <Text size="sm" w={50} weight={500}>
                                                            {stars} Star
                                                        </Text>
                                                        <Box
                                                            style={{
                                                                backgroundColor: theme.colors.gray[2],
                                                                borderRadius: 4,
                                                                flex: 1,
                                                                height: 8,
                                                                overflow: "hidden",
                                                            }}
                                                        >
                                                            <Box
                                                                style={{
                                                                    backgroundColor: theme.colors.gray[6],
                                                                    borderRadius: 4,
                                                                    height: "100%",
                                                                    width: `${percent}%`,
                                                                }}
                                                            />
                                                        </Box>
                                                        <Text align="right" color="dimmed" size="sm" w={30}>
                                                            {count}
                                                        </Text>
                                                    </Group>
                                                );
                                            })}
                                        </Stack>
                                    </Card>

                                    <Card
                                        p="xl"
                                        radius="md"
                                        shadow="sm"
                                        style={{
                                            alignItems: "center",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                        }}
                                        withBorder
                                    >
                                        <Stack align="center" h="100%" justify="center" spacing="xs" w="100%">
                                            <IconMessageReport color={theme.colors.gray[5]} size={48} />
                                            <Title mt="sm" order={3}>
                                                {totalReviews}
                                            </Title>
                                            <Text align="center" color="dimmed" size="sm">
                                                Total customer submissions.
                                            </Text>
                                        </Stack>
                                    </Card>
                                </SimpleGrid>

                                <Divider label={<Text weight={600}>Recent Submissions</Text>} labelPosition="left" />

                                {/* Feedbacks List */}
                                <Stack spacing="md">
                                    {feedbacks.length === 0 ? (
                                        <Paper p="xl" radius="md" withBorder>
                                            <Stack align="center" spacing="xs">
                                                <IconMessage2 color={theme.colors.gray[4]} size={40} />
                                                <Text align="center" color="dimmed" mt="md" weight={500}>
                                                    No reviews received yet. Publish your menu and invite customers to
                                                    leave feedback.
                                                </Text>
                                            </Stack>
                                        </Paper>
                                    ) : (
                                        feedbacks.map((fb) => (
                                            <Paper key={fb.id} p="lg" radius="md" shadow="xs" withBorder>
                                                <Stack spacing="md">
                                                    <Group align="flex-start" noWrap={false} position="apart">
                                                        <Stack spacing="xs" style={{ flex: 1 }}>
                                                            <Group spacing="sm">
                                                                <Text color="dark.8" size="md" weight={700}>
                                                                    {fb.reviewerName}
                                                                </Text>
                                                                {fb.menuItem && (
                                                                    <Badge color="gray" variant="light">
                                                                        Item: {fb.menuItem.name}
                                                                    </Badge>
                                                                )}
                                                            </Group>
                                                            <Box>{renderStars(fb.rating)}</Box>
                                                        </Stack>
                                                        <Stack align="flex-end" spacing="xs">
                                                            <Text color="dimmed" size="xs">
                                                                {new Date(fb.createdAt).toLocaleString()}
                                                            </Text>
                                                            <Button
                                                                color="red"
                                                                leftIcon={<IconTrash size={14} />}
                                                                onClick={() => handleDelete(fb.id, fb.menuItemId)}
                                                                size="xs"
                                                                variant="subtle"
                                                            >
                                                                Delete
                                                            </Button>
                                                        </Stack>
                                                    </Group>

                                                    <Text
                                                        color="dark.7"
                                                        size="sm"
                                                        style={{ fontStyle: fb.comment ? "normal" : "italic" }}
                                                    >
                                                        {fb.comment || "No written comment left."}
                                                    </Text>

                                                    {/* Owner Response */}
                                                    {fb.ownerResponse ? (
                                                        <Box
                                                            p="sm"
                                                            sx={{
                                                                backgroundColor: theme.colors.gray[1],
                                                                borderLeft: `3px solid ${theme.colors.gray[5]}`,
                                                                borderRadius: theme.radius.md,
                                                            }}
                                                        >
                                                            <Group mb={4} spacing={4}>
                                                                <IconCornerDownRight
                                                                    color={theme.colors.gray[5]}
                                                                    size={14}
                                                                />
                                                                <Text color="gray.7" size="xs" weight={700}>
                                                                    Your Response:
                                                                </Text>
                                                            </Group>
                                                            <Text color="dark.8" italic size="sm">
                                                                "{fb.ownerResponse}"
                                                            </Text>
                                                        </Box>
                                                    ) : replyingTo === fb.id ? (
                                                        <Stack spacing="xs">
                                                            <Textarea
                                                                autosize
                                                                minRows={2}
                                                                onChange={(e) =>
                                                                    setReplyText({
                                                                        ...replyText,
                                                                        [fb.id]: e.target.value,
                                                                    })
                                                                }
                                                                placeholder="Type your reply to this customer..."
                                                                value={replyText[fb.id] || ""}
                                                            />
                                                            <Group position="right" spacing="xs">
                                                                <Button
                                                                    color="gray"
                                                                    onClick={() => setReplyingTo(null)}
                                                                    size="xs"
                                                                    variant="outline"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    color="gray"
                                                                    loading={replyInProgress}
                                                                    onClick={() =>
                                                                        handleSendReply(fb.id, fb.menuItemId)
                                                                    }
                                                                    size="xs"
                                                                >
                                                                    Submit Reply
                                                                </Button>
                                                            </Group>
                                                        </Stack>
                                                    ) : (
                                                        <Box>
                                                            <Button
                                                                color="gray"
                                                                leftIcon={<IconCornerDownRight size={14} />}
                                                                onClick={() => setReplyingTo(fb.id)}
                                                                size="xs"
                                                                variant="light"
                                                            >
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
    return { fallback: "blocking", paths: [] };
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default FeedbackPage;
