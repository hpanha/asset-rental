# Asset Rental Management System — Step 01
## Complete Asset Catalog & Rental Configuration Specification

**Project model:** One rental company manages its own inventory; external renters browse and request the company's assets.  
**Primary actor:** Admin / Rental Manager.  
**Customer involvement:** Read-only browsing of **published** asset listings.  
**Scope:** Everything needed to create and publish rental-ready assets. Customer booking, approval, payment capture, delivery, and returns are separate later steps.

---

## 1. Definition of Done

Step 01 is complete only when an authorized admin can:

1. Configure asset categories, brands, physical locations, and default rental policies.
2. Create, edit, duplicate, preview, publish, unpublish, and archive an asset listing.
3. Add images and clear public descriptions/specifications.
4. Register individual physical units (or an appropriate quantity pool) and current condition.
5. Configure rental prices, currency, minimum/maximum duration, deposit, late fees, and pickup/return choices.
6. Mark assets or individual units unavailable for maintenance or other restrictions.
7. Save unfinished work as Draft and show clear validation errors before publication.
8. Expose only published, eligible inventory to the customer browsing catalog.
9. Provide the availability and pricing configuration needed by Step 02 (rental requests).
10. Keep an audit trail of critical inventory, pricing, and publication changes.

### Golden rule

Separate these concepts:

| Entity | Meaning | Example |
|---|---|---|
| **Asset listing / model** | Public page for a rentable product type | Dell Latitude 5440 Laptop |
| **Physical unit** | One trackable item owned or managed by the company | TO-LAP-0001 / SN ABC123 |
| **Rental rate** | Charging terms for the listing | USD 10 per day |
| **Availability** | Whether a unit can satisfy a specific time interval | 3 of 10 units available Oct 20–23 |

Ten identical laptops generally create **one listing and ten units**. This avoids duplicate customer cards and makes checkout/return traceability possible.

---

## 2. Ownership, Roles, and Permissions

The **rental company** owns or controls the inventory. The **admin** is a person permitted to manage the rental company's catalog; the **renter** is the external customer.

| Capability | Super Admin | Asset Manager / Admin | Renter |
|---|:---:|:---:|:---:|
| View drafts / all assets | Yes | Yes | No |
| View published catalog | Yes | Yes | Yes |
| Create and edit listings | Yes | Yes | No |
| Set rates, deposits, rental policy | Yes | Yes, if granted | No |
| Add physical units and availability blocks | Yes | Yes | No |
| Publish / unpublish | Yes | Yes, if granted | No |
| Configure roles, currencies, global settings | Yes | No | No |
| View purchase costs, private notes, audit log | Yes | Permission-controlled | No |

Enforce permissions at the API/database boundary, not only in the UI. Each write records `created_by`, `updated_by`, and date/time. The admin **does not personally have to own** the inventory.

---

## 3. Configuration Prerequisites

Before creating the first listing, configure:

| Configuration | Required | Recommended setup |
|---|---|---|
| Rental company | Yes | One company record with legal/display name |
| Base currency | Yes | Select USD or KHR for each price; do not silently mix currencies |
| Business timezone | Yes | `Asia/Phnom_Penh` for Cambodia |
| Categories | Yes | Laptop, Projector, Camera, Vehicle, Power Equipment, etc. |
| Pickup / return locations | Yes | Warehouse, branch, office, or delivery-only flag |
| Rental duration policy | Yes | Default minimum 1 day; optional maximum |
| Payment/deposit policy | Yes | Deposit allowed, whether refundable, fee timing (used later) |
| Late return policy | Yes | Grace period and fee basis; exact charging later |
| Booking lead time | Recommended | e.g., at least 2 hours before pickup |
| Turnaround buffer | Recommended | e.g., 2 hours between rentals for inspection/cleaning |
| Catalog approval permission | Recommended | Which staff may publish |
| Terms / condition template | Recommended | Rental policy link and acknowledgement text |

**Business decisions to confirm:** Who may publish? Can an asset be rented hourly, daily, or both? Do you require deposits? Are multiple pickup locations available? Do all assets need unique serial numbers?

---

## 4. Step 01 Admin Process

1. **Open Asset Management** → `Assets` → `Add Asset`.
2. **Choose category and tracking mode** → Serialized individual units or quantity-tracked pool.
3. **Enter listing details** → SKU, name, description, brand, model, specifications.
4. **Add media** → cover photo, gallery, optional documents and manuals.
5. **Register stock** → each unit's internal tag and serial, or pool quantity.
6. **Set rental pricing** → rate, billing unit, currency, deposit, late fee, and additional fees.
7. **Set rental and fulfillment rules** → minimum duration, advance notice, turnaround buffers, location, delivery/pickup.
8. **Set inventory availability** → maintenance, blackout or blocked dates; inspect unit condition.
9. **Save Draft** → may stop and continue later.
10. **Preview** → desktop/mobile customer-facing listing.
11. **Validate and Publish** → required fields pass validation, listing becomes customer-visible.

If publication fails, keep the existing Draft status and show actionable errors. Unpublishing should hide the listing from new rental requests but **must not cancel existing reservations**.

---

## 5. Required Data Fields

### A. Asset Listing — General Information

| Field | Type | Required to publish | Notes |
|---|---|:---:|---|
| `id` | UUID / BIGINT | Auto | Internal primary key |
| `code` | String (unique) | Yes | Example `LAP-DELL-5440` |
| `name` | String | Yes | Customer-visible name |
| `slug` | Unique string | Yes | URL-friendly public identifier |
| `category_id` | Reference | Yes | Must be active category |
| `brand_id`, `model` | Reference/string | Optional | Search/filter fields |
| `short_description` | Text | Yes | Summary on catalog card |
| `description` | Rich text | Recommended | Sanitized customer-facing detail |
| `specifications` | Key/value JSON or child rows | Recommended | RAM, CPU, capacity, voltage, etc. |
| `tracking_mode` | Enum | Yes | `SERIALIZED` or `QUANTITY` |
| `condition_note` | Text | Optional | Listing-level note; unit has actual condition |
| `pickup_location_ids` | References | Yes* | Required unless delivery-only |
| `allow_delivery` | Boolean | Yes | Fulfillment option |
| `cover_media_id` | Reference | Yes | Approved cover image |
| `visibility` | Enum | Yes | `DRAFT`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED` |
| `created_at`, `updated_at` | Timestamp | Auto | UTC in storage |

### B. Physical Unit / Inventory

For high-value reusable items, **one database row per physical asset**:

| Field | Required | Example / rule |
|---|:---:|---|
| `listing_id` | Yes | Parent laptop listing |
| `asset_tag` | Yes | Unique internal ID `TO-LAP-0001` |
| `serial_number` | If applicable | Serial must be unique within company where present |
| `location_id` | Yes | Phnom Penh Warehouse A |
| `base_status` | Yes | `ACTIVE`, `MAINTENANCE`, `RETIRED`, `LOST` |
| `condition_grade` | Yes | `NEW`, `EXCELLENT`, `GOOD`, `FAIR`, `DAMAGED` |
| `accessories` | Recommended | Charger, bag, remote control |
| `condition_photos` | Recommended | Baseline images before rental |
| `purchase_date`, `purchase_cost` | Optional / private | Never expose purchase cost to renter |
| `notes` | Optional / private | Internal staff only |

For inexpensive interchangeable items (e.g., 100 folding chairs), optional **quantity tracking** can use a stock-pool record: `listing_id`, `location_id`, `total_quantity`, `damaged_quantity`, `maintenance_quantity`. For an initial MVP you may simplify to **serialized units only**; the schema should still make adding quantity pools possible later.

**Do not equate `base_status = ACTIVE` with available now.** Availability for a date range must also subtract existing reservations, ongoing rentals, maintenance and blocked intervals. A mutable `available_quantity` field by itself cannot prevent time-overlap conflicts.

### C. Rental Rate and Financial Configuration

| Field | Required | Notes |
|---|:---:|---|
| `currency` | Yes | USD or KHR for a given rate |
| `billing_unit` | Yes | `HOUR`, `DAY`, `WEEK`, `MONTH` |
| `rate_amount` | Yes | Decimal, nonnegative; required positive for paid rental |
| `minimum_duration` | Yes | Positive integer and unit |
| `maximum_duration` | Optional | Must be ≥ minimum |
| `security_deposit` | Yes | May be zero; refundable rules documented |
| `late_fee_amount` / `late_fee_unit` | Recommended | Amount per hour/day |
| `late_grace_minutes` | Recommended | e.g., 30 minutes |
| `delivery_fee` | If delivery offered | Flat fee or future calculated service |
| `cleaning_fee` | Optional | If applicable, explain policy |
| `tax_rule_id` | If applicable | Tax config, not free-form text |
| `effective_from`, `effective_to` | Recommended | Rate effective dates |

**Pricing calculation must be unambiguous before Step 02.** Recommended MVP: one active base billing unit per listing (for example, day), with a defined rounding rule. Multiple simultaneous hourly/daily/weekly promotions can be added later only with a documented calculation and precedence policy. Future bookings must retain a **snapshot** of their quoted rate, even if an admin changes catalog pricing later.

### D. Availability and Fulfillment Settings

| Field | Purpose |
|---|---|
| `min_advance_notice_minutes` | Stops last-minute bookings |
| `preparation_buffer_minutes` | Time before an asset is ready for handover |
| `return_buffer_minutes` | Inspection/cleaning gap after return |
| `allowed_pickup_weekdays` | Restricts pickup schedule |
| `allowed_return_weekdays` | Restricts return schedule |
| `pickup_hours` | Business-hour time slots at each location |
| `blocked_intervals` | Maintenance or manual unavailability |
| `max_rental_days` | Business maximum for a rental |
| `allow_extension_request` | Whether an active renter may request more time |
| `delivery_enabled` | Enables fulfillment by delivery |

Availability rule for serialized assets: count eligible individual units whose availability interval **does not overlap** a blocking interval or confirmed reservation. Use half-open booking intervals `[start_at, end_at)` in UTC; buffer-adjusted occupancy is considered when checking conflicts. For pooled assets: calculate `eligible quantity minus overlapping committed quantities` per interval. Recheck transactionally when a booking is confirmed, not only when a page is displayed.

This Step 01 module stores rules, blockers and units; Step 02 will consume them to calculate date-specific availability.

### E. Images, Documents and Policies

- One cover image required; gallery supports multiple high-resolution images.
- Validate allowed MIME types, file extension and actual decoded content, file size, and safe storage paths.
- Generate thumbnails and responsive image sizes where possible.
- Store media order, alt text and whether it is public.
- Optional files: operation manual, safety instructions, warranty/inspection documentation.
- Keep private identity, purchase receipts, and supplier contracts hidden from renter.
- Link a current rental terms template, deposit/refund policy and liability information.
- Sanitize rich text and avoid unsafe HTML embedded from uploads.

---

## 6. Recommended Admin UI

### Screen 1 — Asset List

**Top bar:** `Assets` title, search, `+ Add Asset`, optional Import (later).  
**Summary cards:** Total Listings, Published, Drafts, Assets in Maintenance.  
**Filters:** Category, Brand, Published Status, Location, Tracking Mode, Condition.  
**Columns:** Photo, Code, Name, Category, Units, Public Starting Price, Visibility, Last Updated, Actions.

**Row actions:** View, Edit, Preview, Duplicate, Publish/Unpublish, Archive (subject to restrictions).  
**Bulk actions:** Publish, Unpublish, Archive (with permission and validation). Use a confirmation dialog.

### Screen 2 — Add/Edit Asset

Organize form into manageable tabs or a stepper:

1. **General:** Category, code, name, descriptions, specifications.
2. **Media:** Cover, gallery, reorder and alt descriptions.
3. **Inventory:** Tracking mode; individual units, tags, serials, location and condition.
4. **Rental Pricing:** Rate, billing unit, currency, deposit, late fee, tax settings.
5. **Availability:** Pickup/return schedule, lead time, buffer, blocks.
6. **Policies:** Terms and refund/damage policies.
7. **Preview & Publish:** Summary, errors, desktop/mobile preview, Publish button.

**Sticky action bar:** `Cancel`, `Save Draft`, `Save Changes`, `Preview`, `Publish` (when valid). Provide unsaved-change warnings.

### Screen 3 — Unit Management Drawer/Page

- Add a unit individually or a series of internal tags.
- Fields: asset tag, optional serial, current condition, location, base status, notes.
- Search/filter units and open individual history.
- Mark Maintenance / Restore to Active with an audit log.
- Warn if a status change would affect active/future rentals; prohibit unsafe changes.
- Show location and accessorial checklist.

### Screen 4 — Calendar / Unavailability

- Listing- or unit-level calendar of maintenance and blocked times.
- Create/edit/delete a block with reason, interval, scope, who created it.
- Differentiate administrative blocks from future bookings (once Step 02 exists).
- Reject overlaps with committed rentals unless an authorized reallocation/cancellation workflow exists.

### Screen 5 — Public Listing Preview

- Image gallery, name, category, key specifications, starting rental rate, deposit information, location, rental policies.
- Show an availability-date selector placeholder, or a working read-only check if the availability service exists.
- Hide internal notes, cost, exact unit serial number, audit data.
- `Rent Now` must be disabled/hidden until Step 02 is implemented.

### UI States

Support loading, empty asset list, no search results, no media, save in progress, validation failed, publish success, unauthorized, and network/error retry states.

---

## 7. Suggested Database Design

Names are examples; adapt to existing SQL conventions and the project's architecture.

| Table | Important columns | Relationship |
|---|---|---|
| `rental_company` | `id, name, timezone, currency` | Parent organization |
| `asset_category` | `id, name, code, parent_id, is_active` | Category tree |
| `asset_brand` | `id, name, is_active` | Optional reference |
| `asset_location` | `id, company_id, name, address, timezone, is_active` | Fulfillment/site |
| `asset_listing` | `id, company_id, code, slug, name, category_id, tracking_mode, visibility, ...` | Customer-facing listing |
| `asset_unit` | `id, listing_id, asset_tag, serial_number, location_id, base_status, condition_grade` | Serialized inventory |
| `asset_stock_pool` | `id, listing_id, location_id, total_qty, maintenance_qty` | Optional quantity tracking |
| `asset_rate` | `id, listing_id, currency, billing_unit, amount, effective_from, effective_to` | Rental rate |
| `asset_rental_policy` | `id, listing_id, deposit, min_duration, buffer_minutes, late_fee, ...` | Rental constraints |
| `asset_media` | `id, listing_id, file_key, media_type, is_public, sort_order, alt_text` | Media gallery |
| `asset_location_option` | `listing_id, location_id, pickup_enabled, return_enabled` | Many-to-many locations |
| `asset_blocked_interval` | `id, listing_id, unit_id nullable, start_at, end_at, reason` | Unavailability |
| `asset_audit_event` | `id, company_id, entity_type, entity_id, actor_id, action, before_json, after_json, created_at` | Audit trail |

**Constraints and indexes:**

- Unique `(company_id, code)` and `(company_id, slug)` for listings.
- Unique `(company_id, asset_tag)` for serialized physical units; enforce with database constraints or tenant-aware identity design.
- Nonnegative money and stock quantities; no zero-length intervals.
- Foreign keys for referenced company/category/location/listing.
- Index units by listing/location/base status; prices by listing/date; blocked intervals by unit/time.
- Archived listings should be retained for historical rental records; avoid hard-delete if referenced.
- Strong ownership/tenant checks so an admin cannot manipulate another company's records if multi-company support is later added.
- Store timestamps in UTC, interpret customer-entered dates using the business/location timezone.
- Keep public content and private operational/financial fields separate in query projections.

### Example API Endpoints

These are proposed contracts, not implemented endpoints:

```http
GET    /api/admin/assets?search=&categoryId=&visibility=&page=
POST   /api/admin/assets
GET    /api/admin/assets/{id}
PATCH  /api/admin/assets/{id}
POST   /api/admin/assets/{id}/publish
POST   /api/admin/assets/{id}/unpublish
POST   /api/admin/assets/{id}/archive
POST   /api/admin/assets/{id}/units
PATCH  /api/admin/assets/{id}/units/{unitId}
POST   /api/admin/assets/{id}/rates
POST   /api/admin/assets/{id}/blocks
GET    /api/admin/assets/{id}/audit

GET    /api/rental-assets?category=&search=&page=
GET    /api/rental-assets/{slug}
GET    /api/rental-assets/{slug}/availability?start=&end=&quantity=
```

Use consistent API responses, server-side pagination, authorization, validation errors per field, and optimistic concurrency (`row_version`/ETag) to avoid accidental overwrites by two admins.

### Example Asset Draft Payload

```json
{
  "code": "LAP-DELL-5440",
  "name": "Dell Latitude 5440 Laptop",
  "category_id": 1,
  "tracking_mode": "SERIALIZED",
  "short_description": "Business laptop available for short-term rental.",
  "currency": "USD",
  "billing_unit": "DAY",
  "base_rate": 10.00,
  "security_deposit": 50.00,
  "minimum_duration": 1,
  "minimum_duration_unit": "DAY",
  "preparation_buffer_minutes": 120,
  "return_buffer_minutes": 120,
  "visibility": "DRAFT",
  "units": [
    {
      "asset_tag": "TO-LAP-0001",
      "serial_number": "SN-LAP-0001",
      "location_id": 1,
      "base_status": "ACTIVE",
      "condition_grade": "GOOD"
    }
  ]
}
```

> The payload is illustrative; in production, the UI may submit listing, rates, units and media through different endpoints, using atomic saves as appropriate. No data should be implicitly trusted just because it originates from the admin UI.

---

## 8. Validation and Publication Rules

### Draft validation

- Admin may save partially completed fields.
- Validate data types, valid foreign keys, unique code/slug when entered.
- No public listing until explicitly published.

### Publish validation

1. Active category and valid unique code/name/slug.
2. Cover photo and short description.
3. At least one valid rental rate, currency and duration policy.
4. At least one registered rentable unit or positive stock pool quantity.
5. At least one pickup location or delivery option.
6. Clear terms/deposit/late-return policies and applicable fees.
7. No invalid intervals, duplicate unit identifiers or negative fees.
8. Authorized publisher and required audit event.

### Critical server-side business rules

- Changing listing price **must not retroactively update** quoted/confirmed rental orders.
- Unpublishing prevents **new** rental requests, not existing bookings.
- Archiving does not physically delete active or historical asset records.
- Cannot mark a unit retired, move it or block it against a committed rental without a conflict-resolution workflow.
- A listing may remain published while temporarily unavailable, showing "Currently unavailable" rather than disappearing.
- Customer browsing must never display private serial numbers, purchase costs, or staff-only notes.
- Validate uploads and rich text against hostile content; avoid public direct access to private attachments.
- Preserve every inventory/status change in the audit history.

---

## 9. Acceptance Tests / UAT Checklist

| ID | Test case | Expected outcome |
|---|---|---|
| A01 | Create category, brand and location | Saved and selectable |
| A02 | Create a minimal asset Draft | Saves without publication |
| A03 | Create duplicate asset code | Clear uniqueness validation |
| A04 | Add gallery and select cover | Images ordered; cover visible |
| A05 | Upload invalid/oversized file | Blocked with message |
| A06 | Add serialized unit | Unique unit stored on listing |
| A07 | Add duplicate tag/serial | Rejected appropriately |
| A08 | Add rate/deposit/minimum duration | Values persist accurately |
| A09 | Submit negative price, deposit, stock | Validation error |
| A10 | Configure blocked maintenance interval | Unit excluded during blocked dates |
| A11 | Publish incomplete Draft | Fails and shows missing fields |
| A12 | Publish complete Draft | Appears on public catalog |
| A13 | Open listing as renter | Only public fields displayed |
| A14 | Unpublish listing | Hidden from new browsing/requests |
| A15 | Edit name, pricing and description | Public listing updates safely |
| A16 | Two admins edit same record | Conflict detection; no silent overwrite |
| A17 | Attempt non-admin publish via API | Access denied |
| A18 | Archive item with booking history | Historic references retained |
| A19 | Search/filter/paginate many listings | Correct stable results |
| A20 | Verify audit log after publish/change | Correct actor/time/before-after event |
| A21 | Check availability at adjacent time intervals | Boundary handling correct (`[start,end)`) |
| A22 | Change an asset price after an order exists | Historical order pricing unchanged |
| A23 | Try blocking a unit in existing confirmed rental | Conflict handled; no silent disruption |
| A24 | Load listing on mobile | Responsive, usable and no clipped controls |

---

## 10. Development Sequence

### MVP — required for Step 01

- [ ] Company profile and basic settings.
- [ ] Categories and pickup locations.
- [ ] Asset listing CRUD with Draft / Published / Archived lifecycle.
- [ ] Individual asset unit registration and base operational status.
- [ ] Basic per-day rate, currency, deposit and terms.
- [ ] Images and gallery.
- [ ] Blocked intervals and preparation/return buffers.
- [ ] Validation and publish readiness checklist.
- [ ] Public read-only catalog/listing preview.
- [ ] Permissions, audit, input validation and tests.

### Phase 2 — add when business requires it

- [ ] Quantity-pooled stock (chairs/cups/etc.).
- [ ] Flexible multi-tier hourly/weekly/monthly pricing and promotions.
- [ ] Multi-warehouse stock transfer and delivery charges.
- [ ] Advanced condition reports, GPS/IoT integration, QR/barcode scanning.
- [ ] Bulk import/export and bulk inventory operations.
- [ ] Regional tax and accounting integrations.
- [ ] Automated recurring inspections and preventive maintenance.

### Handoff to Step 02: Rental Requests

Step 01 should provide these reliable inputs:

1. Public, published listing ID and description.
2. Rentable inventory units or quantity pools.
3. Rate rules, deposit and other charge configuration.
4. Business calendar, availability restrictions and buffers.
5. Pickup/delivery choices and rental terms.
6. API functions to check availability and preview a rental quote.

Step 02 then handles date selection, temporary holds, renter identity, approvals, final booking and payment; none of those processes should be pretended complete by merely publishing an asset.

---

## 11. Recommended First Decisions

If the product owner has not decided yet, the simplest safe starting point is:

| Decision | Suggested MVP default |
|---|---|
| Rental business model | One company only |
| Asset type | Physical equipment / devices |
| Tracking | Unique physical units with asset tags |
| Catalog structure | One listing for many same-model units |
| Billing | Daily rental; one active base rate |
| Currency | USD by default, configurable |
| Security deposit | Configurable per listing; may be zero |
| Approval | Manual admin approval (Step 04 of overall flow) |
| Pickup | One company pickup location initially |
| Publish | Authorized admin only |
| Maintenance | Explicit blocked intervals and unit status |

## Reference Benchmarks

- [Odoo 19 — Physical Rental Products](https://www.odoo.com/documentation/19.0/applications/sales/rental/products.html) — rates, scheduling, location, serial tracking, padding and late fees.
- [Odoo 19 — Rental Product Types](https://www.odoo.com/documentation/19.0/applications/sales/rental/configure_products/product_type.html) — physical goods versus rental services, minimal duration and reservations.
- [Odoo 19 — Serial Number Tracking](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/serial_numbers.html) — unit identity and traceability.
- [ERPNext — Asset](https://docs.frappe.io/erpnext/asset) — organizational asset identity, location, condition and maintenance.

This document is a **recommended implementation specification**, not a description of a system that has already been implemented.
