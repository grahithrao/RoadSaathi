/**
 * Pricing math engine for RoadSaathi
 * All monetary amounts are represented as integer paise (1 INR = 100 paise).
 * Floating point arithmetic is strictly avoided for financial figures.
 */

export interface PricingConfig {
  defaultPlatformFeePaise: number; // e.g. 4900 = ₹49
  defaultTaxRatePercent: number;    // e.g. 18 for 18% GST
  freeRadiusMeters: number;         // e.g. 3000 (3 km included in visit fee)
  distanceSurchargePerKmPaise: number; // e.g. 2000 = ₹20 per additional km
  defaultCommissionPercent: number; // e.g. 15 for 15%
  diagnosisCreditedTowardsRepair: boolean; // default: true
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  defaultPlatformFeePaise: 4900,
  defaultTaxRatePercent: 18,
  freeRadiusMeters: 3000,
  distanceSurchargePerKmPaise: 2000,
  defaultCommissionPercent: 15,
  diagnosisCreditedTowardsRepair: true,
};

export interface VisitPricingInput {
  baseVisitFeePaise: number;
  roadDistanceMeters: number;
  config?: Partial<PricingConfig>;
}

export interface VisitPricingBreakdown {
  baseVisitFeePaise: number;
  distanceSurchargePaise: number;
  platformFeePaise: number;
  taxPaise: number;
  totalVisitFeePaise: number;
  diagnosisCreditedTowardsRepair: boolean;
  currency: 'INR';
}

export function calculateVisitPricing(input: VisitPricingInput): VisitPricingBreakdown {
  const cfg = { ...DEFAULT_PRICING_CONFIG, ...input.config };
  
  let distanceSurchargePaise = 0;
  if (input.roadDistanceMeters > cfg.freeRadiusMeters) {
    const extraMeters = input.roadDistanceMeters - cfg.freeRadiusMeters;
    const extraKm = Math.ceil(extraMeters / 1000);
    distanceSurchargePaise = extraKm * cfg.distanceSurchargePerKmPaise;
  }

  const taxableSubtotal = input.baseVisitFeePaise + distanceSurchargePaise + cfg.defaultPlatformFeePaise;
  // Standard 18% GST integer rounding
  const taxPaise = Math.round((taxableSubtotal * cfg.defaultTaxRatePercent) / 100);
  const totalVisitFeePaise = taxableSubtotal + taxPaise;

  return {
    baseVisitFeePaise: Math.round(input.baseVisitFeePaise),
    distanceSurchargePaise,
    platformFeePaise: cfg.defaultPlatformFeePaise,
    taxPaise,
    totalVisitFeePaise,
    diagnosisCreditedTowardsRepair: cfg.diagnosisCreditedTowardsRepair,
    currency: 'INR',
  };
}

export interface QuoteItemInput {
  type: 'LABOR' | 'PART' | 'OTHER';
  description: string;
  quantity: number;
  unitPricePaise: number;
}

export interface QuoteCalculationInput {
  items: QuoteItemInput[];
  alreadyPaidVisitFeePaise?: number; // if credit applies
  creditDiagnosisFee?: boolean;
  taxRatePercent?: number;
}

export interface QuoteCalculationBreakdown {
  laborSubtotalPaise: number;
  partsSubtotalPaise: number;
  grossSubtotalPaise: number;
  diagnosisCreditPaise: number;
  taxableAmountPaise: number;
  taxPaise: number;
  netPayablePaise: number;
  items: Array<QuoteItemInput & { totalPaise: number }>;
}

export function calculateQuoteBreakdown(input: QuoteCalculationInput): QuoteCalculationBreakdown {
  let laborSubtotalPaise = 0;
  let partsSubtotalPaise = 0;

  const processedItems = input.items.map((item) => {
    const totalPaise = Math.round(item.quantity * item.unitPricePaise);
    if (item.type === 'LABOR') {
      laborSubtotalPaise += totalPaise;
    } else {
      partsSubtotalPaise += totalPaise;
    }
    return {
      ...item,
      totalPaise,
    };
  });

  const grossSubtotalPaise = laborSubtotalPaise + partsSubtotalPaise;
  
  let diagnosisCreditPaise = 0;
  if (input.creditDiagnosisFee && input.alreadyPaidVisitFeePaise) {
    // Diagnosis credit cannot exceed labor subtotal
    diagnosisCreditPaise = Math.min(input.alreadyPaidVisitFeePaise, laborSubtotalPaise);
  }

  const taxableAmountPaise = Math.max(0, grossSubtotalPaise - diagnosisCreditPaise);
  const taxRate = input.taxRatePercent ?? DEFAULT_PRICING_CONFIG.defaultTaxRatePercent;
  const taxPaise = Math.round((taxableAmountPaise * taxRate) / 100);
  const netPayablePaise = taxableAmountPaise + taxPaise;

  return {
    laborSubtotalPaise,
    partsSubtotalPaise,
    grossSubtotalPaise,
    diagnosisCreditPaise,
    taxableAmountPaise,
    taxPaise,
    netPayablePaise,
    items: processedItems,
  };
}

export interface CommissionCalculationInput {
  totalPaidPaise: number;
  laborAndVisitPaise: number;
  commissionPercent?: number;
}

export interface CommissionBreakdown {
  platformCommissionPaise: number;
  mechanicNetEarningsPaise: number;
}

export function calculateCommission(input: CommissionCalculationInput): CommissionBreakdown {
  const percent = input.commissionPercent ?? DEFAULT_PRICING_CONFIG.defaultCommissionPercent;
  // Commission applies only to service/labor/visit component, not physical spare parts
  const platformCommissionPaise = Math.round((input.laborAndVisitPaise * percent) / 100);
  const mechanicNetEarningsPaise = Math.max(0, input.totalPaidPaise - platformCommissionPaise);

  return {
    platformCommissionPaise,
    mechanicNetEarningsPaise,
  };
}

export function formatPaiseToInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}
