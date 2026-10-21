# Asset Rental Management — Step 02: Browse and Select an Asset

**Business model:** One rental company, admin-managed physical inventory, external customers.  
**Actor:** Renter/customer (guest browsing allowed; login required before Step 03).  
**Input:** Published listings, eligible units/stock, rates, locations and policies created in Step 01.  
**Output:** A validated asset, rental date range, quantity and indicative quote ready for Step 03.

## 1. Objective and Scope

Build a trustworthy, fast customer catalog that answers five questions: **What can I rent? Is it suitable? When is it available? What will it cost? Where do I collect/return it?** Step 02 is discovery/selection, **not a committed reservation**. A public availability result may become stale before request submission.

### Included

- Catalog listing, keyword search, category/brand/location/price filters and sorting.
- Product detail page with photo gallery, specifications, rental rules and inclusions.
- Date/time and quantity selection; availability preview with clear timezone.
- Price estimate from server-owned rate rules, with deposit, tax and delivery identified separately.
- Guest viewing, mobile responsive UI, no results, unavailable and API failure states.
- Product-selection state passed to Step 03; analytics without exposing private customer data.

### Excluded until later

- Booking creation and customer identity capture (Step 03).
- Approval/temporary inventory hold (Step 04), payment (Step 05), final reservation (Step 06).
- Handover, return, inspection and refund (Steps 07–11).

## 2. User Journey

1. Customer opens `/rentals` from website/navigation.
2. System displays **published** listings that meet public eligibility rules.
3. Customer searches or filters by asset type, category, brand, location, rate and dates.
4. Customer opens `/rentals/{slug}` and reviews description, gallery, specifications, what is included, pickup/delivery, terms and deposit.
5. Customer selects pickup start, return end, quantity and a fulfillment method.
6. Server validates interval, rental duration, business hours, lead time, quantity, maintenance blocks and all current commitments.
7. UI displays `Available (N units)` or a clear unavailable explanation/alternative dates.
8. Server returns **indicative itemized quote** with pricing rules and expiry (if configured); UI labels it as an estimate.
9. Customer clicks **Request Rental**; app carries the selection to Step 03 and authenticates if needed.

**Flow branch:** if unavailable, show alternate dates, related assets or alternative pickup location; do not let the customer proceed as if a unit were confirmed.

## 3. UI Specification

### A. Browse Catalog Page

| Area | Component | Behavior |
|---|---|---|
| Header | `Rent Equipment` + search | Keyboard-enter or debounced query; clear search |
| Filter bar | Category / brand / location / period | Filters reflected in URL query string |
| Pricing | Rate/unit and currency | `From $10/day` only if rate is genuinely applicable |
| Sort | Recommended, rate, name, newest | Stable ordering; deterministic tie-break |
| Cards | Cover, name, tags, short specs, price, status | Click opens details; never leak unit serial or costs |
| Pagination | Page / Load more | Avoid downloading every asset |
| Empty state | Friendly explanation and Reset filters | Distinguish no matching asset from network failure |
| Mobile | Collapsible filter drawer | Keyboard, touch and screen-reader friendly |

### B. Asset Detail Page

- Breadcrumbs → large image gallery → title/category/brand.
- Key features and specification table; included accessories, exclusion notes, customer-facing documents.
- Rental rate, billing basis, currency, deposit and any mandatory fees separately.
- Date/time range picker, quantity stepper, fulfillment location/delivery choice.
- Availability result, next valid slot suggestions, server-calculated estimate.
- Terms, minimum/maximum duration, cutoff time, late fees, cancellation terms.
- Sticky **Request Rental** button, disabled while invalid/unavailable; loading and error feedback.
- Similar assets section, without pretending they are interchangeable after user selection.

### C. UI Statuses

`LOADING`, `AVAILABLE`, `LIMITED_STOCK`, `UNAVAILABLE`, `INVALID_DATES`, `QUOTE_EXPIRED`, `NETWORK_ERROR`, `LISTING_UNPUBLISHED`.

Show full dates, timezone and whether a daily rate represents a calendar day or a 24-hour block. Clear user inputs only when required; preserve them on authentication redirect to Step 03.

## 4. Inputs and Data Contract

| Field | Type | Rule |
|---|---|---|
| `listing_id` / `slug` | ID/string | Must resolve to published, renter-visible listing |
| `location_id` | ID | Listed pickup/return option |
| `start_at`, `end_at` | Zoned timestamp | `start_at < end_at`; interpreted in location timezone |
| `quantity` | Positive integer | Cannot exceed date-specific availability |
| `fulfillment` | Enum | `PICKUP` or `DELIVERY`, if listing allows |
| `currency` | ISO currency | Must match quote/rate; no silent conversion |
| `price_estimate` | Money breakdown | Generated on server, not trusted from browser |
| `quote_token` | Opaque ID | Optional short-lived signed/DB-backed quote reference |
| `checked_at`, `quote_expires_at` | Timestamp | Required if quote validity is limited |

### Availability Algorithm

1. Validate published listing, location, dates, quantity and policies.
2. Normalize requested times to UTC; apply configured preparation and return buffers.
3. Determine eligible units (`ACTIVE`, correct location, rentable) or quantity-pool capacity.
4. Exclude unit blocks, maintenance, **confirmed reservations/active rentals** and **unexpired approved payment holds** that overlap the buffered interval.
5. For serialized inventory, count distinct qualifying units available for **the entire interval**; do not count a unit free for only part of the requested dates.
6. For quantity pools, compute capacity at every commitment boundary and take the minimum free quantity throughout the interval.
7. Return availability, checked timestamp and reason codes. Step 03/04/06 must revalidate under transaction locks before committing.

Use half-open intervals `[start_at, end_at)` with a defined buffer policy. Display availability as advisory, not inventory ownership. Never rely on a stored `available_quantity` that ignores time overlaps.

### Quote Calculation

- Read effective rate for requested period and billing policy from Step 01.
- Apply explicit duration rounding; calculate item rental subtotal × quantity.
- Show discount, tax, optional delivery, deposit and payable total as separate fields.
- Validate currency consistency and use decimal/integer minor units, not floating point for settlement.
- Show a note if additional late/damage fees are contingent and not yet due.
- Preserve price rule version/reference to later snapshot final charges in Step 03.

## 5. Proposed API Endpoints

```http
GET /api/rental-assets?search=&categoryId=&brandId=&locationId=&sort=&page=&pageSize=
GET /api/rental-assets/{slug}
POST /api/rental-assets/{id}/availability-check
POST /api/rental-assets/{id}/quote-preview
GET /api/rental-assets/{id}/alternative-slots?startAt=&endAt=&quantity=
```

**Availability request:** `{ "location_id": 1, "start_at": "2026-10-21T09:00:00+07:00", "end_at": "2026-10-23T09:00:00+07:00", "quantity": 1 }`.  
**Response (illustrative):** `{ "available": true, "available_quantity": 3, "checked_at": "...", "reason_code": null }`.

Public endpoints must expose only approved public projections. Rate-limit availability queries, cache published listing details carefully, and invalidate when published data changes; **do not cache final reservation decisions**.

## 6. Suggested Data Dependencies

Read Step 01: `asset_listing`, `asset_unit`, `asset_stock_pool`, `asset_rate`, `asset_rental_policy`, `asset_media`, `asset_location`, `asset_blocked_interval`.  
Read later steps when available: `rental_inventory_hold`, `rental_reservation`, `rental_unit_allocation`, `rental_handover`, `rental_return`.

Optional infrastructure: `catalog_search_index` or search service; `quote_preview` ephemeral cache; `catalog_view_event` privacy-conscious aggregate telemetry. Do not create permanent booking records just because a person checks availability.

## 7. Critical Rules, Security and Failure Handling

- Unpublished/archived listings must 404 or be inaccessible from public API and searches.
- Renter sees no purchase cost, confidential maintenance notes, customer data, or specific serial numbers.
- Search parameters are allowlisted and paginated to prevent expensive unrestricted queries.
- Server recomputes quotes and availability; never accept client-supplied price as authoritative.
- Timezone/dst boundaries follow the location time zone; store instants in UTC.
- Calendar blocks, active holds and committed reservations take priority over public availability.
- If catalog or pricing API fails, show retry; do not display fictitious available stock.
- Handle race conditions: two browsers can see a final unit available simultaneously. Only Step 04/06 can commit inventory.
- Public gallery is optimized and accessible, with descriptive alt text and safe media URLs.
- Customer consent is not collected until needed; avoid tracking sensitive identifiers on browse.

## 8. UAT Test Matrix

| ID | Scenario | Expected result |
|---|---|---|
| B01 | Browse with no login | Published catalog accessible |
| B02 | Draft asset exists | Hidden in public result |
| B03 | Search by partial name / code | Expected products returned |
| B04 | Filter category, location and brand | Correct intersection |
| B05 | Paginate and sort | Stable, nonduplicate results |
| B06 | Asset with 10 units, 7 blocked | At most 3 available |
| B07 | Date interval overlaps maintenance | Blocked units excluded |
| B08 | Date interval outside operating window | Validation error |
| B09 | Rental shorter than minimum | Explanation shown |
| B10 | Request 5 when only 3 free | Unavailable / adjust quantity |
| B11 | Pickup boundary adjacent to return | Applies documented buffer correctly |
| B12 | Price estimate with deposit, fee, tax | Itemization matches server math |
| B13 | Changed admin rate | New estimate uses updated rate; old request not silently changed |
| B14 | Asset unpublished while detail open | Next check prevents proceeding |
| B15 | Network error | Retry UI without false availability |
| B16 | Mobile filter + date picker | Usable at normal zoom |
| B17 | Guest clicks Request Rental | Login/continue and preserve selection |
| B18 | Two browsers check final unit | Both may preview; no double commitment downstream |
| B19 | Malformed date/time/currency | API validation error |
| B20 | Unauthorized/private field requested | No sensitive data leaked |

## 9. Definition of Done and Handoff

- [ ] Public listing/search/detail pages are responsive and accessible.
- [ ] Search, filters and sorting are correct and paginated.
- [ ] Date/quantity/fulfillment selector validates policies.
- [ ] Server availability excludes committed and blocked inventory.
- [ ] Price estimate is itemized, consistent and currency-safe.
- [ ] All customer-visible content comes from published listing projections.
- [ ] Selection passes a **listing ID, interval, quantity and server quote reference** to Step 03.
- [ ] Tests B01–B20 pass or have documented accepted exceptions.

**Next:** Step 03 creates the renter's actual request and a durable quote snapshot. Do not mark the asset reserved at the end of Step 02.

## Primary Reference

- [Odoo 19 physical rental products](https://www.odoo.com/documentation/19.0/applications/sales/rental/products.html): rental prices, serial tracking, buffers and scheduling.
