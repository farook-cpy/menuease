import type { FC } from "react";
import { useMemo, useState } from "react";

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
    Flex
} from "@mantine/core";
import { IconStar, IconMessage2, IconCornerDownRight } from "@tabler/icons";

import type { ModalProps } from "@mantine/core";
import type { Image, MenuItem } from "@prisma/client";

import { ImageKitImage } from "../ImageKitImage";
import { Modal } from "../Modal";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

interface Props extends ModalProps {
    /** Menu item for which the modal needs to be displayed */
    menuItem?: MenuItem & { image: Image | null };
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
        onSuccess: () => {
            setReviewerName("");
            setComment("");
            setRating(5);
            showSuccessToast("Review Submitted", "Thank you for your feedback!");
        },
        onError: (err: any) => {
            showErrorToast("Failed to submit review", err);
        }
    });

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        createFeedback({
            menuItemId: menuItem?.id || "",
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
                        size={size}
                        fill={i <= count ? theme.colors.gray[6] : "none"}
                        color={i <= count ? theme.colors.gray[6] : theme.colors.gray[3]}
                    />
                ))}
            </Group>
        );
    };

    return (
        <Modal
            centered
            data-testid="menu-item-card-modal"
            styles={{ modal: { background: bgColor } }}
            opened={opened}
            title={
                <Stack spacing={4}>
                    <Text color={theme.black} size="xl" weight="bold">
                        {menuItem?.name}
                    </Text>
                    {feedbacks.length > 0 && (
                        <Group spacing={6}>
                            {renderStars(Math.round(Number(averageRating)), 16)}
                            <Text color={theme.black} size="sm" weight={500} opacity={0.8}>
                                {averageRating} ({feedbacks.length} {feedbacks.length === 1 ? "review" : "reviews"})
                            </Text>
                        </Group>
                    )}
                </Stack>
            }
            {...rest}
        >
            <Stack spacing="md" sx={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
                {menuItem?.image?.path && (
                    <Box sx={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
                        <ImageKitImage
                            blurhash={menuItem?.image?.blurHash}
                            height={400}
                            imageAlt={menuItem?.name}
                            imagePath={menuItem?.image?.path}
                            width={400}
                        />
                    </Box>
                )}
                <Text color="red" mt="sm" size="lg" weight={700}>
                    {menuItem?.price}
                </Text>
                <Text color={theme.black} opacity={0.6}>
                    {menuItem?.description}
                </Text>

                <Divider my="md" label={<Group spacing={4}><IconMessage2 size={16} /><Text weight={600}>Reviews & Feedback</Text></Group>} labelPosition="center" />

                {/* Reviews List */}
                <Stack spacing="xs">
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
                                    backgroundColor: theme.colorScheme === "light" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.2)",
                                    borderRadius: theme.radius.md,
                                    border: `1px solid ${theme.colorScheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}`
                                }}
                            >
                                <Flex align="center" justify="space-between" mb={6}>
                                    <Text size="sm" weight={600} color={theme.black}>
                                        {fb.reviewerName}
                                    </Text>
                                    <Text size="xs" color="dimmed">
                                        {new Date(fb.createdAt).toLocaleDateString()}
                                    </Text>
                                </Flex>
                                <Box mb={6}>{renderStars(fb.rating)}</Box>
                                <Text size="sm" color={theme.black} opacity={0.9} style={{ wordBreak: "break-word" }}>
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
                                        <Text size="sm" italic color={theme.black} opacity={0.8}>
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
                    onSubmit={handleSubmitReview}
                    mt="md"
                    p="sm"
                    sx={{
                        borderRadius: theme.radius.md,
                        border: `1px dashed ${theme.colorScheme === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}`
                    }}
                >
                    <Text weight={700} size="sm" mb="sm" color={theme.black}>
                        Write a Review
                    </Text>

                    <Stack spacing="xs">
                        <Group>
                            <Text size="xs" color={theme.black} opacity={0.7}>Your Rating:</Text>
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
                                            fill={value <= rating ? theme.colors.gray[6] : "none"}
                                            color={value <= rating ? theme.colors.gray[6] : theme.colors.gray[3]}
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
                            styles={{
                                input: {
                                    backgroundColor: theme.colorScheme === "light" ? "#fff" : "rgba(0,0,0,0.15)",
                                    color: theme.black
                                }
                            }}
                        />

                        <Textarea
                            placeholder="Share your thoughts about this dish..."
                            value={comment}
                            onChange={(e) => setComment(e.currentTarget.value)}
                            disabled={isSubmitting}
                            required
                            minRows={2}
                            size="xs"
                            styles={{
                                input: {
                                    backgroundColor: theme.colorScheme === "light" ? "#fff" : "rgba(0,0,0,0.15)",
                                    color: theme.black
                                }
                            }}
                        />

                        <Button type="submit" loading={isSubmitting} size="xs" color="gray" fullWidth>
                            Submit Review
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        </Modal>
    );
};
