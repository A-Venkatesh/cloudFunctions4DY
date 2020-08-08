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
}