import type { FC, MutableRefObject } from "react";
import { useEffect, useState } from "react";

import {
    Accordion,
    Box,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Flex,
    Grid,
    Group,
    Image,
    List,
    Paper,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
    Transition,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import {
    IconBrandGithub,
    IconBrightness2,
    IconClick,
    IconDevices,
    IconExternalLink,
    IconGauge,
    IconMinus,
    IconPlus,
    IconQrcode,
    IconSlideshow,
} from "@tabler/icons";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { z } from "zod";

import { env } from "src/env/client.mjs";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";
import { useSession } from "src/utils/supabaseAuth";

// ─── Design Tokens ──────────────────────────────────────────────
const tokens = {
    accent: "#D94B5C",
    black: "#222222",
    border: "#FCE6DA",
    muted: "#6b7280",
    offWhite: "#FCF0F1",
    // single accent color — no gradients
    surface: "#ffffff",
    white: "#ffffff",
} as const;

// ─── Reusable: Section Label ─────────────────────────────────────
const SectionLabel: FC<{ children: string; index?: string }> = ({ children, index }) => (
    <Flex align="center" gap={12} mb={40}>
        {index && (
            <Text
                sx={{
                    color: tokens.accent,
                    fontFamily: "monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                }}
            >
                {index}
            </Text>
        )}
        <Box sx={{ background: tokens.accent, height: 1.5, width: 24 }} />
        <Text
            sx={{
                color: tokens.accent,
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
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
        alignItems: "center",
        background: filled ? tokens.accent : "transparent",
        border: `1.5px solid ${tokens.accent}`,
        borderRadius: 16,
        color: filled ? tokens.white : tokens.accent,
        cursor: "pointer",
        display: "inline-flex",
        fontFamily: "inherit",
        fontSize,
        fontWeight: 600,
        gap: 8,
        letterSpacing: "0.01em",
        lineHeight: 1,
        padding,
        textDecoration: "none",
        transition: "all 0.2s ease-in-out",
    } as const;

    const hoverStyle = {
        background: filled ? "#F16C7A" : tokens.accent,
        color: tokens.white,
        transform: "translateY(-1px)",
        boxShadow: "0 4px 12px rgba(217, 75, 92, 0.2)",
    };

    if (href) {
        return (
            <Link
                href={href}
                onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, hoverStyle);
                }}
                onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, style);
                }}
                style={style}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, hoverStyle);
            }}
            onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, style);
            }}
            style={style}
        >
            {children}
        </button>
    );
};

// ─── Reusable: Horizontal Rule ───────────────────────────────────
const HR: FC = () => <Box sx={{ borderTop: `1px solid ${tokens.border}`, width: "100%" }} />;

// ==========================================
// 1. HERO
// ==========================================
export const Hero: FC = () => {
    const { status } = useSession();
    const t = useTranslations("landing.hero");
    const tCommon = useTranslations("common");
    const [mounted, setMounted] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Box
            sx={{
                background: tokens.white,
                borderBottom: `1px solid ${tokens.border}`,
                display: "flex",
                flexDirection: "column",
                minHeight: "calc(100vh - 60px)",
            }}
        >
            {/* Top ticker / announcement bar */}
            <Box
                sx={{
                    borderBottom: `1px solid ${tokens.border}`,
                    overflow: "hidden",
                    padding: "10px 0",
                }}
            >
                <Container size="xl">
                    <Flex align="center" justify="space-between">
                     
                        <Text
                            sx={{ color: tokens.muted, fontFamily: "monospace", fontSize: 11, letterSpacing: "0.08em" }}
                        >
                            EST. 2023
                        </Text>
                    </Flex>
                </Container>
            </Box>

            {/* Main hero content */}
            <Container size="xl" sx={{ alignItems: "center", display: "flex", flex: 1, padding: "80px 20px" }}>
                <Grid gutter={0} sx={{ width: "100%" }}>
                    <Grid.Col md={7} sm={12}>
                        <Box sx={{ paddingRight: isMobile ? 0 : 60 }}>
                            {/* Index label */}
                            <Text
                                sx={{
                                    color: tokens.muted,
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    letterSpacing: "0.1em",
                                    marginBottom: 24,
                                    textTransform: "uppercase",
                                }}
                            >
                                Digital Menu Platform — 01
                            </Text>

                            {/* Headline — editorial style, no gradient */}
                            <Title
                                sx={{
                                    color: tokens.black,
                                    fontFamily: "Georgia, serif",
                                    fontSize: isMobile ? 44 : 80,
                                    fontWeight: 800,
                                    letterSpacing: "-3px",
                                    lineHeight: 0.95,
                                    marginBottom: 40,
                                }}
                            >
                                {t("tagLine1")}
                                <br />
                                <Text
                                    component="span"
                                    sx={{
                                        color: tokens.muted,
                                        fontSize: isMobile ? 40 : 72,
                                        fontStyle: "italic",
                                        fontWeight: 400,
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
                                    color: tokens.muted,
                                    fontSize: 15,
                                    lineHeight: 1.7,
                                    marginBottom: 48,
                                    maxWidth: 440,
                                }}
                            >
                                Give your restaurant a digital menu your customers will actually use. QR codes, live
                                updates, no app required.
                            </Text>

                            {/* CTA row */}
                            <Transition duration={400} mounted={status !== "loading" && mounted} transition="fade">
                                {(styles) => (
                                    <Flex align="center" gap={12} style={styles} wrap="wrap">
                                        {status === "authenticated" ? (
                                            <OutlineBtn filled href="/restaurant" size="lg">
                                                {tCommon("openDashboard")}
                                            </OutlineBtn>
                                        ) : (
                                            <>
                                                <OutlineBtn filled href="/auth/signin" size="lg">
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
                                    color: tokens.muted,
                                    fontFamily: "monospace",
                                    fontSize: 10,
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
                                display: "flex",
                                flexDirection: "column",
                                height: "100%",
                                justifyContent: "center",
                                paddingLeft: isMobile ? 0 : 60,
                                paddingTop: isMobile ? 60 : 0,
                            }}
                        >
                            {[
                                { label: "Menus created", value: "10,000+" },
                                { label: "Restaurants onboarded", value: "500+" },
                                { label: "Uptime guarantee", value: "99.9%" },
                                { label: "Required installations", value: "0" },
                            ].map((stat, i) => (
                                <Box key={stat.label}>
                                    <Box sx={{ padding: "28px 0" }}>
                                        <Text
                                            sx={{
                                                color: tokens.black,
                                                fontFamily: "Georgia, serif",
                                                fontSize: isMobile ? 40 : 56,
                                                fontWeight: 700,
                                                letterSpacing: "-2px",
                                                lineHeight: 1,
                                            }}
                                        >
                                            {stat.value}
                                        </Text>
                                        <Text
                                            sx={{
                                                color: tokens.muted,
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                letterSpacing: "0.08em",
                                                marginTop: 4,
                                                textTransform: "uppercase",
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
                background: "#222222",
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="02">How it works</SectionLabel>

                <Title
                    sx={{
                        color: tokens.white,
                        fontFamily: "Georgia, serif",
                        fontSize: isMobile ? 32 : 52,
                        fontWeight: 700,
                        letterSpacing: "-1.5px",
                        marginBottom: 64,
                        maxWidth: 500,
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
                                    alignItems: "start",
                                    display: "grid",
                                    gap: isMobile ? 12 : 40,
                                    gridTemplateColumns: isMobile ? "1fr" : "80px 1fr 1fr",
                                    padding: "32px 0",
                                }}
                            >
                                {/* Step number */}
                                <Text
                                    sx={{
                                        color: tokens.accent,
                                        fontFamily: "monospace",
                                        fontSize: 13,
                                        letterSpacing: "0.05em",
                                        paddingTop: 4,
                                        fontWeight: 700,
                                    }}
                                >
                                    {String(index + 1).padStart(2, "0")}
                                </Text>

                                {/* Step title */}
                                <Text
                                    sx={{
                                        color: tokens.white,
                                        fontSize: 22,
                                        fontWeight: 600,
                                        letterSpacing: "-0.5px",
                                    }}
                                >
                                    {step.title}
                                </Text>

                                {/* Step description */}
                                <Text
                                    sx={{
                                        color: tokens.muted,
                                        fontSize: 14,
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
                        alignItems: "center",
                        background: tokens.accent,
                        borderRadius: 16,
                        display: "inline-flex",
                        gap: 24,
                        marginTop: 64,
                        padding: "20px 32px",
                        boxShadow: "0 8px 24px rgba(217, 75, 92, 0.25)"
                    }}
                >
                    <Text sx={{ color: tokens.white, fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>
                        Total setup time: under 10 minutes
                    </Text>
                    <OutlineBtn filled href="/auth/signin" size="sm">
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
                borderBottom: `1px solid ${tokens.border}`,
                borderTop: `1px solid ${tokens.border}`,
                padding: "100px 0",
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
                                    color: tokens.black,
                                    fontFamily: "Georgia, serif",
                                    fontSize: 28,
                                    fontWeight: 700,
                                    letterSpacing: "-0.5px",
                                    marginBottom: 16,
                                }}
                            >
                                {t("title")}
                            </Title>
                            <Text sx={{ color: tokens.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
                                {t("subTitle")}
                            </Text>
                            <OutlineBtn filled href="/auth/signin" size="sm">
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
                                                "&:hover": {
                                                    background: "rgba(217, 75, 92, 0.03)",
                                                    paddingLeft: 12,
                                                    borderRadius: 16,
                                                    "& .feature-title": {
                                                        color: tokens.accent,
                                                    },
                                                },
                                                alignItems: "start",
                                                display: "grid",
                                                gap: isMobile ? 16 : 40,
                                                gridTemplateColumns: isMobile ? "1fr" : "40px 1fr 2fr",
                                                padding: "36px 12px",
                                                transition: "all 0.25s ease-in-out",
                                            }}
                                        >
                                            {/* Icon */}
                                            <Box sx={{ paddingTop: 2 }}>
                                                <feature.icon color={tokens.muted} size={18} strokeWidth={1.5} />
                                            </Box>

                                            {/* Title */}
                                            <Text
                                                className="feature-title"
                                                sx={{
                                                    color: tokens.black,
                                                    fontSize: 15,
                                                    fontWeight: 600,
                                                    letterSpacing: "-0.2px",
                                                }}
                                            >
                                                {tItem.title}
                                            </Text>

                                            {/* Description */}
                                            <Text
                                                sx={{
                                                    color: tokens.muted,
                                                    fontSize: 13,
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
                borderBottom: `1px solid ${tokens.border}`,
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="04">Live demo</SectionLabel>

                <Grid align="center" gutter={80}>
                    {/* Left */}
                    <Grid.Col md={6} sm={12}>
                        <Title
                            sx={{
                                color: tokens.black,
                                fontFamily: "Georgia, serif",
                                fontSize: isMobile ? 36 : 56,
                                fontWeight: 700,
                                letterSpacing: "-2px",
                                lineHeight: 1,
                                marginBottom: 24,
                            }}
                        >
                            {t("title")}
                        </Title>

                        <Text
                            sx={{
                                color: tokens.muted,
                                fontSize: 15,
                                lineHeight: 1.7,
                                marginBottom: 40,
                                maxWidth: 380,
                            }}
                        >
                            {t("subTitle")}
                        </Text>

                        <Flex align="center" gap={12} wrap="wrap">
                            <OutlineBtn filled href={sampleRestaurantLink} size="lg">
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
                                            background: tokens.black,
                                            borderRadius: "50%",
                                            flexShrink: 0,
                                            height: 6,
                                            width: 6,
                                        }}
                                    />
                                    <Text sx={{ color: tokens.muted, fontSize: 13 }}>{item}</Text>
                                </Flex>
                            ))}
                        </Box>
                    </Grid.Col>

                    {/* Right — QR code, no card styling */}
                    <Grid.Col md={6} sm={12}>
                        <Flex align={isMobile ? "flex-start" : "center"} direction="column">
                            {/* Plain QR code container */}
                            <Box
                                sx={{
                                    background: tokens.white,
                                    border: `1.5px solid ${tokens.border}`,
                                    borderRadius: 16,
                                    boxShadow: "0 10px 30px rgba(217, 75, 92, 0.08)",
                                    display: "inline-block",
                                    padding: 32,
                                    transition: "transform 0.3s ease",
                                    "&:hover": {
                                        transform: "scale(1.02)",
                                    }
                                }}
                            >
                                <QRCode
                                    fgColor={tokens.black}
                                    style={{ display: "block", height: 220, width: 220 }}
                                    value={sampleRestaurantLink}
                                />
                            </Box>
                            <Text
                                sx={{
                                    color: tokens.muted,
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    letterSpacing: "0.08em",
                                    marginTop: 16,
                                    textTransform: "uppercase",
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
                borderBottom: `1px solid ${tokens.border}`,
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="05">Pricing</SectionLabel>

                <Flex
                    align={isMobile ? "flex-start" : "flex-end"}
                    direction={isMobile ? "column" : "row"}
                    gap={40}
                    justify="space-between"
                    mb={64}
                >
                    <Title
                        sx={{
                            color: tokens.black,
                            fontFamily: "Georgia, serif",
                            fontSize: isMobile ? 36 : 56,
                            fontWeight: 700,
                            letterSpacing: "-2px",
                            lineHeight: 1,
                        }}
                    >
                        {t("title")}
                        <br />
                        <Text
                            component="span"
                            sx={{
                                color: tokens.muted,
                                fontSize: isMobile ? 32 : 48,
                                fontStyle: "italic",
                                fontWeight: 400,
                            }}
                        >
                            two tiers, no tricks
                        </Text>
                    </Title>

                    <Text sx={{ color: tokens.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 280 }}>
                        Start free. Upgrade only when your business needs it. No trial periods, no feature locks on the
                        free tier.
                    </Text>
                </Flex>

                {/* Pricing grid — premium separate cards */}
                <Grid gutter={30}>
                    {/* Free */}
                    <Grid.Col md={6} sm={12}>
                        <Box
                            sx={{
                                background: tokens.white,
                                height: "100%",
                                padding: "48px 40px",
                                borderRadius: 16,
                                border: `1.5px solid ${tokens.border}`,
                                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.02)",
                                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 12px 32px rgba(217, 75, 92, 0.05)",
                                }
                            }}
                        >
                            {/* Price header */}
                            <Box sx={{ marginBottom: 40 }}>
                                <Text
                                    sx={{
                                        color: tokens.accent,
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        letterSpacing: "0.1em",
                                        marginBottom: 16,
                                        textTransform: "uppercase",
                                        fontWeight: 700,
                                    }}
                                >
                                    {t("freeTier.label")}
                                </Text>
                                <Text
                                    sx={{
                                        color: tokens.black,
                                        fontFamily: "Georgia, serif",
                                        fontSize: 64,
                                        fontWeight: 800,
                                        letterSpacing: "-3px",
                                        lineHeight: 1,
                                    }}
                                >
                                    $0
                                </Text>
                                <Text
                                    sx={{
                                        color: tokens.muted,
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        letterSpacing: "0.06em",
                                        marginTop: 6,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    forever
                                </Text>
                            </Box>

                            <HR />

                            {/* Feature rows */}
                            <Box sx={{ marginBottom: 40, marginTop: 24 }}>
                                {freeTierRows.map(([feature, value]) => (
                                    <Flex
                                        key={feature}
                                        align="center"
                                        justify="space-between"
                                        sx={{
                                            borderBottom: `1px solid ${tokens.border}`,
                                            padding: "12px 0",
                                        }}
                                    >
                                        <Text sx={{ color: tokens.muted, fontSize: 13 }}>{feature}</Text>
                                        <Text
                                            sx={{
                                                color: tokens.black,
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                letterSpacing: "0.05em",
                                                fontWeight: 600,
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
                                height: "100%",
                                padding: "48px 40px",
                                position: "relative",
                                borderRadius: 16,
                                border: `1.5px solid ${tokens.black}`,
                                boxShadow: "0 12px 32px rgba(217, 75, 92, 0.15)",
                                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 16px 40px rgba(217, 75, 92, 0.22)",
                                }
                            }}
                        >
                            {/* Accent strip */}
                            <Box
                                sx={{
                                    background: tokens.accent,
                                    height: 4,
                                    left: 0,
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    borderTopLeftRadius: 12,
                                    borderTopRightRadius: 12,
                                }}
                            />

                            <Box sx={{ marginBottom: 40 }}>
                                <Text
                                    sx={{
                                        color: "rgba(255, 255, 255, 0.5)",
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        letterSpacing: "0.1em",
                                        marginBottom: 16,
                                        textTransform: "uppercase",
                                        fontWeight: 700,
                                    }}
                                >
                                    {t("enterpriseTier.label")}
                                </Text>
                                <Text
                                    sx={{
                                        color: tokens.white,
                                        fontFamily: "Georgia, serif",
                                        fontSize: 64,
                                        fontWeight: 800,
                                        letterSpacing: "-3px",
                                        lineHeight: 1,
                                    }}
                                >
                                    Custom
                                </Text>
                                <Text
                                    sx={{
                                        color: "rgba(255, 255, 255, 0.5)",
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        letterSpacing: "0.06em",
                                        marginTop: 6,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    tailored to your scale
                                </Text>
                            </Box>

                            <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }} />

                            <Box sx={{ marginBottom: 40, marginTop: 24 }}>
                                {enterpriseRows.map(([feature, value]) => (
                                    <Flex
                                        key={feature}
                                        align="center"
                                        justify="space-between"
                                        sx={{
                                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                            padding: "12px 0",
                                        }}
                                    >
                                        <Text sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 13 }}>{feature}</Text>
                                        <Text
                                            sx={{
                                                color: tokens.accent,
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                letterSpacing: "0.05em",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {value}
                                        </Text>
                                    </Flex>
                                ))}
                            </Box>

                            <button
                                onClick={() => scrollToContactUs()}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#F16C7A";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(217, 75, 92, 0.2)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = tokens.accent;
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                style={{
                                    alignItems: "center",
                                    background: tokens.accent,
                                    border: `1.5px solid ${tokens.accent}`,
                                    borderRadius: 16,
                                    color: tokens.white,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    fontFamily: "inherit",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    gap: 8,
                                    letterSpacing: "0.01em",
                                    padding: "12px 28px",
                                    transition: "all 0.2s ease-in-out",
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
                        color: tokens.muted,
                        fontFamily: "monospace",
                        fontSize: 11,
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
            "&::placeholder": {
                color: tokens.muted,
            },
            "&:focus": {
                border: `1.5px solid ${tokens.accent}`,
                boxShadow: `0 0 0 3px rgba(217, 75, 92, 0.15)`,
                outline: "none",
            },
            background: tokens.white,
            border: `1.5px solid ${tokens.border}`,
            borderRadius: 16,
            color: tokens.black,
            fontSize: 14,
            height: 44,
            transition: "all 0.2s ease-in-out",
        },
        label: {
            color: tokens.muted,
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            marginBottom: 6,
            textTransform: "uppercase" as const,
        },
    };

    return (
        <Box
            id="contact"
            ref={contactUsRef}
            sx={{
                background: tokens.white,
                borderBottom: `1px solid ${tokens.border}`,
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="06">Contact</SectionLabel>

                <Grid gutter={80}>
                    {/* Left */}
                    <Grid.Col md={4} sm={12}>
                        <Title
                            sx={{
                                color: tokens.black,
                                fontFamily: "Georgia, serif",
                                fontSize: isMobile ? 32 : 48,
                                fontWeight: 700,
                                letterSpacing: "-1.5px",
                                lineHeight: 1.1,
                                marginBottom: 24,
                            }}
                        >
                            {t("title")}
                        </Title>

                        <Text sx={{ color: tokens.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 48 }}>
                            Interested in the enterprise plan, or just have a question? Fill out the form and we will
                            get back to you within a business day.
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
                                        color: tokens.muted,
                                        fontFamily: "monospace",
                                        fontSize: 10,
                                        letterSpacing: "0.1em",
                                        marginBottom: 4,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {label}
                                </Text>
                                <Text sx={{ color: tokens.black, fontSize: 14, fontWeight: 500 }}>{value}</Text>
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
                            <SimpleGrid breakpoints={[{ cols: 1, maxWidth: "sm" }]} cols={2} mb={20} spacing={20}>
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
                                mb={20}
                                placeholder={t("subject.placeholder")}
                                styles={inputStyles}
                                {...form.getInputProps("subject")}
                            />

                            <Textarea
                                autosize
                                label={t("message.label")}
                                maxRows={12}
                                mb={32}
                                minRows={6}
                                placeholder={t("message.placeholder")}
                                styles={{
                                    ...inputStyles,
                                    input: {
                                        ...inputStyles.input,
                                        height: "auto",
                                        paddingBottom: 12,
                                        paddingTop: 12,
                                        resize: "vertical",
                                    },
                                }}
                                {...form.getInputProps("message")}
                            />

                            <Flex align="center" gap={16} justify="space-between" wrap="wrap">
                                <button
                                    disabled={submittingContactUs}
                                    onMouseEnter={(e) => {
                                        if (!submittingContactUs) {
                                            e.currentTarget.style.background = "#F16C7A";
                                            e.currentTarget.style.transform = "translateY(-1px)";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(217, 75, 92, 0.2)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!submittingContactUs) {
                                            e.currentTarget.style.background = tokens.accent;
                                            e.currentTarget.style.transform = "none";
                                            e.currentTarget.style.boxShadow = "none";
                                        }
                                    }}
                                    style={{
                                        alignItems: "center",
                                        background: tokens.accent,
                                        border: `1.5px solid ${tokens.accent}`,
                                        borderRadius: 16,
                                        color: tokens.white,
                                        cursor: submittingContactUs ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        fontFamily: "inherit",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        gap: 8,
                                        letterSpacing: "0.02em",
                                        opacity: submittingContactUs ? 0.6 : 1,
                                        padding: "12px 32px",
                                        transition: "all 0.2s ease-in-out",
                                    }}
                                    type="submit"
                                >
                                    {submittingContactUs ? "Sending..." : t("submitButtonLabel")}
                                </button>

                                <Text
                                    sx={{
                                        color: tokens.muted,
                                        fontFamily: "monospace",
                                        fontSize: 10,
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
                borderBottom: `1px solid ${tokens.border}`,
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="07">About</SectionLabel>

                <Grid align="center" gutter={80}>
                    {/* Left */}
                    <Grid.Col md={6} sm={12}>
                        <Title
                            sx={{
                                color: tokens.black,
                                fontFamily: "Georgia, serif",
                                fontSize: isMobile ? 36 : 56,
                                fontWeight: 700,
                                letterSpacing: "-2px",
                                lineHeight: 1,
                                marginBottom: 24,
                            }}
                        >
                            {t("title")}
                        </Title>

                        <Text
                            sx={{
                                color: tokens.muted,
                                fontSize: 15,
                                lineHeight: 1.8,
                                marginBottom: 20,
                            }}
                        >
                            {t("subtitle.line1")}
                            <Link
                                href="https://github.com/kaje94/menufic"
                                style={{
                                    color: tokens.black,
                                    fontWeight: 600,
                                    textDecoration: "underline",
                                    textUnderlineOffset: 3,
                                }}
                                target="_blank"
                            >
                                {t("subtitle.line2")}
                            </Link>
                            {t("subtitle.line3")}
                            <Text color="red" component="span">
                                &hearts;
                            </Text>
                            .
                        </Text>

                        <Text sx={{ color: tokens.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
                            {t("goal")}
                        </Text>
                        <Text sx={{ color: tokens.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 48 }}>
                            {t("appreciation")}
                        </Text>

                        <Link
                            href="https://github.com/kaje94/menufic"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = tokens.black;
                                e.currentTarget.style.color = tokens.white;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = tokens.white;
                                e.currentTarget.style.color = tokens.black;
                            }}
                            style={{
                                alignItems: "center",
                                background: tokens.white,
                                border: `1.5px solid ${tokens.black}`,
                                color: tokens.black,
                                display: "inline-flex",
                                fontSize: 13,
                                fontWeight: 600,
                                gap: 10,
                                letterSpacing: "0.01em",
                                padding: "12px 24px",
                                textDecoration: "none",
                                transition: "background 0.15s ease, color 0.15s ease",
                            }}
                            target="_blank"
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
                                background: tokens.white,
                                border: `1px solid ${tokens.border}`,
                                padding: 40,
                            }}
                        >
                            <Image
                                alt="foodler open source"
                                height={260}
                                src="/landing-about-us.svg"
                                sx={{ display: "block", margin: "0 auto 40px" }}
                                width={260}
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
                                    align="center"
                                    justify="space-between"
                                    sx={{
                                        borderBottom: `1px solid ${tokens.border}`,
                                        padding: "12px 0",
                                    }}
                                >
                                    <Text
                                        sx={{
                                            color: tokens.muted,
                                            fontFamily: "monospace",
                                            fontSize: 11,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {label}
                                    </Text>
                                    <Text sx={{ color: tokens.black, fontSize: 13, fontWeight: 500 }}>{value}</Text>
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
        a: "Yes. No credit card, no trial period, no feature degradation after 14 days. The free tier is permanently free.",
        q: "Is the free tier actually free, forever?",
    },
    {
        a: "Via a QR code you print and place on your table, or a direct URL you can share anywhere. No app install required.",
        q: "How do customers access the menu?",
    },
    {
        a: "Yes. The QR code points to a permanent URL. Any changes you make in the dashboard reflect immediately.",
        q: "Can I update the menu without reprinting QR codes?",
    },
    {
        a: "We will notify you before any limit is reached. You can either remove old items or talk to us about the enterprise plan.",
        q: "What happens if I exceed the free tier limits?",
    },
    {
        a: "Under the enterprise plan, yes. Custom domains and branding are available. Contact us to discuss.",
        q: "Do you offer white-labeling?",
    },
];

export const FAQ: FC = () => {
    const [opened, setOpened] = useState<number | null>(null);
    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <Box
            sx={{
                background: tokens.white,
                borderBottom: `1px solid ${tokens.border}`,
                padding: "100px 0",
            }}
        >
            <Container size="xl">
                <SectionLabel index="08">FAQ</SectionLabel>

                <Grid gutter={80}>
                    <Grid.Col md={4} sm={12}>
                        <Title
                            sx={{
                                color: tokens.black,
                                fontFamily: "Georgia, serif",
                                fontSize: isMobile ? 32 : 48,
                                fontWeight: 700,
                                letterSpacing: "-1.5px",
                                lineHeight: 1.1,
                            }}
                        >
                            Common
                            <br />
                            <Text
                                component="span"
                                sx={{
                                    color: tokens.muted,
                                    fontStyle: "italic",
                                    fontWeight: 400,
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
                                    onClick={() => setOpened(opened === index ? null : index)}
                                    sx={{
                                        cursor: "pointer",
                                        padding: "24px 0",
                                    }}
                                >
                                    <Flex align="center" gap={24} justify="space-between">
                                        <Text
                                            sx={{
                                                color: tokens.black,
                                                fontSize: 15,
                                                fontWeight: 500,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {item.q}
                                        </Text>
                                        <Box sx={{ flexShrink: 0 }}>
                                            {opened === index ? (
                                                <IconMinus color={tokens.muted} size={16} strokeWidth={1.5} />
                                            ) : (
                                                <IconPlus color={tokens.muted} size={16} strokeWidth={1.5} />
                                            )}
                                        </Box>
                                    </Flex>

                                    {opened === index && (
                                        <Text
                                            sx={{
                                                color: tokens.muted,
                                                fontSize: 14,
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
                <Grid align="flex-end" gutter={0}>
                    <Grid.Col md={8} sm={12}>
                        <Title
                            sx={{
                                color: tokens.white,
                                fontFamily: "Georgia, serif",
                                fontSize: isMobile ? 48 : 96,
                                fontWeight: 800,
                                letterSpacing: "-4px",
                                lineHeight: 0.9,
                                marginBottom: isMobile ? 40 : 0,
                            }}
                        >
                            Your menu,
                            <br />
                            <Text
                                component="span"
                                sx={{
                                    color: "#444440",
                                    fontStyle: "italic",
                                    fontWeight: 400,
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
                            <Text sx={{ color: "#555550", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
                                Join restaurants already using Foodler to serve digital menus their customers love.
                            </Text>

                            {status === "authenticated" ? (
                                <OutlineBtn filled href="/restaurant" size="lg">
                                    Open Dashboard
                                </OutlineBtn>
                            ) : (
                                <Stack spacing={12}>
                                    <OutlineBtn filled href="/auth/signin" size="lg">
                                        Create free account
                                    </OutlineBtn>
                                    <Text
                                        sx={{
                                            color: "#444440",
                                            fontFamily: "monospace",
                                            fontSize: 10,
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
                    <Flex align="center" gap={16} justify="space-between" wrap="wrap">
                        <Text
                            sx={{
                                color: "#333330",
                                fontFamily: "monospace",
                                fontSize: 11,
                                letterSpacing: "0.06em",
                            }}
                        >
                            © {new Date().getFullYear()} Foodler. MIT Licensed.
                        </Text>
                        <Flex gap={32}>
                            {[
                                { href: "https://github.com/kaje94/menufic", label: "GitHub" },
                                { href: "/privacy", label: "Privacy" },
                                { href: "/terms", label: "Terms" },
                            ].map(({ label, href }) => (
                                <Link
                                    key={label}
                                    href={href}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = tokens.white;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = "#333330";
                                    }}
                                    style={{
                                        color: "#333330",
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        letterSpacing: "0.06em",
                                        textDecoration: "none",
                                        transition: "color 0.15s ease",
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
