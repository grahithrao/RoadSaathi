import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors.js';
import { useRole } from '../../app/_layout.js';

interface ProviderCard {
  id: string;
  name: string;
  business: string;
  distanceKm: number;
  etaMins: number;
  visitFeeInr: number;
  rating: number;
}

export function CustomerNavigator() {
  const { setRole, language, setLanguage } = useRole();
  const [activeTab, setActiveTab] = useState<'HOME' | 'BOOKINGS' | 'VEHICLES' | 'PROFILE'>('HOME');

  // Breakdown state
  const [selectedProblem, setSelectedProblem] = useState('FLAT_TYRE');
  const [selectedLandmark, setSelectedLandmark] = useState('Kadri Temple Road');
  const [activeBooking, setActiveBooking] = useState<any | null>({
    bookingNumber: 'RS-2026-482109',
    status: 'EN_ROUTE',
    mechanicName: 'Ramesh Poojary',
    businessName: 'Ramesh Auto Electric & Mobile Care',
    phone: '+919800000001',
    etaMinutes: 14,
    arrivalCode: '4821',
    problem: 'Flat Tyre & Puncture Repair',
    vehicle: 'Hyundai Creta SX (KA19MD4521)',
    visitFeeInr: 299,
    quote: {
      version: 1,
      status: 'PRESENTED',
      laborFee: 150,
      partsFee: 200,
      diagnosisCredit: 100,
      totalPayable: 295,
      items: [
        { desc: 'Tubeless tyre vulcanized puncture patch', qty: 1, cost: 150 },
        { desc: 'High-pressure brass valve stem pin', qty: 1, cost: 200 },
      ],
    },
  });

  const [quoteApproved, setQuoteApproved] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const problems = [
    { id: 'FLAT_TYRE', label: 'Flat Tyre', fee: '₹199' },
    { id: 'BATTERY_ISSUE', label: 'Battery Jump', fee: '₹249' },
    { id: 'VEHICLE_NOT_STARTING', label: 'Not Starting', fee: '₹299' },
    { id: 'OVERHEATING', label: 'Overheating', fee: '₹349' },
    { id: 'TOWING', label: 'Towing', fee: '₹999' },
    { id: 'NOT_SURE', label: 'Inspection', fee: '₹299' },
  ];

  const landmarks = ['Kadri Temple Road', 'Hampankatta K.S. Rao Rd', 'Bejai KSRTC Stand', 'Surathkal NH-66'];

  const nearbyProviders: ProviderCard[] = [
    {
      id: 'p-1',
      name: 'Ramesh Poojary',
      business: 'Ramesh Auto Electric & Mobile Care',
      distanceKm: 2.8,
      etaMins: 14,
      visitFeeInr: 299,
      rating: 4.8,
    },
    {
      id: 'p-2',
      name: 'Kiran D Souza',
      business: 'Coastal Tyre & Quick Puncture Works',
      distanceKm: 1.1,
      etaMins: 10,
      visitFeeInr: 199,
      rating: 4.7,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Road<Text style={{ color: colors.primary }}>Saathi</Text></Text>
          <Text style={styles.subTitle}>Customer Mode • Mangaluru</Text>
        </View>

        <TouchableOpacity
          style={styles.roleSwitchButton}
          onPress={() => setRole('MECHANIC')}
        >
          <Text style={styles.roleSwitchText}>Switch to Mechanic 🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* TAB 1: HOME (BREAKDOWN ASSISTANCE) */}
        {activeTab === 'HOME' && (
          <View>
            <View style={styles.urgentBanner}>
              <Text style={styles.urgentBannerTitle}>🚨 Vehicle Breakdown Assistance</Text>
              <Text style={styles.urgentBannerText}>Transparent pricing • Genuine verified local mechanics</Text>
            </View>

            {/* Step 1: Select Problem */}
            <Text style={styles.sectionHeader}>1. Select Your Issue</Text>
            <View style={styles.gridContainer}>
              {problems.map((p) => {
                const isSelected = selectedProblem === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProblem(p.id)}
                    style={[styles.problemCard, isSelected && styles.problemCardSelected]}
                  >
                    <Text style={[styles.problemLabel, isSelected && styles.problemLabelSelected]}>{p.label}</Text>
                    <Text style={styles.problemFee}>from {p.fee}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 2: Location */}
            <Text style={styles.sectionHeader}>2. Confirm Breakdown Location</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {landmarks.map((lm) => {
                const isSelected = selectedLandmark === lm;
                return (
                  <TouchableOpacity
                    key={lm}
                    onPress={() => setSelectedLandmark(lm)}
                    style={[styles.landmarkChip, isSelected && styles.landmarkChipSelected]}
                  >
                    <Text style={[styles.landmarkText, isSelected && styles.landmarkTextSelected]}>📍 {lm}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Step 3: Verified Mechanics Nearby */}
            <Text style={styles.sectionHeader}>3. Available Mobile Mechanics (Ranked by ETA)</Text>
            {nearbyProviders.map((prov) => (
              <View key={prov.id} style={styles.providerCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.providerBusiness}>{prov.business}</Text>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.providerName}>{prov.name}</Text>
                  <Text style={styles.providerMeta}>
                    ⏱️ ETA: {prov.etaMins} mins • 🛣️ {prov.distanceKm} km road • ★ {prov.rating}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.feeLabel}>Disclosed Fee</Text>
                  <Text style={styles.feeAmount}>₹{prov.visitFeeInr}</Text>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => {
                      setActiveBooking({
                        ...activeBooking,
                        mechanicName: prov.name,
                        businessName: prov.business,
                        visitFeeInr: prov.visitFeeInr,
                        etaMinutes: prov.etaMins,
                      });
                      setActiveTab('BOOKINGS');
                    }}
                  >
                    <Text style={styles.bookButtonText}>Book Help</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: ACTIVE BOOKINGS & TIMELINE */}
        {activeTab === 'BOOKINGS' && (
          <View>
            {activeBooking ? (
              <View style={styles.activeBookingCard}>
                <View style={styles.bookingCardHeader}>
                  <Text style={styles.bookingNumber}>{activeBooking.bookingNumber}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{activeBooking.status}</Text>
                  </View>
                </View>

                {/* SECRET ARRIVAL CODE NOTICE */}
                <View style={styles.arrivalCodeBox}>
                  <Text style={styles.arrivalCodeTitle}>SECRET ARRIVAL VERIFICATION CODE</Text>
                  <Text style={styles.arrivalCodeNumber}>{activeBooking.arrivalCode}</Text>
                  <Text style={styles.arrivalCodeWarning}>
                    ⚠️ Share this 4-digit code ONLY when your mechanic arrives at your vehicle in person.
                  </Text>
                </View>

                {/* Mechanic Details */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Assigned Mechanic:</Text>
                  <Text style={styles.detailValue}>{activeBooking.mechanicName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Workshop:</Text>
                  <Text style={styles.detailValue}>{activeBooking.businessName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estimated Arrival:</Text>
                  <Text style={styles.detailValue}>{activeBooking.etaMinutes} minutes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Disclosed Visit Fee:</Text>
                  <Text style={styles.detailValue}>₹{activeBooking.visitFeeInr}</Text>
                </View>

                {/* REPAIR QUOTE APPROVAL SHEET */}
                {activeBooking.quote && (
                  <View style={styles.quoteBox}>
                    <Text style={styles.quoteTitle}>Itemized Repair Quote (v{activeBooking.quote.version})</Text>
                    {activeBooking.quote.items.map((item: any, i: number) => (
                      <View key={i} style={styles.quoteItemRow}>
                        <Text style={styles.quoteItemDesc}>• {item.desc}</Text>
                        <Text style={styles.quoteItemCost}>₹{item.cost}</Text>
                      </View>
                    ))}

                    <View style={styles.quoteItemRow}>
                      <Text style={{ color: colors.success, fontSize: 11 }}>• Diagnosis Fee Credit Applied</Text>
                      <Text style={{ color: colors.success, fontSize: 11 }}>-₹{activeBooking.quote.diagnosisCredit}</Text>
                    </View>

                    <View style={[styles.quoteItemRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 4, marginTop: 4 }]}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: colors.text }}>Total Payable:</Text>
                      <Text style={{ fontWeight: 'bold', fontSize: 14, color: colors.primary }}>₹{activeBooking.quote.totalPayable}</Text>
                    </View>

                    {!quoteApproved ? (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={[styles.quoteButton, { backgroundColor: colors.danger }]}
                          onPress={() => Alert.alert('Quote Rejected', 'Mechanic will finish with diagnosis-only.')}
                        >
                          <Text style={styles.quoteButtonText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.quoteButton, { backgroundColor: colors.success, flex: 2 }]}
                          onPress={() => {
                            setQuoteApproved(true);
                            Alert.alert('Quote Approved', 'Repair authorized. Work in progress.');
                          }}
                        >
                          <Text style={styles.quoteButtonText}>Approve ₹{activeBooking.quote.totalPayable}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ marginTop: 8, backgroundColor: colors.successLight, padding: 8, borderRadius: 6 }}>
                        <Text style={{ color: colors.success, fontSize: 11, fontWeight: 'bold' }}>✓ Quote Approved by Customer</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* PAYMENT BUTTON */}
                <TouchableOpacity
                  style={[styles.payButton, isPaid && { backgroundColor: colors.success }]}
                  onPress={() => {
                    setIsPaid(true);
                    Alert.alert('Payment Successful', '₹295 paid via UPI (Razorpay). Invoice generated.');
                  }}
                >
                  <Text style={styles.payButtonText}>
                    {isPaid ? '✓ Paid ₹295 via UPI' : 'Pay ₹295 (UPI / Card / Cash)'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active breakdown requests.</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: VEHICLES */}
        {activeTab === 'VEHICLES' && (
          <View>
            <Text style={styles.sectionHeader}>Registered Vehicles</Text>
            
            <View style={styles.vehicleCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.vehicleMake}>Hyundai Creta SX(O)</Text>
                <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>
              </View>
              <Text style={styles.vehicleReg}>KA 19 MD 4521 • Petrol • 2022</Text>
            </View>

            <View style={styles.vehicleCard}>
              <Text style={styles.vehicleMake}>Honda Activa 6G</Text>
              <Text style={styles.vehicleReg}>KA 19 EK 8890 • Petrol • 2021</Text>
            </View>

            <TouchableOpacity
              style={styles.addVehicleButton}
              onPress={() => Alert.alert('Add Vehicle', 'Vehicle registration modal opened.')}
            >
              <Text style={styles.addVehicleText}>+ Add Another Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'PROFILE' && (
          <View>
            <Text style={styles.sectionHeader}>Customer Profile</Text>

            <View style={styles.profileCard}>
              <Text style={styles.profileName}>Arjun Kumar</Text>
              <Text style={styles.profilePhone}>+91 98000 00101</Text>
              <Text style={styles.profileSub}>Emergency Contact: +91 98000 00199</Text>
            </View>

            <Text style={styles.sectionHeader}>Language Choice / ಭಾಷೆ / भाषा</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['en', 'hi', 'kn'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLanguage(l)}
                  style={[styles.langButton, language === l && styles.langButtonSelected]}
                >
                  <Text style={[styles.langText, language === l && styles.langTextSelected]}>
                    {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी (Hindi)' : 'ಕನ್ನಡ (Kannada)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.roleSwitchButton, { padding: 12, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center' }]}
              onPress={() => setRole('MECHANIC')}
            >
              <Text style={styles.roleSwitchText}>Switch to Mechanic Onboarding / Dashboard 🔄</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('HOME')}
        >
          <Text style={[styles.tabLabel, activeTab === 'HOME' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('BOOKINGS')}
        >
          <Text style={[styles.tabLabel, activeTab === 'BOOKINGS' && styles.tabLabelActive]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('VEHICLES')}
        >
          <Text style={[styles.tabLabel, activeTab === 'VEHICLES' && styles.tabLabelActive]}>Vehicles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('PROFILE')}
        >
          <Text style={[styles.tabLabel, activeTab === 'PROFILE' && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subTitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  roleSwitchButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleSwitchText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  urgentBanner: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  urgentBannerTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  urgentBannerText: {
    color: colors.white,
    fontSize: 11,
    opacity: 0.9,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  problemCard: {
    width: '31%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  problemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  problemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  problemLabelSelected: {
    color: colors.primary,
  },
  problemFee: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  landmarkChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  landmarkChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  landmarkText: {
    fontSize: 11,
    color: colors.text,
  },
  landmarkTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerBusiness: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  verifiedBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  providerName: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  providerMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  feeLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  bookButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  activeBookingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  arrivalCodeBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  arrivalCodeTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  arrivalCodeNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 4,
    marginVertical: 4,
  },
  arrivalCodeWarning: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  quoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  quoteItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  quoteItemDesc: {
    fontSize: 10,
    color: colors.textMuted,
  },
  quoteItemCost: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  quoteButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  quoteButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  payButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  vehicleCard: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  vehicleMake: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  vehicleReg: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '700',
  },
  addVehicleButton: {
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  addVehicleText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  profileCard: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  profilePhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  langButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  langButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langText: {
    fontSize: 10,
    color: colors.text,
  },
  langTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
