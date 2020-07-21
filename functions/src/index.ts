import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Order } from "./model/order";
import { orderList } from './HTMLconstants/orderList';
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
// const cors = require('cors')({ origin: true });


// Start writing Firebase Functions
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
const myOAuth2Client = new OAuth2(
  "441357297581-ouj0qr6besft2nl97c7777j034klduk0.apps.googleusercontent.com",
  "VUC_RFeKty-acAnB33Pbu1mh",
  "https://developers.google.com/oauthplayground"
);
myOAuth2Client.setCredentials({
  refresh_token: "1//04i6spbvbEwykCgYIARAAGAQSNwF-L9Irh58mqruYs3SKxU8Ejhd7pHnKOtgr6nHsQMwh94JBZmRzIriLpFtp409fpmy1n7lDbrQ"
});

const myAccessToken = myOAuth2Client.getAccessToken();

exports.updateStock = functions.firestore
  .document('Orders/{id}')
  .onCreate(async (snap, context) => {
    functions.logger.log('Came inside on create');
    const newOrder = <Order>snap.data();
    let part = ' ';
    let body = ' '
    // newOrder.order.forEach(element => {
    //   const temp = orderList.pImg + element.image +
    //     orderList.pName + element.name +
    //     orderList.variant + element.variant +
    //     orderList.qty + element.qty + ' X ' + element.price +
    //     orderList.price + element.tPrice +
    //     orderList.pEnd;
    //     // functions.logger.debug(temp);
    //   bodyContent.concat(temp);
    // });
    for (let i = 0; i < newOrder.order.length; i++) {
      part = body;
      // console.log(data.products[i].product_desc); 
      const element = newOrder.order[i];
      const temp = orderList.pImg + element.image +
        orderList.pName + element.name +
        orderList.variant + element.variant +
        orderList.qty + element.qty + ' X ' + element.price +
        orderList.price + element.tPrice +
        orderList.pEnd;
      // functions.logger.debug(temp);
      body = part.concat(temp);
    }
    const stockRef = db.collection('stock').doc('main');

    const batch = admin.firestore().batch();
    stockRef.get()
      .then(doc => {
        if (!doc.exists) {
          functions.logger.log('No such document!');

        } else if (doc.data()) {


          const data = doc.data();
          functions.logger.log('Document data:', data);
          if (data) {
            const stock = data.data;
            functions.logger.log('Stock' + stock);
            newOrder.order.forEach(element => {
              functions.logger.log('Element' + element);
              stock.find((p: { id: string; value: any }) => p.id === element.id).value = Number(stock.find((p: { id: string; value: any }) => p.id === element.id).value) - Number(element.qty);
              batch.update(stockRef, { data: stock });
            });
            functions.logger.log('COMItting');
            batch.commit().catch(err => functions.logger.log(err))
              .then(() => functions.logger.log('this will succeed'))
              .catch(() => 'obligatory catch')
          }
        }

      }).catch(err => {
        functions.logger.log('Error getting document', err);
      });

    //EMAIL TRIGGER

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: "OAuth2",
        user: 'deliveryyaartech@gmail.com',
        clientId: "441357297581-ouj0qr6besft2nl97c7777j034klduk0.apps.googleusercontent.com",
        clientSecret: "VUC_RFeKty-acAnB33Pbu1mh",
        refreshToken: "1//04i6spbvbEwykCgYIARAAGAQSNwF-L9Irh58mqruYs3SKxU8Ejhd7pHnKOtgr6nHsQMwh94JBZmRzIriLpFtp409fpmy1n7lDbrQ",
        accessToken: myAccessToken //access token variable we defined earlier
      }
    });

    // getting dest email by query string
    const dest = 'redgun6@gmail.com';
    let location = '';
    if (newOrder.location !== undefined) {
      location = 'https://www.google.com/maps/search/?api=1&query='.concat(newOrder.location.lat).concat(',').concat(newOrder.location.log);
    }

    const mailOptions = {
      from: 'Delivey Yaar <deliveryyaartech@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
      to: dest,
      subject: 'New Order :' + newOrder.oid, // email subject
      html: orderList.logo + 'https://i.ibb.co/7bfYbzw/logo.png' +
        orderList.cname + newOrder.name +
        orderList.phNo + newOrder.phone +
        orderList.address + newOrder.address +
        orderList.locationURL + location +
        orderList.oid + newOrder.oid +
        orderList.headerEnd +
        body +
        orderList.subTotal + newOrder.cartValue +
        orderList.otherPrice + newOrder.shippingCharge +
        orderList.total + newOrder.total +
        orderList.end
    };

    // returning result

    try {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          functions.logger.error('Error' + JSON.stringify(error));
        }
        else {
          functions.logger.info('Message %s sent: %s', info.messageId, info.response);
        }

      });
      functions.logger.info('out from sent email');
    } catch (error) {
      functions.logger.error('email not sent');
    }


  });