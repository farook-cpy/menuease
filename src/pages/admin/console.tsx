import { useState } from "react";
import {
    Container,
    Tabs,
    Table,
    TextInput,
    Select,
    Button,
    Group,
    Stack,
    Title,
    Text,
    Badge,
    Card,
    Loader,
    Center,
    ActionIcon,
    Grid,
    NumberInput,
    Modal,
    Tooltip,
    Divider,
    Switch,
} from "@mantine/core";
import {
    IconUserPlus,
    IconTrash,
    IconHistory,
    IconUsers,
    IconArrowLeft,
    IconCreditCard,
    IconPlus,
    IconFileText,
    IconWallet,
    IconChartBar,
    IconPrinter,
    IconSettings,
    IconTrendingDown,
    IconQrcode,
} from "@tabler/icons";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { AppShell } from "src/components/AppShell";
import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";
import { TableQrModal } from "src/components/Modal";

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
        }
    });

    const { mutate: updateSubscription, isLoading: updatingSubscription } = api.billing.updateSubscription.useMutation({
        onError: (err: any) => showErrorToast("Failed to update subscription", err),
        onSuccess: () => {
            showSuccessToast("Subscription Updated", "Subscription properties manually updated successfully");
            setModalType(null);
            trpcCtx.billing.getAll.invalidate();
            trpcCtx.billing.getSummary.invalidate();
        }
    });

    const { mutate: setCurrency, isLoading: settingCurrency } = api.restaurant.setCurrency.useMutation({
        onError: (err: any) => showErrorToast("Failed to set currency", err),
        onSuccess: () => {
            showSuccessToast("Currency Updated", "Restaurant currency has been changed successfully");
            trpcCtx.billing.getAll.invalidate();
        }
    });

    // Mutations
    const { mutate: createAdmin } = api.admin.createAdmin.useMutation({
        onMutate: () => setSubmitting(true),
        onSettled: () => setSubmitting(false),
        onError: (err: any) => showErrorToast("Failed to create admin", err),
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
                    <Title order={3} color="red">Access Denied</Title>
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
                <Container size="lg" py="xl">
                    <Group position="apart" mb="xl">
                        <Stack spacing="xs">
                            <Group>
                                <ActionIcon onClick={() => router.push("/restaurant")} size="lg" variant="light" color="primary">
                                    <IconArrowLeft size={18} />
                                </ActionIcon>
                                <Title order={2}>Admin Control Panel</Title>
                            </Group>
                            <Text size="sm" color="dimmed">
                                Manage system administrators, roles, and review authentication logs.
                            </Text>
                        </Stack>
                    </Group>

                    <Tabs color="primary" defaultValue={userRole === "Super Admin" ? "admins" : "billing"}>
                        <Tabs.List mb="lg">
                            {userRole === "Super Admin" && <Tabs.Tab value="admins" icon={<IconUsers size={16} />}>Admin Users & Roles</Tabs.Tab>}
                            {userRole === "Super Admin" && <Tabs.Tab value="logs" icon={<IconHistory size={16} />}>Login History</Tabs.Tab>}
                            <Tabs.Tab value="billing" icon={<IconCreditCard size={16} />}>Billing & Revenue</Tabs.Tab>
                        </Tabs.List>

                        {userRole === "Super Admin" && (
                            <Tabs.Panel value="admins">
                                <Stack spacing="lg">
                                    <Card withBorder shadow="sm" p="md" radius="md">
                                        <Title order={4} mb="md">Add New Administrator</Title>
                                        <form onSubmit={handleAddAdmin}>
                                            <Group align="flex-end" spacing="md">
                                                <TextInput
                                                    label="Admin Email"
                                                    placeholder="user@example.com"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    style={{ flexGrow: 1 }}
                                                    disabled={submitting}
                                                />
                                                <Select
                                                    label="Assigned Role"
                                                    value={role}
                                                    onChange={(val) => setRole(val || "Admin")}
                                                    data={[
                                                        { value: "Admin", label: "Admin" },
                                                        { value: "Super Admin", label: "Super Admin" },
                                                    ]}
                                                    style={{ width: 180 }}
                                                    disabled={submitting}
                                                />
                                                <Button
                                                    type="submit"
                                                    color="primary"
                                                    leftIcon={<IconUserPlus size={16} />}
                                                    loading={submitting}
                                                >
                                                    Add User
                                                </Button>
                                            </Group>
                                        </form>
                                    </Card>

                                    <Card withBorder shadow="sm" p="md" radius="md">
                                        <Title order={4} mb="md">Current Administrators</Title>
                                        {loadingAdmins ? (
                                            <Center py="xl"><Loader /></Center>
                                        ) : (
                                            <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
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
                                                            <Badge color="primary" variant="filled">System Super Admin</Badge>
                                                        </td>
                                                        <td>
                                                            <Text size="xs" color="dimmed">System Account</Text>
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                    {admins.map((admin: any) => (
                                                        <tr key={admin.id}>
                                                            <td>{admin.email}</td>
                                                            <td>
                                                                <Badge color={admin.role === "Super Admin" ? "primary" : "blue"} variant="light">
                                                                    {admin.role}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                {new Date(admin.createdAt).toLocaleString()}
                                                            </td>
                                                            <td>
                                                                <ActionIcon
                                                                    color="red"
                                                                    variant="light"
                                                                    onClick={() => deleteAdmin({ id: admin.id })}
                                                                    title="Remove Admin"
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
                                <Card withBorder shadow="sm" p="md" radius="md">
                                    <Title order={4} mb="md">Authentication Logs</Title>
                                    {loadingLogs ? (
                                        <Center py="xl"><Loader /></Center>
                                    ) : (
                                        <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
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
                                                                    log.role === "Super Admin" || log.role === "System Super Admin"
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
                                                        <td>
                                                            {new Date(log.createdAt).toLocaleString()}
                                                        </td>
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
                                <Card withBorder shadow="sm" p="md" radius="md">
                                    <Title order={4} mb="md">Billing Summary & Financials</Title>
                                    {loadingSummary ? <Center py="md"><Loader /></Center> : billingSummary ? (
                                        <Grid>
                                            <Grid.Col xs={12} sm={3}>
                                                <Card withBorder p="md" radius="md" style={{ backgroundColor: '#f0fdf4' }}>
                                                    <Group position="apart">
                                                        <Text size="xs" color="dimmed" weight={700}>TOTAL INCOME</Text>
                                                        <IconChartBar size={20} color="#16a34a" />
                                                    </Group>
                                                    <Title order={3} color="green" mt="sm">
                                                        ${billingSummary.totalIncome.toFixed(2)}
                                                    </Title>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col xs={12} sm={3}>
                                                <Card withBorder p="md" radius="md" style={{ backgroundColor: '#fef2f2' }}>
                                                    <Group position="apart">
                                                        <Text size="xs" color="dimmed" weight={700}>TOTAL EXPENSES</Text>
                                                        <IconTrendingDown size={20} color="#dc2626" />
                                                    </Group>
                                                    <Title order={3} color="red" mt="sm">
                                                        ${billingSummary.totalExpense.toFixed(2)}
                                                    </Title>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col xs={12} sm={3}>
                                                <Card withBorder p="md" radius="md" style={{ backgroundColor: '#f0f9ff' }}>
                                                    <Group position="apart">
                                                        <Text size="xs" color="dimmed" weight={700}>NET PROFIT</Text>
                                                        <IconWallet size={20} color="#0284c7" />
                                                    </Group>
                                                    <Title order={3} color="blue" mt="sm">
                                                        ${billingSummary.netProfit.toFixed(2)}
                                                    </Title>
                                                </Card>
                                            </Grid.Col>
                                            <Grid.Col xs={12} sm={3}>
                                                <Card withBorder p="md" radius="md">
                                                    <Group spacing="xs" position="apart">
                                                        <Stack spacing={4}>
                                                            <Text size="xs" color="dimmed" weight={500}>ACTIVE SUBS: <Text span color="green" weight={700}>{billingSummary.activeSubs}</Text></Text>
                                                            <Text size="xs" color="dimmed" weight={500}>ON FREE TRIAL: <Text span color="yellow" weight={700}>{billingSummary.trialSubs}</Text></Text>
                                                            <Text size="xs" color="dimmed" weight={500}>EXPIRED SUBS: <Text span color="red" weight={700}>{billingSummary.expiredSubs}</Text></Text>
                                                        </Stack>
                                                        <IconCreditCard size={20} color="#7048e8" />
                                                    </Group>
                                                </Card>
                                            </Grid.Col>
                                        </Grid>
                                    ) : <Text color="dimmed">No summary available</Text>}
                                </Card>

                                {/* Restaurants Subscription Table */}
                                <Card withBorder shadow="sm" p="md" radius="md">
                                    <Title order={4} mb="md">Restaurants Subscription Statuses</Title>
                                    {loadingBilling ? (
                                        <Center py="xl"><Loader /></Center>
                                    ) : (
                                        <Table striped highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
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
                                                        expiryText = `Trial Ends: ${new Date(rest.trialEndsAt).toLocaleDateString()}`;
                                                    } else if (rest.subscriptionExpiresAt) {
                                                        expiryText = `Expires: ${new Date(rest.subscriptionExpiresAt).toLocaleDateString()}`;
                                                    }

                                                    return (
                                                        <tr key={rest.id}>
                                                            <td>
                                                                <Text weight={500}>{rest.name}</Text>
                                                            </td>
                                                            <td>
                                                                <Badge color="primary" variant="light">{rest.planName || "Free Trial"}</Badge>
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
                                                                        <ActionIcon color="teal" variant="light" onClick={() => {
                                                                            setSelectedRest(rest);
                                                                            setModalType("transaction");
                                                                            setPaymentAmount(0);
                                                                            setPaymentDesc("");
                                                                            setAdjType("income");
                                                                        }}>
                                                                            <IconPlus size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label="Manage Subscription/Plan">
                                                                        <ActionIcon color="primary" variant="light" onClick={() => {
                                                                            setSelectedRest(rest);
                                                                            setSubPlanName(rest.planName || "Free Trial");
                                                                            setSubStatus(rest.subscriptionStatus || "trial");
                                                                            setSubExpiresAt(rest.subscriptionExpiresAt ? rest.subscriptionExpiresAt.substring(0, 10) : "");
                                                                            setSubTrialEndsAt(rest.trialEndsAt ? rest.trialEndsAt.substring(0, 10) : "");
                                                                            setSubCurrency(rest.currency || "INR");
                                                                            setSubIsOrderFeatureEnabled(rest.isOrderFeatureEnabled || false);
                                                                            setSubWhatsappNo(rest.whatsappNo || "");
                                                                            setSubIsKitchenEnabled(rest.isKitchenEnabled || false);
                                                                            setRecordPayment(false);
                                                                            setPaymentAmount(0);
                                                                            setPaymentMethod("Cash");
                                                                            setModalType("subscription");
                                                                        }}>
                                                                            <IconSettings size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    {rest.isOrderFeatureEnabled && (
                                                                        <Tooltip label="Generate Table QR Code">
                                                                            <ActionIcon color="teal" variant="light" onClick={() => setTableQrRest(rest)}>
                                                                                <IconQrcode size={16} />
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                    )}
                                                                    <Tooltip label="Billing Ledger & History">
                                                                        <ActionIcon color="gray" variant="light" onClick={() => {
                                                                            setSelectedRest(rest);
                                                                            setModalType("history");
                                                                        }}>
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
                opened={modalType === "transaction"}
                onClose={() => setModalType(null)}
                title={`Record Transaction for ${selectedRest?.name}`}
                centered
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedRest || paymentAmount <= 0) return;
                    enterTransaction({
                        restaurantId: selectedRest.id,
                        amount: paymentAmount,
                        type: adjType as "income" | "expense",
                        method: paymentMethod,
                        description: paymentDesc.trim() || `${adjType === "income" ? "Manual Income" : "Manual Expense"} Entry`
                    });
                }}>
                    <Stack spacing="md">
                        <Select
                            label="Transaction Type"
                            value={adjType}
                            onChange={(val) => setAdjType(val || "income")}
                            data={[
                                { value: "income", label: "Income (Subscription / Extra Payment)" },
                                { value: "expense", label: "Expense (Refund / Operating Cost)" },
                            ]}
                        />
                        <NumberInput
                            label="Amount ($)"
                            placeholder="e.g. 50.00"
                            precision={2}
                            min={0.01}
                            required
                            value={paymentAmount}
                            onChange={(val) => setPaymentAmount(val || 0)}
                        />
                        <Select
                            label="Payment Method"
                            value={paymentMethod}
                            onChange={(val) => setPaymentMethod(val || "Cash")}
                            data={[
                                { value: "Cash", label: "Cash" },
                                { value: "Card", label: "Credit Card" },
                                { value: "Bank Transfer", label: "Bank Transfer" },
                                { value: "Other", label: "Other / System" },
                            ]}
                        />
                        <TextInput
                            label="Description"
                            placeholder="e.g. Monthly subscription cash payment"
                            required
                            value={paymentDesc}
                            onChange={(e) => setPaymentDesc(e.target.value)}
                        />
                        <Button type="submit" color="primary" loading={enteringTransaction}>
                            Log Transaction
                        </Button>
                    </Stack>
                </form>
            </Modal>

            {/* Modal: Manage Subscription (Unified) */}
            <Modal
                opened={modalType === "subscription"}
                onClose={() => setModalType(null)}
                title={`Manage Subscription for ${selectedRest?.name}`}
                centered
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedRest) return;
                    
                    updateSubscription({
                        restaurantId: selectedRest.id,
                        planName: subPlanName,
                        subscriptionStatus: subStatus,
                        subscriptionExpiresAt: subPlanName !== "Free Trial" && subExpiresAt ? new Date(subExpiresAt).toISOString() : null,
                        trialEndsAt: subPlanName === "Free Trial" && subTrialEndsAt ? new Date(subTrialEndsAt).toISOString() : null,
                        recordPayment: recordPayment,
                        paymentAmount: recordPayment ? paymentAmount : undefined,
                        paymentMethod: recordPayment ? paymentMethod : undefined,
                        isOrderFeatureEnabled: subIsOrderFeatureEnabled,
                        whatsappNo: subWhatsappNo || null,
                        isKitchenEnabled: subIsKitchenEnabled,
                    });
                }}>
                    <Stack spacing="md">
                        <Select
                            label="Subscription Plan"
                            value={subPlanName}
                            onChange={(val) => {
                                const newPlan = val || "Free Trial";
                                setSubPlanName(newPlan);
                                if (newPlan === "Free Trial") {
                                    setSubStatus("trial");
                                    setPaymentAmount(0);
                                } else if (newPlan === "Basic Plan") {
                                    setSubStatus("active");
                                    setPaymentAmount(15);
                                } else if (newPlan === "Premium Plan") {
                                    setSubStatus("active");
                                    setPaymentAmount(40);
                                }
                            }}
                            data={[
                                { value: "Free Trial", label: "Free Trial" },
                                { value: "Basic Plan", label: "Basic Plan ($15/mo)" },
                                { value: "Premium Plan", label: "Premium Plan ($40/mo)" },
                            ]}
                        />

                        <Select
                            label="Subscription Status"
                            value={subStatus}
                            onChange={(val) => setSubStatus(val || "trial")}
                            data={[
                                { value: "trial", label: "Trial" },
                                { value: "active", label: "Active" },
                                { value: "expired", label: "Expired" },
                            ]}
                        />

                        {subPlanName === "Free Trial" ? (
                            <TextInput
                                label="Free Trial End Date"
                                type="date"
                                required
                                value={subTrialEndsAt}
                                onChange={(e) => setSubTrialEndsAt(e.target.value)}
                            />
                        ) : (
                            <TextInput
                                label="Subscription Expiry Date"
                                type="date"
                                required
                                value={subExpiresAt}
                                onChange={(e) => setSubExpiresAt(e.target.value)}
                            />
                        )}

                        {subPlanName !== "Free Trial" && (
                            <>
                                <Divider label="Payment Details" labelPosition="center" />
                                <Group position="apart">
                                    <Text size="sm" weight={500}>Record Payment for this Plan Update</Text>
                                    <Button
                                        size="xs"
                                        variant={recordPayment ? "filled" : "outline"}
                                        color={recordPayment ? "primary" : "gray"}
                                        onClick={() => setRecordPayment(!recordPayment)}
                                    >
                                        {recordPayment ? "Yes, Record" : "No, Skip"}
                                    </Button>
                                </Group>

                                {recordPayment && (
                                    <Stack spacing="xs">
                                        <NumberInput
                                            label="Payment Amount ($)"
                                            placeholder="e.g. 15.00"
                                            precision={2}
                                            min={0}
                                            required
                                            value={paymentAmount}
                                            onChange={(val) => setPaymentAmount(val || 0)}
                                        />
                                        <Select
                                            label="Payment Method"
                                            value={paymentMethod}
                                            onChange={(val) => setPaymentMethod(val || "Cash")}
                                            data={[
                                                { value: "Cash", label: "Cash" },
                                                { value: "Card", label: "Credit Card" },
                                                { value: "Bank Transfer", label: "Bank Transfer" },
                                            ]}
                                        />
                                    </Stack>
                                )}
                            </>
                        )}

                        <Divider label="WhatsApp Order & Kitchen Settings" labelPosition="center" />
                        <Switch
                            label="Enable WhatsApp Ordering"
                            checked={subIsOrderFeatureEnabled}
                            onChange={(event) => setSubIsOrderFeatureEnabled(event.currentTarget.checked)}
                        />
                        {subIsOrderFeatureEnabled && (
                            <TextInput
                                label="WhatsApp Number"
                                description="Enter with country code, e.g., 919876543210 (no '+' or spaces)"
                                placeholder="919876543210"
                                required
                                value={subWhatsappNo}
                                onChange={(e) => setSubWhatsappNo(e.target.value)}
                            />
                        )}
                        <Switch
                            label="Approve & Enable Kitchen Screen"
                            checked={subIsKitchenEnabled}
                            onChange={(event) => setSubIsKitchenEnabled(event.currentTarget.checked)}
                            mt="xs"
                        />

                        <Button type="submit" color="primary" loading={updatingSubscription}>
                            Save Subscription Settings
                        </Button>

                        <Divider label="Currency Settings" labelPosition="center" />
                        <Select
                            label="Restaurant Currency"
                            description="Set the currency displayed to customers on this restaurant's menu"
                            value={subCurrency}
                            onChange={(val) => setSubCurrency(val || "INR")}
                            data={[
                                { value: "INR", label: "₹ Indian Rupee (INR)" },
                                { value: "USD", label: "$ US Dollar (USD)" },
                                { value: "EUR", label: "€ Euro (EUR)" },
                                { value: "GBP", label: "£ British Pound (GBP)" },
                                { value: "AED", label: "AED UAE Dirham (AED)" },
                                { value: "SAR", label: "SAR Saudi Riyal (SAR)" },
                                { value: "MYR", label: "RM Malaysian Ringgit (MYR)" },
                                { value: "SGD", label: "S$ Singapore Dollar (SGD)" },
                            ]}
                        />
                        <Button
                            color="teal"
                            variant="light"
                            loading={settingCurrency}
                            onClick={() => {
                                if (selectedRest) setCurrency({ restaurantId: selectedRest.id, currency: subCurrency });
                            }}
                        >
                            Update Currency
                        </Button>
                    </Stack>
                </form>
            </Modal>

            {/* Modal: Billing History & Invoice List */}
            <Modal
                opened={modalType === "history"}
                onClose={() => setModalType(null)}
                title={`Billing Ledger & Payment History - ${selectedRest?.name}`}
                size="lg"
                centered
            >
                {loadingHistory ? (
                    <Center py="xl"><Loader /></Center>
                ) : (
                    <Stack spacing="md">
                        <Table striped highlightOnHover verticalSpacing="sm">
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
                                                <Text size="xs" color="dimmed">Type: {tx.type === 'expense' ? 'Expense' : tx.type === 'income' ? 'Income' : 'System'}</Text>
                                            </td>
                                            <td>
                                                <Badge size="xs" variant="outline">{tx.method}</Badge>
                                            </td>
                                            <td>
                                                <Text weight={600} color={isDebit ? "red" : "green"}>
                                                    {isDebit ? "" : "+"}${Math.abs(tx.amount).toFixed(2)}
                                                </Text>
                                            </td>
                                            <td>
                                                <ActionIcon
                                                    color="gray"
                                                    variant="light"
                                                    onClick={() => {
                                                        setSelectedInvoice(tx);
                                                        setModalType("invoice");
                                                    }}
                                                    title="Generate & Print Invoice"
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
                                            <Text align="center" color="dimmed" py="md">No payment history found.</Text>
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
                opened={modalType === "invoice"}
                onClose={() => setModalType("history")}
                title="Invoice Preview"
                size="md"
                centered
            >
                {selectedInvoice && (
                    <Stack spacing="md">
                        <div id="invoice-print-area" style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f3f5', paddingBottom: '15px', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ margin: 0, color: '#7048e8', fontFamily: 'sans-serif' }}>Foodler Billing</h2>
                                    <span style={{ fontSize: '12px', color: '#868e96' }}>E-Receipt / Invoice</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h4 style={{ margin: 0 }}>Invoice ID:</h4>
                                    <code style={{ fontSize: '12px', color: '#495057' }}>INV-{selectedInvoice.id.substring(0, 10).toUpperCase()}</code>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px' }}>
                                <div>
                                    <strong>Billed To:</strong><br />
                                    {selectedRest?.name}<br />
                                    {selectedRest?.location}<br />
                                    {selectedRest?.contactNo || "No contact info"}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong>Invoice Date:</strong><br />
                                    {new Date(selectedInvoice.createdAt).toLocaleDateString()}<br />
                                    <strong>Status:</strong> <span style={{ color: '#0ca678', fontWeight: 'bold' }}>PAID</span>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Description</th>
                                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Payment Method</th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '12px 8px', borderBottom: '1px solid #dee2e6' }}>
                                            <strong>{selectedInvoice.description}</strong><br />
                                            <span style={{ fontSize: '11px', color: '#868e96' }}>Type: {selectedInvoice.type.replace('_', ' ').toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                                            {selectedInvoice.method}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>
                                            ${Math.abs(selectedInvoice.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <div style={{ width: '200px', textAlign: 'right', fontSize: '14px' }}>
                                    <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '5px', marginBottom: '5px' }}>
                                        <span>Subtotal: </span>
                                        <strong>${Math.abs(selectedInvoice.amount).toFixed(2)}</strong>
                                    </div>
                                    <div>
                                        <span>Amount Paid: </span>
                                        <strong style={{ color: '#0ca678' }}>${Math.abs(selectedInvoice.amount).toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>

                             <div style={{ textAlign: 'center', fontSize: '11px', color: '#adb5bd', marginTop: '40px', borderTop: '1px solid #f1f3f5', paddingTop: '15px' }}>
                                Thank you for choosing Foodler! For support contact farookisop@gmail.com
                            </div>
                        </div>

                        <Group position="apart">
                            <Button variant="outline" color="gray" onClick={() => setModalType("history")}>
                                Back to History
                            </Button>
                            <Button color="primary" leftIcon={<IconPrinter size={16} />} onClick={() => {
                                const printContent = document.getElementById("invoice-print-area")?.innerHTML;
                                const uniqueName = new Date().getTime();
                                const windowName = "Print" + uniqueName;
                                const printWindow = window.open("", windowName, "left=100,top=100,width=800,height=600");
                                if (printWindow) {
                                    printWindow.document.write(`
                                        <html>
                                            <head>
                                                <title>Invoice - INV-${selectedInvoice.id.substring(0, 10).toUpperCase()}</title>
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
                            }}>
                                Print Invoice
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {tableQrRest && (
                <TableQrModal
                    opened={!!tableQrRest}
                    onClose={() => setTableQrRest(null)}
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
