import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    createStyles,
    Divider,
    Drawer,
    Flex,
    Group,
    MediaQuery,
    Modal,
    Paper,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core";
import { IconBell, IconBrandWhatsapp } from "@tabler/icons";
import {
    CheckIcon,
    MapPinIcon,
    PhoneIcon,
    QrCodeIcon,
    ShoppingCartIcon,
    TrashIcon,
} from "@animateicons/react/lucide";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import type { Category, Image, Menu, MenuItem, Restaurant } from "@prisma/client";

import { Black, White } from "src/styles/theme";
import { api } from "src/utils/api";
import { formatPrice, parsePrice, usePlate } from "src/utils/plateContext";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

import { MenuItemCard } from "./MenuItemCard";
import { Empty } from "../Empty";
import { ImageKitImage } from "../ImageKitImage";

const BannerCarousel = dynamic(() => import("./BannerCarousel").then((mod) => mod.BannerCarousel), {
    ssr: false,
});

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
        clearPlate,
    } = usePlate();

    const [drawerOpened, setDrawerOpened] = useState(false);
    const [generalNotes, setGeneralNotes] = useState("");
    const [waiterModalOpened, setWaiterModalOpened] = useState(false);

    const { mutate: callWaiter, isLoading: callingWaiter } = api.waiterCall.create.useMutation({
        onSuccess: () => {
            showSuccessToast("Request Sent", "A waiter has been alerted and will arrive shortly!");
            setWaiterModalOpened(false);
        },
        onError: (err: any) => {
            showErrorToast("Failed to call waiter", err);
        }
    });

    const handleCallWaiter = (type: string) => {
        callWaiter({
            restaurantId: restaurant.id,
            table: table || "General",
            requestType: type,
        });
    };

    const { mutate: createOrder, isLoading: isLoadingOrderCreation } = api.order.create.useMutation({
        onSuccess: () => {
            showSuccessToast("Order sent to kitchen successfully!");
            clearPlate();
            setDrawerOpened(false);
            setGeneralNotes("");
        },
        onError: () => {
            showErrorToast("Failed to send order to kitchen. Please try again.");
        }
    });

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

    const isHappyHourActive = useMemo(() => {
        const start = (restaurant as any)?.happyHourStart;
        const end = (restaurant as any)?.happyHourEnd;
        const discount = (restaurant as any)?.happyHourDiscount;
        if (!start || !end || !discount) return false;

        try {
            const now = new Date();
            const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            return currentTimeStr >= start && currentTimeStr <= end;
        } catch (e) {
            return false;
        }
    }, [restaurant]);

    const getAdjustedPrice = (originalPrice: string) => {
        if (!isHappyHourActive) return originalPrice;
        const discount = (restaurant as any)?.happyHourDiscount || 0;
        const { number, currency } = parsePrice(originalPrice);
        const discountedAmount = number * (1 - discount / 100);
        return formatPrice(discountedAmount, currency || (restaurant as any)?.currency || "₹");
    };

    const menuDetails = useMemo(() => {
        const rawMenu = restaurant?.menus?.find((item) => item.id === selectedMenu);
        if (!rawMenu) return null;
        if (!isHappyHourActive) return rawMenu;

        return {
            ...rawMenu,
            categories: rawMenu.categories?.map((cat) => ({
                ...cat,
                items: cat.items?.map((item) => ({
                    ...item,
                    price: getAdjustedPrice(item.price),
                })),
            })),
        };
    }, [selectedMenu, restaurant?.menus, isHappyHourActive]);

    const dailySpecials = useMemo(() => {
        const list: any[] = [];
        if (menuDetails?.categories) {
            menuDetails.categories.forEach((cat) => {
                if (cat.items) {
                    cat.items.forEach((item) => {
                        if ((item as any).isTodaySpecial) {
                            list.push(item);
                        }
                    });
                }
            });
        }
        return list;
    }, [menuDetails]);

    const images: Image[] = useMemo(() => {
        const banners = restaurant?.banners;
        if (restaurant?.image) {
            return [restaurant?.image, ...banners];
        }
        return banners;
    }, [restaurant]);

    const renderFestivalBanner = () => {
        const themeType = (restaurant as any)?.festivalTheme;
        if (!themeType || themeType === "NONE") return null;

        let bgGradient = "";
        let titleText = "";
        let subtitleText = "";
        let emoji = "";

        if (themeType === "EID") {
            bgGradient = "linear-gradient(135deg, #0f2027, #203a43, #2c5364)";
            titleText = "Eid Mubarak! 🌙";
            subtitleText = "Celebrate the joy of Eid with our special festive dishes!";
            emoji = "✨";
        } else if (themeType === "ONAM") {
            bgGradient = "linear-gradient(135deg, #ff9933, #ffffff, #138808)";
            titleText = "Happy Onam! 🌾";
            subtitleText = "Feast on our authentic traditional Onasadya specials today!";
            emoji = "🌸";
        } else if (themeType === "CHRISTMAS") {
            bgGradient = "linear-gradient(135deg, #c0392b, #8e44ad, #2c3e50)";
            titleText = "Merry Christmas! 🎄";
            subtitleText = "Unwrap delicious holiday deals and seasonal delicacies!";
            emoji = "❄️";
        } else if (themeType === "RAMADAN") {
            bgGradient = "linear-gradient(135deg, #1f4037, #99f2c8)";
            titleText = "Ramadan Kareem! 🕌";
            subtitleText = "Break your fast with our delicious Iftar meals & drinks!";
            emoji = "✨";
        }

        return (
            <Paper
                p="xl"
                mb="lg"
                radius="lg"
                sx={{
                    background: bgGradient,
                    color: "#ffffff",
                    textAlign: "center",
                    boxShadow: theme.shadows.md,
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                <Text sx={{ fontSize: "2rem" }} weight={800} style={{ fontFamily: "Outfit, sans-serif" }}>
                    {emoji} {titleText}
                </Text>
                <Text size="sm" mt="xs" weight={500} opacity={0.9}>
                    {subtitleText}
                </Text>
            </Paper>
        );
    };

    const haveMenuItems = menuDetails?.categories?.some((category) => category?.items?.length > 0);

    const menuContent = (
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
                            priority
                            width={1000}
                        />
                        <Box className={classes.carousalOverlay} />
                    </Box>
                ) : null}
                <MediaQuery smallerThan="xs" styles={{ display: "none" }}>
                    <Box className={classes.carousalTitle}>
                        <Group align="center" mb="xs" spacing="md">
                            {(restaurant as any).logoUrl && (
                                <Avatar
                                    alt={`${restaurant.name} logo`}
                                    radius="xl"
                                    size="lg"
                                    src={(restaurant as any).logoUrl}
                                    styles={{ root: { border: `2px solid ${White}`, boxShadow: theme.shadows.md } }}
                                />
                            )}
                            <Text className={classes.carousalTitleText}>{restaurant?.name}</Text>
                        </Group>
                        <Box className={classes.carousalSubWrap}>
                            <Flex align="center" gap={10}>
                                <MapPinIcon size={16} />
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
                                    <PhoneIcon size={16} />
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
                    <Group align="center" spacing="sm">
                        {(restaurant as any).logoUrl && (
                            <Avatar
                                alt={`${restaurant.name} logo`}
                                radius="xl"
                                size="md"
                                src={(restaurant as any).logoUrl}
                                styles={{ root: { border: `1px solid ${theme.colors.gray[3]}` } }}
                            />
                        )}
                        <Text className={classes.carousalTitleText}>{restaurant?.name}</Text>
                    </Group>
                    <Flex align="center" gap={10} opacity={0.6}>
                        <MapPinIcon size={16} />
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
                            <PhoneIcon size={16} />
                            <a href={`tel:${restaurant?.contactNo.replace(/\s/g, "")}`}>
                                <Text className={classes.carousalTitleSubText}>{restaurant?.contactNo}</Text>
                            </a>
                        </Flex>
                    )}
                </Stack>
            </MediaQuery>
            {renderFestivalBanner()}

            {isHappyHourActive && (
                <Paper
                    p="xs"
                    my="md"
                    radius="md"
                    bg="yellow.1"
                    sx={{
                        border: `1px dashed ${theme.colors.yellow[6]}`,
                        color: theme.colors.yellow[9],
                        textAlign: "center",
                    }}
                >
                    <Text size="sm" weight={700}>
                        ⚡ HAPPY HOUR ACTIVE: {(restaurant as any).happyHourDiscount}% OFF all items! (Runs {(restaurant as any).happyHourStart} - {(restaurant as any).happyHourEnd})
                    </Text>
                </Paper>
            )}

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
                {dailySpecials.length > 0 && (
                    <Box mb="xl">
                        <Group position="apart" mb="sm">
                            <Text size="lg" weight={700} color="orange.8">
                                🔥 Today's Specials
                            </Text>
                            <Badge color="orange" variant="filled">Chef Recommended</Badge>
                        </Group>
                        <SimpleGrid
                            breakpoints={[
                                { cols: 3, minWidth: "lg" },
                                { cols: 2, minWidth: "sm" },
                                { cols: 1, minWidth: "xs" },
                            ]}
                            mb={20}
                        >
                            {dailySpecials.map((item) => (
                                <MenuItemCard
                                    key={`special-${item.id}`}
                                    isOrderFeatureEnabled={(restaurant as any).isOrderFeatureEnabled}
                                    item={item}
                                />
                            ))}
                        </SimpleGrid>
                        <Divider my="lg" variant="dashed" />
                    </Box>
                )}

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
                                    <MenuItemCard
                                        key={item.id}
                                        isOrderFeatureEnabled={(restaurant as any).isOrderFeatureEnabled}
                                        item={item}
                                    />
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
            {(restaurant as any).isOrderFeatureEnabled && (
                <Box
                    sx={{
                        "@media (max-width: 768px)": {
                            bottom: 20,
                            left: 20,
                            right: 20,
                        },
                        bottom: 30,
                        position: "fixed",
                        right: 30,
                        zIndex: 99,
                    }}
                >
                    <Button
                        color="primary"
                        fullWidth
                        leftIcon={<ShoppingCartIcon size={20} />}
                        onClick={() => setDrawerOpened(true)}
                        radius="xl"
                        size="lg"
                        styles={(theme) => ({
                            root: {
                                "&:hover": {
                                    transform: "scale(1.03)",
                                },
                                backdropFilter: "blur(4px)",
                                boxShadow: `0 8px 32px ${theme.fn.rgba(theme.colors.primary[6], 0.3)}`,
                                height: 50,
                                transition: "transform 0.2s ease",
                            },
                        })}
                    >
                        <Group noWrap spacing="xs">
                            <Text size="md" weight={700}>
                                View Plate
                            </Text>
                            <Badge
                                color="red"
                                radius="xl"
                                size="sm"
                                sx={{ height: 20, minWidth: 20, padding: 0 }}
                                variant="filled"
                            >
                                {getPlateCount()}
                            </Badge>
                            <Divider color="primary.4" orientation="vertical" />
                            <Text size="md" weight={700}>
                                {getPlateTotal()}
                            </Text>
                        </Group>
                    </Button>
                </Box>
            )}

            {/* Cart Drawer */}
            <Drawer
                onClose={() => setDrawerOpened(false)}
                opened={drawerOpened}
                padding="md"
                position="right"
                size="md"
                styles={{
                    drawer: {
                        backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
                    },
                }}
                title={
                    <Group spacing="xs">
                        <ShoppingCartIcon color={theme.colors.primary[6]} size={20} />
                        <Title color="dark.8" order={3} size="1.4rem">
                            Your Plate
                        </Title>
                    </Group>
                }
            >
                {plateItems.length === 0 ? (
                    <Stack align="center" h="75%" justify="center" spacing="sm">
                        <ShoppingCartIcon color={theme.colors.gray[4]} size={60} />
                        <Text color="dimmed" size="lg" weight={600}>
                            Your plate is empty
                        </Text>
                        <Text align="center" color="dimmed" size="sm">
                            Add some delicious dishes from the menu to get started!
                        </Text>
                    </Stack>
                ) : (
                    <Flex direction="column" h="calc(100vh - 100px)" justify="space-between">
                        <Box pb="md" sx={{ flex: 1, overflowY: "auto" }}>
                            <Stack spacing="md">
                                {(table || floor) && (
                                    <Paper
                                        bg={
                                            theme.colorScheme === "dark"
                                                ? theme.colors.dark[6]
                                                : theme.colors.primary[0]
                                        }
                                        p="sm"
                                        sx={{
                                            border: `1px solid ${
                                                theme.colorScheme === "dark"
                                                    ? theme.colors.dark[4]
                                                    : theme.colors.primary[1]
                                            }`,
                                            borderRadius: theme.radius.md,
                                        }}
                                    >
                                        <Group noWrap spacing="xs">
                                            <QrCodeIcon color={theme.colors.primary[6]} size={18} />
                                            <Box>
                                                <Text
                                                    color={theme.colorScheme === "dark" ? "primary.3" : "primary.9"}
                                                    size="xs"
                                                    weight={700}
                                                >
                                                    SEATING LOCATION
                                                </Text>
                                                <Text
                                                    color={theme.colorScheme === "dark" ? "primary.2" : "primary.7"}
                                                    size="sm"
                                                    weight={600}
                                                >
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
                                        <Paper key={item.id} p="sm" radius="md" withBorder>
                                            <Flex align="flex-start" justify="space-between">
                                                <Stack spacing={2} sx={{ flex: 1 }}>
                                                    <Group align="center" spacing="xs">
                                                        <Text color="dark.8" size="sm" weight={600}>
                                                            {item.name}
                                                        </Text>
                                                        {item.isVeg === true && (
                                                            <Badge color="green" size="xs" variant="light">
                                                                Veg
                                                            </Badge>
                                                        )}
                                                        {item.isVeg === false && (
                                                            <Badge color="red" size="xs" variant="light">
                                                                Non-Veg
                                                            </Badge>
                                                        )}
                                                    </Group>
                                                    <Text color="dimmed" size="xs">
                                                        {item.price}
                                                    </Text>
                                                    <Text color="primary.6" mt={2} size="xs" weight={600}>
                                                        Subtotal: {formatPrice(subtotal, currency)}
                                                    </Text>
                                                </Stack>

                                                <Stack align="flex-end" spacing="xs">
                                                    <Group
                                                        spacing={4}
                                                        sx={{
                                                            border: `1px solid ${theme.colors.gray[3]}`,
                                                            borderRadius: theme.radius.md,
                                                            padding: "2px 4px",
                                                        }}
                                                    >
                                                        <ActionIcon
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            size="xs"
                                                        >
                                                            -
                                                        </ActionIcon>
                                                        <Text
                                                            size="xs"
                                                            sx={{ color: theme.black, textAlign: "center", width: 16 }}
                                                            weight={600}
                                                        >
                                                            {item.quantity}
                                                        </Text>
                                                        <ActionIcon
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            size="xs"
                                                        >
                                                            +
                                                        </ActionIcon>
                                                    </Group>

                                                    <ActionIcon
                                                        color="red"
                                                        onClick={() => removeFromPlate(item.id)}
                                                        size="xs"
                                                        variant="subtle"
                                                    >
                                                        <TrashIcon size={14} />
                                                    </ActionIcon>
                                                </Stack>
                                            </Flex>

                                            <TextInput
                                                mt="xs"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    updateNotes(item.id, e.target.value)
                                                }
                                                placeholder="Add notes (e.g. spicy, extra sauce)"
                                                size="xs"
                                                value={item.notes || ""}
                                                variant="filled"
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
                                    minRows={2}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                        setGeneralNotes(e.target.value)
                                    }
                                    placeholder="Enter your name, phone, table number, or delivery address..."
                                    size="sm"
                                    value={generalNotes}
                                />

                                <Group my="xs" position="apart">
                                    <Text size="lg" weight={700}>
                                        Total:
                                    </Text>
                                    <Text color="red.6" size="lg" weight={700}>
                                        {getPlateTotal()}
                                    </Text>
                                </Group>

                                 {(restaurant as any).isKitchenEnabled ? (
                                    <Button
                                        color="primary"
                                        fullWidth
                                        loading={isLoadingOrderCreation}
                                        leftIcon={<CheckIcon size={20} />}
                                        onClick={() => {
                                            createOrder({
                                                floor,
                                                generalNotes,
                                                items: JSON.stringify(
                                                    plateItems.map((item) => ({
                                                        id: item.id,
                                                        name: item.name,
                                                        notes: item.notes || "",
                                                        price: item.price,
                                                        quantity: item.quantity,
                                                    }))
                                                ),
                                                restaurantId: restaurant.id,
                                                table,
                                            });
                                        }}
                                        size="md"
                                    >
                                        Place Order (Kitchen)
                                    </Button>
                                ) : (
                                    <Button
                                        color="green"
                                        fullWidth
                                        leftIcon={<IconBrandWhatsapp size={20} />}
                                        onClick={() => {
                                            const rawPhone = (restaurant as any).whatsappNo || restaurant.contactNo || "";
                                            const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
                                            const waUrl = `https://wa.me/${cleanPhone}?text=${generateWhatsappMessage()}`;
                                            window.open(waUrl, "_blank");
                                        }}
                                        size="md"
                                    >
                                        Order via WhatsApp
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                    </Flex>
                )}
            </Drawer>

            {/* Waiter Calling FAB */}
            {(restaurant as any).isOrderFeatureEnabled && (
                <Box
                    sx={{
                        bottom: 90,
                        position: "fixed",
                        right: 30,
                        zIndex: 99,
                        "@media (max-width: 768px)": {
                            bottom: 80,
                            right: 20,
                        },
                    }}
                >
                    <Button
                        color="orange"
                        radius="xl"
                        size="md"
                        leftIcon={<IconBell size={18} />}
                        onClick={() => setWaiterModalOpened(true)}
                        styles={(theme) => ({
                            root: {
                                backdropFilter: "blur(4px)",
                                boxShadow: `0 8px 32px ${theme.fn.rgba(theme.colors.orange[6], 0.35)}`,
                                height: 44,
                                transition: "transform 0.2s ease",
                                "&:hover": {
                                    transform: "scale(1.03)",
                                },
                            },
                        })}
                    >
                        Call Waiter
                    </Button>
                </Box>
            )}

            {/* Waiter Call Modal */}
            <Modal
                onClose={() => setWaiterModalOpened(false)}
                opened={waiterModalOpened}
                title={
                    <Group spacing="xs">
                        <IconBell color={theme.colors.orange[6]} size={20} />
                        <Title color="dark.8" order={3} size="1.2rem">
                            Call Table Assistant
                        </Title>
                    </Group>
                }
                centered
                radius="md"
                padding="md"
            >
                <Stack spacing="md">
                    <Text size="sm" color="dimmed">
                        {table ? `Table: ${table}` : "General area"} - Need assistance? Tap an option below to notify staff.
                    </Text>
                    <SimpleGrid cols={1} spacing="xs">
                        <Button
                            color="orange"
                            loading={callingWaiter}
                            onClick={() => handleCallWaiter("WATER")}
                            variant="light"
                        >
                            💧 Need Water
                        </Button>
                        <Button
                            color="orange"
                            loading={callingWaiter}
                            onClick={() => handleCallWaiter("BILL")}
                            variant="light"
                        >
                            🧾 Need Bill
                        </Button>
                        <Button
                            color="orange"
                            loading={callingWaiter}
                            onClick={() => handleCallWaiter("WAITER")}
                            variant="filled"
                        >
                            🔔 Need Waiter Assistance
                        </Button>
                    </SimpleGrid>
                </Stack>
            </Modal>
        </Box>
    );

    return menuContent;
};
