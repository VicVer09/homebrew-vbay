"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateItem = exports.getRandomUser = exports.generateUser = exports.getItemCategories = void 0;
const tslib_1 = require("tslib");
const firestore_1 = require("firebase/firestore");
const constants = tslib_1.__importStar(require("src/constants"));
const dictionary = require("src/random.json");
const randInt = (n) => Math.floor(Math.random() * n);
const randIntStr = (n) => randInt(n).toString();
const getRandomUserId = () => randIntStr(constants.fuzzy.NUM_USERS);
const generateUsername = () => getRandomFromDict("names") + randIntStr(constants.fuzzy.USERNAME_NUMBER_RANGE);
const getItemCategories = () => {
    return dictionary["categories"];
};
exports.getItemCategories = getItemCategories;
const getRandomFromDict = (field, isItem = false) => {
    const arr = isItem ? dictionary["items"][field] : dictionary[field];
    console.log("FIELD", field);
    console.log("IS ITEM", isItem);
    console.log(arr.length);
    return arr[randInt(arr.length)];
};
const generateString = (len) => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < len; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
const generateDescription = () => {
    return '';
    let result = '';
    for (let i = 0; i < constants.fuzzy.DESCRIPTION_NUM_WORDS; i++) {
        result += generateString(constants.fuzzy.DESCRIPTION_NUM_CHARS) + ' ';
    }
    return result + generateString(constants.fuzzy.DESCRIPTION_NUM_CHARS);
};
const generateYear = () => randInt(constants.fuzzy.DOB_YEAR_RANGE) + constants.fuzzy.DOB_YEAR_START;
const generateUser = () => {
    return {
        username: generateUsername(),
        yearOfBirth: generateYear(),
    };
};
exports.generateUser = generateUser;
const getRandomUser = async (db) => {
    return (await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, "users", getRandomUserId()))).data();
};
exports.getRandomUser = getRandomUser;
const addMillis = (a, b) => firestore_1.Timestamp.fromMillis(a.toMillis() + b);
const generateItem = async (db) => {
    const category = getRandomFromDict("categories");
    const userId = getRandomUserId();
    const username = (await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, "users", userId))).data()["username"];
    const sellTimestamp = addMillis(firestore_1.Timestamp.now(), randInt(7 * constants.fuzzy.DAY));
    const price = randInt(constants.fuzzy.PRICE_RANGE) + constants.fuzzy.PRICE_START;
    return {
        title: `${getRandomFromDict("colours")} ${getRandomFromDict(category, true)}`,
        category: category,
        description: generateDescription(),
        seller: username,
        highestBid: price,
        sellTimestamp: sellTimestamp
    };
};
exports.generateItem = generateItem;
const generateUsers = async (db) => {
    // generate 100K users and save in a single batch write
    // each batch generates 500 users
    // so 100K / 500 = 2000 batch writes
    // for now lets start with 500 users
    console.log("Generate users");
    const batch = (0, firestore_1.writeBatch)(db);
    for (let i = 0; i < 500; i++) {
        const userRef = (0, firestore_1.doc)(db, "users", i.toString());
        batch.set(userRef, (0, exports.generateUser)());
    }
    console.log("Commit users");
    await batch.commit();
    console.log("Done commit");
};
const generateItems = async (db) => {
    // generate 100K users and save in a single batch write
    // each batch generates 500 users
    // so 100K / 500 = 2000 batch writes
    // for now lets start with 500 users
    console.log("Generate items");
    const batch = (0, firestore_1.writeBatch)(db);
    for (let i = 0; i < constants.fuzzy.NUM_ITEMS; i++) {
        console.log("Generating item", i);
        const itemRef = (0, firestore_1.doc)(db, "items", i.toString());
        const item = await (0, exports.generateItem)(db);
        batch.set(itemRef, item);
    }
    console.log("Commit items");
    await batch.commit();
    console.log("Done commit");
};
