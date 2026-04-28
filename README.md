# @favcrm/sdk

JavaScript/TypeScript SDK for [FavCRM](https://favcrm.io) — the AI-native business OS for merchants. Manage bookings, CMS content, shop products, members, loyalty, and more — from your app or AI agent.

## Install

```bash
npm install @favcrm/sdk
```

## Quick start

### Initialize the SDK

```typescript
import FavCRM from '@favcrm/sdk';

const sdk = new FavCRM({
  baseUrl: 'https://api.favcrm.io',
  companyId: 'your-company-id',
});
```

### Authentication

The SDK uses OTP (one-time password) authentication. Users log in with their email or phone:

```typescript
// Step 1: Send OTP
const sendResponse = await sdk.auth.sendOtp({ email: 'user@example.com' });
// → OTP delivered to their inbox

// Step 2: User receives OTP and verifies
const authResponse = await sdk.auth.verifyOtp(
  { email: 'user@example.com' },
  '123456',
);

// Step 3: Store token and use for authenticated requests
sdk.setToken(authResponse.accessToken);
```

All subsequent SDK calls include the token automatically.

### MCP Integration (for AI agents)

Connect to FavCRM's MCP (Model Context Protocol) endpoint for AI agent access:

```
Endpoint: https://api.favcrm.io/mcp
Auth: API Key (fav_mcp_*)

Flow:
1. Create API key via POST /v6/mcp/keys (requires JWT)
2. Request OTP via POST /v6/mcp/auth/request
3. Verify OTP and get session token via POST /v6/mcp/auth/verify
4. Use session token for AI tool access
```

See https://favcrm.io/developers for MCP setup and available tools.

---

## Quickstart 1 — Booking Storefront

List available services and create a booking:

```typescript
// List all booking services
const services = await sdk.bookings.listServices();
console.log(services[0].name); // e.g. "Haircut", "Massage"

// Get available time slots for a specific date
const slotsResponse = await sdk.bookings.getTimeSlots('service-id', {
  date: '2026-05-15',
});

console.log(slotsResponse.slots[0]); 
// { startTime: '2026-05-15T09:00:00Z', available: true, ... }

// Create a booking
const booking = await sdk.bookings.create({
  serviceId: 'service-id',
  slotId: 'slot-id',
  guestEmail: 'customer@example.com',
  guestName: 'John Doe',
  guestPhone: '+1234567890',
});

console.log(booking.id); // Booking confirmed
```

---

## Quickstart 2 — CMS Blog Post

List and retrieve blog posts with block-based content:

```typescript
// List blog posts (paginated)
const postsResult = await sdk.blog.list({ limit: 10 });
console.log(postsResult.items[0].title); // "New Features"

// Get a single post by slug
const post = await sdk.blog.getBySlug('new-features');

// Posts contain structured blocks (paragraphs, images, headings, etc.)
console.log(post.blocks);
// [
//   { id: '1', type: 'heading', version: 1, data: { level: 2, text: 'Introduction' } },
//   { id: '2', type: 'paragraph', version: 1, data: { html: '<p>Welcome...</p>' } },
//   { id: '3', type: 'image', version: 1, data: { src: 'https://...', alt: 'Demo' } },
// ]

// Render blocks in your frontend using a block renderer
for (const block of post.blocks) {
  switch (block.type) {
    case 'heading':
      console.log(`<h${block.data.level}>${block.data.text}</h${block.data.level}>`);
      break;
    case 'paragraph':
      console.log(`<div>${block.data.html}</div>`);
      break;
    case 'image':
      console.log(`<img src="${block.data.src}" alt="${block.data.alt}" />`);
      break;
  }
}
```

For detailed content block structure, see [docs/CONTENT_BLOCKS.md](docs/CONTENT_BLOCKS.md).

---

## Quickstart 3 — Shop Checkout

Build a product catalog and create orders:

```typescript
// List products with filtering
const products = await sdk.shop.listProducts({
  category_slug: 'electronics',
  sort: 'price_asc',
  limit: 20,
});

console.log(products[0]); // { id, name, price, image, ... }

// Get single product details
const product = await sdk.shop.getProduct('laptop-pro');
console.log(product.description);

// List available payment methods
const paymentMethods = await sdk.shop.listPaymentMethods();

// Get shipping methods for order amount
const shippingMethods = await sdk.shop.listShippingMethods(15000); // $150.00

// Create an order
const order = await sdk.shop.createOrder({
  items: [
    { productSlug: 'laptop-pro', quantity: 1 },
    { productSlug: 'usb-cable', quantity: 2 },
  ],
  email: 'customer@example.com',
  shippingMethodId: 'standard-shipping',
  paymentMethodId: 'card-stripe',
  couponCode: 'SUMMER2026', // optional
});

console.log(order.id); // Order created and payment processed
```

---

## Quickstart 4 — Membership & Loyalty

Manage member profiles and loyalty programs:

```typescript
// Get current member profile (requires authentication)
const member = await sdk.members.getProfile();
console.log(member.email, member.loyaltyBalance);

// Update profile
await sdk.members.updateProfile({
  firstName: 'Jane',
  lastName: 'Doe',
});

// List available membership tiers
const tiers = await sdk.tiers.list();
console.log(tiers[0].name); // e.g. "Gold", "Platinum"

// Enroll in a membership tier
const enrollment = await sdk.members.enroll('tier-id');
console.log(enrollment.membershipId);

// Get loyalty card settings
const cardSettings = await sdk.members.getCardSettings();
console.log(cardSettings.cardNumber);
```

---

## Quickstart 5 — Promotions & Checkout

Validate coupon codes and apply promotions:

```typescript
// Validate a coupon or promotion code
const validation = await sdk.promotions.validate({
  code: 'SUMMER2026',
  itemTotal: 10000, // $100.00
  applicableItems: ['laptop-pro', 'usb-cable'],
});

console.log(validation.valid); // true
console.log(validation.discountAmount); // 2000 (20% off)
console.log(validation.discountPercent); // 20

// Use validation result when creating orders
if (validation.valid) {
  const order = await sdk.shop.createOrder({
    items: [...],
    couponCode: 'SUMMER2026',
  });
}
```

---

## Namespaces

| Namespace | Purpose | Key Methods |
|-----------|---------|------------|
| `auth` | OTP login, token management | `sendOtp`, `verifyOtp`, `getLoginChannel`, `register` |
| `shop` | Products, categories, orders | `listProducts`, `getProduct`, `createOrder`, `listOrders` |
| `bookings` | Services, time slots, bookings | `listServices`, `getTimeSlots`, `create`, `list`, `get` |
| `events` | Event listing and registration | `list`, `get`, `register`, `listRegistrations` |
| `members` | Member profiles, loyalty, card | `getProfile`, `updateProfile`, `getCardSettings`, `listPaymentMethods` |
| `payments` | Checkout, payment intents | `getGateway`, `createIntent`, `getCreditBalance` |
| `promotions` | Coupon/promo validation | `validate` |
| `invoices` | Invoice listing | `list`, `get` |
| `cms` | CMS pages | `listPages`, `getPage` |
| `blog` | Blog posts with block content | `list`, `getBySlug` |
| `packages` | Service packages | `listMyOrders`, `getApplicable` |
| `tiers` | Membership tiers | `list` |
| `contact` | Contact/enquiry forms | `submit` |
| `walletPasses` | Apple/Google wallet passes | `getStatus`, `generate`, `downloadAppleBlob` |
| `gifts` | Gift offers and redemption | `listMyRedemptions`, `getOffer`, `redeemOffer`, `claimByCode` |

---

## Error Handling

All SDK methods throw `FavCRMError` on failure:

```typescript
import { FavCRM, FavCRMError } from '@favcrm/sdk';

try {
  const booking = await sdk.bookings.create({...});
} catch (error) {
  if (error instanceof FavCRMError) {
    console.error(`Error ${error.status}: ${error.message}`);
    if (error.code === 'SLOT_NOT_AVAILABLE') {
      // Handle specific error
    }
  }
}
```

---

## Configuration

### With custom fetch implementation

Useful for Node.js runtimes or custom network handlers:

```typescript
const sdk = new FavCRM({
  baseUrl: 'https://api.favcrm.io',
  companyId: 'your-company-id',
  fetch: customFetch, // optional; defaults to globalThis.fetch
});
```

### Logout

```typescript
sdk.clearToken();
```

---

## Resources

- **OpenAPI Specification**: https://api.favcrm.io/openapi.json
- **Interactive API Docs**: https://api.favcrm.io/docs
- **LLM Context File**: https://favcrm.io/llms.txt
- **MCP Endpoint**: https://api.favcrm.io/mcp
- **Developer Portal**: https://favcrm.io/developers
- **Content Blocks Guide**: [docs/CONTENT_BLOCKS.md](docs/CONTENT_BLOCKS.md)

---

## License

MIT
