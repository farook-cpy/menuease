import { Container, Center, Loader } from "@mantine/core";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { NextSeo } from "next-seo";

import type { NextPage } from "next";

import { Empty } from "src/components/Empty";
import { Footer } from "src/components/Footer";
import { RestaurantMenu } from "src/components/RestaurantMenu";
import { env } from "src/env/client.mjs";
import { api } from "src/utils/api";

const RestaurantMenuPage: NextPage = () => {
    const router = useRouter();
    const restaurantId = router.query?.restaurantId as string;
    const t = useTranslations("menu");

    const { data: restaurant, isLoading } = api.restaurant.getDetails.useQuery(
        { id: restaurantId },
        { enabled: !!restaurantId }
    );

    if (isLoading) {
        return (
            <Center h="100vh">
                <Loader size="lg" />
            </Center>
        );
    }

    const imageUrl = restaurant?.image?.path
        ? `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menufic/${restaurant.image.path}`
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
                } ${t("seoDescription.menufic")}`}
                openGraph={{
                    images: [{ url: imageUrl }],
                    type: "restaurant.menu",
                }}
                themeColor={restaurant?.image?.color}
                title={t("seoTitle", { name: restaurant?.name })}
            />
            <main>
                <Container py="lg" size="xl">
                    {restaurant && restaurant?.isPublished === true ? (
                        <RestaurantMenu restaurant={restaurant} />
                    ) : (
                        <Empty height="calc(100vh - 100px)" text={t("noDetailsAvailable")} />
                    )}
                </Container>
            </main>
            <Footer />
        </>
    );
};

export default RestaurantMenuPage;
