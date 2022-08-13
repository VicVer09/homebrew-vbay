import { Timestamp } from "firebase/firestore";
export interface User {
    username: string;
    yearOfBirth: number;
}
export interface ItemSnippet {
}
export interface ItemMessage {
    title: string;
    category: string;
    description: string;
    seller: string;
    highestBid: number;
    sellTimestamp: Timestamp;
}
export interface ItemResponse {
    id: string;
    title: string;
    category: string;
    description: string;
    seller: string;
    numBids: number;
    highestBid: number;
    highestBidder: string;
    sellTimestamp: Timestamp;
    listTimestamp: Timestamp;
}
export declare enum Levels {
    Main = 0,
    CreateUser = 1,
    CreateItem = 2,
    SearchByCategoryAndPrice = 3,
    SearchByText = 4,
    SelectItem = 5,
    SearchResults = 6,
    Item = 7,
    ListenToItem = 8,
    BidOnItem = 9,
    Exit = 10
}
