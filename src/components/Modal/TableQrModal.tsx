import type { FC } from "react";
import { useMemo, useState } from "react";

import {
    ActionIcon,
    Box,
    Button,
    Center,
    CopyButton,
    Group,
    Stack,
    Text,
    TextInput,
    Tooltip,
    useMantineTheme,
} from "@mantine/core";
import { IconCheck, IconCopy, IconDownload } from "@tabler/icons";
import downloadjs from "downloadjs";
import html2canvas from "html2canvas";
import QRCode from "react-qr-code";

import { env } from "src/env/client.mjs";
import { api } from "src/utils/api";
import { Modal } from "./Modal";

interface Props {
    opened: boolean;
    onClose: () => void;
    restaurantId: string;
    restaurantName: string;
}

export const TableQrModal: FC<Props> = ({ opened, onClose, restaurantId, restaurantName }) => {
    const theme = useMantineTheme();
    const [table, setTable] = useState("");
    const [floor, setFloor] = useState("");

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    // Fetch restaurant QR customization configs
    const { data: restaurant } = api.restaurant.getDetails.useQuery({ id: restaurantId }, { enabled: opened });
    const qrFgColor = restaurant?.qrFgColor || "#000000";
    const qrBgColor = restaurant?.qrBgColor || "#ffffff";
    const qrStyle = restaurant?.qrStyle || "SQUARE";
    const qrLogoUrl = restaurant?.qrLogoUrl || "";

    const getImageUrl = (path?: string | null) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menufic/${path}`;
    };
    const activeLogoUrl = qrLogoUrl ? getImageUrl(qrLogoUrl === "RESTAURANT_LOGO" ? restaurant?.logoUrl : qrLogoUrl) : "";

    const generatedUrl = useMemo(() => {
        let url = `${origin}/restaurant/${restaurantId}/menu`;
        const params = new URLSearchParams();
        params.append("src", "qr"); // Track scanner source
        if (table.trim()) {
            params.append("table", table.trim());
        }
        if (floor.trim()) {
            params.append("floor", floor.trim());
        }
        const query = params.toString();
        if (query) {
            url += `?${query}`;
        }
        return url;
    }, [origin, restaurantId, table, floor]);

    const handleDownloadQr = async () => {
        const qrCodeElement = document.querySelector<HTMLElement>(".table-qr-code-canvas");
        if (!qrCodeElement) return;

        // Temporarily adjust borders/shadows for a cleaner capture
        const originalBorder = qrCodeElement.style.border;
        qrCodeElement.style.border = "none";

        try {
            const canvas = await html2canvas(qrCodeElement, {
                backgroundColor: "#ffffff",
                scale: 2,
                useCORS: true, // Double resolution for crisp print results
            });
            const dataURL = canvas.toDataURL("image/png");

            const fileSuffix =
                [table.trim() ? `table-${table.trim()}` : "", floor.trim() ? `floor-${floor.trim()}` : ""]
                    .filter(Boolean)
                    .join("-") || "general";

            downloadjs(
                dataURL,
                `${restaurantName.toLowerCase().replace(/\s+/g, "-")}-${fileSuffix}-qr.png`,
                "image/png"
            );
        } catch (err) {
            console.error("Failed to capture QR code card", err);
        } finally {
            qrCodeElement.style.border = originalBorder;
        }
    };

    return (
        <Modal onClose={onClose} opened={opened} size="md" title="Generate Table QR Code">
            <Stack spacing="md">
                <Text color="dimmed" size="sm">
                    Create table-specific QR codes to place on tables. Scanning will pre-fill the customer's seating
                    location during checkout.
                </Text>

                <Group grow spacing="sm">
                    <TextInput
                        label="Table Number"
                        onChange={(e) => setTable(e.target.value)}
                        placeholder="e.g. 5, 12A, Bar-3"
                        value={table}
                    />
                    <TextInput
                        label="Floor / Section (Optional)"
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="e.g. Ground Floor, Garden, Rooftop"
                        value={floor}
                    />
                </Group>

                <Box bg={theme.colors.gray[0]} p="sm" sx={{ borderRadius: theme.radius.md }}>
                    <Text color="dimmed" mb={4} size="xs" weight={700}>
                        TARGET LINK
                    </Text>
                    <Group noWrap position="apart">
                        <Text
                            color="dark.8"
                            size="xs"
                            sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                            {generatedUrl}
                        </Text>
                        <CopyButton value={generatedUrl}>
                            {({ copied, copy }) => (
                                <Tooltip label={copied ? "Copied" : "Copy"} position="left" withArrow>
                                    <ActionIcon color={copied ? "green" : "gray"} onClick={copy} size="sm">
                                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </CopyButton>
                    </Group>
                </Box>

                {/* Printable Card Area */}
                <Box
                    className="table-qr-code-canvas"
                    sx={{
                        alignItems: "center",
                        backgroundColor: theme.white,
                        border: `1px dashed ${theme.colors.gray[4]}`,
                        borderRadius: theme.radius.lg,
                        boxShadow: theme.shadows.xs,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        margin: "10px auto",
                        maxWidth: 320,
                        padding: "30px 20px",
                    }}
                >
                    <Text
                        align="center"
                        color="dark.8"
                        mb={4}
                        size="xl"
                        sx={{ width: "100%", wordBreak: "break-word" }}
                        weight={700}
                    >
                        {restaurantName}
                    </Text>
                    {(table.trim() || floor.trim()) && (
                        <Text align="center" color="primary.6" mb="md" size="sm" weight={700}>
                            {table.trim() && `TABLE ${table.trim().toUpperCase()}`}
                            {table.trim() && floor.trim() && "  •  "}
                            {floor.trim() && floor.trim().toUpperCase()}
                        </Text>
                    )}
                    <svg width="0" height="0" style={{ position: "absolute", zIndex: -1 }}>
                        <defs>
                            <filter id="qr-rounded-filter-table">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
                                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                            </filter>
                            <filter id="qr-dot-filter-table">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="goo" />
                                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                            </filter>
                        </defs>
                    </svg>

                    <Box
                        p="md"
                        sx={{
                            backgroundColor: qrBgColor,
                            border: `1px solid ${theme.colors.gray[2]}`,
                            borderRadius: theme.radius.md,
                        }}
                    >
                        <div style={{ position: "relative", display: "inline-block", width: 180, height: 180 }}>
                            <QRCode
                                fgColor={qrFgColor}
                                bgColor={qrBgColor}
                                style={{
                                    filter: qrStyle === "ROUNDED" ? "url(#qr-rounded-filter-table)" : qrStyle === "DOT" ? "url(#qr-dot-filter-table)" : "none",
                                    height: "auto",
                                    maxWidth: "100%",
                                    width: "100%"
                                }}
                                value={generatedUrl}
                            />
                            {activeLogoUrl && (
                                <div style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    backgroundColor: qrBgColor,
                                    padding: "4px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "20%",
                                    height: "20%",
                                    border: `2px solid ${qrFgColor}`,
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
                    <Text align="center" color="gray.5" mt="md" size="xs" style={{ letterSpacing: 1 }} weight={500}>
                        SCAN TO ORDER
                    </Text>
                </Box>

                <Center mt="xs">
                    <Button
                        color="primary"
                        leftIcon={<IconDownload size={16} />}
                        onClick={handleDownloadQr}
                        variant="light"
                    >
                        Download PNG Card
                    </Button>
                </Center>
            </Stack>
        </Modal>
    );
};
