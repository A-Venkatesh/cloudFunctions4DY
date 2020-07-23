import { Cart } from "./cart";

export interface Order {
    uid: string;
  oid: string;
  order: Array<Cart>;
  status: string;
  date: any;
  address: string;
  note: string;
  location: {
    lat: string,
    log: string,
    zoom: string
  };
  paySts: false;
  payType: string;
  name: string;
  phone: string;
  cartValue: number;
  shippingCharge: number;
  total: number;
  qty: number;
  save: number;
}