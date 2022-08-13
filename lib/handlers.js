"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchItemsByTitle = exports.searchItemsByText = exports.searchItemsByCategoryAndPrice = exports.submitBid = exports.searchItems = exports.getItem = exports.docToItemResponse = exports.getUsers = exports.addItem = exports.addUser = void 0;
const tslib_1 = require("tslib");
const firestore_1 = require("firebase/firestore");
// Web
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const addUser = async (db, user) => {
    // TODO add more strict error handling, maybe figure out the race condition here
    if (user.yearOfBirth < 1900 || user.yearOfBirth > 2022) {
        throw new Error('Error creating user: Invalid year of birth');
    }
    const usersRef = (0, firestore_1.collection)(db, "users");
    const q = (0, firestore_1.query)(usersRef, (0, firestore_1.where)("username", "==", user.username));
    const querySnapshot = await (0, firestore_1.getDocs)(q);
    if (querySnapshot.size > 0) {
        throw new Error(`Error creating user: Username ${user.username} already taken`);
    }
    const docRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(db, "users"), user);
};
exports.addUser = addUser;
const addItem = async (db, item) => {
    if (item.title === '') {
        throw new Error('Error creating item: Invalid title');
    }
    if (item.category === '') {
        throw new Error('Error creating item: Invalid category');
    }
    const usersRef = (0, firestore_1.collection)(db, "users");
    const q = (0, firestore_1.query)(usersRef, (0, firestore_1.where)("username", "==", item.seller));
    const querySnapshot = await (0, firestore_1.getDocs)(q);
    if (querySnapshot.size !== 1) {
        throw new Error(`Error creating item: seller account invalid`);
    }
    if (item.highestBid < 0) {
        throw new Error('Error creating item: Invalid starting bid');
    }
    if (item.sellTimestamp < firestore_1.Timestamp.now()) {
        throw new Error('Error creating item: Invalid sell timestamp');
    }
    const docRef = await (0, firestore_1.addDoc)((0, firestore_1.collection)(db, "items"), item);
};
exports.addItem = addItem;
const getUsers = async (db) => {
    const querySnapshot = await (0, firestore_1.getDocs)((0, firestore_1.collection)(db, "users"));
    querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${JSON.stringify(doc.data(), undefined, 2)}`);
    });
};
exports.getUsers = getUsers;
const itemDataToItemResponse = (itemData, id) => {
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
    };
};
const docToItemResponse = (doc) => itemDataToItemResponse(doc.data(), doc.id);
exports.docToItemResponse = docToItemResponse;
const getItemRef = (db, itemId) => (0, firestore_1.doc)(db, `items/${itemId}`);
const getItem = async (db, itemId) => (0, exports.docToItemResponse)(await (0, firestore_1.getDoc)(getItemRef(db, itemId)));
exports.getItem = getItem;
const searchItems = async (db, options) => {
    const q = (0, firestore_1.query)((0, firestore_1.collection)(db, "items"), ...options);
    const querySnapshot = await (0, firestore_1.getDocs)(q);
    const result = [];
    querySnapshot.forEach((doc) => {
        result.push((0, exports.docToItemResponse)(doc));
    });
    return result;
};
exports.searchItems = searchItems;
const submitBid = (itemId, bid, bidder) => (0, node_fetch_1.default)("https://us-central1-vbay-7f3a1.cloudfunctions.net/bidOnItem", {
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
exports.submitBid = submitBid;
const searchItemsByCategoryAndPrice = (db, category, highestBid) => (0, exports.searchItems)(db, [
    (0, firestore_1.where)("category", "==", category),
    (0, firestore_1.where)("highestBid", "<", highestBid),
    (0, firestore_1.orderBy)("highestBid"),
    (0, firestore_1.limit)(5),
]);
exports.searchItemsByCategoryAndPrice = searchItemsByCategoryAndPrice;
const searchItemsByText = async (db, text) => {
    const response = await (0, node_fetch_1.default)("https://us-central1-vbay-7f3a1.cloudfunctions.net/searchItems", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "query": text,
        }),
    });
    const itemRefs = (await response.json()).map(id => getItemRef(db, id));
    const promises = itemRefs.map(itemRef => (0, firestore_1.getDoc)(itemRef));
    return Promise.all(promises).then(docs => docs.map(exports.docToItemResponse));
};
exports.searchItemsByText = searchItemsByText;
// FUN STUFF - full text search
// make http call to cf, (same with cloud functions)
const searchItemsByTitle = (db, title) => (0, exports.searchItems)(db, [(0, firestore_1.where)("title", "==", title)]);
exports.searchItemsByTitle = searchItemsByTitle;
