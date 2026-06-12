import type { FC, MutableRefObject } from "react";
import { useState, useEffect } from "react";
import {
    Box,
    Button,
    Container,
    Stack,
    Title,
    Transition,
    Card,
    SimpleGrid,
    Text,
    Flex,
    Center,
    Grid,
    Image,
    Group,
    Textarea,
    TextInput,
    Divider,
    Table,
    Paper,
    List,
    ThemeIcon,
    Accordion,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useForm, zodResolver } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import {
    IconBrightness2,
    IconClick,
    IconDevices,
    IconGauge,
    IconQrcode,
    IconSlideshow,
    IconBrandGithub,
    IconMinus,
    IconPlus,
    IconExternalLink,
} from "@tabler/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { z } from "zod";

import { env } from "src/env/client.mjs";
import { useSession } from "src/utils/supabaseAuth";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

// ─── Design Tokens ──────────────────────────────────────────────
const tokens = {
    black: "#0a0a0a",
    white: "#fafafa",
    offWhite: "#f4f4f0",
    border: "#e2e2dc",
    muted: "#888880",
    accent: "#c8ff00", // single accent color — no gradients
    surface: "#f9f9f6",
} as const;

// ─── Reusable: Section Label ─────────────────────────────────────
const SectionLabel: FC<{ children: string; index?: string }> = ({ children, index }) => (
    <Flex align="center" gap={12} mb={40}>
        {index && (
            <Text
                sx={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: tokens.muted,
                    letterSpacing: "0.08em",
                }}
            >
                {index}
            </Text>
        )}
        <Box sx={{ width: 24, height: 1, background: tokens.muted }} />
        <Text
            sx={{
                fontFamily: "monospace",
                fontSize: 11,
                color: tokens.muted,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
            }}
        >
            {children}
        </Text>
    </Flex>
);

// ─── Reusable: Outline Button ────────────────────────────────────
const OutlineBtn: FC<{
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    size?: "sm" | "md" | "lg";
    filled?: boolean;
}> = ({ children, href, onClick, size = "md", filled = false }) => {
    const padding = size === "lg" ? "14px 32px" : size === "sm" ? "8px 16px" : "11px 24px";
    const fontSize = size === "lg" ? 15 : size === "sm" ? 12 : 13;

    const style = {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding,
        fontSize,
        fontWeight: 500,
        letterSpacing: "0.01em",
        border: `1.5px solid ${filled ? tokens.black : tokens.black}`,
        background: filled ? tokens.black : "transparent",
        color: filled ? tokens.white : tokens.black,
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease",
        textDecoration: "none",
        borderRadius: 0,
        fontFamily: "inherit",
        lineHeight: 1,
    } as const;

    const hoverStyle = {
        background: filled ? "#1a1a1a" : tokens.black,
        color: tokens.white,
    };

    if (href) {
        return (
            <Link href={href} style={style}
                onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, hoverStyle);
                }}
                onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, style);
                }}
            >
                {children}
            </Link>
        );
    }

    return (
        <button onClick={onClick} style={style}
            onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, hoverStyle);
            }}
            onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, style);
            }}
        >
            {children}
        </button>
    );
};

// ─── Reusable: Horizontal Rule ───────────────────────────────────
const HR: FC = () => (
    <Box sx={{ borderTop: `1px solid ${tokens.border}`, width: "100%" }} />
);

// ==========================================
// 1. HERO
// ==========================================
export const Hero: FC = () => {
    const { status } = useSession();
    const t = useTranslations("landing.hero");
    const tCommon = useTranslations("common");
    const [mounted, setMounted] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => { setMounted(true); }, []);

    return (
        <Box
            sx={{
                background: tokens.white,
                borderBottom: `1px solid ${tokens.border}`,
                minHeight: "calc(100vh - 60px)",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Top ticker / announcement bar */}
            <Box
                sx={{
                    borderBottom: `1px solid ${tokens.border}`,
                    padding: "10px 0",
                    overflow: "hidden",
                }}
            >
                <Container size="xl">
                    <Flex align="center" justify="space-between">
                        <Text sx={{ fontFamily: "monospace", fontSize: 11, color: tokens.muted, letterSpacing: "0.08em" }}>
                            FREE TIER AVAILABLE — NO CREDIT CARD REQUIRED
                        </Text>
                        <Text sx={{ fontFamily: "monospace", fontSize: 11, color: tokens.muted, letterSpacing: "0.08em" }}>
                            EST. 2023
                        </Text>
                    </Flex>
                </Container>
            </Box>

            {/* Main hero content */}
            <Container size="xl" sx={{ flex: 1, display: "flex", alignItems: "center", padding: "80px 20px" }}>
                <Grid sx={{ width: "100%" }} gutter={0}>
                    <Grid.Col md={7} sm={12}>
                        <Box sx={{ paddingRight: isMobile ? 0 : 60 }}>
                            {/* Index label */}
                            <Text
                                sx={{
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    color: tokens.muted,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    marginBottom: 24,
                                }}
                            >
                                Digital Menu Platform — 01
                            </Text>

                            {/* Headline — editorial style, no gradient */}
                            <Title
                                sx={{
                                    fontSize: isMobile ? 44 : 80,
                                    fontWeight: 800,
                                    lineHeight: 0.95,
                                    letterSpacing: "-3px",
                                    color: tokens.black,
                                    marginBottom: 40,
                                    fontFamily: "Georgia, serif",
                                }}
                            >
                                {t("tagLine1")}
                                <br />
                                <Text
                                    component="span"
                                    sx={{
                                        fontStyle: "italic",
                                        fontWeight: 400,
                                        color: tokens.muted,
                                        fontSize: isMobile ? 40 : 72,
                                    }}
                                >
                                    {t("tagLine2")}
                                </Text>
                                <br />
                                {t("tagLine3")}
                            </Title>

                            {/* Sub copy */}
                            <Text
                                sx={{
                                    fontSize: 15,
                                    color: tokens.muted,
                                    maxWidth: 440,
                                    lineHeight: 1.7,
                                    marginBottom: 48,
                                }}
                            >
                                Give your restaurant a digital menu your customers will actually use.
                                QR codes, live updates, no app required.
                            </Text>

                            {/* CTA row */}
                            <Transition mounted={status !== "loading" && mounted} transition="fade" duration={400}>
                                {(styles) => (
                                    <Flex style={styles} gap={12} wrap="wrap" align="center">
                                        {status === "authenticated" ? (
                                            <OutlineBtn href="/restaurant" size="lg" filled>
                                                {tCommon("openDashboard")}
                                            </OutlineBtn>
                                        ) : (
                                            <>
                                                <OutlineBtn href="/auth/signin" size="lg" filled>
                                                    {t("getStarted")}
                                                </OutlineBtn>
                                                <OutlineBtn href="#how-it-works" size="lg">
                                                    See how it works
                                                </OutlineBtn>
                                            </>
                                        )}
                                    </Flex>
                                )}
                            </Transition>

                            {/* Small print */}
                            <Text
                                sx={{
                                    fontFamily: "monospace",
                                    fontSize: 10,
                                    color: tokens.muted,
                                    letterSpacing: "0.06em",
                                    marginTop: 24,
                                    textTransform: "uppercase",
                                }}
                            >
                                Works on any device · No installation · Free to start
                            </Text>
                        </Box>
                    </Grid.Col>

                    {/* Right column — plain number stats, no cards */}
                    <Grid.Col md={5} sm={12}>
                        <Box
                            sx={{
                                borderLeft: isMobile ? "none" : `1px solid ${tokens.border}`,
                                paddingLeft: isMobile ? 0 : 60,
                                paddingTop: isMobile ? 60 : 0,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                height: "100%",
                            }}
                        >
                            {[
                                { value: "10,000+", label: "Menus created" },
                                { value: "500+", label: "Restaurants onboarded" },
                                { value: "99.9%", label: "Uptime guarantee" },
                                { value: "0", label: "Required installations" },
                            ].map((stat, i) => (
                                <Box key={stat.label}>
                                    <Box sx={{ padding: "28px 0" }}>
                                        <Text
                                            sx={{
                                                fontSize: isMobile ? 40 : 56,
                                                fontWeight: 700,
                                                color: tokens.black,
                                                lineHeight: 1,
                                                letterSpacing: "-2px",
                                                fontFamily: "Georgia, serif",
                                            }}
                                        >
                                            {stat.value}
                                        </Text>
                                        <Text
                                            sx={{
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                color: tokens.muted,
                                                letterSpacing: "0.08em",
                                                textTransform: "uppercase",
                                                marginTop: 4,
                                            }}
                                        >
                                            {stat.label}
                                        </Text>
                                    </Box>
                                    {i < 3 && <HR />}
                                </Box>
                            ))}
                        </Box>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

// ==========================================
// 2. HOW IT WORKS
// ==========================================
export const Steps: FC = () => {
    const t = useTranslations("landing.steps");
    const steps: { description: string; title: string }[] = t.raw("stepItems");
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <Box
            id="how-it-works"
            sx={{
                background: tokens.black,
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="02">How it works</SectionLabel>

                <Title
                    sx={{
                        fontSize: isMobile ? 32 : 52,
                        fontWeight: 700,
                        color: tokens.white,
                        letterSpacing: "-1.5px",
                        marginBottom: 64,
                        maxWidth: 500,
                        fontFamily: "Georgia, serif",
                    }}
                >
                    {t("title")}
                </Title>

                {/* Steps as a clean numbered list */}
                <Box>
                    {steps.map((step, index) => (
                        <Box key={step.title}>
                            <Box
                                sx={{
                                    padding: "32px 0",
                                    display: "grid",
                                    gridTemplateColumns: isMobile ? "1fr" : "80px 1fr 1fr",
                                    gap: isMobile ? 12 : 40,
                                    alignItems: "start",
                                }}
                            >
                                {/* Step number */}
                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 13,
                                        color: tokens.muted,
                                        letterSpacing: "0.05em",
                                        paddingTop: 4,
                                    }}
                                >
                                    {String(index + 1).padStart(2, "0")}
                                </Text>

                                {/* Step title */}
                                <Text
                                    sx={{
                                        fontSize: 22,
                                        fontWeight: 600,
                                        color: tokens.white,
                                        letterSpacing: "-0.5px",
                                    }}
                                >
                                    {step.title}
                                </Text>

                                {/* Step description */}
                                <Text
                                    sx={{
                                        fontSize: 14,
                                        color: tokens.muted,
                                        lineHeight: 1.7,
                                    }}
                                >
                                    {step.description}
                                </Text>
                            </Box>
                            <Box sx={{ borderTop: `1px solid #1e1e1e` }} />
                        </Box>
                    ))}
                </Box>

                {/* Bottom accent bar */}
                <Box
                    sx={{
                        marginTop: 64,
                        padding: "24px 32px",
                        background: tokens.accent,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 24,
                    }}
                >
                    <Text sx={{ fontSize: 13, fontWeight: 600, color: tokens.black, letterSpacing: "0.02em" }}>
                        Total setup time: under 10 minutes
                    </Text>
                    <OutlineBtn href="/auth/signin" filled size="sm">
                        Start now
                    </OutlineBtn>
                </Box>
            </Container>
        </Box>
    );
};

// ==========================================
// 3. FEATURES
// ==========================================
const featuresData = [
    { icon: IconGauge, key: "webOptimized" },
    { icon: IconBrightness2, key: "themeSupport" },
    { icon: IconSlideshow, key: "banners" },
    { icon: IconClick, key: "organize" },
    { icon: IconDevices, key: "responsiveDesign" },
    { icon: IconQrcode, key: "qrCode" },
];

export const Features: FC = () => {
    const t = useTranslations("landing.features");
    const featureItems: { description: string; key: string; title: string }[] = t.raw("featuresItems");
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <Box
            id="features"
            sx={{
                background: tokens.offWhite,
                padding: "100px 0",
                borderTop: `1px solid ${tokens.border}`,
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <Container size="xl">
                <Grid gutter={60}>
                    {/* Left sticky label */}
                    <Grid.Col md={3} sm={12}>
                        <Box sx={{ position: isMobile ? "static" : "sticky", top: 100 }}>
                            <SectionLabel index="03">Features</SectionLabel>
                            <Title
                                sx={{
                                    fontSize: 28,
                                    fontWeight: 700,
                                    color: tokens.black,
                                    letterSpacing: "-0.5px",
                                    marginBottom: 16,
                                    fontFamily: "Georgia, serif",
                                }}
                            >
                                {t("title")}
                            </Title>
                            <Text sx={{ fontSize: 13, color: tokens.muted, lineHeight: 1.7, marginBottom: 32 }}>
                                {t("subTitle")}
                            </Text>
                            <OutlineBtn href="/auth/signin" filled size="sm">
                                {t("tagLine")}
                            </OutlineBtn>
                        </Box>
                    </Grid.Col>

                    {/* Right — feature list */}
                    <Grid.Col md={9} sm={12}>
                        <Box>
                            {featuresData.map((feature, index) => {
                                const tItem = featureItems.find((item) => item.key === feature.key);
                                if (!tItem) return null;

                                return (
                                    <Box key={tItem.title}>
                                        <Box
                                            sx={{
                                                padding: "36px 0",
                                                display: "grid",
                                                gridTemplateColumns: isMobile ? "1fr" : "40px 1fr 2fr",
                                                gap: isMobile ? 16 : 40,
                                                alignItems: "start",
                                                transition: "background 0.2s ease",
                                                "&:hover": {
                                                    "& .feature-title": {
                                                        textDecoration: "underline",
                                                        textDecorationColor: tokens.muted,
                                                    },
                                                },
                                            }}
                                        >
                                            {/* Icon */}
                                            <Box sx={{ paddingTop: 2 }}>
                                                <feature.icon
                                                    size={18}
                                                    color={tokens.muted}
                                                    strokeWidth={1.5}
                                                />
                                            </Box>

                                            {/* Title */}
                                            <Text
                                                className="feature-title"
                                                sx={{
                                                    fontSize: 15,
                                                    fontWeight: 600,
                                                    color: tokens.black,
                                                    letterSpacing: "-0.2px",
                                                }}
                                            >
                                                {tItem.title}
                                            </Text>

                                            {/* Description */}
                                            <Text
                                                sx={{
                                                    fontSize: 13,
                                                    color: tokens.muted,
                                                    lineHeight: 1.7,
                                                }}
                                            >
                                                {tItem.description}
                                            </Text>
                                        </Box>
                                        <HR />
                                    </Box>
                                );
                            })}
                        </Box>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

// ==========================================
// 4. SAMPLE MENU
// ==========================================
export const SampleMenu: FC = () => {
    const t = useTranslations("landing.sampleMenu");
    const [sampleRestaurantLink, setSampleLink] = useState("");
    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setSampleLink(`${origin}/restaurant/${env.NEXT_PUBLIC_SAMPLE_MENU_ID}/menu`);
    }, []);

    return (
        <Box
            sx={{
                background: tokens.white,
                padding: "100px 0",
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <Container size="xl">
                <SectionLabel index="04">Live demo</SectionLabel>

                <Grid gutter={80} align="center">
                    {/* Left */}
                    <Grid.Col md={6} sm={12}>
                        <Title
                            sx={{
                                fontSize: isMobile ? 36 : 56,
                                fontWeight: 700,
                                color: tokens.black,
                                letterSpacing: "-2px",
                                lineHeight: 1,
                                marginBottom: 24,
                                fontFamily: "Georgia, serif",
                            }}
                        >
                            {t("title")}
                        </Title>

                        <Text
                            sx={{
                                fontSize: 15,
                                color: tokens.muted,
                                lineHeight: 1.7,
                                marginBottom: 40,
                                maxWidth: 380,
                            }}
                        >
                            {t("subTitle")}
                        </Text>

                        <Flex gap={12} wrap="wrap" align="center">
                            <OutlineBtn href={sampleRestaurantLink} filled size="lg">
                                {t("buttonLabel")}
                                <IconExternalLink size={14} />
                            </OutlineBtn>
                        </Flex>

                        {/* Small metadata */}
                        <Box sx={{ marginTop: 48 }}>
                            {[
                                "No login required to view",
                                "Updates reflect in real time",
                                "Works on every screen size",
                            ].map((item) => (
                                <Flex key={item} align="center" gap={12} mb={12}>
                                    <Box
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            background: tokens.black,
                                            borderRadius: "50%",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Text sx={{ fontSize: 13, color: tokens.muted }}>
                                        {item}
                                    </Text>
                                </Flex>
                            ))}
                        </Box>
                    </Grid.Col>

                    {/* Right — QR code, no card styling */}
                    <Grid.Col md={6} sm={12}>
                        <Flex direction="column" align={isMobile ? "flex-start" : "center"}>
                            {/* Plain QR code container */}
                            <Box
                                sx={{
                                    border: `1px solid ${tokens.border}`,
                                    padding: 32,
                                    display: "inline-block",
                                    background: tokens.white,
                                }}
                            >
                                <QRCode
                                    style={{ height: 220, width: 220, display: "block" }}
                                    value={sampleRestaurantLink}
                                    fgColor={tokens.black}
                                />
                            </Box>
                            <Text
                                sx={{
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    color: tokens.muted,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    marginTop: 16,
                                }}
                            >
                                Scan with your phone camera
                            </Text>
                        </Flex>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

// ==========================================
// 5. PRICING
// ==========================================
export const Pricing: FC<{ scrollToContactUs: () => void }> = ({ scrollToContactUs }) => {
    const { status } = useSession();
    const t = useTranslations("landing.pricing");
    const isMobile = useMediaQuery("(max-width: 768px)");

    const freeTierRows = [
        [t("freeTier.maxRestaurantCount", { count: env.NEXT_PUBLIC_MAX_RESTAURANTS_PER_USER }), "Included"],
        [t("freeTier.maxMenuCount", { count: env.NEXT_PUBLIC_MAX_MENUS_PER_RESTAURANT }), "Included"],
        [t("freeTier.maxCategoryCount", { count: env.NEXT_PUBLIC_MAX_CATEGORIES_PER_MENU }), "Included"],
        [t("freeTier.maxMenuItemCount", { count: env.NEXT_PUBLIC_MAX_MENU_ITEMS_PER_CATEGORY }), "Included"],
        [t("freeTier.maxBannerCount", { count: env.NEXT_PUBLIC_MAX_BANNERS_PER_RESTAURANT }), "Included"],
        [t("freeTier.supportType"), "Included"],
    ];

    const enterpriseRows = [
        [t("enterpriseTier.maxRestaurantCount"), "Unlimited"],
        [t("enterpriseTier.maxMenuCount"), "Unlimited"],
        [t("enterpriseTier.maxCategoryCount"), "Unlimited"],
        [t("enterpriseTier.maxMenuItemCount"), "Unlimited"],
        [t("enterpriseTier.maxBannerCount"), "Unlimited"],
        [t("enterpriseTier.supportType"), "Priority"],
    ];

    return (
        <Box
            id="pricing"
            sx={{
                background: tokens.offWhite,
                padding: "100px 0",
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <Container size="xl">
                <SectionLabel index="05">Pricing</SectionLabel>

                <Flex
                    justify="space-between"
                    align={isMobile ? "flex-start" : "flex-end"}
                    direction={isMobile ? "column" : "row"}
                    gap={40}
                    mb={64}
                >
                    <Title
                        sx={{
                            fontSize: isMobile ? 36 : 56,
                            fontWeight: 700,
                            color: tokens.black,
                            letterSpacing: "-2px",
                            lineHeight: 1,
                            fontFamily: "Georgia, serif",
                        }}
                    >
                        {t("title")}
                        <br />
                        <Text
                            component="span"
                            sx={{
                                fontStyle: "italic",
                                fontWeight: 400,
                                color: tokens.muted,
                                fontSize: isMobile ? 32 : 48,
                            }}
                        >
                            two tiers, no tricks
                        </Text>
                    </Title>

                    <Text sx={{ fontSize: 13, color: tokens.muted, maxWidth: 280, lineHeight: 1.7 }}>
                        Start free. Upgrade only when your business needs it.
                        No trial periods, no feature locks on the free tier.
                    </Text>
                </Flex>

                {/* Pricing grid — table-style, not card-style */}
                <Grid gutter={1} sx={{ background: tokens.border }}>
                    {/* Free */}
                    <Grid.Col md={6} sm={12}>
                        <Box sx={{ background: tokens.white, padding: "48px 40px", height: "100%" }}>
                            {/* Price header */}
                            <Box sx={{ marginBottom: 40 }}>
                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        color: tokens.muted,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        marginBottom: 16,
                                    }}
                                >
                                    {t("freeTier.label")}
                                </Text>
                                <Text
                                    sx={{
                                        fontSize: 64,
                                        fontWeight: 800,
                                        color: tokens.black,
                                        lineHeight: 1,
                                        letterSpacing: "-3px",
                                        fontFamily: "Georgia, serif",
                                    }}
                                >
                                    $0
                                </Text>
                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        color: tokens.muted,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        marginTop: 6,
                                    }}
                                >
                                    forever
                                </Text>
                            </Box>

                            <HR />

                            {/* Feature rows */}
                            <Box sx={{ marginTop: 24, marginBottom: 40 }}>
                                {freeTierRows.map(([feature, value]) => (
                                    <Flex
                                        key={feature}
                                        justify="space-between"
                                        align="center"
                                        sx={{
                                            padding: "12px 0",
                                            borderBottom: `1px solid ${tokens.border}`,
                                        }}
                                    >
                                        <Text sx={{ fontSize: 13, color: tokens.muted }}>{feature}</Text>
                                        <Text
                                            sx={{
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                color: tokens.black,
                                                letterSpacing: "0.05em",
                                            }}
                                        >
                                            {value}
                                        </Text>
                                    </Flex>
                                ))}
                            </Box>

                            {status === "unauthenticated" && (
                                <OutlineBtn href="/auth/signin" size="md">
                                    {t("freeTier.getStartedBtnLabel")}
                                </OutlineBtn>
                            )}
                        </Box>
                    </Grid.Col>

                    {/* Enterprise */}
                    <Grid.Col md={6} sm={12}>
                        <Box
                            sx={{
                                background: tokens.black,
                                padding: "48px 40px",
                                height: "100%",
                                position: "relative",
                            }}
                        >
                            {/* Accent strip */}
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    background: tokens.accent,
                                }}
                            />

                            <Box sx={{ marginBottom: 40 }}>
                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        color: "#555550",
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        marginBottom: 16,
                                    }}
                                >
                                    {t("enterpriseTier.label")}
                                </Text>
                                <Text
                                    sx={{
                                        fontSize: 64,
                                        fontWeight: 800,
                                        color: tokens.white,
                                        lineHeight: 1,
                                        letterSpacing: "-3px",
                                        fontFamily: "Georgia, serif",
                                    }}
                                >
                                    Custom
                                </Text>
                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        color: "#555550",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                        marginTop: 6,
                                    }}
                                >
                                    tailored to your scale
                                </Text>
                            </Box>

                            <Box sx={{ borderTop: "1px solid #1a1a1a" }} />

                            <Box sx={{ marginTop: 24, marginBottom: 40 }}>
                                {enterpriseRows.map(([feature, value]) => (
                                    <Flex
                                        key={feature}
                                        justify="space-between"
                                        align="center"
                                        sx={{
                                            padding: "12px 0",
                                            borderBottom: "1px solid #1a1a1a",
                                        }}
                                    >
                                        <Text sx={{ fontSize: 13, color: "#666660" }}>{feature}</Text>
                                        <Text
                                            sx={{
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                color: tokens.accent,
                                                letterSpacing: "0.05em",
                                            }}
                                        >
                                            {value}
                                        </Text>
                                    </Flex>
                                ))}
                            </Box>

                            <button
                                onClick={() => scrollToContactUs()}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "11px 24px",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    border: `1.5px solid ${tokens.accent}`,
                                    background: tokens.accent,
                                    color: tokens.black,
                                    cursor: "pointer",
                                    borderRadius: 0,
                                    fontFamily: "inherit",
                                    letterSpacing: "0.01em",
                                    transition: "opacity 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = "0.85";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = "1";
                                }}
                            >
                                {t("enterpriseTier.contactUsButtonLabel")}
                            </button>
                        </Box>
                    </Grid.Col>
                </Grid>

                {/* Fine print */}
                <Text
                    sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: tokens.muted,
                        letterSpacing: "0.06em",
                        marginTop: 24,
                    }}
                >
                    All plans include SSL, CDN delivery, and automatic backups.
                </Text>
            </Container>
        </Box>
    );
};

// ==========================================
// 6. CONTACT US
// ==========================================
export const ContactUs: FC<{ contactUsRef: MutableRefObject<HTMLDivElement> }> = ({ contactUsRef }) => {
    const t = useTranslations("landing.contactUs");
    const isMobile = useMediaQuery("(max-width: 768px)");

    const form = useForm({
        initialValues: { email: "", message: "", name: "", subject: "" },
        validate: zodResolver(
            z.object({
                email: z.string().email(),
                message: z.string().min(1, "Message is required"),
                name: z.string().min(1, "Name is required"),
                subject: z.string().min(1, "Subject is required"),
            })
        ),
    });

    const { mutate: submitContactUs, isLoading: submittingContactUs } = useMutation(
        async (data: string) => {
            if (env.NEXT_PUBLIC_FORM_API_KEY) {
                const response = await fetch("https://api.web3forms.com/submit", {
                    body: data,
                    headers: { Accept: "application/json", "Content-Type": "application/json" },
                    method: "POST",
                });
                return response.json();
            }
            return null;
        },
        {
            onError: () => showErrorToast(t("errorToastTitle"), { message: t("errorToastDesc") }),
            onSuccess: () => {
                showSuccessToast(t("successToastTitle"), t("successToastDesc"));
                form.reset();
            },
        }
    );

    const inputStyles = {
        input: {
            background: tokens.white,
            border: `1px solid ${tokens.border}`,
            borderRadius: 0,
            fontSize: 14,
            height: 44,
            color: tokens.black,
            "&:focus": {
                border: `1px solid ${tokens.black}`,
                outline: "none",
            },
            "&::placeholder": {
                color: tokens.muted,
            },
        },
        label: {
            fontFamily: "monospace",
            fontSize: 11,
            color: tokens.muted,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            marginBottom: 6,
        },
    };

    return (
        <Box
            id="contact"
            ref={contactUsRef}
            sx={{
                background: tokens.white,
                padding: "100px 0",
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <Container size="xl">
                <SectionLabel index="06">Contact</SectionLabel>

                <Grid gutter={80}>
                    {/* Left */}
                    <Grid.Col md={4} sm={12}>
                        <Title
                            sx={{
                                fontSize: isMobile ? 32 : 48,
                                fontWeight: 700,
                                color: tokens.black,
                                letterSpacing: "-1.5px",
                                lineHeight: 1.1,
                                marginBottom: 24,
                                fontFamily: "Georgia, serif",
                            }}
                        >
                            {t("title")}
                        </Title>

                        <Text sx={{ fontSize: 14, color: tokens.muted, lineHeight: 1.7, marginBottom: 48 }}>
                            Interested in the enterprise plan, or just have a question?
                            Fill out the form and we will get back to you within a business day.
                        </Text>

                        {/* Contact metadata */}
                        {[
                            { label: "Response time", value: "< 24 hours" },
                            { label: "Timezone", value: "UTC+0" },
                            { label: "Enterprise inquiries", value: "Priority queue" },
                        ].map(({ label, value }) => (
                            <Box key={label} sx={{ marginBottom: 20 }}>
                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 10,
                                        color: tokens.muted,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        marginBottom: 4,
                                    }}
                                >
                                    {label}
                                </Text>
                                <Text sx={{ fontSize: 14, color: tokens.black, fontWeight: 500 }}>
                                    {value}
                                </Text>
                            </Box>
                        ))}
                    </Grid.Col>

                    {/* Right — form */}
                    <Grid.Col md={8} sm={12}>
                        <form
                            onSubmit={form.onSubmit((values) => {
                                submitContactUs(
                                    JSON.stringify({
                                        access_key: env.NEXT_PUBLIC_FORM_API_KEY,
                                        email: values.email,
                                        message: values.message,
                                        name: values.name,
                                        subject: `Foodler | ${values.subject}`,
                                    })
                                );
                            })}
                        >
                            <SimpleGrid
                                cols={2}
                                breakpoints={[{ cols: 1, maxWidth: "sm" }]}
                                spacing={20}
                                mb={20}
                            >
                                <TextInput
                                    label={t("name.label")}
                                    placeholder={t("name.placeholder")}
                                    styles={inputStyles}
                                    {...form.getInputProps("name")}
                                />
                                <TextInput
                                    label={t("email.label")}
                                    placeholder={t("email.placeholder")}
                                    styles={inputStyles}
                                    {...form.getInputProps("email")}
                                />
                            </SimpleGrid>

                            <TextInput
                                label={t("subject.label")}
                                placeholder={t("subject.placeholder")}
                                styles={inputStyles}
                                mb={20}
                                {...form.getInputProps("subject")}
                            />

                            <Textarea
                                autosize
                                label={t("message.label")}
                                placeholder={t("message.placeholder")}
                                minRows={6}
                                maxRows={12}
                                mb={32}
                                styles={{
                                    ...inputStyles,
                                    input: {
                                        ...inputStyles.input,
                                        height: "auto",
                                        paddingTop: 12,
                                        paddingBottom: 12,
                                        resize: "vertical",
                                    },
                                }}
                                {...form.getInputProps("message")}
                            />

                            <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
                                <button
                                    type="submit"
                                    disabled={submittingContactUs}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "12px 32px",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        border: `1.5px solid ${tokens.black}`,
                                        background: tokens.black,
                                        color: tokens.white,
                                        cursor: submittingContactUs ? "not-allowed" : "pointer",
                                        borderRadius: 0,
                                        fontFamily: "inherit",
                                        opacity: submittingContactUs ? 0.6 : 1,
                                        letterSpacing: "0.02em",
                                        transition: "opacity 0.15s ease",
                                    }}
                                >
                                    {submittingContactUs ? "Sending..." : t("submitButtonLabel")}
                                </button>

                                <Text
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: 10,
                                        color: tokens.muted,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    We do not share your data
                                </Text>
                            </Flex>
                        </form>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

// ==========================================
// 7. ABOUT US
// ==========================================
export const AboutUs: FC = () => {
    const t = useTranslations("landing.aboutUs");
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <Box
            sx={{
                background: tokens.offWhite,
                padding: "100px 0",
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <Container size="xl">
                <SectionLabel index="07">About</SectionLabel>

                <Grid gutter={80} align="center">
                    {/* Left */}
                    <Grid.Col md={6} sm={12}>
                        <Title
                            sx={{
                                fontSize: isMobile ? 36 : 56,
                                fontWeight: 700,
                                color: tokens.black,
                                letterSpacing: "-2px",
                                lineHeight: 1,
                                marginBottom: 24,
                                fontFamily: "Georgia, serif",
                            }}
                        >
                            {t("title")}
                        </Title>

                        <Text
                            sx={{
                                fontSize: 15,
                                color: tokens.muted,
                                lineHeight: 1.8,
                                marginBottom: 20,
                            }}
                        >
                            {t("subtitle.line1")}
                            <Link
                                href="https://github.com/kaje94/menufic"
                                target="_blank"
                                style={{
                                    color: tokens.black,
                                    fontWeight: 600,
                                    textDecoration: "underline",
                                    textUnderlineOffset: 3,
                                }}
                            >
                                {t("subtitle.line2")}
                            </Link>
                            {t("subtitle.line3")}
                            <Text color="red" component="span">&hearts;</Text>.
                        </Text>

                        <Text sx={{ fontSize: 14, color: tokens.muted, lineHeight: 1.8, marginBottom: 12 }}>
                            {t("goal")}
                        </Text>
                        <Text sx={{ fontSize: 14, color: tokens.muted, lineHeight: 1.8, marginBottom: 48 }}>
                            {t("appreciation")}
                        </Text>

                        <Link
                            href="https://github.com/kaje94/menufic"
                            target="_blank"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 24px",
                                fontSize: 13,
                                fontWeight: 600,
                                border: `1.5px solid ${tokens.black}`,
                                background: tokens.white,
                                color: tokens.black,
                                textDecoration: "none",
                                letterSpacing: "0.01em",
                                transition: "background 0.15s ease, color 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = tokens.black;
                                e.currentTarget.style.color = tokens.white;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = tokens.white;
                                e.currentTarget.style.color = tokens.black;
                            }}
                        >
                            <IconBrandGithub size={16} strokeWidth={1.5} />
                            {t("githubButtonLabel")}
                            <IconExternalLink size={12} />
                        </Link>
                    </Grid.Col>

                    {/* Right — image + plain facts */}
                    <Grid.Col md={6} sm={12}>
                        <Box
                            sx={{
                                border: `1px solid ${tokens.border}`,
                                padding: 40,
                                background: tokens.white,
                            }}
                        >
                            <Image
                                alt="foodler open source"
                                height={260}
                                src="/landing-about-us.svg"
                                width={260}
                                sx={{ display: "block", margin: "0 auto 40px" }}
                            />

                            <HR />

                            {/* Fact list */}
                            {[
                                { label: "License", value: "MIT Open Source" },
                                { label: "Stack", value: "Next.js, Supabase, Mantine" },
                                { label: "Deployment", value: "Vercel Edge Network" },
                                { label: "Contributors", value: "Open to all" },
                            ].map(({ label, value }) => (
                                <Flex
                                    key={label}
                                    justify="space-between"
                                    align="center"
                                    sx={{
                                        padding: "12px 0",
                                        borderBottom: `1px solid ${tokens.border}`,
                                    }}
                                >
                                    <Text
                                        sx={{
                                            fontFamily: "monospace",
                                            fontSize: 11,
                                            color: tokens.muted,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {label}
                                    </Text>
                                    <Text sx={{ fontSize: 13, color: tokens.black, fontWeight: 500 }}>
                                        {value}
                                    </Text>
                                </Flex>
                            ))}
                        </Box>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

// ==========================================
// 8. FAQ (NEW — replaces testimonials)
// ==========================================
const faqItems = [
    {
        q: "Is the free tier actually free, forever?",
        a: "Yes. No credit card, no trial period, no feature degradation after 14 days. The free tier is permanently free.",
    },
    {
        q: "How do customers access the menu?",
        a: "Via a QR code you print and place on your table, or a direct URL you can share anywhere. No app install required.",
    },
    {
        q: "Can I update the menu without reprinting QR codes?",
        a: "Yes. The QR code points to a permanent URL. Any changes you make in the dashboard reflect immediately.",
    },
    {
        q: "What happens if I exceed the free tier limits?",
        a: "We will notify you before any limit is reached. You can either remove old items or talk to us about the enterprise plan.",
    },
    {
        q: "Do you offer white-labeling?",
        a: "Under the enterprise plan, yes. Custom domains and branding are available. Contact us to discuss.",
    },
];

export const FAQ: FC = () => {
    const [opened, setOpened] = useState<number | null>(null);
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <Box
            sx={{
                background: tokens.white,
                padding: "100px 0",
                borderBottom: `1px solid ${tokens.border}`,
            }}
        >
            <Container size="xl">
                <SectionLabel index="08">FAQ</SectionLabel>

                <Grid gutter={80}>
                    <Grid.Col md={4} sm={12}>
                        <Title
                            sx={{
                                fontSize: isMobile ? 32 : 48,
                                fontWeight: 700,
                                color: tokens.black,
                                letterSpacing: "-1.5px",
                                lineHeight: 1.1,
                                fontFamily: "Georgia, serif",
                            }}
                        >
                            Common
                            <br />
                            <Text
                                component="span"
                                sx={{
                                    fontStyle: "italic",
                                    fontWeight: 400,
                                    color: tokens.muted,
                                }}
                            >
                                questions
                            </Text>
                        </Title>
                    </Grid.Col>

                    <Grid.Col md={8} sm={12}>
                        {faqItems.map((item, index) => (
                            <Box key={item.q}>
                                <Box
                                    sx={{
                                        padding: "24px 0",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => setOpened(opened === index ? null : index)}
                                >
                                    <Flex justify="space-between" align="center" gap={24}>
                                        <Text
                                            sx={{
                                                fontSize: 15,
                                                fontWeight: 500,
                                                color: tokens.black,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {item.q}
                                        </Text>
                                        <Box sx={{ flexShrink: 0 }}>
                                            {opened === index ? (
                                                <IconMinus size={16} color={tokens.muted} strokeWidth={1.5} />
                                            ) : (
                                                <IconPlus size={16} color={tokens.muted} strokeWidth={1.5} />
                                            )}
                                        </Box>
                                    </Flex>

                                    {opened === index && (
                                        <Text
                                            sx={{
                                                fontSize: 14,
                                                color: tokens.muted,
                                                lineHeight: 1.7,
                                                marginTop: 16,
                                                maxWidth: 520,
                                            }}
                                        >
                                            {item.a}
                                        </Text>
                                    )}
                                </Box>
                                <HR />
                            </Box>
                        ))}
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

// ==========================================
// 9. FOOTER CTA
// ==========================================
export const FooterCTA: FC = () => {
    const { status } = useSession();
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <Box
            sx={{
                background: tokens.black,
                padding: "120px 0 80px",
            }}
        >
            <Container size="xl">
                <Grid gutter={0} align="flex-end">
                    <Grid.Col md={8} sm={12}>
                        <Title
                            sx={{
                                fontSize: isMobile ? 48 : 96,
                                fontWeight: 800,
                                color: tokens.white,
                                lineHeight: 0.9,
                                letterSpacing: "-4px",
                                fontFamily: "Georgia, serif",
                                marginBottom: isMobile ? 40 : 0,
                            }}
                        >
                            Your menu,
                            <br />
                            <Text
                                component="span"
                                sx={{
                                    fontStyle: "italic",
                                    fontWeight: 400,
                                    color: "#444440",
                                }}
                            >
                                digital.
                            </Text>
                        </Title>
                    </Grid.Col>

                    <Grid.Col md={4} sm={12}>
                        <Box
                            sx={{
                                borderLeft: isMobile ? "none" : "1px solid #1a1a1a",
                                paddingLeft: isMobile ? 0 : 48,
                            }}
                        >
                            <Text sx={{ fontSize: 14, color: "#555550", lineHeight: 1.7, marginBottom: 32 }}>
                                Join restaurants already using Foodler to serve digital menus their customers love.
                            </Text>

                            {status === "authenticated" ? (
                                <OutlineBtn href="/restaurant" filled size="lg">
                                    Open Dashboard
                                </OutlineBtn>
                            ) : (
                                <Stack spacing={12}>
                                    <OutlineBtn href="/auth/signin" filled size="lg">
                                        Create free account
                                    </OutlineBtn>
                                    <Text
                                        sx={{
                                            fontFamily: "monospace",
                                            fontSize: 10,
                                            color: "#444440",
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        No credit card · No time limit · No catch
                                    </Text>
                                </Stack>
                            )}
                        </Box>
                    </Grid.Col>
                </Grid>

                {/* Bottom bar */}
                <Box sx={{ borderTop: "1px solid #1a1a1a", marginTop: 80, paddingTop: 32 }}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                        <Text
                            sx={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                color: "#333330",
                                letterSpacing: "0.06em",
                            }}
                        >
                            © {new Date().getFullYear()} Foodler. MIT Licensed.
                        </Text>
                        <Flex gap={32}>
                            {[
                                { label: "GitHub", href: "https://github.com/kaje94/menufic" },
                                { label: "Privacy", href: "/privacy" },
                                { label: "Terms", href: "/terms" },
                            ].map(({ label, href }) => (
                                <Link
                                    key={label}
                                    href={href}
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        color: "#333330",
                                        letterSpacing: "0.06em",
                                        textDecoration: "none",
                                        transition: "color 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = tokens.white;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = "#333330";
                                    }}
                                >
                                    {label}
                                </Link>
                            ))}
                        </Flex>
                    </Flex>
                </Box>
            </Container>
        </Box>
    );
};  