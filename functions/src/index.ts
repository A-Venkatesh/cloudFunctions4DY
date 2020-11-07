import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Order } from "./model/order";
import { orderList } from './HTMLconstants/orderList';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { gmail } from './CosmoSecure/Gmail_API';
import { notification } from "./service/notification";
import { Coupon } from './model/coupon';

admin.initializeApp();
const db = admin.firestore();

//API Authentication Details
const OAuth2 = google.auth.OAuth2;
const myOAuth2Client = new OAuth2(
  gmail.clientId,
  gmail.clientSecret,
  gmail.url
);
myOAuth2Client.setCredentials({
  refresh_token: gmail.refresh_token
});

const myAccessToken = myOAuth2Client.getAccessToken();

//Email common
const dest = 'service@deliveryyaar.com';
// const dest = 'redgun6@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: "OAuth2",
    user: 'deliveryyaartech@gmail.com',
    clientId: gmail.clientId,
    clientSecret: gmail.clientSecret,
    refreshToken: gmail.refresh_token,
    accessToken: myAccessToken //access token variable we defined earlier
  }
});

const transporter2 = nodemailer.createTransport({
  host: 'smtp.yandex.com',
  port: 465,
  secure: true,
  auth: {
    user: 'delivery.yaar@yandex.com',
    pass: 'sanitizer'
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
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

    // notify admins
    const notiC = db.collection('notificationToken');
    const snapshot = await notiC.get();
    if (!snapshot.empty) {
      snapshot.forEach(u => {
        console.log(u.id, '=>', u.data());
        notification.createNewOrderNotification(newOrder, u.data().tokens).then((response) => {
          functions.logger.info(newOrder.oid + ' Successfully sent Notification:', response);
        })
          .catch((error) => {
            functions.logger.error(newOrder.oid + 'Error sending Notification:', error);
          });;
      });
    }

    //Incremental OID
    const countRef = db.collection('counter').doc('order');
    countRef.update({
      oid: admin.firestore.FieldValue.increment(1)
    }).then(() => functions.logger.debug('this will succeed'))
      .catch(() => functions.logger.error(newOrder.oid + ' increment oid failed'));

    //Stock Update
    const stockRef = db.collection('stock').doc('main');
    const batch = admin.firestore().batch();
    stockRef.get()
      .then(doc => {
        if (!doc.exists) {
          functions.logger.error('No such document!');
        } else if (doc.data()) {
          const data = doc.data();
          try {
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
          } catch (error) {
            functions.logger.error('Stock update recurtion Failed', error);
          }
        }

      }).catch(err => {
        functions.logger.error('Error getting document', err);
      });

    //EMAIL TRIGGER
    // getting dest email by query string
    let location = '';
    if (newOrder.location !== undefined) {
      location = 'https://www.google.com/maps/search/?api=1&query='.concat(newOrder.location.lat).concat(',').concat(newOrder.location.log);
    }
    let discountHTML = '';
    let couponHTML = '';
    if (newOrder.cSave > 0) {
      couponHTML = '<br> <b> Coupon Applied </b> : ' + newOrder.coupon;
       discountHTML = orderList.discountS + newOrder.cSave + orderList.discountE;
    }

    const mailOptions = {
      from: 'Delivey Yaar <deliveryyaartech@gmail.com>',
      to: dest,
      subject: 'New Order : ' + newOrder.oid, // email subject
      // attachments: [
      //   {   // utf-8 string as an attachment
      //       filename: 'copy.html',
      //       content: 'hello world!'
      //   }],
      html: orderList.logo + 'https://i.ibb.co/7bfYbzw/logo.png' +
        orderList.cname + newOrder.name +
        orderList.phNo + newOrder.phone +
        orderList.address + '<b>Address : </b>' + newOrder.address + '<br> <b>Note</b> : ' + newOrder.note +
        couponHTML +
        // orderList.note + newOrder.note +
        orderList.locationURL + location +
        orderList.oid + '  :  ' + newOrder.oid +
        orderList.headerEnd +
        body +
        orderList.subTotal + newOrder.cartValue +
        orderList.otherPrice + 
        discountHTML +
        orderList.ship + newOrder.shippingCharge +
        orderList.total + newOrder.total +
        orderList.end
    };

    // returning result
    // mailOptions.attachments = [
    //   {   // utf-8 string as an attachment
    //       filename: 'copy.html',
    //       content: mailOptions.html
    //   }]
    transporter.sendMail(mailOptions, (err, info) => {
      try {
        if (err) {
          functions.logger.error(newOrder.oid + ' Gmail Error' + JSON.stringify(err));
          throw new Error("failed in gmail");

        }
        else {
          functions.logger.info('Message %s sent: %s', info.messageId, info.response);
          // throw new Error("failed in yadex");
        }
      } catch (error) {
        mailOptions.from = 'Delivey Yaar <delivery.yaar@yandex.com>';
        transporter2.sendMail(mailOptions, (errors, infos) => {
          if (errors) {
            functions.logger.error(newOrder.oid + 'Yadex Error' + JSON.stringify(error));

          }
          else {
            functions.logger.info('Message %s sent: %s', infos.messageId, infos.response);
          }

        });
      }

    });
    functions.logger.debug('out from sent email');



    // Add usage on completion
    const cUsageCol = db.collection('cUsage');
    cUsageCol.doc().create({ uid: newOrder.uid, code: newOrder.coupon }).then(res => {
      functions.logger.info('Successfully updated the  Cupon :', res);
    }, err => {
      functions.logger.error('Error in apply cupon:', err);
    });

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


// On order value change
exports.updateOrder = functions.firestore
  .document('Orders/{id}')
  .onUpdate((change, context) => {
    // Get an object representing the document
    // e.g. {'name': 'Marie', 'age': 66}
    const newValue = change.after.data() as Order;

    // ...or the previous value before this update
    // const previousValue = change.before.data();

    // access a particular field as you would any JS property

    // perform desired operations ...
    const status = newValue.status;
    const oid = newValue.oid;

    const registrationToken = newValue.token;
    const message = {
      notification: {
        title: notification.getTitle(status),
        body: notification.getMsg(status, oid),
        // text: "Sorry to bother you I meant, please pick an option below..",
        // click_action: "GENERAL",
        // badge: "1",
        // sound: "default",
        // showWhenInForeground: true
      },
      // content_available: false,
      // data: {
      //   foo: "bar"
      // },
      // priority: "High",
      // to: registrationToken,
      token: registrationToken

    };

    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        functions.logger.info('Successfully sent Notification:', response);
      })
      .catch((error) => {
        functions.logger.error('Error sending Notification:', error);
      });
  });

exports.coupon = functions.https.onCall(async (data, context) => {

  const order = data.order as Order;
  const code = order.coupon;
  let discount = 0;
  let errMsg = 'Success';

  //get uid
  let uid = 'Unknow';
  try {
    uid = order.uid;
  } catch (error) {
    functions.logger.error('Error for uid', error);
    uid = 'ErrorUser';
  }

  //get number of times code user used
  let uCount = 0;
  const cUsageCol = db.collection('cUsage');
  const snapshot = await cUsageCol.where('uid', '==', uid).where('code', '==', code).get();
  if (!snapshot.empty) {
    snapshot.forEach(u => {
      console.log(u.id, '=>', u.data());
      uCount += 1;
    });
  }




  //get coupon deatil
  const couponsCol = db.collection('coupons').doc(code);
  const doc = await couponsCol.get();
  if (!doc.exists) {
    functions.logger.error('No such coupon!');
    errMsg = 'Invalid coupon';
  } else {
    functions.logger.debug('Document data:', doc.data());
    //get coupon detail
    const cdetail = doc.data() as Coupon;
    functions.logger.debug('Document data 2:', cdetail);
    // Check minimum cart value rule is meet
    if (cdetail.MinCart <= order.cartValue) {
      let products = order.order;
      let tol = 0;
      //check limit valid
      if (uCount < cdetail.uLimit) {
        // GETTING TOTAL DISCOUNTABLE VALUE
        functions.logger.debug('On for ctype' + cdetail.CType);
        // all products
        if (cdetail.CType === 'All') {
          tol = order.cartValue;
          functions.logger.debug('Inside All', tol);
        } else if (cdetail.CType === 'Categories') {
          //cat only
          const cats = cdetail.List;
          if (typeof (cats) === 'string') {
            products = products.filter(p => p.cat === cats);

            products.forEach(element => {
              tol += element.price;
            });
          } else {
            cats.forEach(cat => {
              const temp = products.filter(p => p.cat === cat);

              if (temp.length > 0) {
                temp.forEach(element => {
                  tol += element.price;
                });
              }
            });
          }
        } else if (cdetail.CType === 'Products') {
          //products only
          const pros = cdetail.List;
          if (typeof (pros) === 'string') {
            products = products.filter(p => p.fID === pros);
            if (pros.search('_') > -1) {
              const vID = Number(pros.substr(pros.indexOf('_') + 1, pros.length));
              products = products.filter(p => p.fID === pros && p.vID === vID);
              functions.logger.info('FID   |   VID', pros + '   |  ' + vID);
            } else {
              products = products.filter(p => p.fID === pros);
              functions.logger.info('FID  = ', pros);
            }
            products.forEach(element => {
              tol += element.price;
            });
          } else {
            pros.forEach(pro => {
              let temp;
              if (pro.search('_') > -1) {
                const vID = Number(pro.substr(pro.indexOf('_') + 1, pro.length));
                temp = products.filter(p => p.fID === pro && p.vID === vID);
                functions.logger.info('FID   |   VID', pro + '   |  ' + vID);
              } else {
                temp = products.filter(p => p.fID === pro);
                functions.logger.info('FID  = ', pro);
              }

              if (temp.length > 0) {
                temp.forEach(element => {
                  tol += element.price;
                });
              }
            });
          }
        }

        functions.logger.debug('zero total check', tol);
        // Condition for zero total check
        if (tol !== 0) {
          // REDUCE BASED ON DISCOUNT TYPE

          if (cdetail.DType === 'Percentage') {
            discount = (cdetail.Percent / 100) * tol ;
            if (discount > cdetail.Amount) {
              discount = cdetail.Amount;
            }
          } else if (cdetail.DType === 'Fixed') {
            discount = cdetail.Amount;
          } else if (cdetail.DType === 'Shipping') {
            discount = order.shippingCharge;
            if (!cdetail.SType) {
              discount = cdetail.Amount;
            }
          }
        } else {
          errMsg = 'Coupon invalid for your order';
        }
      } else {
        errMsg = 'Coupon usage limit exceeded';
      }


    } else {

      errMsg = 'Minimun cart value should be ' + cdetail.MinCart;
    }
  }


  functions.logger.debug('Coupon completed', discount);
  //Setting value
  order.cSave = Number(Number(discount).toFixed(2));
  return { err: errMsg, data: order };

});