import type { FC } from "react";
import { useEffect } from "react";

import { Button, Checkbox, Group, Select, Stack, Switch, Text, TextInput, useMantineTheme } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { IconMapPin, IconPhone } from "@tabler/icons";
import { useTranslations } from "next-intl";

import type { ModalProps } from "@mantine/core";
import type { Image, Restaurant } from "@prisma/client";

import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast } from "src/utils/helpers";
import { useSession } from "src/utils/supabaseAuth";
import { restaurantInput } from "src/utils/validators";

import { ImageUpload } from "../ImageUpload";
import { Modal } from "../Modal";

interface Props extends ModalProps {
    /** Restaurant to be edited */
    restaurant?: Restaurant & { image: Image | null };
}

/** Form to be used when allowing users to add or edit restaurants */
export const RestaurantForm: FC<Props> = ({ opened, onClose, restaurant, ...rest }) => {
    const { data: session } = useSession();
    const { data: adminRole } = api.admin.getRole.useQuery();
    const isAdmin = adminRole === "Super Admin" || adminRole === "Admin";
    const isSuperAdmin = adminRole === "Super Admin";
    const trpcCtx = api.useContext();
    const theme = useMantineTheme();
    const t = useTranslations("dashboard.restaurant");
    const tCommon = useTranslations("common");

    const { mutate: createRestaurant, isLoading: isCreating } = api.restaurant.create.useMutation({
        onError: (err: any) => showErrorToast(t("createError"), err),
        onSuccess: (data: any) => {
            onClose();
            trpcCtx.restaurant.getAll.setData(undefined, (restaurants: any[] | undefined) => [
                ...(restaurants || []),
                data,
            ]);
            showSuccessToast(tCommon("createSuccess"), t("createSuccessDesc", { name: data.name }));
        },
    });

    const { mutate: updatedRestaurant, isLoading: isUpdating } = api.restaurant.update.useMutation({
        onError: (err: any) => showErrorToast(t("updateError"), err),
        onSuccess: (data: any) => {
            onClose();
            trpcCtx.restaurant.getAll.setData(undefined, (restaurants: any[] | undefined) =>
                restaurants?.map((item: any) => (item.id === data.id ? { ...item, ...data } : item))
            );
            showSuccessToast(tCommon("updateSuccess"), t("updateSuccessDesc", { name: data.name }));
        },
    });

    const { getInputProps, onSubmit, setValues, isDirty, resetDirty, values, errors } = useForm({
        initialValues: {
            brandColor: (restaurant as any)?.brandColor || "#7048e8",
            contactNo: restaurant?.contactNo || "",
            currency: (restaurant as any)?.currency || "₹",
            festivalTheme: (restaurant as any)?.festivalTheme || "NONE",
            googleReviewUrl: (restaurant as any)?.googleReviewUrl || "",
            happyHourDiscount: (restaurant as any)?.happyHourDiscount || 0,
            happyHourEnd: (restaurant as any)?.happyHourEnd || "",
            happyHourStart: (restaurant as any)?.happyHourStart || "",
            imageBase64: "",
            imagePath: restaurant?.image?.path || "",
            isKitchenEnabled: (restaurant as any)?.isKitchenEnabled || false,
            isOrderFeatureEnabled: (restaurant as any)?.isOrderFeatureEnabled || false,
            isOwnerDisabled: (restaurant as any)?.isOwnerDisabled || false,
            location: restaurant?.location || "",
            logoBase64: "",
            logoUrl: (restaurant as any)?.logoUrl || "",
            name: restaurant?.name || "",
            ownerPassword: (restaurant as any)?.ownerPassword || "",
            ownerUsername: (restaurant as any)?.ownerUsername || "",
            userId: restaurant?.userId || "",
            whatsappNo: (restaurant as any)?.whatsappNo || "",
        },
        validate: zodResolver(restaurantInput),
    });

    useEffect(() => {
        if (opened) {
            const formValues = {
                brandColor: (restaurant as any)?.brandColor || "#7048e8",
                contactNo: restaurant?.contactNo || "",
                currency: (restaurant as any)?.currency || "₹",
                festivalTheme: (restaurant as any)?.festivalTheme || "NONE",
                googleReviewUrl: (restaurant as any)?.googleReviewUrl || "",
                happyHourDiscount: (restaurant as any)?.happyHourDiscount || 0,
                happyHourEnd: (restaurant as any)?.happyHourEnd || "",
                happyHourStart: (restaurant as any)?.happyHourStart || "",
                imageBase64: "",
                imagePath: restaurant?.image?.path || "",
                isKitchenEnabled: (restaurant as any)?.isKitchenEnabled || false,
                isOrderFeatureEnabled: (restaurant as any)?.isOrderFeatureEnabled || false,
                isOwnerDisabled: (restaurant as any)?.isOwnerDisabled || false,
                location: restaurant?.location || "",
                logoBase64: "",
                logoUrl: (restaurant as any)?.logoUrl || "",
                name: restaurant?.name || "",
                ownerPassword: (restaurant as any)?.ownerPassword || "",
                ownerUsername: (restaurant as any)?.ownerUsername || "",
                userId: restaurant?.userId || "",
                whatsappNo: (restaurant as any)?.whatsappNo || "",
            };
            setValues(formValues);
            resetDirty(formValues);
        }
    }, [restaurant, opened]);

    const loading = isCreating || isUpdating;

    return (
        <Modal
            loading={loading}
            onClose={onClose}
            opened={opened}
            title={restaurant ? t("updateModalTitle") : t("createModalTitle")}
            {...rest}
        >
            <form
                onSubmit={onSubmit((formValues) => {
                    if (restaurant) {
                        if (isDirty()) {
                            updatedRestaurant({ ...formValues, id: restaurant?.id });
                        } else {
                            onClose();
                        }
                    } else {
                        createRestaurant(formValues);
                    }
                })}
            >
                <Stack spacing="sm">
                    <TextInput
                        disabled={loading}
                        label={t("inputNameLabel")}
                        placeholder={t("inputNamePlaceholder")}
                        withAsterisk
                        {...getInputProps("name")}
                        autoFocus
                    />
                    <TextInput
                        disabled={loading}
                        icon={<IconMapPin color={theme.colors.dark[4]} />}
                        label={t("inputLocationLabel")}
                        placeholder={t("inputLocationPlaceholder")}
                        withAsterisk
                        {...getInputProps("location")}
                    />
                    <TextInput
                        disabled={loading}
                        icon={<IconPhone color={theme.colors.dark[4]} />}
                        label={t("inputContactNoLabel")}
                        placeholder={t("inputContactNoPlaceholder")}
                        {...getInputProps("contactNo")}
                    />
                    {isSuperAdmin && (
                        <>
                            <TextInput
                                disabled={loading}
                                label="Owner Username"
                                placeholder="Enter owner username"
                                {...getInputProps("ownerUsername")}
                            />
                            <TextInput
                                disabled={loading}
                                label="Owner Password"
                                placeholder="Enter owner password"
                                {...getInputProps("ownerPassword")}
                            />
                            <TextInput
                                disabled={loading}
                                label="Owner User ID (Transfer Ownership)"
                                placeholder="Enter target User ID"
                                {...getInputProps("userId")}
                            />
                            <Checkbox
                                checked={values.isOwnerDisabled}
                                disabled={loading}
                                label="Disable Owner Login"
                                {...getInputProps("isOwnerDisabled", { type: "checkbox" })}
                                mt="xs"
                            />
                        </>
                    )}
                    <Text mb={-10} size="sm" weight={500}>
                        Logo Image (Optional)
                    </Text>
                    <ImageUpload
                        disabled={loading}
                        error={!!errors.logoUrl}
                        height={120}
                        imageHash={undefined}
                        imageUrl={values?.logoUrl}
                        onImageCrop={(logoBase64, logoUrl) => setValues({ logoBase64, logoUrl })}
                        onImageDeleteClick={() => setValues({ logoBase64: "", logoUrl: "" })}
                        width={120}
                    />
                    <Text color={theme.colors.red[7]} size="xs">
                        {errors.logoUrl}
                    </Text>

                    <Select
                        data={[
                            { label: "₹ (INR)", value: "₹" },
                            { label: "$ (USD)", value: "$" },
                            { label: "€ (EUR)", value: "€" },
                            { label: "£ (GBP)", value: "£" },
                            { label: "AED", value: "AED" },
                            { label: "SR", value: "SR" },
                        ]}
                        disabled={loading}
                        label="Currency symbol"
                        {...getInputProps("currency")}
                    />

                    <Switch
                        checked={values.isOrderFeatureEnabled}
                        disabled={loading}
                        label="Enable Order Management (WhatsApp Ordering)"
                        {...getInputProps("isOrderFeatureEnabled", { type: "checkbox" })}
                        mt="xs"
                    />

                    {values.isOrderFeatureEnabled && (
                        <TextInput
                            disabled={loading}
                            label="WhatsApp Number (with country code)"
                            placeholder="e.g. 918547119867"
                            withAsterisk
                            {...getInputProps("whatsappNo")}
                        />
                    )}

                    <Switch
                        checked={values.isKitchenEnabled}
                        disabled={loading}
                        label="Enable Kitchen Screen (Table Orders display)"
                        {...getInputProps("isKitchenEnabled", { type: "checkbox" })}
                        mt="xs"
                    />

                    <TextInput
                        disabled={loading}
                        label="Google Review URL (Review Booster redirection link)"
                        placeholder="https://g.page/r/your-restaurant/review"
                        {...getInputProps("googleReviewUrl")}
                    />

                    <Select
                        data={[
                            { label: "None (Default)", value: "NONE" },
                            { label: "Eid Al-Fitr / Eid Al-Adha 🌙", value: "EID" },
                            { label: "Onam 🌾", value: "ONAM" },
                            { label: "Christmas 🎄", value: "CHRISTMAS" },
                            { label: "Ramadan 🕌", value: "RAMADAN" },
                        ]}
                        disabled={loading}
                        label="Active Festival Theme (Themed Header Banner)"
                        {...getInputProps("festivalTheme")}
                    />

                    <Group grow>
                        <TextInput
                            disabled={loading}
                            label="Happy Hour Start Time (e.g. 15:00)"
                            placeholder="15:00"
                            {...getInputProps("happyHourStart")}
                        />
                        <TextInput
                            disabled={loading}
                            label="Happy Hour End Time (e.g. 18:00)"
                            placeholder="18:00"
                            {...getInputProps("happyHourEnd")}
                        />
                    </Group>
                    <TextInput
                        disabled={loading}
                        label="Happy Hour Discount Rate (%)"
                        placeholder="20"
                        type="number"
                        {...getInputProps("happyHourDiscount")}
                    />

                    <TextInput
                        disabled={loading}
                        label="Brand Accent Color (HEX code)"
                        placeholder="#7048e8"
                        {...getInputProps("brandColor")}
                    />

                    <Text mb={-10} size="sm" weight={500}>
                        Cover Image
                    </Text>
                    <ImageUpload
                        disabled={loading}
                        error={!!errors.imagePath}
                        height={400}
                        imageHash={restaurant?.image?.blurHash}
                        imageRequired
                        imageUrl={values?.imagePath}
                        onImageCrop={(imageBase64, imagePath) => setValues({ imageBase64, imagePath })}
                        onImageDeleteClick={() => setValues({ imageBase64: "", imagePath: "" })}
                        width={1000}
                    />
                    <Text color={theme.colors.red[7]} size="xs">
                        {errors.imagePath}
                    </Text>
                    <Group mt="md" position="right">
                        <Button data-testid="save-restaurant-form" loading={loading} px="xl" type="submit">
                            {tCommon("save")}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
};
