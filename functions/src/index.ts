import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Order } from "./model/order";
import { orderList } from './HTMLconstants/orderList';
const nodemailer = require('nodemailer');
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

exports.updateStock = functions.firestore
  .document('Orders/{id}')
  .onCreate(async (snap, context) => {
    functions.logger.log('Came inside on create');
    const newOrder = <Order>snap.data();
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
        user: 'deliveryyaartech@gmail.com',
        pass: 'sanitizer'
      }
    });

    // getting dest email by query string
    const dest = 'redgun6@gmail.com';

    const bodyContent = ' ';

    newOrder.order.forEach(element => {
      const temp = orderList.pImg + element.image +
        orderList.pName + element.name +
        orderList.variant + element.variant +
        orderList.qty + element.qty + ' X ' + element.price +
        orderList.price + element.tPrice +
        orderList.pEnd;
      bodyContent.concat(temp);
    });
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
        bodyContent +
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