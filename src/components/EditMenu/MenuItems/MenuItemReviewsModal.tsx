import type { FC } from "react";
import { useMemo, useState } from "react";

import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    Group,
    Loader,
    Stack,
    Text,
    Textarea,
    useMantineTheme,
} from "@mantine/core";
import { IconCornerDownRight, IconMessage2, IconSend, IconStar, IconTrash } from "@tabler/icons";

import type { ModalProps } from "@mantine/core";
import type { MenuItem } from "@prisma/client";

import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

import { Modal } from "../../Modal";

interface Props extends ModalProps {
    menuItem: MenuItem;
}

export const MenuItemReviewsModal: FC<Props> = ({ menuItem, opened, onClose, ...rest }) => {
    const theme = useMantineTheme();
    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

    // Fetch feedbacks for this menu item
    const { data: feedbacks = [], isLoading: feedbacksLoading } = api.feedback.getByMenuItem.useQuery(
        { menuItemId: menuItem.id },
        { enabled: opened && !!menuItem.id }
    );

    // Save reply mutation
    const { mutate: saveReply, isLoading: isReplying } = api.feedback.reply.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to save reply", err);
        },
        onSuccess: (data: any) => {
            showSuccessToast("Reply Saved", "Your response has been published.");
        },
    });

    // Delete review mutation
    const { mutate: deleteReview, isLoading: isDeleting } = api.feedback.delete.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to delete review", err);
        },
        onSuccess: () => {
            showSuccessToast("Review Deleted", "The review was successfully deleted.");
        },
    });

    const handleSaveReply = (feedbackId: string) => {
        const responseText = replyInputs[feedbackId]?.trim();
        if (!responseText) return;
        saveReply({
            feedbackId,
            menuItemId: menuItem.id,
            ownerResponse: responseText,
        });
    };

    const handleDeleteReview = (feedbackId: string) => {
        deleteReview({
            id: feedbackId,
            menuItemId: menuItem.id,
        });
    };

    const averageRating = useMemo(() => {
        if (feedbacks.length === 0) return 0;
        const total = feedbacks.reduce((acc: number, f: any) => acc + f.rating, 0);
        return (total / feedbacks.length).toFixed(1);
    }, [feedbacks]);

    const renderStars = (count: number) => {
        return (
            <Group spacing={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <IconStar
                        key={i}
                        color={i <= count ? theme.colors.gray[6] : theme.colors.gray[3]}
                        fill={i <= count ? theme.colors.gray[6] : "none"}
                        size={14}
                    />
                ))}
            </Group>
        );
    };

    return (
        <Modal
            centered
            onClose={onClose}
            opened={opened}
            title={
                <Stack spacing={4}>
                    <Text size="lg" weight="bold">
                        Reviews for "{menuItem.name}"
                    </Text>
                    {feedbacks.length > 0 && (
                        <Group spacing={6}>
                            {renderStars(Math.round(Number(averageRating)))}
                            <Text opacity={0.8} size="sm" weight={500}>
                                {averageRating} / 5.0 ({feedbacks.length} total)
                            </Text>
                        </Group>
                    )}
                </Stack>
            }
            {...rest}
        >
            <Stack spacing="md" sx={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
                {feedbacksLoading ? (
                    <Loader mx="auto" my="xl" size="sm" />
                ) : feedbacks.length === 0 ? (
                    <Text align="center" color="dimmed" py="xl" size="sm">
                        No reviews have been left for this item yet.
                    </Text>
                ) : (
                    feedbacks.map((fb: any) => {
                        const currentReplyText =
                            replyInputs[fb.id] !== undefined ? replyInputs[fb.id] : fb.ownerResponse || "";
                        return (
                            <Box
                                key={fb.id}
                                p="sm"
                                sx={{
                                    backgroundColor:
                                        theme.colorScheme === "light" ? theme.colors.gray[0] : theme.colors.dark[6],
                                    border: `1px solid ${
                                        theme.colorScheme === "light" ? theme.colors.gray[2] : theme.colors.dark[5]
                                    }`,
                                    borderRadius: theme.radius.md,
                                }}
                            >
                                <Flex align="center" justify="space-between" mb={6}>
                                    <Text size="sm" weight={600}>
                                        {fb.reviewerName}
                                    </Text>
                                    <Group spacing="xs">
                                        <Text color="dimmed" size="xs">
                                            {new Date(fb.createdAt).toLocaleDateString()}
                                        </Text>
                                        <ActionIcon
                                            color="red"
                                            onClick={() => handleDeleteReview(fb.id)}
                                            size="sm"
                                            title="Delete Review"
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Flex>

                                <Box mb={6}>{renderStars(fb.rating)}</Box>

                                <Text mb="md" opacity={0.9} size="sm" style={{ wordBreak: "break-word" }}>
                                    {fb.comment}
                                </Text>

                                {/* Owner Response Reply Form */}
                                <Box
                                    pt="xs"
                                    sx={{
                                        borderTop: `1px solid ${
                                            theme.colorScheme === "light" ? theme.colors.gray[2] : theme.colors.dark[4]
                                        }`,
                                    }}
                                >
                                    {fb.ownerResponse ? (
                                        <Box mb="xs">
                                            <Flex align="center" gap={4} mb={2}>
                                                <IconCornerDownRight color={theme.colors.gray[6]} size={14} />
                                                <Text color="gray.6" size="xs" weight={700}>
                                                    Your Reply
                                                </Text>
                                            </Flex>
                                            <Text italic mb="xs" opacity={0.8} size="sm">
                                                "{fb.ownerResponse}"
                                            </Text>
                                        </Box>
                                    ) : null}

                                    <Group align="flex-end" spacing="xs">
                                        <Textarea
                                            autosize
                                            disabled={isReplying}
                                            minRows={1}
                                            onChange={(e) =>
                                                setReplyInputs((prev) => ({ ...prev, [fb.id]: e.currentTarget.value }))
                                            }
                                            placeholder={
                                                fb.ownerResponse
                                                    ? "Update your reply..."
                                                    : "Write a response to this review..."
                                            }
                                            size="xs"
                                            sx={{ flex: 1 }}
                                            value={currentReplyText}
                                        />
                                        <Button
                                            color="gray"
                                            disabled={
                                                isReplying ||
                                                !currentReplyText.trim() ||
                                                currentReplyText.trim() === fb.ownerResponse
                                            }
                                            leftIcon={<IconSend size={12} />}
                                            onClick={() => handleSaveReply(fb.id)}
                                            size="xs"
                                        >
                                            {fb.ownerResponse ? "Update" : "Reply"}
                                        </Button>
                                    </Group>
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Stack>
        </Modal>
    );
};
