import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Order } from "./model/order";
import { orderList } from './HTMLconstants/orderList';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { cosmo } from './cosmo_config/DY_Gmail_API';

admin.initializeApp();
const db = admin.firestore();

//API Authentication Details
const OAuth2 = google.auth.OAuth2;
const myOAuth2Client = new OAuth2(
  cosmo.clientId,
  cosmo.clientSecret,
  cosmo.url
);
myOAuth2Client.setCredentials({
  refresh_token: cosmo.refresh_token
});

const myAccessToken = myOAuth2Client.getAccessToken();

//Email common
const dest = 'redgun6@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: "OAuth2",
    user: 'deliveryyaartech@gmail.com',
    clientId: cosmo.clientId,
    clientSecret: cosmo.clientSecret,
    refreshToken: cosmo.refresh_token,
    accessToken: myAccessToken //access token variable we defined earlier
  }
});

//On Order Create

exports.updateStock = functions.firestore
  .document('Orders/{id}')
  .onCreate(async (snap, context) => {
    functions.logger.debug('Came inside exports.updateStock');
    const newOrder = <Order>snap.data();

    functions.logger.info('Processing order ID ' + newOrder.oid);
    //Building HTML for order email
    let part = ' ';
    let body = ' ';
    for (let i = 0; i < newOrder.order.length; i++) {
      part = body;
      const element = newOrder.order[i];
      const temp = orderList.pImg + element.image +
        orderList.pName + element.name +
        orderList.variant + element.variant +
        orderList.qty + element.qty + ' X ' + element.price +
        orderList.price + element.tPrice +
        orderList.pEnd;
      body = part.concat(temp);
    }

    //Incremental OID
    const countRef = db.collection('counter').doc('order');
    countRef.update({
      oid: admin.firestore.FieldValue.increment(1)
    }).then(() => functions.logger.debug('this will succeed'))
      .catch(() => functions.logger.error('increment oid failed'));

    //Stock Update
    const stockRef = db.collection('stock').doc('main');
    const batch = admin.firestore().batch();
    stockRef.get()
      .then(doc => {
        if (!doc.exists) {
          functions.logger.debug('No such document!');
        } else if (doc.data()) {
          const data = doc.data();
          if (data) {
            const stock = data.data;
            functions.logger.debug('Stock recurtion started');
            newOrder.order.forEach(element => {
              stock.find((p: { id: string; value: any }) => p.id === element.id).value = Number(stock.find((p: { id: string; value: any }) => p.id === element.id).value) - Number(element.qty);
              batch.update(stockRef, { data: stock });
            });
            batch.commit().catch(err => functions.logger.error(err))
              .then(() => functions.logger.debug('Batch comit complted'))
              .catch(() => functions.logger.error('error in batch commit'))
            functions.logger.debug('Stock recurtion ended');
          }
        }

      }).catch(err => {
        functions.logger.log('Error getting document', err);
      });

    //EMAIL TRIGGER
    // getting dest email by query string
    let location = '';
    if (newOrder.location !== undefined) {
      location = 'https://www.google.com/maps/search/?api=1&query='.concat(newOrder.location.lat).concat(',').concat(newOrder.location.log);
    }

    const mailOptions = {
      from: 'Delivey Yaar <deliveryyaartech@gmail.com>',
      to: dest,
      subject: 'New Order : ' + newOrder.oid, // email subject
      html: orderList.logo + 'https://i.ibb.co/7bfYbzw/logo.png' +
        orderList.cname + newOrder.name +
        orderList.phNo + newOrder.phone +
        orderList.address + '<b>Address : </b>' + newOrder.address + '<br> <b>Note</b> : ' + newOrder.note +
        // orderList.note + newOrder.note +
        orderList.locationURL + location +
        orderList.oid + '  :  ' + newOrder.oid +
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

//Write to us Email 
exports.writeUS = functions.firestore
  .document('queries/{id}')
  .onCreate(async (snap, context) => {
    functions.logger.debug('Came inside exports.writeUS');
    const newQuerie = snap.data();

    //EMAIL TRIGGER
    const mailOptions = {
      from: 'Delivey Yaar <deliveryyaartech@gmail.com>',
      to: dest,
      subject: 'Help the Customer  :  ' + newQuerie.uid, // email subject
      text: 'Hi Admin' + '\n' + '\n   '
        + newQuerie.msg + '\n' + '\n'
        + '    ' + newQuerie.name + '    ' + newQuerie.phone
        + '\n' + '\n' + '\n' + '\n'
        + '-----------------------------------------------------------------------------'
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