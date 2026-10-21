import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient, ProblemCategory, BookingStatus, ProviderType, VerificationStatus } from '@prisma/client';
import { BookingsService } from '../dist/modules/bookings/bookings.service.js';
import { DiscoveryService } from '../dist/modules/discovery/discovery.service.js';
import { QuotesService } from '../dist/modules/quotes/quotes.service.js';
import { LedgerService } from '../dist/modules/ledger/ledger.service.js';
import { MapsAdapter } from '../dist/common/adapters/maps.adapter.js';
import { NotificationsAdapter } from '../dist/common/adapters/notifications.adapter.js';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const maps = new MapsAdapter();
const notifications = new NotificationsAdapter(prisma as any);
const bookingsService = new BookingsService(prisma as any, maps, notifications);
const discoveryService = new DiscoveryService(prisma as any, maps);
const quotesService = new QuotesService(prisma as any, notifications);
const ledgerService = new LedgerService(prisma as any);

test('1. Discovery: Excludes workshop-only, pending, and offline providers', async () => {
  // Search near Kadri, Mangaluru (12.8858, 74.8560) for FLAT_TYRE
  const result = await discoveryService.searchProviders({
    latitude: 12.8858,
    longitude: 74.8560,
    problemCategory: ProblemCategory.FLAT_TYRE,
  });

  assert.ok(result.providers.length > 0, 'Should find at least 1 online roadside mechanic');

  // Verify none of the returned providers are WORKSHOP_ONLY
  for (const p of result.providers) {
    assert.notEqual(p.providerType, ProviderType.WORKSHOP_ONLY, 'Workshop-only provider must never appear in roadside discovery');
    assert.equal(p.isVerified, true, 'Unverified provider must never appear');
  }

  // Ensure Mangalore Precision Workshop (workshop-only) is NOT in the results
  const workshopOnly = result.providers.find(p => p.businessName.includes('Workshop-Only'));
  assert.equal(workshopOnly, undefined, 'Workshop only must be strictly excluded');

  // Ensure Pending provider is NOT in the results
  const pending = result.providers.find(p => p.businessName.includes('Pending'));
  assert.equal(pending, undefined, 'Pending verification provider must be strictly excluded');
});

test('2. Atomic Concurrency: Simultaneous acceptance by two mechanics results in exactly one winner', async () => {
  // Find customer and vehicle
  const customer = await prisma.customerProfile.findFirst({
    include: { vehicles: true },
  });
  assert.ok(customer && customer.vehicles.length > 0, 'Customer and vehicle required');

  // Find two approved, online mechanics
  const mechanics = await prisma.mechanicProfile.findMany({
    where: {
      verificationStatus: VerificationStatus.APPROVED,
      isOnline: true,
      isRoadsideReady: true,
      currentActiveBookingId: null,
      providerType: { not: ProviderType.WORKSHOP_ONLY },
    },
    take: 2,
  });
  assert.equal(mechanics.length, 2, 'Need 2 available mechanics for concurrency test');

  const [mech1, mech2] = mechanics;

  // Create a new booking
  const idempotencyKey = crypto.randomUUID();
  const booking = await bookingsService.createBooking({
    customerProfileId: customer.id,
    vehicleId: customer.vehicles[0].id,
    problemCategory: ProblemCategory.FLAT_TYRE,
    customerLatitude: 12.8858,
    customerLongitude: 74.8560,
    customerAddress: 'Kadri Hills, Mangaluru',
    maxAcceptedVisitFeePaise: 40000,
    idempotencyKey,
  });

  // Ensure both mechanics have pending offers for this booking
  const offer1 = await prisma.dispatchOffer.upsert({
    where: {
      bookingId_mechanicProfileId: {
        bookingId: booking.id,
        mechanicProfileId: mech1.id,
      },
    },
    update: { status: 'PENDING', expiresAt: new Date(Date.now() + 60000) },
    create: {
      bookingId: booking.id,
      mechanicProfileId: mech1.id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
      estimatedDistanceMeters: 2000,
      estimatedDurationSeconds: 400,
      estimatedEarningsPaise: 25000,
    },
  });

  const offer2 = await prisma.dispatchOffer.upsert({
    where: {
      bookingId_mechanicProfileId: {
        bookingId: booking.id,
        mechanicProfileId: mech2.id,
      },
    },
    update: { status: 'PENDING', expiresAt: new Date(Date.now() + 60000) },
    create: {
      bookingId: booking.id,
      mechanicProfileId: mech2.id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
      estimatedDistanceMeters: 3000,
      estimatedDurationSeconds: 600,
      estimatedEarningsPaise: 25000,
    },
  });

  // RACE CONDITION SIMULATION: Both mechanics attempt to accept simultaneously
  const results = await Promise.allSettled([
    bookingsService.acceptOffer(booking.id, offer1.id, mech1.id),
    bookingsService.acceptOffer(booking.id, offer2.id, mech2.id),
  ]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one mechanic must win the assignment');
  assert.equal(rejected.length, 1, 'The competing mechanic must be rejected due to conflict');

  // Verify database state integrity
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
  });
  assert.equal(updatedBooking?.status, BookingStatus.ASSIGNED);
  assert.ok(updatedBooking?.mechanicProfileId === mech1.id || updatedBooking?.mechanicProfileId === mech2.id);

  // Winning mechanic has active booking ID set
  const winner = await prisma.mechanicProfile.findUnique({
    where: { id: updatedBooking!.mechanicProfileId! },
  });
  assert.equal(winner?.currentActiveBookingId, booking.id);

  // Clean up booking & release mechanic capacity
  await prisma.mechanicProfile.update({
    where: { id: winner!.id },
    data: { currentActiveBookingId: null },
  });
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.COMPLETED },
  });
});

test('3. Single Active Job Constraint: One mechanic cannot accept two concurrent jobs', async () => {
  const customer = await prisma.customerProfile.findFirst({
    include: { vehicles: true },
  });
  const mechanic = await prisma.mechanicProfile.findFirst({
    where: { verificationStatus: VerificationStatus.APPROVED, isOnline: true },
  });

  assert.ok(customer && mechanic);

  // Manually occupy mechanic with a dummy active booking
  await prisma.mechanicProfile.update({
    where: { id: mechanic.id },
    data: { currentActiveBookingId: '00000000-0000-0000-0000-000000000999' },
  });

  // Create another booking and offer
  const booking = await bookingsService.createBooking({
    customerProfileId: customer.id,
    vehicleId: customer.vehicles[0].id,
    problemCategory: ProblemCategory.BATTERY_ISSUE,
    customerLatitude: 12.8698,
    customerLongitude: 74.8431,
    customerAddress: 'Hampankatta, Mangaluru',
    maxAcceptedVisitFeePaise: 35000,
    idempotencyKey: crypto.randomUUID(),
  });

  const offer = await prisma.dispatchOffer.create({
    data: {
      bookingId: booking.id,
      mechanicProfileId: mechanic.id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
      estimatedDistanceMeters: 1000,
      estimatedDurationSeconds: 300,
      estimatedEarningsPaise: 20000,
    },
  });

  // Attempt to accept while already occupied
  await assert.rejects(
    async () => {
      await bookingsService.acceptOffer(booking.id, offer.id, mechanic.id);
    },
    (err: any) => {
      return err.message.includes('Mechanic already has an active roadside job in progress');
    }
  );

  // Free mechanic capacity
  await prisma.mechanicProfile.update({
    where: { id: mechanic.id },
    data: { currentActiveBookingId: null },
  });
});

test('4. End-to-End Service Flow: Quote versioning, Customer approval, Completion OTP, and Ledger balance', async () => {
  const customer = await prisma.customerProfile.findFirst({
    include: { user: true, vehicles: true },
  });
  const mechanic = await prisma.mechanicProfile.findFirst({
    where: { verificationStatus: VerificationStatus.APPROVED, isOnline: true },
    include: { user: true },
  });

  assert.ok(customer && mechanic);

  // Create booking
  const booking = await bookingsService.createBooking({
    customerProfileId: customer.id,
    vehicleId: customer.vehicles[0].id,
    problemCategory: ProblemCategory.FLAT_TYRE,
    customerLatitude: 12.8698,
    customerLongitude: 74.8431,
    customerAddress: 'Kadri Hills, Mangaluru',
    maxAcceptedVisitFeePaise: 50000,
    idempotencyKey: crypto.randomUUID(),
  });

  // Assign mechanic
  const offer = await prisma.dispatchOffer.create({
    data: {
      bookingId: booking.id,
      mechanicProfileId: mechanic.id,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
      estimatedDistanceMeters: 1500,
      estimatedDurationSeconds: 400,
      estimatedEarningsPaise: 25000,
    },
  });

  const assigned = await bookingsService.acceptOffer(booking.id, offer.id, mechanic.id);
  assert.equal(assigned.status, BookingStatus.ASSIGNED);

  // Advance to EN_ROUTE
  await bookingsService.markEnRoute(booking.id, mechanic.userId);

  // Mechanic arrives and submits arrival OTP
  await bookingsService.verifyArrival(booking.id, mechanic.userId, assigned.customerArrivalCode!);

  const diagnosingBooking = await bookingsService.getBookingById(booking.id);
  assert.equal(diagnosingBooking.status, BookingStatus.DIAGNOSING);

  // Mechanic creates repair quote
  const quote = await quotesService.createQuote({
    bookingId: booking.id,
    mechanicUserId: mechanic.userId,
    items: [
      { type: 'LABOR', description: 'Tubeless tyre hot patch repair', quantity: 1, unitPricePaise: 15000 },
      { type: 'PART', description: 'Brass valve pin', quantity: 1, unitPricePaise: 5000 },
    ],
    notes: 'Puncture on rear left tyre successfully plugged',
  });

  assert.equal(quote.status, 'PRESENTED');
  assert.equal(quote.version, 1);

  // Customer approves quote
  const approvalResult = await quotesService.decideQuote({
    quoteId: quote.id,
    version: 1,
    decision: 'ACCEPT',
    customerUserId: customer.userId,
  });

  assert.equal(approvalResult.bookingStatus, BookingStatus.IN_PROGRESS);

  // Customer requests completion code
  const completionReq = await bookingsService.requestCompletionCode(booking.id, customer.userId);
  assert.ok(completionReq.completionCode.length === 4);

  // Mechanic verifies completion code
  const completedBooking = await bookingsService.verifyCompletion(
    booking.id,
    mechanic.userId,
    completionReq.completionCode,
    'Tyre pressure verified and repair verified'
  );

  assert.equal(completedBooking.status, BookingStatus.COMPLETED);

  // Record cash collection
  await ledgerService.recordCashCollection({
    bookingId: booking.id,
    amountPaise: quote.netPayablePaise,
    laborAndVisitPaise: quote.laborSubtotalPaise,
    commissionPercent: 15,
  });

  // Verify financial ledger statement
  const summary = await ledgerService.getMechanicFinancialSummary(mechanic.id);
  assert.ok(summary.totalCompletedJobs > 0);
  assert.ok(summary.cashCommissionDebtPaise > 0);

  // Ensure mechanic capacity is clean
  const finalMech = await prisma.mechanicProfile.findUnique({ where: { id: mechanic.id } });
  assert.equal(finalMech?.currentActiveBookingId, null, 'Mechanic capacity must be liberated upon completion');
});
