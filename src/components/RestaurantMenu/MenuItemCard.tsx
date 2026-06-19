import type { FC } from "react";
import { useMemo } from "react";

import { Box, createStyles, Paper, Stack, Text, Badge, Group, Button } from "@mantine/core";

import type { Image, MenuItem } from "@prisma/client";

import Link from "next/link";
import { useRouter } from "next/router";
import { ImageKitImage } from "../ImageKitImage";
import { usePlate } from "src/utils/plateContext";

export interface StyleProps {
    imageColor?: string;
}

const useStyles = createStyles((theme, { imageColor }: StyleProps, getRef) => {
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
        cardDescWrap: { flex: 1, gap: 0, overflow: "hidden", padding: theme.spacing.lg },
        cardImage: { height: 150, ref: image, transition: "transform 500ms ease", width: 150 },
        cardImageWrap: {
            borderRadius: theme.radius.lg,
            height: 150,
            overflow: "hidden",
            position: "relative",
            width: 150,
        },
        cardItem: {
            "&:hover": {
                backgroundColor:
                    theme.colorScheme === "light" ? theme.fn.darken(bgColor, 0.05) : theme.fn.lighten(bgColor, 0.05),
                boxShadow: theme.shadows.xs,
            },
            backgroundColor: bgColor,
            border: `1px solid ${theme.colors.dark[3]}`,
            color: theme.colors.dark[8],
            cursor: "pointer",
            display: "flex",
            overflow: "hidden",
            padding: "0 !important",
            transition: "all 500ms ease",
            [`&:hover .${image}`]: { transform: "scale(1.05)" },
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
}

/** Display each menu item as a card in the full restaurant menu */
export const MenuItemCard: FC<Props> = ({ item, isOrderFeatureEnabled }) => {
    const { classes, cx } = useStyles({ imageColor: item?.image?.color });
    const router = useRouter();
    const restaurantId = router.query?.restaurantId as string;
    const { addToPlate } = usePlate();

    const handleClick = () => {
        // Analytics are tracked on the item detail page when it loads
    };

    const itemUrl = `/restaurant/${restaurantId}/item/${item.id}`;

    return (
        <Link
            href={itemUrl}
            passHref
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
            <Paper
                className={classes.cardItem}
                data-testid="menu-item-card"
                h={150}
                onClick={handleClick}
            >
                {item?.image?.path && (
                    <Box className={classes.cardImageWrap}>
                        <Box className={classes.cardImage}>
                            <ImageKitImage
                                blurhash={item?.image?.blurHash}
                                color={item?.image?.color}
                                height={150}
                                imageAlt={item.name}
                                imagePath={item?.image?.path}
                                width={150}
                            />
                        </Box>
                    </Box>
                )}

                <Stack className={classes.cardDescWrap} spacing={4}>
                    <Group position="apart" align="center" noWrap style={{ width: '100%' }}>
                        <Text className={cx(classes.cardText, classes.cardItemTitle)} size="lg" weight={700} sx={{ flex: 1 }}>
                            {item.name}
                        </Text>
                        {item.isVeg === true && (
                            <Badge color="green" variant="light" size="xs" sx={{ minWidth: 'fit-content' }}>Veg</Badge>
                        )}
                        {item.isVeg === false && (
                            <Badge color="red" variant="light" size="xs" sx={{ minWidth: 'fit-content' }}>Non-Veg</Badge>
                        )}
                    </Group>
                    <Group position="apart" align="center" noWrap style={{ width: '100%' }} mt={2}>
                        <Text color="red" size="sm" weight={600}>
                            {item.price}
                        </Text>
                        {isOrderFeatureEnabled && (
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                radius="md"
                                onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addToPlate({
                                        id: item.id,
                                        name: item.name,
                                        price: item.price,
                                        isVeg: item.isVeg,
                                    });
                                }}
                                sx={{ height: 26, fontSize: 11, paddingLeft: 10, paddingRight: 10 }}
                            >
                                Add +
                            </Button>
                        )}
                    </Group>
                    <Text className={cx(classes.cardText, classes.cardItemDesc)} opacity={0.7} size="xs">
                        {item.description}
                    </Text>
                </Stack>
            </Paper>
        </Link>
    );
};
