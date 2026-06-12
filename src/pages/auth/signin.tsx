import { useState, useEffect } from "react";
import { BackgroundImage, Box, Center, createStyles, TextInput, PasswordInput, Button, Tabs, Stack, Alert } from "@mantine/core";
import { IconAlertCircle, IconMail, IconLock, IconUser } from "@tabler/icons";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

import type { NextPage } from "next";

import { Logo } from "src/components/Logo";
import { useSession, signIn, signUp } from "src/utils/supabaseAuth";

const useStyles = createStyles((theme) => {
    return {
        background: { height: "100vh", padding: 50 },
        contentWrap: {
            alignItems: "center",
            background: theme.colors.dark[0],
            borderRadius: theme.radius.md,
            boxShadow: theme.shadows.lg,
            display: "flex",
            flexDirection: "column",
            padding: `${theme.spacing.lg}px ${theme.spacing.xl}px`,
            width: 380,
            maxWidth: "100%",
        },
        form: {
            width: "100%",
            marginTop: theme.spacing.md,
        },
    };
});

const SignIn: NextPage = () => {
    const { classes } = useStyles();
    const router = useRouter();
    const t = useTranslations("auth");

    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState<string | null>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Client-side authentication redirect
    useEffect(() => {
        if (status === "authenticated" && session) {
            const callbackUrl = (router.query?.callbackUrl as string) || "/restaurant";
            router.push(callbackUrl);
        }
    }, [session, status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setErrorMsg(activeTab === "owner" ? "Username and password are required" : "Email and password are required");
            return;
        }

        if (activeTab !== "owner" && email.trim().toLowerCase() === "farookisop@gmail.com") {
            setErrorMsg("Admin login is restricted to the admin portal.");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            if (activeTab === "owner") {
                await signIn("restaurant-owner", { email, password });
            } else if (activeTab === "login") {
                await signIn("email", { email, password });
            } else {
                await signUp(email, password);
                await signIn("email", { email, password });
            }
        } catch (err: any) {
            console.error("Auth error", err);
            setErrorMsg(err.message || "Authentication failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BackgroundImage className={classes.background} src="/landing-hero-bg.svg">
            <Center h="100%">
                <Box className={classes.contentWrap}>
                    <Box my={10}>
                        <Logo />
                    </Box>

                    <Tabs value={activeTab} onTabChange={setActiveTab} style={{ width: "100%" }}>
                        <Tabs.List grow>
                            <Tabs.Tab value="login">Sign In</Tabs.Tab>
                            <Tabs.Tab value="register">Sign Up</Tabs.Tab>
                            <Tabs.Tab value="owner">Owner Login</Tabs.Tab>
                        </Tabs.List>

                        <form onSubmit={handleSubmit} className={classes.form}>
                            <Stack spacing="sm">
                                {errorMsg && (
                                    <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
                                        {errorMsg}
                                    </Alert>
                                )}

                                <TextInput
                                    label={activeTab === "owner" ? "Username" : "Email Address"}
                                    placeholder={activeTab === "owner" ? "Enter restaurant username" : "your@email.com"}
                                    icon={activeTab === "owner" ? <IconUser size={16} /> : <IconMail size={16} />}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    autoFocus
                                />

                                <PasswordInput
                                    label="Password"
                                    placeholder="Enter your password"
                                    icon={<IconLock size={16} />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />

                                <Button
                                    type="submit"
                                    loading={loading}
                                    fullWidth
                                    mt="md"
                                    size="md"
                                >
                                    {activeTab === "owner" ? "Log In as Owner" : activeTab === "login" ? "Sign In" : "Sign Up"}
                                </Button>
                            </Stack>
                        </form>
                    </Tabs>
                </Box>
            </Center>
        </BackgroundImage>
    );
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default SignIn;
