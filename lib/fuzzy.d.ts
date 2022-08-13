import { User, ItemMessage } from "src/types";
export declare const getItemCategories: () => any;
export declare const generateUser: () => User;
export declare const getRandomUser: (db: any) => Promise<import("@firebase/firestore").DocumentData>;
export declare const generateItem: (db: any) => Promise<ItemMessage>;
