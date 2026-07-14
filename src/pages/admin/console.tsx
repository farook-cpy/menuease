import { useState } from "react";

import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Grid,
    Group,
    Loader,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Table,
    Tabs,
    Text,
    TextInput,
    Title,
    Tooltip,
} from "@mantine/core";
import {
    IconArrowLeft,
    IconChartBar,
    IconCreditCard,
    IconFileText,
    IconHistory,
    IconPlus,
    IconPrinter,
    IconQrcode,
    IconSettings,
    IconTrash,
    IconTrendingDown,
    IconUserPlus,
    IconUsers,
    IconWallet,
} from "@tabler/icons";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

import { AppShell } from "src/components/AppShell";
import { TableQrModal } from "src/components/Modal";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";

const AdminConsolePage: NextPage = () => {
    const router = useRouter();
    const trpcCtx = api.useContext();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Admin");
    const [submitting, setSubmitting] = useState(false);

    // Billing states
    const [selectedRest, setSelectedRest] = useState<any>(null);
    const [modalType, setModalType] = useState<string | null>(null); // 'subscription', 'transaction', 'history', 'invoice'
    const [tableQrRest, setTableQrRest] = useState<any>(null);

    // Billing form fields
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
    const [paymentDesc, setPaymentDesc] = useState<string>("");

    const [adjType, setAdjType] = useState<string>("income"); // "income" or "expense"
    const [recordPayment, setRecordPayment] = useState<boolean>(false);

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Unified Subscription state
    const [subPlanName, setSubPlanName] = useState<string>("Free Trial");
    const [subStatus, setSubStatus] = useState<string>("trial");
    const [subExpiresAt, setSubExpiresAt] = useState<string>("");
    const [subTrialEndsAt, setSubTrialEndsAt] = useState<string>("");
    const [subCurrency, setSubCurrency] = useState<string>("INR");
    const [subIsOrderFeatureEnabled, setSubIsOrderFeatureEnabled] = useState<boolean>(false);
    const [subWhatsappNo, setSubWhatsappNo] = useState<string>("");
    const [subIsKitchenEnabled, setSubIsKitchenEnabled] = useState<boolean>(false);
    const [subEnterpriseFeatures, setSubEnterpriseFeatures] = useState<string[]>([]);
    const [subInstagramUrl, setSubInstagramUrl] = useState<string>("");
    const [subFacebookUrl, setSubFacebookUrl] = useState<string>("");
    const [subTwitterUrl, setSubTwitterUrl] = useState<string>("");
    const [subYoutubeUrl, setSubYoutubeUrl] = useState<string>("");
    const [subTiktokUrl, setSubTiktokUrl] = useState<string>("");

    // Queries
    const { data: userRole, isLoading: loadingRole } = api.admin.getRole.useQuery();
    const isAdminUser = userRole === "Super Admin" || userRole === "Admin";

    const { data: admins = [], isLoading: loadingAdmins } = api.admin.getAdmins.useQuery(undefined, {
        enabled: userRole === "Super Admin",
    });
    const { data: logs = [], isLoading: loadingLogs } = api.admin.getLoginLogs.useQuery(undefined, {
        enabled: userRole === "Super Admin",
    });
    const { data: billingSummary, isLoading: loadingSummary } = api.billing.getSummary.useQuery(undefined, {
        enabled: isAdminUser,
    });
    const { data: billingRestaurants = [], isLoading: loadingBilling } = api.billing.getAll.useQuery(undefined, {
        enabled: isAdminUser,
    });
    const { data: billingHistory = [], isLoading: loadingHistory } = api.billing.getHistory.useQuery(
        { restaurantId: selectedRest?.id || "" },
        { enabled: !!selectedRest && modalType === "history" }
    );

    // Billing Mutations
    const { mutate: enterTransaction, isLoading: enteringTransaction } = api.billing.enterTransaction.useMutation({
        onError: (err: any) => showErrorToast("Failed to record transaction", err),
        onSuccess: () => {
            showSuccessToast("Transaction Recorded", "Transaction successfully logged in ledger");
            setModalType(null);
            setPaymentAmount(0);
            setPaymentDesc("");
            trpcCtx.billing.getAll.invalidate();
            trpcCtx.billing.getSummary.invalidate();
        },
    });

    const { mutate: updateSubscription, isLoading: updatingSubscription } = api.billing.updateSubscription.useMutation({
        onError: (err: any) => showErrorToast("Failed to update subscription", err),
        onSuccess: () => {
            showSuccessToast("Subscription Updated", "Subscription properties manually updated successfully");
            setModalType(null);
            trpcCtx.billing.getAll.invalidate();
            trpcCtx.billing.getSummary.invalidate();
        },
    });

    const { mutate: setCurrency, isLoading: settingCurrency } = api.restaurant.setCurrency.useMutation({
        onError: (err: any) => showErrorToast("Failed to set currency", err),
        onSuccess: () => {
            showSuccessToast("Currency Updated", "Restaurant currency has been changed successfully");
            trpcCtx.billing.getAll.invalidate();
        },
    });

    // Mutations
    const { mutate: createAdmin } = api.admin.createAdmin.useMutation({
        onError: (err: any) => showErrorToast("Failed to create admin", err),
        onMutate: () => setSubmitting(true),
        onSettled: () => setSubmitting(false),
        onSuccess: () => {
            setEmail("");
            showSuccessToast("Admin Created", "Successfully added new administrator");
        },
    });

    const { mutate: deleteAdmin } = api.admin.deleteAdmin.useMutation({
        onError: (err: any) => showErrorToast("Failed to delete admin", err),
        onSuccess: () => {
            showSuccessToast("Admin Deleted", "Successfully removed administrator");
        },
    });

    if (loadingRole) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    if (userRole !== "Super Admin" && userRole !== "Admin") {
        return (
            <Center h="100vh">
                <Stack align="center" spacing="sm">
                    <Title color="red" order={3}>
                        Access Denied
                    </Title>
                    <Text>This console is restricted to administrator accounts.</Text>
                    <Button color="primary" onClick={() => router.push("/restaurant")}>
                        Go to Dashboard
                    </Button>
                </Stack>
            </Center>
        );
    }

    const handleAddAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        createAdmin({ email: email.trim().toLowerCase(), role });
    };

    return (
        <main>
            <AppShell>
                <Container py="xl" size="lg">
                    <Group mb="xl" position="apart">
                        <Stack spacing="xs">
                            <Group>
                                <ActionIcon
                                    color="primary"
                                    onClick={() => router.push("/restaurant")}
                                    size="lg"
                                    variant="light"
                                >
                                    <IconArrowLeft size={18} />
                                </ActionIcon>
                                <Title order={2}>Admin Control Panel</Title>
                            </Group>
                            <Text color="dimmed" size="sm">
                                Manage system administrators, roles, and review authentication logs.
                            </Text>
                        </Stack>
                    </Group>

                    <Tabs color="primary" defaultValue={userRole === "Super Admin" ? "admins" : "billing"}>
                        <Tabs.List mb="lg">
                            {userRole === "Super Admin" && (
                                <Tabs.Tab icon={<IconUsers size={16} />} value="admins">
                                    Admin Users & Roles
                                </Tabs.Tab>
                            )}
                            {userRole === "Super Admin" && (
                                <Tabs.Tab icon={<IconHistory size={16} />} value="logs">
                                    Login History
                                </Tabs.Tab>
                            )}
                            <Tabs.Tab icon={<IconCreditCard size={16} />} value="billing">
                                Billing & Revenue
                            </Tabs.Tab>
                        </Tabs.List>

                        {userRole === "Super Admin" && (
                            <Tabs.Panel value="admins">
                                <Stack spacing="lg">
                                    <Card p="md" radius="md" shadow="sm" withBorder>
                                        <Title mb="md" order={4}>
                                            Add New Administrator
                                        </Title>
                                        <form onSubmit={handleAddAdmin}>
                                            <Group align="flex-end" spacing="md">
                                                <TextInput
                                                    disabled={submitting}
                                                    label="Admin Email"
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="user@example.com"
                                                    required
                                                    style={{ flexGrow: 1 }}
                                                    value={email}
                                                />
                                                <Select
                                                    data={[
                                                        { label: "Admin", value: "Admin" },
                                                        { label: "Super Admin", value: "Super Admin" },
                                                    ]}
                                                    disabled={submitting}
                                                    label="Assigned Role"
                                                    onChange={(val) => setRole(val || "Admin")}
                                                    style={{ width: 180 }}
                                                    value={role}
                                                />
                                                <Button
                                                    color="primary"
                                                    leftIcon={<IconUserPlus size={16} />}
                                                    loading={submitting}
                                                    type="submit"
                                                >
                                                    Add User
                                                </Button>
                                            </Group>
                                        </form>
                                    </Card>

                                    <Card p="md" radius="md" shadow="sm" withBorder>
                                        <Title mb="md" order={4}>
                                            Current Administrators
                                        </Title>
                                        {loadingAdmins ? (
                                            <Center py="xl">
                                                <Loader />
                                            </Center>
                                        ) : (
                                            <Table highlightOnHover horizontalSpacing="md" striped verticalSpacing="sm">
                                                <thead>
                                                    <tr>
                                                        <th>Email Address</th>
                                                        <th>Role</th>
                                                        <th>Added At</th>
                                                        <th style={{ width: 80 }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Always show the hardcoded superadmin */}
                                                    <tr>
                                                        <td>
                                                            <Text weight={500}>farookisop@gmail.com</Text>
                                                        </td>
                                                        <td>
                                                            <Badge color="primary" variant="filled">
                                                                System Super Admin
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Text color="dimmed" size="xs">
                                                                System Account
                                                            </Text>
                                                        </td>
                                                        <td />
                                                    </tr>
                                                    {admins.map((admin: any) => (
                                                        <tr key={admin.id}>
                                                            <td>{admin.email}</td>
                                                            <td>
                                                                <Badge
                                                                    color={
                                                                        admin.role === "Super Admin"
                                                                            ? "primary"
                                                                            : "blue"
                                                                    }
                                                                    variant="light"
                                                                >
                                                                    {admin.role}
                                                                </Badge>
                                                            </td>
                                                            <td>{new Date(admin.createdAt).toLocaleString()}</td>
                                                            <td>
                                                                <ActionIcon
                                                                    color="red"
                                                                    onClick={() => deleteAdmin({ id: admin.id })}
                                                                    title="Remove Admin"
                                                                    variant="light"
                                                                >
                                                                    <IconTrash size={16} />
                                                                </ActionIcon>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        )}
                                    </Card>
                                </Stack>
                            </Tabs.Panel>
                        )}

                        {userRole === "Super Admin" && (
                            <Tabs.Panel value="logs">
                                <Card p="md" radius="md" shadow="sm" withBorder>
                                    <Title mb="md" order={4}>
                                        Authentication Logs
                                    </Title>
                                    {loadingLogs ? (
                                        <Center py="xl">
                                            <Loader />
                                        </Center>
                                    ) : (
                                        <Table highlightOnHover horizontalSpacing="md" striped verticalSpacing="sm">
                                            <thead>
                                                <tr>
                                                    <th>User / Account Name</th>
                                                    <th>Role</th>
                                                    <th>Login Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {logs.map((log: any) => (
                                                    <tr key={log.id}>
                                                        <td>{log.username}</td>
                                                        <td>
                                                            <Badge
                                                                color={
                                                                    log.role === "Super Admin" ||
                                                                    log.role === "System Super Admin"
                                                                        ? "primary"
                                                                        : log.role === "Admin"
                                                                        ? "blue"
                                                                        : "green"
                                                                }
                                                                variant="light"
                                                            >
                                                                {log.role}
                                                            </Badge>
                                                        </td>
                                                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {logs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3}>
                                                            <Text align="center" color="dimmed" py="xl">
                                                                No authentication history found.
                                                            </Text>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    )}
                                </Card>
                            </Tabs.Panel>
                        )}

                        <Tabs.Panel value="billing">
                            <Stack spacing="lg">
                                {/* Statistics Dashboard */}
                                <Card p="md" radius="md" shadow="sm" withBorder>
                                    <Title mb="md" order={4}>
                                        Billing Summary & Financials
                                    </Title>
                                    {loadingSummary ? (
                                        <Center py="md">
                                            <Loader />
                                        </Center>
                                    ) : billingSummary ? (
                                        <Grid>
                                            <Grid.Col sm={3} xs={12}>
                                                <Card
                                                    p="md"
                                                    radius="md"
                                                    style={{ backgroundColor: "#f0fdf4" }}
                                                    withBorder
                                                >
                                                    <Group position="apart">
                                                        <Text color="dimmed" size="xs" weight={700}>
                                                            TOTAL INCOME
                                                        </Text>
                                                        <IconChartBar color="#16a34a" size={20} />
                                                    </Group>
                                                    <Title color="green" mt="sm" order={3}>
                                                        ${billingSummary.totalIncome.toFixed(2)}
                                                    </Title>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col sm={3} xs={12}>
                                                <Card
                                                    p="md"
                                                    radius="md"
                                                    style={{ backgroundColor: "#fef2f2" }}
                                                    withBorder
                                                >
                                                    <Group position="apart">
                                                        <Text color="dimmed" size="xs" weight={700}>
                                                            TOTAL EXPENSES
                                                        </Text>
                                                        <IconTrendingDown color="#dc2626" size={20} />
                                                    </Group>
                                                    <Title color="red" mt="sm" order={3}>
                                                        ${billingSummary.totalExpense.toFixed(2)}
                                                    </Title>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col sm={3} xs={12}>
                                                <Card
                                                    p="md"
                                                    radius="md"
                                                    style={{ backgroundColor: "#f0f9ff" }}
                                                    withBorder
                                                >
                                                    <Group position="apart">
                                                        <Text color="dimmed" size="xs" weight={700}>
                                                            NET PROFIT
                                                        </Text>
                                                        <IconWallet color="#0284c7" size={20} />
                                                    </Group>
                                                    <Title color="blue" mt="sm" order={3}>
                                                        ${billingSummary.netProfit.toFixed(2)}
                                                    </Title>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col sm={3} xs={12}>
                                                <Card p="md" radius="md" withBorder>
                                                    <Group position="apart" spacing="xs">
                                                        <Stack spacing={4}>
                                                            <Text color="dimmed" size="xs" weight={500}>
                                                                ACTIVE SUBS:{" "}
                                                                <Text color="green" span weight={700}>
                                                                    {billingSummary.activeSubs}
                                                                </Text>
                                                            </Text>
                                                            <Text color="dimmed" size="xs" weight={500}>
                                                                ON FREE TRIAL:{" "}
                                                                <Text color="yellow" span weight={700}>
                                                                    {billingSummary.trialSubs}
                                                                </Text>
                                                            </Text>
                                                            <Text color="dimmed" size="xs" weight={500}>
                                                                EXPIRED SUBS:{" "}
                                                                <Text color="red" span weight={700}>
                                                                    {billingSummary.expiredSubs}
                                                                </Text>
                                                            </Text>
                                                        </Stack>
                                                        <IconCreditCard color="#7048e8" size={20} />
                                                    </Group>
                                                </Card>
                                            </Grid.Col>
                                        </Grid>
                                    ) : (
                                        <Text color="dimmed">No summary available</Text>
                                    )}
                                </Card>

                                {/* Restaurants Subscription Table */}
                                <Card p="md" radius="md" shadow="sm" withBorder>
                                    <Title mb="md" order={4}>
                                        Restaurants Subscription Statuses
                                    </Title>
                                    {loadingBilling ? (
                                        <Center py="xl">
                                            <Loader />
                                        </Center>
                                    ) : (
                                        <Table highlightOnHover horizontalSpacing="md" striped verticalSpacing="sm">
                                            <thead>
                                                <tr>
                                                    <th>Restaurant Name</th>
                                                    <th>Current Plan</th>
                                                    <th>Subscription Expiry / Trial End</th>
                                                    <th>Status</th>
                                                    <th style={{ width: 180 }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {billingRestaurants.map((rest: any) => {
                                                    const isExpired = rest.subscriptionStatus === "expired";
                                                    const isTrial = rest.subscriptionStatus === "trial";

                                                    let badgeColor = "green";
                                                    if (isExpired) badgeColor = "red";
                                                    else if (isTrial) badgeColor = "yellow";

                                                    let expiryText = "N/A";
                                                    if (isTrial && rest.trialEndsAt) {
                                                        expiryText = `Trial Ends: ${new Date(
                                                            rest.trialEndsAt
                                                        ).toLocaleDateString()}`;
                                                    } else if (rest.subscriptionExpiresAt) {
                                                        expiryText = `Expires: ${new Date(
                                                            rest.subscriptionExpiresAt
                                                        ).toLocaleDateString()}`;
                                                    }

                                                    return (
                                                        <tr key={rest.id}>
                                                            <td>
                                                                <Text weight={500}>{rest.name}</Text>
                                                            </td>
                                                            <td>
                                                                <Badge color="primary" variant="light">
                                                                    {rest.planName || "Free Trial"}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Text size="sm">{expiryText}</Text>
                                                            </td>
                                                            <td>
                                                                <Badge color={badgeColor} variant="filled">
                                                                    {rest.subscriptionStatus.toUpperCase()}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Group spacing="xs">
                                                                    <Tooltip label="Record Transaction (Income/Expense)">
                                                                        <ActionIcon
                                                                            color="teal"
                                                                            onClick={() => {
                                                                                setSelectedRest(rest);
                                                                                setModalType("transaction");
                                                                                setPaymentAmount(0);
                                                                                setPaymentDesc("");
                                                                                setAdjType("income");
                                                                            }}
                                                                            variant="light"
                                                                        >
                                                                            <IconPlus size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label="Manage Subscription/Plan">
                                                                        <ActionIcon
                                                                            color="primary"
                                                                            onClick={() => {
                                                                                setSelectedRest(rest);
                                                                                setSubPlanName(
                                                                                    rest.planName || "Free Trial"
                                                                                );
                                                                                setSubStatus(
                                                                                    rest.subscriptionStatus || "trial"
                                                                                );
                                                                                setSubExpiresAt(
                                                                                    rest.subscriptionExpiresAt
                                                                                        ? rest.subscriptionExpiresAt.substring(
                                                                                              0,
                                                                                              10
                                                                                          )
                                                                                        : ""
                                                                                );
                                                                                setSubTrialEndsAt(
                                                                                    rest.trialEndsAt
                                                                                        ? rest.trialEndsAt.substring(
                                                                                              0,
                                                                                              10
                                                                                          )
                                                                                        : ""
                                                                                );
                                                                                setSubCurrency(rest.currency || "INR");
                                                                                setSubIsOrderFeatureEnabled(
                                                                                    rest.isOrderFeatureEnabled || false
                                                                                );
                                                                                setSubWhatsappNo(rest.whatsappNo || "");
                                                                                setSubIsKitchenEnabled(
                                                                                    rest.isKitchenEnabled || false
                                                                                );
                                                                                const features = (rest as any).enterpriseFeatures || "";
                                                                                setSubEnterpriseFeatures(features.split(",").map((s: string) => s.trim()).filter(Boolean));
                                                                                setSubInstagramUrl((rest as any).instagramUrl || "");
                                                                                setSubFacebookUrl((rest as any).facebookUrl || "");
                                                                                setSubTwitterUrl((rest as any).twitterUrl || "");
                                                                                setSubYoutubeUrl((rest as any).youtubeUrl || "");
                                                                                setSubTiktokUrl((rest as any).tiktokUrl || "");
                                                                                setRecordPayment(false);
                                                                                setPaymentAmount(0);
                                                                                setPaymentMethod("Cash");
                                                                                setModalType("subscription");
                                                                            }}
                                                                            variant="light"
                                                                        >
                                                                            <IconSettings size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    {rest.isOrderFeatureEnabled && (
                                                                        <Tooltip label="Generate Table QR Code">
                                                                            <ActionIcon
                                                                                color="teal"
                                                                                onClick={() => setTableQrRest(rest)}
                                                                                variant="light"
                                                                            >
                                                                                <IconQrcode size={16} />
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                    )}
                                                                    <Tooltip label="Billing Ledger & History">
                                                                        <ActionIcon
                                                                            color="gray"
                                                                            onClick={() => {
                                                                                setSelectedRest(rest);
                                                                                setModalType("history");
                                                                            }}
                                                                            variant="light"
                                                                        >
                                                                            <IconFileText size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {billingRestaurants.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5}>
                                                            <Text align="center" color="dimmed" py="xl">
                                                                No restaurants found. Create a restaurant first.
                                                            </Text>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    )}
                                </Card>
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                </Container>
            </AppShell>

            {/* Modal: Record Transaction */}
            <Modal
                centered
                onClose={() => setModalType(null)}
                opened={modalType === "transaction"}
                title={`Record Transaction for ${selectedRest?.name}`}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!selectedRest || paymentAmount <= 0) return;
                        enterTransaction({
                            amount: paymentAmount,
                            description:
                                paymentDesc.trim() ||
                                `${adjType === "income" ? "Manual Income" : "Manual Expense"} Entry`,
                            method: paymentMethod,
                            restaurantId: selectedRest.id,
                            type: adjType as "income" | "expense",
                        });
                    }}
                >
                    <Stack spacing="md">
                        <Select
                            data={[
                                { label: "Income (Subscription / Extra Payment)", value: "income" },
                                { label: "Expense (Refund / Operating Cost)", value: "expense" },
                            ]}
                            label="Transaction Type"
                            onChange={(val) => setAdjType(val || "income")}
                            value={adjType}
                        />
                        <NumberInput
                            label="Amount ($)"
                            min={0.01}
                            onChange={(val) => setPaymentAmount(val || 0)}
                            placeholder="e.g. 50.00"
                            precision={2}
                            required
                            value={paymentAmount}
                        />
                        <Select
                            data={[
                                { label: "Cash", value: "Cash" },
                                { label: "Credit Card", value: "Card" },
                                { label: "Bank Transfer", value: "Bank Transfer" },
                                { label: "Other / System", value: "Other" },
                            ]}
                            label="Payment Method"
                            onChange={(val) => setPaymentMethod(val || "Cash")}
                            value={paymentMethod}
                        />
                        <TextInput
                            label="Description"
                            onChange={(e) => setPaymentDesc(e.target.value)}
                            placeholder="e.g. Monthly subscription cash payment"
                            required
                            value={paymentDesc}
                        />
                        <Button color="primary" loading={enteringTransaction} type="submit">
                            Log Transaction
                        </Button>
                    </Stack>
                </form>
            </Modal>

            {/* Modal: Manage Subscription (Unified) */}
            <Modal
                centered
                onClose={() => setModalType(null)}
                opened={modalType === "subscription"}
                title={`Manage Subscription for ${selectedRest?.name}`}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!selectedRest) return;

                        updateSubscription({
                            isKitchenEnabled: subPlanName === "Enterprise" ? subEnterpriseFeatures.includes("kitchen") : subIsKitchenEnabled,
                            isOrderFeatureEnabled: subPlanName === "Enterprise" ? subEnterpriseFeatures.includes("ordering") : subIsOrderFeatureEnabled,
                            paymentAmount: recordPayment ? paymentAmount : undefined,
                            paymentMethod: recordPayment ? paymentMethod : undefined,
                            planName: subPlanName,
                            enterpriseFeatures: subPlanName === "Enterprise" ? subEnterpriseFeatures.join(",") : null,
                            recordPayment,
                            restaurantId: selectedRest.id,
                            subscriptionExpiresAt:
                                subPlanName !== "Free Trial" && subExpiresAt
                                    ? new Date(subExpiresAt).toISOString()
                                    : null,
                            subscriptionStatus: subStatus,
                            trialEndsAt:
                                subPlanName === "Free Trial" && subTrialEndsAt
                                    ? new Date(subTrialEndsAt).toISOString()
                                    : null,
                            whatsappNo: subWhatsappNo || null,
                            instagramUrl: subInstagramUrl || null,
                            facebookUrl: subFacebookUrl || null,
                            twitterUrl: subTwitterUrl || null,
                            youtubeUrl: subYoutubeUrl || null,
                            tiktokUrl: subTiktokUrl || null,
                        });
                    }}
                >
                    <Stack spacing="md">
                        <Select
                            data={[
                                { label: "Free Trial", value: "Free Trial" },
                                { label: "Starter (₹4,999/year)", value: "Starter" },
                                { label: "Professional (₹7,999/year)", value: "Professional" },
                                { label: "Premium (₹11,999/year)", value: "Premium" },
                                { label: "Enterprise (Custom Features Toggle)", value: "Enterprise" },
                            ]}
                            label="Subscription Plan"
                            onChange={(val) => {
                                const newPlan = val || "Free Trial";
                                setSubPlanName(newPlan);
                                if (newPlan === "Free Trial") {
                                    setSubStatus("trial");
                                    setPaymentAmount(0);
                                } else if (newPlan === "Starter") {
                                    setSubStatus("active");
                                    setPaymentAmount(4999);
                                } else if (newPlan === "Professional") {
                                    setSubStatus("active");
                                    setPaymentAmount(7999);
                                } else if (newPlan === "Premium") {
                                    setSubStatus("active");
                                    setPaymentAmount(11999);
                                } else if (newPlan === "Enterprise") {
                                    setSubStatus("active");
                                    setPaymentAmount(0);
                                }
                            }}
                            value={subPlanName}
                        />

                        {subPlanName === "Enterprise" && (
                            <Stack spacing="xs">
                                <Divider label="Granular Enterprise Features Toggles" labelPosition="center" />
                                <SimpleGrid cols={2} spacing="xs">
                                    {[
                                        { label: "Search bar in Menu", key: "search" },
                                        { label: "Out of Stock Toggle", key: "outOfStock" },
                                        { label: "Featured Specials (Today's Specials)", key: "specials" },
                                        { label: "Analytics / Stats Page", key: "analytics" },
                                        { label: "Customer Reviews (Feedback Page)", key: "reviews" },
                                        { label: "WhatsApp Billing & Loyalty", key: "loyalty" },
                                        { label: "Promotional Banners page", key: "banners" },
                                        { label: "Festival Themes", key: "themes" },
                                        { label: "Table Ordering", key: "ordering" },
                                        { label: "Kitchen Screen", key: "kitchen" },
                                        { label: "Waiter Calling", key: "waiterCall" },
                                    ].map((f) => (
                                        <Switch
                                            key={f.key}
                                            label={f.label}
                                            checked={subEnterpriseFeatures.includes(f.key)}
                                            onChange={(e) => {
                                                const checked = e.currentTarget.checked;
                                                setSubEnterpriseFeatures(prev => 
                                                    checked ? [...prev, f.key] : prev.filter(k => k !== f.key)
                                                );
                                            }}
                                        />
                                    ))}
                                </SimpleGrid>
                            </Stack>
                        )}

                        <Select
                            data={[
                                { label: "Trial", value: "trial" },
                                { label: "Active", value: "active" },
                                { label: "Expired", value: "expired" },
                            ]}
                            label="Subscription Status"
                            onChange={(val) => setSubStatus(val || "trial")}
                            value={subStatus}
                        />

                        {subPlanName === "Free Trial" ? (
                            <TextInput
                                label="Free Trial End Date"
                                onChange={(e) => setSubTrialEndsAt(e.target.value)}
                                required
                                type="date"
                                value={subTrialEndsAt}
                            />
                        ) : (
                            <TextInput
                                label="Subscription Expiry Date"
                                onChange={(e) => setSubExpiresAt(e.target.value)}
                                required
                                type="date"
                                value={subExpiresAt}
                            />
                        )}

                        {subPlanName !== "Free Trial" && (
                            <>
                                <Divider label="Payment Details" labelPosition="center" />
                                <Group position="apart">
                                    <Text size="sm" weight={500}>
                                        Record Payment for this Plan Update
                                    </Text>
                                    <Button
                                        color={recordPayment ? "primary" : "gray"}
                                        onClick={() => setRecordPayment(!recordPayment)}
                                        size="xs"
                                        variant={recordPayment ? "filled" : "outline"}
                                    >
                                        {recordPayment ? "Yes, Record" : "No, Skip"}
                                    </Button>
                                </Group>

                                {recordPayment && (
                                    <Stack spacing="xs">
                                        <NumberInput
                                            label="Payment Amount ($)"
                                            min={0}
                                            onChange={(val) => setPaymentAmount(val || 0)}
                                            placeholder="e.g. 15.00"
                                            precision={2}
                                            required
                                            value={paymentAmount}
                                        />
                                        <Select
                                            data={[
                                                { label: "Cash", value: "Cash" },
                                                { label: "Credit Card", value: "Card" },
                                                { label: "Bank Transfer", value: "Bank Transfer" },
                                            ]}
                                            label="Payment Method"
                                            onChange={(val) => setPaymentMethod(val || "Cash")}
                                            value={paymentMethod}
                                        />
                                    </Stack>
                                )}
                            </>
                        )}

                        <Divider label="WhatsApp Order & Kitchen Settings" labelPosition="center" />
                        <Switch
                            checked={subIsOrderFeatureEnabled}
                            label="Enable WhatsApp Ordering"
                            onChange={(event) => setSubIsOrderFeatureEnabled(event.currentTarget.checked)}
                        />
                        {subIsOrderFeatureEnabled && (
                            <TextInput
                                description="Enter with country code, e.g., 919876543210 (no '+' or spaces)"
                                label="WhatsApp Number"
                                onChange={(e) => setSubWhatsappNo(e.target.value)}
                                placeholder="919876543210"
                                required
                                value={subWhatsappNo}
                            />
                        )}
                        <Switch
                            checked={subIsKitchenEnabled}
                            label="Approve & Enable Kitchen Screen"
                            mt="xs"
                            onChange={(event) => setSubIsKitchenEnabled(event.currentTarget.checked)}
                        />

                        <Divider label="Social Media Handles" labelPosition="center" />
                        <TextInput
                            label="Instagram Profile Link"
                            placeholder="https://instagram.com/username"
                            value={subInstagramUrl}
                            onChange={(e) => setSubInstagramUrl(e.target.value)}
                        />
                        <TextInput
                            label="Facebook Page Link"
                            placeholder="https://facebook.com/pagename"
                            value={subFacebookUrl}
                            onChange={(e) => setSubFacebookUrl(e.target.value)}
                        />
                        <TextInput
                            label="Twitter / X Profile Link"
                            placeholder="https://x.com/username"
                            value={subTwitterUrl}
                            onChange={(e) => setSubTwitterUrl(e.target.value)}
                        />
                        <TextInput
                            label="YouTube Channel Link"
                            placeholder="https://youtube.com/@channel"
                            value={subYoutubeUrl}
                            onChange={(e) => setSubYoutubeUrl(e.target.value)}
                        />
                        <TextInput
                            label="TikTok Profile Link"
                            placeholder="https://tiktok.com/@username"
                            value={subTiktokUrl}
                            onChange={(e) => setSubTiktokUrl(e.target.value)}
                        />

                        <Button color="primary" loading={updatingSubscription} type="submit" mt="md">
                            Save Subscription Settings
                        </Button>

                        <Divider label="Currency Settings" labelPosition="center" />
                        <Select
                            data={[
                                { label: "₹ Indian Rupee (INR)", value: "INR" },
                                { label: "$ US Dollar (USD)", value: "USD" },
                                { label: "€ Euro (EUR)", value: "EUR" },
                                { label: "£ British Pound (GBP)", value: "GBP" },
                                { label: "AED UAE Dirham (AED)", value: "AED" },
                                { label: "SAR Saudi Riyal (SAR)", value: "SAR" },
                                { label: "RM Malaysian Ringgit (MYR)", value: "MYR" },
                                { label: "S$ Singapore Dollar (SGD)", value: "SGD" },
                            ]}
                            description="Set the currency displayed to customers on this restaurant's menu"
                            label="Restaurant Currency"
                            onChange={(val) => setSubCurrency(val || "INR")}
                            value={subCurrency}
                        />
                        <Button
                            color="teal"
                            loading={settingCurrency}
                            onClick={() => {
                                if (selectedRest) setCurrency({ currency: subCurrency, restaurantId: selectedRest.id });
                            }}
                            variant="light"
                        >
                            Update Currency
                        </Button>
                    </Stack>
                </form>
            </Modal>

            {/* Modal: Billing History & Invoice List */}
            <Modal
                centered
                onClose={() => setModalType(null)}
                opened={modalType === "history"}
                size="lg"
                title={`Billing Ledger & Payment History - ${selectedRest?.name}`}
            >
                {loadingHistory ? (
                    <Center py="xl">
                        <Loader />
                    </Center>
                ) : (
                    <Stack spacing="md">
                        <Table highlightOnHover striped verticalSpacing="sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Transaction Details</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billingHistory.map((tx: any) => {
                                    const isDebit = tx.amount < 0;
                                    return (
                                        <tr key={tx.id}>
                                            <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <Text size="sm">{tx.description}</Text>
                                                <Text color="dimmed" size="xs">
                                                    Type:{" "}
                                                    {tx.type === "expense"
                                                        ? "Expense"
                                                        : tx.type === "income"
                                                        ? "Income"
                                                        : "System"}
                                                </Text>
                                            </td>
                                            <td>
                                                <Badge size="xs" variant="outline">
                                                    {tx.method}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Text color={isDebit ? "red" : "green"} weight={600}>
                                                    {isDebit ? "" : "+"}${Math.abs(tx.amount).toFixed(2)}
                                                </Text>
                                            </td>
                                            <td>
                                                <ActionIcon
                                                    color="gray"
                                                    onClick={() => {
                                                        setSelectedInvoice(tx);
                                                        setModalType("invoice");
                                                    }}
                                                    title="Generate & Print Invoice"
                                                    variant="light"
                                                >
                                                    <IconPrinter size={16} />
                                                </ActionIcon>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {billingHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={5}>
                                            <Text align="center" color="dimmed" py="md">
                                                No payment history found.
                                            </Text>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Stack>
                )}
            </Modal>

            {/* Modal: Beautiful Invoice popup */}
            <Modal
                centered
                onClose={() => setModalType("history")}
                opened={modalType === "invoice"}
                size="md"
                title="Invoice Preview"
            >
                {selectedInvoice && (
                    <Stack spacing="md">
                        <div
                            id="invoice-print-area"
                            style={{
                                backgroundColor: "#fff",
                                border: "1px solid #eee",
                                borderRadius: "8px",
                                padding: "20px",
                            }}
                        >
                            <div
                                style={{
                                    borderBottom: "2px solid #f1f3f5",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "20px",
                                    paddingBottom: "15px",
                                }}
                            >
                                <div>
                                    <h2 style={{ color: "#7048e8", fontFamily: "sans-serif", margin: 0 }}>
                                        Foodler Billing
                                    </h2>
                                    <span style={{ color: "#868e96", fontSize: "12px" }}>E-Receipt / Invoice</span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <h4 style={{ margin: 0 }}>Invoice ID:</h4>
                                    <code style={{ color: "#495057", fontSize: "12px" }}>
                                        INV-{selectedInvoice.id.substring(0, 10).toUpperCase()}
                                    </code>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    fontSize: "13px",
                                    justifyContent: "space-between",
                                    marginBottom: "20px",
                                }}
                            >
                                <div>
                                    <strong>Billed To:</strong>
                                    <br />
                                    {selectedRest?.name}
                                    <br />
                                    {selectedRest?.location}
                                    <br />
                                    {selectedRest?.contactNo || "No contact info"}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <strong>Invoice Date:</strong>
                                    <br />
                                    {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                                    <br />
                                    <strong>Status:</strong>{" "}
                                    <span style={{ color: "#0ca678", fontWeight: "bold" }}>PAID</span>
                                </div>
                            </div>

                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    fontSize: "13px",
                                    marginBottom: "20px",
                                    width: "100%",
                                }}
                            >
                                <thead>
                                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                                        <th
                                            style={{
                                                borderBottom: "1px solid #dee2e6",
                                                padding: "8px",
                                                textAlign: "left",
                                            }}
                                        >
                                            Description
                                        </th>
                                        <th
                                            style={{
                                                borderBottom: "1px solid #dee2e6",
                                                padding: "8px",
                                                textAlign: "center",
                                            }}
                                        >
                                            Payment Method
                                        </th>
                                        <th
                                            style={{
                                                borderBottom: "1px solid #dee2e6",
                                                padding: "8px",
                                                textAlign: "right",
                                            }}
                                        >
                                            Total Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ borderBottom: "1px solid #dee2e6", padding: "12px 8px" }}>
                                            <strong>{selectedInvoice.description}</strong>
                                            <br />
                                            <span style={{ color: "#868e96", fontSize: "11px" }}>
                                                Type: {selectedInvoice.type.replace("_", " ").toUpperCase()}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                borderBottom: "1px solid #dee2e6",
                                                padding: "12px 8px",
                                                textAlign: "center",
                                            }}
                                        >
                                            {selectedInvoice.method}
                                        </td>
                                        <td
                                            style={{
                                                borderBottom: "1px solid #dee2e6",
                                                fontWeight: "bold",
                                                padding: "12px 8px",
                                                textAlign: "right",
                                            }}
                                        >
                                            ${Math.abs(selectedInvoice.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                                <div style={{ fontSize: "14px", textAlign: "right", width: "200px" }}>
                                    <div
                                        style={{
                                            borderBottom: "1px solid #dee2e6",
                                            marginBottom: "5px",
                                            paddingBottom: "5px",
                                        }}
                                    >
                                        <span>Subtotal: </span>
                                        <strong>${Math.abs(selectedInvoice.amount).toFixed(2)}</strong>
                                    </div>
                                    <div>
                                        <span>Amount Paid: </span>
                                        <strong style={{ color: "#0ca678" }}>
                                            ${Math.abs(selectedInvoice.amount).toFixed(2)}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    borderTop: "1px solid #f1f3f5",
                                    color: "#adb5bd",
                                    fontSize: "11px",
                                    marginTop: "40px",
                                    paddingTop: "15px",
                                    textAlign: "center",
                                }}
                            >
                                Thank you for choosing Foodler! For support contact farookisop@gmail.com
                            </div>
                        </div>

                        <Group position="apart">
                            <Button color="gray" onClick={() => setModalType("history")} variant="outline">
                                Back to History
                            </Button>
                            <Button
                                color="primary"
                                leftIcon={<IconPrinter size={16} />}
                                onClick={() => {
                                    const printContent = document.getElementById("invoice-print-area")?.innerHTML;
                                    const uniqueName = new Date().getTime();
                                    const windowName = `Print${uniqueName}`;
                                    const printWindow = window.open(
                                        "",
                                        windowName,
                                        "left=100,top=100,width=800,height=600"
                                    );
                                    if (printWindow) {
                                        printWindow.document.write(`
                                        <html>
                                            <head>
                                                <title>Invoice - INV-${selectedInvoice.id
                                                    .substring(0, 10)
                                                    .toUpperCase()}</title>
                                                <style>
                                                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; }
                                                    @media print {
                                                        body { padding: 0; }
                                                    }
                                                </style>
                                            </head>
                                            <body>
                                                ${printContent}
                                                <script>
                                                    window.onload = function() {
                                                        window.print();
                                                        window.close();
                                                    };
                                                </script>
                                            </body>
                                        </html>
                                    `);
                                        printWindow.document.close();
                                    }
                                }}
                            >
                                Print Invoice
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {tableQrRest && (
                <TableQrModal
                    onClose={() => setTableQrRest(null)}
                    opened={!!tableQrRest}
                    restaurantId={tableQrRest.id}
                    restaurantName={tableQrRest.name}
                />
            )}
        </main>
    );
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default AdminConsolePage;
