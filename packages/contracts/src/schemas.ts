import { z } from 'zod';
import {
  BookingStatus,
  DocumentType,
  PaymentMethod,
  ProblemCategory,
  ProviderType,
  UserRole,
  VehicleType,
  VerificationStatus,
} from './enums.js';

// Indian phone regex: +91 followed by 10 digits starting with 6, 7, 8, or 9
export const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please enter a valid 10-digit Indian mobile number (+91)'),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please enter a valid 10-digit Indian mobile number'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
  fcmToken: z.string().optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().length(6).optional(),
});

export const customerProfileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  emergencyContact: z.string().regex(phoneRegex).optional(),
  preferredLanguage: z.enum(['en', 'hi', 'kn']).default('en'),
});

export const vehicleCreateSchema = z.object({
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  vehicleType: z.nativeEnum(VehicleType),
  fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'CNG', 'HYBRID']).default('PETROL'),
  registrationNumber: z.string().max(20).optional(),
  isDefault: z.boolean().default(false),
});

export const onboardMechanicSchema = z.object({
  fullName: z.string().min(2).max(100),
  businessName: z.string().min(2).max(100),
  phone: z.string().regex(phoneRegex),
  providerType: z.nativeEnum(ProviderType),
  workshopAddress: z.string().min(5).max(250),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().min(1).max(50).default(10),
  supportedVehicles: z.array(z.nativeEnum(VehicleType)).min(1),
  servicesOffered: z.array(z.nativeEnum(ProblemCategory)).min(1),
  baseVisitFeePaise: z.number().int().min(9900).max(1000000), // Min ₹99, Max ₹10,000
  prepTimeMinutes: z.number().int().min(5).max(120).default(15),
  languages: z.array(z.string()).default(['en', 'hi']),
});

export const uploadDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  fileUrl: z.string().url(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
});

export const updateAvailabilitySchema = z.object({
  isOnline: z.boolean(),
  isRoadsideReady: z.boolean().default(true),
});

export const discoveryQuerySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  problemCategory: z.nativeEnum(ProblemCategory),
  vehicleType: z.nativeEnum(VehicleType),
  radiusKm: z.number().min(1).max(30).default(10),
  maxVisitFeePaise: z.number().int().optional(),
});

export const createBookingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3).max(300),
  landmark: z.string().max(150).optional(),
  vehicleId: z.string().uuid(),
  problemCategory: z.nativeEnum(ProblemCategory),
  problemDescription: z.string().max(1000).optional(),
  photoUrls: z.array(z.string().url()).max(5).default([]),
  targetMechanicId: z.string().uuid().optional(), // If choosing specific mechanic
  maxAcceptedVisitFeePaise: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});

export const acceptOfferSchema = z.object({
  bookingId: z.string().uuid(),
  offerId: z.string().uuid(),
  mechanicId: z.string().uuid(),
});

export const declineOfferSchema = z.object({
  bookingId: z.string().uuid(),
  offerId: z.string().uuid(),
  mechanicId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export const verifyArrivalOtpSchema = z.object({
  bookingId: z.string().uuid(),
  otpCode: z.string().length(4, 'Arrival OTP must be 4 digits'),
});

export const quoteItemSchema = z.object({
  type: z.enum(['LABOR', 'PART', 'OTHER']),
  description: z.string().min(2).max(150),
  quantity: z.number().int().min(1).max(100),
  unitPricePaise: z.number().int().min(0).max(10000000), // Max 1 lakh per item
});

export const createQuoteSchema = z.object({
  bookingId: z.string().uuid(),
  items: z.array(quoteItemSchema).min(1),
  notes: z.string().max(500).optional(),
  validUntilMinutes: z.number().int().min(5).max(60).default(15),
});

export const quoteDecisionSchema = z.object({
  quoteId: z.string().uuid(),
  version: z.number().int().positive(),
  decision: z.enum(['ACCEPT', 'REJECT']),
  rejectionReason: z.string().max(300).optional(),
});

export const verifyCompletionOtpSchema = z.object({
  bookingId: z.string().uuid(),
  otpCode: z.string().length(4, 'Completion OTP must be 4 digits'),
  completionNotes: z.string().max(1000).optional(),
  evidencePhotos: z.array(z.string().url()).max(5).default([]),
});

export const createPaymentOrderSchema = z.object({
  bookingId: z.string().uuid(),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export const verifyPaymentSignatureSchema = z.object({
  bookingId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const acknowledgeCashSchema = z.object({
  bookingId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  actorRole: z.enum(['MECHANIC', 'CUSTOMER']),
});

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  transparencyRating: z.number().int().min(1).max(5).optional(),
});

export const reviewVerificationSchema = z.object({
  mechanicProfileId: z.string().uuid(),
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'SUSPENDED']),
  reasonNotes: z.string().min(5).max(1000),
});

export const manualReassignSchema = z.object({
  bookingId: z.string().uuid(),
  targetMechanicId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});
