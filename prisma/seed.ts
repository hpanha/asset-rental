import { db } from '../src/lib/db'

const IMAGES = {
  laptopDell: [
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1200&auto=format&fit=crop&q=80',
  ],
  laptopMacBook: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1200&auto=format&fit=crop&q=80',
  ],
  cameraSony: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&auto=format&fit=crop&q=80',
  ],
  droneDJI: [
    'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=1200&auto=format&fit=crop&q=80',
  ],
  projectorEpson: [
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
  ],
  soundSystem: [
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
  ],
  carSports: [
    'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80',
  ],
  eBike: [
    'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&auto=format&fit=crop&q=80',
  ],
  motorcycle: [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&auto=format&fit=crop&q=80',
  ],
  toolKit: [
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
  ],
  generator: [
    'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&auto=format&fit=crop&q=80',
  ],
  kayak: [
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80',
  ],
}

async function main() {
  console.log('Seeding Asset Rental Step 01 database...')

  // 1. Company
  const company = await db.rentalCompany.create({
    data: {
      name: 'RentHub Enterprise Rentals',
      legalName: 'RentHub Equipment Solutions Co., Ltd.',
      currency: 'USD',
      timezone: 'Asia/Phnom_Penh',
      phone: '+855 23 888 999',
      email: 'operations@renthub.app',
      address: 'Plot 120, Street 2004, Sen Sok, Phnom Penh, Cambodia',
    },
  })
  console.log(`✓ Rental Company created: ${company.name}`)

  // 2. Users
  const adminUser = await db.user.create({
    data: {
      email: 'admin@renthub.app',
      name: 'Vannak Chen (Admin)',
      role: 'admin',
      phone: '+855 12 345 678',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AdminVannak&backgroundColor=b6e3f4',
      bio: 'Asset & Rental Fleet Operations Director',
    },
  })

  const renterUser = await db.user.create({
    data: {
      email: 'sokha.renter@gmail.com',
      name: 'Sokha Meng',
      role: 'member',
      phone: '+855 89 765 432',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sokha&backgroundColor=ffd5dc',
      bio: 'Commercial Video Producer & Event Organizer',
    },
  })

  // 3. Locations
  const locPhnomPenh = await db.assetLocation.create({
    data: {
      companyId: company.id,
      name: 'Phnom Penh Central Logistics Hub',
      code: 'PNH-01',
      address: 'Building 42, Norodom Blvd, Daun Penh',
      city: 'Phnom Penh',
      timezone: 'Asia/Phnom_Penh',
      isPickupDefault: true,
      isActive: true,
    },
  })

  const locSiemReap = await db.assetLocation.create({
    data: {
      companyId: company.id,
      name: 'Siem Reap Regional Depot',
      code: 'REP-01',
      address: 'No. 88, Sivutha Blvd, Svay Dangkum',
      city: 'Siem Reap',
      timezone: 'Asia/Phnom_Penh',
      isPickupDefault: false,
      isActive: true,
    },
  })

  const locSihanouk = await db.assetLocation.create({
    data: {
      companyId: company.id,
      name: 'Sihanoukville Coastal Facility',
      code: 'KOS-01',
      address: 'Ekareach Street 100, Sangkat 2',
      city: 'Sihanoukville',
      timezone: 'Asia/Phnom_Penh',
      isPickupDefault: false,
      isActive: true,
    },
  })
  console.log('✓ Locations created: Phnom Penh, Siem Reap, Sihanoukville')

  // 4. Brands
  const brandDell = await db.assetBrand.create({ data: { name: 'Dell Technologies', slug: 'dell' } })
  const brandApple = await db.assetBrand.create({ data: { name: 'Apple Inc.', slug: 'apple' } })
  const brandSony = await db.assetBrand.create({ data: { name: 'Sony Alpha', slug: 'sony' } })
  const brandDJI = await db.assetBrand.create({ data: { name: 'DJI Innovations', slug: 'dji' } })
  const brandEpson = await db.assetBrand.create({ data: { name: 'Epson Pro Cinema', slug: 'epson' } })
  const brandJBL = await db.assetBrand.create({ data: { name: 'JBL Professional', slug: 'jbl' } })
  const brandMilwaukee = await db.assetBrand.create({ data: { name: 'Milwaukee Tool', slug: 'milwaukee' } })
  const brandHonda = await db.assetBrand.create({ data: { name: 'Honda Motors', slug: 'honda' } })
  const brandTrek = await db.assetBrand.create({ data: { name: 'Trek Bicycles', slug: 'trek' } })
  console.log('✓ Brands created: Dell, Apple, Sony, DJI, Epson, JBL, Milwaukee, Honda, Trek')

  // 5. Categories with Hierarchy
  const catElectronics = await db.assetCategory.create({
    data: {
      name: 'Electronics & IT',
      slug: 'electronics',
      shortDescription: 'Enterprise laptops, monitors, mobile workstations and tech gear.',
      description: 'High-performance commercial IT infrastructure and workstations for corporate events, field teams, and temporary offices.',
      iconName: 'Laptop',
      color: '#3B82F6',
      displayOrder: 1,
      status: 'ACTIVE',
      metaTitle: 'IT Equipment & Laptop Rental | RentHub Cambodia',
      metaDescription: 'Rent high-performance Dell, Apple, and ThinkPad laptops and computing gear in Phnom Penh.',
    },
  })

  const catLaptops = await db.assetCategory.create({
    data: {
      name: 'Laptops & Workstations',
      slug: 'laptops-workstations',
      parentId: catElectronics.id,
      shortDescription: 'Business laptops and powerful creator mobile workstations.',
      iconName: 'Laptop',
      color: '#3B82F6',
      displayOrder: 1,
      status: 'ACTIVE',
    },
  })

  const catAVMedia = await db.assetCategory.create({
    data: {
      name: 'Photo, Video & Audio',
      slug: 'photo-video-audio',
      shortDescription: 'Cinematic mirrorless cameras, 4K drones, audio gear and projectors.',
      description: 'Production-grade film and photography gear for productions, weddings, commercial shoots, and live conferences.',
      iconName: 'Camera',
      color: '#EC4899',
      displayOrder: 2,
      status: 'ACTIVE',
      metaTitle: 'Professional Cinema & Camera Rentals',
      metaDescription: 'Rent Sony FX, Alpha mirrorless cameras, wireless microphones and cinema drones.',
    },
  })

  const catCameras = await db.assetCategory.create({
    data: {
      name: 'Cinema & Mirrorless Cameras',
      slug: 'cameras',
      parentId: catAVMedia.id,
      shortDescription: 'Full frame 4K/8K bodies and prime G-Master lenses.',
      iconName: 'Camera',
      color: '#EC4899',
      displayOrder: 1,
      status: 'ACTIVE',
    },
  })

  const catDrones = await db.assetCategory.create({
    data: {
      name: 'Aerial Drones & Gimbals',
      slug: 'drones',
      parentId: catAVMedia.id,
      shortDescription: '4K/5.1K aerial drones with obstacle avoidance and long range.',
      iconName: 'Crosshair',
      color: '#8B5CF6',
      displayOrder: 2,
      status: 'ACTIVE',
    },
  })

  const catVehicles = await db.assetCategory.create({
    data: {
      name: 'Vehicles & Mobility',
      slug: 'vehicles',
      shortDescription: 'Cars, motorcycles, and premium electric trail bikes.',
      iconName: 'Car',
      color: '#F59E0B',
      displayOrder: 3,
      status: 'ACTIVE',
    },
  })

  const catTools = await db.assetCategory.create({
    data: {
      name: 'Tools & Power Equipment',
      slug: 'tools-equipment',
      shortDescription: 'Heavy-duty cordless drills, demolition hammers and power generators.',
      iconName: 'Wrench',
      color: '#10B981',
      displayOrder: 4,
      status: 'ACTIVE',
    },
  })
  console.log('✓ Categories with parent/child hierarchy created')

  // 6. Listings & Physical Units Data
  const listingsData = [
    {
      code: 'LAP-DELL-5440',
      name: 'Dell Latitude 5440 Business Laptop (Core i7 / 32GB)',
      slug: 'dell-latitude-5440-laptop',
      category: catLaptops,
      brand: brandDell,
      model: 'Latitude 5440',
      shortDescription: 'Reliable business laptop with 13th Gen Intel Core i7, 32GB RAM, 512GB NVMe SSD, and 14-inch FHD display.',
      description: 'The Dell Latitude 5440 delivers rugged reliability, 12+ hours battery life, high-speed Wi-Fi 6E, and crisp webcam for high-stakes remote conferences and training workshops.',
      specifications: {
        'Processor': 'Intel Core i7-1365U vPro (10 cores, up to 5.2 GHz)',
        'Memory': '32 GB DDR5 4800 MHz',
        'Storage': '512 GB PCIe NVMe M.2 SSD',
        'Display': '14.0" FHD (1920x1080) Anti-Glare 300 nits',
        'Ports': '2x Thunderbolt 4, 2x USB 3.2, HDMI 2.0, RJ-45',
        'Weight': '1.36 kg (3.0 lbs)',
        'OS': 'Windows 11 Pro Licensed',
      },
      coverImage: IMAGES.laptopDell[0],
      images: IMAGES.laptopDell,
      visibility: 'PUBLISHED',
      rate: 18.00,
      deposit: 150.00,
      lateFee: 25.00,
      prepBuffer: 120,
      returnBuffer: 120,
      rating: 4.9,
      reviewCount: 28,
      units: [
        {
          tag: 'TO-LAP-0001',
          serial: 'SN-DELL-5440-A01',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: '65W USB-C Charger, Neoprene Sleeve, HDMI Cable, Wireless Mouse',
          purchaseCost: 1150.00,
          notes: 'Deployed in Executive Training series. Battery health 98%.',
        },
        {
          tag: 'TO-LAP-0002',
          serial: 'SN-DELL-5440-A02',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'GOOD',
          accessories: '65W USB-C Charger, Neoprene Sleeve',
          purchaseCost: 1150.00,
          notes: 'Minor cosmetic mark on bottom chassis. Screen pristine.',
        },
        {
          tag: 'TO-LAP-0003',
          serial: 'SN-DELL-5440-A03',
          location: locSiemReap,
          baseStatus: 'ACTIVE',
          conditionGrade: 'NEW',
          accessories: 'Original Box, 65W USB-C Charger, Sleeve, Ethernet Adapter',
          purchaseCost: 1150.00,
          notes: 'Stationed at Siem Reap branch for hospitality audit bookings.',
        },
        {
          tag: 'TO-LAP-0004',
          serial: 'SN-DELL-5440-A04',
          location: locPhnomPenh,
          baseStatus: 'MAINTENANCE',
          conditionGrade: 'FAIR',
          accessories: '65W Charger',
          purchaseCost: 1150.00,
          notes: 'Keyboard keycap replacement in progress. Expected back next week.',
        },
      ],
    },
    {
      code: 'LAP-APL-MBP16',
      name: 'Apple MacBook Pro 16" M3 Max (36GB / 1TB SSD)',
      slug: 'apple-macbook-pro-16-m3-max',
      category: catLaptops,
      brand: brandApple,
      model: 'MacBook Pro 16 (Late 2023)',
      shortDescription: 'Liquid Retina XDR display, 14-core CPU, 30-core GPU, capable of seamless 8K video color grading.',
      description: 'The definitive creative powerhouse for on-set DIT stations, multi-track audio recording, and complex motion graphics rendering. Includes 140W MagSafe fast charger.',
      specifications: {
        'Chip': 'Apple M3 Max (14-core CPU, 30-core GPU, 16-core Neural Engine)',
        'Unified Memory': '36 GB Unified RAM',
        'Storage': '1 TB Ultra-fast NVMe SSD',
        'Display': '16.2-inch Liquid Retina XDR (3456x2234), 120Hz ProMotion, 1600 nits peak',
        'Battery': 'Up to 22 hours playback',
        'Ports': '3x Thunderbolt 4, HDMI, SDXC card slot, MagSafe 3',
      },
      coverImage: IMAGES.laptopMacBook[0],
      images: IMAGES.laptopMacBook,
      visibility: 'PUBLISHED',
      rate: 45.00,
      deposit: 500.00,
      lateFee: 60.00,
      prepBuffer: 180,
      returnBuffer: 180,
      rating: 5.0,
      reviewCount: 19,
      units: [
        {
          tag: 'TO-MAC-0101',
          serial: 'SN-APL-M3M-001',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: '140W MagSafe 3 Charger, Thule Rugged Hard Case, USB-C to HDMI Adapter',
          purchaseCost: 3499.00,
          notes: 'Pristine condition. Battery cycles: 24.',
        },
        {
          tag: 'TO-MAC-0102',
          serial: 'SN-APL-M3M-002',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'NEW',
          accessories: '140W MagSafe 3 Charger, Leather Sleeve',
          purchaseCost: 3499.00,
          notes: 'Unboxed last month, assigned to primary commercial video pool.',
        },
      ],
    },
    {
      code: 'CAM-SNY-A7IV',
      name: 'Sony Alpha 7 IV Full-Frame Hybrid Camera Kit (24-70mm GM II)',
      slug: 'sony-alpha-7-iv-camera-kit',
      category: catCameras,
      brand: brandSony,
      model: 'ILCE-7M4 + SEL2470GM2',
      shortDescription: '33MP BSI full-frame sensor, 4K 60p 10-bit 4:2:2, real-time eye AF, paired with Sony 24-70mm f/2.8 GM II lens.',
      description: 'The industry workhorse for event cinematographers, documentary makers, and commercial photographers. Outstanding low-light performance and color science with S-Cinetone.',
      specifications: {
        'Sensor': '33 Megapixel Exmor R CMOS Full-Frame',
        'Lens': 'Sony FE 24-70mm F2.8 GM II Premium Zoom',
        'Video': '4K 60p in Super35, 4K 30p full sensor oversampled from 7K, 10-bit 4:2:2',
        'Autofocus': '759 phase-detection points with AI Human/Animal/Bird Eye AF',
        'Stabilization': '5.5-stop 5-axis in-body image stabilization (IBIS)',
        'Storage Media': 'Dual slots (CFexpress Type A / SD UHS-II)',
      },
      coverImage: IMAGES.cameraSony[0],
      images: IMAGES.cameraSony,
      visibility: 'PUBLISHED',
      rate: 65.00,
      deposit: 400.00,
      lateFee: 80.00,
      prepBuffer: 120,
      returnBuffer: 120,
      rating: 4.95,
      reviewCount: 42,
      units: [
        {
          tag: 'TO-CAM-0501',
          serial: 'SN-SNY-A74-9912',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: 'Sony 24-70mm GM II Lens, 3x NP-FZ100 Batteries, Dual Charger, 128GB V90 SD Card, Pelican Storm Case',
          purchaseCost: 4300.00,
          notes: 'Sensor cleaned and shutter count verified at 4,120 actuations.',
        },
        {
          tag: 'TO-CAM-0502',
          serial: 'SN-SNY-A74-9913',
          location: locSiemReap,
          baseStatus: 'ACTIVE',
          conditionGrade: 'GOOD',
          accessories: 'Sony 24-70mm GM II Lens, 2x NP-FZ100 Batteries, Dual Charger, 128GB SD Card, Padded Bag',
          purchaseCost: 4300.00,
          notes: 'Standard rental kit at Siem Reap Depot. All elements clean.',
        },
      ],
    },
    {
      code: 'DRN-DJI-M3PRO',
      name: 'DJI Mavic 3 Pro Cine Fly More Combo (Tri-Camera Apple ProRes)',
      slug: 'dji-mavic-3-pro-cine-drone',
      category: catDrones,
      brand: brandDJI,
      model: 'Mavic 3 Pro Cine',
      shortDescription: 'Tri-camera system featuring 4/3 CMOS Hasselblad camera, 70mm medium tele, and 166mm telephoto with ProRes 422 HQ.',
      description: 'Capture cinematic footage from every angle. Tri-camera focal lengths (24mm, 70mm, 166mm) provide extraordinary creative flexibility. Up to 43 minutes flight time per battery.',
      specifications: {
        'Cameras': '4/3 Hasselblad (20MP), 1/1.3" Tele (48MP), 1/2" Tele (12MP)',
        'Video Format': 'Apple ProRes 422 HQ, D-Log M, 5.1K up to 50fps, 4K up to 120fps',
        'Internal Storage': '1TB SSD built-in + 10Gbps Lightspeed data cable',
        'Flight Time': '43 Minutes max per intelligent flight battery',
        'Transmission': 'DJI O3+ up to 15 km FHD live feed',
        'Safety': 'Omnidirectional obstacle sensing with APAS 5.0',
      },
      coverImage: IMAGES.droneDJI[0],
      images: IMAGES.droneDJI,
      visibility: 'PUBLISHED',
      rate: 85.00,
      deposit: 650.00,
      lateFee: 100.00,
      prepBuffer: 180,
      returnBuffer: 180,
      rating: 4.88,
      reviewCount: 31,
      units: [
        {
          tag: 'TO-DRN-001',
          serial: 'SN-DJI-M3PC-0081',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: 'DJI RC Pro Controller, 3x Flight Batteries, Battery Charging Hub, ND Filter Set (ND8/16/32/64), Shoulder Bag, Spare Propellers',
          purchaseCost: 3899.00,
          notes: 'Registered with Civil Aviation Authority; firmware v01.01.0600 updated.',
        },
      ],
    },
    {
      code: 'PRJ-EPS-EBPU',
      name: 'Epson Pro Cinema High-Lumen Laser Projector (10,000 Lumens WUXGA)',
      slug: 'epson-laser-projector-10000-lumens',
      category: catAVMedia,
      brand: brandEpson,
      model: 'EB-PU2010B',
      shortDescription: '10,000 Lumens 3LCD laser projector with 4K enhancement for ballroom events, conferences and outdoor mapping.',
      description: 'State-of-the-art laser projection designed for large venues, auditoriums, and staging events. Offers 20,000 hours of maintenance-free operation and motorized lens shift.',
      specifications: {
        'Brightness': '10,000 Lumens (Color and White Output)',
        'Native Resolution': 'WUXGA (1920 x 1200) with 4K Enhancement Technology',
        'Light Source': 'Solid-state laser phosphor (20,000 hours)',
        'Contrast Ratio': 'Over 2,500,000:1 (Dynamic)',
        'Inputs': 'HDBaseT, 3G-SDI, HDMI, DVI-D, LAN, RS-232C',
      },
      coverImage: IMAGES.projectorEpson[0],
      images: IMAGES.projectorEpson,
      visibility: 'PUBLISHED',
      rate: 150.00,
      deposit: 800.00,
      lateFee: 200.00,
      prepBuffer: 240,
      returnBuffer: 240,
      rating: 4.9,
      reviewCount: 14,
      units: [
        {
          tag: 'TO-AV-9001',
          serial: 'SN-EPS-PU10K-01',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: 'Standard Throw Zoom Lens ELPLM15, Heavy-Duty Flight Case, 50m Fiber HDMI Cable, Ceiling Staging Mount Bracket',
          purchaseCost: 11200.00,
          notes: 'Calibrated for corporate gala staging; flight case on heavy caster wheels.',
        },
      ],
    },
    {
      code: 'SND-JBL-PRX915',
      name: 'JBL PRX915 Powered PA Concert Sound System (2000W Active Pair)',
      slug: 'jbl-prx915-sound-system',
      category: catAVMedia,
      brand: brandJBL,
      model: 'PRX915 Pair + PRX918XLF Subwoofer',
      shortDescription: 'Complete 2.1 concert PA package: two 15" 2000W powered tops, one 18" active subwoofer, speaker poles, and wireless mics.',
      description: 'Engineered for crystal-clear vocals and impactful bass for audiences up to 500 people. Features DSP with onboard EQ, feedback suppression, and Bluetooth Pro Connect control app.',
      specifications: {
        'Peak Power': '4000 Watts combined peak power',
        'Frequency Response': '48 Hz - 19 kHz (-10 dB)',
        'Max SPL': '133 dB peak',
        'Wireless Mic': '2x Shure BLX24/SM58 Handheld Wireless Systems Included',
        'Mixer': 'Mackie ProFX10v3 10-Channel FX Analog Mixer Included',
      },
      coverImage: IMAGES.soundSystem[0],
      images: IMAGES.soundSystem,
      visibility: 'PUBLISHED',
      rate: 120.00,
      deposit: 500.00,
      lateFee: 150.00,
      prepBuffer: 180,
      returnBuffer: 180,
      rating: 4.85,
      reviewCount: 22,
      units: [
        {
          tag: 'TO-SND-010',
          serial: 'SN-JBL-PRX9-SET01',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'GOOD',
          accessories: '2x PRX915 Tops, 1x PRX918XLF Sub, 2x Speaker Stands, 2x Wireless Mics, Mackie 10-channel Mixer, All XLR Cable Runs',
          purchaseCost: 4800.00,
          notes: 'Full sound check completed before every rental release.',
        },
      ],
    },
    {
      code: 'VEH-TRK-PW5',
      name: 'Trek Powerfly 5 Gen 4 All-Terrain Electric Mountain Bike',
      slug: 'trek-powerfly-5-ebike',
      category: catVehicles,
      brand: brandTrek,
      model: 'Powerfly 5 Gen 4',
      shortDescription: 'Bosch Performance CX motor with 85Nm torque, 625Wh Removable Integrated Battery, and RockShox suspension.',
      description: 'Capable of conquering Kulen Mountain trails and rough countryside terrain with ease. Up to 110km assisted range on a single charge. Helmet, lock, and portable Bosch 4A charger included.',
      specifications: {
        'Motor': 'Bosch Performance CX, magnesium body, 85 Nm, 25 km/h max assist',
        'Battery': 'Bosch PowerTube 625Wh integrated',
        'Drivetrain': 'Shimano Deore M6100, 12 speed',
        'Brakes': 'Shimano 4-piston hydraulic disc',
        'Fork': 'RockShox Recon Silver RL, 120mm travel',
      },
      coverImage: IMAGES.eBike[0],
      images: IMAGES.eBike,
      visibility: 'PUBLISHED',
      rate: 40.00,
      deposit: 200.00,
      lateFee: 50.00,
      prepBuffer: 60,
      returnBuffer: 60,
      rating: 4.92,
      reviewCount: 37,
      units: [
        {
          tag: 'TO-BIK-001',
          serial: 'SN-TRK-PF5-M-01',
          location: locSiemReap,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: 'Bosch Fast Charger, Abus Bordo Lock, Bell Mountain Helmet, Tool Saddle Bag',
          purchaseCost: 4200.00,
          notes: 'Frame size M (suitable for 165cm - 178cm riders). Hydraulic brakes bled recently.',
        },
        {
          tag: 'TO-BIK-002',
          serial: 'SN-TRK-PF5-L-02',
          location: locSiemReap,
          baseStatus: 'ACTIVE',
          conditionGrade: 'EXCELLENT',
          accessories: 'Bosch Fast Charger, Abus Bordo Lock, Bell Helmet, Phone Bar Mount',
          purchaseCost: 4200.00,
          notes: 'Frame size L (suitable for 177cm - 188cm riders).',
        },
      ],
    },
    {
      code: 'TLS-MLW-M18COMBO',
      name: 'Milwaukee M18 FUEL 6-Piece Heavy Contractor Power Tool Combo',
      slug: 'milwaukee-m18-fuel-power-tools',
      category: catTools,
      brand: brandMilwaukee,
      model: 'M18 FUEL 2997-26',
      shortDescription: 'Industrial cordless kit: 1/2" hammer drill, 1/4" hex impact driver, 7-1/4" circular saw, SAWZALL recip saw, angle grinder, work light.',
      description: 'Engineered for commercial contractors, carpentry framing, electrical work, and plumbing retrofits. High-torque brushless POWERSTATE motors with two 5.0Ah REDLITHIUM XC batteries.',
      specifications: {
        'System': 'Milwaukee M18 Cordless 18-Volt',
        'Included Tools': 'Hammer Drill, Impact Driver, Circular Saw, Reciprocating Saw, 4-1/2" Angle Grinder, LED Floodlight',
        'Batteries': '2x M18 REDLITHIUM XC5.0 High Capacity Batteries',
        'Charger': 'M18 & M12 Multi-Voltage Fast Charger',
        'Case': 'Contractor Heavy-Duty Canvas Rolling Bag',
      },
      coverImage: IMAGES.toolKit[0],
      images: IMAGES.toolKit,
      visibility: 'PUBLISHED',
      rate: 35.00,
      deposit: 180.00,
      lateFee: 45.00,
      prepBuffer: 90,
      returnBuffer: 90,
      rating: 4.8,
      reviewCount: 16,
      units: [
        {
          tag: 'TO-TLS-001',
          serial: 'SN-MLW-M18-091',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'GOOD',
          accessories: '6 Tools, 2x 5Ah Batteries, Rapid Charger, 3x Sawzall Blades, Carbide Circular Blade',
          purchaseCost: 949.00,
          notes: 'Cleaned and tested. All tool chucks lubricated and verified.',
        },
      ],
    },
    // Draft item for testing the Draft -> Publish flow
    {
      code: 'TLS-HND-GEN3000',
      name: 'Honda EU3000is Super Quiet Inverter Generator (Draft)',
      slug: 'honda-eu3000is-generator',
      category: catTools,
      brand: brandHonda,
      model: 'EU3000is',
      shortDescription: '3000 Watts 120V portable inverter generator for film location power and outdoor events.',
      description: 'Operates at 50 to 57 dB(A), less noise than normal conversation. Electric start with backup recoil.',
      specifications: {
        'Engine': 'Honda GX200 196cc',
        'AC Output': '120V 3000W max (25.0A) / 2800W rated (23.3A)',
        'Fuel Tank': '3.4 Gallons (9.0 hrs run time at half load)',
      },
      coverImage: IMAGES.generator[0],
      images: IMAGES.generator,
      visibility: 'DRAFT', // Starts as DRAFT for testing
      rate: 55.00,
      deposit: 300.00,
      lateFee: 70.00,
      prepBuffer: 120,
      returnBuffer: 120,
      rating: 0,
      reviewCount: 0,
      units: [
        {
          tag: 'TO-GEN-001',
          serial: 'SN-HND-EU3K-771',
          location: locPhnomPenh,
          baseStatus: 'ACTIVE',
          conditionGrade: 'NEW',
          accessories: 'Heavy-Duty Wheel Kit, Oil funnel, 30A RV adapter',
          purchaseCost: 2499.00,
          notes: 'Fresh oil added. Battery tender tested.',
        },
      ],
    },
    // Unpublished item for testing the Publish/Unpublish flow
    {
      code: 'VEH-HND-CRF300L',
      name: 'Honda CRF300L Dual-Sport Adventure Motorcycle (Unpublished)',
      slug: 'honda-crf300l-motorcycle',
      category: catVehicles,
      brand: brandHonda,
      model: 'CRF300L Dual Sport',
      shortDescription: 'Lightweight dual-sport motorcycle for jungle trails, Cardamom mountains and rural touring.',
      description: '286cc liquid-cooled single-cylinder, long-travel Showa suspension, and lightweight chassis for off-road agility.',
      specifications: {
        'Displacement': '286 cc DOHC 4-valve liquid-cooled',
        'Ground Clearance': '284 mm (11.2 inches)',
        'Weight': '142 kg wet',
        'Fuel Capacity': '7.8 Liters',
      },
      coverImage: IMAGES.motorcycle[0],
      images: IMAGES.motorcycle,
      visibility: 'UNPUBLISHED', // Starts UNPUBLISHED
      rate: 65.00,
      deposit: 400.00,
      lateFee: 80.00,
      prepBuffer: 120,
      returnBuffer: 120,
      rating: 4.7,
      reviewCount: 8,
      units: [
        {
          tag: 'TO-MOT-001',
          serial: 'SN-HND-CRF-2024-01',
          location: locPhnomPenh,
          baseStatus: 'MAINTENANCE',
          conditionGrade: 'GOOD',
          accessories: 'Dual-sport Helmet, Heavy-Duty Barkbusters, Rear Luggage Rack',
          purchaseCost: 6200.00,
          notes: 'Scheduled for 1,000km oil change and chain adjustment.',
        },
      ],
    },
  ]

  for (const item of listingsData) {
    const listing = await db.assetListing.create({
      data: {
        companyId: company.id,
        code: item.code,
        name: item.name,
        slug: item.slug,
        categoryId: item.category.id,
        brandId: item.brand.id,
        model: item.model,
        shortDescription: item.shortDescription,
        description: item.description,
        specifications: JSON.stringify(item.specifications),
        trackingMode: 'SERIALIZED',
        coverImage: item.coverImage,
        images: JSON.stringify(item.images),
        allowDelivery: true,
        deliveryFee: 15.00,
        visibility: item.visibility,
        publishedAt: item.visibility === 'PUBLISHED' ? new Date() : null,
        rating: item.rating,
        reviewCount: item.reviewCount,
      },
    })

    // Rental Rate
    await db.assetRate.create({
      data: {
        listingId: listing.id,
        currency: 'USD',
        billingUnit: 'DAY',
        rateAmount: item.rate,
        isPrimary: true,
      },
    })

    // Rental Policy
    await db.assetRentalPolicy.create({
      data: {
        listingId: listing.id,
        securityDeposit: item.deposit,
        minimumDuration: 1,
        minimumDurationUnit: 'DAY',
        lateFeeAmount: item.lateFee,
        lateFeeUnit: 'DAY',
        lateGraceMinutes: 30,
        minAdvanceNoticeMinutes: 120,
        preparationBufferMinutes: item.prepBuffer,
        returnBufferMinutes: item.returnBuffer,
        allowedPickupWeekdays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
        termsTemplate: 'Standard RentHub Equipment Rental Terms & Conditions. Customer is responsible for safe handling and returns in matching condition grade.',
      },
    })

    // Location Options (Pickup at all active locations)
    await db.assetLocationOption.create({
      data: {
        listingId: listing.id,
        locationId: locPhnomPenh.id,
        pickupEnabled: true,
        returnEnabled: true,
      },
    })
    await db.assetLocationOption.create({
      data: {
        listingId: listing.id,
        locationId: locSiemReap.id,
        pickupEnabled: true,
        returnEnabled: true,
      },
    })

    // Units
    for (const u of item.units) {
      const unit = await db.assetUnit.create({
        data: {
          listingId: listing.id,
          assetTag: u.tag,
          serialNumber: u.serial,
          locationId: u.location.id,
          baseStatus: u.baseStatus,
          conditionGrade: u.conditionGrade,
          accessories: u.accessories,
          purchaseCost: u.purchaseCost,
          notes: u.notes,
        },
      })

      // If unit is in maintenance, add a blocked interval
      if (u.baseStatus === 'MAINTENANCE') {
        const start = new Date()
        const end = new Date()
        end.setDate(end.getDate() + 7)
        await db.assetBlockedInterval.create({
          data: {
            listingId: listing.id,
            unitId: unit.id,
            startAt: start,
            endAt: end,
            reason: 'Quarterly Maintenance and Technical Inspection',
            notes: u.notes,
            createdBy: 'Admin Vannak',
          },
        })
      }
    }

    // Audit Event
    await db.assetAuditEvent.create({
      data: {
        companyId: company.id,
        listingId: listing.id,
        entityType: 'LISTING',
        entityId: listing.id,
        actorName: 'Vannak Chen (Admin)',
        action: item.visibility === 'PUBLISHED' ? 'PUBLISH' : 'CREATE',
        afterJson: JSON.stringify({
          code: listing.code,
          name: listing.name,
          visibility: listing.visibility,
          unitsCount: item.units.length,
          rateAmount: item.rate,
        }),
      },
    })
  }

  // 7. Seed sample reviews for the first 3 listings
  const allListings = await db.assetListing.findMany()
  const reviewsSeed = [
    {
      listingCode: 'LAP-DELL-5440',
      rating: 5,
      comment: 'Top quality laptop, clean OS install, 100% reliable for our 3-day corporate conference.',
    },
    {
      listingCode: 'LAP-APL-MBP16',
      rating: 5,
      comment: 'The M3 Max crushed our 8K ProRes footage render on location. Essential piece of production kit.',
    },
    {
      listingCode: 'CAM-SNY-A7IV',
      rating: 5,
      comment: 'Camera and 24-70mm GM II lens were spotless. Sensor was clean, batteries fully charged.',
    },
  ]

  for (const r of reviewsSeed) {
    const listing = allListings.find((l) => l.code === r.listingCode)
    if (!listing) continue
    await db.review.create({
      data: {
        listingId: listing.id,
        userId: renterUser.id,
        rating: r.rating,
        comment: r.comment,
      },
    })
  }

  console.log('✓ Seed completed successfully!')
  console.log(`  Listings: ${listingsData.length}`)
  console.log(`  Locations: 3`)
  console.log(`  Categories: 7`)
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
