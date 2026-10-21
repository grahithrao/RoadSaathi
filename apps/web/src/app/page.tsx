'use client';

import React, { useState } from 'react';
import {
  Wrench,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Truck,
  Zap,
  Disc,
  Thermometer,
  HelpCircle,
  ArrowRight,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Shield,
  CreditCard,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

interface PilotLocation {
  name: string;
  landmark: string;
  lat: number;
  lng: number;
}

const PILOT_LOCATIONS: PilotLocation[] = [
  { name: 'Hampankatta', landmark: 'K.S. Rao Road, City Center', lat: 12.8698, lng: 74.8431 },
  { name: 'Kadri', landmark: 'Near Kadri Temple Road', lat: 12.8858, lng: 74.8560 },
  { name: 'Bejai', landmark: 'Near KSRTC Bus Stand', lat: 12.8833, lng: 74.8475 },
  { name: 'Kankanady', landmark: 'Pumpwell Circle', lat: 12.8617, lng: 74.8623 },
  { name: 'Surathkal', landmark: 'NH-66 Highway, Near NITK', lat: 13.0084, lng: 74.7937 },
  { name: 'Baikampady', landmark: 'Industrial Estate Gate', lat: 12.9467, lng: 74.8130 },
];

const PROBLEMS = [
  { id: 'FLAT_TYRE', label: 'Flat Tyre / Puncture', icon: Disc, baseFee: '₹199' },
  { id: 'BATTERY_ISSUE', label: 'Battery Jumpstart', icon: Zap, baseFee: '₹249' },
  { id: 'VEHICLE_NOT_STARTING', label: 'Not Starting', icon: AlertTriangle, baseFee: '₹299' },
  { id: 'OVERHEATING', label: 'Engine Overheating', icon: Thermometer, baseFee: '₹349' },
  { id: 'MINOR_MECHANICAL', label: 'Minor Mechanical', icon: Wrench, baseFee: '₹299' },
  { id: 'TOWING', label: 'Towing & Recovery', icon: Truck, baseFee: '₹999' },
  { id: 'NOT_SURE', label: 'Not Sure (Inspection)', icon: HelpCircle, baseFee: '₹299' },
];

export default function HomePage() {
  const [selectedProblem, setSelectedProblem] = useState('FLAT_TYRE');
  const [selectedLocation, setSelectedLocation] = useState(PILOT_LOCATIONS[0]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [activePolicyModal, setActivePolicyModal] = useState<string | null>(null);
  const [bookedProvider, setBookedProvider] = useState<any | null>(null);

  // Search nearby mechanics
  const handleSearch = async () => {
    setSearchLoading(true);
    setSearchResults(null);
    setBookedProvider(null);

    try {
      const response = await fetch(
        `http://localhost:3300/api/discovery/search?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lng}&problemCategory=${selectedProblem}&radiusKm=15`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.providers || []);
      } else {
        // Fallback demo results if API port is different
        setSearchResults([
          {
            fullName: 'Ramesh Poojary',
            businessName: 'Ramesh Auto Electric & Mobile Care',
            providerType: 'WORKSHOP_WITH_MOBILE',
            workshopAddress: 'Near Kadri Temple Road, Kadri, Mangaluru',
            straightLineDistanceKm: 2.1,
            roadDistanceKm: 2.8,
            totalEtaMinutes: 18,
            baseVisitFeePaise: 24900,
            ratingAverage: 4.8,
            ratingCount: 38,
            isVerified: true,
            pricingBreakdown: {
              baseVisitFeePaise: 24900,
              distanceSurchargePaise: 0,
              platformFeePaise: 4900,
              taxPaise: 5364,
              totalVisitFeePaise: 35164,
            },
          },
          {
            fullName: 'Kiran D Souza',
            businessName: 'Coastal Tyre & Quick Puncture Works',
            providerType: 'INDIVIDUAL_MOBILE',
            workshopAddress: 'K.S. Rao Road, Hampankatta, Mangaluru',
            straightLineDistanceKm: 0.8,
            roadDistanceKm: 1.1,
            totalEtaMinutes: 12,
            baseVisitFeePaise: 19900,
            ratingAverage: 4.7,
            ratingCount: 22,
            isVerified: true,
            pricingBreakdown: {
              baseVisitFeePaise: 19900,
              distanceSurchargePaise: 0,
              platformFeePaise: 4900,
              taxPaise: 4464,
              totalVisitFeePaise: 29264,
            },
          },
        ]);
      }
    } catch {
      // Local fallback
      setSearchResults([
        {
          fullName: 'Ramesh Poojary',
          businessName: 'Ramesh Auto Electric & Mobile Care',
          providerType: 'WORKSHOP_WITH_MOBILE',
          workshopAddress: 'Near Kadri Temple Road, Kadri, Mangaluru',
          straightLineDistanceKm: 2.1,
          roadDistanceKm: 2.8,
          totalEtaMinutes: 18,
          baseVisitFeePaise: 24900,
          ratingAverage: 4.8,
          ratingCount: 38,
          isVerified: true,
          pricingBreakdown: {
            baseVisitFeePaise: 24900,
            distanceSurchargePaise: 0,
            platformFeePaise: 4900,
            taxPaise: 5364,
            totalVisitFeePaise: 35164,
          },
        },
      ]);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5FAFF]">
      {/* Top Banner: Pilot Notice */}
      <div className="bg-[#2563EB] px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        <span>🇮🇳 Active Pilot: Mangaluru & Coastal Karnataka. Live pilot dataset with verified local mechanics.</span>
        <span className="ml-2 underline font-semibold">Demo Mode Enabled</span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-md shadow-blue-500/20">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#0F172A]">Road<span className="text-[#2563EB]">Saathi</span></span>
              <p className="hidden text-[10px] font-medium text-[#475569] sm:block">Local mechanics. Reliable roadside help.</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#475569] md:flex">
            <a href="#breakdown" className="text-[#0F172A] hover:text-[#2563EB]">Emergency Help</a>
            <a href="#how-it-works" className="hover:text-[#2563EB]">How it Works</a>
            <a href="#services" className="hover:text-[#2563EB]">Pricing & Services</a>
            <a href="#mechanics" className="hover:text-[#2563EB]">For Mechanics</a>
            <Link href="/admin" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-slate-200">
              Admin Ops
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="tel:1800000000"
              className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Pilot Helpline</span>
            </a>
            <Link
              href="/admin"
              className="md:hidden rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Urgent Breakdown Hero */}
        <section id="breakdown" className="relative overflow-hidden py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#2563EB] mb-4">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero Hidden Charges • Itemized Approval • Verified Local Garages</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl">
                Stranded on the road? <br className="hidden sm:inline" />
                <span className="text-[#2563EB]">Help is minutes away.</span>
              </h1>
              <p className="mt-3 text-base text-[#475569] sm:text-lg">
                Connect directly with nearby independent mechanics, mobile puncture shops, battery specialists, and towing fleets across Mangaluru.
              </p>
            </div>

            {/* Interactive Assistance Console */}
            <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xl shadow-blue-500/5">
              <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-xs text-white">1</span>
                Select What Happened
              </h2>

              {/* Problem Grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 mb-6">
                {PROBLEMS.map((prob) => {
                  const Icon = prob.icon;
                  const isSelected = selectedProblem === prob.id;
                  return (
                    <button
                      key={prob.id}
                      type="button"
                      onClick={() => setSelectedProblem(prob.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#2563EB] bg-[#DBEAFE]/40 text-[#2563EB] ring-2 ring-[#2563EB]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-2 ${isSelected ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                      <span className="text-xs font-semibold text-[#0F172A]">{prob.label}</span>
                      <span className="text-[10px] text-[#475569] mt-0.5">from {prob.baseFee}</span>
                    </button>
                  );
                })}
              </div>

              {/* Location Selector */}
              <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-xs text-white">2</span>
                Confirm Breakdown Location (Mangaluru Pilot)
              </h2>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-6">
                {PILOT_LOCATIONS.map((loc) => {
                  const isSelected = selectedLocation.name === loc.name;
                  return (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => setSelectedLocation(loc)}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#2563EB] bg-[#DBEAFE]/40 text-[#2563EB] ring-2 ring-[#2563EB]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0F172A]">
                        <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                        <span>{loc.name}</span>
                      </div>
                      <span className="text-[11px] text-[#475569] mt-1 truncate">{loc.landmark}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Button */}
              <button
                type="button"
                onClick={handleSearch}
                disabled={searchLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
              >
                {searchLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Checking verified mechanics within 10 km...
                  </span>
                ) : (
                  <>
                    <span>Find Available Roadside Help</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Search Results Display */}
              {searchResults && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{searchResults.length} Verified Providers Available Near {selectedLocation.name}</span>
                    </h3>
                    <span className="text-xs text-slate-500">Sorted by Suitability & Road ETA</span>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <p className="text-sm font-medium text-amber-800">
                        No roadside mechanics currently online within this immediate radius for this service.
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Try selecting Surathkal or Kadri, or call our 24x7 pilot helpline for manual dispatch.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map((provider, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#0F172A]">{provider.businessName}</h4>
                              {provider.isVerified && (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                  <ShieldCheck className="h-3 w-3" /> Verified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#475569] mt-0.5">{provider.fullName} • {provider.workshopAddress}</p>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#475569]">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                ETA: {provider.totalEtaMinutes} mins
                              </span>
                              <span>•</span>
                              <span>
                                {provider.roadDistanceKm} km road distance ({provider.straightLineDistanceKm} km line)
                              </span>
                              <span>•</span>
                              <span className="text-amber-600 font-medium">★ {provider.ratingAverage} ({provider.ratingCount} reviews)</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <span className="text-xs text-slate-500 block">Disclosed Visit Fee</span>
                              <span className="text-base font-bold text-[#0F172A]">
                                ₹{provider.pricingBreakdown?.totalVisitFeePaise ? Math.round(provider.pricingBreakdown.totalVisitFeePaise / 100) : 299}
                              </span>
                              <span className="text-[10px] text-slate-400 block">incl. 18% GST & ₹49 platform fee</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setBookedProvider(provider)}
                              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Booking Confirmation Simulation */}
                  {bookedProvider && (
                    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span>Booking Request Dispatched to {bookedProvider.businessName}!</span>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1">
                        Arrival Verification Code: <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-emerald-300">4821</span>. 
                        Do NOT share this code with the mechanic until they arrive in person at {selectedLocation.name}.
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs font-medium text-emerald-800">Status: Mechanic En Route (ETA {bookedProvider.totalEtaMinutes}m)</span>
                        <Link href="/admin" className="text-xs font-semibold text-blue-700 underline">
                          View in Admin Monitor
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">How RoadSaathi Works</h2>
              <p className="mt-2 text-sm text-[#475569]">Designed for clarity and safety during an unexpected breakdown.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="rounded-xl border border-slate-200 p-5 bg-[#F5FAFF]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold mb-4">1</div>
                <h3 className="text-sm font-bold text-[#0F172A]">Report & Confirm Pin</h3>
                <p className="text-xs text-[#475569] mt-2">
                  Select your vehicle type and issue. Confirm your breakdown pin or choose a nearby landmark.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-[#F5FAFF]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold mb-4">2</div>
                <h3 className="text-sm font-bold text-[#0F172A]">Compare Disclosed Rates</h3>
                <p className="text-xs text-[#475569] mt-2">
                  See the exact visit fee, road distance, and real ETA. No inflated emergency surge pricing.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-[#F5FAFF]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold mb-4">3</div>
                <h3 className="text-sm font-bold text-[#0F172A]">Track with Arrival Code</h3>
                <p className="text-xs text-[#475569] mt-2">
                  Track the assigned mechanic live. The mechanic must verify your 4-digit arrival code before starting work.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-[#F5FAFF]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold mb-4">4</div>
                <h3 className="text-sm font-bold text-[#0F172A]">Approve Quote & Pay</h3>
                <p className="text-xs text-[#475569] mt-2">
                  Review itemized repair quotes. Pay via UPI, Card, or Cash on completion with reconciled ledger receipts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Transparency & Rules */}
        <section id="services" className="border-t border-slate-200 py-16 bg-[#F5FAFF]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Transparent Pricing Architecture</h2>
              <p className="mt-2 text-sm text-[#475569]">
                Every rupee is disclosed upfront in integer paise. No surprise charges after the mechanic arrives.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-[#0F172A]">Visit & Diagnosis Fee</h3>
                </div>
                <p className="text-xs text-[#475569]">
                  Covers the mechanic traveling to your breakdown location, tools inspection, and initial fault diagnosis. Includes up to 3 km of travel.
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-700">Diagnosis Credit:</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    If you approve a repair quote, your visit fee is credited directly towards the labor charge.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-[#0F172A]">Itemized Repair Quotes</h3>
                </div>
                <p className="text-xs text-[#475569]">
                  Parts and labor are listed separately with unit prices and quantities. No additional charges can be added without your explicit in-app approval.
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-700">Versioned Approvals:</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    If a repair scope changes, a new quote version is generated. You retain full control to accept or reject.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-[#0F172A]">Secure Payment Modes</h3>
                </div>
                <p className="text-xs text-[#475569]">
                  Pay after service completion via UPI, Debit/Credit Card, or Netbanking powered by Razorpay, or choose Cash on Completion.
                </p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-700">Cash Reconciliation:</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cash payments require both mechanic and customer confirmation before the ledger invoice settles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Mechanics & Garages */}
        <section id="mechanics" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#2563EB] mb-3">
                  Join the Network
                </span>
                <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
                  Empowering Independent Mechanics & Small Garages
                </h2>
                <p className="mt-3 text-sm text-[#475569]">
                  RoadSaathi gives local mechanics a digital identity, guaranteed customers within their operating radius, and transparent earnings without middleman exploitation.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A]">Resumable Simple Onboarding</h4>
                      <p className="text-[11px] text-slate-500">Phone OTP signup, trade license or Aadhaar/PAN, and declare your skills in English, Kannada, or Hindi.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A]">Choose Roadside vs Workshop-Only</h4>
                      <p className="text-[11px] text-slate-500">If you don't travel to breakdowns, declare yourself as workshop-only so customers can visit you directly without dispatch confusion.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A]">Honest 15% Platform Commission</h4>
                      <p className="text-[11px] text-slate-500">Commission applies strictly to labor and visit fees, never on physical spare parts. Keep 100% of parts value.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <Link
                    href="/admin"
                    className="rounded-xl bg-[#2563EB] px-5 py-3 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
                  >
                    View Verification Queue (Admin)
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#F5FAFF] p-6 shadow-inner">
                <h3 className="text-sm font-bold text-[#0F172A] mb-3">Live Pilot Mechanics in Mangaluru:</h3>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">Ramesh Auto Electric & Mobile Care</h4>
                        <p className="text-[11px] text-slate-500">Kadri Temple Road • 12 km radius • 4.8 ★</p>
                      </div>
                      <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">Online</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">Kudla 24x7 Towing Fleet</h4>
                        <p className="text-[11px] text-slate-500">Pumpwell, Kankanady • 25 km radius • 4.9 ★</p>
                      </div>
                      <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">Online</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">Mangalore Precision Workshop</h4>
                        <p className="text-[11px] text-slate-500">Baikampady Industrial Estate • Workshop Only</p>
                      </div>
                      <span className="rounded bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5">Workshop Visit Only</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
            <div>
              <h4 className="font-bold text-[#0F172A] mb-3">RoadSaathi India</h4>
              <p className="text-[#475569] leading-relaxed">
                Empowering independent local mechanics and providing reliable breakdown assistance across India.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#0F172A] mb-3">Pilot Hub</h4>
              <p className="text-[#475569]">Hampankatta, Kadri, Bejai, Surathkal, Kankanady, Baikampady</p>
              <p className="text-[#475569] mt-1">Mangaluru, Karnataka 575001</p>
            </div>

            <div>
              <h4 className="font-bold text-[#0F172A] mb-3">Legal & Grievance</h4>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <button type="button" onClick={() => setActivePolicyModal('privacy')} className="hover:text-blue-600">
                    Privacy Policy (DPDP 2023)
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setActivePolicyModal('terms')} className="hover:text-blue-600">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setActivePolicyModal('refund')} className="hover:text-blue-600">
                    Cancellation & Refund Policy
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setActivePolicyModal('grievance')} className="hover:text-blue-600">
                    Grievance Redressal Officer
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0F172A] mb-3">System Access</h4>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <Link href="/admin" className="text-blue-600 font-medium hover:underline">
                    Admin & Field Operations Portal
                  </Link>
                </li>
                <li>
                  <a href="http://localhost:3300/api/docs" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-blue-600">
                    OpenAPI Documentation
                  </a>
                </li>
                <li>
                  <span className="text-slate-400">Mobile Build: Expo Dev Client</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <p>© {new Date().getFullYear()} RoadSaathi. All rights reserved.</p>
            <p>Demo Mode: Mangaluru Pilot. Fictional provider profiles for simulation only.</p>
          </div>
        </div>
      </footer>

      {/* Policy Modal */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-[#0F172A]">
                {activePolicyModal === 'privacy' && 'Privacy Policy (India DPDP Act)'}
                {activePolicyModal === 'terms' && 'Terms of Service'}
                {activePolicyModal === 'refund' && 'Cancellation & Refund Policy'}
                {activePolicyModal === 'grievance' && 'Grievance Redressal Mechanism'}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 max-h-80 overflow-y-auto">
              {activePolicyModal === 'privacy' && (
                <>
                  <p>RoadSaathi collects location data solely for calculating route estimates and dispatching the nearest verified technician.</p>
                  <p>Customer coordinates are disclosed exclusively to the assigned mechanic after assignment acceptance, and customer-facing tracking ceases immediately upon service completion or cancellation.</p>
                  <p>No location data is sold or shared with third-party advertisers. Users may request account deletion and data scrubbing under Section 12 of the DPDP Act 2023.</p>
                </>
              )}
              {activePolicyModal === 'terms' && (
                <>
                  <p>RoadSaathi acts as a technology intermediary connecting stranded motorists with independent mechanics and workshops.</p>
                  <p>Mechanics operate as independent service providers. All repair quotes require explicit customer approval prior to work commencement.</p>
                  <p>Arrival and completion codes must be shared strictly in person with the mechanic.</p>
                </>
              )}
              {activePolicyModal === 'refund' && (
                <>
                  <p>If a customer cancels before a mechanic has been assigned or en route, 100% of the visit fee is refunded.</p>
                  <p>If cancellation occurs after the mechanic has arrived, a nominal visit fee is retained to compensate the mechanic for travel and time.</p>
                  <p>Disputed payments are reviewed within 48 hours by our Field Operations Finance desk.</p>
                </>
              )}
              {activePolicyModal === 'grievance' && (
                <>
                  <p><strong>Grievance Redressal Officer:</strong> Mr. Ganesh Pai</p>
                  <p><strong>Designation:</strong> Lead, Field Operations & Consumer Grievances (Karnataka Region)</p>
                  <p><strong>Email:</strong> grievance@roadsaathi.in | support@roadsaathi.in</p>
                  <p><strong>Address:</strong> RoadSaathi Pilot Hub, K.S. Rao Road, Mangaluru, Karnataka 575001</p>
                </>
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
