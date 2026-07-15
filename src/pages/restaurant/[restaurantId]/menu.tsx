import { useEffect } from "react";

import { Center, Container, Loader } from "@mantine/core";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import type { NextPage } from "next";

import { Empty } from "src/components/Empty";
import { Footer } from "src/components/Footer";
import { RestaurantMenu } from "src/components/RestaurantMenu";
import { env } from "src/env/client.mjs";
import messagesEn from "src/lang/en.json";
import { api, fetchRestaurantDetails } from "src/utils/api";

const getDeviceType = () => {
    if (typeof window === "undefined") return "Desktop";
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "Tablet";
    }
    if (
        /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)
    ) {
        return "Mobile";
    }
    return "Desktop";
};

interface PageProps {
    restaurant: any;
}

const RestaurantMenuPage: NextPage<PageProps> = ({ restaurant: initialRestaurant }) => {
    const router = useRouter();
    const restaurantId = router.query?.restaurantId as string;
    const t = useTranslations("menu");

    const { data: restaurant, isLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        {
            enabled: !!restaurantId,
            initialData: initialRestaurant || undefined,
        }
    );

    const { mutate: logPageView } = api.analytics.logView.useMutation();

    useEffect(() => {
        if (restaurantId && restaurant) {
            const isQr = router.query.src === "qr";
            logPageView({
                deviceType: getDeviceType(),
                restaurantId,
                type: isQr ? "qr_scan" : "page_view",
            });
        }
    }, [restaurantId, restaurant, logPageView, router.query.src]);

    if (isLoading) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    const imageUrl = restaurant?.image?.path
        ? restaurant.image.path.startsWith("http")
            ? restaurant.image.path
            : `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menufic/${restaurant.image.path}`
        : "";

    return (
        <>
            <NextSeo
                description={`${t("seoDescription.restaurantName", { name: restaurant?.name })}. ${t(
                    "seoDescription.restaurantLocation",
                    { location: restaurant?.location }
                )}${
                    restaurant?.contactNo
                        ? t("seoDescription.restaurantContactNo", { contactNo: restaurant?.contactNo })
                        : ""
                } ${t("seoDescription.foodler")}`}
                openGraph={{
                    images: [{ url: imageUrl }],
                    type: "restaurant.menu",
                }}
                themeColor={restaurant?.image?.color}
                title={t("seoTitle", { name: restaurant?.name })}
            />
            <main>
                <Container py="lg" size="xl">
                    {restaurant && restaurant?.isPublished === true && !(restaurant as any)?.isSuspended ? (
                        <RestaurantMenu restaurant={restaurant} />
                    ) : (
                        <Empty
                            height="calc(100vh - 100px)"
                            text={
                                (restaurant as any)?.isSuspended
                                    ? "This restaurant has been suspended by the administrator."
                                    : t("noDetailsAvailable")
                            }
                        />
                    )}
                </Container>
            </main>
            <Footer />
        </>
    );
};

export const getStaticPaths = async () => {
    return {
        fallback: "blocking",
        paths: [],
    };
};

export const getStaticProps = async (context: any) => {
    const restaurantId = context.params?.restaurantId as string;
    try {
        const restaurant = await fetchRestaurantDetails(restaurantId);
        return {
            props: {
                messages: messagesEn,
                restaurant: restaurant || null,
            },
            revalidate: 10,
        };
    } catch (e) {
        console.error("Failed to fetch restaurant details for SSG:", e);
        return {
            props: {
                messages: messagesEn,
                restaurant: null,
            },
            revalidate: 10,
        };
    }
};

export default RestaurantMenuPage;
