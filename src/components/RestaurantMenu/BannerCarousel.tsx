import type { FC } from "react";
import { useRef } from "react";
import { Carousel } from "@mantine/carousel";
import { Box, createStyles } from "@mantine/core";
import Autoplay from "embla-carousel-autoplay";
import type { Image } from "@prisma/client";
import { ImageKitImage } from "../ImageKitImage";
import { White, Black } from "src/styles/theme";

const useStyles = createStyles((theme) => ({
    carousalOverlay: {
        backgroundImage: theme.fn.linearGradient(
            180,
            theme.fn.rgba(Black, 0),
            theme.fn.rgba(Black, 0.01),
            theme.fn.rgba(Black, 0.025),
            theme.fn.rgba(Black, 0.05),
            theme.fn.rgba(Black, 0.1),
            theme.fn.rgba(Black, 0.2),
            theme.fn.rgba(Black, 0.35),
            theme.fn.rgba(Black, 0.5)
        ),
        bottom: 0,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 1,
    },
    headerImageBox: {
        aspectRatio: "3",
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        position: "relative",
        [theme.fn.smallerThan("md")]: { aspectRatio: "2.5" },
        [theme.fn.smallerThan("sm")]: { aspectRatio: "2" },
    },
}));

interface BannerCarouselProps {
    images: Image[];
    restaurantName: string;
}

export const BannerCarousel: FC<BannerCarouselProps> = ({ images, restaurantName }) => {
    const { classes } = useStyles();
    const autoplayRef = useRef(Autoplay({ delay: 5000 }));

    return (
        <Carousel
            className={classes.headerImageBox}
            data-testid="restaurant-banner"
            height="100%"
            loop
            mx="auto"
            onMouseEnter={autoplayRef.current.stop}
            onMouseLeave={autoplayRef.current.reset}
            plugins={[autoplayRef.current]}
            slideGap="md"
            styles={{ indicator: { background: White } }}
            withControls={false}
            withIndicators={images.length > 1}
        >
            {images?.map((banner, index) => (
                <Carousel.Slide key={banner.id}>
                    <ImageKitImage
                        blurhash={banner.blurHash}
                        color={banner.color}
                        height={400}
                        imageAlt={`${restaurantName}-banner-${index}`}
                        imagePath={banner.path}
                        width={1000}
                        priority={index === 0}
                    />
                    <Box className={classes.carousalOverlay} />
                </Carousel.Slide>
            ))}
        </Carousel>
    );
};
