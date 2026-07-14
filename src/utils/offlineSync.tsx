import { createContext, useContext, useEffect, useState } from "react";
import { showNotification } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { IconCloudUpload, IconWifi, IconWifiOff } from "@tabler/icons";

interface SyncItem {
    id: string;
    type: "createOrder" | "createWaiterCall" | "registerVisit" | "resolveWaiterCall" | "updateOrderStatus";
    payload: any;
    timestamp: number;
}

interface OfflineSyncContextProps {
    isOnline: boolean;
    pendingCount: number;
}

const OfflineSyncContext = createContext<OfflineSyncContextProps | undefined>(undefined);

export const OfflineSyncProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
    const [pendingCount, setPendingCount] = useState(0);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (typeof window === "undefined") return;

        const updateStatus = () => {
            const online = navigator.onLine;
            setIsOnline(online);
            if (online) {
                showNotification({
                    title: "Internet Restored",
                    message: "You are back online. Synchronizing data...",
                    color: "green",
                    icon: <IconWifi size={16} />,
                });
                syncOfflineQueue();
            } else {
                showNotification({
                    title: "Connection Lost",
                    message: "Working in offline mode. Changes will sync once connection is restored.",
                    color: "orange",
                    icon: <IconWifiOff size={16} />,
                });
            }
        };

        window.addEventListener("online", updateStatus);
        window.addEventListener("offline", updateStatus);

        // Initial count check
        const queueStr = localStorage.getItem("menuease_pending_sync");
        if (queueStr) {
            try {
                const queue: SyncItem[] = JSON.parse(queueStr);
                setPendingCount(queue.length);
            } catch (e) {
                console.error(e);
            }
        }

        // Periodic check to verify current pending items count
        const interval = setInterval(() => {
            const currentQueueStr = localStorage.getItem("menuease_pending_sync");
            if (currentQueueStr) {
                try {
                    const queue: SyncItem[] = JSON.parse(currentQueueStr);
                    setPendingCount(queue.length);
                } catch (e) {
                    console.error(e);
                }
            } else {
                setPendingCount(0);
            }
        }, 3000);

        return () => {
            window.removeEventListener("online", updateStatus);
            window.removeEventListener("offline", updateStatus);
            clearInterval(interval);
        };
    }, []);

    const syncOfflineQueue = async () => {
        if (typeof window === "undefined") return;

        const queueStr = localStorage.getItem("menuease_pending_sync");
        if (!queueStr) return;

        let queue: SyncItem[] = [];
        try {
            queue = JSON.parse(queueStr);
        } catch (e) {
            console.error(e);
            return;
        }

        if (queue.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        for (const item of queue) {
            try {
                const { type, payload } = item;
                if (type === "createOrder") {
                    const { error } = await supabase.from("Order").insert([payload]);
                    if (error) throw error;
                } else if (type === "createWaiterCall") {
                    const { error } = await supabase.from("WaiterCall").insert([payload]);
                    if (error) throw error;
                } else if (type === "registerVisit") {
                    const { data: current } = await supabase
                        .from("CustomerLoyalty")
                        .select("*")
                        .eq("restaurantId", payload.restaurantId)
                        .eq("phone", payload.phone)
                        .maybeSingle();

                    if (current) {
                        const { error } = await supabase
                            .from("CustomerLoyalty")
                            .update({
                                visitCount: current.visitCount + 1,
                                updatedAt: new Date().toISOString()
                            })
                            .eq("id", current.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from("CustomerLoyalty").insert([payload]);
                        if (error) throw error;
                    }
                } else if (type === "resolveWaiterCall") {
                    const { error } = await supabase
                        .from("WaiterCall")
                        .update({ status: "RESOLVED" })
                        .eq("id", payload.id);
                    if (error) throw error;
                } else if (type === "updateOrderStatus") {
                    const { error } = await supabase
                        .from("Order")
                        .update({ status: payload.status, updatedAt: new Date().toISOString() })
                        .eq("id", payload.id);
                    if (error) throw error;
                }
                successCount++;
            } catch (err) {
                console.error("Failed to sync offline item:", item, err);
                failCount++;
            }
        }

        // Clear only synced items, keeping failed ones for retry
        if (failCount === 0) {
            localStorage.removeItem("menuease_pending_sync");
            setPendingCount(0);
        } else {
            // Keep failed items
            const newQueue = queue.slice(successCount);
            localStorage.setItem("menuease_pending_sync", JSON.stringify(newQueue));
            setPendingCount(newQueue.length);
        }

        if (successCount > 0) {
            showNotification({
                title: "Data Synced",
                message: `Successfully synced ${successCount} offline actions with server.`,
                color: "green",
                icon: <IconWifi size={16} />,
            });
            queryClient.invalidateQueries();
        }
    };

    return (
        <OfflineSyncContext.Provider value={{ isOnline, pendingCount }}>
            {children}
        </OfflineSyncContext.Provider>
    );
};

export const useOfflineSync = () => {
    const context = useContext(OfflineSyncContext);
    if (!context) {
        throw new Error("useOfflineSync must be used within an OfflineSyncProvider");
    }
    return context;
};
