import type { FC } from "react";
import { useMemo, useState, useEffect } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
    ActionIcon,
    Box,
    createStyles,
    Flex,
    MediaQuery,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Drawer,
    Button,
    Textarea,
    TextInput,
    Divider,
    Group,
    Badge,
    Paper,
    Title,
} from "@mantine/core";
import { IconMapPin, IconPhone, IconBrandWhatsapp, IconTrash, IconShoppingCart, IconQrcode } from "@tabler/icons";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { usePlate, parsePrice, formatPrice } from "src/utils/plateContext";
import { api } from "src/utils/api";

const BannerCarousel = dynamic(() => import("./BannerCarousel").then((mod) => mod.BannerCarousel), {
    ssr: false,
});

import type { Category, Image, Menu, MenuItem, Restaurant } from "@prisma/client";

import { Black, White } from "src/styles/theme";

import { MenuItemCard } from "./MenuItemCard";
import { Empty } from "../Empty";
import { ImageKitImage } from "../ImageKitImage";

const useStyles = createStyles((theme) => ({
    carousalOverlay: {
        backgroundImage: theme.fn.linearGradient(
            180,
            theme.fn.rgba(Black, 0),
            theme.fn.rgba(Black, 0.01),
            theme.fn.rgba(Black, 0.025),
            theme.fn.rgba(Black, 0.05),
            theme.fn.rgba(Black, 0.1),
            theme.fn.rgba(Black, 0.2),
            theme.fn.rgba(Black, 0.35),
            theme.fn.rgba(Black, 0.5)
        ),
        bottom: 0,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 1,
    },
    carousalSubWrap: {
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        opacity: 0.8,
    },
    carousalTitle: {
        bottom: 0,
        color: White,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: theme.spacing.md,
        paddingTop: theme.spacing.xl,
        position: "absolute",
        textShadow: `0px 0px 3px ${Black}`,
        width: "100%",
        zIndex: 1,
    },
    carousalTitleSubText: {
        flex: 1,
        fontSize: 22,
        [`@media (max-width: ${theme.breakpoints.lg}px)`]: { fontSize: 18 },
        [`@media (max-width: ${theme.breakpoints.sm}px)`]: { fontSize: 14 },
    },
    carousalTitleText: {
        fontSize: 40,
        fontWeight: "bold",
        [`@media (max-width: ${theme.breakpoints.lg}px)`]: { fontSize: 30 },
        [`@media (max-width: ${theme.breakpoints.sm}px)`]: { fontSize: 24 },
    },
    darkFontColor: { color: theme.colors.dark[7] },
    headerImageBox: {
        aspectRatio: "3",
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        position: "relative",
        [theme.fn.smallerThan("md")]: { aspectRatio: "2.5" },
        [theme.fn.smallerThan("sm")]: { aspectRatio: "2" },
    },
    mobileTitleWrap: { color: theme.black, gap: 8, marginTop: theme.spacing.lg },
    switchThumb: { background: theme.fn.lighten(Black, 0.2) },
    switchTrack: { background: `${theme.fn.darken(White, 0.1)} !important`, border: "unset" },
    themeSwitch: {
        "&:hover": { backgroundColor: theme.white, opacity: 1 },
        backgroundColor: theme.white,
        boxShadow: theme.shadows.md,
        color: theme.black,
        opacity: 0.8,
        position: "absolute",
        right: 12,
        top: 10,
        transition: "all 500ms ease",
        zIndex: 1,
    },
}));

interface Props {
    restaurant: Restaurant & {
        banners: Image[];
        image: Image | null;
        menus: (Menu & { categories: (Category & { items: (MenuItem & { image: Image | null })[] })[] })[];
    };
}

/** Component to display all the menus and banners of the restaurant */
export const RestaurantMenu: FC<Props> = ({ restaurant }) => {
    const { classes, theme } = useStyles();
    const [menuParent] = useAutoAnimate<HTMLDivElement>();
    const [selectedMenu, setSelectedMenu] = useState<string | null | undefined>(restaurant?.menus?.[0]?.id);
    const t = useTranslations("menu");

    const {
        activeRestaurantId,
        setActiveRestaurantId,
        plateItems,
        removeFromPlate,
        updateQuantity,
        updateNotes,
        getPlateTotal,
        getPlateCount,
        table,
        floor,
    } = usePlate();

    const [drawerOpened, setDrawerOpened] = useState(false);
    const [generalNotes, setGeneralNotes] = useState("");
    const { mutate: createOrder } = api.order.create.useMutation();

    useEffect(() => {
        if (restaurant.id && activeRestaurantId !== restaurant.id) {
            setActiveRestaurantId(restaurant.id);
        }
    }, [restaurant.id, activeRestaurantId, setActiveRestaurantId]);

    const generateWhatsappMessage = () => {
        let msg = `*🍽️ New Order from Plate!*\n`;
        msg += `----------------------------------\n`;
        msg += `*Restaurant:* ${restaurant.name}\n`;
        msg += `----------------------------------\n`;
        if (table || floor) {
            msg += `*Seating Location:*\n`;
            if (table) msg += `• Table Number: ${table}\n`;
            if (floor) msg += `• Floor/Section: ${floor}\n`;
            msg += `----------------------------------\n`;
        }
        msg += `*Order Details:*\n`;
        
        plateItems.forEach((item) => {
            const { number, currency } = parsePrice(item.price);
            const subtotal = number * item.quantity;
            msg += `• ${item.quantity} x ${item.name} (${formatPrice(number, currency)})\n`;
            if (item.notes) {
                msg += `  _- Note: ${item.notes}_\n`;
            }
            msg += `  - Subtotal: ${formatPrice(subtotal, currency)}\n`;
        });
        
        msg += `----------------------------------\n`;
        msg += `*Total Items:* ${getPlateCount()}\n`;
        msg += `*Total Price:* ${getPlateTotal()}\n`;
        msg += `----------------------------------\n`;
        
        if (generalNotes.trim()) {
            msg += `*Special Instructions / Address:*\n${generalNotes.trim()}\n`;
            msg += `----------------------------------\n`;
        }
        
        msg += `Thank you!`;
        return encodeURIComponent(msg);
    };

    const menuDetails = useMemo(
        () => restaurant?.menus?.find((item) => item.id === selectedMenu),
        [selectedMenu, restaurant?.menus]
    );

    const images: Image[] = useMemo(() => {
        const banners = restaurant?.banners;
        if (restaurant?.image) {
            return [restaurant?.image, ...banners];
        }
        return banners;
    }, [restaurant]);

    const haveMenuItems = menuDetails?.categories?.some((category) => category?.items?.length > 0);

    return (
        <Box mih="calc(100vh - 100px)">
            <Box pos="relative">
                {images.length > 1 ? (
                    <BannerCarousel images={images} restaurantName={restaurant.name} />
                ) : images.length === 1 ? (
                    <Box className={classes.headerImageBox}>
                        <ImageKitImage
                            blurhash={images[0]?.blurHash}
                            color={images[0]?.color}
                            height={400}
                            imageAlt={`${restaurant.name}-banner`}
                            imagePath={images[0]?.path}
                            width={1000}
                            priority={true}
                        />
                        <Box className={classes.carousalOverlay} />
                    </Box>
                ) : null}
                <MediaQuery smallerThan="xs" styles={{ display: "none" }}>
                    <Box className={classes.carousalTitle}>
                        <Text className={classes.carousalTitleText}>{restaurant?.name}</Text>
                        <Box className={classes.carousalSubWrap}>
                            <Flex align="center" gap={10}>
                                <IconMapPin />
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        restaurant?.location
                                    )}`}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <Text className={classes.carousalTitleSubText}>{restaurant?.location}</Text>
                                </a>
                            </Flex>
                            {restaurant?.contactNo && (
                                <Flex align="center" gap={10}>
                                    <IconPhone />
                                    <a href={`tel:${restaurant?.contactNo.replace(/\s/g, "")}`}>
                                        <Text className={classes.carousalTitleSubText}>{restaurant?.contactNo}</Text>
                                    </a>
                                </Flex>
                            )}
                        </Box>
                    </Box>
                </MediaQuery>
            </Box>

            <MediaQuery largerThan="xs" styles={{ display: "none" }}>
                <Stack className={classes.mobileTitleWrap}>
                    <Text className={classes.carousalTitleText}>{restaurant?.name}</Text>
                    <Flex align="center" gap={10} opacity={0.6}>
                        <IconMapPin />
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                restaurant?.location
                            )}`}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <Text className={classes.carousalTitleSubText}>{restaurant?.location}</Text>
                        </a>
                    </Flex>
                    {restaurant?.contactNo && (
                        <Flex align="center" gap={10} opacity={0.6}>
                            <IconPhone />
                            <a href={`tel:${restaurant?.contactNo.replace(/\s/g, "")}`}>
                                <Text className={classes.carousalTitleSubText}>{restaurant?.contactNo}</Text>
                            </a>
                        </Flex>
                    )}
                </Stack>
            </MediaQuery>
            <Tabs my={40} onTabChange={setSelectedMenu} value={selectedMenu}>
                <Tabs.List>
                    {restaurant?.menus?.map((menu) => (
                        <Tabs.Tab key={menu.id} px="lg" value={menu.id}>
                            <Text color={theme.black} size="lg" weight={selectedMenu === menu.id ? "bold" : "normal"}>
                                {menu.name}
                            </Text>
                            <Text color={theme.colors.dark[8]} opacity={selectedMenu === menu.id ? 1 : 0.5} size="xs">
                                {menu.availableTime}
                            </Text>
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
            </Tabs>
            <Box ref={menuParent}>
                {menuDetails?.categories
                    ?.filter((category) => category?.items.length)
                    ?.map((category) => (
                        <Box key={category.id}>
                            <Text my="lg" size="lg" weight={600}>
                                {category.name}
                            </Text>
                            <SimpleGrid
                                breakpoints={[
                                    { cols: 3, minWidth: "lg" },
                                    { cols: 2, minWidth: "sm" },
                                    { cols: 1, minWidth: "xs" },
                                ]}
                                mb={30}
                            >
                                {category.items?.map((item) => (
                                    <MenuItemCard key={item.id} item={item} isOrderFeatureEnabled={(restaurant as any).isOrderFeatureEnabled} />
                                ))}
                            </SimpleGrid>
                        </Box>
                    ))}
                {restaurant?.menus?.length === 0 && !haveMenuItems && (
                    <Empty height={400} text={t("noMenusForRestaurant")} />
                )}
                {!!restaurant?.menus?.length && !haveMenuItems && <Empty height={400} text={t("noItemsForMenu")} />}
            </Box>

            {/* Floating 'View Plate' button */}
            {(restaurant as any).isOrderFeatureEnabled && getPlateCount() > 0 && (
                <Box
                    sx={{
                        position: "fixed",
                        bottom: 30,
                        right: 30,
                        zIndex: 99,
                        '@media (max-width: 768px)': {
                            left: 20,
                            right: 20,
                            bottom: 20,
                        }
                    }}
                >
                    <Button
                        size="lg"
                        color="primary"
                        radius="xl"
                        fullWidth
                        leftIcon={<IconShoppingCart size={20} />}
                        onClick={() => setDrawerOpened(true)}
                        styles={(theme) => ({
                            root: {
                                height: 50,
                                boxShadow: '0 8px 32px ' + theme.fn.rgba(theme.colors.primary[6], 0.3),
                                backdropFilter: 'blur(4px)',
                                transition: 'transform 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.03)',
                                }
                            }
                        })}
                    >
                        <Group spacing="xs" noWrap>
                            <Text size="md" weight={700}>View Plate</Text>
                            <Badge color="red" variant="filled" size="sm" radius="xl" sx={{ height: 20, minWidth: 20, padding: 0 }}>
                                {getPlateCount()}
                            </Badge>
                            <Divider orientation="vertical" color="primary.4" />
                            <Text size="md" weight={700}>{getPlateTotal()}</Text>
                        </Group>
                    </Button>
                </Box>
            )}

            {/* Cart Drawer */}
            <Drawer
                opened={drawerOpened}
                onClose={() => setDrawerOpened(false)}
                title={
                    <Group spacing="xs">
                        <IconShoppingCart size={20} color={theme.colors.primary[6]} />
                        <Title order={3} size="1.4rem" color="dark.8">Your Plate</Title>
                    </Group>
                }
                padding="md"
                size="md"
                position="right"
                styles={{
                    drawer: {
                        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
                    }
                }}
            >
                {plateItems.length === 0 ? (
                    <Stack align="center" justify="center" h="75%" spacing="sm">
                        <IconShoppingCart size={60} stroke={1} color={theme.colors.gray[4]} />
                        <Text size="lg" weight={600} color="dimmed">Your plate is empty</Text>
                        <Text size="sm" color="dimmed" align="center">Add some delicious dishes from the menu to get started!</Text>
                    </Stack>
                ) : (
                    <Flex direction="column" justify="space-between" h="calc(100vh - 100px)">
                        <Box sx={{ flex: 1, overflowY: "auto" }} pb="md">
                            <Stack spacing="md">
                                {(table || floor) && (
                                    <Paper
                                        p="sm"
                                        bg={theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.primary[0]}
                                        sx={{
                                            border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.primary[1]}`,
                                            borderRadius: theme.radius.md
                                        }}
                                    >
                                        <Group spacing="xs" noWrap>
                                            <IconQrcode size={18} color={theme.colors.primary[6]} />
                                            <Box>
                                                <Text size="xs" color={theme.colorScheme === 'dark' ? "primary.3" : "primary.9"} weight={700}>
                                                    SEATING LOCATION
                                                </Text>
                                                <Text size="sm" color={theme.colorScheme === 'dark' ? "primary.2" : "primary.7"} weight={600}>
                                                    {table ? `Table: ${table}` : ""}
                                                    {table && floor ? " • " : ""}
                                                    {floor ? `Floor/Section: ${floor}` : ""}
                                                </Text>
                                            </Box>
                                        </Group>
                                    </Paper>
                                )}
                                {plateItems.map((item) => {
                                    const { number, currency } = parsePrice(item.price);
                                    const subtotal = number * item.quantity;
                                    return (
                                        <Paper key={item.id} p="sm" withBorder radius="md">
                                            <Flex align="flex-start" justify="space-between">
                                                <Stack spacing={2} sx={{ flex: 1 }}>
                                                    <Group spacing="xs" align="center">
                                                        <Text weight={600} size="sm" color="dark.8">{item.name}</Text>
                                                        {item.isVeg === true && (
                                                            <Badge color="green" variant="light" size="xs">Veg</Badge>
                                                        )}
                                                        {item.isVeg === false && (
                                                            <Badge color="red" variant="light" size="xs">Non-Veg</Badge>
                                                        )}
                                                    </Group>
                                                    <Text color="dimmed" size="xs">{item.price}</Text>
                                                    <Text weight={600} size="xs" color="primary.6" mt={2}>
                                                        Subtotal: {formatPrice(subtotal, currency)}
                                                    </Text>
                                                </Stack>
                                                
                                                <Stack align="flex-end" spacing="xs">
                                                    <Group spacing={4} sx={{ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.md, padding: '2px 4px' }}>
                                                        <ActionIcon size="xs" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                            -
                                                        </ActionIcon>
                                                        <Text size="xs" weight={600} sx={{ width: 16, textAlign: 'center', color: theme.black }}>
                                                            {item.quantity}
                                                        </Text>
                                                        <ActionIcon size="xs" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                            +
                                                        </ActionIcon>
                                                    </Group>
                                                    
                                                    <ActionIcon color="red" variant="subtle" size="xs" onClick={() => removeFromPlate(item.id)}>
                                                        <IconTrash size={14} />
                                                    </ActionIcon>
                                                </Stack>
                                            </Flex>
                                            
                                            <TextInput
                                                placeholder="Add notes (e.g. spicy, extra sauce)"
                                                size="xs"
                                                mt="xs"
                                                variant="filled"
                                                value={item.notes || ""}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotes(item.id, e.target.value)}
                                            />
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        </Box>
                        
                        <Box pt="md" sx={{ borderTop: `1px solid ${theme.colors.gray[2]}` }}>
                            <Stack spacing="xs">
                                <Textarea
                                    label="General Instructions / Delivery Address"
                                    placeholder="Enter your name, phone, table number, or delivery address..."
                                    minRows={2}
                                    value={generalNotes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGeneralNotes(e.target.value)}
                                    size="sm"
                                />
                                
                                <Group position="apart" my="xs">
                                    <Text weight={700} size="lg">Total:</Text>
                                    <Text weight={700} size="lg" color="red.6">{getPlateTotal()}</Text>
                                </Group>
                                
                                <Button
                                    size="md"
                                    color="green"
                                    leftIcon={<IconBrandWhatsapp size={20} />}
                                    fullWidth
                                    onClick={() => {
                                        if ((restaurant as any).isKitchenEnabled) {
                                            createOrder({
                                                restaurantId: restaurant.id,
                                                table: table,
                                                floor: floor,
                                                items: JSON.stringify(plateItems.map(item => ({
                                                    id: item.id,
                                                    name: item.name,
                                                    price: item.price,
                                                    quantity: item.quantity,
                                                    notes: item.notes || ""
                                                }))),
                                                generalNotes: generalNotes,
                                            });
                                        }

                                        const rawPhone = (restaurant as any).whatsappNo || restaurant.contactNo || "";
                                        const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
                                        const waUrl = `https://wa.me/${cleanPhone}?text=${generateWhatsappMessage()}`;
                                        window.open(waUrl, "_blank");
                                    }}
                                >
                                    Order via WhatsApp
                                </Button>
                            </Stack>
                        </Box>
                    </Flex>
                )}
            </Drawer>
        </Box>
    );
};
