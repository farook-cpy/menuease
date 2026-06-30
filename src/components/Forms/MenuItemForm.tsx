import type { FC } from "react";
import { useEffect, useState } from "react";

import {
    ActionIcon,
    AspectRatio,
    Box,
    Button,
    Card,
    Grid,
    Group,
    Loader,
    Progress,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
    useMantineTheme,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useForm, zodResolver } from "@mantine/form";
import { IconPhoto, IconTrash, IconVideo } from "@tabler/icons";
import { useTranslations } from "next-intl";

import type { ModalProps } from "@mantine/core";

import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast, toBase64 } from "src/utils/helpers";
import { encodeImageToBlurhash, getColor, rgba2hex, supabase, uploadFileWithProgress } from "src/utils/supabaseClient";
import { menuItemInput } from "src/utils/validators";

import { ImageKitImage } from "../ImageKitImage";
import { ImageUpload } from "../ImageUpload";
import { Modal } from "../Modal";

interface Props extends ModalProps {
    /** Id of the category that the item belongs to */
    categoryId: string;
    /** Id of the menu that the item belongs to */
    menuId: string;
    /** Menu item to be edited */
    menuItem?: any;
}

/** Form to be used when allowing users to add or edit menu items of restaurant menus categories */
export const MenuItemForm: FC<Props> = ({ opened, onClose, menuId, menuItem, categoryId, ...rest }) => {
    const trpcCtx = api.useContext();
    const t = useTranslations("dashboard.editMenu.menuItem");
    const tCommon = useTranslations("common");

    const { mutate: createMenuItem, isLoading: isCreating } = api.menuItem.create.useMutation({
        onError: (err: any) => showErrorToast(t("createError"), err),
        onSuccess: (data: any) => {
            onClose();
            trpcCtx.category.getAll.setData({ menuId }, (categories: any[] | undefined) =>
                categories?.map((item: any) =>
                    item.id === categoryId ? { ...item, items: [...(item.items || []), data] } : item
                )
            );
            showSuccessToast(tCommon("createSuccess"), t("createSuccessDesc", { name: data.name }));
        },
    });

    const { mutate: updateMenuItem, isLoading: isUpdating } = api.menuItem.update.useMutation({
        onError: (err: any) => showErrorToast(t("updateError"), err),
        onSuccess: (data: any) => {
            onClose();
            trpcCtx.category.getAll.setData({ menuId }, (categories: any[] | undefined) =>
                categories?.map((categoryItem: any) =>
                    categoryItem.id === categoryId
                        ? {
                              ...categoryItem,
                              items: (categoryItem.items || []).map((item: any) => (item.id === data.id ? data : item)),
                          }
                        : categoryItem
                )
            );
            showSuccessToast(tCommon("updateSuccess"), t("updateSuccessDesc", { name: data.name }));
        },
    });

    const theme = useMantineTheme();
    const [videoProgress, setVideoProgress] = useState<number | null>(null);
    const [videoUploading, setVideoUploading] = useState(false);
    const [imageProgress, setImageProgress] = useState<{ [key: string]: number }>({});

    const { getInputProps, onSubmit, setValues, isDirty, resetDirty, values } = useForm({
        initialValues: {
            additionalImages: (menuItem?.images?.filter((img: any) => img.id !== menuItem?.imageId) || []) as any[],
            deletedImageIds: [] as string[],
            description: menuItem?.description || "",
            imageBase64: "",
            imagePath: menuItem?.image?.path || "",
            isVeg: menuItem?.isVeg ?? null,
            name: menuItem?.name || "",
            newAdditionalImages: [] as any[],
            price: menuItem?.price || "",
            videoUrl: menuItem?.videoUrl || "",
        },
        validate: zodResolver(menuItemInput),
    });

    const handleVideoDrop = async (files: File[]) => {
        const file = files[0];
        if (!file) return;

        setVideoUploading(true);
        setVideoProgress(0);

        try {
            const base64 = await toBase64(file);
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const token = session?.access_token || "";

            const result = await uploadFileWithProgress(base64 as string, "menu/videos", token, (progress) =>
                setVideoProgress(progress)
            );

            setValues({ videoUrl: result.url });
        } catch (err: any) {
            showErrorToast("Video Upload Failed", err);
        } finally {
            setVideoUploading(false);
            setVideoProgress(null);
        }
    };

    const handleAdditionalImageDrop = async (files: File[]) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        await Promise.all(
            files.map(async (file, index) => {
                const tempId = `temp-${Date.now()}-${index}`;
                setImageProgress((prev) => ({ ...prev, [tempId]: 0 }));

                try {
                    const base64 = await toBase64(file);
                    const [uploaded, blurHash, rawColor] = await Promise.all([
                        uploadFileWithProgress(base64 as string, "menu/additional", token, (progress) =>
                            setImageProgress((prev) => ({ ...prev, [tempId]: progress }))
                        ),
                        encodeImageToBlurhash(base64 as string),
                        getColor(base64 as string),
                    ]);

                    const colorHex = rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240);

                    const newImg = {
                        blurHash,
                        color: colorHex,
                        id: uploaded.fileId,
                        path: uploaded.url,
                    };

                    setValues({
                        newAdditionalImages: [...values.newAdditionalImages, newImg],
                    });
                } catch (err: any) {
                    showErrorToast("Image Upload Failed", err);
                } finally {
                    setImageProgress((prev) => {
                        const next = { ...prev };
                        delete next[tempId];
                        return next;
                    });
                }
            })
        );
    };

    useEffect(() => {
        if (opened) {
            const newValues = {
                additionalImages: (menuItem?.images?.filter((img: any) => img.id !== menuItem?.imageId) || []) as any[],
                deletedImageIds: [] as string[],
                description: menuItem?.description || "",
                imageBase64: "",
                imagePath: menuItem?.image?.path || "",
                isVeg: menuItem?.isVeg ?? null,
                name: menuItem?.name || "",
                newAdditionalImages: [] as any[],
                price: menuItem?.price || "",
                videoUrl: menuItem?.videoUrl || "",
            };
            setValues(newValues);
            resetDirty(newValues);
        }
    }, [menuItem, opened]);

    const loading = isCreating || isUpdating;

    return (
        <Modal
            loading={loading}
            onClose={onClose}
            opened={opened}
            title={menuItem ? t("updateModalTitle") : t("createModalTitle")}
            {...rest}
        >
            <form
                onSubmit={onSubmit((formValues) => {
                    const hasMediaChanges =
                        formValues.newAdditionalImages.length > 0 ||
                        formValues.deletedImageIds.length > 0 ||
                        formValues.videoUrl !== (menuItem?.videoUrl || "");

                    if (isDirty() || hasMediaChanges) {
                        const submitValues = {
                            ...formValues,
                            additionalImages: formValues.newAdditionalImages,
                        };

                        if (menuItem) {
                            updateMenuItem({ ...submitValues, id: menuItem?.id });
                        } else if (categoryId) {
                            createMenuItem({ ...submitValues, categoryId, menuId });
                        }
                    } else {
                        onClose();
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
                        label={t("inputPriceLabel")}
                        placeholder={t("inputPricePlaceholder")}
                        withAsterisk
                        {...getInputProps("price")}
                    />
                    <Textarea
                        disabled={loading}
                        label={t("inputDescriptionLabel")}
                        minRows={3}
                        {...getInputProps("description")}
                    />
                    <Select
                        data={[
                            { label: "🟢 Vegetarian", value: "veg" },
                            { label: "🔴 Non-Vegetarian", value: "nonveg" },
                            { label: "Not Specified", value: "none" },
                        ]}
                        disabled={loading}
                        label="Food Type"
                        onChange={(val) => setValues({ isVeg: val === "veg" ? true : val === "nonveg" ? false : null })}
                        placeholder="Select food type"
                        value={values.isVeg === true ? "veg" : values.isVeg === false ? "nonveg" : "none"}
                    />
                    <ImageUpload
                        disabled={loading}
                        height={400}
                        imageHash={menuItem?.image?.blurHash}
                        imageUrl={values?.imagePath}
                        onImageCrop={(imageBase64, imagePath) => setValues({ imageBase64, imagePath })}
                        onImageDeleteClick={() => setValues({ imageBase64: "", imagePath: "" })}
                        width={400}
                    />

                    <Group mt="md" position="apart">
                        <Text size="sm" weight={500}>
                            Dish Video (Optional)
                        </Text>
                        {values.videoUrl && (
                            <Button
                                color="red"
                                leftIcon={<IconTrash size={14} />}
                                onClick={() => setValues({ videoUrl: "" })}
                                size="xs"
                                variant="light"
                            >
                                Remove Video
                            </Button>
                        )}
                    </Group>

                    {videoProgress !== null && (
                        <Stack spacing={4}>
                            <Progress
                                animate
                                label={`${videoProgress}%`}
                                radius="xl"
                                size="xl"
                                striped
                                value={videoProgress}
                            />
                            <Text align="center" color="dimmed" size="xs">
                                Uploading video, please wait...
                            </Text>
                        </Stack>
                    )}

                    {!videoProgress &&
                        (values.videoUrl ? (
                            <Box
                                sx={{
                                    border: `1px solid ${theme.colors.gray[3]}`,
                                    borderRadius: theme.radius.md,
                                    overflow: "hidden",
                                }}
                            >
                                <video
                                    controls
                                    src={values.videoUrl}
                                    style={{ maxHeight: "200px", objectFit: "cover", width: "100%" }}
                                />
                            </Box>
                        ) : (
                            <Dropzone
                                accept={["video/mp4", "video/quicktime", "video/webm"]}
                                disabled={loading || videoUploading}
                                multiple={false}
                                onDrop={handleVideoDrop}
                            >
                                <Stack align="center" py="md" spacing="xs">
                                    <IconVideo color={theme.colors.gray[5]} size={40} />
                                    <Text color="dimmed" size="sm">
                                        Drag video here or click to select file
                                    </Text>
                                    <Text color="dimmed" size="xs">
                                        Supported formats: MP4, MOV, WEBM (Max 10MB)
                                    </Text>
                                </Stack>
                            </Dropzone>
                        ))}

                    <Text mt="md" size="sm" weight={500}>
                        Additional Images (Optional)
                    </Text>

                    <Grid gutter="xs">
                        {/* Saved Additional Images */}
                        {values.additionalImages.map((img: any) => (
                            <Grid.Col key={img.id} span={4}>
                                <Card p={4} sx={{ position: "relative" }} withBorder>
                                    <AspectRatio ratio={1}>
                                        <ImageKitImage
                                            blurhash={img.blurHash}
                                            color={img.color}
                                            height={100}
                                            imagePath={img.path}
                                            width={100}
                                        />
                                    </AspectRatio>
                                    <ActionIcon
                                        color="red"
                                        onClick={() => {
                                            setValues({
                                                additionalImages: values.additionalImages.filter(
                                                    (i: any) => i.id !== img.id
                                                ),
                                                deletedImageIds: [...values.deletedImageIds, img.id],
                                            });
                                        }}
                                        size="xs"
                                        sx={{ position: "absolute", right: 6, top: 6, zIndex: 5 }}
                                        variant="filled"
                                    >
                                        <IconTrash size={12} />
                                    </ActionIcon>
                                </Card>
                            </Grid.Col>
                        ))}

                        {/* Newly Uploaded Images */}
                        {values.newAdditionalImages.map((img: any) => (
                            <Grid.Col key={img.id} span={4}>
                                <Card p={4} sx={{ position: "relative" }} withBorder>
                                    <AspectRatio ratio={1}>
                                        <ImageKitImage
                                            blurhash={img.blurHash}
                                            color={img.color}
                                            height={100}
                                            imagePath={img.path}
                                            width={100}
                                        />
                                    </AspectRatio>
                                    <ActionIcon
                                        color="red"
                                        onClick={() => {
                                            setValues({
                                                newAdditionalImages: values.newAdditionalImages.filter(
                                                    (i: any) => i.id !== img.id
                                                ),
                                            });
                                        }}
                                        size="xs"
                                        sx={{ position: "absolute", right: 6, top: 6, zIndex: 5 }}
                                        variant="filled"
                                    >
                                        <IconTrash size={12} />
                                    </ActionIcon>
                                </Card>
                            </Grid.Col>
                        ))}

                        {/* Uploading progress slots */}
                        {Object.entries(imageProgress).map(([key, progress]) => (
                            <Grid.Col key={key} span={4}>
                                <Card
                                    p={4}
                                    sx={{ alignItems: "center", display: "flex", justifyContent: "center" }}
                                    withBorder
                                >
                                    <AspectRatio ratio={1} sx={{ width: "100%" }}>
                                        <Stack align="center" justify="center" spacing={4}>
                                            <Loader size="sm" />
                                            <Text size="xs" weight={700}>
                                                {progress}%
                                            </Text>
                                        </Stack>
                                    </AspectRatio>
                                </Card>
                            </Grid.Col>
                        ))}
                    </Grid>

                    <Dropzone accept={IMAGE_MIME_TYPE} disabled={loading} mt="xs" onDrop={handleAdditionalImageDrop}>
                        <Stack align="center" py="xs" spacing="xs">
                            <IconPhoto color={theme.colors.gray[5]} size={30} />
                            <Text color="dimmed" size="xs">
                                Drag additional images here or click to select files
                            </Text>
                        </Stack>
                    </Dropzone>
                    <Group mt="md" position="right">
                        <Button data-testid="save-menu-item-form" loading={loading} px="xl" type="submit">
                            {tCommon("save")}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
};
