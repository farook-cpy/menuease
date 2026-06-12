import type { FC } from "react";
import { useState } from "react";

import { ActionIcon, Box, createStyles, Grid, Text } from "@mantine/core";
import { IconEdit, IconGripVertical, IconTrash, IconMessage2 } from "@tabler/icons";
import { useTranslations } from "next-intl";
import { MenuItemReviewsModal } from "./MenuItemReviewsModal";
import { Draggable } from "react-beautiful-dnd";

import type { Image, MenuItem } from "@prisma/client";

import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

import { DeleteConfirmModal } from "../../DeleteConfirmModal";
import { MenuItemForm } from "../../Forms/MenuItemForm";
import { ImageKitImage } from "../../ImageKitImage";

const useStyles = createStyles((theme) => ({
    actionButtons: {
        display: "flex",
        gap: 10,
        justifyContent: "center",
    },
    dragHandleTable: {
        ...theme.fn.focusStyles(),
        alignItems: "center",
        color: theme.colors.dark[6],
        display: "flex",
        height: "100%",
        justifyContent: "center",
    },
    elementItem: {
        [`&:hover`]: { background: theme.colors.dark[1] },
        borderRadius: theme.radius.lg,
        transition: "background 500ms ease",
    },
    emptyImage: {
        alignItems: "center",
        border: `1px solid ${theme.colors.dark[2]}`,
        borderRadius: theme.radius.md,
        color: theme.colors.dark[5],
        display: "flex",
        fontSize: theme.fontSizes.xs,
        height: 50,
        overflow: "hidden",
        textAlign: "center",
        verticalAlign: "center",
        width: 50,
    },
    itemDragging: { background: theme.colors.dark[1], boxShadow: theme.shadows.sm },
}));

interface Props {
    /** Id of the Category to which the item belongs to */
    categoryId: string;
    /** Id of the menu to which the item belongs to  */
    menuId: string;
    /** Item which will be represented by the component */
    menuItem: MenuItem & { image?: Image };
}

/** Individual menu item component with an option to edit or delete */
export const MenuItemElement: FC<Props> = ({ menuItem, menuId, categoryId }) => {
    const trpcCtx = api.useContext();
    const { classes, cx, theme } = useStyles();
    const [deleteMenuItemModalOpen, setDeleteMenuItemModalOpen] = useState(false);
    const [menuItemFormOpen, setMenuItemFormOpen] = useState(false);
    const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
    const t = useTranslations("dashboard.editMenu.menuItem");
    const tCommon = useTranslations("common");

    const { mutate: deleteMenuItem, isLoading: isDeleting } = api.menuItem.delete.useMutation({
        onError: (err: any) => showErrorToast(t("deleteMenuItemError"), err),
        onSettled: () => setDeleteMenuItemModalOpen(false),
        onSuccess: (data: any) => {
            trpcCtx.category.getAll.setData({ menuId }, (categories: any[] | undefined) =>
                categories?.map((categoryItem: any) =>
                    categoryItem.id === categoryId
                        ? {
                              ...categoryItem,
                              items: categoryItem.items?.filter((item: any) => item.id !== data.id),
                          }
                        : categoryItem
                )
            );
            showSuccessToast(tCommon("deleteSuccess"), t("deleteSuccessToast", { name: data.name }));
        },
    });

    return (
        <>
            <Draggable key={menuItem.id} draggableId={menuItem.id} index={menuItem.position}>
                {(provided, snapshot) => (
                    <Box
                        className={cx([classes.elementItem, snapshot.isDragging && classes.itemDragging])}
                        data-testid={`menu-item ${menuItem.name}`}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={(theme) => ({
                            display: "flex",
                            alignItems: "center",
                            padding: theme.spacing.sm,
                            gap: theme.spacing.md,
                            borderRadius: theme.radius.lg,
                            transition: "background 500ms ease",
                            "&:hover": {
                                background: theme.colors.dark[1]
                            },
                            [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                flexDirection: "column",
                                alignItems: "stretch",
                                gap: theme.spacing.sm
                            }
                        })}
                    >
                        {/* Top row / primary info on mobile */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                            {/* Drag handle */}
                            <Box
                                className={classes.dragHandleTable}
                                {...provided.dragHandleProps}
                                sx={{ display: "flex", alignItems: "center", cursor: "grab" }}
                            >
                                <IconGripVertical size={18} stroke={1.5} />
                            </Box>

                            {/* Image */}
                            <Box className={classes.emptyImage} sx={{ flexShrink: 0 }}>
                                {menuItem.image?.path ? (
                                    <ImageKitImage
                                        key={`${menuItem.image?.id}-item-image`}
                                        blurhash={menuItem.image?.blurHash}
                                        color={menuItem.image?.color}
                                        height={50}
                                        imageAlt={menuItem.name}
                                        imagePath={menuItem.image?.path}
                                        width={50}
                                    />
                                ) : (
                                    <Text size="xs" color="dimmed" align="center" style={{ width: "100%" }}>
                                        {t("noImage")}
                                    </Text>
                                )}
                            </Box>

                            {/* Name and Description */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Text weight={700} size="sm" color="dark.8">
                                    {menuItem.name}
                                </Text>
                                <Text
                                    size="xs"
                                    color={menuItem.description ? theme.colors.dark[6] : theme.colors.dark[3]}
                                    sx={{
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}
                                >
                                    {menuItem.description || t("noDescription")}
                                </Text>
                            </Box>

                            {/* Price */}
                            <Text weight={700} color="red" size="sm" sx={{ flexShrink: 0 }}>
                                {menuItem.price}
                            </Text>
                        </Box>

                        {/* Action buttons (bottom on mobile, inline on desktop) */}
                        <Box
                            className={classes.actionButtons}
                            sx={(theme) => ({
                                display: "flex",
                                gap: 10,
                                justifyContent: "flex-end",
                                alignItems: "center",
                                flexShrink: 0,
                                [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                    justifyContent: "flex-end",
                                    borderTop: `1px solid ${theme.colors.gray[2]}`,
                                    paddingTop: theme.spacing.xs
                                }
                            })}
                        >
                            <ActionIcon
                                color="gray"
                                variant="light"
                                onClick={() => setReviewsModalOpen(true)}
                                title="View Reviews"
                                size="md"
                            >
                                <IconMessage2 size={16} />
                            </ActionIcon>
                            <ActionIcon
                                color="gray"
                                variant="light"
                                data-testid={`menu-item-edit ${menuItem.name}`}
                                onClick={() => setMenuItemFormOpen(true)}
                                size="md"
                            >
                                <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                                color="red"
                                variant="light"
                                data-testid={`menu-item-delete ${menuItem.name}`}
                                onClick={() => setDeleteMenuItemModalOpen(true)}
                                size="md"
                            >
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Box>
                    </Box>
                )}
            </Draggable>

            <DeleteConfirmModal
                description={t("deleteConfirmDesc")}
                loading={isDeleting}
                onClose={() => setDeleteMenuItemModalOpen(false)}
                onDelete={() => deleteMenuItem({ id: menuItem?.id })}
                opened={deleteMenuItemModalOpen}
                title={t("deleteConfirmTitle", { name: menuItem.name })}
            />

            <MenuItemForm
                categoryId={categoryId}
                menuId={menuId}
                menuItem={menuItem}
                onClose={() => setMenuItemFormOpen(false)}
                opened={menuItemFormOpen}
            />

            <MenuItemReviewsModal
                menuItem={menuItem}
                onClose={() => setReviewsModalOpen(false)}
                opened={reviewsModalOpen}
            />
        </>
    );
};
