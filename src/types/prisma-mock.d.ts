declare module "@prisma/client" {
    export interface Image {
        id: string;
        path: string;
        blurHash: string;
        color: string;
        restaurantId: string | null;
    }

    export interface Restaurant {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        location: string;
        contactNo: string;
        isPublished: boolean;
        imageId: string | null;
    }

    export interface Menu {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        availableTime: string;
        position: number;
        restaurantId: string | null;
    }

    export interface Category {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        position: number;
        menuId: string | null;
    }

    export interface MenuItem {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string;
        price: string;
        position: number;
        categoryId: string | null;
        imageId: string | null;
    }
}
