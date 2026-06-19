import type { FC } from "react";
import { useState, useMemo } from "react";
import {
    TextInput,
    Button,
    Group,
    Stack,
    Box,
    Center,
    Text,
    CopyButton,
    ActionIcon,
    Tooltip,
    useMantineTheme,
} from "@mantine/core";
import { IconDownload, IconCopy, IconCheck } from "@tabler/icons";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import downloadjs from "downloadjs";
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
                useCORS: true,
                backgroundColor: "#ffffff",
                scale: 2, // Double resolution for crisp print results
            });
            const dataURL = canvas.toDataURL("image/png");
            
            const fileSuffix = [
                table.trim() ? `table-${table.trim()}` : "",
                floor.trim() ? `floor-${floor.trim()}` : "",
            ].filter(Boolean).join("-") || "general";

            downloadjs(dataURL, `${restaurantName.toLowerCase().replace(/\s+/g, "-")}-${fileSuffix}-qr.png`, "image/png");
        } catch (err) {
            console.error("Failed to capture QR code card", err);
        } finally {
            qrCodeElement.style.border = originalBorder;
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} size="md" title="Generate Table QR Code">
            <Stack spacing="md">
                <Text size="sm" color="dimmed">
                    Create table-specific QR codes to place on tables. Scanning will pre-fill the customer's seating location during checkout.
                </Text>

                <Group grow spacing="sm">
                    <TextInput
                        label="Table Number"
                        placeholder="e.g. 5, 12A, Bar-3"
                        value={table}
                        onChange={(e) => setTable(e.target.value)}
                    />
                    <TextInput
                        label="Floor / Section (Optional)"
                        placeholder="e.g. Ground Floor, Garden, Rooftop"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                    />
                </Group>

                <Box bg={theme.colors.gray[0]} p="sm" sx={{ borderRadius: theme.radius.md }}>
                    <Text size="xs" weight={700} color="dimmed" mb={4}>
                        TARGET LINK
                    </Text>
                    <Group position="apart" noWrap>
                        <Text size="xs" color="dark.8" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
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
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "30px 20px",
                        backgroundColor: theme.white,
                        borderRadius: theme.radius.lg,
                        border: `1px dashed ${theme.colors.gray[4]}`,
                        maxWidth: 320,
                        margin: "10px auto",
                        boxShadow: theme.shadows.xs,
                    }}
                >
                    <Text weight={700} size="xl" color="dark.8" align="center" mb={4} sx={{ width: "100%", wordBreak: "break-word" }}>
                        {restaurantName}
                    </Text>
                    {(table.trim() || floor.trim()) && (
                        <Text size="sm" color="primary.6" align="center" mb="md" weight={700}>
                            {table.trim() && `TABLE ${table.trim().toUpperCase()}`}
                            {table.trim() && floor.trim() && "  •  "}
                            {floor.trim() && floor.trim().toUpperCase()}
                        </Text>
                    )}
                    <Box p="md" sx={{ backgroundColor: theme.white, border: `1px solid ${theme.colors.gray[2]}`, borderRadius: theme.radius.md }}>
                        <QRCode style={{ height: "auto", maxWidth: "100%", width: 180 }} value={generatedUrl} />
                    </Box>
                    <Text size="xs" color="gray.5" align="center" mt="md" weight={500} style={{ letterSpacing: 1 }}>
                        SCAN TO ORDER
                    </Text>
                </Box>

                <Center mt="xs">
                    <Button leftIcon={<IconDownload size={16} />} onClick={handleDownloadQr} color="primary" variant="light">
                        Download PNG Card
                    </Button>
                </Center>
            </Stack>
        </Modal>
    );
};
