#!/usr/bin/env ts-node

// CLI
const chalk = require('chalk');
const clear = require('clear');
const inquirer = require('inquirer');
import * as figlet from 'figlet';
require('dotenv').config({ path: 'env.env' })

// Firestore
import { getFirestore, writeBatch, doc, Timestamp, onSnapshot } from "firebase/firestore";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Custom
import { User, ItemMessage, ItemResponse, Levels } from "src/types";
import * as fuzzy from "src/fuzzy";
import * as handlers from "src/handlers";
import * as constants from "src/constants";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.APIKEY,
  authDomain: process.env.AUTHDOMAIN,
  projectId: process.env.PROJECTID,
  storageBucket: process.env.STORAGEBUCKET,
  messagingSenderId: process.env.MESSAGINGSENDERID,
  appId: process.env.APPID,
  measurementId: process.env.MEASUREMENTID,
};

// Initialize Firebase and Analytics
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

const refreshScreen = () => {
  clear();
  console.log(
    chalk.red(
      figlet.textSync('vbay', { horizontalLayout: 'full' })
    ),
  );
  // console.log("*** DEBUG STATE ***")
  // console.log(process.env)
  // console.log(state)
  // console.log("*** DEBUG STATE ***")
  console.log(state.consoleMessage);
  state.consoleMessage = ''
}

// main menu choices
const createUser = "Create user";
const createItem = "Create item";
const searchByCategoryAndPrice = "Search for items by category and price";
const searchByText = "Search for items by text";
const refresh = "Refresh";
const bidOnItem = "Bid on item";
const listenToItem = "Listen to item";
const exit = "Exit";
const back = "Go back";

const state = {
  username: 'victorvim',
  level: Levels.Main,
  consoleMessage: '',
  selectedItem: null,
  searchResults: [],
}

const promptMain = async () => await inquirer.prompt(
    [{
        type: 'list',
        name: 'main',
        message: 'What would you like to do?',
        "choices": [
          createUser,
          createItem,
          searchByCategoryAndPrice,
          searchByText,
          exit,
        ],
      },
    ]).then((answers) => {
      switch (answers.main) {
        case createUser: {
          state.level = Levels.CreateUser;
          break;
        } case createItem: {
          state.level = Levels.CreateItem;
          break;
        } case searchByCategoryAndPrice: {
          state.level = Levels.SearchByCategoryAndPrice;
          break;
        } case searchByText: {
          state.level = Levels.SearchByText;
          break;
        } case exit: {
          state.level = Levels.Exit;
          return;
        }
      }
    }).catch((error) => {
      state.consoleMessage = error.message
      state.level = Levels.Main;
    });

const promptCreateUser = async () => await inquirer.prompt(
    [{
        type: 'input',
        name: 'username',
        message: 'Enter username',
      },{
        type: 'number',
        name: 'yearOfBirth',
        message: 'Enter year of birth',
      }
    ]).then(async (answers) => {
      // check username is unique
      // check yearOfBirth is valid
      // add to db
      const user: User = {
        username: answers.username,
        yearOfBirth: answers.yearOfBirth,
      };
      await handlers.addUser(db, user)
      state.username = 'victorvim';
      state.consoleMessage = "User created!"
    }).catch((error) => {
      state.consoleMessage = error.message
    }).finally(() => {
      state.level = Levels.Main;
    });

const fiveMins = "5 minutes"
const oneHour = "1 hour"
const oneDay = "1 day"
const threeDays = "3 days"
const oneWeek = "1 week"
const timeDelta = (delta): number => {
  switch (delta) {
    case fiveMins:
      return 5 * 1000;
    case oneHour:
      return 60 * 1000;
    case oneDay:
      return 24  * 60 * 1000;
    case threeDays:
      return 3 * 24 * 60 * 1000;
    case oneWeek:
      return 7 * 24 * 60 * 1000;
    default:
      return 0;
  }

}

const promptCreateItem = async () => await inquirer.prompt(
    [{
        type: 'input',
        name: 'title',
        message: 'Enter title',
      }, {
        type: 'list',
        name: 'category',
        message: 'Choose category',
        choices: fuzzy.getItemCategories(),
      }, {
        type: 'input',
        name: 'description',
        message: 'Enter description (optional)',
      }, {
        type: 'number',
        name: 'highestBid',
        message: 'Enter starting bid',
      }, {
        type: 'list',
        name: 'sellTimestampDelta',
        message: 'Choose time until end of auction',
        choices: [fiveMins, oneHour, oneDay, threeDays, oneWeek],
      }
    ]).then(async (answers) => {
      const now = Timestamp.now()
      const sellTimestamp = Timestamp.fromMillis(now.toMillis() + timeDelta(answers.sellTimestampDelta))
      const item: ItemMessage = {
        title: answers.title,
        category: answers.category,
        description: answers.description,
        seller: state.username,
        highestBid: answers.highestBid,
        sellTimestamp: sellTimestamp,
      };
      await handlers.addItem(db, item)
      state.consoleMessage = "Item created!"
    }).catch((error) => {
      state.consoleMessage = error.message
    }).finally(() => {
      state.level = Levels.Main;
    });

const checkSearchResultsAndSetState = () => {
  if (state.searchResults.length == 0) {
    state.consoleMessage = 'No items found!'
    state.level = Levels.Main;
  } else {
    state.level = Levels.SearchResults;
  }
}

const promptSearchByCategoryAndPrice = async () => await inquirer.prompt(
    [{
        type: 'list',
        name: 'category',
        message: 'Choose category',
        choices: fuzzy.getItemCategories(),
      }, {
        type: 'number',
        name: 'highestBid',
        message: 'Enter highest price',
      }
    ]).then(async (answers) => {
      state.searchResults = await handlers.searchItemsByCategoryAndPrice(db, answers.category, answers.highestBid)
      checkSearchResultsAndSetState()
    }).catch((error) => {
      state.consoleMessage = error.message
      state.level = Levels.Main;
    })

const promptSearchByText = async () => await inquirer.prompt(
    [{
        type: 'input',
        name: 'text',
        message: 'Enter Search Text:',
      }
    ]).then(async (answers) => {
      state.searchResults = await handlers.searchItemsByText(db, answers.text)
      checkSearchResultsAndSetState()
    }).catch((error) => {
      state.consoleMessage = error.message
      state.level = Levels.Main;
    })

const searchResultToChoice = (item: ItemResponse) => {
  return {
    name: itemToShortText(item),
    value: item
  }
}

const itemToShortText = (item: ItemResponse): string => {
  return `$${item.highestBid} ${item.title} from ${item.seller}`
}

const itemToLongText = (item: ItemResponse): string => {
  return `
${item.title}
Category: ${item.category}
${item.description === "" ? "" : `Description: ${item.description}`}
Bids: ${item.numBids}
Highest bid: $${item.highestBid}
Highest bidder: ${item.highestBidder}
Seller: ${item.seller}
Listed: ${item.listTimestamp.toDate()}
Deadline: ${item.sellTimestamp.toDate()}
`;
}

const promptSearchResults = async () => await inquirer.prompt(
    [{
        type: 'list',
        name: 'choice',
        message: 'Search Results:',
        choices: [...(state.searchResults.map(searchResultToChoice)), back],
      }
    ]).then(async (answers) => {
      if (answers.choice === back) {
        state.level = Levels.Main;
      } else {
        // update state to select item
        state.level = Levels.Item;
        state.selectedItem = answers.choice
        state.consoleMessage = itemToLongText(state.selectedItem)
      }
    }).catch((error) => {
      state.consoleMessage = error.message
      state.level = Levels.Main;
    })


const promptItem = async () => await inquirer.prompt(
    [{
        type: 'list',
        name: 'choice',
        message: 'Select:',
        choices: [refresh, bidOnItem, listenToItem, back],
      }
    ]).then(async (answers) => {
      switch (answers.choice) {
        case refresh: {
          state.selectedItem = await handlers.getItem(db, state.selectedItem.id)
          state.consoleMessage = itemToLongText(state.selectedItem)
          break;
        }
        case bidOnItem: {
          state.level = Levels.BidOnItem;
          break;
        }
        case listenToItem: {
          state.level = Levels.ListenToItem;
          break;
        }
        case back: {
          state.level = Levels.SearchResults;
          break;
        }
      }
    }).catch((error) => {
      state.consoleMessage = error.message
      state.level = Levels.Main;
    })

const promptBidOnItem = async () => await inquirer.prompt(
    [{
        type: 'number',
        name: 'bid',
        message: 'Enter bid',
      }
    ]).then(async (answers) => {
      state.level = Levels.Item
      await handlers.submitBid(state.selectedItem.id, answers.bid, state.username).then(async (response) => {
        state.selectedItem = await handlers.getItem(db, state.selectedItem.id)
        state.consoleMessage = (await response.text()) + '\n' + itemToLongText(state.selectedItem)
      }).catch((error) => {
        state.consoleMessage = error
      });
    })

const promptItemListener = async (exitItemListener) => await inquirer.prompt(
    [{
        type: 'input',
        name: 'enter',
        message: '',
      }
    ]).then((answers) => {
      exitItemListener()
      state.level = Levels.Item;
      state.consoleMessage = itemToLongText(state.selectedItem)
    }).catch((error) => {
      state.consoleMessage = error.message
      state.level = Levels.Main;
    })

const itemListener = (itemId: string) => onSnapshot(doc(db, "items", itemId), (doc) => {
  state.selectedItem = handlers.docToItemResponse(doc)
  state.consoleMessage = 'Listening to item, press Enter/Return to go back\n' + itemToLongText(state.selectedItem)
  refreshScreen()
});

const main = async () => {
  while (true) {
    refreshScreen()
    switch(state.level) {
      case Levels.Main: {
        await promptMain()
        break;
      }
      case Levels.CreateUser: {
        await promptCreateUser()
        break;
      }
      case Levels.CreateItem: {
        await promptCreateItem()
        break;
      }
      case Levels.SearchByCategoryAndPrice: {
        await promptSearchByCategoryAndPrice()
        break;
      }
      case Levels.SearchByText: {
        await promptSearchByText()
        break;
      }
      case Levels.SearchResults: {
        await promptSearchResults()
        break;
      }
      case Levels.Item: {
        await promptItem()
        break;
      }
      case Levels.BidOnItem: {
        await promptBidOnItem()
        break;
      }
      case Levels.ListenToItem: {
        // onSnapshot refreshes every time there is an update
        const exitItemListener = itemListener(state.selectedItem.id)
        await promptItemListener(exitItemListener)
        break;
      }
      case Levels.Exit: {
        state.consoleMessage = 'Thank you for shopping';
        refreshScreen()
        process.exit(0);
      }
      default: {
        state.level = Levels.Exit;
      }
    }
  }
}

main()
