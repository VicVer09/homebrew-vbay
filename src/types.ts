import { Timestamp } from "firebase/firestore";

export interface User {
  username: string,
  yearOfBirth: number,
}

export interface ItemSnippet {
  // TODO
}

export interface ItemMessage {
  title: string,
  category: string,
  description: string,
  seller: string,
  highestBid: number,
  sellTimestamp: Timestamp,
}

export interface ItemResponse {
  id: string,
  title: string,
  category: string,
  description: string,
  seller: string,
  numBids: number,
  highestBid: number,
  highestBidder: string,
  sellTimestamp: Timestamp,
  listTimestamp: Timestamp,
}

export enum Levels {
  Main,
  CreateUser,
  CreateItem,
  SearchByCategoryAndPrice,
  SearchByText,
  SelectItem,
  SearchResults,
  Item,
  ListenToItem,
  BidOnItem,
  Exit,
}

