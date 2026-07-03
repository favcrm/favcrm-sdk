# Changelog

All notable changes to @favcrm/sdk are documented in this file.

## 1.7.1 (2026-07-03)

### Fixed

- **Shop stock helpers in published package** — exports `getMaxPurchasableQuantity()`
  and `clampPurchasableQuantity()`, and preserves `stockQuantity` /
  `trackInventory` when converting products and variations with `toCartProduct()`.

## 1.4.0 (2026-05-18)

### New

- **Content blocks layout support** — added the `columns` container block,
  recursive registry validation for container plugins, and `flattenBlocks()`
  for layout-agnostic renderers, excerpts, and HTML previews.
- **Workspace resolver** — `createWorkspaceResolver({ apiUrl })` maps a
  storefront deployment's hostname to its `companyId` via the public
  `/v6/customer-portal/storefront/resolve-domain` endpoint, with built-in
  caching and local-host short-circuit. Lets a deployment identify its
  workspace at request time instead of a hard-coded env var.

## 1.2.0 (2026-05-04)

### New

- **Shop offers** — `shop.listOffers(params?)` and `shop.getOffer(slug)`,
  with new types `ShopOffer`, `ShopOfferContext`, `ShopOfferProduct`,
  `ShopOfferListParams`. Checkout helpers updated for offer rules.
- **`EventsClient.startPayment(registrationId)`** — convenience that calls
  `createPaymentIntent` and falls back to `payments.getGateway()` when the
  intent omits `publishableKey`. Always returns a usable Stripe key for
  client-side Elements mounting.
- **Event display helpers** (framework-agnostic, locale-aware):
  - `getAvailableEventDates(event)` — sessions with id, available, not full/expired.
  - `getPrimaryEventDate(event)` — first bookable session or fallback.
  - `isEventBookable(event)` — convenience predicate.
  - `getMaxOrderQuantity(event, date)` — clamps quantity to per-order cap and remaining quota.
  - `sortEventsForDisplay(events)` — sort by primary session start time.
  - `formatEventPrice(event, { locale, freeLabel })` — currency-aware, cached `Intl.NumberFormat`.
  - `formatEventDate(date, { locale, timeZone, fallbackLabel, timezoneLabel })` — handles all-day, ranges, and timezone suffix.
  - `getDeliveryModeLabel(mode)` — Online / Hybrid / In-person.
  - `getEventAvailabilityLabel(event, labels?)` — Open / Sold out / Ended / Cancelled with custom-label support.
  - `stripHtml(value)` — removes tags/style/script blocks and decodes common entities for plain-text rendering of `Event.description` (which can contain HTML when it falls back to `content`).

### Changed

- **`mapApiEvent` is now defensive about session ids**: when `ApiEventDate.id`
  is missing, the resulting `EventDate.available` is forced to `false` so
  storefronts can't accidentally submit a `null` sessionId. Other flags
  (`isExpired`, `isFull`) still reflect the underlying state.

### Types

- New exports: `FormatEventPriceOptions`, `FormatEventDateOptions`,
  `EventAvailabilityLabels`.

## 1.0.0 (2026-04-28)

### Breaking changes

None — this is the first public release. All previous versions (< 1.0.0) were internal development versions.

### New

- **Public README** with full authentication guide, 5 quickstarts, and namespace reference
- **MCP integration guide** for connecting AI agents to FavCRM
- **Resource links** to OpenAPI spec, interactive docs, developer portal, and content block guide
- **Error handling examples** showing `FavCRMError` usage

### Improved

- Clarified API endpoints and authentication flow in documentation
- Added comprehensive examples for bookings, shop, blog, promotions, loyalty, and payments
- Expanded namespace table with all 14 SDK modules

### Documentation

- `README.md` — SDK overview, quick start, and API reference
- `CHANGELOG.md` — version history
- `docs/CONTENT_BLOCKS.md` — block-based CMS content model

---

**Note**: This version opens @favcrm/sdk for external developers (indie devs, agencies) building storefronts and tools on FavCRM's headless API.
