import { collection, doc, addDoc, getDocs, getDoc,  query, where, orderBy, limit, runTransaction, Timestamp  } from "firebase/firestore";
import { User, ItemMessage, ItemResponse } from "src/types"

// Web
import fetch from "node-fetch";

export const addUser = async (db, user: User) => {
  // TODO add more strict error handling, maybe figure out the race condition here
  if (user.yearOfBirth < 1900 || user.yearOfBirth > 2022) {
    throw new Error('Error creating user: Invalid year of birth')
  }
  const usersRef = collection(db, "users")
  const q = query(usersRef, where("username", "==", user.username))
  const querySnapshot = await getDocs(q)
  if (querySnapshot.size > 0) {
    throw new Error(`Error creating user: Username ${user.username} already taken`)
  }
  const docRef = await addDoc(collection(db, "users"), user);
}

export const addItem = async (db, item: ItemMessage) => {
  if (item.title === '') {
    throw new Error('Error creating item: Invalid title')
  }
  if (item.category === '') {
    throw new Error('Error creating item: Invalid category')
  }
  const usersRef = collection(db, "users")
  const q = query(usersRef, where("username", "==", item.seller))
  const querySnapshot = await getDocs(q)
  if (querySnapshot.size !== 1) {
    throw new Error(`Error creating item: seller account invalid`)
  }
  if (item.highestBid < 0) {
    throw new Error('Error creating item: Invalid starting bid')
  }
  if (item.sellTimestamp < Timestamp.now()) {
    throw new Error('Error creating item: Invalid sell timestamp')
  }
  const docRef = await addDoc(collection(db, "items"), item);
}

export const getUsers = async (db) => {
  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((doc) => {
    console.log(`${doc.id} => ${JSON.stringify(doc.data(), undefined, 2)}`);
  });
}

const itemDataToItemResponse = (itemData, id): ItemResponse => {
  return {
    id: id,
    title: itemData["title"],
    category: itemData["category"],
    description: itemData["description"],
    seller: itemData["seller"],
    numBids: itemData["numBids"],
    highestBid: itemData["highestBid"],
    highestBidder: itemData["highestBidder"],
    sellTimestamp: itemData["sellTimestamp"],
    listTimestamp: itemData["listTimestamp"],
  }
}

export const docToItemResponse = (doc): ItemResponse => itemDataToItemResponse(doc.data(), doc.id)

const getItemRef = (db, itemId) => doc(db, `items/${itemId}`)
export const getItem = async (db, itemId) => docToItemResponse(await getDoc(getItemRef(db, itemId)))

export const searchItems = async (db, options) => {
  const q = query(collection(db, "items"), ...options)
  const querySnapshot = await getDocs(q)
  const result = []
  querySnapshot.forEach((doc) => {
    result.push(docToItemResponse(doc))
  });
  return result
}

export const submitBid = (itemId, bid, bidder) => fetch("https://us-central1-vbay-7f3a1.cloudfunctions.net/bidOnItem", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    "itemId": itemId,
    "bid": bid,
    "bidder": bidder,
  }),
});

export const searchItemsByCategoryAndPrice = (db, category: string, highestBid) =>
  searchItems(db, [
    where("category", "==", category),
    where("highestBid", "<", highestBid),
    orderBy("highestBid"),
    limit(5),
  ]);

export const searchItemsByText = async (db, text: string) => {
  const response = await fetch("https://us-central1-vbay-7f3a1.cloudfunctions.net/searchItems", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "query": text,
    }),
  });
  const itemRefs = (await response.json()).map(id => getItemRef(db, id));
  const promises = itemRefs.map(itemRef => getDoc(itemRef))
  return Promise.all(promises).then(docs => docs.map(docToItemResponse))
}

// FUN STUFF - full text search
// make http call to cf, (same with cloud functions)
export const searchItemsByTitle = (db, title: string) => searchItems(db, [where("title", "==", title)])
