import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Order } from "./model/order";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.

// The Firebase Admin SDK to access Cloud Firestore.
// const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.updateStock = functions.firestore
  .document('Orders/{id}')
  .onCreate(async (snap, context) => {
    functions.logger.log('Came inside on create');
    const newOrder = <Order>snap.data();
    const stockRef = db.collection('stock').doc('main');

    let batch = admin.firestore().batch();
    stockRef.get()
      .then(doc => {
        if (!doc.exists) {
         functions.logger.log('No such document!');

        } else if (doc.data()) {

          const data = doc.data();
         functions.logger.log('Document data:', data);
          if (data) {
            const stock = data.data;
           functions.logger.log('Stock' + stock );
            newOrder.order.forEach(element => {
             functions.logger.log('Element' + element );
              stock.find((p: { id: string; value: any }) => p.id === element.id).value = Number(stock.find((p: { id: string; value: any }) => p.id === element.id).value) - Number(element.qty);
              batch.update(stockRef, {data:stock});
            });
           functions.logger.log('COMItting');
            batch.commit().catch(err =>functions.logger.log(err))
              .then(() =>functions.logger.log('this will succeed'))
              .catch(() => 'obligatory catch')
          }
        }

      }).catch(err => {
       functions.logger.log('Error getting document', err);
      });



  });