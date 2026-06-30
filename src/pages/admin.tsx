import { useEffect, useState } from "react";

import {
    Alert,
    BackgroundImage,
    Box,
    Button,
    Center,
    createStyles,
    PasswordInput,
    Stack,
    TextInput,
    Title,
} from "@mantine/core";
import { IconAlertCircle, IconLock, IconMail } from "@tabler/icons";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

import type { NextPage } from "next";

import { Logo } from "src/components/Logo";
import { signIn, useSession } from "src/utils/supabaseAuth";
import { supabase } from "src/utils/supabaseClient";

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
            maxWidth: "100%",
            padding: `${theme.spacing.lg}px ${theme.spacing.xl}px`,
            width: 380,
        },
        form: {
            marginTop: theme.spacing.md,
            width: "100%",
        },
    };
});

const AdminSignIn: NextPage = () => {
    const { classes } = useStyles();
    const router = useRouter();
    const t = useTranslations("auth");

    const { data: session, status } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Client-side authentication redirect
    useEffect(() => {
        if (status === "authenticated" && session) {
            router.push("/restaurant");
        }
    }, [session, status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setErrorMsg("Email and password are required");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const isSuperAdmin = email.trim().toLowerCase() === "farookisop@gmail.com";
            let isAdmin = false;

            if (!isSuperAdmin) {
                const { data: admin } = await supabase
                    .from("AdminUser")
                    .select("role")
                    .eq("email", email.trim().toLowerCase())
                    .single();
                if (admin) {
                    isAdmin = true;
                }
            }

            if (!isSuperAdmin && !isAdmin) {
                setErrorMsg("Access Denied: This portal is restricted to administrators.");
                setLoading(false);
                return;
            }

            await signIn("email", { email, password });
        } catch (err: any) {
            console.error("Admin Auth error", err);
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

                    <Title align="center" color="dark.8" mt="sm" order={3}>
                        Super Admin Panel
                    </Title>

                    <form className={classes.form} onSubmit={handleSubmit}>
                        <Stack spacing="sm">
                            {errorMsg && (
                                <Alert color="red" icon={<IconAlertCircle size={16} />} radius="md">
                                    {errorMsg}
                                </Alert>
                            )}

                            <TextInput
                                autoFocus
                                disabled={loading}
                                icon={<IconMail size={16} />}
                                label="Admin Email"
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@domain.com"
                                required
                                value={email}
                            />

                            <PasswordInput
                                disabled={loading}
                                icon={<IconLock size={16} />}
                                label="Admin Password"
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                required
                                value={password}
                            />

                            <Button color="primary" fullWidth loading={loading} mt="md" size="md" type="submit">
                                Access Console
                            </Button>
                        </Stack>
                    </form>
                </Box>
            </Center>
        </BackgroundImage>
    );
};

export const getStaticProps = async () => ({
    props: { messages: (await import("src/lang/en.json")).default },
});

export default AdminSignIn;
