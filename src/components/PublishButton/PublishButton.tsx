import type { FC } from "react";
import { useState } from "react";

import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Center,
    CopyButton,
    Flex,
    Switch,
    Text,
    Tooltip,
    useMantineTheme,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy, IconDownload, IconEye, IconEyeOff, IconTrophy } from "@tabler/icons";
import downloadjs from "downloadjs";
import html2canvas from "html2canvas";
import Link from "next/link";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

import type { Restaurant } from "@prisma/client";

import { env } from "src/env/client.mjs";
import { api } from "src/utils/api";

import { showErrorToast } from "../../utils/helpers";
import { Modal } from "../Modal";

interface Props {
    /** Selected restaurant for which the published state needs to be managed */
    restaurant: Restaurant;
}

/** Button to handle the published state of the restaurant menu */
export const PublishButton: FC<Props> = ({ restaurant }: Props) => {
    const trpcCtx = api.useContext();
    const theme = useMantineTheme();
    const t = useTranslations("dashboard.publishButton");
    const { isPublished, id, name } = restaurant;

    const [modelVisible, setModalVisible] = useState(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const { mutate: setPublished } = api.restaurant.setPublished.useMutation({
        onError: (err: any, _newItem: any, context: { previousRestaurant: Restaurant | undefined } | undefined) => {
            showErrorToast(t("statusUpdateError"), err);
            trpcCtx.restaurant.get.setData({ id }, context?.previousRestaurant);
        },
        onMutate: async (setPublishedReq: any) => {
            await trpcCtx.restaurant.get.cancel({ id });
            const previousRestaurant = trpcCtx.restaurant.get.getData({ id });
            if (previousRestaurant) {
                trpcCtx.restaurant.get.setData(
                    { id },
                    { ...previousRestaurant, isPublished: setPublishedReq.isPublished }
                );
            }

            return { previousRestaurant };
        },
    });

    const handleCaptureClick = async () => {
        const qrCodeElement = document.querySelector<HTMLElement>(".qr-code");
        if (!qrCodeElement) return;

        const canvas = await html2canvas(qrCodeElement);
        const dataURL = canvas.toDataURL("image/png");
        downloadjs(dataURL, `${name}-menu-qr-code.png`, "image/png");
    };

    const menuUrl = `${origin}/restaurant/${restaurant.id}/menu`;
    const previewMenuUrl = `${origin}/restaurant/${restaurant.id}/preview`;

    // QR Code personalization configs
    const qrFgColor = (restaurant as any).qrFgColor || "#000000";
    const qrBgColor = (restaurant as any).qrBgColor || "#ffffff";
    const qrStyle = (restaurant as any).qrStyle || "SQUARE";
    const qrLogoUrl = (restaurant as any).qrLogoUrl || "";

    const getImageUrl = (path?: string | null) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menufic/${path}`;
    };
    const activeLogoUrl = qrLogoUrl ? getImageUrl(qrLogoUrl === "RESTAURANT_LOGO" ? (restaurant as any).logoUrl : qrLogoUrl) : "";

    return (
        <>
            <Button
                data-testid="publish-button"
                leftIcon={isPublished ? <IconEye /> : <IconEyeOff />}
                onClick={() => setModalVisible(true)}
                sx={{
                    justifySelf: "auto",
                    [`@media (min-width: ${theme.breakpoints.xs}px)`]: { justifySelf: "flex-end" },
                }}
                variant={isPublished ? "filled" : "light"}
            >
                {isPublished ? t("publishedBtnLabel") : t("notPublishedBtnLabel")}
            </Button>
            <Modal onClose={() => setModalVisible(false)} opened={modelVisible} size="lg" title={t("modalTitle")}>
                <Alert
                    color={isPublished ? "green" : "orange"}
                    icon={isPublished ? <IconTrophy /> : <IconAlertCircle />}
                    mb="lg"
                    radius="lg"
                    title={isPublished ? t("modalAlertPublishedTitle") : t("modalAlertNotPublishedTitle")}
                >
                    {isPublished ? (
                        <>
                            <Text color={theme.black}>{t("publishedMenuDesc")}</Text>
                            <Text color={theme.black} mt="sm" weight="bold">
                                {t("publishedMenuUrlLabel")}
                            </Text>
                            <Flex align="center" justify="space-between">
                                <Link data-testid="restaurant-menu-url" href={menuUrl} target="_blank">
                                    <Text color={theme.colors.green[9]}>{menuUrl}</Text>
                                </Link>

                                <CopyButton value={menuUrl}>
                                    {({ copied, copy }) => (
                                        <Tooltip
                                            color={copied ? "green" : theme.black}
                                            label={copied ? t("copiedUrlTooltip") : t("copyUrlTooltip")}
                                            position="left"
                                            withArrow
                                        >
                                            <ActionIcon disabled={copied} onClick={copy}>
                                                {copied ? <IconCheck /> : <IconCopy />}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Flex>
                        </>
                    ) : (
                        <Text color={theme.black}>{t("notPublishedMenuDesc")}</Text>
                    )}
                </Alert>

                <Flex
                    align="center"
                    bg={theme.colors.dark[1]}
                    justify="space-between"
                    p="md"
                    sx={{ borderRadius: theme.radius.lg }}
                >
                    <Text color={theme.black}>{t("publishSwitchLabel")}</Text>
                    <Switch
                        checked={isPublished}
                        data-testid="publish-menu-switch"
                        onChange={(event) => setPublished({ id, isPublished: event.target.checked })}
                        size="lg"
                    />
                </Flex>

                {isPublished && (
                    <>
                        <svg width="0" height="0" style={{ position: "absolute", zIndex: -1 }}>
                            <defs>
                                <filter id="qr-rounded-filter">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                                </filter>
                                <filter id="qr-dot-filter">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="goo" />
                                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                                </filter>
                            </defs>
                        </svg>

                        <Box className="qr-code" mt="sm" p={50} style={{ backgroundColor: qrBgColor, borderRadius: "12px", overflow: "hidden" }}>
                            <div style={{ position: "relative", display: "inline-block", width: "100%", textAlign: "center" }}>
                                <QRCode
                                    fgColor={qrFgColor}
                                    bgColor={qrBgColor}
                                    style={{
                                        filter: qrStyle === "ROUNDED" ? "url(#qr-rounded-filter)" : qrStyle === "DOT" ? "url(#qr-dot-filter)" : "none",
                                        height: "auto",
                                        maxWidth: "100%",
                                        width: "100%"
                                    }}
                                    value={`${menuUrl}?src=qr`}
                                />
                                {activeLogoUrl && (
                                    <div style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        backgroundColor: qrBgColor,
                                        padding: "6px",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "18%",
                                        height: "18%",
                                        border: `3px solid ${qrFgColor}`,
                                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                                    }}>
                                        <img
                                            src={activeLogoUrl}
                                            alt="center-logo"
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                borderRadius: "50%"
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Box>

                        <Center mt="md">
                            <Button leftIcon={<IconDownload />} onClick={handleCaptureClick} variant="light">
                                {t("downloadQrButtonLabel")}
                            </Button>
                        </Center>
                    </>
                )}

                <Box
                    bg={theme.colors.dark[1]}
                    mt="lg"
                    opacity={restaurant.isPublished ? 0.75 : 1}
                    p="md"
                    sx={{ borderRadius: theme.radius.lg }}
                >
                    <Text color={theme.black}>{t("previewUrlAlertTitle")}</Text>
                    <Text color={theme.colors.dark[7]} size="sm">
                        {t("previewUrlAlertDesc")}
                    </Text>

                    <Flex align="center" justify="space-between" mt="sm">
                        <Link data-testid="restaurant-preview-url" href={previewMenuUrl} target="_blank">
                            <Text color={theme.colors.dark[9]} size="sm">
                                {previewMenuUrl}
                            </Text>
                        </Link>

                        <CopyButton value={previewMenuUrl}>
                            {({ copied, copy }) => (
                                <Tooltip
                                    color={copied ? "green" : theme.black}
                                    label={copied ? t("copiedUrlTooltip") : t("copyUrlTooltip")}
                                    position="left"
                                    withArrow
                                >
                                    <ActionIcon disabled={copied} onClick={copy}>
                                        {copied ? <IconCheck /> : <IconCopy />}
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </CopyButton>
                    </Flex>
                </Box>
            </Modal>
        </>
    );
};
