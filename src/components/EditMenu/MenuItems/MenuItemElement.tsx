import type { FC } from "react";
import { useState } from "react";

import { ActionIcon, Box, createStyles, Grid, Switch, Text } from "@mantine/core";
import { IconEdit, IconGripVertical, IconMessage2, IconTrash } from "@tabler/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import { Draggable } from "react-beautiful-dnd";

import type { Image, MenuItem } from "@prisma/client";

import { api } from "src/utils/api";
import { isFeatureEnabled } from "src/utils/features";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";
import { UpgradePlanModal } from "../../UpgradePlanModal";

import { MenuItemReviewsModal } from "./MenuItemReviewsModal";
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
        flexShrink: 0,
    },
    itemTitle: {
        fontWeight: 600,
        maxWidth: 350,
    },
    rowContent: {
        alignItems: "center",
        display: "flex",
        flex: 1,
        gap: 15,
        justifyContent: "space-between",
    },
    tableElementWrap: {
        alignItems: "center",
        display: "flex",
        gap: 15,
        padding: "10px 15px",
    },
    itemDragging: { background: theme.colors.dark[1], boxShadow: theme.shadows.sm },
}));

interface Props {
    /** Id of the Category to which the item belongs to */
    categoryId: string;
    /** Id of the menu to which the item belongs to  */
    menuId: string;
    /** Item which will be represented by the component */
    menuItem: MenuItem & { image?: Image; isAvailable?: boolean; isTodaySpecial?: boolean };
}

/** Individual menu item component with an option to edit or delete */
export const MenuItemElement: FC<Props> = ({ menuItem, menuId, categoryId }) => {
    const trpcCtx = api.useContext();
    const router = useRouter();
    const { classes, cx, theme } = useStyles();
    const [deleteMenuItemModalOpen, setDeleteMenuItemModalOpen] = useState(false);
    const [menuItemFormOpen, setMenuItemFormOpen] = useState(false);
    const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [targetUpgradePlan, setTargetUpgradePlan] = useState<"Starter" | "Professional" | "Premium" | undefined>();
    const t = useTranslations("dashboard.editMenu.menuItem");
    const tCommon = useTranslations("common");

    const restaurantId = router.query?.restaurantId as string;
    const { data: restaurant } = api.restaurant.get.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );
    const planName = (restaurant as any)?.planName || "Free Trial";

    const [isAvailable, setIsAvailable] = useState(menuItem.isAvailable !== false);
    const [isTodaySpecial, setIsTodaySpecial] = useState(menuItem.isTodaySpecial === true);

    const { mutate: toggleAvailability } = api.menuItem.updateAvailability.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to update availability", err);
            setIsAvailable(!isAvailable);
        },
        onSuccess: () => {
            showSuccessToast("Availability Updated", "Menu item status updated successfully.");
        },
    });

    const { mutate: toggleSpecial } = api.menuItem.updateIsTodaySpecial.useMutation({
        onError: (err: any) => {
            showErrorToast("Failed to update special", err);
            setIsTodaySpecial(!isTodaySpecial);
        },
        onSuccess: () => {
            showSuccessToast("Special Updated", "Menu item special status updated successfully.");
        },
    });

    const handleToggleAvailability = (checked: boolean) => {
        const isAllowed = isFeatureEnabled(restaurant, "outOfStock");
        if (!isAllowed) {
            setTargetUpgradePlan("Professional");
            setUpgradeModalOpen(true);
            return;
        }
        setIsAvailable(checked);
        toggleAvailability({ id: menuItem.id, isAvailable: checked });
    };

    const handleToggleSpecial = (checked: boolean) => {
        const isAllowed = isFeatureEnabled(restaurant, "specials");
        if (!isAllowed) {
            setTargetUpgradePlan("Professional");
            setUpgradeModalOpen(true);
            return;
        }
        setIsTodaySpecial(checked);
        toggleSpecial({ id: menuItem.id, isTodaySpecial: checked });
    };

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
                            "&:hover": {
                                background: theme.colors.dark[1],
                            },
                            alignItems: "center",
                            borderRadius: theme.radius.lg,
                            display: "flex",
                            gap: theme.spacing.md,
                            padding: theme.spacing.sm,
                            transition: "background 500ms ease",
                            [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                alignItems: "stretch",
                                flexDirection: "column",
                                gap: theme.spacing.sm,
                            },
                        })}
                    >
                        {/* Top row / primary info on mobile */}
                        <Box sx={{ alignItems: "center", display: "flex", flex: 1, gap: 12 }}>
                            {/* Drag handle */}
                            <Box
                                className={classes.dragHandleTable}
                                {...provided.dragHandleProps}
                                sx={{ alignItems: "center", cursor: "grab", display: "flex" }}
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
                                    <Text align="center" color="dimmed" size="xs" style={{ width: "100%" }}>
                                        {t("noImage")}
                                    </Text>
                                )}
                            </Box>

                            {/* Name and Description */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Text color="dark.8" size="sm" weight={700}>
                                    {menuItem.name}
                                </Text>
                                <Text
                                    color={menuItem.description ? theme.colors.dark[6] : theme.colors.dark[3]}
                                    size="xs"
                                    sx={{
                                        WebkitBoxOrient: "vertical",
                                        WebkitLineClamp: 2,
                                        display: "-webkit-box",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {menuItem.description || t("noDescription")}
                                </Text>
                            </Box>

                            {/* Price */}
                            <Text color="red" size="sm" sx={{ flexShrink: 0 }} weight={700}>
                                {menuItem.price}
                            </Text>
                        </Box>

                        {/* Action buttons (bottom on mobile, inline on desktop) */}
                        <Box
                            className={classes.actionButtons}
                            sx={(theme) => ({
                                alignItems: "center",
                                display: "flex",
                                flexShrink: 0,
                                gap: 10,
                                justifyContent: "flex-end",
                                [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
                                    borderTop: `1px solid ${theme.colors.gray[2]}`,
                                    justifyContent: "flex-end",
                                    paddingTop: theme.spacing.xs,
                                },
                            })}
                        >
                            <Switch
                                checked={isAvailable}
                                label="Available"
                                size="xs"
                                color="green"
                                onChange={(e) => handleToggleAvailability(e.currentTarget.checked)}
                            />
                            <Switch
                                checked={isTodaySpecial}
                                label="Today's Special"
                                size="xs"
                                color="orange"
                                onChange={(e) => handleToggleSpecial(e.currentTarget.checked)}
                                sx={{ marginRight: 10 }}
                            />
                            <ActionIcon
                                color="gray"
                                onClick={() => setReviewsModalOpen(true)}
                                size="md"
                                title="View Reviews"
                                variant="light"
                            >
                                <IconMessage2 size={16} />
                            </ActionIcon>
                            <ActionIcon
                                color="gray"
                                data-testid={`menu-item-edit ${menuItem.name}`}
                                onClick={() => setMenuItemFormOpen(true)}
                                size="md"
                                variant="light"
                            >
                                <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                                color="red"
                                data-testid={`menu-item-delete ${menuItem.name}`}
                                onClick={() => setDeleteMenuItemModalOpen(true)}
                                size="md"
                                variant="light"
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

            {restaurant && (
                <UpgradePlanModal
                    opened={upgradeModalOpen}
                    onClose={() => setUpgradeModalOpen(false)}
                    restaurantId={restaurant.id}
                    restaurantName={restaurant.name}
                    targetPlan={targetUpgradePlan}
                />
            )}
        </>
    );
};
