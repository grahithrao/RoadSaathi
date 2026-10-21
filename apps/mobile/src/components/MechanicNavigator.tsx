import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { colors } from '../theme/colors.js';
import { useRole } from '../../app/_layout.js';

export function MechanicNavigator() {
  const { setRole } = useRole();
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'ACTIVE_JOB' | 'EARNINGS' | 'PROFILE'>('REQUESTS');

  const [isOnline, setIsOnline] = useState(true);
  const [isRoadsideReady, setIsRoadsideReady] = useState(true);

  // Incoming offer state
  const [offers, setOffers] = useState([
    {
      id: 'offer-1',
      bookingId: 'RS-2026-992144',
      problem: 'Flat Tyre & Puncture Repair',
      vehicle: 'Hyundai Creta (Petrol)',
      approxArea: 'Near Kadri Park, Mangaluru',
      roadDistanceKm: 2.4,
      visitFeeInr: 299,
      expectedEarningsInr: 254, // 85%
      countdownSeconds: 48,
    },
  ]);

  // Active Job State
  const [activeJob, setActiveJob] = useState<any | null>({
    bookingNumber: 'RS-2026-482109',
    status: 'ASSIGNED',
    customerName: 'Arjun Kumar',
    customerPhone: '+919800000101',
    customerAddress: 'Flat 302, Green Valley Apts, Kadri Temple Road, Mangaluru',
    problem: 'Flat Tyre & Puncture Repair',
    vehicle: 'Hyundai Creta SX (KA19MD4521)',
    visitFeeInr: 299,
  });

  const [arrivalInputOtp, setArrivalInputOtp] = useState('');
  const [completionInputOtp, setCompletionInputOtp] = useState('');
  const [quoteItems, setQuoteItems] = useState([
    { desc: 'Tubeless tyre puncture vulcanizing', cost: '150' },
    { desc: 'High pressure brass valve', cost: '200' },
  ]);

  const handleAcceptOffer = (offer: any) => {
    setActiveJob({
      bookingNumber: offer.bookingId,
      status: 'ASSIGNED',
      customerName: 'Arjun Kumar',
      customerPhone: '+919800000101',
      customerAddress: 'Kadri Temple Road, Mangaluru',
      problem: offer.problem,
      vehicle: offer.vehicle,
      visitFeeInr: offer.visitFeeInr,
    });
    setOffers([]);
    setActiveTab('ACTIVE_JOB');
    Alert.alert('Job Accepted', 'You are now assigned. Customer notified.');
  };

  const handleDeclineOffer = (offerId: string) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
    Alert.alert('Offer Declined', 'Offer dismissed.');
  };

  const handleVerifyArrival = () => {
    if (arrivalInputOtp === '4821' || arrivalInputOtp.length === 4) {
      setActiveJob({ ...activeJob, status: 'DIAGNOSING' });
      Alert.alert('Arrival Code Verified', 'You have arrived. Proceed with diagnosis.');
    } else {
      Alert.alert('Invalid Code', 'Please ask the customer for their 4-digit arrival code.');
    }
  };

  const handleVerifyCompletion = () => {
    if (completionInputOtp.length === 4) {
      setActiveJob({ ...activeJob, status: 'COMPLETED' });
      Alert.alert('Job Completed!', 'Service completed. Capacity released. Commission recorded in ledger.');
    } else {
      Alert.alert('Invalid Code', 'Please enter the 4-digit completion code provided by the customer.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Road<Text style={{ color: colors.primary }}>Saathi</Text> Pro</Text>
          <Text style={styles.subTitle}>Ramesh Auto Electric & Mobile Care (Kadri)</Text>
        </View>

        <TouchableOpacity
          style={styles.roleSwitchButton}
          onPress={() => setRole('CUSTOMER')}
        >
          <Text style={styles.roleSwitchText}>Switch to Driver 🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Online/Offline Status Banner */}
      <View style={[styles.statusBanner, isOnline ? styles.statusBannerOnline : styles.statusBannerOffline]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.dot, isOnline ? { backgroundColor: colors.success } : { backgroundColor: colors.danger }]} />
          <Text style={styles.statusBannerText}>
            {isOnline ? 'ONLINE • Receiving Roadside Jobs' : 'OFFLINE • Not available for dispatch'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsOnline(!isOnline)}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleButtonText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* TAB 1: REQUESTS */}
        {activeTab === 'REQUESTS' && (
          <View>
            <Text style={styles.sectionHeader}>Incoming Breakdown Requests</Text>

            {offers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending offers right now</Text>
                <Text style={styles.emptySubtitle}>Keep your status online. Nearest breakdown offers will appear here.</Text>
              </View>
            ) : (
              offers.map((offer) => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerCardHeader}>
                    <Text style={styles.offerTimer}>⏳ {offer.countdownSeconds}s remaining to accept</Text>
                    <Text style={styles.offerDistance}>📍 {offer.roadDistanceKm} km road</Text>
                  </View>

                  <Text style={styles.offerProblem}>{offer.problem}</Text>
                  <Text style={styles.offerVehicle}>{offer.vehicle}</Text>
                  <Text style={styles.offerArea}>Near {offer.approxArea}</Text>

                  <View style={styles.offerEarningsRow}>
                    <View>
                      <Text style={styles.offerFeeLabel}>Customer Visit Fee</Text>
                      <Text style={styles.offerFeeValue}>₹{offer.visitFeeInr}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.offerFeeLabel}>Your Expected Earnings (85%)</Text>
                      <Text style={styles.offerEarningsValue}>₹{offer.expectedEarningsInr}</Text>
                    </View>
                  </View>

                  <View style={styles.offerActionsRow}>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleDeclineOffer(offer.id)}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptOffer(offer)}
                    >
                      <Text style={styles.acceptButtonText}>Accept Job (₹{offer.expectedEarningsInr})</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: ACTIVE JOB */}
        {activeTab === 'ACTIVE_JOB' && (
          <View>
            {activeJob ? (
              <View style={styles.jobCard}>
                <View style={styles.jobCardHeader}>
                  <Text style={styles.jobNumber}>{activeJob.bookingNumber}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{activeJob.status}</Text>
                  </View>
                </View>

                {/* Customer Precise Address (revealed after acceptance) */}
                <View style={styles.locationBox}>
                  <Text style={styles.locationTitle}>📍 Breakdown Location</Text>
                  <Text style={styles.locationAddress}>{activeJob.customerAddress}</Text>
                  
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(activeJob.customerAddress)}`)}
                  >
                    <Text style={styles.navButtonText}>Open in Google Maps Navigation ↗</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{activeJob.customerName} ({activeJob.customerPhone})</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vehicle:</Text>
                  <Text style={styles.detailValue}>{activeJob.vehicle}</Text>
                </View>

                {/* LIFECYCLE ACTION CONTROLS */}
                <View style={styles.actionsBox}>
                  <Text style={styles.actionHeader}>Job Stage Controls</Text>

                  {/* Stage 1: En Route */}
                  {activeJob.status === 'ASSIGNED' && (
                    <TouchableOpacity
                      style={styles.actionButtonPrimary}
                      onPress={() => {
                        setActiveJob({ ...activeJob, status: 'EN_ROUTE' });
                        Alert.alert('Status Updated', 'You are now marked EN ROUTE to customer.');
                      }}
                    >
                      <Text style={styles.actionButtonText}>Mark "En Route" (Start Driving)</Text>
                    </TouchableOpacity>
                  )}

                  {/* Stage 2: Arrived & Enter OTP */}
                  {activeJob.status === 'EN_ROUTE' && (
                    <View style={styles.otpInputBox}>
                      <Text style={styles.otpPrompt}>Ask customer for their 4-digit Arrival Code:</Text>
                      <TextInput
                        style={styles.otpInput}
                        value={arrivalInputOtp}
                        onChangeText={setArrivalInputOtp}
                        placeholder="e.g. 4821"
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                      <TouchableOpacity
                        style={styles.actionButtonPrimary}
                        onPress={handleVerifyArrival}
                      >
                        <Text style={styles.actionButtonText}>Verify Arrival & Begin Diagnosis</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Stage 3: Diagnosing & Quote Creation */}
                  {activeJob.status === 'DIAGNOSING' && (
                    <View>
                      <Text style={styles.otpPrompt}>Diagnosis complete? Create repair quote:</Text>
                      <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginVertical: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold' }}>• Tubeless patch: ₹150 (Labor)</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold' }}>• Valve stem pin: ₹200 (Parts)</Text>
                        <Text style={{ fontSize: 10, color: colors.success }}>• ₹100 diagnosis visit credit applied</Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                          Net Total: ₹295
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.actionButtonPrimary}
                        onPress={() => {
                          setActiveJob({ ...activeJob, status: 'IN_PROGRESS' });
                          Alert.alert('Quote Submitted', 'Quote sent to customer for approval. Work in progress.');
                        }}
                      >
                        <Text style={styles.actionButtonText}>Submit Quote & Start Repair</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Stage 4: In Progress & Completion OTP */}
                  {activeJob.status === 'IN_PROGRESS' && (
                    <View style={styles.otpInputBox}>
                      <Text style={styles.otpPrompt}>Work finished? Ask customer for 4-digit Completion Code:</Text>
                      <TextInput
                        style={styles.otpInput}
                        value={completionInputOtp}
                        onChangeText={setCompletionInputOtp}
                        placeholder="e.g. 8832"
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                      <TouchableOpacity
                        style={[styles.actionButtonPrimary, { backgroundColor: colors.success }]}
                        onPress={handleVerifyCompletion}
                      >
                        <Text style={styles.actionButtonText}>Complete Job & Release Capacity</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Completed status */}
                  {activeJob.status === 'COMPLETED' && (
                    <View style={{ backgroundColor: colors.successLight, padding: 12, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ color: colors.success, fontWeight: 'bold', fontSize: 13 }}>✓ Service Completed & Verified</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Net earnings credited to weekly ledger settlement.</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No active job in progress</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: EARNINGS */}
        {activeTab === 'EARNINGS' && (
          <View>
            <Text style={styles.sectionHeader}>Earnings & Ledger Statement</Text>

            <View style={styles.earningsSummaryCard}>
              <Text style={styles.summaryLabel}>Total Net Earnings (This Week)</Text>
              <Text style={styles.summaryValue}>₹3,450</Text>
              <Text style={styles.summaryMeta}>12 completed roadside jobs in Mangaluru</Text>
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Gross Service Volume:</Text>
                <Text style={styles.breakdownValue}>₹4,000</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Platform Commission (15% on Labor):</Text>
                <Text style={[styles.breakdownValue, { color: colors.danger }]}>-₹550</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cash Collected Commission Debt:</Text>
                <Text style={[styles.breakdownValue, { color: colors.warning }]}>₹150 (Auto-deducted on payout)</Text>
              </View>
              <View style={[styles.breakdownRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: colors.text }}>Net Payout Balance:</Text>
                <Text style={{ fontWeight: 'bold', fontSize: 14, color: colors.primary }}>₹3,300</Text>
              </View>
            </View>

            <View style={styles.payoutNotice}>
              <Text style={styles.payoutNoticeTitle}>Automated Bank Transfer</Text>
              <Text style={styles.payoutNoticeText}>
                Settled every Tuesday via Razorpay Route to State Bank of India (A/C: ****4921).
              </Text>
            </View>
          </View>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'PROFILE' && (
          <View>
            <Text style={styles.sectionHeader}>Mechanic & Workshop Profile</Text>

            <View style={styles.profileCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.profileName}>Ramesh Poojary</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>✓ Approved</Text>
                </View>
              </View>
              <Text style={styles.profileBusiness}>Ramesh Auto Electric & Mobile Care</Text>
              <Text style={styles.profileAddress}>Near Kadri Temple Road, Kadri, Mangaluru</Text>
              <Text style={styles.profileMeta}>Service Radius: 12 km • Rating: 4.8 ★ (38 reviews)</Text>
            </View>

            <Text style={styles.sectionHeader}>Roadside Service Readiness</Text>
            <View style={styles.readinessCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Mobile Breakdown Vehicle</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Toolbox, battery booster & mobile compressor ready</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsRoadsideReady(!isRoadsideReady)}
                  style={[styles.toggleButton, isRoadsideReady && { backgroundColor: colors.success }]}
                >
                  <Text style={styles.toggleButtonText}>{isRoadsideReady ? 'Ready' : 'Off'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.roleSwitchButton, { padding: 12, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center', marginTop: 16 }]}
              onPress={() => setRole('CUSTOMER')}
            >
              <Text style={styles.roleSwitchText}>Switch to Driver / Customer Mode 🔄</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('REQUESTS')}
        >
          <Text style={[styles.tabLabel, activeTab === 'REQUESTS' && styles.tabLabelActive]}>Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('ACTIVE_JOB')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ACTIVE_JOB' && styles.tabLabelActive]}>Active Job</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('EARNINGS')}
        >
          <Text style={[styles.tabLabel, activeTab === 'EARNINGS' && styles.tabLabelActive]}>Earnings</Text>
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
    fontSize: 18,
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
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusBannerOnline: {
    backgroundColor: colors.successLight,
  },
  statusBannerOffline: {
    backgroundColor: colors.dangerLight,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: colors.white,
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  offerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  offerTimer: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.danger,
  },
  offerDistance: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  offerProblem: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  offerVehicle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  offerArea: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  offerEarningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  offerFeeLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  offerFeeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  offerEarningsValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.success,
  },
  offerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  locationBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  locationAddress: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  navButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  navButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
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
  actionsBox: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  actionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  otpInputBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpPrompt: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  otpInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  earningsSummaryCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 4,
  },
  summaryMeta: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  payoutNotice: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
  },
  payoutNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  payoutNoticeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  verifiedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  profileBusiness: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  profileAddress: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  readinessCard: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
