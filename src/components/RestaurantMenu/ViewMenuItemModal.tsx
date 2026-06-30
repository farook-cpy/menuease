import type { FC } from "react";
import { useMemo, useState } from "react";

import { Carousel } from "@mantine/carousel";
import {
    ActionIcon,
    Box,
    Button,
    Divider,
    Flex,
    Group,
    Loader,
    Stack,
    Text,
    Textarea,
    TextInput,
    useMantineTheme,
} from "@mantine/core";
import { IconCornerDownRight, IconMessage2, IconStar } from "@tabler/icons";

import type { ModalProps } from "@mantine/core";
import type { Image, MenuItem } from "@prisma/client";

import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

import { ImageKitImage } from "../ImageKitImage";
import { Modal } from "../Modal";

interface Props extends ModalProps {
    /** Menu item for which the modal needs to be displayed */
    menuItem?: MenuItem & { image: Image | null; images?: Image[]; videoUrl?: string | null };
}

/** Modal to view details of a selected menu item */
export const ViewMenuItemModal: FC<Props> = ({ menuItem, opened, ...rest }) => {
    const theme = useMantineTheme();
    const [reviewerName, setReviewerName] = useState("");
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);

    // Fetch feedbacks/reviews
    const { data: feedbacks = [], isLoading: feedbacksLoading } = api.feedback.getByMenuItem.useQuery(
        { menuItemId: menuItem?.id || "" },
        { enabled: opened && !!menuItem?.id }
    );

    // Submit review mutation
    const { mutate: createFeedback, isLoading: isSubmitting } = api.feedback.create.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to submit review", err);
        },
        onSuccess: () => {
            setReviewerName("");
            setComment("");
            setRating(5);
            showSuccessToast("Review Submitted", "Thank you for your feedback!");
        },
    });

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        createFeedback({
            comment,
            menuItemId: menuItem?.id || "",
            rating,
            reviewerName: reviewerName.trim() || "Anonymous",
        });
    };

    const averageRating = useMemo(() => {
        if (feedbacks.length === 0) return 0;
        const total = feedbacks.reduce((acc: number, f: any) => acc + f.rating, 0);
        return (total / feedbacks.length).toFixed(1);
    }, [feedbacks]);

    const bgColor = useMemo(() => {
        if (menuItem?.image?.color) {
            if (theme.colorScheme === "light") {
                return theme.fn.lighten(menuItem?.image?.color, 0.85);
            }
            return theme.fn.darken(menuItem?.image?.color, 0.85);
        }
        return theme.white;
    }, [menuItem?.image?.color, theme.colorScheme]);

    const renderStars = (count: number, size = 14) => {
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

    return (
        <Modal
            centered
            data-testid="menu-item-card-modal"
            opened={opened}
            styles={{ modal: { background: bgColor } }}
            title={
                <Stack spacing={4}>
                    <Text color={theme.black} size="xl" weight="bold">
                        {menuItem?.name}
                    </Text>
                    {feedbacks.length > 0 && (
                        <Group spacing={6}>
                            {renderStars(Math.round(Number(averageRating)), 16)}
                            <Text color={theme.black} opacity={0.8} size="sm" weight={500}>
                                {averageRating} ({feedbacks.length} {feedbacks.length === 1 ? "review" : "reviews"})
                            </Text>
                        </Group>
                    )}
                </Stack>
            }
            {...rest}
        >
            <Stack spacing="md" sx={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
                {menuItem?.videoUrl && (
                    <Box sx={{ borderRadius: theme.radius.lg, marginBottom: 10, overflow: "hidden" }}>
                        <video
                            autoPlay
                            controls
                            loop
                            muted
                            playsInline
                            src={menuItem.videoUrl}
                            style={{ maxHeight: "250px", objectFit: "cover", width: "100%" }}
                        />
                    </Box>
                )}
                {menuItem?.images && menuItem.images.length > 1 ? (
                    <Box sx={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
                        <Carousel
                            height={300}
                            loop
                            mx="auto"
                            styles={{ indicator: { background: theme.white } }}
                            withIndicators
                        >
                            {menuItem.images.map((img, index) => (
                                <Carousel.Slide key={img.id}>
                                    <ImageKitImage
                                        blurhash={img.blurHash}
                                        color={img.color}
                                        height={300}
                                        imageAlt={`${menuItem.name}-${index}`}
                                        imagePath={img.path}
                                        priority={index === 0}
                                        width={400}
                                    />
                                </Carousel.Slide>
                            ))}
                        </Carousel>
                    </Box>
                ) : menuItem?.image?.path ? (
                    <Box sx={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
                        <ImageKitImage
                            blurhash={menuItem?.image?.blurHash}
                            height={400}
                            imageAlt={menuItem?.name}
                            imagePath={menuItem?.image?.path}
                            width={400}
                        />
                    </Box>
                ) : null}
                <Text color="red" mt="sm" size="lg" weight={700}>
                    {menuItem?.price}
                </Text>
                <Text color={theme.black} opacity={0.6}>
                    {menuItem?.description}
                </Text>

                <Divider
                    label={
                        <Group spacing={4}>
                            <IconMessage2 size={16} />
                            <Text weight={600}>Reviews & Feedback</Text>
                        </Group>
                    }
                    labelPosition="center"
                    my="md"
                />

                {/* Reviews List */}
                <Stack spacing="xs">
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
                                    backgroundColor:
                                        theme.colorScheme === "light" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.2)",
                                    border: `1px solid ${
                                        theme.colorScheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"
                                    }`,
                                    borderRadius: theme.radius.md,
                                }}
                            >
                                <Flex align="center" justify="space-between" mb={6}>
                                    <Text color={theme.black} size="sm" weight={600}>
                                        {fb.reviewerName}
                                    </Text>
                                    <Text color="dimmed" size="xs">
                                        {new Date(fb.createdAt).toLocaleDateString()}
                                    </Text>
                                </Flex>
                                <Box mb={6}>{renderStars(fb.rating)}</Box>
                                <Text color={theme.black} opacity={0.9} size="sm" style={{ wordBreak: "break-word" }}>
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
                                            <IconCornerDownRight color={theme.colors.gray[6]} size={14} />
                                            <Text color="gray.6" size="xs" weight={700}>
                                                Owner's Reply
                                            </Text>
                                        </Flex>
                                        <Text color={theme.black} italic opacity={0.8} size="sm">
                                            "{fb.ownerResponse}"
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        ))
                    )}
                </Stack>

                {/* Submit Feedback Form */}
                <Box
                    component="form"
                    mt="md"
                    onSubmit={handleSubmitReview}
                    p="sm"
                    sx={{
                        border: `1px dashed ${
                            theme.colorScheme === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"
                        }`,
                        borderRadius: theme.radius.md,
                    }}
                >
                    <Text color={theme.black} mb="sm" size="sm" weight={700}>
                        Write a Review
                    </Text>

                    <Stack spacing="xs">
                        <Group>
                            <Text color={theme.black} opacity={0.7} size="xs">
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
                                            color={value <= rating ? theme.colors.gray[6] : theme.colors.gray[3]}
                                            fill={value <= rating ? theme.colors.gray[6] : "none"}
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
                            styles={{
                                input: {
                                    backgroundColor: theme.colorScheme === "light" ? "#fff" : "rgba(0,0,0,0.15)",
                                    color: theme.black,
                                },
                            }}
                            value={reviewerName}
                        />

                        <Textarea
                            disabled={isSubmitting}
                            minRows={2}
                            onChange={(e) => setComment(e.currentTarget.value)}
                            placeholder="Share your thoughts about this dish..."
                            required
                            size="xs"
                            styles={{
                                input: {
                                    backgroundColor: theme.colorScheme === "light" ? "#fff" : "rgba(0,0,0,0.15)",
                                    color: theme.black,
                                },
                            }}
                            value={comment}
                        />

                        <Button color="gray" fullWidth loading={isSubmitting} size="xs" type="submit">
                            Submit Review
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        </Modal>
    );
};
