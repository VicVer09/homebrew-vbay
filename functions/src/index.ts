import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config({path: "env.env"});

admin.initializeApp();

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

export const onCreateUser = functions.firestore
    .document("users/{userId}").onWrite((change, context) => {
      const reviewUser = change.after.data();
      if (reviewUser) {
        // if we have a duplicate username, just delete them
        admin.firestore().collection("users").where("username", "==", reviewUser.username).get().then((querySnapshot) => {
          if (querySnapshot.size > 1) {
            change.after.ref.delete();
          }
        });
        // return change.after.ref.update( {bids: [], buyItems: [], sellItems: []});
        // could make other changes
        // for now having an empty array does not work https://b.corp.google.com/issues/241935666
        return null;
      } else {
        return null;
      }
    });

export const onCreateItem = functions.firestore
    .document("items/{itemId}").onCreate(async (snap, context) => {
      const item = snap.data();
      // ignore title category desc for now
      // eventually, index it with elastic search
      const now = admin.firestore.Timestamp.now();
      const sellTimestampValid = now.toMillis() < item.sellTimestamp.toMillis();
      const seller = await admin.firestore().collection("users")
          .where("username", "==", item.seller).get();
      const sellerExists = !seller.empty;

      if (!sellTimestampValid || !sellerExists) {
        functions.logger.log("Creating item failed");
        functions.logger.log("Current time:", now);
        return snap.ref.delete();
      }

      const listTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const updatedFields = {
        status: "FOR_SALE",
        highestBid: Math.max(parseInt(item.highestBid), 0),
        highestBidder: item.seller,
        numBids: 0,
        listTimestamp: listTimestamp,
      };
      admin.firestore().collection("users").where("username", "==", item.seller).get().then((querySnapshot) => {
        querySnapshot.forEach((user) => {
          functions.logger.log("update user", user.data().username);
          user.ref.update({sell_items: admin.firestore.FieldValue.arrayUnion({itemId: snap.id, title: item.title})});
        });
      });

      return snap.ref.update(updatedFields);
    });


export const bidOnItem = functions.https.onRequest((request, response) => {
  //   curl -X POST 'https://us-central1-vbay-7f3a1.cloudfunctions.net/bidOnItem' \
  // -H 'Content-Type: application/json' \
  // -d '{
  //   "itemId": "ncArE3TtTIqtqDPgGv2n",
  //   "bid": 1003,
  //   "bidder": "victorvim"
  // }'
  //
  //   curl -X POST 'http://localhost:5001/vbay-7f3a1/us-central1/bidOnItem' \
  // -H 'Content-Type: application/json' \
  // -d '{
  //   "itemId": "4QfeKepDdw9KhpHM8Ekz",
  //   "bid": 1001,
  //   "bidder": "vvim"
  // }'
  if (request.method !== "POST") {
    response.status(403).send("Forbidden!");
    return;
  }
  const itemId = request.body["itemId"];
  const bid = request.body["bid"];
  const bidder = request.body["bidder"];
  admin.firestore().runTransaction((transaction) => {
    const itemRef = admin.firestore().doc(`items/${itemId}`);
    const now = admin.firestore.Timestamp.now();
    return transaction.get(itemRef).then((item) => {
      if (item.exists) {
        const itemData = item.data();
        if (itemData) {
          const statusValid = itemData.status === "FOR_SALE";
          const sellTimestampValid = now.toMillis() <
                                     itemData?.sellTimestamp.toMillis();
          const bidValid = itemData.highestBid < bid;
          if (statusValid && sellTimestampValid && bidValid) {
            transaction.update(itemRef, {
              highestBid: bid,
              highestBidder: bidder,
              numBids: admin.firestore.FieldValue.increment(1),
            });
            admin.firestore().collection("users").where("username", "==", bidder).get().then((querySnapshot) => {
              querySnapshot.forEach((user) => {
                functions.logger.log("update user", user.data().username);
                user.ref.update({
                  bids: admin.firestore.FieldValue.arrayUnion({itemId: itemId, title: itemData.title}),
                });
              });
            });
            return Promise.resolve("Bid successful! Refresh to see changes");
          } else if (!statusValid) {
            return Promise.reject(new Error("Bid unsuccessful: item no longer for sale"));
          } else if (!sellTimestampValid) {
            return Promise.reject(new Error("Bid unsuccessful: bid is too late"));
          } else if (!bidValid) {
            return Promise.reject(new Error("Bid unsuccessful: bid is too low"));
          }
        }
      }
      return Promise.reject(new Error("Bid unsuccessful: item does not exist"));
    });
  }).then((result) => {
    response.send(result);
  }).catch((error) => {
    response.status(400).send(error.message);
  });
});

const executeSales = () => {
  //   curl -X POST 'http://localhost:5001/vbay-7f3a1/us-central1/executeSalesManual'
  //   curl -X POST 'https://us-central1-vbay-7f3a1.cloudfunctions.net/executeSalesManual'
  // query for all items past sellSchedule
  // if seller = highestBidder mark UNSOLD
  // otherwise mark as SOLD and add to highestBidder buy_items inventory
  admin.firestore().collection("items")
      .where("sellTimestamp", "<", admin.firestore.Timestamp.now())
      .where("status", "==", "FOR_SALE")
      .get().then((querySnapshot) => {
        querySnapshot.forEach((itemSnapshot) => {
          functions.logger.log("execute sale for document", JSON.stringify(itemSnapshot.data(), null, 2));
          const item = itemSnapshot.data();
          if (item.seller == item.highestBidder) {
            // mark unsold
            itemSnapshot.ref.update({status: "UNSOLD"});
          } else {
            itemSnapshot.ref.update({status: "SOLD"});
            admin.firestore().collection("users").where("username", "==", item.highestBidder).get().then((querySnapshot) => {
              querySnapshot.forEach((user) => {
                functions.logger.log("update user", user.data().username);
                user.ref.update({buyItems: admin.firestore.FieldValue.arrayUnion({itemId: itemSnapshot.id, title: item.title})});
              });
            });
          }
        });
      });
};

export const executeSalesSchedule = functions.pubsub.schedule("every 1 minutes").onRun((context) => executeSales());
export const executeSalesManual = functions.https.onRequest((request, response) => {
  executeSales();
  response.send("executed sales manually");
});

export const searchItems = functions.https.onRequest(async (request, response) => {
  //   curl -X POST 'http://localhost:5001/vbay-7f3a1/us-central1/searchItems' \
  // -H 'Content-Type: application/json' \
  // -d '{
  //  "query": "vphone"
  // }'
  //   curl -X POST 'https://us-central1-vbay-7f3a1.cloudfunctions.net/searchItems' \
  // -H 'Content-Type: application/json' \
  // -d '{
  //  "query": "vphone"
  // }'
  //
  //   curl -X POST 'https://vbayelasticcloud.ent.us-central1.gcp.cloud.es.io/api/as/v1/engines/vbay-search-engine/search.json' \
  // -H 'Content-Type: application/json' \
  // -H 'Authorization: Bearer $SEARCHKEY' \
  // -d '{
  //   "query": "vphone"
  // }'
  const queryString = request.body["query"];

  try {
    const searchRes = await fetch("https://vbayelasticcloud.ent.us-central1.gcp.cloud.es.io/api/as/v1/engines/vbay-search-engine/search.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SEARCHKEY}`,
      },
      body: JSON.stringify({
        "query": queryString,
      }),
    });
    if (!searchRes.ok) {
      throw new Error(`Error! status: ${searchRes.status}`);
    }

    const searchJson = await searchRes.json();
    const parsedRes = [];
    for (const rawRes of searchJson["results"]) {
      const itemId = rawRes["_meta"]["id"];
      parsedRes.push(itemId);
    }

    response.send(parsedRes);
  } catch (error) {
    if (error instanceof Error) {
      console.log("error message: ", error.message);
    } else {
      console.log("unexpected error: ", error);
    }
    response.send(error);
  }
});
