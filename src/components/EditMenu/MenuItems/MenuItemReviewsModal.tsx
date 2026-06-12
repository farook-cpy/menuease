import type { FC } from "react";
import { useState, useMemo } from "react";

import {
    Box,
    Stack,
    Text,
    useMantineTheme,
    Divider,
    Textarea,
    Button,
    Group,
    ActionIcon,
    Loader,
    Flex,
    Badge
} from "@mantine/core";
import { IconStar, IconTrash, IconCornerDownRight, IconSend, IconMessage2 } from "@tabler/icons";

import type { ModalProps } from "@mantine/core";
import type { MenuItem } from "@prisma/client";

import { Modal } from "../../Modal";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

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
        onSuccess: (data: any) => {
            showSuccessToast("Reply Saved", "Your response has been published.");
        },
        onError: (err: any) => {
            showErrorToast("Failed to save reply", err);
        }
    });

    // Delete review mutation
    const { mutate: deleteReview, isLoading: isDeleting } = api.feedback.delete.useMutation({
        onSuccess: () => {
            showSuccessToast("Review Deleted", "The review was successfully deleted.");
        },
        onError: (err: any) => {
            showErrorToast("Failed to delete review", err);
        }
    });

    const handleSaveReply = (feedbackId: string) => {
        const responseText = replyInputs[feedbackId]?.trim();
        if (!responseText) return;
        saveReply({
            feedbackId,
            menuItemId: menuItem.id,
            ownerResponse: responseText
        });
    };

    const handleDeleteReview = (feedbackId: string) => {
        deleteReview({
            id: feedbackId,
            menuItemId: menuItem.id
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
                        size={14}
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
            opened={opened}
            onClose={onClose}
            title={
                <Stack spacing={4}>
                    <Text size="lg" weight="bold">
                        Reviews for "{menuItem.name}"
                    </Text>
                    {feedbacks.length > 0 && (
                        <Group spacing={6}>
                            {renderStars(Math.round(Number(averageRating)))}
                            <Text size="sm" weight={500} opacity={0.8}>
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
                    <Loader size="sm" mx="auto" my="xl" />
                ) : feedbacks.length === 0 ? (
                    <Text align="center" color="dimmed" size="sm" py="xl">
                        No reviews have been left for this item yet.
                    </Text>
                ) : (
                    feedbacks.map((fb: any) => {
                        const currentReplyText = replyInputs[fb.id] !== undefined ? replyInputs[fb.id] : (fb.ownerResponse || "");
                        return (
                            <Box
                                key={fb.id}
                                p="sm"
                                sx={{
                                    backgroundColor: theme.colorScheme === "light" ? theme.colors.gray[0] : theme.colors.dark[6],
                                    borderRadius: theme.radius.md,
                                    border: `1px solid ${theme.colorScheme === "light" ? theme.colors.gray[2] : theme.colors.dark[5]}`
                                }}
                            >
                                <Flex align="center" justify="space-between" mb={6}>
                                    <Text size="sm" weight={600}>
                                        {fb.reviewerName}
                                    </Text>
                                    <Group spacing="xs">
                                        <Text size="xs" color="dimmed">
                                            {new Date(fb.createdAt).toLocaleDateString()}
                                        </Text>
                                        <ActionIcon
                                            color="red"
                                            size="sm"
                                            onClick={() => handleDeleteReview(fb.id)}
                                            title="Delete Review"
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Flex>
                                
                                <Box mb={6}>{renderStars(fb.rating)}</Box>
                                
                                <Text size="sm" opacity={0.9} style={{ wordBreak: "break-word" }} mb="md">
                                    {fb.comment}
                                </Text>

                                {/* Owner Response Reply Form */}
                                <Box
                                    pt="xs"
                                    sx={{
                                        borderTop: `1px solid ${theme.colorScheme === "light" ? theme.colors.gray[2] : theme.colors.dark[4]}`
                                    }}
                                >
                                    {fb.ownerResponse ? (
                                        <Box mb="xs">
                                            <Flex align="center" gap={4} mb={2}>
                                                <IconCornerDownRight size={14} color={theme.colors.gray[6]} />
                                                <Text size="xs" weight={700} color="gray.6">
                                                    Your Reply
                                                </Text>
                                            </Flex>
                                            <Text size="sm" italic opacity={0.8} mb="xs">
                                                "{fb.ownerResponse}"
                                            </Text>
                                        </Box>
                                    ) : null}

                                    <Group align="flex-end" spacing="xs">
                                        <Textarea
                                            placeholder={fb.ownerResponse ? "Update your reply..." : "Write a response to this review..."}
                                            value={currentReplyText}
                                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [fb.id]: e.currentTarget.value }))}
                                            disabled={isReplying}
                                            minRows={1}
                                            autosize
                                            size="xs"
                                            sx={{ flex: 1 }}
                                        />
                                        <Button
                                            size="xs"
                                            color="gray"
                                            onClick={() => handleSaveReply(fb.id)}
                                            disabled={isReplying || !currentReplyText.trim() || currentReplyText.trim() === fb.ownerResponse}
                                            leftIcon={<IconSend size={12} />}
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
