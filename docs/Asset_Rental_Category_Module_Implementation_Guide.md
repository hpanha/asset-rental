# Asset Rental – Category Module Implementation Guide

## 1. Purpose

The **Category Module** allows the admin to create and manage asset categories used across the Asset Rental website.

Examples:

- Electronics
- Events
- Properties
- Spaces
- Tools
- Vehicles
- Watercraft
- Furniture
- Equipment

The module should support both **top-level categories** and **subcategories**.

Example:

```text
Vehicles
├── Cars
├── Motorcycles
├── Bicycles
└── Trucks

Properties
├── Apartments
├── Villas
├── Offices
└── Warehouses
```

---

## 2. Admin Navigation

Recommended sidebar structure:

```text
Dashboard

MANAGE
├── Bookings
├── Assets
├── Categories
├── Locations
├── Customers
├── Vendors
├── Promotions
└── Reviews

CMS
├── Pages
├── Navigation
└── Media

SETTINGS
├── Users
├── Roles & Permissions
└── System Settings
```

Route recommendation:

```text
/admin/categories
/admin/categories/create
/admin/categories/[id]/edit
```

---

## 3. Category List Page

The category list page should contain:

- Search
- Status filter
- Parent category filter
- Sort by display order
- Create Category button

Recommended columns:

| Column | Description |
|---|---|
| Image / Icon | Category thumbnail or icon |
| Category Name | Main category name |
| Parent Category | Parent category if applicable |
| Asset Count | Number of assets assigned |
| Status | Active / Inactive |
| Display Order | Sorting priority |
| Updated At | Last modification date |
| Actions | Edit, Duplicate, Activate/Deactivate, Delete |

Recommended actions:

- Edit
- Duplicate
- Activate / Deactivate
- Delete

---

# 4. Create Category Form

## 4.1 Basic Information

### Category Name

**Required:** Yes

Example:

```text
Vehicles
```

Rules:

- Minimum 2 characters
- Maximum 100 characters
- Trim spaces before saving
- Category name should not be empty
- Optionally prevent duplicate names under the same parent

---

### Slug

**Required:** Yes

Example:

```text
vehicles
```

The slug can be auto-generated from the category name.

Examples:

```text
Construction Tools
```

becomes:

```text
construction-tools
```

Rules:

- Lowercase only
- Letters, numbers and hyphens
- No spaces
- No special characters
- Must be unique

Suggested pattern:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

---

### Short Description

**Required:** Yes

Example:

```text
Rent cars, motorcycles, bicycles and other vehicles.
```

Recommended limit:

```text
200 characters
```

Used for:

- Category cards
- Category listing
- Search results
- Public category overview

---

### Full Description

**Required:** No

Used for:

- Category detail page
- SEO content
- Additional category information

Recommended maximum:

```text
1000–3000 characters
```

A rich text editor may be used.

---

# 5. Category Image

**Required:** No, but recommended.

Recommended formats:

```text
PNG
JPG
JPEG
WebP
```

Recommended maximum file size:

```text
2 MB
```

Recommended image size:

```text
800 × 600 px
```

Alternative supported ratio:

```text
4:3
```

Store the final image URL instead of binary image data in the category table.

Example:

```text
/uploads/categories/vehicles.webp
```

---

# 6. Display Settings

## Status

**Required:** Yes

Values:

```text
Active
Inactive
```

Recommended default:

```text
Active
```

Behavior:

### Active

Category can appear on the public website.

### Inactive

Category stays in the admin database but should not appear publicly.

---

## Display Order

**Required:** Yes

Example:

```text
1
2
3
4
```

Lower numbers should appear first.

Recommended default:

```text
0
```

Example:

```text
1 Electronics
2 Events
3 Properties
4 Spaces
5 Tools
6 Vehicles
```

---

## Parent Category

**Required:** No

Use this field for subcategories.

Example:

```text
Parent Category: Vehicles
Category: Cars
```

If no parent is selected:

```text
Top Level Category
```

Database value:

```text
NULL
```

---

# 7. Additional Information

## Icon

**Required:** No

Recommended options:

- Lucide icon name
- Custom SVG
- Uploaded SVG
- Internal icon reference

Example:

```text
car
building-2
camera
wrench
ship
bike
```

Recommended implementation:

```text
icon_name = "car"
```

Avoid storing raw icon HTML in the database.

---

## Color

**Required:** No

Used for:

- Category icon background
- Badge
- Public category card
- Filter chips

Example:

```text
#10B981
```

Recommended default:

```text
#10B981
```

Store as HEX.

---

# 8. SEO Information

## Meta Title

**Required:** No

Recommended maximum:

```text
60 characters
```

Example:

```text
Vehicle Rentals | Asset Rental
```

---

## Meta Description

**Required:** No

Recommended maximum:

```text
160 characters
```

Example:

```text
Rent cars, motorcycles, bicycles and other vehicles from trusted local owners.
```

---

# 9. Recommended Required Fields

Only these fields should be mandatory during category creation:

```text
Category Name
Slug
Short Description
Status
Display Order
```

Optional fields:

```text
Full Description
Category Image
Parent Category
Icon
Color
Meta Title
Meta Description
```

This keeps category creation fast for the admin.

---

# 10. Recommended Database Structure

Example PostgreSQL table:

```sql
CREATE TABLE asset_category (
    category_id BIGSERIAL PRIMARY KEY,

    category_name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,

    short_description VARCHAR(200) NOT NULL,
    description TEXT,

    image_url TEXT,

    icon_name VARCHAR(100),
    color VARCHAR(20),

    parent_category_id BIGINT,

    display_order INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    meta_title VARCHAR(60),
    meta_description VARCHAR(160),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,

    updated_at TIMESTAMP,
    updated_by BIGINT,

    CONSTRAINT fk_asset_category_parent
        FOREIGN KEY (parent_category_id)
        REFERENCES asset_category(category_id)
);
```

---

# 11. Recommended Status Design

Instead of deleting categories immediately, consider supporting:

```text
active
inactive
archived
```

Recommended meanings:

| Status | Meaning |
|---|---|
| active | Visible and available |
| inactive | Hidden from public website |
| archived | Retained for historical data |

---

# 12. API Design

## Get Categories

```http
GET /api/admin/categories
```

Optional query parameters:

```text
search
status
parentId
page
pageSize
sort
```

Example:

```http
GET /api/admin/categories?status=active&page=1&pageSize=20
```

---

## Get Category

```http
GET /api/admin/categories/{id}
```

---

## Create Category

```http
POST /api/admin/categories
```

Example payload:

```json
{
  "categoryName": "Vehicles",
  "slug": "vehicles",
  "shortDescription": "Rent cars, motorcycles, bicycles and other vehicles.",
  "description": "Browse vehicles available for daily, weekly and monthly rental.",
  "imageUrl": "/uploads/categories/vehicles.webp",
  "iconName": "car",
  "color": "#10B981",
  "parentCategoryId": null,
  "displayOrder": 6,
  "status": "active",
  "metaTitle": "Vehicle Rentals | Asset Rental",
  "metaDescription": "Rent cars, motorcycles, bicycles and other vehicles from trusted local owners."
}
```

---

## Update Category

```http
PUT /api/admin/categories/{id}
```

---

## Change Status

```http
PATCH /api/admin/categories/{id}/status
```

Example:

```json
{
  "status": "inactive"
}
```

---

## Delete Category

```http
DELETE /api/admin/categories/{id}
```

---

# 13. Delete Protection

A category should **not be deleted** if assets are already assigned to it.

Example:

```text
Vehicles
18 assets
```

When the admin clicks Delete:

```text
This category contains 18 assets.

Move these assets to another category before deleting this category.
```

Recommended options:

```text
Cancel
View Assets
Move Assets
```

The API should also enforce this rule.

Do not rely only on frontend validation.

---

# 14. Subcategory Protection

Prevent these invalid relationships:

```text
Category cannot be its own parent.
```

Example that must be rejected:

```text
Vehicles → Parent Category → Vehicles
```

Also prevent circular relationships.

Example:

```text
Vehicles
└── Cars
    └── Vehicles
```

This must not be allowed.

---

# 15. Slug Generation

Suggested behavior:

When the admin enters:

```text
Construction Equipment
```

Automatically suggest:

```text
construction-equipment
```

The admin may edit the slug manually.

If the slug already exists:

```text
construction-equipment
```

show:

```text
This slug is already in use.
```

---

# 16. Category Image Behavior

Recommended upload flow:

```text
Select Image
      ↓
Validate Format
      ↓
Validate File Size
      ↓
Show Preview
      ↓
Upload
      ↓
Save Image URL
```

The form should support:

```text
Upload
Replace
Remove
Preview
```

---

# 17. Create Form Layout

Recommended desktop layout:

```text
---------------------------------------------------------------
| Create Asset Category                                      |
| Add a new asset category to organize rental assets.        |
---------------------------------------------------------------

| BASIC INFORMATION                   | CATEGORY IMAGE         |
|                                     |                        |
| Category Name     Slug              | Upload Area            |
|                                     |                        |
| Short Description                   | Image Preview          |
|                                     |                        |
| Full Description                    |                        |
---------------------------------------------------------------
| ADDITIONAL INFORMATION              | DISPLAY SETTINGS       |
|                                     |                        |
| Icon              Color             | Status                 |
|                                     | Display Order          |
|                                     | Parent Category        |
---------------------------------------------------------------
| SEO INFORMATION                                             |
|                                                             |
| Meta Title                Meta Description                   |
---------------------------------------------------------------

                     Cancel   Save Draft   Create Category
```

---

# 18. Recommended Button Actions

## Cancel

Return to:

```text
/admin/categories
```

If the form contains unsaved changes, show:

```text
You have unsaved changes.

Leave without saving?
```

---

## Save as Draft

Optional.

If supported, save the category using:

```text
status = draft
```

If your system only uses Active / Inactive, this button can be removed.

---

## Create Category

Validate required fields and create the category.

On success:

```text
Category created successfully.
```

Then either:

```text
Return to category list
```

or:

```text
Open the newly created category
```

---

# 19. Frontend Validation

Recommended validation rules:

```text
Category Name
- Required
- Maximum 100 characters

Slug
- Required
- Maximum 120 characters
- Valid slug format
- Unique

Short Description
- Required
- Maximum 200 characters

Display Order
- Required
- Integer
- Minimum 0

Status
- Required

Color
- Valid HEX if provided

Meta Title
- Maximum 60 characters

Meta Description
- Maximum 160 characters
```

---

# 20. Public Website Integration

Only active categories should be shown on the public website.

Example query:

```sql
SELECT *
FROM asset_category
WHERE status = 'active'
ORDER BY display_order, category_name;
```

The homepage **Browse by category** section should read from this module instead of hardcoded categories.

Example:

```text
Electronics
Events
Properties
Spaces
Tools
Vehicles
Watercraft
```

These should come directly from the category table.

---

# 21. Asset Create/Edit Integration

The asset create form should load active categories:

```http
GET /api/categories?status=active
```

Example dropdown:

```text
Category

Select Category
---------------
Electronics
Events
Properties
Spaces
Tools
Vehicles
Watercraft
```

If subcategories exist:

```text
Vehicles
  Cars
  Motorcycles
  Bicycles

Properties
  Apartments
  Villas
  Offices
```

---

# 22. Recommended Category Architecture

For the first version, use:

```text
Category
    ↓
Subcategory
    ↓
Asset
```

Example:

```text
Electronics
├── Cameras
├── Drones
├── Audio Equipment
└── Computers

Vehicles
├── Cars
├── Motorcycles
├── Bicycles
└── Vans

Tools
├── Power Tools
├── Hand Tools
└── Construction Equipment
```

This architecture is flexible enough for an asset rental marketplace.

---

# 23. Future Enhancement – Category-Specific Asset Fields

Because the website supports many asset types, future versions may allow categories to define their own fields.

Example:

## Vehicle

```text
Brand
Model
Year
Transmission
Seats
Fuel Type
Mileage
```

## Property

```text
Bedrooms
Bathrooms
Guests
Property Type
Floor Area
```

## Camera

```text
Brand
Model
Resolution
Lens Mount
Sensor Type
```

## Tools

```text
Brand
Power Source
Voltage
Weight
```

Recommended future architecture:

```text
Category
    ↓
Category Field Definition
    ↓
Asset Field Value
```

Do not hardcode every asset-specific field into the main category table.

---

# 24. Suggested Permissions

Recommended permissions:

```text
category.view
category.create
category.edit
category.delete
category.change_status
```

Example roles:

```text
Super Admin
- All permissions

Admin
- View
- Create
- Edit
- Change Status

Staff
- View only
```

---

# 25. Audit Information

For administration purposes, keep:

```text
created_at
created_by
updated_at
updated_by
```

Optional advanced audit log:

```text
action
entity_type
entity_id
old_value
new_value
user_id
timestamp
```

Example:

```text
Admin changed Vehicles status from Active to Inactive.
```

---

# 26. Recommended Final Form Fields

## Basic Information

```text
Category Name *
Slug *
Short Description *
Full Description
```

## Media

```text
Category Image
```

## Display Settings

```text
Status *
Display Order *
Parent Category
```

## Appearance

```text
Icon
Color
```

## SEO

```text
Meta Title
Meta Description
```

---

# 27. Recommended MVP Scope

For the first implementation, build:

```text
Category List
Create Category
Edit Category
Active / Inactive
Display Order
Parent / Subcategory
Icon
Color
Category Image
Delete Protection
Asset Count
Public Website Integration
Asset Form Integration
```

SEO and category-specific dynamic fields can be added afterward.

---

## Final Recommendation

The Category Module should become the central source for asset classification.

Avoid hardcoding categories in the frontend.

Recommended data flow:

```text
Admin Category Module
        ↓
Category API
        ↓
Database
        ↓
Public Browse by Category
        ↓
Search / Filters
        ↓
Asset Create & Edit
```

This allows the admin to create a new category once and have it automatically become available across the website.
