import { useState, useMemo } from "react";
import {
    Box,
    Stack,
    Text,
    useMantineTheme,
    Divider,
    TextInput,
    Textarea,
    Button,
    Group,
    ActionIcon,
    Loader,
    Flex,
    Container,
    Paper,
    Title,
    Center
} from "@mantine/core";
import { IconStar, IconMessage2, IconCornerDownRight, IconArrowLeft } from "@tabler/icons";
import { useRouter } from "next/router";
import Link from "next/link";
import { type NextPage } from "next";
import { NextSeo } from "next-seo";

import { ImageKitImage } from "src/components/ImageKitImage";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

const MenuItemDetailPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    
    const restaurantId = router.query.restaurantId as string;
    const menuItemId = router.query.menuItemId as string;

    const [reviewerName, setReviewerName] = useState("");
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);

    // Fetch restaurant details
    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    // Fetch menuItem details
    const { data: menuItem, isLoading: menuItemLoading } = api.menuItem.get.useQuery(
        { id: menuItemId },
        { enabled: !!menuItemId }
    );

    // Fetch feedbacks/reviews
    const { data: feedbacks = [], isLoading: feedbacksLoading, refetch } = api.feedback.getByMenuItem.useQuery(
        { menuItemId: menuItemId || "" },
        { enabled: !!menuItemId }
    );

    // Submit review mutation
    const { mutate: createFeedback, isLoading: isSubmitting } = api.feedback.create.useMutation({
        onSuccess: () => {
            setReviewerName("");
            setComment("");
            setRating(5);
            showSuccessToast("Review Submitted", "Thank you for your feedback!");
            refetch();
        },
        onError: (err: any) => {
            showErrorToast("Failed to submit review", err);
        }
    });

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        createFeedback({
            menuItemId: menuItemId || "",
            rating,
            comment,
            reviewerName: reviewerName.trim() || "Anonymous"
        });
    };

    const averageRating = useMemo(() => {
        if (feedbacks.length === 0) return 0;
        const total = feedbacks.reduce((acc: number, f: any) => acc + f.rating, 0);
        return (total / feedbacks.length).toFixed(1);
    }, [feedbacks]);

    const renderStars = (count: number, size = 16) => {
        return (
            <Group spacing={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <IconStar
                        key={i}
                        size={size}
                        fill={i <= count ? "#f59e0b" : "none"}
                        color={i <= count ? "#f59e0b" : theme.colors.gray[3]}
                    />
                ))}
            </Group>
        );
    };

    const isLoading = restaurantLoading || menuItemLoading;

    if (isLoading) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    if (!menuItem) {
        return (
            <Container py="xl" size="sm">
                <Paper p="xl" withBorder radius="md">
                    <Stack align="center" spacing="md">
                        <Text weight={600} size="lg">Item not found</Text>
                        <Link href={restaurantId ? `/restaurant/${restaurantId}/menu` : "/restaurant"} passHref>
                            <Button variant="outline" color="gray" leftIcon={<IconArrowLeft size={16} />}>
                                Back to Menu
                            </Button>
                        </Link>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    const menuUrl = `/restaurant/${restaurantId}/menu`;

    return (
        <>
            <NextSeo
                title={`${menuItem.name} - ${restaurant?.name || "Menu Item"}`}
                description={menuItem.description || `View details and reviews for ${menuItem.name}`}
            />
            <main>
                <Container py="xl" size="sm">
                    <Stack spacing="lg">
                        {/* Back navigation */}
                        <Group>
                            <Link href={menuUrl} passHref>
                                <Button
                                    variant="subtle"
                                    color="gray"
                                    leftIcon={<IconArrowLeft size={16} />}
                                    compact
                                >
                                    Back to Menu
                                </Button>
                            </Link>
                        </Group>

                        {/* Product Card */}
                        <Paper p="xl" withBorder radius="lg" shadow="sm">
                            <Stack spacing="md">
                                {menuItem.image?.path && (
                                    <Box sx={{ borderRadius: theme.radius.md, overflow: "hidden", display: "flex", justifyContent: "center" }}>
                                        <ImageKitImage
                                            blurhash={menuItem.image.blurHash}
                                            height={400}
                                            imageAlt={menuItem.name}
                                            imagePath={menuItem.image.path}
                                            width={500}
                                        />
                                    </Box>
                                )}

                                <Stack spacing={4} mt="sm">
                                    <Title order={1} size="1.8rem" color="dark.8">
                                        {menuItem.name}
                                    </Title>
                                    
                                    {feedbacks.length > 0 ? (
                                        <Group spacing={6}>
                                            {renderStars(Math.round(Number(averageRating)), 18)}
                                            <Text color="dimmed" size="sm" weight={500}>
                                                {averageRating} / 5.0 ({feedbacks.length} {feedbacks.length === 1 ? "review" : "reviews"})
                                            </Text>
                                        </Group>
                                    ) : (
                                        <Text color="dimmed" size="xs" italic>No reviews yet</Text>
                                    )}
                                </Stack>

                                <Text color="red" size="xl" weight={700}>
                                    {menuItem.price}
                                </Text>

                                {menuItem.description && (
                                    <Text color="dark.7" size="sm" style={{ lineHeight: 1.6 }}>
                                        {menuItem.description}
                                    </Text>
                                )}
                            </Stack>
                        </Paper>

                        {/* Reviews & Feedback Section */}
                        <Paper p="xl" withBorder radius="lg" shadow="sm">
                            <Stack spacing="md">
                                <Group spacing={4} mb="xs">
                                    <IconMessage2 size={20} color={theme.colors.gray[5]} />
                                    <Text weight={700} size="md">Customer Reviews</Text>
                                </Group>

                                {/* Reviews List */}
                                <Stack spacing="sm">
                                    {feedbacksLoading ? (
                                        <Loader size="sm" mx="auto" />
                                    ) : feedbacks.length === 0 ? (
                                        <Text align="center" color="dimmed" size="sm" py="md">
                                            No reviews yet. Be the first to leave feedback!
                                        </Text>
                                    ) : (
                                        feedbacks.map((fb: any) => (
                                            <Box
                                                key={fb.id}
                                                p="sm"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[0],
                                                    borderRadius: theme.radius.md,
                                                    border: `1px solid ${theme.colors.gray[2]}`
                                                }}
                                            >
                                                <Flex align="center" justify="space-between" mb={6}>
                                                    <Text size="sm" weight={600} color="dark.8">
                                                        {fb.reviewerName}
                                                    </Text>
                                                    <Text size="xs" color="dimmed">
                                                        {new Date(fb.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </Flex>
                                                <Box mb={6}>{renderStars(fb.rating, 14)}</Box>
                                                <Text size="sm" color="dark.7" style={{ wordBreak: "break-word" }}>
                                                    {fb.comment}
                                                </Text>

                                                {/* Owner Response */}
                                                {fb.ownerResponse && (
                                                    <Box
                                                        mt="sm"
                                                        pl="sm"
                                                        sx={{
                                                            borderLeft: `2px solid ${theme.colors.gray[5]}`,
                                                        }}
                                                    >
                                                        <Flex align="center" gap={4} mb={2}>
                                                            <IconCornerDownRight size={14} color={theme.colors.gray[6]} />
                                                            <Text size="xs" weight={700} color="gray.6">
                                                                Owner's Reply
                                                            </Text>
                                                        </Flex>
                                                        <Text size="sm" italic color="dark.8" opacity={0.8}>
                                                            "{fb.ownerResponse}"
                                                        </Text>
                                                    </Box>
                                                )}
                                            </Box>
                                        ))
                                    )}
                                </Stack>

                                <Divider my="xs" />

                                {/* Submit Feedback Form */}
                                <Box component="form" onSubmit={handleSubmitReview} mt="xs">
                                    <Text weight={700} size="sm" mb="sm">
                                        Write a Review
                                    </Text>

                                    <Stack spacing="xs">
                                        <Group>
                                            <Text size="xs" color="dimmed">Your Rating:</Text>
                                            <Group spacing="xs">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <ActionIcon
                                                        key={value}
                                                        onClick={() => setRating(value)}
                                                        variant="transparent"
                                                        size="xs"
                                                    >
                                                        <IconStar
                                                            size={20}
                                                            fill={value <= rating ? "#f59e0b" : "none"}
                                                            color={value <= rating ? "#f59e0b" : theme.colors.gray[3]}
                                                        />
                                                    </ActionIcon>
                                                ))}
                                            </Group>
                                        </Group>

                                        <TextInput
                                            placeholder="Your Name (Optional)"
                                            value={reviewerName}
                                            onChange={(e) => setReviewerName(e.currentTarget.value)}
                                            disabled={isSubmitting}
                                            size="xs"
                                        />

                                        <Textarea
                                            placeholder="Share your thoughts about this dish..."
                                            value={comment}
                                            onChange={(e) => setComment(e.currentTarget.value)}
                                            disabled={isSubmitting}
                                            required
                                            minRows={2}
                                            size="xs"
                                        />

                                        <Button type="submit" loading={isSubmitting} size="xs" color="gray" fullWidth>
                                            Submit Review
                                        </Button>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Paper>
                    </Stack>
                </Container>
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

export default MenuItemDetailPage;
