import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

export interface PlateItem {
    id: string;
    name: string;
    price: string;
    quantity: number;
    notes?: string;
    isVeg?: boolean | null;
}

interface PlateContextType {
    activeRestaurantId: string | null;
    setActiveRestaurantId: (id: string | null) => void;
    plateItems: PlateItem[];
    addToPlate: (item: { id: string; name: string; price: string; isVeg?: boolean | null }, quantity?: number) => void;
    removeFromPlate: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    updateNotes: (itemId: string, notes: string) => void;
    clearPlate: () => void;
    getPlateTotal: () => string;
    getPlateCount: () => number;
    table: string | null;
    floor: string | null;
    setTable: (table: string | null) => void;
    setFloor: (floor: string | null) => void;
}

const PlateContext = createContext<PlateContextType | undefined>(undefined);

export const parsePrice = (priceStr: string) => {
    if (!priceStr) return { number: 0, currency: "" };
    const trimmed = priceStr.trim();
    const numMatch = trimmed.match(/[0-9.]+/);
    const number = numMatch ? parseFloat(numMatch[0]) : 0;
    const currency = trimmed.replace(/[0-9.]+/g, "").trim();
    return { number, currency };
};

export const formatPrice = (num: number, currency: string) => {
    const isPrefix = /[$₹£€]/.test(currency) || currency.length === 1 || currency === "S$" || currency === "RM";
    if (isPrefix) {
        return `${currency}${num.toFixed(2)}`;
    }
    return `${num.toFixed(2)} ${currency}`;
};

export const PlateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
    const [plateItems, setPlateItems] = useState<PlateItem[]>([]);
    const [table, setTableState] = useState<string | null>(null);
    const [floor, setFloorState] = useState<string | null>(null);

    const router = useRouter();

    const setTable = (val: string | null) => {
        setTableState(val);
        if (typeof window !== "undefined" && activeRestaurantId) {
            if (val) {
                localStorage.setItem(`menuease_plate_table_${activeRestaurantId}`, val);
            } else {
                localStorage.removeItem(`menuease_plate_table_${activeRestaurantId}`);
            }
        }
    };

    const setFloor = (val: string | null) => {
        setFloorState(val);
        if (typeof window !== "undefined" && activeRestaurantId) {
            if (val) {
                localStorage.setItem(`menuease_plate_floor_${activeRestaurantId}`, val);
            } else {
                localStorage.removeItem(`menuease_plate_floor_${activeRestaurantId}`);
            }
        }
    };

    // Load plate items from localStorage when activeRestaurantId changes
    useEffect(() => {
        if (typeof window !== "undefined" && activeRestaurantId) {
            const savedPlate = localStorage.getItem(`menuease_plate_${activeRestaurantId}`);
            if (savedPlate) {
                try {
                    setPlateItems(JSON.parse(savedPlate));
                } catch (e) {
                    console.error("Failed to parse saved plate data", e);
                    setPlateItems([]);
                }
            } else {
                setPlateItems([]);
            }

            const savedTable = localStorage.getItem(`menuease_plate_table_${activeRestaurantId}`);
            const savedFloor = localStorage.getItem(`menuease_plate_floor_${activeRestaurantId}`);
            setTableState(savedTable || null);
            setFloorState(savedFloor || null);
        } else {
            setPlateItems([]);
            setTableState(null);
            setFloorState(null);
        }
    }, [activeRestaurantId]);

    // Read query parameters table and floor on menu page load
    useEffect(() => {
        if (router.isReady && activeRestaurantId) {
            const queryTable = router.query.table as string | undefined;
            const queryFloor = router.query.floor as string | undefined;

            if (queryTable !== undefined) {
                setTable(queryTable || null);
            }
            if (queryFloor !== undefined) {
                setFloor(queryFloor || null);
            }
        }
    }, [router.isReady, router.query, activeRestaurantId]);

    // Save plate items to localStorage whenever they change
    const savePlate = (items: PlateItem[]) => {
        setPlateItems(items);
        if (typeof window !== "undefined" && activeRestaurantId) {
            localStorage.setItem(`menuease_plate_${activeRestaurantId}`, JSON.stringify(items));
        }
    };

    const addToPlate = (item: { id: string; name: string; price: string; isVeg?: boolean | null }, quantity = 1) => {
        if (!activeRestaurantId) return;
        const existingIndex = plateItems.findIndex((i) => i.id === item.id);
        if (existingIndex > -1) {
            const updated = [...plateItems];
            const currentItem = updated[existingIndex];
            if (currentItem) {
                currentItem.quantity += quantity;
            }
            savePlate(updated);
        } else {
            savePlate([
                ...plateItems,
                {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity,
                    notes: "",
                    isVeg: item.isVeg,
                },
            ]);
        }
    };

    const removeFromPlate = (itemId: string) => {
        if (!activeRestaurantId) return;
        const filtered = plateItems.filter((item) => item.id !== itemId);
        savePlate(filtered);
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        if (!activeRestaurantId) return;
        if (quantity <= 0) {
            removeFromPlate(itemId);
            return;
        }
        const updated = plateItems.map((item) => {
            if (item.id === itemId) {
                return { ...item, quantity };
            }
            return item;
        });
        savePlate(updated);
    };

    const updateNotes = (itemId: string, notes: string) => {
        if (!activeRestaurantId) return;
        const updated = plateItems.map((item) => {
            if (item.id === itemId) {
                return { ...item, notes };
            }
            return item;
        });
        savePlate(updated);
    };

    const clearPlate = () => {
        if (!activeRestaurantId) return;
        savePlate([]);
        if (typeof window !== "undefined") {
            localStorage.removeItem(`menuease_plate_${activeRestaurantId}`);
            localStorage.removeItem(`menuease_plate_table_${activeRestaurantId}`);
            localStorage.removeItem(`menuease_plate_floor_${activeRestaurantId}`);
        }
        setTableState(null);
        setFloorState(null);
    };

    const getPlateTotal = () => {
        if (plateItems.length === 0) return "0.00";
        let totalVal = 0;
        let currencyStr = "";
        
        plateItems.forEach((item) => {
            const { number, currency } = parsePrice(item.price);
            totalVal += number * item.quantity;
            if (currency && !currencyStr) {
                currencyStr = currency;
            }
        });

        return formatPrice(totalVal, currencyStr);
    };

    const getPlateCount = () => {
        return plateItems.reduce((acc, item) => acc + item.quantity, 0);
    };

    return (
        <PlateContext.Provider
            value={{
                activeRestaurantId,
                setActiveRestaurantId,
                plateItems,
                addToPlate,
                removeFromPlate,
                updateQuantity,
                updateNotes,
                clearPlate,
                getPlateTotal,
                getPlateCount,
                table,
                floor,
                setTable,
                setFloor,
            }}
        >
            {children}
        </PlateContext.Provider>
    );
};

export const usePlate = () => {
    const context = useContext(PlateContext);
    if (!context) {
        throw new Error("usePlate must be used within a PlateProvider");
    }
    return context;
};
