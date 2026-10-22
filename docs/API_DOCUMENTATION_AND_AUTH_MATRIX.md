# RentHub Enterprise Asset Rental — Complete API Reference & Authentication Matrix

## 1. Authentication Architecture & Security Model

RentHub implements a **role-segregated, stateless JWT authentication architecture** using HTTP-only signed cookies. Clients (renters) and Administrators (staff/managers) are maintained in separate security boundaries.

### Session Cookies & Expiration Policy

| Identity Context | Cookie Name | Lifespan | Token Payload Claims | Strict Role Check |
|---|---|---|---|---|
| **Client Portal** | `renthub_client_session` | **24 hours** | `sub`, `email`, `role: "client"`, `sessionType: "client"` | Must be `client` / non-admin. Admins are rejected with `403 FORBIDDEN`. |
| **Admin Portal** | `renthub_admin_session` | **8 hours** | `sub`, `email`, `role: "admin"`, `sessionType: "admin"` | Must have `role === "admin"`. Clients are rejected with `401/403`. |
| *Legacy Fallback* | `customer_token` / `admin_token` | Grace period | User ID or secret string | Automatically mapped during migration. |

### Global Middleware Enforcement (`src/middleware.ts`)

- **`/admin/*` and `/api/admin/*`:** Automatically intercepted. Verifies `renthub_admin_session`. If expired, returns `401 { ok: false, error: "SESSION_EXPIRED" }` for APIs or redirects to `/admin/login?expired=1` for pages.
- **`/rentals/request/*`, `/rentals/my-requests/*`, `/rentals/active/*`:** Automatically intercepted. Verifies `renthub_client_session`. If expired, redirects to `/login?expired=1`.
- **API Guard Helpers (`src/lib/auth.ts`):** `requireAuth()` and `requireAdmin()` throw typed errors (`SESSION_EXPIRED`, `UNAUTHORIZED`, `FORBIDDEN`) that route handlers map to appropriate HTTP status codes.

---

## 2. Master Authentication Matrix

### Legend
- 🟢 **PUBLIC**: No authentication required. Open to unauthenticated visitors and search engine crawlers.
- 🔵 **CLIENT**: Requires active client session (`renthub_client_session` cookie). Role must be `client`.
- 🔴 **ADMIN**: Requires active administrator session (`renthub_admin_session` cookie). Role must be `admin`.
- 🟡 **WEBHOOK / INTERNAL**: Verified via HMAC signature or internal server call.

| # | HTTP Method | Endpoint URL | Auth Level | Required Role / Token | Description |
|---|---|---|---|---|---|
| **Authentication & Profile** | | | | | |
| 1 | `POST` | `/api/auth/login` | 🟢 PUBLIC | None | Client portal login (issues `renthub_client_session`) |
| 2 | `POST` | `/api/auth/register` | 🟢 PUBLIC | None | Create new client account |
| 3 | `POST` | `/api/auth/logout` | 🟢 PUBLIC | Any | Clears all client and admin cookies |
| 4 | `POST` | `/api/admin/login` | 🟢 PUBLIC | None | Admin portal login (issues `renthub_admin_session`) |
| 5 | `GET` | `/api/me` | 🔵 CLIENT | `role: client` | Fetch authenticated client profile |
| 6 | `PUT` | `/api/me` | 🔵 CLIENT | `role: client` | Update client profile details |
| 7 | `GET` | `/api/admin/me` | 🔴 ADMIN | `role: admin` | Fetch authenticated admin profile |
| **Public Asset Catalog & Discovery** | | | | | |
| 8 | `GET` | `/api/assets` | 🟢 PUBLIC | None | Search and filter asset listings |
| 9 | `GET` | `/api/assets/[id]` | 🟢 PUBLIC | None | Get asset listing details |
| 10 | `GET` | `/api/categories` | 🟢 PUBLIC | None | Hierarchical categories tree |
| 11 | `GET` | `/api/public/assets` | 🟢 PUBLIC | None | Canonical public asset catalog |
| 12 | `GET` | `/api/public/assets/[slug]` | 🟢 PUBLIC | None | Asset detail by slug |
| 13 | `GET` | `/api/public/assets/[slug]/availability` | 🟢 PUBLIC | None | Real-time calendar availability for slug |
| 14 | `GET` | `/api/rental-assets` | 🟢 PUBLIC | None | Commercial rental assets list |
| 15 | `GET` | `/api/rental-assets/[id]` | 🟢 PUBLIC | None | Commercial rental asset detail |
| 16 | `GET` | `/api/rental-assets/[id]/availability-check` | 🟢 PUBLIC | None | Query unit availability for date window |
| 17 | `GET` | `/api/rental-assets/[id]/alternative-slots` | 🟢 PUBLIC | None | Suggest available date slots when booked |
| 18 | `POST` | `/api/rental-assets/[id]/quote-preview` | 🟢 PUBLIC | None | Compute commercial quote snapshot |
| 19 | `GET` | `/api/reviews` | 🟢 PUBLIC | None | List customer reviews for an asset |
| 20 | `POST` | `/api/reviews` | 🔵 CLIENT | `role: client` | Post a customer review |
| 21 | `GET` | `/api/stats` | 🟢 PUBLIC | None | Public platform stats (counts) |
| **Customer Rental Lifecycle (Step 03 — Step 11)** | | | | | |
| 22 | `GET` | `/api/me/rental-requests` | 🔵 CLIENT | `role: client` | List client's submitted rental requests |
| 23 | `POST` | `/api/me/rental-requests` | 🔵 CLIENT | `role: client` | Submit new commercial rental request |
| 24 | `GET` | `/api/me/rental-requests/[id]` | 🔵 CLIENT | `role: client` | Get rental request details & quote snapshot |
| 25 | `POST` | `/api/me/rental-requests/[id]/cancel` | 🔵 CLIENT | `role: client` | Cancel pending rental request |
| 26 | `POST` | `/api/me/rental-requests/[id]/accept-proposal` | 🔵 CLIENT | `role: client` | Accept admin counter-proposal |
| 27 | `POST` | `/api/me/rental-requests/[id]/decline-proposal`| 🔵 CLIENT | `role: client` | Decline admin counter-proposal |
| 28 | `GET` | `/api/me/rental-requests/[id]/payment-summary` | 🔵 CLIENT | `role: client` | Fetch breakdown & balance due |
| 29 | `POST` | `/api/me/rental-requests/[id]/payment-attempts`| 🔵 CLIENT | `role: client` | Submit payment (Cash, KHQR, Card, Bank) |
| 30 | `GET` | `/api/me/rental-requests/[id]/payment-status` | 🔵 CLIENT | `role: client` | Check real-time payment status |
| 31 | `GET` | `/api/me/rental-requests/[id]/payment-receipt` | 🔵 CLIENT | `role: client` | Download formal payment receipt (`REC-*`) |
| 32 | `GET` | `/api/me/rentals` | 🔵 CLIENT | `role: client` | List client's active & upcoming rentals |
| 33 | `GET` | `/api/me/rentals/history` | 🔵 CLIENT | `role: client` | Historical closed rentals |
| 34 | `GET` | `/api/me/rentals/[id]/extensions` | 🔵 CLIENT | `role: client` | List extension requests for rental |
| 35 | `POST` | `/api/me/rentals/[id]/extensions` | 🔵 CLIENT | `role: client` | Submit extension request |
| 36 | `POST` | `/api/me/rentals/[id]/extensions/quote` | 🔵 CLIENT | `role: client` | Calculate pricing quote for extension |
| 37 | `GET` | `/api/me/rentals/[id]/incidents` | 🔵 CLIENT | `role: client` | List reported incidents |
| 38 | `POST` | `/api/me/rentals/[id]/incidents` | 🔵 CLIENT | `role: client` | Report malfunction or accidental damage |
| 39 | `GET` | `/api/me/rentals/[id]/returns` | 🔵 CLIENT | `role: client` | Return status & scheduled drop-off |
| 40 | `POST` | `/api/me/rentals/[id]/returns` | 🔵 CLIENT | `role: client` | Initiate return / schedule drop-off |
| 41 | `GET` | `/api/me/rentals/[id]/return-receipt` | 🔵 CLIENT | `role: client` | Download intake return receipt (`RET-*`)|
| 42 | `GET` | `/api/me/rentals/[id]/settlement` | 🔵 CLIENT | `role: client` | View deposit refund / deductions statement |
| 43 | `GET` | `/api/me/reservations/[id]` | 🔵 CLIENT | `role: client` | View confirmed booking reservation |
| 44 | `GET` | `/api/me/reservations/[id]/handover-receipt` | 🔵 CLIENT | `role: client` | View signed handover dispatch receipt |
| **Admin Fleet & Catalog Management** | | | | | |
| 45 | `GET` | `/api/admin/assets` | 🔴 ADMIN | `role: admin` | List all listings (including drafts/archived)|
| 46 | `POST` | `/api/admin/assets` | 🔴 ADMIN | `role: admin` | Create new asset listing |
| 47 | `GET` | `/api/admin/assets/[id]` | 🔴 ADMIN | `role: admin` | Get listing with units, rates, policies |
| 48 | `PUT` | `/api/admin/assets/[id]` | 🔴 ADMIN | `role: admin` | Update asset listing |
| 49 | `DELETE`| `/api/admin/assets/[id]` | 🔴 ADMIN | `role: admin` | Delete asset listing |
| 50 | `POST` | `/api/admin/assets/[id]/publish` | 🔴 ADMIN | `role: admin` | Publish asset to public catalog |
| 51 | `POST` | `/api/admin/assets/[id]/unpublish` | 🔴 ADMIN | `role: admin` | Unpublish asset to draft |
| 52 | `POST` | `/api/admin/assets/[id]/archive` | 🔴 ADMIN | `role: admin` | Archive asset listing |
| 53 | `POST` | `/api/admin/assets/[id]/duplicate` | 🔴 ADMIN | `role: admin` | Clone listing into new draft |
| 54 | `POST` | `/api/admin/assets/[id]/blocks` | 🔴 ADMIN | `role: admin` | Add blackout / maintenance block |
| 55 | `DELETE`| `/api/admin/assets/[id]/blocks` | 🔴 ADMIN | `role: admin` | Remove blackout block |
| 56 | `GET` | `/api/admin/assets/[id]/units` | 🔴 ADMIN | `role: admin` | List serialized units of asset |
| 57 | `POST` | `/api/admin/assets/[id]/units` | 🔴 ADMIN | `role: admin` | Create serialized unit with barcode tag |
| 58 | `GET` | `/api/admin/assets/[id]/units/[unitId]` | 🔴 ADMIN | `role: admin` | Get unit details & condition logs |
| 59 | `PUT` | `/api/admin/assets/[id]/units/[unitId]` | 🔴 ADMIN | `role: admin` | Update physical unit condition/status |
| 60 | `DELETE`| `/api/admin/assets/[id]/units/[unitId]` | 🔴 ADMIN | `role: admin` | Delete physical unit |
| 61 | `GET` | `/api/admin/categories` | 🔴 ADMIN | `role: admin` | Admin categories list |
| 62 | `POST` | `/api/admin/categories` | 🔴 ADMIN | `role: admin` | Create catalog category |
| 63 | `PUT` | `/api/admin/categories/[id]` | 🔴 ADMIN | `role: admin` | Update category |
| 64 | `DELETE`| `/api/admin/categories/[id]` | 🔴 ADMIN | `role: admin` | Delete category |
| 65 | `POST` | `/api/admin/categories/reorder` | 🔴 ADMIN | `role: admin` | Reorder category display hierarchy |
| 66 | `GET` | `/api/admin/brands` | 🔴 ADMIN | `role: admin` | List brands |
| 67 | `POST` | `/api/admin/brands` | 🔴 ADMIN | `role: admin` | Create brand |
| 68 | `GET` | `/api/admin/locations` | 🔴 ADMIN | `role: admin` | List warehouse locations |
| 69 | `POST` | `/api/admin/locations` | 🔴 ADMIN | `role: admin` | Create warehouse location |
| 70 | `POST` | `/api/admin/upload` | 🔴 ADMIN | `role: admin` | Upload images and condition photos |
| **Admin Operations & Workflow Management** | | | | | |
| 71 | `GET` | `/api/admin/rental-requests` | 🔴 ADMIN | `role: admin` | Filter & review incoming rental requests |
| 72 | `GET` | `/api/admin/rental-requests/[id]` | 🔴 ADMIN | `role: admin` | View request review dossier |
| 73 | `POST` | `/api/admin/rental-requests/[id]/approve` | 🔴 ADMIN | `role: admin` | Approve request & create inventory hold |
| 74 | `POST` | `/api/admin/rental-requests/[id]/reject` | 🔴 ADMIN | `role: admin` | Reject request with reason code |
| 75 | `POST` | `/api/admin/rental-requests/[id]/propose-changes`| 🔴 ADMIN | `role: admin`| Propose modified dates/rates |
| 76 | `POST` | `/api/admin/rental-requests/[id]/availability-refresh`| 🔴 ADMIN| `role: admin`| Refresh availability checks |
| 77 | `GET` | `/api/admin/reservations` | 🔴 ADMIN | `role: admin` | Confirmed bookings queue |
| 78 | `GET` | `/api/admin/reservations/[id]` | 🔴 ADMIN | `role: admin` | Reservation dispatch dossier |
| 79 | `POST` | `/api/admin/reservations/[id]/mark-ready` | 🔴 ADMIN | `role: admin` | Warehouse staging complete |
| 80 | `POST` | `/api/admin/reservations/[id]/propose-reallocation`| 🔴 ADMIN | `role: admin`| Swap allocated physical unit |
| 81 | `GET` | `/api/admin/handovers` | 🔴 ADMIN | `role: admin` | Dispatch calendar & custody queue |
| 82 | `POST` | `/api/admin/handovers/[reservationId]/finalize`| 🔴 ADMIN | `role: admin`| Scan units, sign, transfer custody |
| 83 | `GET` | `/api/admin/active-rentals` | 🔴 ADMIN | `role: admin` | Active fleet on rent & overdue monitor |
| 84 | `POST` | `/api/admin/extensions/[id]/approve` | 🔴 ADMIN | `role: admin` | Approve extension & bill additional charge|
| 85 | `POST` | `/api/admin/extensions/[id]/reject` | 🔴 ADMIN | `role: admin` | Reject extension due to schedule clash |
| 86 | `GET` | `/api/admin/returns` | 🔴 ADMIN | `role: admin` | Incoming returns schedule |
| 87 | `POST` | `/api/admin/returns/[returnId]/confirm-receipt`| 🔴 ADMIN| `role: admin`| Confirm physical receipt of equipment |
| 88 | `GET` | `/api/admin/inspections` | 🔴 ADMIN | `role: admin` | Quality inspection queue |
| 89 | `POST` | `/api/admin/inspections/[id]/complete` | 🔴 ADMIN | `role: admin` | Submit QA verdict, damages & repair fees|
| 90 | `POST` | `/api/admin/settlements/[id]/approve` | 🔴 ADMIN | `role: admin` | Approve deposit refund & deductions |
| 91 | `GET` | `/api/admin/rentals/ready-to-close` | 🔴 ADMIN | `role: admin` | Settled rentals ready for contract closure|
| 92 | `POST` | `/api/admin/rentals/[id]/close` | 🔴 ADMIN | `role: admin` | Final contract closure & fleet release |
| 93 | `GET` | `/api/admin/payments` | 🔴 ADMIN | `role: admin` | Payment orders & manual proof queue |
| 94 | `POST` | `/api/admin/payments/[id]/verify-manual` | 🔴 ADMIN | `role: admin` | Verify cash / bank transfer receipt |
| 95 | `POST` | `/api/admin/payments/[id]/reject-manual-proof`| 🔴 ADMIN| `role: admin`| Reject invalid transfer proof |
| 96 | `GET` | `/api/admin/maintenance` | 🔴 ADMIN | `role: admin` | Maintenance & repair work orders |
| 97 | `POST` | `/api/admin/maintenance` | 🔴 ADMIN | `role: admin` | Create maintenance ticket |
| 98 | `POST` | `/api/admin/maintenance/archive` | 🔴 ADMIN | `role: admin` | Archive completed maintenance |
| 99 | `POST` | `/api/admin/maintenance/restore` | 🔴 ADMIN | `role: admin` | Restore maintenance ticket |
| 100| `GET` | `/api/admin/audit` | 🔴 ADMIN | `role: admin` | Comprehensive audit trail logs |
| 101| `GET` | `/api/admin/stats` | 🔴 ADMIN | `role: admin` | Executive KPI dashboard metrics |
| **System Integrations & Legacy** | | | | | |
| 102| `POST` | `/api/payment-providers/[provider]/webhook` | 🟡 WEBHOOK | Provider Secret / Sig | Payment gateway webhook listener |
| 103| `POST` | `/api/internal/rental-reservations/finalize/[id]`| 🟡 INTERNAL| Internal Token | Automated reservation finalization |
| 104| `GET` | `/api/bookings` | 🔵 CLIENT | `role: client` | Legacy bookings list |
| 105| `POST` | `/api/bookings` | 🔵 CLIENT | `role: client` | Legacy booking create |
| 106| `GET` | `/api/bookings/[id]` | 🔵 CLIENT | `role: client` | Legacy booking get |

---

## 3. Detailed Endpoint Specifications

### 3.1 Authentication & Session Management

#### `POST /api/auth/login`
- **Auth Level:** 🟢 Public
- **Description:** Authenticates a client renter using email/username and password. Upon success, sets an HTTP-only `renthub_client_session` JWT cookie valid for 24 hours.
- **Request Body:**
  ```json
  {
    "email": "you@renthub.app",
    "password": "RenterPassword123!"
  }
  ```
- **Responses:**
  - `200 OK`: Sets cookie. Returns `{ "ok": true, "user": { "id": "...", "email": "...", "name": "...", "role": "client" } }`
  - `401 Unauthorized`: `{ "error": "Invalid password or email." }`
  - `403 Forbidden`: If user role is `admin`: `{ "error": "Administrator accounts cannot log in to the Client Portal. Please use the Admin Portal at /admin/login." }`

#### `POST /api/admin/login`
- **Auth Level:** 🟢 Public
- **Description:** Authenticates an enterprise administrator. Sets an HTTP-only `renthub_admin_session` JWT cookie valid for 8 hours.
- **Request Body:**
  ```json
  {
    "username": "admin@renthub.app",
    "password": "AdminSecurePassword123!"
  }
  ```
- **Responses:**
  - `200 OK`: Sets cookie. Returns `{ "ok": true, "user": { "id": "...", "email": "...", "role": "admin" } }`
  - `403 Forbidden`: If user role is not `admin`: `{ "error": "Access denied. Administrator privileges required." }`

#### `POST /api/auth/logout`
- **Auth Level:** 🟢 Public
- **Description:** Clears all session cookies (`renthub_client_session`, `renthub_admin_session`, `customer_token`, `admin_token`).
- **Response:** `200 OK` `{ "ok": true, "message": "Logged out successfully" }`

#### `GET /api/me`
- **Auth Level:** 🔵 Client Auth
- **Description:** Returns the current logged-in client user.
- **Headers:** `Cookie: renthub_client_session=<jwt>`
- **Responses:**
  - `200 OK`: `{ "user": { "id": "...", "email": "...", "name": "...", "role": "client" } }`
  - `401 Unauthorized`: `{ "error": "Unauthorized" }` or `{ "error": "SESSION_EXPIRED" }`

---

### 3.2 Public Asset Discovery & Commercial Quoting

#### `GET /api/rental-assets`
- **Auth Level:** 🟢 Public
- **Query Parameters:**
  - `category` (string, optional): Category slug or ID
  - `search` (string, optional): Text search query
  - `minPrice` / `maxPrice` (number, optional): Price range
  - `pickupLocation` (string, optional): Warehouse location ID
- **Response:**
  ```json
  {
    "assets": [
      {
        "id": "cuid-123",
        "code": "TO-MAC-01",
        "name": "Apple MacBook Pro 16\" M3 Max",
        "slug": "apple-macbook-pro-16-m3-max",
        "coverImage": "https://...",
        "rates": [{ "billingUnit": "DAY", "rateAmount": 45.0, "currency": "USD" }],
        "rentalPolicy": { "securityDeposit": 500.0, "minimumDuration": 1 },
        "availableUnitsCount": 4
      }
    ]
  }
  ```

#### `POST /api/rental-assets/[id]/quote-preview`
- **Auth Level:** 🟢 Public
- **Description:** Computes pricing breakdown including rental charge, deposit, delivery fee, and tax without committing a database record.
- **Request Body:**
  ```json
  {
    "startAt": "2026-11-01T09:00:00Z",
    "endAt": "2026-11-05T18:00:00Z",
    "quantity": 2,
    "fulfillment": "DELIVERY",
    "deliveryAddress": { "city": "Phnom Penh" }
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "currency": "USD",
    "rentalDays": 5,
    "quantity": 2,
    "unitRate": 45.0,
    "rentalSubtotal": 450.0,
    "securityDeposit": 1000.0,
    "deliveryFee": 15.0,
    "estimatedTax": 0.0,
    "totalPayable": 1465.0,
    "contingentLateFee": 60.0
  }
  ```

---

### 3.3 Customer Rental Lifecycle (`/api/me/*`)

#### `POST /api/me/rental-requests`
- **Auth Level:** 🔵 Client Auth (`renthub_client_session`)
- **Description:** Submits a formal commercial rental request. Automatically takes a quote snapshot and records acceptance of terms.
- **Request Body:**
  ```json
  {
    "listingId": "cuid-listing-1",
    "startAt": "2026-11-01T09:00:00.000Z",
    "endAt": "2026-11-05T18:00:00.000Z",
    "quantity": 1,
    "fulfillment": "PICKUP",
    "pickupLocationId": "cuid-loc-1",
    "contactName": "John Doe",
    "contactPhone": "+855 12 345 678",
    "contactEmail": "john@example.com",
    "customerNotes": "Please ensure latest macOS installed",
    "termsAccepted": true
  }
  ```
- **Responses:**
  - `201 Created`: `{ "ok": true, "requestId": "cuid-req-1", "requestNo": "REQ-2026-000001", "status": "PENDING_APPROVAL" }`
  - `400 Bad Request`: `{ "error": "Inventory unavailable for selected dates or terms not accepted" }`
  - `401 Unauthorized`: `{ "error": "SESSION_EXPIRED" }`

#### `GET /api/me/rental-requests/[id]/payment-summary`
- **Auth Level:** 🔵 Client Auth (`renthub_client_session`)
- **Description:** Fetches payment order details, amounts due, deposit ledger balance, and accepted payment methods.
- **Response:** `200 OK`
  ```json
  {
    "order": {
      "id": "cuid-pay-order-1",
      "status": "UNPAID",
      "currency": "USD",
      "rental_charges": { "subtotal_due": 225.0 },
      "refundable_deposit": { "amount": 500.0 },
      "delivery_fee": 0.0,
      "tax": 0.0,
      "total_due": 725.0,
      "due_at": "2026-10-23T12:00:00.000Z"
    },
    "supported_methods": ["KHQR", "CARD", "CASH", "BANK_TRANSFER"]
  }
  ```

#### `POST /api/me/rental-requests/[id]/payment-attempts`
- **Auth Level:** 🔵 Client Auth (`renthub_client_session`)
- **Description:** Submits payment attempt. For `CASH` or `BANK_TRANSFER`, transitions order to `PROCESSING` awaiting admin verification. For immediate gateway simulation (`KHQR`/`CARD`), transitions order to `PAID` and triggers reservation confirmation.
- **Request Body:**
  ```json
  {
    "method": "CASH",
    "amount": 725.0,
    "providerReference": "Cash payable at counter"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "ok": true,
    "attemptId": "cuid-attempt-1",
    "status": "PROCESSING",
    "orderStatus": "PROCESSING",
    "message": "Payment recorded. Awaiting warehouse cashier counter verification."
  }
  ```

---

### 3.4 Admin Review, Operations & Approvals (`/api/admin/*`)

#### `POST /api/admin/rental-requests/[id]/approve`
- **Auth Level:** 🔴 Admin Auth (`renthub_admin_session`)
- **Description:** Approves customer rental request. Automatically creates a `RentalInventoryHold` locking serialized units until payment deadline.
- **Request Body:**
  ```json
  {
    "allocatedUnitIds": ["cuid-unit-01"],
    "holdDurationHours": 24,
    "internalNotes": "VIP customer approved with standard terms"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "ok": true,
    "status": "APPROVED_AWAITING_PAYMENT",
    "paymentDueAt": "2026-10-23T15:00:00.000Z",
    "holdId": "cuid-hold-1"
  }
  ```

#### `POST /api/admin/handovers/[reservationId]/finalize`
- **Auth Level:** 🔴 Admin Auth (`renthub_admin_session`)
- **Description:** Records physical handover of equipment to the renter. Validates barcoded tags, condition grades, records digital receiver signature, and activates reservation status to `ACTIVE`.
- **Request Body:**
  ```json
  {
    "receiverName": "John Doe",
    "signature": "data:image/svg+xml;base64,...",
    "scannedUnits": [
      {
        "unitId": "cuid-unit-01",
        "scannedTag": "TO-LAP-0001",
        "conditionGrade": "EXCELLENT",
        "functionalCheck": "PASS"
      }
    ],
    "notes": "Delivered with power supply and protective sleeve."
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "ok": true,
    "handoverId": "cuid-handover-1",
    "reservationStatus": "ACTIVE"
  }
  ```

#### `POST /api/admin/inspections/[id]/complete`
- **Auth Level:** 🔴 Admin Auth (`renthub_admin_session`)
- **Description:** Finalizes technical post-return check. Evaluates condition of each unit, records repair costs, and generates `RentalSettlement` statement.
- **Request Body:**
  ```json
  {
    "verdict": "PASS",
    "items": [
      {
        "unitId": "cuid-unit-01",
        "conditionGrade": "GOOD",
        "functionalResult": "PASS",
        "damageNotes": null,
        "estimatedRepairCost": 0.0,
        "disposition": "AVAILABLE"
      }
    ],
    "notes": "Hardware returned in good condition. All accessories accounted for."
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "ok": true,
    "verdict": "PASS",
    "netRefundDue": 500.0,
    "settlementId": "cuid-settlement-1"
  }
  ```

---

## 4. Error Codes & Standards

All RentHub APIs adhere to standard RFC-7807 error patterns.

| Status Code | Error Key | Scenario | Resolution |
|---|---|---|---|
| **400** | `INVALID_INPUT` | Missing required fields, date start >= end | Check request payload against schema |
| **401** | `UNAUTHORIZED` | No session cookie provided | Redirect to login |
| **401** | `SESSION_EXPIRED` | JWT lifetime expired (24h client / 8h admin) | Re-authenticate; cookies automatically cleared |
| **403** | `FORBIDDEN` | Admin attempting client route, or client attempting admin route | Use appropriate account credentials |
| **404** | `NOT_FOUND` | Listing, request, or unit does not exist | Verify ID parameter |
| **409** | `CONFLICT` | Concurrent booking collision or unit already allocated | Re-run availability check |
| **500** | `INTERNAL_ERROR` | Database connection error or unhandled exception | Check server application logs |
