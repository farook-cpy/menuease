// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
if (!process.env.SKIP_ENV_VALIDATION) {
    await import("./src/env/server.mjs");
}

/** @type {import("next").NextConfig} */
const config = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    i18n: { defaultLocale: "en", locales: ["en"] },
    images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [{ hostname: "ik.imagekit.io", pathname: "/**", protocol: "https" }],
        unoptimized: true,
    },
    reactStrictMode: false,
    swcMinify: true,
};

export default config;
