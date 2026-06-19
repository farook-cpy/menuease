import type { FC } from "react";
import { useEffect, useState } from "react";

import { Button, Group, Stack, Textarea, TextInput, Select, Progress, ActionIcon, Grid, Card, AspectRatio, Loader, useMantineTheme, Box, Text } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useTranslations } from "next-intl";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconVideo, IconPhoto, IconTrash } from "@tabler/icons";

import type { ModalProps } from "@mantine/core";

import { api } from "src/utils/api";
import { showErrorToast, showSuccessToast, toBase64 } from "src/utils/helpers";
import { menuItemInput } from "src/utils/validators";
import { supabase, uploadFileWithProgress, encodeImageToBlurhash, getColor, rgba2hex } from "src/utils/supabaseClient";

import { ImageUpload } from "../ImageUpload";
import { ImageKitImage } from "../ImageKitImage";
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
                categories?.map((item: any) => (item.id === categoryId ? { ...item, items: [...(item.items || []), data] } : item))
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
            description: menuItem?.description || "",
            imageBase64: "",
            imagePath: menuItem?.image?.path || "",
            name: menuItem?.name || "",
            price: menuItem?.price || "",
            isVeg: menuItem?.isVeg ?? null,
            videoUrl: menuItem?.videoUrl || "",
            additionalImages: (menuItem?.images?.filter((img: any) => img.id !== menuItem?.imageId) || []) as any[],
            newAdditionalImages: [] as any[],
            deletedImageIds: [] as string[],
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
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || "";

            const result = await uploadFileWithProgress(
                base64 as string,
                "menu/videos",
                token,
                (progress) => setVideoProgress(progress)
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
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        await Promise.all(files.map(async (file, index) => {
            const tempId = `temp-${Date.now()}-${index}`;
            setImageProgress(prev => ({ ...prev, [tempId]: 0 }));

            try {
                const base64 = await toBase64(file);
                const [uploaded, blurHash, rawColor] = await Promise.all([
                    uploadFileWithProgress(
                        base64 as string,
                        "menu/additional",
                        token,
                        (progress) => setImageProgress(prev => ({ ...prev, [tempId]: progress }))
                    ),
                    encodeImageToBlurhash(base64 as string),
                    getColor(base64 as string),
                ]);

                const colorHex = rgba2hex(rawColor[0] ?? 240, rawColor[1] ?? 240, rawColor[2] ?? 240);
                
                const newImg = {
                    id: uploaded.fileId,
                    path: uploaded.url,
                    blurHash,
                    color: colorHex
                };

                setValues({
                    newAdditionalImages: [...values.newAdditionalImages, newImg]
                });
            } catch (err: any) {
                showErrorToast("Image Upload Failed", err);
            } finally {
                setImageProgress(prev => {
                    const next = { ...prev };
                    delete next[tempId];
                    return next;
                });
            }
        }));
    };

    useEffect(() => {
        if (opened) {
            const newValues = {
                description: menuItem?.description || "",
                imageBase64: "",
                imagePath: menuItem?.image?.path || "",
                name: menuItem?.name || "",
                price: menuItem?.price || "",
                isVeg: menuItem?.isVeg ?? null,
                videoUrl: menuItem?.videoUrl || "",
                additionalImages: (menuItem?.images?.filter((img: any) => img.id !== menuItem?.imageId) || []) as any[],
                newAdditionalImages: [] as any[],
                deletedImageIds: [] as string[],
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
                        disabled={loading}
                        label="Food Type"
                        placeholder="Select food type"
                        data={[
                            { value: "veg", label: "🟢 Vegetarian" },
                            { value: "nonveg", label: "🔴 Non-Vegetarian" },
                            { value: "none", label: "Not Specified" }
                        ]}
                        value={values.isVeg === true ? "veg" : values.isVeg === false ? "nonveg" : "none"}
                        onChange={(val) => setValues({ isVeg: val === "veg" ? true : val === "nonveg" ? false : null })}
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

                    <Group position="apart" mt="md">
                        <Text size="sm" weight={500}>Dish Video (Optional)</Text>
                        {values.videoUrl && (
                            <Button size="xs" variant="light" color="red" leftIcon={<IconTrash size={14} />} onClick={() => setValues({ videoUrl: "" })}>
                                Remove Video
                            </Button>
                        )}
                    </Group>

                    {videoProgress !== null && (
                        <Stack spacing={4}>
                            <Progress value={videoProgress} label={`${videoProgress}%`} size="xl" radius="xl" striped animate />
                            <Text size="xs" color="dimmed" align="center">Uploading video, please wait...</Text>
                        </Stack>
                    )}

                    {!videoProgress && (
                        values.videoUrl ? (
                            <Box sx={{ borderRadius: theme.radius.md, overflow: "hidden", border: `1px solid ${theme.colors.gray[3]}` }}>
                                <video src={values.videoUrl} controls style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }} />
                            </Box>
                        ) : (
                            <Dropzone
                                accept={['video/mp4', 'video/quicktime', 'video/webm']}
                                onDrop={handleVideoDrop}
                                multiple={false}
                                disabled={loading || videoUploading}
                            >
                                <Stack align="center" spacing="xs" py="md">
                                    <IconVideo size={40} color={theme.colors.gray[5]} />
                                    <Text size="sm" color="dimmed">Drag video here or click to select file</Text>
                                    <Text size="xs" color="dimmed">Supported formats: MP4, MOV, WEBM (Max 10MB)</Text>
                                </Stack>
                            </Dropzone>
                        )
                    )}

                    <Text size="sm" weight={500} mt="md">Additional Images (Optional)</Text>
                    
                    <Grid gutter="xs">
                        {/* Saved Additional Images */}
                        {values.additionalImages.map((img: any) => (
                            <Grid.Col span={4} key={img.id}>
                                <Card p={4} withBorder sx={{ position: "relative" }}>
                                    <AspectRatio ratio={1}>
                                        <ImageKitImage blurhash={img.blurHash} color={img.color} height={100} imagePath={img.path} width={100} />
                                    </AspectRatio>
                                    <ActionIcon
                                        color="red"
                                        variant="filled"
                                        size="xs"
                                        sx={{ position: "absolute", top: 6, right: 6, zIndex: 5 }}
                                        onClick={() => {
                                            setValues({
                                                additionalImages: values.additionalImages.filter((i: any) => i.id !== img.id),
                                                deletedImageIds: [...values.deletedImageIds, img.id]
                                            });
                                        }}
                                    >
                                        <IconTrash size={12} />
                                    </ActionIcon>
                                </Card>
                            </Grid.Col>
                        ))}

                        {/* Newly Uploaded Images */}
                        {values.newAdditionalImages.map((img: any) => (
                            <Grid.Col span={4} key={img.id}>
                                <Card p={4} withBorder sx={{ position: "relative" }}>
                                    <AspectRatio ratio={1}>
                                        <ImageKitImage blurhash={img.blurHash} color={img.color} height={100} imagePath={img.path} width={100} />
                                    </AspectRatio>
                                    <ActionIcon
                                        color="red"
                                        variant="filled"
                                        size="xs"
                                        sx={{ position: "absolute", top: 6, right: 6, zIndex: 5 }}
                                        onClick={() => {
                                            setValues({
                                                newAdditionalImages: values.newAdditionalImages.filter((i: any) => i.id !== img.id)
                                            });
                                        }}
                                    >
                                        <IconTrash size={12} />
                                    </ActionIcon>
                                </Card>
                            </Grid.Col>
                        ))}

                        {/* Uploading progress slots */}
                        {Object.entries(imageProgress).map(([key, progress]) => (
                            <Grid.Col span={4} key={key}>
                                <Card p={4} withBorder sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <AspectRatio ratio={1} sx={{ width: "100%" }}>
                                        <Stack spacing={4} align="center" justify="center">
                                            <Loader size="sm" />
                                            <Text size="xs" weight={700}>{progress}%</Text>
                                        </Stack>
                                    </AspectRatio>
                                </Card>
                            </Grid.Col>
                        ))}
                    </Grid>

                    <Dropzone
                        accept={IMAGE_MIME_TYPE}
                        onDrop={handleAdditionalImageDrop}
                        disabled={loading}
                        mt="xs"
                    >
                        <Stack align="center" spacing="xs" py="xs">
                            <IconPhoto size={30} color={theme.colors.gray[5]} />
                            <Text size="xs" color="dimmed">Drag additional images here or click to select files</Text>
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
