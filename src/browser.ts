import { FavCRMClient } from './client.js';
import * as shop from './shop.js';
import * as checkout from './checkout.js';
import * as coupon from './coupon.js';
import * as validation from './validation.js';

const FavCRM = {
  Client: FavCRMClient,
  ...shop,
  ...checkout,
  ...coupon,
  ...validation,
};

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).FavCRM = FavCRM;
}

export default FavCRM;
