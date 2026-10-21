import { PrismaClient, UserRole, ProblemCategory, VehicleType, ProviderType, VerificationStatus, DocumentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting RoadSaathi seed script for Mangaluru pilot dataset...');

  // 1. Service Categories
  const categories = [
    {
      code: ProblemCategory.FLAT_TYRE,
      name: 'Flat Tyre & Puncture Repair',
      description: 'On-site tubeless puncture fixing, tube replacement, and spare wheel swapping.',
      icon: 'disc',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 19900,
    },
    {
      code: ProblemCategory.BATTERY_ISSUE,
      name: 'Battery Jumpstart & Health Check',
      description: '12V/24V high-cranking jumpstart, alternator test, and terminal cleanup.',
      icon: 'zap',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 24900,
    },
    {
      code: ProblemCategory.VEHICLE_NOT_STARTING,
      name: 'Vehicle Not Starting',
      description: 'Diagnosis for starter motor, ignition spark, fuel pump, or electrical failure.',
      icon: 'alert-triangle',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 29900,
    },
    {
      code: ProblemCategory.OVERHEATING,
      name: 'Engine Overheating & Coolant Leak',
      description: 'Radiator inspection, coolant top-up, fan motor check, and hose repair.',
      icon: 'thermometer',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 34900,
    },
    {
      code: ProblemCategory.MINOR_MECHANICAL,
      name: 'Minor Mechanical Fault',
      description: 'Brake binding, clutch cable breakdown, belt slippage, and strange noises.',
      icon: 'wrench',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 29900,
    },
    {
      code: ProblemCategory.TOWING,
      name: 'Towing & Recovery Service',
      description: 'Flatbed and hydraulic lift towing to your trusted garage or doorstep.',
      icon: 'truck',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 99900,
    },
    {
      code: ProblemCategory.NOT_SURE,
      name: 'Not Sure / General Inspection',
      description: 'Professional roadside technician diagnosis to identify the root issue.',
      icon: 'help-circle',
      isRoadsideEligible: true,
      defaultVisitFeePaise: 29900,
    },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { code: cat.code },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ Seeded ${categories.length} service categories`);

  // 2. Administrators
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  const adminUsers = [
    {
      phone: '+919800000999',
      email: 'admin@roadsaathi.in',
      name: 'Deepak Rao (Super Admin)',
      role: UserRole.SUPER_ADMIN,
    },
    {
      phone: '+919800000998',
      email: 'verification@roadsaathi.in',
      name: 'Sumana Shetty (Verification Lead)',
      role: UserRole.ADMIN_VERIFICATION,
    },
    {
      phone: '+919800000997',
      email: 'support@roadsaathi.in',
      name: 'Ganesh Pai (Field Operations Support)',
      role: UserRole.ADMIN_SUPPORT,
    },
    {
      phone: '+919800000996',
      email: 'finance@roadsaathi.in',
      name: 'Kavitha Nayak (Finance & Reconciliation)',
      role: UserRole.ADMIN_FINANCE,
    },
  ];

  for (const admin of adminUsers) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        phone: admin.phone,
        name: admin.name,
        role: admin.role,
        passwordHash: defaultPasswordHash,
      },
      create: {
        phone: admin.phone,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        passwordHash: defaultPasswordHash,
      },
    });
  }
  console.log(`✅ Seeded ${adminUsers.length} administrators with MFA readiness`);

  // 3. Customers
  const customer1User = await prisma.user.upsert({
    where: { phone: '+919800000101' },
    update: { name: 'Arjun Kumar', preferredLanguage: 'en' },
    create: {
      phone: '+919800000101',
      email: 'arjun.k@example.com',
      name: 'Arjun Kumar',
      role: UserRole.CUSTOMER,
      preferredLanguage: 'en',
    },
  });

  const customer1Profile = await prisma.customerProfile.upsert({
    where: { userId: customer1User.id },
    update: { emergencyContact: '+919800000199' },
    create: {
      userId: customer1User.id,
      emergencyContact: '+919800000199',
      consentMarketing: true,
    },
  });

  // Customer 1 Vehicles
  const cretaVehicle = await prisma.vehicle.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      customerProfileId: customer1Profile.id,
      make: 'Hyundai',
      model: 'Creta SX(O)',
      year: 2022,
      vehicleType: VehicleType.FOUR_WHEELER_PETROL,
      fuelType: 'PETROL',
      registrationNumber: 'KA19MD4521',
      isDefault: true,
    },
  });

  await prisma.vehicle.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      customerProfileId: customer1Profile.id,
      make: 'Honda',
      model: 'Activa 6G',
      year: 2021,
      vehicleType: VehicleType.TWO_WHEELER,
      fuelType: 'PETROL',
      registrationNumber: 'KA19EK8890',
      isDefault: false,
    },
  });

  const customer2User = await prisma.user.upsert({
    where: { phone: '+919800000102' },
    update: { name: 'Pooja Hegde', preferredLanguage: 'kn' },
    create: {
      phone: '+919800000102',
      email: 'pooja.hegde@example.com',
      name: 'Pooja Hegde',
      role: UserRole.CUSTOMER,
      preferredLanguage: 'kn',
    },
  });

  const customer2Profile = await prisma.customerProfile.upsert({
    where: { userId: customer2User.id },
    update: {},
    create: {
      userId: customer2User.id,
      consentMarketing: false,
    },
  });

  await prisma.vehicle.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      customerProfileId: customer2Profile.id,
      make: 'Tata',
      model: 'Nexon EV Empowered',
      year: 2023,
      vehicleType: VehicleType.FOUR_WHEELER_EV,
      fuelType: 'ELECTRIC',
      registrationNumber: 'KA19EV0012',
      isDefault: true,
    },
  });
  console.log('✅ Seeded fictional customers & vehicle profiles');

  // 4. Seed Mechanics & Garages

  // PROVIDER 1: Ramesh Auto Electric (Kadri, Mangaluru) - Approved, Online, Roadside Ready
  const p1User = await prisma.user.upsert({
    where: { phone: '+919800000001' },
    update: { name: 'Ramesh Poojary' },
    create: {
      phone: '+919800000001',
      name: 'Ramesh Poojary',
      role: UserRole.MECHANIC,
    },
  });

  const p1Profile = await prisma.mechanicProfile.upsert({
    where: { userId: p1User.id },
    update: {
      isOnline: true,
      isRoadsideReady: true,
      verificationStatus: VerificationStatus.APPROVED,
      lastHeartbeatAt: new Date(),
    },
    create: {
      userId: p1User.id,
      fullName: 'Ramesh Poojary',
      businessName: 'Ramesh Auto Electric & Mobile Care',
      providerType: ProviderType.WORKSHOP_WITH_MOBILE,
      workshopAddress: 'Near Kadri Temple Road, Kadri, Mangaluru, Karnataka 575002',
      latitude: 12.8858,
      longitude: 74.8560,
      serviceRadiusKm: 12.0,
      baseVisitFeePaise: 24900,
      prepTimeMinutes: 10,
      verificationStatus: VerificationStatus.APPROVED,
      isOnline: true,
      isRoadsideReady: true,
      ratingAverage: 4.8,
      ratingCount: 38,
      languages: ['en', 'hi', 'kn', 'tulu'],
      lastHeartbeatAt: new Date(),
    },
  });

  // Services for Provider 1
  const p1Cats = [
    ProblemCategory.FLAT_TYRE,
    ProblemCategory.BATTERY_ISSUE,
    ProblemCategory.VEHICLE_NOT_STARTING,
    ProblemCategory.MINOR_MECHANICAL,
  ];
  for (const catCode of p1Cats) {
    const cat = await prisma.serviceCategory.findUnique({ where: { code: catCode } });
    if (cat) {
      await prisma.providerService.upsert({
        where: {
          mechanicProfileId_serviceCategoryId: {
            mechanicProfileId: p1Profile.id,
            serviceCategoryId: cat.id,
          },
        },
        update: { isAvailable: true },
        create: {
          mechanicProfileId: p1Profile.id,
          serviceCategoryId: cat.id,
          isAvailable: true,
        },
      });
    }
  }

  // Verification Documents for Provider 1
  await prisma.verificationDocument.createMany({
    data: [
      {
        mechanicProfileId: p1Profile.id,
        documentType: DocumentType.SHOP_REGISTRATION,
        fileUrl: 'https://storage.roadsaathi.in/documents/demo_shop_reg_p1.pdf',
        fileName: 'mangaluru_city_corp_trade_license.pdf',
        mimeType: 'application/pdf',
        fileSize: 450200,
        verifiedAt: new Date(),
      },
      {
        mechanicProfileId: p1Profile.id,
        documentType: DocumentType.PAN_CARD,
        fileUrl: 'https://storage.roadsaathi.in/documents/demo_pan_p1.jpg',
        fileName: 'pan_card_ramesh.jpg',
        mimeType: 'image/jpeg',
        fileSize: 180400,
        verifiedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // PROVIDER 2: Kudla 24x7 Towing (Kankanady, Mangaluru) - Towing Specialist
  const p2User = await prisma.user.upsert({
    where: { phone: '+919800000002' },
    update: { name: 'Irfan Sheikh' },
    create: {
      phone: '+919800000002',
      name: 'Irfan Sheikh',
      role: UserRole.MECHANIC,
    },
  });

  const p2Profile = await prisma.mechanicProfile.upsert({
    where: { userId: p2User.id },
    update: {
      isOnline: true,
      isRoadsideReady: true,
      verificationStatus: VerificationStatus.APPROVED,
      lastHeartbeatAt: new Date(),
    },
    create: {
      userId: p2User.id,
      fullName: 'Irfan Sheikh',
      businessName: 'Kudla 24x7 Towing & Recovery Fleet',
      providerType: ProviderType.TOWING_OPERATOR,
      workshopAddress: 'Near Pumpwell Circle, Kankanady, Mangaluru, Karnataka 575002',
      latitude: 12.8617,
      longitude: 74.8623,
      serviceRadiusKm: 25.0,
      baseVisitFeePaise: 99900,
      prepTimeMinutes: 15,
      verificationStatus: VerificationStatus.APPROVED,
      isOnline: true,
      isRoadsideReady: true,
      ratingAverage: 4.9,
      ratingCount: 64,
      languages: ['en', 'hi', 'kn', 'beary'],
      lastHeartbeatAt: new Date(),
    },
  });

  const towingCat = await prisma.serviceCategory.findUnique({ where: { code: ProblemCategory.TOWING } });
  if (towingCat) {
    await prisma.providerService.upsert({
      where: {
        mechanicProfileId_serviceCategoryId: {
          mechanicProfileId: p2Profile.id,
          serviceCategoryId: towingCat.id,
        },
      },
      update: { isAvailable: true },
      create: {
        mechanicProfileId: p2Profile.id,
        serviceCategoryId: towingCat.id,
        isAvailable: true,
      },
    });
  }

  // PROVIDER 3: Coastal Tyre Works (Hampankatta, Mangaluru) - Tyre Specialist
  const p3User = await prisma.user.upsert({
    where: { phone: '+919800000003' },
    update: { name: 'Kiran D Souza' },
    create: {
      phone: '+919800000003',
      name: 'Kiran D Souza',
      role: UserRole.MECHANIC,
    },
  });

  const p3Profile = await prisma.mechanicProfile.upsert({
    where: { userId: p3User.id },
    update: {
      isOnline: true,
      isRoadsideReady: true,
      verificationStatus: VerificationStatus.APPROVED,
      lastHeartbeatAt: new Date(),
    },
    create: {
      userId: p3User.id,
      fullName: 'Kiran D Souza',
      businessName: 'Coastal Tyre & Quick Puncture Works',
      providerType: ProviderType.INDIVIDUAL_MOBILE,
      workshopAddress: 'K.S. Rao Road, Hampankatta, Mangaluru, Karnataka 575001',
      latitude: 12.8698,
      longitude: 74.8431,
      serviceRadiusKm: 8.0,
      baseVisitFeePaise: 19900,
      prepTimeMinutes: 10,
      verificationStatus: VerificationStatus.APPROVED,
      isOnline: true,
      isRoadsideReady: true,
      ratingAverage: 4.7,
      ratingCount: 22,
      languages: ['en', 'hi', 'kn', 'konkani'],
      lastHeartbeatAt: new Date(),
    },
  });

  const tyreCat = await prisma.serviceCategory.findUnique({ where: { code: ProblemCategory.FLAT_TYRE } });
  if (tyreCat) {
    await prisma.providerService.upsert({
      where: {
        mechanicProfileId_serviceCategoryId: {
          mechanicProfileId: p3Profile.id,
          serviceCategoryId: tyreCat.id,
        },
      },
      update: { isAvailable: true },
      create: {
        mechanicProfileId: p3Profile.id,
        serviceCategoryId: tyreCat.id,
        isAvailable: true,
      },
    });
  }

  // PROVIDER 4: Mangalore Precision Workshop (Baikampady Industrial Estate)
  // CRUCIAL TEST CASE: WORKSHOP ONLY -> CANNOT TRAVEL TO ROADSIDE!
  const p4User = await prisma.user.upsert({
    where: { phone: '+919800000004' },
    update: { name: 'Manish Bhat' },
    create: {
      phone: '+919800000004',
      name: 'Manish Bhat',
      role: UserRole.GARAGE_OWNER,
    },
  });

  const p4Profile = await prisma.mechanicProfile.upsert({
    where: { userId: p4User.id },
    update: {
      isOnline: true,
      isRoadsideReady: false, // NO ROADSIDE SERVICE!
      verificationStatus: VerificationStatus.APPROVED,
      providerType: ProviderType.WORKSHOP_ONLY,
    },
    create: {
      userId: p4User.id,
      fullName: 'Manish Bhat',
      businessName: 'Mangalore Precision Workshop (Workshop-Only Garage)',
      providerType: ProviderType.WORKSHOP_ONLY,
      workshopAddress: 'Plot 42, Baikampady Industrial Area, Mangaluru, Karnataka 575011',
      latitude: 12.9467,
      longitude: 74.8130,
      serviceRadiusKm: 0.0,
      baseVisitFeePaise: 49900,
      prepTimeMinutes: 30,
      verificationStatus: VerificationStatus.APPROVED,
      isOnline: true,
      isRoadsideReady: false, // EXCLUDED FROM ROADSIDE DISPATCH!
      ratingAverage: 4.9,
      ratingCount: 51,
      languages: ['en', 'hi', 'kn'],
    },
  });

  // PROVIDER 5: Karavali Motor Clinic (Surathkal) - Under Review / Pending Verification
  // CRUCIAL TEST CASE: Excluded from dispatch because verificationStatus = SUBMITTED
  const p5User = await prisma.user.upsert({
    where: { phone: '+919800000005' },
    update: { name: 'Sathish Kulal' },
    create: {
      phone: '+919800000005',
      name: 'Sathish Kulal',
      role: UserRole.MECHANIC,
    },
  });

  await prisma.mechanicProfile.upsert({
    where: { userId: p5User.id },
    update: {
      verificationStatus: VerificationStatus.SUBMITTED,
    },
    create: {
      userId: p5User.id,
      fullName: 'Sathish Kulal',
      businessName: 'Karavali Motor Clinic (Verification Pending)',
      providerType: ProviderType.WORKSHOP_WITH_MOBILE,
      workshopAddress: 'Near NITK Light House, Surathkal, Karnataka 575014',
      latitude: 13.0084,
      longitude: 74.7937,
      serviceRadiusKm: 15.0,
      baseVisitFeePaise: 29900,
      prepTimeMinutes: 15,
      verificationStatus: VerificationStatus.SUBMITTED,
      isOnline: true,
      isRoadsideReady: true,
      ratingAverage: 0.0,
      ratingCount: 0,
      languages: ['en', 'kn'],
    },
  });

  // PROVIDER 6: Pradeep Bike Point (Bejai, Mangaluru) - Offline
  // CRUCIAL TEST CASE: Excluded from dispatch because isOnline = false
  const p6User = await prisma.user.upsert({
    where: { phone: '+919800000006' },
    update: { name: 'Pradeep Salian' },
    create: {
      phone: '+919800000006',
      name: 'Pradeep Salian',
      role: UserRole.MECHANIC,
    },
  });

  await prisma.mechanicProfile.upsert({
    where: { userId: p6User.id },
    update: {
      isOnline: false,
      verificationStatus: VerificationStatus.APPROVED,
    },
    create: {
      userId: p6User.id,
      fullName: 'Pradeep Salian',
      businessName: 'Pradeep Bike Point (Currently Offline)',
      providerType: ProviderType.INDIVIDUAL_MOBILE,
      workshopAddress: 'Bejai Main Road, Mangaluru, Karnataka 575004',
      latitude: 12.8833,
      longitude: 74.8475,
      serviceRadiusKm: 5.0,
      baseVisitFeePaise: 14900,
      prepTimeMinutes: 10,
      verificationStatus: VerificationStatus.APPROVED,
      isOnline: false, // OFFLINE!
      isRoadsideReady: true,
      ratingAverage: 4.5,
      ratingCount: 15,
      languages: ['kn', 'tulu'],
    },
  });

  console.log('✅ Seeded 6 distinct provider test cases:');
  console.log('   1. Ramesh Auto Electric (Kadri): APPROVED, ONLINE, ROADSIDE READY');
  console.log('   2. Kudla 24x7 Towing (Kankanady): TOWING SPECIALIST, APPROVED, ONLINE');
  console.log('   3. Coastal Tyre Works (Hampankatta): TYRE SPECIALIST, APPROVED, ONLINE');
  console.log('   4. Mangalore Precision Workshop (Baikampady): WORKSHOP-ONLY (EXCLUDED FROM ROADSIDE)');
  console.log('   5. Karavali Motor Clinic (Surathkal): SUBMITTED / PENDING (EXCLUDED FROM DISPATCH)');
  console.log('   6. Pradeep Bike Point (Bejai): OFFLINE (EXCLUDED FROM DISPATCH)');

  console.log('✨ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
