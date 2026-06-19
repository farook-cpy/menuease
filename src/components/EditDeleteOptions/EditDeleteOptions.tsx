import type { FC } from "react";

import { ActionIcon, Loader, Menu, useMantineTheme } from "@mantine/core";
import { IconDotsVertical, IconEdit, IconTrash, IconCopy, IconBan, IconCircleCheck, IconUser } from "@tabler/icons";
import { useTranslations } from "next-intl";

export interface EditDeleteOptionsProps {
    /** Color of the menu icon */
    color?: string;
    /** Color of the menu icon when its hovered */
    hoverColor?: string;
    /** Whether or not to show the loader instead of the three dot menu */
    loading?: boolean;
    /** Event handler when delete option is clicked in the menu */
    onDeleteClick?: () => void;
    /** Event handler when edit option is clicked in the menu */
    onEditClick?: () => void;
    /** Event handler when clone option is clicked in the menu */
    onCloneClick?: () => void;
    /** Event handler when impersonate option is clicked in the menu */
    onImpersonateClick?: () => void;
    /** Suspension status if applicable */
    isSuspended?: boolean;
    /** Event handler when suspend option is clicked in the menu */
    onSuspendClick?: () => void;
}

/** Three dot menu to be shown in cards/items to allow users to trigger edit, delete, clone, suspend, or impersonate */
export const EditDeleteOptions: FC<EditDeleteOptionsProps> = ({
    loading,
    onEditClick,
    onDeleteClick,
    onCloneClick,
    onImpersonateClick,
    isSuspended,
    onSuspendClick,
    color,
    hoverColor,
}) => {
    const theme = useMantineTheme();
    const t = useTranslations("common");

    if (loading) {
        return <Loader size="sm" variant="oval" />;
    }
    return (
        <Menu shadow="md" styles={{ dropdown: { background: theme.white } }} width={150}>
            <Menu.Target>
                <ActionIcon
                    component="span"
                    data-testid="edit-delete-options"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                    sx={{
                        "&:hover": { background: "unset", color: hoverColor || theme.colors.primary?.[5] },
                        color: color || theme.colors.dark[5],
                        cursor: "pointer",
                        transition: "color 500ms ease",
                    }}
                >
                    <IconDotsVertical size={18} />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                {onEditClick && (
                    <Menu.Item
                        color={theme.black}
                        data-testid="menu-item-edit"
                        icon={<IconEdit size={14} />}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onEditClick();
                        }}
                    >
                        {t("edit")}
                    </Menu.Item>
                )}
                {onCloneClick && (
                    <Menu.Item
                        color="blue"
                        icon={<IconCopy size={14} />}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onCloneClick();
                        }}
                    >
                        Clone
                    </Menu.Item>
                )}
                {onImpersonateClick && (
                    <Menu.Item
                        color="primary"
                        icon={<IconUser size={14} />}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onImpersonateClick();
                        }}
                    >
                        Impersonate
                    </Menu.Item>
                )}
                {onSuspendClick && (
                    <Menu.Item
                        color={isSuspended ? "green" : "orange"}
                        icon={isSuspended ? <IconCircleCheck size={14} /> : <IconBan size={14} />}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onSuspendClick();
                        }}
                    >
                        {isSuspended ? "Activate" : "Suspend"}
                    </Menu.Item>
                )}
                {onDeleteClick && (
                    <Menu.Item
                        color="red"
                        data-testid="menu-item-delete"
                        icon={<IconTrash size={14} />}
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onDeleteClick();
                        }}
                    >
                        {t("delete")}
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    );
};
