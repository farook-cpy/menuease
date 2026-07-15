import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";

import { ActionIcon, Badge, Box, Button, createStyles, Group, Paper, Stack, Text } from "@mantine/core";
import { ThumbsDownIcon, ThumbsUpIcon } from "@animateicons/react/lucide";
import Link from "next/link";
import { useRouter } from "next/router";

import type { Image, MenuItem } from "@prisma/client";

import { api } from "src/utils/api";
import { usePlate } from "src/utils/plateContext";

import { ImageKitImage } from "../ImageKitImage";

export interface StyleProps {
    imageColor?: string;
    isOutOfStock?: boolean;
    styleTheme?: string;
}

const useStyles = createStyles((theme, { imageColor, isOutOfStock, styleTheme }: StyleProps, getRef) => {
    const image = getRef("image");

    const bgColor = useMemo(() => {
        if (imageColor) {
            if (theme.colorScheme === "light") {
                return theme.fn.lighten(imageColor, 0.95);
            }
            return theme.fn.darken(imageColor, 0.95);
        }
        return theme.colors.dark[0];
    }, [imageColor, theme.colorScheme]);

    return {
        cardDescWrap: { 
            flex: 1, 
            gap: 0, 
            overflow: "hidden", 
            padding: styleTheme === "SIMPLE" ? "6px 12px" : theme.spacing.lg 
        },
        cardImage: { 
            height: styleTheme === "SIMPLE" ? 45 : 150, 
            ref: image, 
            transition: "transform 500ms ease", 
            width: styleTheme === "SIMPLE" ? 45 : 150 
        },
        cardImageWrap: {
            borderRadius: styleTheme === "SIMPLE" || styleTheme === "GOURMET" ? "50%" : theme.radius.lg,
            height: styleTheme === "SIMPLE" ? 45 : 150,
            overflow: "hidden",
            position: "relative",
            width: styleTheme === "SIMPLE" ? 45 : 150,
            margin: styleTheme === "SIMPLE" ? "auto 0 auto 10px" : undefined,
            border: styleTheme === "GOURMET" ? "2px solid #d4af37" : undefined,
        },
        cardItem: {
            "&:hover": isOutOfStock ? {} : {
                backgroundColor:
                    theme.colorScheme === "light" ? theme.fn.darken(bgColor, 0.02) : theme.fn.lighten(bgColor, 0.02),
                boxShadow: theme.shadows.xs,
            },
            backgroundColor: styleTheme === "SIMPLE" ? "transparent" : bgColor,
            border: styleTheme === "SIMPLE" ? "none" : styleTheme === "GOURMET" ? "1px solid #d4af37" : `1px solid ${theme.colors.dark[3]}`,
            borderBottom: styleTheme === "SIMPLE" ? `1px dashed ${theme.colorScheme === "light" ? "#dee2e6" : "#373a40"}` : undefined,
            color: theme.colors.dark[8],
            cursor: isOutOfStock ? "not-allowed" : "pointer",
            display: "flex",
            overflow: "hidden",
            padding: "0 !important",
            transition: "all 500ms ease",
            opacity: isOutOfStock ? 0.6 : 1,
            filter: isOutOfStock ? "grayscale(0.7)" : "none",
            [`&:hover .${image}`]: isOutOfStock ? {} : { transform: "scale(1.05)" },
            borderRadius: styleTheme === "SIMPLE" ? 0 : theme.radius.lg,
            boxShadow: styleTheme === "GOURMET" ? "0 4px 15px rgba(212, 175, 55, 0.15)" : undefined,
        },
        cardItemDesc: { WebkitLineClamp: 3 },
        cardItemTitle: { WebkitLineClamp: 1 },
        cardText: {
            WebkitBoxOrient: "vertical",
            color: theme.black,
            display: "-webkit-box",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "normal",
        },
    };
});

interface Props {
    /** Menu item to be displayed in the card */
    item: any;
    isOrderFeatureEnabled?: boolean;
    styleTheme?: string;
}

/** Display each menu item as a card in the full restaurant menu */
export const MenuItemCard: FC<Props> = ({ item, isOrderFeatureEnabled, styleTheme = "GRID" }) => {
    const isOutOfStock = item.isAvailable === false;
    const { classes, cx } = useStyles({ imageColor: item?.image?.color, isOutOfStock, styleTheme });
    const router = useRouter();
    const restaurantId = router.query?.restaurantId as string;
    const { addToPlate } = usePlate();

    const [reaction, setReaction] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setReaction(localStorage.getItem(`menuease_reaction_${item.id}`));
        }
    }, [item.id]);

    const { mutate: updateLikes } = api.menuItem.updateLikes.useMutation();

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

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

        updateLikes({ dislikesDelta, id: item.id, likesDelta });
        setReaction(newReaction);
        if (typeof window !== "undefined") {
            if (newReaction) {
                localStorage.setItem(`menuease_reaction_${item.id}`, newReaction);
            } else {
                localStorage.removeItem(`menuease_reaction_${item.id}`);
            }
        }
    };

    const handleDislike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

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

        updateLikes({ dislikesDelta, id: item.id, likesDelta });
        setReaction(newReaction);
        if (typeof window !== "undefined") {
            if (newReaction) {
                localStorage.setItem(`menuease_reaction_${item.id}`, newReaction);
            } else {
                localStorage.removeItem(`menuease_reaction_${item.id}`);
            }
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isOutOfStock) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const itemUrl = `/restaurant/${restaurantId}/item/${item.id}`;

    const isGourmet = styleTheme === "GOURMET";
    const isSimple = styleTheme === "SIMPLE";

    return (
        <Link
            href={isOutOfStock ? "#" : itemUrl}
            passHref
            style={{ color: "inherit", display: "block", textDecoration: isOutOfStock ? "none" : undefined, cursor: isOutOfStock ? "not-allowed" : "pointer" }}
        >
            <Paper className={classes.cardItem} data-testid="menu-item-card" h={isSimple ? 75 : 150} onClick={handleClick}>
                {item?.image?.path && (
                    <Box className={classes.cardImageWrap}>
                        <Box className={classes.cardImage}>
                            <ImageKitImage
                                blurhash={item?.image?.blurHash}
                                color={item?.image?.color}
                                height={isSimple ? 45 : 150}
                                imageAlt={item.name}
                                imagePath={item?.image?.path}
                                width={isSimple ? 45 : 150}
                            />
                        </Box>
                    </Box>
                )}

                <Stack className={classes.cardDescWrap} spacing={isSimple ? 1 : 4}>
                    <Group align="center" noWrap position="apart" style={{ width: "100%" }}>
                        <Text
                            className={cx(classes.cardText, classes.cardItemTitle)}
                            size={isSimple ? "sm" : "lg"}
                            sx={{ 
                                flex: 1,
                                fontFamily: isGourmet ? "'Playfair Display', Georgia, serif" : undefined,
                                fontStyle: isGourmet ? "italic" : undefined,
                                fontWeight: isGourmet ? 800 : 700
                            }}
                            weight={isGourmet ? 800 : 700}
                        >
                            {item.name}
                        </Text>
                        {isOutOfStock && (
                            <Badge color="gray" size="xs" sx={{ minWidth: "fit-content" }} variant="filled">
                                Out of Stock
                            </Badge>
                        )}
                        {item.isVeg === true && (
                            <Badge color="green" size="xs" sx={{ minWidth: "fit-content" }} variant="light">
                                Veg
                            </Badge>
                        )}
                        {item.isVeg === false && (
                            <Badge color="red" size="xs" sx={{ minWidth: "fit-content" }} variant="light">
                                Non-Veg
                            </Badge>
                        )}
                    </Group>
                    <Group align="center" mt={isSimple ? 0 : 2} noWrap position="apart" style={{ width: "100%" }}>
                        <Group spacing="xs">
                            <Text color={isGourmet ? "#d4af37" : "red"} size={isSimple ? "xs" : "sm"} weight={600}>
                                {item.price}
                            </Text>
                            {!isSimple && (
                                <Group spacing={6}>
                                    <Group spacing={2}>
                                        <ActionIcon
                                            disabled={isOutOfStock}
                                            size="xs"
                                            variant={reaction === "like" ? "filled" : "subtle"}
                                            color={reaction === "like" ? "blue" : "gray"}
                                            onClick={handleLike}
                                            sx={{
                                                backgroundColor: reaction === "like" ? "rgba(34, 139, 230, 0.15) !important" : "transparent",
                                                color: reaction === "like" ? "#228be6 !important" : "gray",
                                            }}
                                        >
                                            <ThumbsUpIcon size={12} />
                                        </ActionIcon>
                                        <Text size="xs" color="dimmed">{item.likes || 0}</Text>
                                    </Group>
                                    <Group spacing={2}>
                                        <ActionIcon
                                            disabled={isOutOfStock}
                                            size="xs"
                                            variant={reaction === "dislike" ? "filled" : "subtle"}
                                            color={reaction === "dislike" ? "red" : "gray"}
                                            onClick={handleDislike}
                                            sx={{
                                                backgroundColor: reaction === "dislike" ? "rgba(250, 82, 82, 0.15) !important" : "transparent",
                                                color: reaction === "dislike" ? "#fa5252 !important" : "gray",
                                            }}
                                        >
                                            <ThumbsDownIcon size={12} />
                                        </ActionIcon>
                                        <Text size="xs" color="dimmed">{item.dislikes || 0}</Text>
                                    </Group>
                                </Group>
                            )}
                        </Group>
                        {isOrderFeatureEnabled && (
                            <Button
                                color={isOutOfStock ? "gray" : "primary"}
                                disabled={isOutOfStock}
                                onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (isOutOfStock) return;
                                    const hasCustomizations = !!(item.sizes || item.variants || item.addons);
                                    if (hasCustomizations) {
                                        router.push(itemUrl);
                                        return;
                                    }
                                    addToPlate({
                                        id: item.id,
                                        isVeg: item.isVeg,
                                        name: item.name,
                                        price: item.price,
                                    });
                                }}
                                radius="md"
                                size="xs"
                                sx={{ fontSize: 10, height: 22, paddingLeft: 8, paddingRight: 8 }}
                                variant="light"
                            >
                                {isOutOfStock ? "Sold Out" : "Add +"}
                            </Button>
                        )}
                    </Group>
                    {!isSimple && (
                        <Text 
                            className={cx(classes.cardText, classes.cardItemDesc)} 
                            opacity={0.7} 
                            size="xs"
                            sx={{ fontStyle: isGourmet ? "italic" : undefined }}
                        >
                            {item.description}
                        </Text>
                    )}
                </Stack>
            </Paper>
        </Link>
    );
};
