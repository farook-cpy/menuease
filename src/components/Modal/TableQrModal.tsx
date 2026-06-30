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

    const generatedUrl = useMemo(() => {
        let url = `${origin}/restaurant/${restaurantId}/menu`;
        const params = new URLSearchParams();
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
                    <Box
                        p="md"
                        sx={{
                            backgroundColor: theme.white,
                            border: `1px solid ${theme.colors.gray[2]}`,
                            borderRadius: theme.radius.md,
                        }}
                    >
                        <QRCode style={{ height: "auto", maxWidth: "100%", width: 180 }} value={generatedUrl} />
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
