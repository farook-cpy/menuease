import { useEffect, useMemo, useState } from "react";

import { Carousel } from "@mantine/carousel";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Center,
    Container,
    Divider,
    FileButton,
    Flex,
    Group,
    Image,
    Loader,
    Paper,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    useMantineTheme,
} from "@mantine/core";
import {
    IconArrowLeft,
    IconCornerDownRight,
    IconMessage2,
    IconPhoto,
    IconStar,
    IconThumbDown,
    IconThumbUp,
    IconTrash,
} from "@tabler/icons";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

import { ImageKitImage } from "src/components/ImageKitImage";
import { env } from "src/env/client.mjs";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";
import { usePlate } from "src/utils/plateContext";

const getDeviceType = () => {
    if (typeof window === "undefined") return "Desktop";
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "Tablet";
    }
    if (
        /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)
    ) {
        return "Mobile";
    }
    return "Desktop";
};

const MenuItemDetailPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();

    const restaurantId = router.query.restaurantId as string;
    const menuItemId = router.query.menuItemId as string;

    const [reviewerName, setReviewerName] = useState("");
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);
    const [reviewImageBase64, setReviewImageBase64] = useState<string | null>(null);
    const [reviewImageName, setReviewImageName] = useState<string>("");

    const { activeRestaurantId, setActiveRestaurantId, addToPlate } = usePlate();
    const [detailQty, setDetailQty] = useState(1);

    const [reaction, setReaction] = useState<string | null>(null);

    useEffect(() => {
        if (menuItemId && typeof window !== "undefined") {
            setReaction(localStorage.getItem(`menuease_reaction_${menuItemId}`));
        }
    }, [menuItemId]);

    const { mutate: updateLikes } = api.menuItem.updateLikes.useMutation();

    const handleLike = () => {
        let likesDelta = 0;
        let dislikesDelta = 0;
        let newReaction: string | null = null;

        if (reaction === "like") {
            likesDelta = -1;
            newReaction = null;
        } else {
            likesDelta = 1;
            if (reaction === "dislike") {
                dislikesDelta = -1;
            }
            newReaction = "like";
        }

        updateLikes({ dislikesDelta, id: menuItemId, likesDelta });
        setReaction(newReaction);
        if (typeof window !== "undefined") {
            if (newReaction) {
                localStorage.setItem(`menuease_reaction_${menuItemId}`, newReaction);
            } else {
                localStorage.removeItem(`menuease_reaction_${menuItemId}`);
            }
        }
    };

    const handleDislike = () => {
        let likesDelta = 0;
        let dislikesDelta = 0;
        let newReaction: string | null = null;

        if (reaction === "dislike") {
            dislikesDelta = -1;
            newReaction = null;
        } else {
            dislikesDelta = 1;
            if (reaction === "like") {
                likesDelta = -1;
            }
            newReaction = "dislike";
        }

        updateLikes({ dislikesDelta, id: menuItemId, likesDelta });
        setReaction(newReaction);
        if (typeof window !== "undefined") {
            if (newReaction) {
                localStorage.setItem(`menuease_reaction_${menuItemId}`, newReaction);
            } else {
                localStorage.removeItem(`menuease_reaction_${menuItemId}`);
            }
        }
    };

    useEffect(() => {
        if (restaurantId && activeRestaurantId !== restaurantId) {
            setActiveRestaurantId(restaurantId);
        }
    }, [restaurantId, activeRestaurantId, setActiveRestaurantId]);

    // Fetch restaurant details
    const { data: restaurant, isLoading: restaurantLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );
    const handleFileChange = (file: File | null) => {
        if (!file) {
            setReviewImageBase64(null);
            setReviewImageName("");
            return;
        }
        setReviewImageName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
            setReviewImageBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Fetch menuItem details
    const { data: menuItem, isLoading: menuItemLoading } = api.menuItem.get.useQuery<any>(
        { id: menuItemId },
        { enabled: !!menuItemId }
    );

    // Fetch feedbacks/reviews
    const {
        data: feedbacks = [],
        isLoading: feedbacksLoading,
        refetch,
    } = api.feedback.getByMenuItem.useQuery({ menuItemId: menuItemId || "" }, { enabled: !!menuItemId });

    // Track item click analytics when this page loads
    const { mutate: logClick } = api.analytics.logView.useMutation();
    useEffect(() => {
        if (restaurantId && menuItemId && menuItem) {
            logClick({ deviceType: getDeviceType(), menuItemId, restaurantId, type: "item_click" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId, menuItemId, menuItem?.id]);

    // Submit review mutation
    const { mutate: createFeedback, isLoading: isSubmitting } = api.feedback.create.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to submit review", err);
        },
        onSuccess: () => {
            setReviewerName("");
            setComment("");
            setRating(5);
            setReviewImageBase64(null);
            setReviewImageName("");
            showSuccessToast("Review Submitted", "Thank you for your feedback!");
            refetch();
        },
    });

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        createFeedback({
            comment,
            imageBase64: reviewImageBase64 || undefined,
            menuItemId: menuItemId || "",
            rating,
            reviewerName: reviewerName.trim() || "Anonymous",
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
                        color={i <= count ? "#f59e0b" : theme.colors.gray[3]}
                        fill={i <= count ? "#f59e0b" : "none"}
                        size={size}
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
                <Paper p="xl" radius="md" withBorder>
                    <Stack align="center" spacing="md">
                        <Text size="lg" weight={600}>
                            Item not found
                        </Text>
                        <Link href={restaurantId ? `/restaurant/${restaurantId}/menu` : "/restaurant"} passHref>
                            <Button color="gray" leftIcon={<IconArrowLeft size={16} />} variant="outline">
                                Back to Menu
                            </Button>
                        </Link>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    const menuUrl = `/restaurant/${restaurantId}/menu`;

    const detailContent = (
        <>
            <NextSeo
                description={menuItem.description || `View details and reviews for ${menuItem.name}`}
                title={`${menuItem.name} - ${restaurant?.name || "Menu Item"}`}
            />
            <main>
                <Container py="xl" size="sm">
                    <Stack spacing="lg">
                        {/* Back navigation */}
                        <Group>
                            <Link href={menuUrl} passHref>
                                <Button color="gray" compact leftIcon={<IconArrowLeft size={16} />} variant="subtle">
                                    Back to Menu
                                </Button>
                            </Link>
                        </Group>

                        {/* Product Card */}
                        <Paper p="xl" radius="lg" shadow="sm" withBorder>
                            <Stack spacing="md">
                                {menuItem.videoUrl && (
                                    <Box
                                        sx={{
                                            borderRadius: theme.radius.md,
                                            display: "flex",
                                            justifyContent: "center",
                                            marginBottom: 15,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <video
                                            autoPlay
                                            controls
                                            loop
                                            muted
                                            playsInline
                                            src={menuItem.videoUrl}
                                            style={{
                                                borderRadius: "8px",
                                                maxHeight: "350px",
                                                objectFit: "cover",
                                                width: "100%",
                                            }}
                                        />
                                    </Box>
                                )}

                                {menuItem.images && menuItem.images.length > 1 ? (
                                    <Box
                                        sx={{
                                            borderRadius: theme.radius.md,
                                            display: "flex",
                                            justifyContent: "center",
                                            overflow: "hidden",
                                            width: "100%",
                                        }}
                                    >
                                        <Carousel
                                            height={400}
                                            loop
                                            mx="auto"
                                            style={{ width: "100%" }}
                                            styles={{ indicator: { background: theme.white } }}
                                            withIndicators
                                        >
                                            {menuItem.images.map((img: any, index: number) => (
                                                <Carousel.Slide key={img.id}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            height: "100%",
                                                            justifyContent: "center",
                                                            width: "100%",
                                                        }}
                                                    >
                                                        <ImageKitImage
                                                            blurhash={img.blurHash}
                                                            color={img.color}
                                                            height={400}
                                                            imageAlt={`${menuItem.name}-${index}`}
                                                            imagePath={img.path}
                                                            priority={index === 0}
                                                            width={500}
                                                        />
                                                    </Box>
                                                </Carousel.Slide>
                                            ))}
                                        </Carousel>
                                    </Box>
                                ) : menuItem.image?.path ? (
                                    <Box
                                        sx={{
                                            borderRadius: theme.radius.md,
                                            display: "flex",
                                            justifyContent: "center",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <ImageKitImage
                                            blurhash={menuItem.image.blurHash}
                                            height={400}
                                            imageAlt={menuItem.name}
                                            imagePath={menuItem.image.path}
                                            width={500}
                                        />
                                    </Box>
                                ) : null}

                                <Stack mt="sm" spacing={4}>
                                    <Group align="center" spacing="md">
                                        <Title color="dark.8" order={1} size="1.8rem">
                                            {menuItem.name}
                                        </Title>
                                        {menuItem.isVeg === true && (
                                            <Badge color="green" size="md" variant="light">
                                                Veg
                                            </Badge>
                                        )}
                                        {menuItem.isVeg === false && (
                                            <Badge color="red" size="md" variant="light">
                                                Non-Veg
                                            </Badge>
                                        )}
                                    </Group>

                                    {feedbacks.length > 0 ? (
                                        <Group spacing={6}>
                                            {renderStars(Math.round(Number(averageRating)), 18)}
                                            <Text color="dimmed" size="sm" weight={500}>
                                                {averageRating} / 5.0 ({feedbacks.length}{" "}
                                                {feedbacks.length === 1 ? "review" : "reviews"})
                                            </Text>
                                        </Group>
                                    ) : (
                                        <Text color="dimmed" italic size="xs">
                                            No reviews yet
                                        </Text>
                                    )}
                                </Stack>

                                <Flex
                                    align={{ base: "flex-start", sm: "center" }}
                                    direction={{ base: "column", sm: "row" }}
                                    gap="md"
                                    justify="space-between"
                                >
                                    <Group spacing="md">
                                        <Text color="red" size="xl" weight={700}>
                                            {menuItem.price}
                                        </Text>
                                        <Group spacing="xs">
                                            <Group spacing={4}>
                                                <ActionIcon
                                                    size="md"
                                                    variant={reaction === "like" ? "filled" : "light"}
                                                    color={reaction === "like" ? "blue" : "gray"}
                                                    onClick={handleLike}
                                                    sx={{
                                                        backgroundColor: reaction === "like" ? "rgba(34, 139, 230, 0.15) !important" : "transparent",
                                                        color: reaction === "like" ? "#228be6 !important" : "gray",
                                                    }}
                                                >
                                                    <IconThumbUp size={16} />
                                                </ActionIcon>
                                                <Text size="sm" color="dimmed" weight={500}>{menuItem.likes || 0}</Text>
                                            </Group>
                                            <Group spacing={4}>
                                                <ActionIcon
                                                    size="md"
                                                    variant={reaction === "dislike" ? "filled" : "light"}
                                                    color={reaction === "dislike" ? "red" : "gray"}
                                                    onClick={handleDislike}
                                                    sx={{
                                                        backgroundColor: reaction === "dislike" ? "rgba(250, 82, 82, 0.15) !important" : "transparent",
                                                        color: reaction === "dislike" ? "#fa5252 !important" : "gray",
                                                    }}
                                                >
                                                    <IconThumbDown size={16} />
                                                </ActionIcon>
                                                <Text size="sm" color="dimmed" weight={500}>{menuItem.dislikes || 0}</Text>
                                            </Group>
                                        </Group>
                                    </Group>
                                    {restaurant?.isOrderFeatureEnabled && (
                                        <Group spacing="sm">
                                            <Group
                                                spacing={4}
                                                sx={{
                                                    backgroundColor: theme.colors.gray[0],
                                                    border: `1px solid ${theme.colors.gray[3]}`,
                                                    borderRadius: theme.radius.md,
                                                    padding: "2px 4px",
                                                }}
                                            >
                                                <ActionIcon
                                                    disabled={detailQty <= 1}
                                                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                                                    size="sm"
                                                    variant="transparent"
                                                >
                                                    -
                                                </ActionIcon>
                                                <Text
                                                    size="sm"
                                                    sx={{ color: theme.black, textAlign: "center", width: 24 }}
                                                    weight={600}
                                                >
                                                    {detailQty}
                                                </Text>
                                                <ActionIcon
                                                    onClick={() => setDetailQty(detailQty + 1)}
                                                    size="sm"
                                                    variant="transparent"
                                                >
                                                    +
                                                </ActionIcon>
                                            </Group>
                                            <Button
                                                color="primary"
                                                onClick={() => {
                                                    addToPlate(
                                                        {
                                                            id: menuItem.id,
                                                            isVeg: menuItem.isVeg,
                                                            name: menuItem.name,
                                                            price: menuItem.price,
                                                        },
                                                        detailQty
                                                    );
                                                    showSuccessToast(
                                                        "Added to Plate",
                                                        `${detailQty}x ${menuItem.name} added to your plate!`
                                                    );
                                                }}
                                                radius="md"
                                            >
                                                Add to Plate
                                            </Button>
                                        </Group>
                                    )}
                                </Flex>

                                {menuItem.description && (
                                    <Text color="dark.7" size="sm" style={{ lineHeight: 1.6 }}>
                                        {menuItem.description}
                                    </Text>
                                )}
                            </Stack>
                        </Paper>

                        {/* Reviews & Feedback Section */}
                        <Paper p="xl" radius="lg" shadow="sm" withBorder>
                            <Stack spacing="md">
                                <Group mb="xs" spacing={4}>
                                    <IconMessage2 color={theme.colors.gray[5]} size={20} />
                                    <Text size="md" weight={700}>
                                        Customer Reviews
                                    </Text>
                                </Group>

                                {/* Reviews List */}
                                <Stack spacing="sm">
                                    {feedbacksLoading ? (
                                        <Loader mx="auto" size="sm" />
                                    ) : feedbacks.length === 0 ? (
                                        <Text align="center" color="dimmed" py="md" size="sm">
                                            No reviews yet. Be the first to leave feedback!
                                        </Text>
                                    ) : (
                                        feedbacks.map((fb: any) => (
                                            <Box
                                                key={fb.id}
                                                p="sm"
                                                sx={{
                                                    backgroundColor: theme.colors.gray[0],
                                                    border: `1px solid ${theme.colors.gray[2]}`,
                                                    borderRadius: theme.radius.md,
                                                }}
                                            >
                                                <Flex align="center" justify="space-between" mb={6}>
                                                    <Text color="dark.8" size="sm" weight={600}>
                                                        {fb.reviewerName}
                                                    </Text>
                                                    <Text color="dimmed" size="xs">
                                                        {new Date(fb.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </Flex>
                                                <Box mb={6}>{renderStars(fb.rating, 14)}</Box>
                                                <Text color="dark.7" size="sm" style={{ wordBreak: "break-word" }}>
                                                    {fb.comment}
                                                </Text>
                                                {fb.imageUrl && (
                                                    <Box
                                                        sx={{
                                                            borderRadius: theme.radius.sm,
                                                            marginTop: 10,
                                                            maxWidth: 220,
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <Image
                                                            alt="Review photo"
                                                            caption="Customer Photo"
                                                            radius="sm"
                                                            src={
                                                                fb.imageUrl.startsWith("http")
                                                                    ? fb.imageUrl
                                                                    : `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menufic/${fb.imageUrl}`
                                                            }
                                                        />
                                                    </Box>
                                                )}

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
                                                            <IconCornerDownRight
                                                                color={theme.colors.gray[6]}
                                                                size={14}
                                                            />
                                                            <Text color="gray.6" size="xs" weight={700}>
                                                                Owner's Reply
                                                            </Text>
                                                        </Flex>
                                                        <Text color="dark.8" italic opacity={0.8} size="sm">
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
                                <Box component="form" mt="xs" onSubmit={handleSubmitReview}>
                                    <Text mb="sm" size="sm" weight={700}>
                                        Write a Review
                                    </Text>

                                    <Stack spacing="xs">
                                        <Group>
                                            <Text color="dimmed" size="xs">
                                                Your Rating:
                                            </Text>
                                            <Group spacing="xs">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <ActionIcon
                                                        key={value}
                                                        onClick={() => setRating(value)}
                                                        size="xs"
                                                        variant="transparent"
                                                    >
                                                        <IconStar
                                                            color={value <= rating ? "#f59e0b" : theme.colors.gray[3]}
                                                            fill={value <= rating ? "#f59e0b" : "none"}
                                                            size={20}
                                                        />
                                                    </ActionIcon>
                                                ))}
                                            </Group>
                                        </Group>

                                        <TextInput
                                            disabled={isSubmitting}
                                            onChange={(e) => setReviewerName(e.currentTarget.value)}
                                            placeholder="Your Name (Optional)"
                                            size="xs"
                                            value={reviewerName}
                                        />

                                        <Textarea
                                            disabled={isSubmitting}
                                            minRows={2}
                                            onChange={(e) => setComment(e.currentTarget.value)}
                                            placeholder="Share your thoughts about this dish..."
                                            required
                                            size="xs"
                                            value={comment}
                                        />

                                        <Group align="center" my={4} spacing="xs">
                                            <FileButton accept="image/png,image/jpeg" onChange={handleFileChange}>
                                                {(props) => (
                                                    <Button
                                                        {...props}
                                                        color="gray"
                                                        leftIcon={<IconPhoto size={14} />}
                                                        size="xs"
                                                        variant="outline"
                                                    >
                                                        Upload Photo
                                                    </Button>
                                                )}
                                            </FileButton>
                                            {reviewImageName && (
                                                <Group align="center" spacing={4}>
                                                    <Text
                                                        color="dimmed"
                                                        size="xs"
                                                        style={{
                                                            maxWidth: 180,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {reviewImageName}
                                                    </Text>
                                                    <ActionIcon
                                                        color="red"
                                                        onClick={() => handleFileChange(null)}
                                                        size="xs"
                                                    >
                                                        <IconTrash size={12} />
                                                    </ActionIcon>
                                                </Group>
                                            )}
                                        </Group>

                                        <Button color="gray" fullWidth loading={isSubmitting} size="xs" type="submit">
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

    return detailContent;
};

export const getStaticPaths = () => {
    return { fallback: "blocking", paths: [] };
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default MenuItemDetailPage;
