import { Order } from "../model/order";
import * as admin from 'firebase-admin';
export class notification {


    public static getTitle(key) {

        let msg = ''
        switch (key) {
            case 'Order Placed':
                msg = 'Order Placed';
                break;
            case 'In-Progress':
                msg = 'Order In-Progress';
                break;
            case 'Out for Delivery':
                msg = 'Out for Delivery';
                break;
            case 'Completed':
                msg = 'Order completed';
                break;
            case 'Cancel':
                msg = 'Order canceled';
                break;
            default:
                msg = 'Delivery Yaar Exclusive';
                break;
        }

        return msg;
    }

    public static getMsg(key, id) {

        let msg = ''
        switch (key) {
            case 'Order Placed':
                msg = 'Your order ' + id + ' as been successfully placed, Our executive will reach you shortly';
                break;
            case 'In-Progress':
                msg = 'Our executive processing your order id : ' + id;
                break;
            case 'Out for Delivery':
                msg = 'Our executive will reach you shortly';
                break;
            case 'Completed':
                msg = 'Thanks for shoping with us';
                break;
            case 'Cancel':
                msg = 'Sorry for the inconvenience caused';
                break;

            default:
                msg = 'Thanks for shoping with us';
                break;
        }

        return msg;
    }




    public static createNewOrderNotification(order: Order, token) {

        const status = 'New Order ' + order.oid;
        const msg = 'Total Value : ' + order.total + '  '
        'Phone Number : ' + order.phone;

        const message = {
            notification: {
                title: status,
                body: msg,
                // imageUrl: "https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9",                // icon: "https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9",
            },
            android: {
                notification: {
                    icon: "https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9",
                    color: '#7e55c3'
                }
            },

            token: token,
            webpush: {
                // notification: {
                //     // title: status,
                //     // body: msg,
                //     renotify: true,
                //     requireInteraction: true,
                //     icon: 'https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9',
                //     badge: 'https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9',
                //     // imageUrl: "https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9",                // icon: "https://firebasestorage.googleapis.com/v0/b/delivery-yaar.appspot.com/o/ad%2Ffavicon.ico?alt=media&token=9a3f864a-29bb-4abc-974d-b5bbd6bc40d9",
                // },
                fcmOptions: {


                    link: 'https://delivery-yaar.web.app/dashboard',

                }
            },

        };

        // Send a message to the device corresponding to the provided
        // registration token.
        return admin.messaging().send(message);

    }
}