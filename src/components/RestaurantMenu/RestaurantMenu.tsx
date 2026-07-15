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
    ScrollArea,
} from "@mantine/core";
import {
    IconBell,
    IconBrandWhatsapp,
    IconSearch,
    IconBrandInstagram,
    IconBrandFacebook,
    IconBrandTwitter,
    IconBrandYoutube,
    IconBrandTiktok,
    IconGift,
    IconTag,
} from "@tabler/icons";
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
import { isFeatureEnabled } from "src/utils/features";

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
        addToPlate,
    } = usePlate();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [drawerOpened, setDrawerOpened] = useState(false);
    const [generalNotes, setGeneralNotes] = useState("");
    const [waiterModalOpened, setWaiterModalOpened] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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

    // Fetch active offers/combos
    const { data: offers = [] } = api.offer.getByRestaurant.useQuery(
        { restaurantId: restaurant.id },
        { enabled: !!restaurant.id }
    );
    const isOffersEnabled = isFeatureEnabled(restaurant, "offers");
    const activeOffers = useMemo(() => {
        if (!mounted || !isOffersEnabled) return [];
        return offers.filter((o: any) => o.isAvailable && (!o.endsAt || new Date(o.endsAt) > new Date()));
    }, [offers, isOffersEnabled, mounted]);

    const handleAddComboToPlate = (offer: any) => {
        const comboItem = {
            id: `combo-${offer.id}`,
            name: `🔥 ${offer.title}`,
            price: offer.price || "₹0",
            isVeg: false
        };
        addToPlate(comboItem, 1);
        showSuccessToast("Combo Added to Plate!", `${offer.title} is now in your plate.`);
    };

    const isHappyHourActive = useMemo(() => {
        if (!mounted) return false;
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
    }, [restaurant, mounted]);

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

    const filteredMenuDetails = useMemo(() => {
        if (!menuDetails) return null;
        const isSearchEnabled = isFeatureEnabled(restaurant, "search");
        if (!searchQuery.trim() || !isSearchEnabled) return menuDetails;

        const q = searchQuery.toLowerCase();
        return {
            ...menuDetails,
            categories: menuDetails.categories?.map((cat) => ({
                ...cat,
                items: cat.items?.filter((item) => 
                    item.name.toLowerCase().includes(q) || 
                    item.description.toLowerCase().includes(q)
                ),
            })).filter((cat) => cat.items && cat.items.length > 0),
        };
    }, [menuDetails, searchQuery, restaurant]);

    const dailySpecials = useMemo(() => {
        const list: any[] = [];
        if (filteredMenuDetails?.categories) {
            filteredMenuDetails.categories.forEach((cat) => {
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
    }, [filteredMenuDetails]);

    const images: Image[] = useMemo(() => {
        const banners = restaurant?.banners;
        if (restaurant?.image) {
            return [restaurant?.image, ...banners];
        }
        return banners;
    }, [restaurant]);

    const renderFestivalBanner = () => {
        if (!isFeatureEnabled(restaurant, "themes")) return null;

        const themeType = (restaurant as any)?.festivalTheme;
        if (!themeType || themeType === "NONE") return null;

        let bgGradient = "";
        let titleText = "";
        let subtitleText = "";
        let customGraphic: React.ReactNode = null;
        let borderStyle: any = {};

        if (themeType === "EID") {
            bgGradient = "linear-gradient(135deg, #022c22, #064e3b, #065f46)";
            titleText = "Eid Mubarak! 🌙";
            subtitleText = "Celebrate the blessings of Eid with our special festive dishes!";
            customGraphic = (
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", right: 15, top: 0, opacity: 0.8 }}>
                    <path d="M 80 20 A 40 40 0 1 0 100 85 A 32 32 0 1 1 80 20 Z" fill="#fcd34d" />
                    <line x1="35" y1="0" x2="35" y2="40" stroke="#fcd34d" strokeWidth="1.5" />
                    <rect x="27" y="40" width="16" height="24" rx="2" fill="#fcd34d" />
                    <polygon points="27,40 35,32 43,40" fill="#fcd34d" />
                    <line x1="55" y1="0" x2="55" y2="60" stroke="#fcd34d" strokeWidth="1.5" />
                    <rect x="47" y="60" width="16" height="24" rx="2" fill="#fcd34d" />
                    <polygon points="47,60 55,52 63,60" fill="#fcd34d" />
                </svg>
            );
        } else if (themeType === "RAMADAN") {
            bgGradient = "linear-gradient(135deg, #09090b, #0f172a, #1e1b4b)";
            titleText = "Ramadan Kareem! 🕌";
            subtitleText = "Break your fast with our delicious Iftar meals & refreshing drinks!";
            customGraphic = (
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", right: 15, top: 0, opacity: 0.75 }}>
                    <line x1="45" y1="0" x2="45" y2="50" stroke="#fbbf24" strokeWidth="1.5" />
                    <rect x="37" y="50" width="16" height="24" rx="2" fill="#fbbf24" />
                    <polygon points="37,50 45,42 53,50" fill="#fbbf24" />
                    <circle cx="45" cy="62" r="3" fill="#ffffff" />
                </svg>
            );
        } else if (themeType === "ONAM") {
            bgGradient = "linear-gradient(135deg, #f59e0b, #d97706, #15803d)";
            titleText = "Happy Onam! 🌸";
            subtitleText = "Feast on our authentic traditional Onasadya specials today!";
            borderStyle = {
                borderLeft: "10px solid #fbbf24",
                borderRight: "10px solid #fbbf24",
            };
            customGraphic = (
                <svg width="130" height="130" viewBox="0 0 100 100" style={{ position: "absolute", right: -15, bottom: -15, opacity: 0.4 }}>
                    <circle cx="50" cy="50" r="46" fill="#f59e0b" />
                    <circle cx="50" cy="50" r="38" fill="#15803d" />
                    <circle cx="50" cy="50" r="30" fill="#ef4444" />
                    <circle cx="50" cy="50" r="22" fill="#fbbf24" />
                    <circle cx="50" cy="50" r="14" fill="#ffffff" />
                    <circle cx="50" cy="50" r="6" fill="#ea580c" />
                </svg>
            );
        } else if (themeType === "VISHU") {
            bgGradient = "linear-gradient(135deg, #fbbf24, #d97706, #b45309)";
            titleText = "Happy Vishu! 🌼";
            subtitleText = "Start a prosperous new year with sweet Vishu Kanji and Kani specials!";
            borderStyle = {
                borderBottom: "6px solid #fcd34d",
            };
            customGraphic = (
                <svg width="100" height="130" viewBox="0 0 100 130" style={{ position: "absolute", right: 20, bottom: 0, opacity: 0.9 }}>
                    <ellipse cx="50" cy="120" rx="30" ry="8" fill="#eab308" />
                    <rect x="47" y="40" width="6" height="80" fill="#eab308" />
                    <ellipse cx="50" cy="40" rx="20" ry="6" fill="#eab308" />
                    <path d="M 50 15 C 42 32 50 38 50 38 C 50 38 58 32 50 15 Z" fill="#ef4444" />
                    <path d="M 50 22 C 45 32 50 37 50 37 C 50 37 55 32 50 22 Z" fill="#facc15" />
                </svg>
            );
        } else if (themeType === "DIWALI") {
            bgGradient = "linear-gradient(135deg, #4c1d95, #6d28d9, #be185d)";
            titleText = "Happy Diwali! 🪔";
            subtitleText = "Share the light and happiness with our delicious festive sweets & family combo deals!";
            customGraphic = (
                <svg width="130" height="100" viewBox="0 0 130 100" style={{ position: "absolute", right: 10, bottom: -10, opacity: 0.9 }}>
                    <path d="M 20 60 C 20 80 70 80 70 60 Z" fill="#c2410c" />
                    <path d="M 20 60 L 70 60 Z" fill="#c2410c" />
                    <path d="M 45 30 C 40 45 45 55 45 55 C 45 55 50 45 45 30 Z" fill="#ea580c" />
                    <path d="M 45 36 C 42 45 45 53 45 53 C 45 53 48 45 45 36 Z" fill="#facc15" />
                    <path d="M 65 70 C 65 90 115 90 115 70 Z" fill="#c2410c" opacity="0.8" />
                    <path d="M 90 40 C 85 55 90 65 90 65 C 90 65 95 55 90 40 Z" fill="#ea580c" opacity="0.8" />
                    <path d="M 90 46 C 87 55 90 63 90 63 C 90 63 93 55 90 46 Z" fill="#facc15" opacity="0.8" />
                </svg>
            );
        } else if (themeType === "CHRISTMAS") {
            bgGradient = "linear-gradient(135deg, #991b1b, #7f1d1d, #064e3b)";
            titleText = "Merry Christmas! 🎄";
            subtitleText = "Celebrate the season of giving with our special holiday delicacies and sweet deals!";
            customGraphic = (
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: "absolute", right: 15, top: 0, opacity: 0.8 }}>
                    <line x1="60" y1="0" x2="60" y2="50" stroke="#ffffff" strokeWidth="1.5" />
                    <polygon points="60,35 64,47 76,47 67,55 70,67 60,59 50,67 53,55 44,47 56,47" fill="#fcd34d" />
                    <line x1="30" y1="0" x2="30" y2="70" stroke="#ffffff" strokeWidth="1" />
                    <polygon points="30,58 33,67 42,67 35,73 37,82 30,76 23,82 25,73 18,67 27,67" fill="#ffffff" opacity="0.8" />
                </svg>
            );
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
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 120,
                    ...borderStyle,
                }}
            >
                {customGraphic}
                <Text sx={{ fontSize: "1.7rem", zIndex: 1 }} weight={900} style={{ fontFamily: "Outfit, sans-serif", textShadow: "1px 1px 4px rgba(0,0,0,0.5)" }}>
                    {titleText}
                </Text>
                <Text size="sm" mt="xs" weight={600} opacity={0.95} style={{ zIndex: 1, maxWidth: "70%", textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}>
                    {subtitleText}
                </Text>
            </Paper>
        );
    };

    const haveMenuItems = filteredMenuDetails?.categories?.some((category) => category?.items?.length > 0);
    
    // Layout configurations based on selected menu theme
    const menuTheme = (restaurant as any)?.menuTheme || "GRID";
    const gridCols = menuTheme === "SIMPLE" ? 1 : menuTheme === "GOURMET" ? 2 : 3;
    const gridBreakpoints = menuTheme === "SIMPLE" 
        ? [{ cols: 1, minWidth: "xs" }] 
        : menuTheme === "GOURMET" 
            ? [
                { cols: 2, minWidth: "md" },
                { cols: 1, minWidth: "xs" }
              ]
            : [
                { cols: 3, minWidth: "lg" },
                { cols: 2, minWidth: "sm" },
                { cols: 1, minWidth: "xs" }
              ];

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
                        <Flex gap="sm" mt="xs" wrap="wrap">
                            {(restaurant as any)?.instagramUrl && (
                                <ActionIcon component="a" href={(restaurant as any).instagramUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="pink">
                                    <IconBrandInstagram size={18} />
                                </ActionIcon>
                            )}
                            {(restaurant as any)?.facebookUrl && (
                                <ActionIcon component="a" href={(restaurant as any).facebookUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="blue">
                                    <IconBrandFacebook size={18} />
                                </ActionIcon>
                            )}
                            {(restaurant as any)?.twitterUrl && (
                                <ActionIcon component="a" href={(restaurant as any).twitterUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="dark">
                                    <IconBrandTwitter size={18} />
                                </ActionIcon>
                            )}
                            {(restaurant as any)?.youtubeUrl && (
                                <ActionIcon component="a" href={(restaurant as any).youtubeUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="red">
                                    <IconBrandYoutube size={18} />
                                </ActionIcon>
                            )}
                            {(restaurant as any)?.tiktokUrl && (
                                <ActionIcon component="a" href={(restaurant as any).tiktokUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="dark">
                                    <IconBrandTiktok size={18} />
                                </ActionIcon>
                            )}
                        </Flex>
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
                    <Flex gap="sm" mt="xs" wrap="wrap">
                        {(restaurant as any)?.instagramUrl && (
                            <ActionIcon component="a" href={(restaurant as any).instagramUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="pink">
                                <IconBrandInstagram size={18} />
                            </ActionIcon>
                        )}
                        {(restaurant as any)?.facebookUrl && (
                            <ActionIcon component="a" href={(restaurant as any).facebookUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="blue">
                                <IconBrandFacebook size={18} />
                            </ActionIcon>
                        )}
                        {(restaurant as any)?.twitterUrl && (
                            <ActionIcon component="a" href={(restaurant as any).twitterUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="dark">
                                <IconBrandTwitter size={18} />
                            </ActionIcon>
                        )}
                        {(restaurant as any)?.youtubeUrl && (
                            <ActionIcon component="a" href={(restaurant as any).youtubeUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="red">
                                <IconBrandYoutube size={18} />
                            </ActionIcon>
                        )}
                        {(restaurant as any)?.tiktokUrl && (
                            <ActionIcon component="a" href={(restaurant as any).tiktokUrl} target="_blank" rel="noopener noreferrer" radius="xl" size="md" variant="subtle" color="dark">
                                <IconBrandTiktok size={18} />
                            </ActionIcon>
                        )}
                    </Flex>
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

            {/* Live Special Offers & Combo Deals Slider */}
            {activeOffers.length > 0 && (
                <Box mb="xl" mt="md">
                    <Group mb="sm" spacing="xs">
                        <IconGift color={theme.colors.red[6]} size={22} />
                        <Title color="dark.8" order={3} size="1.3rem" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Special Offers & Combo Deals
                        </Title>
                    </Group>
                    <ScrollArea type="hover" pb="sm">
                        <Flex gap="md" wrap="nowrap">
                            {activeOffers.map((offer: any) => {
                                return (
                                    <Paper
                                        key={offer.id}
                                        p="md"
                                        radius="md"
                                        shadow="xs"
                                        withBorder
                                        sx={{
                                            flexShrink: 0,
                                            width: 280,
                                            borderColor: theme.colors.orange[2],
                                            background: `linear-gradient(135deg, ${theme.white} 0%, ${theme.colors.orange[0]} 100%)`,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <Stack spacing={4}>
                                            <Group position="apart">
                                                <Badge color={offer.type === "COMBO_DEAL" ? "violet" : "orange"} variant="filled">
                                                    {offer.type === "COMBO_DEAL" ? "Combo" : "Special"}
                                                </Badge>
                                                {offer.price && (
                                                    <Badge color="red" variant="filled" size="sm">
                                                        {offer.price}
                                                    </Badge>
                                                )}
                                            </Group>
                                            <Text weight={800} size="sm" color="dark.8" mt="xs" lineClamp={1}>
                                                {offer.title}
                                            </Text>
                                            <Text size="xs" color="dimmed" lineClamp={2} style={{ minHeight: 32 }}>
                                                {offer.description}
                                            </Text>
                                        </Stack>

                                        {offer.type === "COMBO_DEAL" ? (
                                            <Button
                                                variant="light"
                                                color="violet"
                                                size="xs"
                                                mt="sm"
                                                fullWidth
                                                onClick={() => handleAddComboToPlate(offer)}
                                            >
                                                Add Combo +
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="light"
                                                color="orange"
                                                size="xs"
                                                mt="sm"
                                                fullWidth
                                                onClick={() => {
                                                    showSuccessToast(
                                                        "Special Offer Details",
                                                        `${offer.title}: ${offer.description}`
                                                    );
                                                }}
                                            >
                                                View Offer Details
                                            </Button>
                                        )}
                                    </Paper>
                                );
                            })}
                        </Flex>
                    </ScrollArea>
                </Box>
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
            {restaurant && isFeatureEnabled(restaurant, "search") && (
                <TextInput
                    icon={<IconSearch size={16} />}
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    mb="lg"
                    radius="md"
                    size="md"
                />
            )}
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
                            breakpoints={gridBreakpoints as any}
                            cols={gridCols}
                            mb={20}
                        >
                            {dailySpecials.map((item) => (
                                <MenuItemCard
                                    key={`special-${item.id}`}
                                    isOrderFeatureEnabled={(restaurant as any).isOrderFeatureEnabled}
                                    item={item}
                                    styleTheme={menuTheme}
                                />
                            ))}
                        </SimpleGrid>
                        <Divider my="lg" variant="dashed" />
                    </Box>
                )}

                {filteredMenuDetails?.categories
                    ?.filter((category) => category?.items.length)
                    ?.map((category) => (
                        <Box key={category.id}>
                            <Text my="lg" size="lg" weight={600}>
                                {category.name}
                            </Text>
                            <SimpleGrid
                                breakpoints={gridBreakpoints as any}
                                cols={gridCols}
                                mb={30}
                            >
                                {category.items?.map((item) => (
                                    <MenuItemCard
                                        key={item.id}
                                        isOrderFeatureEnabled={(restaurant as any).isOrderFeatureEnabled}
                                        item={item}
                                        styleTheme={menuTheme}
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
