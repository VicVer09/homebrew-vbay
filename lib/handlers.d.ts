import { User, ItemMessage, ItemResponse } from "src/types";
export declare const addUser: (db: any, user: User) => Promise<void>;
export declare const addItem: (db: any, item: ItemMessage) => Promise<void>;
export declare const getUsers: (db: any) => Promise<void>;
export declare const docToItemResponse: (doc: any) => ItemResponse;
export declare const getItem: (db: any, itemId: any) => Promise<ItemResponse>;
export declare const searchItems: (db: any, options: any) => Promise<any[]>;
export declare const submitBid: (itemId: any, bid: any, bidder: any) => Promise<import("node-fetch").Response>;
export declare const searchItemsByCategoryAndPrice: (db: any, category: string, highestBid: any) => Promise<any[]>;
export declare const searchItemsByText: (db: any, text: string) => Promise<ItemResponse[]>;
export declare const searchItemsByTitle: (db: any, title: string) => Promise<any[]>;