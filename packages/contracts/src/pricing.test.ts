import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVisitPricing,
  calculateQuoteBreakdown,
  calculateCommission,
  canTransition,
  BookingStatus,
  UserRole,
} from './index.js';

test('calculateVisitPricing: computes base visit fee, surcharge, and tax correctly in paise', () => {
  // Within free 3km radius
  const localVisit = calculateVisitPricing({
    baseVisitFeePaise: 29900, // ₹299
    roadDistanceMeters: 2500,  // 2.5 km
  });

  assert.equal(localVisit.distanceSurchargePaise, 0);
  assert.equal(localVisit.platformFeePaise, 4900); // ₹49
  // Subtotal = 29900 + 0 + 4900 = 34800
  // Tax 18% = 34800 * 0.18 = 6264
  assert.equal(localVisit.taxPaise, 6264);
  assert.equal(localVisit.totalVisitFeePaise, 41064); // ₹410.64

  // Beyond free 3km radius (e.g. 5.5 km = 3km free + 3km rounded extra = 3 extra km @ ₹20/km)
  const farVisit = calculateVisitPricing({
    baseVisitFeePaise: 29900,
    roadDistanceMeters: 5500, // 2.5km extra => rounded to 3km extra @ 2000 paise = 6000 paise
  });
  assert.equal(farVisit.distanceSurchargePaise, 6000);
});

test('calculateQuoteBreakdown: accurately computes labor, parts, tax, and credits diagnosis fee', () => {
  const quote = calculateQuoteBreakdown({
    items: [
      { type: 'LABOR', description: 'Tyre puncture patch vulcanizing', quantity: 1, unitPricePaise: 15000 }, // ₹150
      { type: 'PART', description: 'High pressure brass valve stem', quantity: 1, unitPricePaise: 20000 },   // ₹200
    ],
    creditDiagnosisFee: true,
    alreadyPaidVisitFeePaise: 10000, // ₹100 diagnosis credit applied against labor
  });

  assert.equal(quote.laborSubtotalPaise, 15000);
  assert.equal(quote.partsSubtotalPaise, 20000);
  assert.equal(quote.grossSubtotalPaise, 35000);
  assert.equal(quote.diagnosisCreditPaise, 10000);
  // Taxable = 35000 - 10000 = 25000
  // 18% GST on 25000 = 4500
  assert.equal(quote.taxPaise, 4500);
  assert.equal(quote.netPayablePaise, 29500); // ₹295
});

test('calculateCommission: charges commission strictly on labor & visit, not spare parts', () => {
  const comm = calculateCommission({
    totalPaidPaise: 50000,       // ₹500
    laborAndVisitPaise: 30000,   // ₹300 labor/visit, ₹200 parts
    commissionPercent: 15,       // 15%
  });

  assert.equal(comm.platformCommissionPaise, 4500); // 15% of ₹300 = ₹45 (4500 paise)
  assert.equal(comm.mechanicNetEarningsPaise, 45500); // 50000 - 4500 = 45500 paise
});

test('canTransition: enforces allowed state transitions and actor roles strictly', () => {
  // Mechanic cannot transition from DRAFT to ASSIGNED directly
  const invalid = canTransition(BookingStatus.DRAFT, BookingStatus.ASSIGNED, UserRole.MECHANIC);
  assert.equal(invalid.allowed, false);

  // Mechanic can accept OFFERED -> ASSIGNED
  const validAccept = canTransition(BookingStatus.OFFERED, BookingStatus.ASSIGNED, UserRole.MECHANIC);
  assert.equal(validAccept.allowed, true);

  // Customer cannot transition ARRIVED -> DIAGNOSING
  const customerIllegal = canTransition(BookingStatus.ARRIVED, BookingStatus.DIAGNOSING, UserRole.CUSTOMER);
  assert.equal(customerIllegal.allowed, false);

  // Terminal states cannot transition to anything
  const completedTransition = canTransition(BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS, UserRole.SUPER_ADMIN);
  assert.equal(completedTransition.allowed, false);
});
