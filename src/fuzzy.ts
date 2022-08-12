import { doc, getDoc, Timestamp, writeBatch } from "firebase/firestore";

import { User, ItemMessage } from "src/types";
import { addUser } from "src/handlers";
import * as constants from "src/constants";

const dictionary = require("data/random.json");

const randInt = (n: number): number => Math.floor(Math.random() * n)
const randIntStr = (n: number): string => randInt(n).toString();
const getRandomUserId = () => randIntStr(constants.fuzzy.NUM_USERS);
const generateUsername = (): string => getRandomFromDict("names") + randIntStr(constants.fuzzy.USERNAME_NUMBER_RANGE);

export const getItemCategories = () => {
  return dictionary["categories"]
}

const getRandomFromDict = (field, isItem=false): string => {
  const arr = isItem ? dictionary["items"][field] : dictionary[field]
  console.log("FIELD", field)
  console.log("IS ITEM", isItem)
  console.log(arr.length)
  return arr[randInt(arr.length)];
}

const generateString = (len: number): string =>  {
  let result           = '';
  const characters       = 'abcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for ( let i = 0; i < len; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const generateDescription = (): string => {
  return '';
  let result = ''
  for (let i = 0; i < constants.fuzzy.DESCRIPTION_NUM_WORDS; i++) {
    result += generateString(constants.fuzzy.DESCRIPTION_NUM_CHARS) + ' '
  }
  return result + generateString(constants.fuzzy.DESCRIPTION_NUM_CHARS)
}

const generateYear = (): number => randInt(constants.fuzzy.DOB_YEAR_RANGE) + constants.fuzzy.DOB_YEAR_START;

export const generateUser = (): User => {
  return {
    username: generateUsername(),
    yearOfBirth: generateYear(),
  }
}

export const getRandomUser = async (db)=> {
  return (await getDoc(doc(db, "users", getRandomUserId()))).data();
}

const addMillis = (a, b) => Timestamp.fromMillis(a.toMillis() + b)

export const generateItem = async (db): Promise<ItemMessage> => {
  const category = getRandomFromDict("categories")
  const userId = getRandomUserId()
  const username = (await getDoc(doc(db, "users", userId))).data()["username"]
  const sellTimestamp = addMillis(Timestamp.now(), randInt(7 * constants.fuzzy.DAY))
  const price = randInt(constants.fuzzy.PRICE_RANGE) + constants.fuzzy.PRICE_START
  return {
    title: `${getRandomFromDict("colours")} ${getRandomFromDict(category, true)}`,
    category: category,
    description: generateDescription(),
    seller: username,
    highestBid: price,
    sellTimestamp: sellTimestamp
  }
}

const generateUsers = async (db) => {
  // generate 100K users and save in a single batch write
  // each batch generates 500 users
  // so 100K / 500 = 2000 batch writes
  // for now lets start with 500 users
  console.log("Generate users")
  const batch = writeBatch(db);
  for (let i = 0; i < 500; i++) {
    const userRef = doc(db, "users", i.toString())
    batch.set(userRef, generateUser())
  }
  console.log("Commit users")
  await batch.commit()
  console.log("Done commit");
}

const generateItems = async (db) => {
  // generate 100K users and save in a single batch write
  // each batch generates 500 users
  // so 100K / 500 = 2000 batch writes
  // for now lets start with 500 users
  console.log("Generate items")
  const batch = writeBatch(db);
  for (let i = 0; i < constants.fuzzy.NUM_ITEMS; i++) {
    console.log("Generating item", i)
    const itemRef = doc(db, "items", i.toString())
    const item = await generateItem(db)
    batch.set(itemRef, item)
  }
  console.log("Commit items")
  await batch.commit()
  console.log("Done commit");
}
