import { useMemo, useState } from "react";
import {
    Box,
    Breadcrumbs,
    Button,
    Center,
    Container,
    Divider,
    Flex,
    Group,
    Loader,
    Paper,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Title,
    useMantineTheme,
} from "@mantine/core";
import { IconArrowLeft, IconDownload, IconHistory, IconSearch, IconTerminal } from "@tabler/icons";
import download from "downloadjs";
import { type NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";

import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";

// Decode helper to convert compressed database action codes into terminal descriptions
const decodeAction = (actionCode: string, payload: string | null): string => {
    if (!payload) return "Action executed.";
    const parts = payload.split("|");

    switch (actionCode) {
        // Restaurant actions
        case "RN":
            return `UPDATE: Settings -> Changed restaurant name from "${parts[0] || ""}" to "${parts[1] || ""}"`;
        case "RL":
            return `UPDATE: Settings -> Changed location from "${parts[0] || ""}" to "${parts[1] || ""}"`;
        case "RC":
            return `UPDATE: Settings -> Changed contact no. from "${parts[0] || ""}" to "${parts[1] || ""}"`;
        case "RW":
            return `UPDATE: Settings -> Changed WhatsApp contact from "${parts[0] || "None"}" to "${parts[1] || "None"}"`;
        case "RCO":
            return `UPDATE: Settings -> Changed currency token from "${parts[0] || ""}" to "${parts[1] || ""}"`;
        case "RK":
            return `CONFIG: Toggled Kitchen Screen feature: ${parts[1] === "true" ? "ENABLED" : "DISABLED"}`;
        case "RO":
            return `CONFIG: Toggled Table Ordering feature: ${parts[1] === "true" ? "ENABLED" : "DISABLED"}`;
        case "RP":
            return `CONFIG: Changed restaurant publish visibility to: ${parts[1] === "true" ? "PUBLISHED" : "DRAFT"}`;

        // Menu actions
        case "MC":
            return `CREATE: Menu -> Created new menu category folder "${parts[1] || ""}" (ID: ${parts[0]})`;
        case "MD":
            return `DELETE: Menu -> Removed menu folder "${parts[1] || ""}" (ID: ${parts[0]})`;
        case "MU":
            return `UPDATE: Menu -> Renamed menu folder from "${parts[1] || ""}" to "${parts[2] || ""}"`;

        // Category actions
        case "CC":
            return `CREATE: Category -> Added food category section "${parts[1] || ""}" (ID: ${parts[0]})`;
        case "CD":
            return `DELETE: Category -> Removed food category section "${parts[1] || ""}" (ID: ${parts[0]})`;
        case "CU":
            return `UPDATE: Category -> Renamed category section from "${parts[1] || ""}" to "${parts[2] || ""}"`;

        // MenuItem actions
        case "IC":
            return `CREATE: MenuItem -> Added menu dish "${parts[1] || ""}" (Price: ${parts[2] || "0"}) (ID: ${parts[0]})`;
        case "ID":
            return `DELETE: MenuItem -> Removed menu dish "${parts[1] || ""}" (ID: ${parts[0]})`;
        case "IU":
            return `UPDATE: MenuItem -> Renamed dish from "${parts[1] || ""}" to "${parts[2] || ""}"`;

        // App operations
        case "ON":
            return `RECEIVE: Table Order -> Customer submitted new order (Order ID: ${parts[0]}, Table: ${parts[1] || "None"})`;
        case "OS":
            return `STATUS: Table Order -> Changed status of Order ${parts[0]} (${parts[1] || "PENDING"} → ${parts[2] || "PENDING"})`;
        case "WC":
            return `ALERT: Table Call -> Table assistant alert requested "${parts[0]}" at Table ${parts[1] || "None"}`;
        case "WR":
            return `ALERT: Table Call -> Resolved table assistant alert "${parts[0]}" at Table ${parts[1] || "None"}`;
        case "LV":
            return `REWARD: Customer Loyalty -> Customer visit registered for ${parts[0]} (Visit count: ${parts[1] || "0"} → ${parts[2] || "1"})`;
        
        default:
            return `EXEC: Action [${actionCode}] with payload: "${payload}"`;
    }
};

const ActivityLogsPage: NextPage = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const restaurantId = router.query?.restaurantId as string;
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch restaurant details for breadcrumbs
    const { data: restaurant } = api.restaurant.get.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    // Fetch compressed audit logs from db
    const { data: logs = [], isLoading } = api.auditLog.getByRestaurant.useQuery(
        { restaurantId },
        { enabled: !!restaurantId }
    );

    // Format logs for display
    const formattedLogs = useMemo(() => {
        return logs.map((log: any) => {
            const desc = decodeAction(log.actionCode, log.payload);
            return {
                ...log,
                description: desc,
                formattedDate: new Date(log.createdAt).toISOString().replace("T", " ").substring(0, 19),
            };
        });
    }, [logs]);

    // Search query filter
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return formattedLogs;
        const q = searchQuery.toLowerCase();
        return formattedLogs.filter(
            (log: any) =>
                log.description.toLowerCase().includes(q) ||
                log.actionCode.toLowerCase().includes(q) ||
                log.formattedDate.toLowerCase().includes(q) ||
                (log.userId && log.userId.toLowerCase().includes(q))
        );
    }, [formattedLogs, searchQuery]);

    // Export logs to CSV
    const handleExportCSV = () => {
        if (filteredLogs.length === 0) return;

        const headers = ["Timestamp", "Action Code", "Logs Description", "Initiated By"];
        const rows = filteredLogs.map((log: any) => [
            `"${log.formattedDate.replace(/"/g, '""')}"`,
            `"${log.actionCode.replace(/"/g, '""')}"`,
            `"${log.description.replace(/"/g, '""')}"`,
            `"${(log.userId || "System").replace(/"/g, '""')}"`,
        ]);

        const csvContent = [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        
        const fileName = `${restaurant?.name || "restaurant"}_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        download(blob, fileName, "text/csv");
    };

    return (
        <>
            <NextSeo description="View and export restaurant activity logs in a developer terminal style" title="Activity Terminal Logs" />
            <main>
                <AppShell>
                    <Container py="xl" size="xl">
                        <Stack spacing="lg">
                            {/* Navigation / Header */}
                            <Flex align="center" justify="space-between" wrap="wrap">
                                <Box>
                                    <Breadcrumbs color={theme.black} mb="xs">
                                        <Link href="/restaurant">Restaurants</Link>
                                        <Link href={`/restaurant/${restaurantId}`}>{restaurant?.name || "Restaurant"}</Link>
                                        <Text>Activity Logs</Text>
                                    </Breadcrumbs>
                                    <Title order={1} size="1.8rem">
                                        Activity & Audit Logs
                                    </Title>
                                    <Text color="dimmed" size="xs">
                                        Real-time system events rendered inside an emulation terminal.
                                    </Text>
                                </Box>

                                <Group spacing="sm">
                                    <Link href={`/restaurant/${restaurantId}`} passHref>
                                        <Button color="gray" leftIcon={<IconArrowLeft size={16} />} variant="subtle">
                                            Back
                                        </Button>
                                    </Link>
                                    <Button
                                        color="primary"
                                        disabled={filteredLogs.length === 0}
                                        leftIcon={<IconDownload size={16} />}
                                        onClick={handleExportCSV}
                                    >
                                        Export to CSV
                                    </Button>
                                </Group>
                            </Flex>

                            <Divider />

                            {/* Search Filter */}
                            <Paper p="md" radius="md" withBorder>
                                <Flex align="center" gap="md" justify="space-between" wrap="wrap">
                                    <TextInput
                                        icon={<IconSearch size={16} />}
                                        onChange={(e: any) => setSearchQuery(e.target.value)}
                                        placeholder="Filter logs by keyword or code..."
                                        style={{ flexGrow: 1, maxWidth: 400 }}
                                        value={searchQuery}
                                    />
                                    <Text color="dimmed" size="sm" style={{ fontFamily: "monospace" }}>
                                        $ grep count: {filteredLogs.length} / total: {formattedLogs.length}
                                    </Text>
                                </Flex>
                            </Paper>

                            {/* Developer Monospace Terminal Interface */}
                            <Paper
                                p="md"
                                radius="md"
                                shadow="md"
                                style={{
                                    backgroundColor: "#121212",
                                    border: "2px solid #2d2d2d",
                                    borderRadius: "16px",
                                    color: "#e0e0e0",
                                    fontFamily: "Fira Code, JetBrains Mono, Monaco, Courier New, monospace",
                                    position: "relative",
                                }}
                            >
                                {/* Terminal Bar */}
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    pb="sm"
                                    style={{ borderBottom: "1px solid #2d2d2d" }}
                                >
                                    <Flex gap="xs">
                                        <Box style={{ backgroundColor: "#ff5f56", borderRadius: "50%", height: 12, width: 12 }} />
                                        <Box style={{ backgroundColor: "#ffbd2e", borderRadius: "50%", height: 12, width: 12 }} />
                                        <Box style={{ backgroundColor: "#27c93f", borderRadius: "50%", height: 12, width: 12 }} />
                                    </Flex>
                                    <Flex align="center" gap="xs">
                                        <IconTerminal color="#4af626" size={14} />
                                        <Text size="xs" style={{ color: "#888", letterSpacing: "0.5px" }}>
                                            bash - menuease@console:~/{restaurant?.name?.toLowerCase().replace(/\s+/g, "-") || "restaurant"}
                                        </Text>
                                    </Flex>
                                    <Box style={{ width: 40 }} />
                                </Flex>

                                <Box pt="md">
                                    {isLoading ? (
                                        <Center h="30vh">
                                            <Stack align="center" spacing="xs">
                                                <Loader color="green" size="md" />
                                                <Text size="xs" style={{ color: "#4af626" }}>$ fetching_audit_logs --verbose</Text>
                                            </Stack>
                                        </Center>
                                    ) : filteredLogs.length === 0 ? (
                                        <Center h="30vh">
                                            <Stack align="center" spacing="xs">
                                                <IconHistory color="#555" size={40} />
                                                <Text size="sm" style={{ color: "#888" }}>
                                                    $ cat audit.log
                                                </Text>
                                                <Text size="xs" style={{ color: "#ff5f56" }}>
                                                    [EOF] No system log entries found matching criteria.
                                                </Text>
                                            </Stack>
                                        </Center>
                                    ) : (
                                        <ScrollArea h={550}>
                                            <Stack spacing={8} style={{ paddingRight: "15px" }}>
                                                {filteredLogs.map((log: any) => (
                                                    <Box
                                                        key={log.id}
                                                        style={{
                                                            borderLeft: "2px solid #2d2d2d",
                                                            fontSize: "13px",
                                                            lineHeight: "1.6",
                                                            paddingLeft: "10px",
                                                            wordBreak: "break-all",
                                                        }}
                                                    >
                                                        <Flex gap="xs" wrap="wrap" align="baseline">
                                                            {/* Timestamp */}
                                                            <Text span style={{ color: "#808080" }}>
                                                                [{log.formattedDate}]
                                                            </Text>
                                                            {/* Action Code badge */}
                                                            <Text
                                                                span
                                                                style={{
                                                                    backgroundColor: "rgba(74, 246, 38, 0.1)",
                                                                    borderRadius: "4px",
                                                                    color: "#4af626",
                                                                    fontSize: "11px",
                                                                    fontWeight: "bold",
                                                                    padding: "1px 5px",
                                                                }}
                                                            >
                                                                {log.actionCode}
                                                            </Text>
                                                            {/* Description text */}
                                                            <Text span style={{ color: "#dcdccc" }}>
                                                                {log.description}
                                                            </Text>
                                                            {/* User label */}
                                                            <Text span style={{ color: "#5f8787", fontSize: "11px" }}>
                                                                (actor: {log.userId ? log.userId.substring(0, 16) : "public_client"})
                                                            </Text>
                                                        </Flex>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </ScrollArea>
                                    )}
                                </Box>
                            </Paper>
                        </Stack>
                    </Container>
                </AppShell>
            </main>
        </>
    );
};

export default ActivityLogsPage;
