export interface RentalCompany {
  id: string
  name: string
  legalName?: string | null
  currency: string
  timezone: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export interface CategoryItem {
  id: string
  name: string
  slug: string
  shortDescription?: string | null
  description?: string | null
  imageUrl?: string | null
  iconName?: string | null
  color?: string | null
  parentId?: string | null
  displayOrder: number
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string
  metaTitle?: string | null
  metaDescription?: string | null
  parent?: CategoryItem | null
  children?: CategoryItem[]
  _count?: {
    listings: number
    children?: number
  }
}

export interface BrandItem {
  id: string
  name: string
  slug: string
  isActive: boolean
  _count?: {
    listings: number
  }
}

export interface LocationItem {
  id: string
  companyId: string
  name: string
  code: string
  address: string
  city: string
  timezone: string
  isPickupDefault: boolean
  isActive: boolean
  _count?: {
    units: number
  }
}

export interface PhysicalUnit {
  id: string
  listingId: string
  assetTag: string
  serialNumber?: string | null
  locationId: string
  baseStatus: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' | 'LOST' | string
  conditionGrade: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | string
  accessories?: string | null
  conditionPhotos?: string[]
  purchaseDate?: string | null
  purchaseCost?: number | null // Internal only
  notes?: string | null
  createdAt: string
  location?: LocationItem
  blockedIntervals?: BlockedInterval[]
}

export interface RentalRate {
  id: string
  listingId: string
  currency: 'USD' | 'KHR' | string
  billingUnit: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | string
  rateAmount: number
  effectiveFrom?: string | null
  effectiveTo?: string | null
  isPrimary: boolean
}

export interface RentalPolicy {
  id: string
  listingId: string
  securityDeposit: number
  minimumDuration: number
  minimumDurationUnit: string
  maximumDuration?: number | null
  lateFeeAmount: number
  lateFeeUnit: string
  lateGraceMinutes: number
  minAdvanceNoticeMinutes: number
  preparationBufferMinutes: number
  returnBufferMinutes: number
  allowedPickupWeekdays?: string[]
  termsTemplate?: string | null
}

export interface BlockedInterval {
  id: string
  listingId: string
  unitId?: string | null
  startAt: string
  endAt: string
  reason: string
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  unit?: PhysicalUnit | null
}

export interface AuditEvent {
  id: string
  companyId?: string | null
  listingId?: string | null
  entityType: string
  entityId: string
  actorName: string
  action: string
  beforeJson?: string | null
  afterJson?: string | null
  createdAt: string
}

export interface AssetListingDetail {
  id: string
  companyId: string
  code: string
  name: string
  slug: string
  categoryId: string
  brandId?: string | null
  model?: string | null
  shortDescription: string
  description?: string | null
  specifications: Record<string, string>
  trackingMode: 'SERIALIZED' | 'QUANTITY' | string
  conditionNote?: string | null
  coverImage: string
  images: string[]
  allowDelivery: boolean
  deliveryFee: number
  visibility: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED' | string
  publishedAt?: string | null
  version: number
  rating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
  category: CategoryItem
  brand?: BrandItem | null
  units: PhysicalUnit[]
  rates: RentalRate[]
  rentalPolicy?: RentalPolicy | null
  locationOptions: {
    id: string
    locationId: string
    pickupEnabled: boolean
    returnEnabled: boolean
    location: LocationItem
  }[]
  blockedIntervals: BlockedInterval[]
  auditEvents: AuditEvent[]
}

export interface PublicAssetListing {
  id: string
  code: string
  name: string
  slug: string
  shortDescription: string
  description?: string | null
  specifications: Record<string, string>
  coverImage: string
  images: string[]
  rating: number
  reviewCount: number
  category: {
    id: string
    name: string
    slug: string
    iconName?: string | null
    color?: string | null
  }
  brand?: {
    id: string
    name: string
  } | null
  model?: string | null
  primaryRate: {
    amount: number
    currency: string
    billingUnit: string
  }
  securityDeposit: number
  minimumDuration: number
  minimumDurationUnit: string
  preparationBufferMinutes: number
  returnBufferMinutes: number
  allowDelivery: boolean
  deliveryFee: number
  totalUnits: number
  availableUnitsCount: number
  locations: {
    id: string
    name: string
    city: string
  }[]
}

export interface PublishValidationResult {
  canPublish: boolean
  errors: string[]
  warnings: string[]
  checks: {
    title: string
    passed: boolean
    message: string
  }[]
}

export function validateForPublish(listing: AssetListingDetail): PublishValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const checks: { title: string; passed: boolean; message: string }[] = []

  // Check 1: General info
  const hasCode = !!listing.code && listing.code.trim().length >= 3
  const hasName = !!listing.name && listing.name.trim().length >= 3
  const hasSlug = !!listing.slug && listing.slug.trim().length >= 3
  const hasCategory = !!listing.categoryId
  const generalPassed = hasCode && hasName && hasSlug && hasCategory
  if (!generalPassed) {
    errors.push('Listing must have a unique code, descriptive name, slug, and category.')
  }
  checks.push({
    title: 'General Information',
    passed: generalPassed,
    message: generalPassed
      ? 'Valid code, name, slug, and active category assigned'
      : 'Missing required code, name, slug, or category',
  })

  // Check 2: Media & Description
  const hasCover = !!listing.coverImage && listing.coverImage.length > 5
  const hasShortDesc = !!listing.shortDescription && listing.shortDescription.trim().length >= 10
  const mediaPassed = hasCover && hasShortDesc
  if (!mediaPassed) {
    errors.push('Cover photo and short description (at least 10 chars) are required.')
  }
  checks.push({
    title: 'Cover Media & Description',
    passed: mediaPassed,
    message: mediaPassed
      ? 'Cover photo and public summary are ready'
      : 'Cover photo or short description is missing',
  })

  // Check 3: Rental Rate
  const primaryRate = listing.rates?.find((r) => r.isPrimary) || listing.rates?.[0]
  const hasValidRate = !!primaryRate && primaryRate.rateAmount > 0
  if (!hasValidRate) {
    errors.push('At least one positive primary rental rate must be configured.')
  }
  checks.push({
    title: 'Pricing & Billing Unit',
    passed: hasValidRate,
    message: hasValidRate
      ? `Rate set at ${primaryRate?.currency} ${primaryRate?.rateAmount}/${primaryRate?.billingUnit}`
      : 'No active rental rate found',
  })

  // Check 4: Rental Policy
  const policy = listing.rentalPolicy
  const hasPolicy = !!policy && policy.minimumDuration >= 1
  if (!hasPolicy) {
    errors.push('Rental policy with minimum duration of at least 1 unit is required.')
  }
  checks.push({
    title: 'Rental Duration & Buffers',
    passed: hasPolicy,
    message: hasPolicy
      ? `Min duration: ${policy?.minimumDuration} ${policy?.minimumDurationUnit}, Buffers: ${policy?.preparationBufferMinutes}m prep / ${policy?.returnBufferMinutes}m return`
      : 'Rental policy not configured',
  })

  // Check 5: Physical Units
  const activeUnits = listing.units?.filter((u) => u.baseStatus === 'ACTIVE') || []
  const hasActiveUnits = activeUnits.length > 0
  if (!hasActiveUnits) {
    errors.push('At least one physical unit with ACTIVE operational status is required.')
  }
  checks.push({
    title: 'Physical Inventory Units',
    passed: hasActiveUnits,
    message: hasActiveUnits
      ? `${activeUnits.length} active physical unit(s) ready in inventory`
      : 'No active units registered for this listing',
  })

  // Check 6: Fulfillment Locations
  const hasLocations =
    (listing.locationOptions && listing.locationOptions.length > 0) || listing.allowDelivery
  if (!hasLocations) {
    errors.push('At least one pickup location or delivery option must be enabled.')
  }
  checks.push({
    title: 'Fulfillment & Locations',
    passed: hasLocations,
    message: hasLocations
      ? `${listing.locationOptions?.length || 0} pickup location(s) and delivery ${listing.allowDelivery ? 'enabled' : 'disabled'}`
      : 'No pickup locations or delivery enabled',
  })

  if (listing.images.length === 0) {
    warnings.push('Adding multiple gallery images improves renter conversion.')
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
    checks,
  }
}

export interface AssetWithRelations {
  id: string
  title: string
  name: string
  code: string
  slug: string
  description: string
  fullDescription?: string | null
  categoryId: string
  location: string
  city: string
  pricePerDay: number
  deposit: number
  images: string[]
  features: string[]
  status: 'available' | 'unavailable' | string
  rating: number
  reviewCount: number
  createdAt: string
  totalUnits: number
  availableUnitsCount: number
  category: {
    id: string
    name: string
    slug: string
    icon: string
    color: string
    imageUrl?: string | null
  }
  brand?: any
  owner?: any
}

