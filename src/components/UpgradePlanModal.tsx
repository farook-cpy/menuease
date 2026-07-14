import type { FC } from "react";
import { Badge, Button, Card, Flex, Group, Modal, SimpleGrid, Stack, Text, Title, useMantineTheme, Divider } from "@mantine/core";
import { IconCheck, IconCrown, IconDiscount2, IconStar, IconDeviceDesktop } from "@tabler/icons";

interface UpgradePlanModalProps {
    opened: boolean;
    onClose: () => void;
    restaurantId: string;
    restaurantName: string;
    targetPlan?: "Starter" | "Professional" | "Premium";
}

export const UpgradePlanModal: FC<UpgradePlanModalProps> = ({
    opened,
    onClose,
    restaurantId,
    restaurantName,
    targetPlan,
}) => {
    const theme = useMantineTheme();

    const handleUpgrade = (plan: "Starter" | "Professional" | "Premium") => {
        const message = `Hi! I would like to renew/upgrade my restaurant "${restaurantName}" (ID: ${restaurantId}) to the "${plan}" plan.`;
        const whatsappUrl = `https://wa.me/918547118867?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
        onClose();
    };

    const plans = [
        {
            name: "Starter" as const,
            price: "₹4,999",
            badge: "Entry",
            color: "gray",
            icon: <IconDeviceDesktop size={20} />,
            features: [
                "QR Digital Menu",
                "CMS Dashboard",
                "Unlimited Menu Items",
                "Categories & Food Photos",
                "WhatsApp Button Ordering",
                "Instant Updates & Support",
            ],
        },
        {
            name: "Professional" as const,
            price: "₹7,999",
            badge: "Popular",
            color: "red",
            icon: <IconStar size={20} color={theme.colors.red[6]} />,
            features: [
                "NFC Support",
                "Search bar in Menu",
                "Featured/Special Items",
                "Out of Stock Toggle",
                "Multi-language Menu",
                "Basic Analytics (Stats)",
                "Customer Reviews (Feedback)",
                "Priority Support",
            ],
        },
        {
            name: "Premium" as const,
            price: "₹11,999",
            badge: "Ultimate",
            color: "yellow",
            icon: <IconCrown size={20} color={theme.colors.yellow[6]} />,
            features: [
                "Loyalty Program",
                "Festival Banner Themes",
                "Promotional Banners",
                "Multi-Branch Support",
                "Staff Accounts",
                "Advanced Analytics",
                "Early Access Features",
                "Monthly/Annual Reports",
            ],
        },
    ];

    return (
        <Modal
            onClose={onClose}
            opened={opened}
            size="xl"
            title={
                <Group spacing="xs">
                    <IconDiscount2 size={24} color={theme.colors.red[6]} />
                    <Title order={3}>Upgrade / Renew Subscription</Title>
                </Group>
            }
            styles={{
                modal: {
                    borderRadius: "16px",
                    padding: "24px !important",
                },
            }}
        >
            <Stack spacing="lg">
                <Text color="dimmed" size="sm">
                    Select a plan to upgrade or renew. You will be redirected to WhatsApp to confirm payment and activate your plan.
                </Text>

                <SimpleGrid
                    breakpoints={[
                        { cols: 3, minWidth: "md" },
                        { cols: 1, minWidth: "xs" },
                    ]}
                    cols={1}
                >
                    {plans.map((p) => {
                        const isTarget = targetPlan === p.name;
                        return (
                            <Card
                                key={p.name}
                                p="md"
                                radius="md"
                                shadow="sm"
                                style={{
                                    border: isTarget
                                        ? `2px solid ${theme.colors[p.color]?.[6] || p.color}`
                                        : `1px solid ${theme.colors.gray[2]}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    position: "relative",
                                }}
                            >
                                <Stack spacing="xs">
                                    <Group position="apart">
                                        <Group spacing="xs">
                                            {p.icon}
                                            <Text size="lg" weight={700}>
                                                {p.name}
                                            </Text>
                                        </Group>
                                        <Badge color={p.color} variant="light">
                                            {p.badge}
                                        </Badge>
                                    </Group>

                                    <Flex align="baseline" gap={2} mt="xs">
                                        <Text size="xl" weight={800} color={isTarget ? p.color : "dark"}>
                                            {p.price}
                                        </Text>
                                        <Text size="xs" color="dimmed">
                                            /year
                                        </Text>
                                    </Flex>

                                    <Divider my="sm" />

                                    <Stack spacing="xs">
                                        {p.features.map((f) => (
                                            <Group key={f} spacing={6} align="center">
                                                <IconCheck size={14} color={theme.colors.green[6]} />
                                                <Text size="xs" color="dimmed">
                                                    {f}
                                                </Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Stack>

                                <Button
                                    color={p.color}
                                    fullWidth
                                    mt="lg"
                                    onClick={() => handleUpgrade(p.name)}
                                    radius="md"
                                    variant={isTarget ? "filled" : "outline"}
                                >
                                    {isTarget ? "Select & Upgrade" : `Get ${p.name}`}
                                </Button>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            </Stack>
        </Modal>
    );
};
